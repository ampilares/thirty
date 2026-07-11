import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { agents, agentRuns, approvals } from "@/lib/db/schema";
import { budgetRemaining } from "@/lib/agents/runner";
import { formatMoney } from "@/lib/core/money";
import { PageHeader, Card, Badge, fmtDateTime, inputClass, btnSecondary } from "@/components/ui";
import { runAgentAction, updateAgentPolicyAction } from "@/app/actions";

const TIER_LABELS = ["0 — Observe only", "1 — Recommend (approval required)", "2 — Execute internal actions", "3 — Execute policy-approved external actions"];

export default async function AgentsPage() {
  const db = getDb();
  const agentRows = db.select().from(agents).all();
  const runs = db.select().from(agentRuns).orderBy(desc(agentRuns.id)).limit(300).all();
  const pending = db.select().from(approvals).all().filter((a) => a.status === "pending");

  return (
    <>
      <PageHeader
        title="Agents"
        subtitle="Every agent has an identity, autonomy tier, daily budget, and a full run ledger — nothing acts outside its policy"
        actions={
          <Link href="/agents/approvals" className={btnSecondary}>
            Approvals queue {pending.length > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">{pending.length}</span>}
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {agentRows.map((agent) => {
          const agentRunRows = runs.filter((r) => r.agentId === agent.id);
          const last = agentRunRows[0];
          const totalCost = agentRunRows.reduce((s, r) => s + r.costCents, 0);
          return (
            <Card key={agent.id} title={agent.name} actions={<Badge value={agent.enabled ? "active" : "closed"} label={agent.enabled ? "enabled" : "disabled"} />}>
              <p className="text-sm text-neutral-600">{agent.description}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-neutral-50 p-2">
                  <dt className="text-[11px] uppercase tracking-wide text-neutral-400">Runs</dt>
                  <dd className="font-semibold">{agentRunRows.length}</dd>
                </div>
                <div className="rounded-lg bg-neutral-50 p-2">
                  <dt className="text-[11px] uppercase tracking-wide text-neutral-400">Budget left today</dt>
                  <dd className="font-semibold">{budgetRemaining(agent)}/{agent.dailyActionBudget}</dd>
                </div>
                <div className="rounded-lg bg-neutral-50 p-2">
                  <dt className="text-[11px] uppercase tracking-wide text-neutral-400">AI spend</dt>
                  <dd className="font-semibold">{formatMoney(totalCost)}</dd>
                </div>
              </dl>
              {last && (
                <p className="mt-3 rounded-lg border border-neutral-100 bg-neutral-50/60 p-2 text-xs text-neutral-500">
                  Last run {fmtDateTime(last.createdAt)} — {last.summary.slice(0, 140)}{last.summary.length > 140 ? "…" : ""}{" "}
                  <Link href={`/agents/runs/${last.id}`} className="underline">details</Link>
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-neutral-100 pt-3">
                <form action={updateAgentPolicyAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="agentId" value={agent.id} />
                  <label className="text-xs">
                    <span className="mb-0.5 block font-medium text-neutral-500">Autonomy tier cap</span>
                    <select name="tier" defaultValue={agent.tier} className={inputClass}>
                      {TIER_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-medium text-neutral-500">Daily budget</span>
                    <input name="budget" type="number" min="1" defaultValue={agent.dailyActionBudget} className={`${inputClass} w-20`} />
                  </label>
                  <label className="text-xs">
                    <span className="mb-0.5 block font-medium text-neutral-500">Enabled</span>
                    <select name="enabled" defaultValue={agent.enabled} className={inputClass}>
                      <option value="1">Yes</option><option value="0">No</option>
                    </select>
                  </label>
                  <button className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50 cursor-pointer">Save policy</button>
                </form>
                <form action={runAgentAction}>
                  <input type="hidden" name="agentKey" value={agent.key} />
                  <button className={btnSecondary}>▶ Run now</button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mt-8 mb-2 text-sm font-semibold text-neutral-700">Recent runs</h2>
      <div className="space-y-2">
        {runs.slice(0, 15).map((r) => {
          const agent = agentRows.find((a) => a.id === r.agentId);
          return (
            <Link key={r.id} href={`/agents/runs/${r.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-sm transition hover:border-neutral-300">
              <span className="flex min-w-0 items-center gap-2">
                <Badge value="agent" label={agent?.name ?? r.agentKey} />
                <span className="truncate text-neutral-600">{r.summary.slice(0, 110)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-neutral-400">
                <Badge value={r.status} /> {fmtDateTime(r.createdAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
