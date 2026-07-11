import { eq } from "drizzle-orm";
import { getDb, now } from "../db/client";
import { tickets, ticketMessages } from "../db/schema";
import type { Actor } from "../actor";
import { writeAudit, diffFields } from "../audit";
import { emitEvent } from "../events";

/** Priority → SLA window in hours (§3.7). */
export const SLA_HOURS: Record<string, number> = { urgent: 4, high: 8, normal: 48, low: 72 };

export function slaDueFrom(priority: string, from = new Date()): string {
  const hours = SLA_HOURS[priority] ?? 48;
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export async function createTicket(
  actor: Actor,
  input: { subject: string; body?: string; companyId?: number | null; personId?: number | null; priority?: string; category?: string; authorName?: string }
) {
  const db = getDb();
  const t = now();
  const priority = input.priority ?? "normal";
  const row = db
    .insert(tickets)
    .values({
      subject: input.subject,
      companyId: input.companyId ?? null,
      personId: input.personId ?? null,
      priority,
      category: input.category ?? null,
      status: "open",
      slaDueAt: slaDueFrom(priority),
      assigneeId: 3,
      escalated: 0,
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  if (input.body) {
    db.insert(ticketMessages)
      .values({ ticketId: row.id, authorType: actor.type === "user" ? "user" : "customer", authorName: input.authorName ?? actor.label, body: input.body, internal: 0, createdAt: t })
      .run();
  }
  writeAudit({ actor, action: "create", entityType: "ticket", entityId: row.id, entityLabel: row.subject, after: { subject: row.subject, priority, slaDueAt: row.slaDueAt } });
  await emitEvent("ticket.created", "ticket", row.id, { subject: row.subject, priority, companyId: row.companyId, personId: row.personId, id: row.id }, actor);
  return row;
}

export async function updateTicket(
  actor: Actor,
  id: number,
  patch: Partial<{ priority: string; category: string; status: string; escalated: number; triageSummary: string; assigneeId: number }>,
  correlation?: { type: "agent_run" | "automation_run"; id: number }
) {
  const db = getDb();
  const before = db.select().from(tickets).where(eq(tickets.id, id)).get();
  if (!before) throw new Error(`Ticket ${id} not found`);
  const t = now();
  const set: Record<string, unknown> = { ...patch, updatedAt: t };
  if (patch.priority && patch.priority !== before.priority) set.slaDueAt = slaDueFrom(patch.priority, new Date(before.createdAt));
  if (patch.status === "resolved" && before.status !== "resolved") set.resolvedAt = t;
  const row = db.update(tickets).set(set).where(eq(tickets.id, id)).returning().get();
  const d = diffFields(before as Record<string, unknown>, patch as Record<string, unknown>);
  writeAudit({
    actor,
    action: "update",
    entityType: "ticket",
    entityId: id,
    entityLabel: row.subject,
    before: d.before,
    after: d.after,
    correlationType: correlation?.type,
    correlationId: correlation?.id,
  });
  if (patch.status === "resolved" && before.status !== "resolved") {
    await emitEvent("ticket.resolved", "ticket", id, { subject: row.subject, companyId: row.companyId }, actor);
  } else if (patch.status === "open" && (before.status === "resolved" || before.status === "closed")) {
    await emitEvent("ticket.reopened", "ticket", id, { subject: row.subject, companyId: row.companyId }, actor);
  } else if (patch.escalated === 1 && before.escalated === 0) {
    await emitEvent("ticket.escalated", "ticket", id, { subject: row.subject, companyId: row.companyId }, actor);
  } else {
    await emitEvent("ticket.updated", "ticket", id, d.after, actor);
  }
  return row;
}

export async function addTicketMessage(
  actor: Actor,
  input: { ticketId: number; body: string; internal?: boolean; authorType?: "customer" | "user" | "agent"; authorName?: string },
  correlation?: { type: "agent_run" | "automation_run" | "approval"; id: number }
) {
  const db = getDb();
  const ticket = db.select().from(tickets).where(eq(tickets.id, input.ticketId)).get();
  if (!ticket) throw new Error(`Ticket ${input.ticketId} not found`);
  const row = db
    .insert(ticketMessages)
    .values({
      ticketId: input.ticketId,
      authorType: input.authorType ?? (actor.type === "agent" ? "agent" : "user"),
      authorName: input.authorName ?? actor.label,
      body: input.body,
      internal: input.internal ? 1 : 0,
      createdAt: now(),
    })
    .returning()
    .get();
  db.update(tickets).set({ updatedAt: now() }).where(eq(tickets.id, input.ticketId)).run();
  writeAudit({
    actor,
    action: "create",
    entityType: "ticket_message",
    entityId: row.id,
    entityLabel: `Reply on "${ticket.subject}"`,
    after: { ticketId: input.ticketId, internal: !!input.internal, body: input.body.slice(0, 200) },
    correlationType: correlation?.type as "agent_run" | "automation_run" | "approval" | undefined,
    correlationId: correlation?.id,
  });
  await emitEvent("ticket.message_added", "ticket", input.ticketId, { subject: ticket.subject, internal: !!input.internal }, actor);
  return row;
}

export function openTickets() {
  const db = getDb();
  return db.select().from(tickets).all().filter((t) => t.status === "open" || t.status === "pending");
}

export function slaBreached(nowIso = now()) {
  return openTickets().filter((t) => t.slaDueAt && t.slaDueAt < nowIso);
}
