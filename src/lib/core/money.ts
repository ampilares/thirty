import { eq } from "drizzle-orm";
import { getDb, now, today, daysFromNow } from "../db/client";
import { products, quotes, quoteItems, invoices, invoiceItems, payments, deals, stages } from "../db/schema";
import type { Actor } from "../actor";
import { writeAudit } from "../audit";
import { emitEvent } from "../events";
import { moveDealStage } from "./sales";

// ---------- pure money math (unit-tested) ----------

export type LineItem = { qty: number; unitPriceCents: number };

export function lineTotal(item: LineItem): number {
  return item.qty * item.unitPriceCents;
}

export function itemsTotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + lineTotal(i), 0);
}

export function balanceCents(totalCents: number, paidCents: number): number {
  return Math.max(0, totalCents - paidCents);
}

export function isOverdue(status: string, dueDate: string | null, todayStr: string): boolean {
  return (status === "sent" || status === "overdue") && !!dueDate && dueDate < todayStr;
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 === 0 ? 0 : 2 });
}

// ---------- products ----------

export async function createProduct(actor: Actor, input: { name: string; description?: string; unitPriceCents: number }) {
  const db = getDb();
  const row = db
    .insert(products)
    .values({ name: input.name, description: input.description ?? null, unitPriceCents: input.unitPriceCents, active: 1 })
    .returning()
    .get();
  writeAudit({ actor, action: "create", entityType: "product", entityId: row.id, entityLabel: row.name, after: { name: row.name, unitPriceCents: row.unitPriceCents } });
  return row;
}

// ---------- quotes ----------

function nextNumber(prefix: string, existing: string[]): string {
  const year = new Date().getFullYear();
  const nums = existing
    .map((n) => {
      const m = n.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .concat([0]);
  const next = Math.max(...nums) + 1;
  return `${prefix}-${year}-${String(next).padStart(3, "0")}`;
}

export async function createQuote(
  actor: Actor,
  input: { dealId?: number | null; companyId?: number | null; personId?: number | null; notes?: string; items: { description: string; qty: number; unitPriceCents: number; productId?: number | null }[] }
) {
  const db = getDb();
  const t = now();
  const existing = db.select({ number: quotes.number }).from(quotes).all().map((r) => r.number);
  const row = db
    .insert(quotes)
    .values({
      number: nextNumber("Q", existing),
      dealId: input.dealId ?? null,
      companyId: input.companyId ?? null,
      personId: input.personId ?? null,
      status: "draft",
      notes: input.notes ?? null,
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  for (const item of input.items) {
    db.insert(quoteItems)
      .values({ quoteId: row.id, productId: item.productId ?? null, description: item.description, qty: item.qty, unitPriceCents: item.unitPriceCents })
      .run();
  }
  writeAudit({ actor, action: "create", entityType: "quote", entityId: row.id, entityLabel: row.number, after: { number: row.number, items: input.items.length, totalCents: itemsTotal(input.items) } });
  await emitEvent("quote.created", "quote", row.id, { number: row.number }, actor);
  return row;
}

export async function setQuoteStatus(actor: Actor, id: number, status: "draft" | "sent" | "accepted" | "rejected", opts?: { winDeal?: boolean }) {
  const db = getDb();
  const before = db.select().from(quotes).where(eq(quotes.id, id)).get();
  if (!before) throw new Error(`Quote ${id} not found`);
  const t = now();
  const row = db
    .update(quotes)
    .set({ status, issueDate: status === "sent" && !before.issueDate ? today() : before.issueDate, updatedAt: t })
    .where(eq(quotes.id, id))
    .returning()
    .get();
  writeAudit({ actor, action: "update", entityType: "quote", entityId: id, entityLabel: row.number, before: { status: before.status }, after: { status } });
  await emitEvent(`quote.${status}`, "quote", id, { number: row.number, dealId: row.dealId }, actor);

  // Accepting a quote can win the linked deal (J2 lead-to-cash).
  if (status === "accepted" && opts?.winDeal && row.dealId) {
    const deal = db.select().from(deals).where(eq(deals.id, row.dealId)).get();
    const wonStage = db.select().from(stages).where(eq(stages.kind, "won")).get();
    if (deal && wonStage && deal.stageId !== wonStage.id) {
      await moveDealStage(actor, deal.id, wonStage.id);
    }
  }
  return row;
}

export function quoteTotal(quoteId: number): number {
  const db = getDb();
  return itemsTotal(db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).all());
}

// ---------- invoices ----------

export async function createInvoice(
  actor: Actor,
  input: {
    companyId?: number | null;
    personId?: number | null;
    projectId?: number | null;
    quoteId?: number | null;
    dueInDays?: number;
    notes?: string;
    issue?: boolean;
    items: { description: string; qty: number; unitPriceCents: number }[];
  }
) {
  const db = getDb();
  const t = now();
  const existing = db.select({ number: invoices.number }).from(invoices).all().map((r) => r.number);
  const issue = input.issue ?? false;
  const row = db
    .insert(invoices)
    .values({
      number: nextNumber("INV", existing),
      companyId: input.companyId ?? null,
      personId: input.personId ?? null,
      projectId: input.projectId ?? null,
      quoteId: input.quoteId ?? null,
      status: issue ? "sent" : "draft",
      issueDate: issue ? today() : null,
      dueDate: issue ? daysFromNow(input.dueInDays ?? 14) : null,
      notes: input.notes ?? null,
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  for (const item of input.items) {
    db.insert(invoiceItems).values({ invoiceId: row.id, description: item.description, qty: item.qty, unitPriceCents: item.unitPriceCents }).run();
  }
  writeAudit({ actor, action: "create", entityType: "invoice", entityId: row.id, entityLabel: row.number, after: { number: row.number, status: row.status, totalCents: itemsTotal(input.items) } });
  await emitEvent("invoice.created", "invoice", row.id, { number: row.number, companyId: row.companyId }, actor);
  if (issue) await emitEvent("invoice.issued", "invoice", row.id, { number: row.number, companyId: row.companyId }, actor);
  return row;
}

export async function createInvoiceFromQuote(actor: Actor, quoteId: number, opts?: { dueInDays?: number; issue?: boolean }) {
  const db = getDb();
  const quote = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
  if (!quote) throw new Error(`Quote ${quoteId} not found`);
  const items = db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).all();
  return createInvoice(actor, {
    companyId: quote.companyId,
    personId: quote.personId,
    quoteId: quote.id,
    dueInDays: opts?.dueInDays ?? 14,
    issue: opts?.issue ?? true,
    notes: `From quote ${quote.number}`,
    items: items.map((i) => ({ description: i.description, qty: i.qty, unitPriceCents: i.unitPriceCents })),
  });
}

export async function setInvoiceStatus(actor: Actor, id: number, status: "draft" | "sent" | "paid" | "overdue" | "void") {
  const db = getDb();
  const before = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!before) throw new Error(`Invoice ${id} not found`);
  const row = db
    .update(invoices)
    .set({
      status,
      issueDate: status === "sent" && !before.issueDate ? today() : before.issueDate,
      dueDate: status === "sent" && !before.dueDate ? daysFromNow(14) : before.dueDate,
      updatedAt: now(),
    })
    .where(eq(invoices.id, id))
    .returning()
    .get();
  writeAudit({ actor, action: "update", entityType: "invoice", entityId: id, entityLabel: row.number, before: { status: before.status }, after: { status } });
  await emitEvent(`invoice.${status === "sent" ? "issued" : status}`, "invoice", id, { number: row.number, companyId: row.companyId }, actor);
  return row;
}

export function invoiceTotals(invoiceId: number): { totalCents: number; paidCents: number; balanceCents: number } {
  const db = getDb();
  const total = itemsTotal(db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).all());
  const paid = db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .all()
    .reduce((s, p) => s + p.amountCents, 0);
  return { totalCents: total, paidCents: paid, balanceCents: balanceCents(total, paid) };
}

export async function recordPayment(actor: Actor, input: { invoiceId: number; amountCents: number; method?: string; reference?: string }) {
  const db = getDb();
  const invoice = db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).get();
  if (!invoice) throw new Error(`Invoice ${input.invoiceId} not found`);
  const row = db
    .insert(payments)
    .values({ invoiceId: input.invoiceId, amountCents: input.amountCents, method: input.method ?? "bank_transfer", reference: input.reference ?? null, paidAt: now() })
    .returning()
    .get();
  writeAudit({ actor, action: "create", entityType: "payment", entityId: row.id, entityLabel: `Payment on ${invoice.number}`, after: { amountCents: row.amountCents, invoice: invoice.number } });
  await emitEvent("payment.recorded", "invoice", invoice.id, { number: invoice.number, amountCents: row.amountCents, companyId: invoice.companyId }, actor);

  const totals = invoiceTotals(invoice.id);
  if (totals.balanceCents === 0 && invoice.status !== "paid") {
    await setInvoiceStatus(actor, invoice.id, "paid");
  }
  return row;
}

/**
 * Lazy overdue sweep: flips issued invoices past due date to "overdue" and emits
 * invoice.overdue exactly once (at the flip). Called from layout on page touch.
 */
export async function sweepOverdueInvoices(actor: Actor): Promise<number> {
  const db = getDb();
  const t = today();
  const candidates = db.select().from(invoices).where(eq(invoices.status, "sent")).all().filter((i) => i.dueDate && i.dueDate < t);
  for (const inv of candidates) {
    db.update(invoices).set({ status: "overdue", updatedAt: now() }).where(eq(invoices.id, inv.id)).run();
    writeAudit({ actor, action: "update", entityType: "invoice", entityId: inv.id, entityLabel: inv.number, before: { status: "sent" }, after: { status: "overdue" } });
    await emitEvent("invoice.overdue", "invoice", inv.id, { number: inv.number, companyId: inv.companyId, dueDate: inv.dueDate }, actor);
  }
  return candidates.length;
}
