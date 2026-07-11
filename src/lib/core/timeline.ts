import { eq, and, inArray, desc } from "drizzle-orm";
import { getDb } from "../db/client";
import { deals, quotes, invoices, payments, tickets, notes, events, projects, agentRuns } from "../db/schema";
import { formatMoney, invoiceTotals } from "./money";

export type TimelineItem = {
  at: string;
  kind: "note" | "deal" | "stage" | "quote" | "invoice" | "payment" | "ticket" | "project" | "agent";
  title: string;
  detail?: string;
  href?: string;
  actorLabel?: string;
};

/** CORE-03: one chronological timeline joining sales, delivery, money, and support. */
export function customerTimeline(scope: { companyId?: number; personId?: number }): TimelineItem[] {
  const db = getDb();
  const items: TimelineItem[] = [];
  const companyId = scope.companyId;
  const personId = scope.personId;

  const dealRows = db
    .select()
    .from(deals)
    .all()
    .filter((d) => (companyId && d.companyId === companyId) || (personId && d.personId === personId));
  for (const d of dealRows) {
    items.push({ at: d.createdAt, kind: "deal", title: `Deal created: ${d.name}`, detail: formatMoney(d.valueCents), href: `/sales/${d.id}` });
  }
  const dealIds = dealRows.map((d) => d.id);
  if (dealIds.length) {
    const stageEvents = db
      .select()
      .from(events)
      .where(and(eq(events.type, "deal.stage_changed"), inArray(events.entityId, dealIds)))
      .all();
    for (const e of stageEvents) {
      const p = (e.payload ?? {}) as { from?: string; to?: string; name?: string };
      items.push({ at: e.createdAt, kind: "stage", title: `${p.name ?? "Deal"}: ${p.from ?? "?"} → ${p.to ?? "?"}`, href: `/sales/${e.entityId}`, actorLabel: e.actorType });
    }
  }

  const quoteRows = db
    .select()
    .from(quotes)
    .all()
    .filter((q) => (companyId && q.companyId === companyId) || (personId && q.personId === personId));
  for (const q of quoteRows) {
    items.push({ at: q.updatedAt, kind: "quote", title: `Quote ${q.number} (${q.status})`, href: `/money/quotes/${q.id}` });
  }

  const invoiceRows = db
    .select()
    .from(invoices)
    .all()
    .filter((i) => (companyId && i.companyId === companyId) || (personId && i.personId === personId));
  for (const i of invoiceRows) {
    const totals = invoiceTotals(i.id);
    items.push({
      at: i.createdAt,
      kind: "invoice",
      title: `Invoice ${i.number} (${i.status})`,
      detail: formatMoney(totals.totalCents),
      href: `/money/invoices/${i.id}`,
    });
    const paymentRows = db.select().from(payments).where(eq(payments.invoiceId, i.id)).all();
    for (const p of paymentRows) {
      items.push({ at: p.paidAt, kind: "payment", title: `Payment received on ${i.number}`, detail: formatMoney(p.amountCents), href: `/money/invoices/${i.id}` });
    }
  }

  const ticketRows = db
    .select()
    .from(tickets)
    .all()
    .filter((t) => (companyId && t.companyId === companyId) || (personId && t.personId === personId));
  for (const t of ticketRows) {
    items.push({ at: t.createdAt, kind: "ticket", title: `Ticket opened: ${t.subject}`, detail: `${t.priority} priority`, href: `/support/${t.id}` });
    if (t.resolvedAt) items.push({ at: t.resolvedAt, kind: "ticket", title: `Ticket resolved: ${t.subject}`, href: `/support/${t.id}` });
  }

  if (companyId) {
    const projectRows = db.select().from(projects).where(eq(projects.companyId, companyId)).all();
    for (const p of projectRows) {
      items.push({ at: p.createdAt, kind: "project", title: `Project started: ${p.name}`, detail: p.status, href: `/delivery/${p.id}` });
    }
  }

  const entityFilters: [string, number][] = [];
  if (companyId) entityFilters.push(["company", companyId]);
  if (personId) entityFilters.push(["person", personId]);
  for (const [etype, eid] of entityFilters) {
    const noteRows = db.select().from(notes).where(and(eq(notes.entityType, etype), eq(notes.entityId, eid))).all();
    for (const n of noteRows) {
      items.push({ at: n.createdAt, kind: "note", title: `Note by ${n.authorLabel}`, detail: n.body });
    }
  }
  // notes attached to this customer's deals
  for (const d of dealRows) {
    const noteRows = db.select().from(notes).where(and(eq(notes.entityType, "deal"), eq(notes.entityId, d.id))).all();
    for (const n of noteRows) {
      items.push({ at: n.createdAt, kind: "note", title: `Note on ${d.name} by ${n.authorLabel}`, detail: n.body });
    }
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Recent agent activity touching an entity, for record pages. */
export function recentAgentActivity(limit = 20) {
  const db = getDb();
  return db.select().from(agentRuns).orderBy(desc(agentRuns.id)).limit(limit).all();
}
