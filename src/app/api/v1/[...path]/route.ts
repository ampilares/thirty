/**
 * REST API v1 (INT-03 subset). JSON over the same core services as the UI,
 * with actor = "api" so every write is attributed and audited identically.
 *
 *   GET  /api/v1/{people|companies|deals|projects|tasks|quotes|invoices|payments|tickets|events}
 *   GET  /api/v1/{resource}/{id}
 *   POST /api/v1/{people|companies|deals|tickets|forms/lead}
 *   GET  /api/v1/audit?actor=&entity=
 *   GET  /api/v1/ask?q=…
 *   GET  /api/v1/export
 */
import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { ensureBootstrap } from "@/lib/bootstrap";
import { API_ACTOR } from "@/lib/actor";
import { createPerson, createCompany, findDuplicatePeople } from "@/lib/core/customers";
import { createDeal } from "@/lib/core/sales";
import { createTicket } from "@/lib/core/support";
import { invoiceTotals, quoteTotal } from "@/lib/core/money";
import { ask } from "@/lib/ask/engine";

export const dynamic = "force-dynamic";

const tables = {
  people: s.people,
  companies: s.companies,
  deals: s.deals,
  projects: s.projects,
  tasks: s.tasks,
  quotes: s.quotes,
  invoices: s.invoices,
  payments: s.payments,
  tickets: s.tickets,
  events: s.events,
} as const;

type ResourceKey = keyof typeof tables;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  ensureBootstrap();
  const { path } = await ctx.params;
  const [resource, id] = path;
  const db = getDb();

  if (resource === "ask") {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    if (!q) return json({ error: "Pass ?q=your question" }, 400);
    return json(await ask(q));
  }

  if (resource === "audit") {
    let rows = db.select().from(s.auditLog).orderBy(desc(s.auditLog.id)).limit(500).all();
    const actor = req.nextUrl.searchParams.get("actor");
    const entity = req.nextUrl.searchParams.get("entity");
    if (actor) rows = rows.filter((r) => r.actorType === actor);
    if (entity) rows = rows.filter((r) => r.entityType === entity);
    return json({ count: rows.length, results: rows });
  }

  if (resource === "export") {
    const payload: Record<string, unknown> = { exportedAt: new Date().toISOString(), workspace: db.select().from(s.workspace).get() };
    for (const [name, table] of Object.entries(tables)) payload[name] = db.select().from(table).all();
    payload.milestones = db.select().from(s.milestones).all();
    payload.notes = db.select().from(s.notes).all();
    payload.ticketMessages = db.select().from(s.ticketMessages).all();
    payload.quoteItems = db.select().from(s.quoteItems).all();
    payload.invoiceItems = db.select().from(s.invoiceItems).all();
    payload.automations = db.select().from(s.automations).all();
    payload.agents = db.select().from(s.agents).all();
    payload.agentRuns = db.select().from(s.agentRuns).all();
    payload.auditLog = db.select().from(s.auditLog).all();
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: { "content-type": "application/json", "content-disposition": `attachment; filename="thirty-export-${Date.now()}.json"` },
    });
  }

  const table = tables[resource as ResourceKey];
  if (!table) return json({ error: `Unknown resource "${resource}"` }, 404);

  if (id) {
    const row = db.select().from(table).all().find((r) => (r as { id: number }).id === Number(id));
    if (!row) return json({ error: "Not found" }, 404);
    if (resource === "invoices") return json({ ...row, ...invoiceTotals(Number(id)) });
    if (resource === "quotes") return json({ ...row, totalCents: quoteTotal(Number(id)) });
    return json(row);
  }
  const rows = db.select().from(table).all();
  return json({ count: rows.length, results: rows });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  ensureBootstrap();
  const { path } = await ctx.params;
  const [resource, sub] = path;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    // Public lead capture (§3.4): creates person (deduped) + deal, then the
    // Intake agent classifies and routes it via the normal event flow.
    if (resource === "forms" && sub === "lead") {
      const name = String(body.name ?? "").trim();
      const email = body.email ? String(body.email) : undefined;
      if (!name) return json({ error: "name is required" }, 400);
      const [firstName, ...rest] = name.split(/\s+/);

      const duplicates = email ? findDuplicatePeople({ email }) : [];
      let personId: number;
      if (duplicates.length > 0) {
        personId = duplicates[0].id;
      } else {
        const person = await createPerson(API_ACTOR, { firstName, lastName: rest.join(" "), email, companyId: null });
        personId = person.id;
      }
      const deal = await createDeal(API_ACTOR, {
        name: `${body.company ? `${body.company} — ` : ""}${String(body.message ?? "").slice(0, 40) || "New enquiry"} (${name})`,
        personId,
        valueCents: typeof body.valueCents === "number" ? body.valueCents : 0,
        source: String(body.source ?? "Website form"),
        description: body.message ? String(body.message) : undefined,
      });
      return json({ ok: true, dealId: deal.id, personId, deduplicated: duplicates.length > 0 }, 201);
    }

    if (resource === "people") {
      const person = await createPerson(API_ACTOR, {
        firstName: String(body.firstName ?? body.name ?? "Unknown"),
        lastName: body.lastName ? String(body.lastName) : undefined,
        email: body.email ? String(body.email) : undefined,
        companyId: typeof body.companyId === "number" ? body.companyId : null,
      });
      return json(person, 201);
    }
    if (resource === "companies") {
      const company = await createCompany(API_ACTOR, { name: String(body.name ?? "Unknown"), domain: body.domain ? String(body.domain) : undefined, industry: body.industry ? String(body.industry) : undefined });
      return json(company, 201);
    }
    if (resource === "deals") {
      const deal = await createDeal(API_ACTOR, {
        name: String(body.name ?? "New deal"),
        companyId: typeof body.companyId === "number" ? body.companyId : null,
        personId: typeof body.personId === "number" ? body.personId : null,
        valueCents: typeof body.valueCents === "number" ? body.valueCents : 0,
        source: body.source ? String(body.source) : "API",
      });
      return json(deal, 201);
    }
    if (resource === "tickets") {
      const ticket = await createTicket(API_ACTOR, {
        subject: String(body.subject ?? "New ticket"),
        body: body.body ? String(body.body) : undefined,
        companyId: typeof body.companyId === "number" ? body.companyId : null,
        personId: typeof body.personId === "number" ? body.personId : null,
        priority: body.priority ? String(body.priority) : undefined,
        authorName: body.authorName ? String(body.authorName) : undefined,
      });
      return json(ticket, 201);
    }
    return json({ error: `POST not supported for "${resource}"` }, 405);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
