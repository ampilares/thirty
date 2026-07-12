"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { ensureBootstrap } from "@/lib/bootstrap";
import { CURRENT_USER } from "@/lib/actor";
import { getDb, now } from "@/lib/db/client";
import { automations, events, deals, tickets, agents, stages, settings } from "@/lib/db/schema";
import type { AutomationCondition, AutomationAction } from "@/lib/db/schema";
import * as customers from "@/lib/core/customers";
import * as sales from "@/lib/core/sales";
import * as delivery from "@/lib/core/delivery";
import * as money from "@/lib/core/money";
import * as support from "@/lib/core/support";
import * as customFields from "@/lib/core/custom-fields";
import { runAutomationForEvent, publishAutomation, setAutomationEnabled } from "@/lib/automations/engine";
import { runChiefOfStaff, runSalesAgent, runDeliveryCoordinator, runIntake, runSupportAgent } from "@/lib/agents/catalog";
import { decideApproval } from "@/lib/agents/approvals";
import { writeAudit } from "@/lib/audit";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function num(form: FormData, key: string): number {
  const v = Number(form.get(key));
  return Number.isFinite(v) ? v : 0;
}
function opt(form: FormData, key: string): string | undefined {
  const v = str(form, key);
  return v === "" ? undefined : v;
}
function optNum(form: FormData, key: string): number | null {
  const v = str(form, key);
  return v === "" ? null : Number(v);
}
function cents(form: FormData, key: string): number {
  return Math.round(Number(form.get(key) ?? 0) * 100);
}
function revalidateAll() {
  revalidatePath("/", "layout");
}

function collectCustom(form: FormData, objectType: string): Record<string, unknown> {
  const defs = customFields.listCustomFields(objectType);
  const custom: Record<string, unknown> = {};
  for (const def of defs) {
    const v = str(form, `custom_${def.key}`);
    if (v !== "") custom[def.key] = def.type === "number" ? Number(v) : v;
  }
  return custom;
}

// ---------- customers ----------

export async function createPersonAction(form: FormData) {
  ensureBootstrap();
  const person = await customers.createPerson(CURRENT_USER, {
    firstName: str(form, "firstName"),
    lastName: opt(form, "lastName"),
    email: opt(form, "email"),
    phone: opt(form, "phone"),
    title: opt(form, "title"),
    companyId: optNum(form, "companyId"),
    custom: collectCustom(form, "person"),
  });
  revalidateAll();
  redirect(`/customers/people/${person.id}`);
}

export async function createCompanyAction(form: FormData) {
  ensureBootstrap();
  const company = await customers.createCompany(CURRENT_USER, {
    name: str(form, "name"),
    domain: opt(form, "domain"),
    industry: opt(form, "industry"),
    phone: opt(form, "phone"),
    custom: collectCustom(form, "company"),
  });
  revalidateAll();
  redirect(`/customers/companies/${company.id}`);
}

export async function addNoteAction(form: FormData) {
  ensureBootstrap();
  await customers.addNote(CURRENT_USER, str(form, "entityType"), num(form, "entityId"), str(form, "body"));
  revalidateAll();
}

// ---------- sales ----------

export async function createDealAction(form: FormData) {
  ensureBootstrap();
  const deal = await sales.createDeal(CURRENT_USER, {
    name: str(form, "name"),
    companyId: optNum(form, "companyId"),
    personId: optNum(form, "personId"),
    valueCents: cents(form, "value"),
    priority: opt(form, "priority"),
    source: opt(form, "source"),
    expectedClose: opt(form, "expectedClose") ?? null,
    description: opt(form, "description"),
    custom: collectCustom(form, "deal"),
  });
  revalidateAll();
  redirect(`/sales/${deal.id}`);
}

export async function moveDealStageAction(form: FormData) {
  ensureBootstrap();
  await sales.moveDealStage(CURRENT_USER, num(form, "dealId"), num(form, "stageId"), opt(form, "lostReason"));
  revalidateAll();
}

// ---------- delivery ----------

export async function createProjectAction(form: FormData) {
  ensureBootstrap();
  const project = await delivery.createProject(CURRENT_USER, {
    name: str(form, "name"),
    companyId: optNum(form, "companyId"),
    dueDate: opt(form, "dueDate") ?? null,
    valueCents: cents(form, "value"),
    description: opt(form, "description"),
  });
  revalidateAll();
  redirect(`/delivery/${project.id}`);
}

export async function updateProjectStatusAction(form: FormData) {
  ensureBootstrap();
  await delivery.updateProject(CURRENT_USER, num(form, "projectId"), { status: str(form, "status") });
  revalidateAll();
}

export async function createTaskAction(form: FormData) {
  ensureBootstrap();
  await delivery.createTask(CURRENT_USER, {
    title: str(form, "title"),
    projectId: optNum(form, "projectId"),
    dealId: optNum(form, "dealId"),
    ticketId: optNum(form, "ticketId"),
    milestoneId: optNum(form, "milestoneId"),
    dueDate: opt(form, "dueDate") ?? null,
    priority: opt(form, "priority"),
  });
  revalidateAll();
}

export async function toggleTaskAction(form: FormData) {
  ensureBootstrap();
  await delivery.setTaskStatus(CURRENT_USER, num(form, "taskId"), str(form, "to") === "done" ? "done" : "open");
  revalidateAll();
}

export async function createMilestoneAction(form: FormData) {
  ensureBootstrap();
  await delivery.createMilestone(CURRENT_USER, { projectId: num(form, "projectId"), name: str(form, "name"), dueDate: opt(form, "dueDate") ?? null });
  revalidateAll();
}

export async function setMilestoneStatusAction(form: FormData) {
  ensureBootstrap();
  await delivery.setMilestoneStatus(CURRENT_USER, num(form, "milestoneId"), str(form, "status") as "pending" | "done" | "missed");
  revalidateAll();
}

// ---------- money ----------

export async function createProductAction(form: FormData) {
  ensureBootstrap();
  await money.createProduct(CURRENT_USER, { name: str(form, "name"), description: opt(form, "description"), unitPriceCents: cents(form, "price") });
  revalidateAll();
}

export async function createQuoteAction(form: FormData) {
  ensureBootstrap();
  const items: { description: string; qty: number; unitPriceCents: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const description = str(form, `item_desc_${i}`);
    if (!description) continue;
    items.push({ description, qty: num(form, `item_qty_${i}`) || 1, unitPriceCents: cents(form, `item_price_${i}`) });
  }
  if (items.length === 0) throw new Error("A quote needs at least one line item");
  const quote = await money.createQuote(CURRENT_USER, {
    dealId: optNum(form, "dealId"),
    companyId: optNum(form, "companyId"),
    personId: optNum(form, "personId"),
    notes: opt(form, "notes"),
    items,
  });
  revalidateAll();
  redirect(`/money/quotes/${quote.id}`);
}

export async function setQuoteStatusAction(form: FormData) {
  ensureBootstrap();
  await money.setQuoteStatus(CURRENT_USER, num(form, "quoteId"), str(form, "status") as never, { winDeal: str(form, "winDeal") === "1" });
  revalidateAll();
}

export async function createInvoiceFromQuoteAction(form: FormData) {
  ensureBootstrap();
  const invoice = await money.createInvoiceFromQuote(CURRENT_USER, num(form, "quoteId"), { issue: true, dueInDays: 14 });
  revalidateAll();
  redirect(`/money/invoices/${invoice.id}`);
}

export async function createInvoiceAction(form: FormData) {
  ensureBootstrap();
  const items: { description: string; qty: number; unitPriceCents: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const description = str(form, `item_desc_${i}`);
    if (!description) continue;
    items.push({ description, qty: num(form, `item_qty_${i}`) || 1, unitPriceCents: cents(form, `item_price_${i}`) });
  }
  if (items.length === 0) throw new Error("An invoice needs at least one line item");
  const invoice = await money.createInvoice(CURRENT_USER, {
    companyId: optNum(form, "companyId"),
    projectId: optNum(form, "projectId"),
    dueInDays: num(form, "dueInDays") || 14,
    issue: str(form, "issue") === "1",
    notes: opt(form, "notes"),
    items,
  });
  revalidateAll();
  redirect(`/money/invoices/${invoice.id}`);
}

export async function setInvoiceStatusAction(form: FormData) {
  ensureBootstrap();
  await money.setInvoiceStatus(CURRENT_USER, num(form, "invoiceId"), str(form, "status") as never);
  revalidateAll();
}

export async function recordPaymentAction(form: FormData) {
  ensureBootstrap();
  await money.recordPayment(CURRENT_USER, {
    invoiceId: num(form, "invoiceId"),
    amountCents: cents(form, "amount"),
    method: opt(form, "method"),
    reference: opt(form, "reference"),
  });
  revalidateAll();
}

// ---------- support ----------

export async function createTicketAction(form: FormData) {
  ensureBootstrap();
  const ticket = await support.createTicket(CURRENT_USER, {
    subject: str(form, "subject"),
    body: opt(form, "body"),
    companyId: optNum(form, "companyId"),
    personId: optNum(form, "personId"),
    priority: opt(form, "priority"),
    category: opt(form, "category"),
    authorName: opt(form, "authorName"),
  });
  revalidateAll();
  redirect(`/support/${ticket.id}`);
}

export async function updateTicketAction(form: FormData) {
  ensureBootstrap();
  const patch: Record<string, unknown> = {};
  for (const key of ["priority", "category", "status"]) {
    const v = opt(form, key);
    if (v) patch[key] = v;
  }
  if (form.get("escalated") !== null) patch.escalated = num(form, "escalated");
  await support.updateTicket(CURRENT_USER, num(form, "ticketId"), patch as never);
  revalidateAll();
}

export async function addTicketMessageAction(form: FormData) {
  ensureBootstrap();
  await support.addTicketMessage(CURRENT_USER, {
    ticketId: num(form, "ticketId"),
    body: str(form, "body"),
    internal: str(form, "internal") === "1",
  });
  revalidateAll();
}

// ---------- automations ----------

function parseAutomationForm(form: FormData): { name: string; description?: string; trigger: string; conditions: AutomationCondition[]; actions: AutomationAction[] } {
  const conditions: AutomationCondition[] = [];
  for (let i = 0; i < 5; i++) {
    const field = str(form, `cond_field_${i}`);
    const op = str(form, `cond_op_${i}`) as AutomationCondition["op"];
    if (!field || !op) continue;
    const value = str(form, `cond_value_${i}`);
    conditions.push({ field, op, ...(op === "is_set" || op === "not_set" ? {} : { value }) });
  }
  const actions: AutomationAction[] = [];
  for (let i = 0; i < 8; i++) {
    const type = str(form, `action_type_${i}`) as AutomationAction["type"];
    if (!type) continue;
    const params: Record<string, string | number> = {};
    const p1 = str(form, `action_p1_${i}`);
    const p2 = str(form, `action_p2_${i}`);
    switch (type) {
      case "create_task":
        params.title = p1 || "Follow up on {name}";
        params.dueInDays = Number(p2) || 1;
        params.priority = "normal";
        break;
      case "add_note":
      case "send_message":
        params.body = p1 || "";
        if (type === "send_message") {
          params.template = "custom";
          params.channel = "sms";
          params.provider = "selfhostsim";
          params.recipientSource = p2 || "contact.phone";
        }
        break;
      case "add_tag":
        params.tag = p1 || "flagged";
        break;
      case "create_ticket":
        params.subject = p1 || "Follow-up needed on {name}";
        params.priority = p2 || "normal";
        break;
      case "request_approval":
        params.title = p1 || "Approval requested";
        params.description = p2 || "";
        break;
      case "escalate_ticket":
      case "update_field":
        if (type === "update_field") {
          params.field = p1;
          params.value = p2;
        }
        break;
    }
    actions.push({ type, params });
  }
  return { name: str(form, "name"), description: opt(form, "description"), trigger: str(form, "trigger"), conditions, actions };
}

export async function createAutomationAction(form: FormData) {
  ensureBootstrap();
  const def = parseAutomationForm(form);
  if (!def.name) throw new Error("Workflow name is required");
  if (!def.trigger) throw new Error("A workflow trigger is required");
  if (def.actions.length === 0) throw new Error("A workflow needs at least one action");
  const db = getDb();
  const t = now();
  const row = db
    .insert(automations)
    .values({ name: def.name, description: def.description ?? null, trigger: def.trigger, conditions: def.conditions, actions: def.actions, enabled: 0, currentVersion: 0, createdAt: t, updatedAt: t })
    .returning()
    .get();
  writeAudit({ actor: CURRENT_USER, action: "create", entityType: "automation", entityId: row.id, entityLabel: row.name, after: { trigger: def.trigger, conditions: def.conditions.length, actions: def.actions.length } });
  revalidateAll();
  redirect(`/automations/${row.id}`);
}

export async function updateAutomationAction(form: FormData) {
  ensureBootstrap();
  const id = num(form, "automationId");
  const def = parseAutomationForm(form);
  if (!def.name) throw new Error("Workflow name is required");
  if (!def.trigger) throw new Error("A workflow trigger is required");
  if (def.actions.length === 0) throw new Error("A workflow needs at least one action");
  const db = getDb();
  const before = db.select().from(automations).where(eq(automations.id, id)).get();
  if (!before) throw new Error("Automation not found");
  db.update(automations)
    .set({ name: def.name, description: def.description ?? null, trigger: def.trigger, conditions: def.conditions, actions: def.actions, updatedAt: now() })
    .where(eq(automations.id, id))
    .run();
  writeAudit({ actor: CURRENT_USER, action: "update", entityType: "automation", entityId: id, entityLabel: def.name, after: { edited: true } });
  revalidateAll();
}

export async function publishAutomationAction(form: FormData) {
  ensureBootstrap();
  await publishAutomation(CURRENT_USER, num(form, "automationId"), opt(form, "notes"));
  revalidateAll();
}

export async function toggleAutomationAction(form: FormData) {
  ensureBootstrap();
  await setAutomationEnabled(CURRENT_USER, num(form, "automationId"), str(form, "to") === "on");
  revalidateAll();
}

/** AUT-02: simulate against the most recent matching real event (or a synthesized sample). */
export async function simulateAutomationAction(form: FormData) {
  ensureBootstrap();
  const id = num(form, "automationId");
  const db = getDb();
  const automation = db.select().from(automations).where(eq(automations.id, id)).get();
  if (!automation) throw new Error("Automation not found");

  const lastEvent = db.select().from(events).where(eq(events.type, automation.trigger)).orderBy(desc(events.id)).limit(1).get();
  let sample: { id: number; type: string; entityType: string; entityId: number; payload: Record<string, unknown> };
  if (lastEvent) {
    sample = { id: lastEvent.id, type: lastEvent.type, entityType: lastEvent.entityType, entityId: lastEvent.entityId, payload: (lastEvent.payload ?? {}) as Record<string, unknown> };
  } else if (automation.trigger.startsWith("deal.")) {
    const deal = db.select().from(deals).orderBy(desc(deals.id)).limit(1).get();
    if (!deal) throw new Error("No sample data available for this trigger");
    sample = { id: -1, type: automation.trigger, entityType: "deal", entityId: deal.id, payload: { name: deal.name, valueCents: deal.valueCents, source: deal.source ?? "", priority: deal.priority, companyId: deal.companyId } };
  } else if (automation.trigger.startsWith("ticket.")) {
    const ticket = db.select().from(tickets).orderBy(desc(tickets.id)).limit(1).get();
    if (!ticket) throw new Error("No sample data available for this trigger");
    sample = { id: -1, type: automation.trigger, entityType: "ticket", entityId: ticket.id, payload: { subject: ticket.subject, priority: ticket.priority, companyId: ticket.companyId, id: ticket.id } };
  } else {
    sample = { id: -1, type: automation.trigger, entityType: automation.trigger.split(".")[0], entityId: 1, payload: { name: "Sample record", number: "SAMPLE-001" } };
  }
  await runAutomationForEvent(automation, sample, { execute: false });
  revalidateAll();
}

// ---------- agents & approvals ----------

export async function runAgentAction(form: FormData) {
  ensureBootstrap();
  const key = str(form, "agentKey");
  if (key === "chief_of_staff") await runChiefOfStaff("manual");
  if (key === "sales") await runSalesAgent("manual");
  if (key === "delivery") await runDeliveryCoordinator("manual");
  if (key === "intake") {
    const db = getDb();
    const latest = db.select().from(deals).orderBy(desc(deals.id)).limit(1).get();
    if (latest) await runIntake(latest.id, "manual");
  }
  if (key === "support") {
    const db = getDb();
    const latest = db.select().from(tickets).orderBy(desc(tickets.id)).limit(1).get();
    if (latest) await runSupportAgent(latest.id, "manual");
  }
  revalidateAll();
}

export async function decideApprovalAction(form: FormData) {
  ensureBootstrap();
  await decideApproval(CURRENT_USER, num(form, "approvalId"), str(form, "decision") === "approved" ? "approved" : "rejected");
  revalidateAll();
}

export async function updateAgentPolicyAction(form: FormData) {
  ensureBootstrap();
  const db = getDb();
  const id = num(form, "agentId");
  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) throw new Error("Agent not found");
  const enabled = str(form, "enabled") === "1" ? 1 : 0;
  const tier = Math.min(3, Math.max(0, num(form, "tier")));
  const dailyActionBudget = Math.max(1, num(form, "budget"));
  db.update(agents).set({ enabled, tier, dailyActionBudget }).where(eq(agents.id, id)).run();
  writeAudit({
    actor: CURRENT_USER,
    action: "update",
    entityType: "agent",
    entityId: id,
    entityLabel: agent.name,
    before: { enabled: !!agent.enabled, tier: agent.tier, dailyActionBudget: agent.dailyActionBudget },
    after: { enabled: !!enabled, tier, dailyActionBudget },
  });
  revalidateAll();
}

// ---------- settings ----------

export async function addCustomFieldAction(form: FormData) {
  ensureBootstrap();
  await customFields.addCustomField(CURRENT_USER, {
    objectType: str(form, "objectType"),
    label: str(form, "label"),
    type: str(form, "type") as "text" | "number" | "date" | "select",
    options: opt(form, "options")?.split(",").map((s) => s.trim()),
  });
  revalidateAll();
}

export async function removeCustomFieldAction(form: FormData) {
  ensureBootstrap();
  await customFields.removeCustomField(CURRENT_USER, num(form, "fieldId"));
  revalidateAll();
}

export async function renameStageAction(form: FormData) {
  ensureBootstrap();
  const db = getDb();
  const id = num(form, "stageId");
  const name = str(form, "name");
  const before = db.select().from(stages).where(eq(stages.id, id)).get();
  if (!before || !name) return;
  db.update(stages).set({ name }).where(eq(stages.id, id)).run();
  writeAudit({ actor: CURRENT_USER, action: "update", entityType: "stage", entityId: id, before: { name: before.name }, after: { name } });
  revalidateAll();
}

export async function resetDemoDataAction() {
  ensureBootstrap();
  const { closeDb } = await import("@/lib/db/client");
  closeDb(); // Windows requires the handle released before the file can be replaced
  const { execSync } = await import("node:child_process");
  execSync("npm run db:reset", { cwd: process.cwd(), stdio: "inherit" });
  revalidateAll();
  redirect("/");
}
