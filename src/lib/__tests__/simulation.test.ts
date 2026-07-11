/**
 * AUT-02 / NFR guarantee: simulation makes zero business writes.
 * Runs against a throwaway copy of the seeded database.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const seededDb = path.join(process.cwd(), "data", "thirty.db");
const tmpDb = path.join(os.tmpdir(), `thirty-test-${Date.now()}.db`);

beforeAll(() => {
  if (!fs.existsSync(seededDb)) {
    throw new Error("data/thirty.db missing — run `npm run db:reset` before `npm test`");
  }
  fs.copyFileSync(seededDb, tmpDb);
  process.env.THIRTY_DB_PATH = tmpDb;
});

describe("automation simulation", () => {
  it("predicts actions without writing business records", async () => {
    const { getDb } = await import("../db/client");
    const { runAutomationForEvent } = await import("../automations/engine");
    const schema = await import("../db/schema");
    const db = getDb();

    const automation = db.select().from(schema.automations).all().find((a) => a.trigger === "deal.created");
    expect(automation).toBeTruthy();

    const tasksBefore = db.select().from(schema.tasks).all().length;
    const notesBefore = db.select().from(schema.notes).all().length;
    const auditBefore = db.select().from(schema.auditLog).all().length;

    const run = await runAutomationForEvent(
      automation!,
      { id: -1, type: "deal.created", entityType: "deal", entityId: 1, payload: { name: "Simulated deal", source: "Website form", valueCents: 100000 } },
      { execute: false }
    );

    expect(run.status).toBe("simulated");
    expect(run.simulated).toBe(1);
    // The predicted steps are visible…
    expect((run.steps ?? []).some((st) => st.action === "create_task")).toBe(true);
    // …but nothing was actually written.
    expect(db.select().from(schema.tasks).all().length).toBe(tasksBefore);
    expect(db.select().from(schema.notes).all().length).toBe(notesBefore);
    expect(db.select().from(schema.auditLog).all().length).toBe(auditBefore);
  });

  it("records a skipped run when conditions do not match, still without writes", async () => {
    const { getDb } = await import("../db/client");
    const { runAutomationForEvent } = await import("../automations/engine");
    const schema = await import("../db/schema");
    const db = getDb();
    const automation = db.select().from(schema.automations).all().find((a) => a.trigger === "deal.created")!;
    const tasksBefore = db.select().from(schema.tasks).all().length;

    const run = await runAutomationForEvent(
      automation,
      { id: -1, type: "deal.created", entityType: "deal", entityId: 1, payload: { name: "Referral deal", source: "Referral", valueCents: 100000 } },
      { execute: false }
    );
    expect(run.status).toBe("simulated");
    expect((run.steps ?? [])[0].detail).toContain("Conditions did not match");
    expect(db.select().from(schema.tasks).all().length).toBe(tasksBefore);
  });
});
