import { eq } from "drizzle-orm";
import { getDb, now } from "../db/client";
import { deals, stages, projects, companies, people } from "../db/schema";
import type { Actor } from "../actor";
import { writeAudit, diffFields } from "../audit";
import { emitEvent } from "../events";

export type DealInput = {
  name: string;
  companyId?: number | null;
  personId?: number | null;
  valueCents?: number;
  stageId?: number;
  priority?: string;
  source?: string;
  expectedClose?: string | null;
  description?: string;
  custom?: Record<string, unknown>;
};

export function listStages() {
  const db = getDb();
  return db.select().from(stages).orderBy(stages.position).all();
}

export async function createDeal(actor: Actor, input: DealInput) {
  const db = getDb();
  const t = now();
  const firstStage = db.select().from(stages).orderBy(stages.position).limit(1).get();
  const stageId = input.stageId ?? firstStage!.id;
  const row = db
    .insert(deals)
    .values({
      name: input.name,
      companyId: input.companyId ?? null,
      personId: input.personId ?? null,
      valueCents: input.valueCents ?? 0,
      pipelineId: 1,
      stageId,
      priority: input.priority ?? "normal",
      source: input.source ?? null,
      ownerId: 1,
      expectedClose: input.expectedClose ?? null,
      description: input.description ?? null,
      custom: input.custom ?? {},
      stageChangedAt: t,
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  writeAudit({
    actor,
    action: "create",
    entityType: "deal",
    entityId: row.id,
    entityLabel: row.name,
    after: { name: row.name, valueCents: row.valueCents, source: row.source, stageId: row.stageId },
  });
  await emitEvent(
    "deal.created",
    "deal",
    row.id,
    { name: row.name, valueCents: row.valueCents, source: row.source ?? "", priority: row.priority, companyId: row.companyId, personId: row.personId },
    actor
  );
  return row;
}

export async function updateDeal(actor: Actor, id: number, patch: Partial<DealInput> & { lostReason?: string }) {
  const db = getDb();
  const before = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!before) throw new Error(`Deal ${id} not found`);
  const row = db
    .update(deals)
    .set({ ...patch, updatedAt: now() })
    .where(eq(deals.id, id))
    .returning()
    .get();
  const d = diffFields(before as Record<string, unknown>, patch as Record<string, unknown>);
  writeAudit({ actor, action: "update", entityType: "deal", entityId: id, entityLabel: row.name, before: d.before, after: d.after });
  await emitEvent("deal.updated", "deal", id, d.after, actor);
  return row;
}

/**
 * Moves a deal to a new stage. Winning triggers the delivery handoff (OPS-01):
 * a project is created carrying scope, value, customer, and linkage.
 */
export async function moveDealStage(actor: Actor, dealId: number, stageId: number, lostReason?: string) {
  const db = getDb();
  const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
  if (!deal) throw new Error(`Deal ${dealId} not found`);
  const fromStage = db.select().from(stages).where(eq(stages.id, deal.stageId)).get();
  const toStage = db.select().from(stages).where(eq(stages.id, stageId)).get();
  if (!toStage) throw new Error(`Stage ${stageId} not found`);
  if (deal.stageId === stageId) return { deal, project: null };

  const t = now();
  const updated = db
    .update(deals)
    .set({ stageId, stageChangedAt: t, updatedAt: t, lostReason: toStage.kind === "lost" ? (lostReason ?? "Not specified") : deal.lostReason })
    .where(eq(deals.id, dealId))
    .returning()
    .get();

  writeAudit({
    actor,
    action: "update",
    entityType: "deal",
    entityId: dealId,
    entityLabel: deal.name,
    before: { stage: fromStage?.name },
    after: { stage: toStage.name, ...(toStage.kind === "lost" ? { lostReason: updated.lostReason } : {}) },
  });
  await emitEvent(
    "deal.stage_changed",
    "deal",
    dealId,
    { from: fromStage?.name ?? "?", to: toStage.name, name: deal.name, valueCents: deal.valueCents, companyId: deal.companyId },
    actor
  );

  let project = null;
  if (toStage.kind === "won") {
    project = db
      .insert(projects)
      .values({
        name: deal.name.replace(/ ?[—-] ?(enquiry|opportunity)$/i, ""),
        companyId: deal.companyId,
        dealId: deal.id,
        status: "planning",
        startDate: t.slice(0, 10),
        dueDate: null,
        valueCents: deal.valueCents,
        description: deal.description ? `Handoff from won deal: ${deal.description}` : `Created automatically when "${deal.name}" was won.`,
        custom: {},
        createdAt: t,
        updatedAt: t,
      })
      .returning()
      .get();
    writeAudit({
      actor,
      action: "create",
      entityType: "project",
      entityId: project.id,
      entityLabel: project.name,
      after: { name: project.name, dealId: deal.id, valueCents: project.valueCents, source: "won-deal handoff" },
    });
    await emitEvent(
      "deal.won",
      "deal",
      dealId,
      { name: deal.name, valueCents: deal.valueCents, projectId: project.id, companyId: deal.companyId },
      actor
    );
    await emitEvent("project.created", "project", project.id, { name: project.name, dealId: deal.id }, actor);
  }
  if (toStage.kind === "lost") {
    await emitEvent("deal.lost", "deal", dealId, { name: deal.name, reason: updated.lostReason ?? "" }, actor);
  }
  return { deal: updated, project };
}

export function dealWithRelations(id: number) {
  const db = getDb();
  const deal = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!deal) return null;
  return {
    ...deal,
    stage: db.select().from(stages).where(eq(stages.id, deal.stageId)).get() ?? null,
    company: deal.companyId ? (db.select().from(companies).where(eq(companies.id, deal.companyId)).get() ?? null) : null,
    person: deal.personId ? (db.select().from(people).where(eq(people.id, deal.personId)).get() ?? null) : null,
  };
}

/** Deals sitting in an open stage with no movement for `staleDays`. */
export function staleDeals(staleDays = 10) {
  const db = getDb();
  const all = db.select().from(deals).all();
  const stageRows = listStages();
  const openStageIds = new Set(stageRows.filter((s) => s.kind === "open").map((s) => s.id));
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  return all.filter((d) => openStageIds.has(d.stageId) && new Date(d.stageChangedAt).getTime() < cutoff);
}
