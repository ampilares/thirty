import { computeMetrics } from "@/lib/analytics";
import { formatMoney } from "@/lib/core/money";
import { PageHeader, Card, Stat } from "@/components/ui";

function Bar({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 shrink-0 text-neutral-500">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded bg-neutral-100">
        <div className="h-full rounded bg-neutral-800/85" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-neutral-600">{display}</span>
    </div>
  );
}

export default async function AnalyticsPage() {
  const m = computeMetrics();
  const maxStage = Math.max(...m.pipelineByStage.map((s) => s.valueCents), 1);
  const maxTickets = Math.max(...m.openTicketsByPriority.map((t) => t.count), 1);
  const cashMax = Math.max(m.invoicedCents, m.collectedCents, m.outstandingCents, 1);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Computed live from the operational data — not a detached reporting copy" />

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">Sales</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Leads (30d)" value={String(m.leads30d)} />
        <Stat label="Pipeline value" value={formatMoney(m.pipelineTotalCents)} />
        <Stat label="Win rate" value={`${m.winRatePct}%`} sub={`${m.wonCount} won · ${m.lostCount} lost`} />
        <Stat label="Booked revenue" value={formatMoney(m.bookedRevenueCents)} tone="ok" />
      </div>
      <Card title="Pipeline by stage" className="mb-6">
        <div className="space-y-2">
          {m.pipelineByStage.map((s) => (
            <Bar key={s.stage} label={s.stage} value={s.valueCents} max={maxStage} display={`${formatMoney(s.valueCents)} · ${s.count}`} />
          ))}
        </div>
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">Money</h2>
      <Card title="Cash flow" className="mb-4">
        <div className="space-y-2">
          <Bar label="Invoiced" value={m.invoicedCents} max={cashMax} display={formatMoney(m.invoicedCents)} />
          <Bar label="Collected" value={m.collectedCents} max={cashMax} display={formatMoney(m.collectedCents)} />
          <Bar label="Outstanding" value={m.outstandingCents} max={cashMax} display={formatMoney(m.outstandingCents)} />
          <Bar label="Overdue" value={m.overdueCents} max={cashMax} display={formatMoney(m.overdueCents)} />
        </div>
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">Delivery & support</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tasks completed on time" value={`${m.taskOnTimePct}%`} />
        <Stat label="Overdue tasks" value={String(m.overdueTaskCount)} tone={m.overdueTaskCount > 0 ? "warn" : "ok"} />
        <Stat label="Milestones late" value={`${m.milestonesLate}/${m.milestonesPending}`} tone={m.milestonesLate > 0 ? "warn" : "ok"} />
        <Stat label="SLA compliance" value={`${m.slaCompliancePct}%`} />
      </div>
      <Card title="Open tickets by priority" className="mb-6">
        <div className="space-y-2">
          {m.openTicketsByPriority.map((t) => (
            <Bar key={t.priority} label={t.priority} value={t.count} max={maxTickets} display={String(t.count)} />
          ))}
        </div>
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">AI & automation trust</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Automation runs" value={String(m.automationRunCount)} sub={`${m.automationSuccessPct}% success · ${m.simulationCount} simulations`} />
        <Stat label="Automation failures" value={String(m.automationFailures)} tone={m.automationFailures > 0 ? "danger" : "ok"} />
        <Stat label="Agent runs" value={String(m.agentRunCount)} sub={`${m.agentActionsExecuted}/${m.agentActionsProposed} actions executed`} />
        <Stat label="Approvals" value={`${m.approvalsApproved}✓ ${m.approvalsRejected}✗`} sub={`${m.approvalsPending} pending`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Estimated AI spend" value={formatMoney(m.aiSpendCents)} sub="cost ledger across agent runs" />
      </div>
    </>
  );
}
