import { eq } from "drizzle-orm";
import { getDb, now } from "../db/client";
import { approvals, deals, agents } from "../db/schema";
import type { Actor } from "../actor";
import { agentActor } from "../actor";
import { writeAudit } from "../audit";
import { addTicketMessage } from "../core/support";
import { addNote } from "../core/customers";

export function pendingApprovals() {
  const db = getDb();
  return db.select().from(approvals).where(eq(approvals.status, "pending")).all();
}

/**
 * AI-02: approving executes the proposed action through normal core services,
 * under the requesting agent's identity, with the approval as correlation.
 */
export async function decideApproval(actor: Actor, id: number, decision: "approved" | "rejected") {
  const db = getDb();
  const approval = db.select().from(approvals).where(eq(approvals.id, id)).get();
  if (!approval) throw new Error(`Approval ${id} not found`);
  if (approval.status !== "pending") return approval;

  let executedResult: string | null = null;
  if (decision === "approved") {
    const payload = (approval.payload ?? {}) as Record<string, unknown>;
    const requestingAgent = db.select().from(agents).all().find((a) => a.name === approval.requestedBy);
    const execActor = requestingAgent ? agentActor(requestingAgent.key, requestingAgent.name) : actor;

    if (approval.actionType === "send_reply" && typeof payload.ticketId === "number" && typeof payload.draft === "string") {
      await addTicketMessage(
        execActor,
        { ticketId: payload.ticketId, body: payload.draft, authorType: "agent", authorName: `${approval.requestedBy} (approved by ${actor.label})` },
        { type: "approval", id: approval.id }
      );
      executedResult = `Reply posted to ticket #${payload.ticketId}`;
    } else if (approval.actionType === "send_followup" && typeof payload.dealId === "number" && typeof payload.draft === "string") {
      const deal = db.select().from(deals).where(eq(deals.id, payload.dealId)).get();
      await addNote(execActor, "deal", payload.dealId, `📤 Follow-up sent (logged — no email provider connected):\n\n${payload.draft}`);
      writeAudit({
        actor: execActor,
        action: "execute",
        entityType: "deal",
        entityId: payload.dealId,
        entityLabel: deal?.name,
        after: { action: "send_followup", body: payload.draft },
        correlationType: "approval",
        correlationId: approval.id,
      });
      executedResult = `Follow-up logged on deal #${payload.dealId}`;
    } else {
      executedResult = "Approved (no executable payload — recorded only)";
    }
  }

  const updated = db
    .update(approvals)
    .set({ status: decision, decidedAt: now(), executedResult })
    .where(eq(approvals.id, id))
    .returning()
    .get();
  writeAudit({
    actor,
    action: "execute",
    entityType: "approval",
    entityId: id,
    entityLabel: approval.title,
    before: { status: "pending" },
    after: { status: decision, executedResult },
    correlationType: "approval",
    correlationId: id,
  });
  return updated;
}
