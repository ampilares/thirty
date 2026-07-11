import { eq } from "drizzle-orm";
import { getDb, today } from "./db/client";
import { deals, stages, invoices, payments, tickets, tasks, milestones, automationRuns, agentRuns, approvals } from "./db/schema";
import { invoiceTotals } from "./core/money";

export type Metrics = ReturnType<typeof computeMetrics>;

export function computeMetrics() {
  const db = getDb();
  const t = today();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const stageRows = db.select().from(stages).orderBy(stages.position).all();
  const allDeals = db.select().from(deals).all();
  const wonStage = stageRows.find((s) => s.kind === "won");
  const lostStage = stageRows.find((s) => s.kind === "lost");

  const pipelineByStage = stageRows
    .filter((s) => s.kind === "open")
    .map((s) => {
      const inStage = allDeals.filter((d) => d.stageId === s.id);
      return { stage: s.name, count: inStage.length, valueCents: inStage.reduce((sum, d) => sum + d.valueCents, 0) };
    });

  const wonDeals = allDeals.filter((d) => d.stageId === wonStage?.id);
  const lostDeals = allDeals.filter((d) => d.stageId === lostStage?.id);
  const closed = wonDeals.length + lostDeals.length;

  const allInvoices = db.select().from(invoices).all();
  const withTotals = allInvoices.map((i) => ({ ...i, ...invoiceTotals(i.id) }));
  const allPayments = db.select().from(payments).all();
  const month = t.slice(0, 7);

  const allTickets = db.select().from(tickets).all();
  const openTickets = allTickets.filter((x) => x.status === "open" || x.status === "pending");
  const resolvedTickets = allTickets.filter((x) => x.resolvedAt);
  const slaMet = resolvedTickets.filter((x) => x.slaDueAt && x.resolvedAt! <= x.slaDueAt);

  const allTasks = db.select().from(tasks).all();
  const doneTasks = allTasks.filter((x) => x.status === "done");
  const onTime = doneTasks.filter((x) => !x.dueDate || (x.completedAt && x.completedAt.slice(0, 10) <= x.dueDate));
  const allMilestones = db.select().from(milestones).all();

  const autoRuns = db.select().from(automationRuns).all();
  const realRuns = autoRuns.filter((r) => !r.simulated);
  const agRuns = db.select().from(agentRuns).all();
  const allApprovals = db.select().from(approvals).all();
  const allAgentActions = agRuns.flatMap((r) => r.actions ?? []);

  return {
    leads30d: allDeals.filter((d) => d.createdAt >= thirtyDaysAgo).length,
    pipelineByStage,
    pipelineTotalCents: pipelineByStage.reduce((s, x) => s + x.valueCents, 0),
    winRatePct: closed ? Math.round((wonDeals.length / closed) * 100) : 0,
    wonCount: wonDeals.length,
    lostCount: lostDeals.length,
    bookedRevenueCents: wonDeals.reduce((s, d) => s + d.valueCents, 0),
    invoicedCents: withTotals.filter((i) => i.status !== "draft" && i.status !== "void").reduce((s, i) => s + i.totalCents, 0),
    collectedCents: allPayments.reduce((s, p) => s + p.amountCents, 0),
    collectedThisMonthCents: allPayments.filter((p) => p.paidAt.slice(0, 7) === month).reduce((s, p) => s + p.amountCents, 0),
    overdueCents: withTotals.filter((i) => i.status === "overdue").reduce((s, i) => s + i.balanceCents, 0),
    overdueCount: withTotals.filter((i) => i.status === "overdue").length,
    outstandingCents: withTotals.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.balanceCents, 0),
    openTicketsByPriority: (["urgent", "high", "normal", "low"] as const).map((p) => ({ priority: p, count: openTickets.filter((x) => x.priority === p).length })),
    openTicketCount: openTickets.length,
    slaCompliancePct: resolvedTickets.length ? Math.round((slaMet.length / resolvedTickets.length) * 100) : 100,
    taskOnTimePct: doneTasks.length ? Math.round((onTime.length / doneTasks.length) * 100) : 100,
    overdueTaskCount: allTasks.filter((x) => x.status === "open" && x.dueDate && x.dueDate < t).length,
    milestonesPending: allMilestones.filter((m) => m.status === "pending").length,
    milestonesLate: allMilestones.filter((m) => m.status === "pending" && m.dueDate && m.dueDate < t).length,
    automationRunCount: realRuns.length,
    automationSuccessPct: realRuns.length ? Math.round((realRuns.filter((r) => r.status === "success").length / realRuns.length) * 100) : 100,
    automationFailures: realRuns.filter((r) => r.status === "failed").length,
    simulationCount: autoRuns.filter((r) => r.simulated).length,
    agentRunCount: agRuns.length,
    agentActionsProposed: allAgentActions.length,
    agentActionsExecuted: allAgentActions.filter((a) => a.executed).length,
    approvalsPending: allApprovals.filter((a) => a.status === "pending").length,
    approvalsApproved: allApprovals.filter((a) => a.status === "approved").length,
    approvalsRejected: allApprovals.filter((a) => a.status === "rejected").length,
    aiSpendCents: agRuns.reduce((s, r) => s + r.costCents, 0),
  };
}
