import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { deals, stages, companies } from "@/lib/db/schema";
import { formatMoney } from "@/lib/core/money";
import { PageHeader, Badge, btnPrimary, fmtDate } from "@/components/ui";
import { moveDealStageAction } from "@/app/actions";

export default async function SalesPage() {
  const db = getDb();
  const stageRows = db.select().from(stages).orderBy(stages.position).all();
  const dealRows = db.select().from(deals).all();
  const companyRows = db.select().from(companies).all();
  const openStages = stageRows.filter((s) => s.kind === "open");
  const closedStages = stageRows.filter((s) => s.kind !== "open");

  return (
    <>
      <PageHeader
        title="Sales pipeline"
        subtitle={`${dealRows.filter((d) => openStages.some((s) => s.id === d.stageId)).length} open deals · ${formatMoney(dealRows.filter((d) => openStages.some((s) => s.id === d.stageId)).reduce((sum, d) => sum + d.valueCents, 0))}`}
        actions={<Link href="/sales/new" className={btnPrimary}>+ New deal</Link>}
      />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {openStages.map((stage) => {
          const inStage = dealRows.filter((d) => d.stageId === stage.id);
          return (
            <div key={stage.id} className="w-64 shrink-0 rounded-xl bg-neutral-100/80 p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{stage.name}</h2>
                <span className="text-xs text-neutral-400">{formatMoney(inStage.reduce((s, d) => s + d.valueCents, 0))}</span>
              </div>
              <div className="space-y-2">
                {inStage.map((deal) => {
                  const company = companyRows.find((c) => c.id === deal.companyId);
                  const idleDays = Math.floor((Date.now() - new Date(deal.stageChangedAt).getTime()) / 86_400_000);
                  return (
                    <div key={deal.id} className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
                      <Link href={`/sales/${deal.id}`} className="block text-sm font-medium leading-snug hover:underline">{deal.name}</Link>
                      <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                        <span>{company?.name ?? "—"}</span>
                        <span className="font-medium text-neutral-700">{formatMoney(deal.valueCents)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <Badge value={deal.priority} />
                        {idleDays >= 10 && <span className="text-[11px] text-amber-600">idle {idleDays}d</span>}
                        {deal.expectedClose && <span className="text-[11px] text-neutral-400">→ {fmtDate(deal.expectedClose)}</span>}
                      </div>
                      <form action={moveDealStageAction} className="mt-2 flex gap-1">
                        <input type="hidden" name="dealId" value={deal.id} />
                        <select name="stageId" defaultValue={stage.id} className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-1 text-xs">
                          {stageRows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer">Move</button>
                      </form>
                    </div>
                  );
                })}
                {inStage.length === 0 && <p className="px-2 py-3 text-center text-xs text-neutral-400">Empty</p>}
              </div>
            </div>
          );
        })}

        <div className="w-64 shrink-0 space-y-3">
          {closedStages.map((stage) => {
            const inStage = dealRows.filter((d) => d.stageId === stage.id);
            return (
              <div key={stage.id} className={`rounded-xl p-2 ${stage.kind === "won" ? "bg-emerald-50" : "bg-red-50/70"}`}>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <h2 className={`text-xs font-semibold uppercase tracking-wide ${stage.kind === "won" ? "text-emerald-600" : "text-red-500"}`}>{stage.name} ({inStage.length})</h2>
                  <span className="text-xs text-neutral-400">{formatMoney(inStage.reduce((s, d) => s + d.valueCents, 0))}</span>
                </div>
                <div className="space-y-1.5">
                  {inStage.map((deal) => (
                    <Link key={deal.id} href={`/sales/${deal.id}`} className="block rounded-lg border border-white bg-white/70 px-3 py-2 text-sm hover:bg-white">
                      <span className="font-medium">{deal.name}</span>
                      <span className="block text-xs text-neutral-500">{formatMoney(deal.valueCents)}{deal.lostReason ? ` · ${deal.lostReason}` : ""}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
