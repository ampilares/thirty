import { eq } from "drizzle-orm";
import { getDb, now, daysFromNow } from "../db/client";
import {
  automations,
  automationVersions,
  automationRuns,
  approvals,
  companies,
  people,
  deals,
  tickets,
  invoices,
  quotes,
  projects,
  payments,
  type AutomationCondition,
  type AutomationAction,
} from "../db/schema";
import type { Actor } from "../actor";
import { automationActor } from "../actor";
import type { BusinessEvent } from "../events";
import { writeAudit } from "../audit";
import { createTask } from "../core/delivery";
import { addNote } from "../core/customers";
import { createTicket, updateTicket } from "../core/support";
import { maskSmsPhone, normalizeSmsPhone, sendSmsViaSelfhostSim } from "../messaging/selfhostsim";

export type StepResult = { action: string; detail: string; ok: boolean };

function relatedPersonId(entityType: string, entityId: number, payload: Record<string, unknown>): number | null {
  if (typeof payload.personId === "number") return payload.personId;
  const db = getDb();
  const firstAtCompany = (companyId: number | null | undefined) => companyId ? db.select().from(people).where(eq(people.companyId, companyId)).get()?.id ?? null : null;
  if (entityType === "person") return entityId;
  if (entityType === "company") return firstAtCompany(entityId);
  if (entityType === "deal") { const row = db.select().from(deals).where(eq(deals.id, entityId)).get(); return row?.personId ?? firstAtCompany(row?.companyId); }
  if (entityType === "ticket") { const row = db.select().from(tickets).where(eq(tickets.id, entityId)).get(); return row?.personId ?? firstAtCompany(row?.companyId); }
  if (entityType === "invoice") { const row = db.select().from(invoices).where(eq(invoices.id, entityId)).get(); return row?.personId ?? firstAtCompany(row?.companyId); }
  if (entityType === "quote") { const row = db.select().from(quotes).where(eq(quotes.id, entityId)).get(); return row?.personId ?? firstAtCompany(row?.companyId); }
  if (entityType === "payment") {
    const payment = db.select().from(payments).where(eq(payments.id, entityId)).get();
    if (!payment) return null;
    const invoice = db.select().from(invoices).where(eq(invoices.id, payment.invoiceId)).get();
    return invoice?.personId ?? firstAtCompany(invoice?.companyId);
  }
  if (entityType === "project") {
    const project = db.select().from(projects).where(eq(projects.id, entityId)).get();
    if (!project) return null;
    const deal = project.dealId ? db.select().from(deals).where(eq(deals.id, project.dealId)).get() : null;
    return deal?.personId ?? firstAtCompany(project.companyId ?? deal?.companyId);
  }
  return null;
}

function resolveSmsContext(entityType: string, entityId: number, payload: Record<string, unknown>, recipientSource: unknown) {
  const source = String(recipientSource ?? "contact.phone");
  const explicit = source.startsWith("number:") ? source.slice(7) : source === "payload.phone" ? String(payload.phone ?? "") : "";
  const personId = relatedPersonId(entityType, entityId, payload);
  const person = personId ? getDb().select().from(people).where(eq(people.id, personId)).get() : null;
  const phone = explicit || person?.phone || (typeof payload.phone === "string" ? payload.phone : "");
  if (!phone) throw new Error(`No mobile number found for the related contact on ${entityType} #${entityId}`);
  return {
    phone: normalizeSmsPhone(phone),
    variables: { ...payload, personId: person?.id ?? personId, firstName: person?.firstName, lastName: person?.lastName, phone },
  };
}

// ---------- pure evaluation (unit-tested) ----------

export function interpolate(template: string, payload: Record<string, unknown>, entityId: number): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === "id") return String(entityId);
    const v = payload[key];
    return v === undefined || v === null ? `{${key}}` : String(v);
  });
}

export function evalCondition(cond: AutomationCondition, payload: Record<string, unknown>): boolean {
  const raw = payload[cond.field];
  switch (cond.op) {
    case "is_set":
      return raw !== undefined && raw !== null && raw !== "";
    case "not_set":
      return raw === undefined || raw === null || raw === "";
    case "eq":
      return String(raw ?? "").toLowerCase() === String(cond.value ?? "").toLowerCase();
    case "neq":
      return String(raw ?? "").toLowerCase() !== String(cond.value ?? "").toLowerCase();
    case "contains":
      return String(raw ?? "").toLowerCase().includes(String(cond.value ?? "").toLowerCase());
    case "gt":
      return Number(raw) > Number(cond.value);
    case "lt":
      return Number(raw) < Number(cond.value);
    case "gte":
      return Number(raw) >= Number(cond.value);
    case "lte":
      return Number(raw) <= Number(cond.value);
    default:
      return false;
  }
}

export function conditionsPass(conds: AutomationCondition[] | null | undefined, payload: Record<string, unknown>): boolean {
  return (conds ?? []).every((c) => evalCondition(c, payload));
}

// ---------- action execution ----------

async function runAction(
  action: AutomationAction,
  evt: Pick<BusinessEvent, "type" | "entityType" | "entityId" | "payload">,
  actor: Actor,
  execute: boolean,
  runId: number | null
): Promise<StepResult> {
  const p = action.params ?? {};
  const payload = evt.payload;
  const correlation = runId ? ({ type: "automation_run", id: runId } as const) : undefined;

  switch (action.type) {
    case "create_task": {
      const title = interpolate(String(p.title ?? "Task"), payload, evt.entityId);
      const dueDate = daysFromNow(Number(p.dueInDays ?? 1));
      const detail = `Create task "${title}" due ${dueDate}`;
      if (execute) {
        await createTask(
          actor,
          {
            title,
            dueDate,
            priority: String(p.priority ?? "normal"),
            dealId: evt.entityType === "deal" ? evt.entityId : null,
            ticketId: evt.entityType === "ticket" ? evt.entityId : null,
            projectId: evt.entityType === "project" ? evt.entityId : typeof payload.projectId === "number" ? payload.projectId : null,
          },
          correlation
        );
      }
      return { action: action.type, detail, ok: true };
    }
    case "add_note": {
      const body = interpolate(String(p.body ?? ""), payload, evt.entityId);
      const detail = `Add note to ${evt.entityType} #${evt.entityId}: "${body.slice(0, 80)}"`;
      if (execute) await addNote(actor, evt.entityType, evt.entityId, body);
      return { action: action.type, detail, ok: true };
    }
    case "add_tag": {
      const tag = String(p.tag ?? "");
      const companyId = typeof payload.companyId === "number" ? payload.companyId : evt.entityType === "company" ? evt.entityId : null;
      if (!companyId) return { action: action.type, detail: "No company in scope — skipped", ok: true };
      const detail = `Add tag "${tag}" to company #${companyId}`;
      if (execute) {
        const db = getDb();
        const company = db.select().from(companies).where(eq(companies.id, companyId)).get();
        if (company && !(company.tags ?? []).includes(tag)) {
          db.update(companies).set({ tags: [...(company.tags ?? []), tag], updatedAt: now() }).where(eq(companies.id, companyId)).run();
          writeAudit({ actor, action: "update", entityType: "company", entityId: companyId, entityLabel: company.name, before: { tags: company.tags }, after: { tags: [...(company.tags ?? []), tag] }, correlationType: correlation?.type, correlationId: correlation?.id });
        }
      }
      return { action: action.type, detail, ok: true };
    }
    case "create_ticket": {
      const subject = interpolate(String(p.subject ?? "Follow-up"), payload, evt.entityId);
      const detail = `Create ticket "${subject}"`;
      if (execute) {
        await createTicket(actor, {
          subject,
          priority: String(p.priority ?? "normal"),
          companyId: typeof payload.companyId === "number" ? payload.companyId : null,
        });
      }
      return { action: action.type, detail, ok: true };
    }
    case "send_message": {
      const sms = resolveSmsContext(evt.entityType, evt.entityId, payload, p.recipientSource ?? p.to);
      const body = interpolate(String(p.body ?? ""), sms.variables, evt.entityId).trim();
      if (!body) return { action: action.type, detail: "SMS message is empty", ok: false };
      const recipient = maskSmsPhone(sms.phone);
      let detail = `Would send SMS to ${recipient}: "${body.slice(0, 80)}"`;
      if (execute) {
        const result = await sendSmsViaSelfhostSim({ phone: sms.phone, message: body });
        detail = `SMS queued to ${recipient}${result.batchId ? ` · batch ${result.batchId}` : ""}`;
        writeAudit({
          actor,
          action: "execute",
          entityType: "sms",
          entityId: evt.entityId,
          entityLabel: `SMS to ${recipient}`,
          after: { provider: "selfhostsim", channel: "sms", recipient, body, batchId: result.batchId, status: "queued" },
          correlationType: correlation?.type,
          correlationId: correlation?.id,
        });
        await addNote(actor, evt.entityType, evt.entityId, `📱 SMS queued to ${recipient}: ${body}`);
      }
      return { action: action.type, detail, ok: true };
    }
    case "escalate_ticket": {
      if (evt.entityType !== "ticket") return { action: action.type, detail: "Event is not a ticket — skipped", ok: true };
      const detail = `Escalate ticket #${evt.entityId}`;
      if (execute) await updateTicket(actor, evt.entityId, { escalated: 1 }, correlation ? { type: "automation_run", id: correlation.id } : undefined);
      return { action: action.type, detail, ok: true };
    }
    case "update_field": {
      const detail = `Update ${evt.entityType}.${p.field} → "${p.value}"`;
      if (execute) {
        if (evt.entityType === "ticket") {
          await updateTicket(actor, evt.entityId, { [String(p.field)]: p.value } as never, correlation ? { type: "automation_run", id: correlation.id } : undefined);
        } else {
          return { action: action.type, detail: `update_field only supports tickets in MVP — skipped`, ok: true };
        }
      }
      return { action: action.type, detail, ok: true };
    }
    case "request_approval": {
      const title = interpolate(String(p.title ?? "Approval requested"), payload, evt.entityId);
      const detail = `Request human approval: "${title}"`;
      if (execute) {
        const db = getDb();
        db.insert(approvals)
          .values({
            automationRunId: runId,
            requestedBy: actor.label,
            actionType: "generic",
            title,
            description: interpolate(String(p.description ?? ""), payload, evt.entityId),
            payload: { entityType: evt.entityType, entityId: evt.entityId },
            status: "pending",
            createdAt: now(),
          })
          .run();
      }
      return { action: action.type, detail, ok: true };
    }
    default:
      return { action: (action as { type: string }).type, detail: "Unknown action type", ok: false };
  }
}

// ---------- run orchestration ----------

export async function runAutomationForEvent(
  automation: typeof automations.$inferSelect,
  evt: Pick<BusinessEvent, "id" | "type" | "entityType" | "entityId" | "payload">,
  opts: { execute: boolean }
): Promise<typeof automationRuns.$inferSelect> {
  const db = getDb();
  const startedAt = now();
  const actor = automationActor(automation.id, automation.name);
  const steps: StepResult[] = [];
  let error: string | null = null;

  const run = db
    .insert(automationRuns)
    .values({
      automationId: automation.id,
      version: automation.currentVersion,
      eventType: evt.type,
      eventId: evt.id > 0 ? evt.id : null,
      status: "running" as string,
      simulated: opts.execute ? 0 : 1,
      steps: [],
      startedAt,
    })
    .returning()
    .get();

  try {
    if (!conditionsPass(automation.conditions, evt.payload)) {
      steps.push({ action: "conditions", detail: "Conditions did not match — no actions taken", ok: true });
      db.update(automationRuns).set({ status: opts.execute ? "skipped" : "simulated", steps, finishedAt: now() }).where(eq(automationRuns.id, run.id)).run();
      return db.select().from(automationRuns).where(eq(automationRuns.id, run.id)).get()!;
    }
    steps.push({ action: "conditions", detail: `${(automation.conditions ?? []).length} condition(s) matched`, ok: true });
    for (const action of automation.actions ?? []) {
      const result = await runAction(action, evt, actor, opts.execute, opts.execute ? run.id : null);
      steps.push(result);
      if (!result.ok) throw new Error(`Action ${action.type} failed: ${result.detail}`);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const status = error ? "failed" : opts.execute ? "success" : "simulated";
  db.update(automationRuns).set({ status, steps, error, finishedAt: now() }).where(eq(automationRuns.id, run.id)).run();
  return db.select().from(automationRuns).where(eq(automationRuns.id, run.id)).get()!;
}

/** Event dispatcher registered on the bus (see lib/bootstrap.ts). */
export async function dispatchToAutomations(evt: BusinessEvent): Promise<void> {
  // Never let automations trigger themselves in a cascade off automation-actor events beyond the bus depth guard.
  const db = getDb();
  const enabled = db.select().from(automations).where(eq(automations.enabled, 1)).all();
  for (const a of enabled.filter((a) => a.trigger === evt.type)) {
    await runAutomationForEvent(a, evt, { execute: true });
  }
}

// ---------- lifecycle ----------

export async function publishAutomation(actor: Actor, id: number, publishNotes?: string) {
  const db = getDb();
  const a = db.select().from(automations).where(eq(automations.id, id)).get();
  if (!a) throw new Error(`Automation ${id} not found`);
  const version = a.currentVersion + 1;
  db.insert(automationVersions)
    .values({
      automationId: id,
      version,
      definition: { name: a.name, trigger: a.trigger, conditions: a.conditions ?? [], actions: a.actions ?? [] },
      publishNotes: publishNotes ?? null,
      publishedAt: now(),
    })
    .run();
  db.update(automations).set({ enabled: 1, currentVersion: version, updatedAt: now() }).where(eq(automations.id, id)).run();
  writeAudit({ actor, action: "update", entityType: "automation", entityId: id, entityLabel: a.name, after: { published: true, version } });
  return version;
}

export async function setAutomationEnabled(actor: Actor, id: number, enabled: boolean) {
  const db = getDb();
  const a = db.select().from(automations).where(eq(automations.id, id)).get();
  if (!a) throw new Error(`Automation ${id} not found`);
  db.update(automations).set({ enabled: enabled ? 1 : 0, updatedAt: now() }).where(eq(automations.id, id)).run();
  writeAudit({ actor, action: "update", entityType: "automation", entityId: id, entityLabel: a.name, before: { enabled: !!a.enabled }, after: { enabled } });
}
