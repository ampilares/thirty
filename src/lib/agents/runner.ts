import { eq } from "drizzle-orm";
import { getDb, now, today } from "../db/client";
import { agents, agentRuns, type AgentEvidence, type AgentAction } from "../db/schema";
import { agentActor, type Actor } from "../actor";

export function getAgent(key: string) {
  const db = getDb();
  return db.select().from(agents).where(eq(agents.key, key)).get() ?? null;
}

export function listAgents() {
  const db = getDb();
  return db.select().from(agents).all();
}

/** Daily action budget (AGT-02): resets each day, consumed per executed action. */
export function budgetRemaining(agent: typeof agents.$inferSelect): number {
  const t = today();
  if (agent.budgetDate !== t) return agent.dailyActionBudget;
  return Math.max(0, agent.dailyActionBudget - agent.actionsToday);
}

export function consumeBudget(agentId: number, count: number): void {
  const db = getDb();
  const agent = db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return;
  const t = today();
  const used = agent.budgetDate === t ? agent.actionsToday : 0;
  db.update(agents).set({ actionsToday: used + count, budgetDate: t }).where(eq(agents.id, agentId)).run();
}

export type AgentRunDraft = {
  trigger: string;
  summary: string;
  evidence: AgentEvidence[];
  actions: AgentAction[];
  costCents: number;
  status?: "completed" | "failed" | "awaiting_approval";
};

export function recordAgentRun(agent: typeof agents.$inferSelect, draft: AgentRunDraft, durationMs: number) {
  const db = getDb();
  const status = draft.status ?? (draft.actions.some((a) => a.needsApproval && !a.executed) ? "awaiting_approval" : "completed");
  return db
    .insert(agentRuns)
    .values({
      agentId: agent.id,
      agentKey: agent.key,
      trigger: draft.trigger,
      status,
      summary: draft.summary,
      evidence: draft.evidence,
      actions: draft.actions,
      costCents: draft.costCents,
      durationMs,
      createdAt: now(),
    })
    .returning()
    .get();
}

export function actorFor(agent: typeof agents.$inferSelect): Actor {
  return agentActor(agent.key, agent.name);
}

/** True at most once per day per agent — used for lazily-scheduled daily runs. */
export function hasRunToday(agentKey: string): boolean {
  const db = getDb();
  const t = today();
  const runs = db.select().from(agentRuns).where(eq(agentRuns.agentKey, agentKey)).all();
  return runs.some((r) => r.createdAt.slice(0, 10) === t);
}
