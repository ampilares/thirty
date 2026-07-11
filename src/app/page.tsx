import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { getDb, today } from "@/lib/db/client";
import { invoices, tickets, approvals, automationRuns, agentRuns, companies, automations } from "@/lib/db/schema";
import { staleDeals } from "@/lib/core/sales";
import { overdueTasks, overdueMilestones } from "@/lib/core/delivery";
import { formatMoney, invoiceTotals } from "@/lib/core/money";
import { computeMetrics } from "@/lib/analytics";
import { PageHeader, Card, Badge, Stat, EmptyState, fmtDate, btnSecondary } from "@/components/ui";
import { decideApprovalAction, runAgentAction } from "./actions";

export default async function HomePage() {
  const db = getDb();
  const m = computeMetrics();
  const briefing = db.select().from(agentRuns).where(eq(agentRuns.agentKey, "chief_of_staff")).orderBy(desc(agentRuns.id)).limit(1).get();
  const stale = staleDeals(10);
  const overdueInv = db.select().from(invoices).where(eq(invoices.status, "overdue")).all();
  const lateTasks = overdueTasks();
  const lateMilestones = overdueMilestones();
  const escalated = db.select().from(tickets).all().filter((t) => t.escalated === 1 && t.status !== "resolved" && t.status !== "closed");
  const pendingApprovals = db.select().from(approvals).where(eq(approvals.status, "pending")).all();
  const failures = db.select().from(automationRuns).where(eq(automationRuns.status, "failed")).orderBy(desc(automationRuns.id)).limit(5).all();
  const healthChanges = db.select().from(companies).all().filter((c) => c.health !== "good");

  return (
    <>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, Alex`}
        subtitle={`Owner Command Centre · ${today()}`}
        actions={
          <form action={runAgentAction}>
            <input type="hidden" name="agentKey" value="chief_of_staff" />
            <button className={btnSecondary}>↻ Refresh briefing</button>
          </form>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open pipeline" value={formatMoney(m.pipelineTotalCents)} sub={`${m.pipelineByStage.reduce((s, x) => s + x.count, 0)} deals`} href="/sales" />
        <Stat label="Outstanding" value={formatMoney(m.outstandingCents)} sub={`${m.overdueCount} overdue · ${formatMoney(m.overdueCents)}`} href="/money" tone={m.overdueCents > 0 ? "danger" : "ok"} />
        <Stat label="Delivery exceptions" value={String(lateMilestones.length + lateTasks.length)} sub={`${lateMilestones.length} milestones · ${lateTasks.length} tasks late`} href="/delivery" tone={lateMilestones.length + lateTasks.length > 0 ? "warn" : "ok"} />
        <Stat label="Open tickets" value={String(m.openTicketCount)} sub={`${escalated.length} escalated`} href="/support" tone={escalated.length > 0 ? "danger" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Daily briefing — Owner Chief of Staff" className="lg:col-span-2">
          {briefing ? (
            <div className="flex flex-col gap-2">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{briefing.summary}</p>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Badge value="agent" label="agent" /> generated {briefing.createdAt.slice(0, 16).replace("T", " ")} ·{" "}
                <Link href={`/agents/runs/${briefing.id}`} className="underline hover:text-neutral-600">view evidence ({(briefing.evidence ?? []).length})</Link>
              </div>
            </div>
          ) : (
            <EmptyState text="No briefing yet — click Refresh briefing." />
          )}
        </Card>

        <Card title={`Agent approvals (${pendingApprovals.length})`} actions={<Link href="/agents/approvals" className="text-xs text-neutral-400 hover:text-neutral-600">all →</Link>}>
          {pendingApprovals.length === 0 ? (
            <EmptyState text="Nothing waiting for you." />
          ) : (
            <ul className="space-y-3">
              {pendingApprovals.slice(0, 3).map((a) => (
                <li key={a.id} className="rounded-lg border border-neutral-100 bg-neutral-50/60 p-3">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-neutral-500">requested by {a.requestedBy}</div>
                  <div className="mt-2 flex gap-2">
                    <form action={decideApprovalAction}>
                      <input type="hidden" name="approvalId" value={a.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 cursor-pointer">Approve</button>
                    </form>
                    <form action={decideApprovalAction}>
                      <input type="hidden" name="approvalId" value={a.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <button className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 cursor-pointer">Reject</button>
                    </form>
                    <Link href="/agents/approvals" className="ml-auto text-xs text-neutral-400 underline hover:text-neutral-600">preview</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`At-risk deals (${stale.length})`} actions={<Link href="/sales" className="text-xs text-neutral-400 hover:text-neutral-600">pipeline →</Link>}>
          {stale.length === 0 ? (
            <EmptyState text="Every open deal has moved in the last 10 days." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stale.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/sales/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
                  <span className="text-xs text-neutral-500">
                    {formatMoney(d.valueCents)} · idle {Math.floor((Date.now() - new Date(d.stageChangedAt).getTime()) / 86_400_000)}d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Overdue invoices (${overdueInv.length})`} actions={<Link href="/money" className="text-xs text-neutral-400 hover:text-neutral-600">money →</Link>}>
          {overdueInv.length === 0 ? (
            <EmptyState text="No overdue invoices." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {overdueInv.map((i) => {
                const t = invoiceTotals(i.id);
                return (
                  <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/money/invoices/${i.id}`} className="font-medium hover:underline">{i.number}</Link>
                    <span className="text-xs text-red-600">{formatMoney(t.balanceCents)} · due {fmtDate(i.dueDate)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Delivery exceptions (${lateMilestones.length + lateTasks.length})`} actions={<Link href="/delivery" className="text-xs text-neutral-400 hover:text-neutral-600">delivery →</Link>}>
          {lateMilestones.length + lateTasks.length === 0 ? (
            <EmptyState text="Delivery is on schedule." />
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {lateMilestones.map((ms) => (
                <li key={`m${ms.id}`} className="flex items-center justify-between py-2">
                  <Link href={`/delivery/${ms.projectId}`} className="hover:underline">◆ {ms.name}</Link>
                  <span className="text-xs text-red-600">milestone due {fmtDate(ms.dueDate)}</span>
                </li>
              ))}
              {lateTasks.slice(0, 5).map((tk) => (
                <li key={`t${tk.id}`} className="flex items-center justify-between py-2">
                  <span>☐ {tk.title}</span>
                  <span className="text-xs text-red-600">task due {fmtDate(tk.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Customer health & escalations`} actions={<Link href="/customers" className="text-xs text-neutral-400 hover:text-neutral-600">customers →</Link>}>
          {healthChanges.length === 0 && escalated.length === 0 ? (
            <EmptyState text="All customers healthy." />
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {healthChanges.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <Link href={`/customers/companies/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  <Badge value={c.health} />
                </li>
              ))}
              {escalated.map((t) => (
                <li key={`e${t.id}`} className="flex items-center justify-between py-2">
                  <Link href={`/support/${t.id}`} className="hover:underline">⚠ {t.subject}</Link>
                  <Badge value={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Automation failures" actions={<Link href="/automations" className="text-xs text-neutral-400 hover:text-neutral-600">automations →</Link>} className="lg:col-span-2">
          {failures.length === 0 ? (
            <EmptyState text="No automation failures. 🎉" />
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {failures.map((r) => {
                const a = db.select().from(automations).where(eq(automations.id, r.automationId)).get();
                return (
                  <li key={r.id} className="flex items-center justify-between py-2">
                    <Link href={`/automations/${r.automationId}`} className="hover:underline">{a?.name ?? `Automation #${r.automationId}`}</Link>
                    <span className="text-xs text-red-600">{r.error?.slice(0, 80)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
