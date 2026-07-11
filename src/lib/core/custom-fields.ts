import { eq } from "drizzle-orm";
import { getDb, now } from "../db/client";
import { customFieldDefs } from "../db/schema";
import type { Actor } from "../actor";
import { writeAudit } from "../audit";

export function listCustomFields(objectType?: string) {
  const db = getDb();
  return objectType
    ? db.select().from(customFieldDefs).where(eq(customFieldDefs.objectType, objectType)).all()
    : db.select().from(customFieldDefs).all();
}

export async function addCustomField(
  actor: Actor,
  input: { objectType: string; label: string; type: "text" | "number" | "date" | "select"; options?: string[] }
) {
  const db = getDb();
  const key = input.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const row = db
    .insert(customFieldDefs)
    .values({ objectType: input.objectType, key, label: input.label, type: input.type, options: input.options ?? null, createdAt: now() })
    .returning()
    .get();
  writeAudit({
    actor,
    action: "create",
    entityType: "custom_field",
    entityId: row.id,
    entityLabel: `${input.objectType}.${key}`,
    after: { objectType: input.objectType, label: input.label, type: input.type },
  });
  return row;
}

export async function removeCustomField(actor: Actor, id: number) {
  const db = getDb();
  const before = db.select().from(customFieldDefs).where(eq(customFieldDefs.id, id)).get();
  if (!before) return;
  db.delete(customFieldDefs).where(eq(customFieldDefs.id, id)).run();
  writeAudit({
    actor,
    action: "delete",
    entityType: "custom_field",
    entityId: id,
    entityLabel: `${before.objectType}.${before.key}`,
    before: { objectType: before.objectType, label: before.label },
  });
}
