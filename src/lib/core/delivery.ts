import { eq, and } from "drizzle-orm";
import { getDb, now, today } from "../db/client";
import { projects, milestones, tasks } from "../db/schema";
import type { Actor } from "../actor";
import { writeAudit, diffFields } from "../audit";
import { emitEvent } from "../events";

export async function createProject(
  actor: Actor,
  input: { name: string; companyId?: number | null; dealId?: number | null; status?: string; startDate?: string | null; dueDate?: string | null; valueCents?: number; description?: string }
) {
  const db = getDb();
  const t = now();
  const row = db
    .insert(projects)
    .values({
      name: input.name,
      companyId: input.companyId ?? null,
      dealId: input.dealId ?? null,
      status: input.status ?? "planning",
      startDate: input.startDate ?? t.slice(0, 10),
      dueDate: input.dueDate ?? null,
      valueCents: input.valueCents ?? 0,
      description: input.description ?? null,
      custom: {},
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  writeAudit({ actor, action: "create", entityType: "project", entityId: row.id, entityLabel: row.name, after: { name: row.name, status: row.status } });
  await emitEvent("project.created", "project", row.id, { name: row.name }, actor);
  return row;
}

export async function updateProject(actor: Actor, id: number, patch: Record<string, unknown>) {
  const db = getDb();
  const before = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!before) throw new Error(`Project ${id} not found`);
  const row = db.update(projects).set({ ...patch, updatedAt: now() }).where(eq(projects.id, id)).returning().get();
  const d = diffFields(before as Record<string, unknown>, patch);
  writeAudit({ actor, action: "update", entityType: "project", entityId: id, entityLabel: row.name, before: d.before, after: d.after });
  await emitEvent("project.updated", "project", id, d.after, actor);
  return row;
}

export async function createMilestone(actor: Actor, input: { projectId: number; name: string; dueDate?: string | null }) {
  const db = getDb();
  const row = db
    .insert(milestones)
    .values({ projectId: input.projectId, name: input.name, dueDate: input.dueDate ?? null, status: "pending", createdAt: now() })
    .returning()
    .get();
  writeAudit({ actor, action: "create", entityType: "milestone", entityId: row.id, entityLabel: row.name, after: { name: row.name, dueDate: row.dueDate } });
  return row;
}

export async function setMilestoneStatus(actor: Actor, id: number, status: "pending" | "done" | "missed") {
  const db = getDb();
  const before = db.select().from(milestones).where(eq(milestones.id, id)).get();
  if (!before) throw new Error(`Milestone ${id} not found`);
  const row = db.update(milestones).set({ status }).where(eq(milestones.id, id)).returning().get();
  writeAudit({ actor, action: "update", entityType: "milestone", entityId: id, entityLabel: row.name, before: { status: before.status }, after: { status } });
  if (status === "done") await emitEvent("milestone.reached", "milestone", id, { name: row.name, projectId: row.projectId }, actor);
  return row;
}

export async function createTask(
  actor: Actor,
  input: { title: string; projectId?: number | null; milestoneId?: number | null; dealId?: number | null; ticketId?: number | null; assigneeId?: number | null; dueDate?: string | null; priority?: string },
  correlation?: { type: "agent_run" | "automation_run"; id: number }
) {
  const db = getDb();
  const t = now();
  const row = db
    .insert(tasks)
    .values({
      title: input.title,
      projectId: input.projectId ?? null,
      milestoneId: input.milestoneId ?? null,
      dealId: input.dealId ?? null,
      ticketId: input.ticketId ?? null,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      status: "open",
      priority: input.priority ?? "normal",
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  writeAudit({
    actor,
    action: "create",
    entityType: "task",
    entityId: row.id,
    entityLabel: row.title,
    after: { title: row.title, dueDate: row.dueDate, priority: row.priority },
    correlationType: correlation?.type,
    correlationId: correlation?.id,
  });
  await emitEvent("task.created", "task", row.id, { title: row.title }, actor);
  return row;
}

export async function setTaskStatus(actor: Actor, id: number, status: "open" | "done") {
  const db = getDb();
  const before = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!before) throw new Error(`Task ${id} not found`);
  const t = now();
  const row = db
    .update(tasks)
    .set({ status, updatedAt: t, completedAt: status === "done" ? t : null })
    .where(eq(tasks.id, id))
    .returning()
    .get();
  writeAudit({ actor, action: "update", entityType: "task", entityId: id, entityLabel: row.title, before: { status: before.status }, after: { status } });
  if (status === "done") await emitEvent("task.completed", "task", id, { title: row.title }, actor);
  return row;
}

export function projectProgress(projectId: number): { total: number; done: number; pct: number } {
  const db = getDb();
  const rows = db.select().from(tasks).where(eq(tasks.projectId, projectId)).all();
  const done = rows.filter((r) => r.status === "done").length;
  return { total: rows.length, done, pct: rows.length ? Math.round((done / rows.length) * 100) : 0 };
}

export function overdueTasks() {
  const db = getDb();
  const t = today();
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "open")))
    .all()
    .filter((r) => r.dueDate && r.dueDate < t);
}

export function overdueMilestones() {
  const db = getDb();
  const t = today();
  return db
    .select()
    .from(milestones)
    .where(eq(milestones.status, "pending"))
    .all()
    .filter((r) => r.dueDate && r.dueDate < t);
}
