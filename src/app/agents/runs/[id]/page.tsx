import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { agentRuns, agents, approvals } from "@/lib/db/schema";
import { formatMoney } from "@/lib/core/money";
import { PageHeader, Card, Badge, fmtDateTime, EmptyState } from "@/components/ui";

const entityHref: Record<string, (id: number) => string> = {
  deal: (id) => `/sales/${id}`,
  company: (id) => `/customers/companies/${id}`,
  person: (id) => `/customers/people/${id}`,
  invoice: (id) => `/money/invoices/${id}`,
  ticket: (id) => `/support/${id}`,
  project: (id) => `/delivery/${id}`,
  milestone: () => `/delivery`,
  task: () => `/delivery`,
};

export default async function AgentRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const run = db.select().from(agentRuns).where(eq(agentRuns.id, Number(id))).get();
  if (!run) notFound();
  const agent = db.select().from(agents).where(eq(agents.id, run.agentId)).get();
  const linkedApprovals = db.select().from(approvals).where(eq(approvals.agentRunId, run.id)).all();

  return (
    <>
      <PageHeader
        title={`${agent?.name ?? run.agentKey} — run #${run.id}`}
        subtitle={`Triggered by: ${run.trigger} · ${fmtDateTime(run.createdAt)} · ${run.durationMs}ms · estimated cost ${formatMoney(run.costCents)}`}
        actions={<Badge value={run.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Summary">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{run.summary}</p>
        </Card>

        <Card title={`Evidence — records this run consulted (${(run.evidence ?? []).length})`}>
          {(run.evidence ?? []).length === 0 ? <EmptyState text="No evidence recorded." /> : (
            <ul className="space-y-1.5 text-sm">
              {(run.evidence ?? []).map((e, i) => {
                const href = entityHref[e.entityType]?.(e.entityId);
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 text-neutral-300">▸</span>
                    <span>
                      {href ? <Link href={href} className="font-medium hover:underline">{e.label}</Link> : <span className="font-medium">{e.label}</span>}
                      {e.detail && <span className="text-neutral-500"> — {e.detail}</span>}
                      <span className="ml-1 text-xs text-neutral-400">({e.entityType} #{e.entityId})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Actions (${(run.actions ?? []).length})`} className="lg:col-span-2">
          {(run.actions ?? []).length === 0 ? <EmptyState text="Observation only — no actions taken (Tier 0)." /> : (
            <ul className="space-y-2 text-sm">
              {(run.actions ?? []).map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2">
                  <span>
                    <code className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{a.type}</code>
                    {a.description}
                  </span>
                  <Badge value={a.executed ? "success" : a.needsApproval ? "awaiting_approval" : "skipped"} label={a.executed ? "executed" : a.needsApproval ? "needs approval" : "not executed"} />
                </li>
              ))}
            </ul>
          )}
          {linkedApprovals.length > 0 && (
            <p className="mt-3 border-t border-neutral-100 pt-2 text-sm">
              {linkedApprovals.filter((a) => a.status === "pending").length > 0
                ? <Link href="/agents/approvals" className="underline">Review pending approvals from this run →</Link>
                : `Approvals from this run: ${linkedApprovals.map((a) => a.status).join(", ")}`}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
