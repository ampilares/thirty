import { eq, or, and, ne, sql } from "drizzle-orm";
import { getDb, now } from "../db/client";
import { companies, people, notes } from "../db/schema";
import type { Actor } from "../actor";
import { writeAudit, diffFields } from "../audit";
import { emitEvent } from "../events";

export type PersonInput = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  companyId?: number | null;
  tags?: string[];
  custom?: Record<string, unknown>;
};

export type CompanyInput = {
  name: string;
  domain?: string;
  industry?: string;
  phone?: string;
  address?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
};

export function personName(p: { firstName: string; lastName: string | null }): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

/** CORE-04 lite: likely duplicates by email or normalized name. */
export function findDuplicatePeople(input: { email?: string; firstName?: string; lastName?: string }, excludeId?: number) {
  const db = getDb();
  const clauses = [];
  if (input.email) clauses.push(eq(people.email, input.email));
  if (input.firstName && input.lastName) {
    clauses.push(
      and(
        sql`lower(${people.firstName}) = lower(${input.firstName})`,
        sql`lower(${people.lastName}) = lower(${input.lastName})`
      )
    );
  }
  if (clauses.length === 0) return [];
  let query = db
    .select()
    .from(people)
    .where(excludeId ? and(or(...clauses), ne(people.id, excludeId)) : or(...clauses));
  return query.all();
}

export function findDuplicateCompanies(name: string, excludeId?: number) {
  const db = getDb();
  const clause = sql`lower(${companies.name}) = lower(${name})`;
  return db
    .select()
    .from(companies)
    .where(excludeId ? and(clause, ne(companies.id, excludeId)) : clause)
    .all();
}

export async function createPerson(actor: Actor, input: PersonInput) {
  const db = getDb();
  const t = now();
  const row = db
    .insert(people)
    .values({
      firstName: input.firstName,
      lastName: input.lastName ?? "",
      email: input.email ?? null,
      phone: input.phone ?? null,
      title: input.title ?? null,
      companyId: input.companyId ?? null,
      tags: input.tags ?? [],
      custom: input.custom ?? {},
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  writeAudit({
    actor,
    action: "create",
    entityType: "person",
    entityId: row.id,
    entityLabel: personName(row),
    after: { firstName: row.firstName, lastName: row.lastName, email: row.email, companyId: row.companyId },
  });
  await emitEvent("person.created", "person", row.id, { name: personName(row), email: row.email }, actor);
  return row;
}

export async function updatePerson(actor: Actor, id: number, patch: Partial<PersonInput>) {
  const db = getDb();
  const before = db.select().from(people).where(eq(people.id, id)).get();
  if (!before) throw new Error(`Person ${id} not found`);
  const row = db
    .update(people)
    .set({ ...patch, lastName: patch.lastName ?? before.lastName, updatedAt: now() })
    .where(eq(people.id, id))
    .returning()
    .get();
  const d = diffFields(before as Record<string, unknown>, patch as Record<string, unknown>);
  writeAudit({
    actor,
    action: "update",
    entityType: "person",
    entityId: id,
    entityLabel: personName(row),
    before: d.before,
    after: d.after,
  });
  await emitEvent("person.updated", "person", id, d.after, actor);
  return row;
}

export async function createCompany(actor: Actor, input: CompanyInput) {
  const db = getDb();
  const t = now();
  const row = db
    .insert(companies)
    .values({
      name: input.name,
      domain: input.domain ?? null,
      industry: input.industry ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      tags: input.tags ?? [],
      custom: input.custom ?? {},
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  writeAudit({
    actor,
    action: "create",
    entityType: "company",
    entityId: row.id,
    entityLabel: row.name,
    after: { name: row.name, domain: row.domain, industry: row.industry },
  });
  await emitEvent("company.created", "company", row.id, { name: row.name }, actor);
  return row;
}

export async function updateCompany(actor: Actor, id: number, patch: Partial<CompanyInput> & { health?: string }) {
  const db = getDb();
  const before = db.select().from(companies).where(eq(companies.id, id)).get();
  if (!before) throw new Error(`Company ${id} not found`);
  const row = db
    .update(companies)
    .set({ ...patch, updatedAt: now() })
    .where(eq(companies.id, id))
    .returning()
    .get();
  const d = diffFields(before as Record<string, unknown>, patch as Record<string, unknown>);
  writeAudit({
    actor,
    action: "update",
    entityType: "company",
    entityId: id,
    entityLabel: row.name,
    before: d.before,
    after: d.after,
  });
  await emitEvent("company.updated", "company", id, d.after, actor);
  return row;
}

export async function addNote(actor: Actor, entityType: string, entityId: number, body: string) {
  const db = getDb();
  const row = db
    .insert(notes)
    .values({ entityType, entityId, authorLabel: actor.label, body, createdAt: now() })
    .returning()
    .get();
  writeAudit({
    actor,
    action: "create",
    entityType: "note",
    entityId: row.id,
    entityLabel: `Note on ${entityType} #${entityId}`,
    after: { body },
  });
  await emitEvent("note.created", entityType, entityId, { noteId: row.id }, actor);
  return row;
}
