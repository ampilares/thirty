import { getDb, now } from "./db/client";
import { auditLog } from "./db/schema";
import type { Actor } from "./actor";

export type AuditEntry = {
  actor: Actor;
  action: "create" | "update" | "delete" | "execute";
  entityType: string;
  entityId: number;
  entityLabel?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  correlationType?: "agent_run" | "automation_run" | "approval";
  correlationId?: number;
};

/** Single write path for the audit ledger — every core-service mutation calls this. */
export function writeAudit(entry: AuditEntry): void {
  const db = getDb();
  db.insert(auditLog)
    .values({
      actorType: entry.actor.type,
      actorId: entry.actor.id ?? null,
      actorLabel: entry.actor.label,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      correlationType: entry.correlationType ?? null,
      correlationId: entry.correlationId ?? null,
      createdAt: now(),
    })
    .run();
}

/** Picks only the fields that actually changed, for compact before/after diffs. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key] = before[key];
      a[key] = after[key];
    }
  }
  return { before: b, after: a };
}
