import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { deals, stages, companies, people, pipelines } from "@/lib/db/schema";
import { formatMoney } from "@/lib/core/money";
import { Badge, ModuleHeader, ToolbarSearch, fmtDate } from "@/components/ui";
import { moveDealStageAction } from "@/app/actions";

type Params = { view?: string; q?: string; filter?: string; status?: string };

export default async function SalesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const db = getDb();
  const stageRows = db.select().from(stages).orderBy(stages.position).all();
  const pipelineRows = db.select().from(pipelines).all();
  const allDeals = db.select().from(deals).all();
  const companyRows = db.select().from(companies).all();
  const peopleRows = db.select().from(people).all();
  const q = (params.q ?? "").toLowerCase();
  const dealRows = allDeals.filter((d)=>!q || [d.name,d.source,companyRows.find(c=>c.id===d.companyId)?.name].some(v=>v?.toLowerCase().includes(q)));
  const view = params.view === "list" ? "list" : "board";
  const openStageIds = new Set(stageRows.filter(s=>s.kind === "open").map(s=>s.id));
  const openDeals = dealRows.filter(d=>openStageIds.has(d.stageId));
  const href = (next: Partial<Params>) => { const merged={...params,...next}; const sp=new URLSearchParams(); Object.entries(merged).forEach(([k,v])=>v&&sp.set(k,v)); return `/sales?${sp}`; };

  return <div className="module-shell relative min-h-full">
    <ModuleHeader title="Opportunities" tabs={[
      { label: "Opportunities", href: "/sales", active: true },
      { label: "Pipelines", href: "/settings" },
      { label: "Bulk Actions", href: "/sales?view=list" },
    ]} />
    <div className="module-content">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="toolbar-control min-w-[250px] text-sm font-medium" aria-label="Pipeline">{pipelineRows.map(p=><option key={p.id}>{p.name} Pipeline</option>)}</select>
        <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{openDeals.length} opportunities</span>
        <div className="ml-auto flex items-center gap-2"><button className="toolbar-control" type="button">⇩ Import</button><Link href="/sales/new" className="primary-cta">＋ Add opportunity</Link><button className="toolbar-control" type="button">⋮</button></div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <nav className="flex gap-3"><Link href={href({ view:"board" })} className={`border-b-2 px-2 pb-3 text-xs font-medium ${view === "board" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}>☷ Open opportunities</Link><Link href={href({ view:"list" })} className={`border-b-2 px-2 pb-3 text-xs font-medium ${view === "list" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}>＋ List</Link></nav>
        <div className="mb-2 flex rounded-lg border border-slate-200 bg-white p-0.5"><Link href={href({ view:"board" })} className={`rounded px-3 py-1 text-xs ${view === "board" ? "bg-blue-50 text-blue-700" : "text-slate-400"}`}>▦</Link><Link href={href({ view:"list" })} className={`rounded px-3 py-1 text-xs ${view === "list" ? "bg-blue-50 text-blue-700" : "text-slate-400"}`}>☷</Link></div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2"><input type="hidden" name="view" value={view}/><Link href={href({ filter: params.filter ? undefined : "open" })} className={`toolbar-control ${params.filter ? "is-active" : ""}`}>▽ Advanced filters{params.filter && <span className="rounded-full bg-blue-600 px-1.5 text-[10px] text-white">1</span>}</Link><select className="toolbar-control"><option>⇅ Sort: Stage order</option><option>Value: high to low</option><option>Last activity</option></select><div className="ml-auto flex gap-2"><ToolbarSearch defaultValue={params.q} placeholder="Search opportunities"/><button className="toolbar-control">Search</button><button className="toolbar-control" type="button">⚙ Manage fields</button></div></form>

      {view === "board" ? <div className="pane-scroll flex gap-3 overflow-x-auto pb-4">
        {stageRows.map((stage)=>{ const inStage=dealRows.filter(d=>d.stageId===stage.id); return <section key={stage.id} className="w-[275px] shrink-0"><header className="surface-card mb-2 p-3"><div className="flex items-center justify-between"><h2 className="truncate text-xs font-semibold text-slate-800">{stage.name}</h2><button className="text-slate-400" type="button">⋮</button></div><div className="mt-1 flex gap-2 text-[10px] text-slate-400"><span>{inStage.length} opportunities</span><span>{formatMoney(inStage.reduce((sum,d)=>sum+d.valueCents,0))}</span></div></header><div className={`min-h-[430px] space-y-2 rounded-xl p-2 ${stage.kind === "won" ? "bg-emerald-50/60" : stage.kind === "lost" ? "bg-red-50/50" : "bg-slate-100/70"}`}>
          {inStage.map(deal=>{ const company=companyRows.find(c=>c.id===deal.companyId); const person=peopleRows.find(p=>p.id===deal.personId); const idleDays=Math.floor((Date.now()-new Date(deal.stageChangedAt).getTime())/86400000); return <article key={deal.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-2"><Link href={`/sales/${deal.id}`} className="text-xs font-semibold leading-4 text-slate-800 hover:text-blue-600">{deal.name}</Link><span className="text-slate-300">⋮</span></div><p className="mt-2 text-[11px] font-medium text-slate-600">{formatMoney(deal.valueCents)}</p><p className="mt-1 truncate text-[10px] text-slate-400">{company?.name} · {person ? `${person.firstName} ${person.lastName}` : "No contact"}</p><div className="mt-3 flex items-center justify-between"><Badge value={deal.priority}/>{idleDays>10?<span className="text-[10px] text-amber-600">idle {idleDays}d</span>:<span className="text-[10px] text-slate-400">{fmtDate(deal.expectedClose)}</span>}</div><form action={moveDealStageAction} className="mt-3 flex gap-1 border-t border-slate-100 pt-2"><input type="hidden" name="dealId" value={deal.id}/><select name="stageId" defaultValue={stage.id} className="min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px]">{stageRows.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="rounded bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">Move</button></form></article>})}
          {!inStage.length && <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-400">Drop opportunities here</div>}
        </div></section>})}
      </div> : <div className="surface-card overflow-hidden"><table className="ghl-table"><thead><tr><th className="w-10"><input type="checkbox"/></th><th>Opportunity</th><th>Contact</th><th>Pipeline stage</th><th>Status</th><th>Value</th><th>Owner</th><th>Expected close</th></tr></thead><tbody>{dealRows.map(deal=>{const stage=stageRows.find(s=>s.id===deal.stageId);const company=companyRows.find(c=>c.id===deal.companyId);return <tr key={deal.id}><td><input type="checkbox"/></td><td><Link href={`/sales/${deal.id}`} className="font-semibold text-slate-800">{deal.name}</Link><span className="block text-[10px] text-slate-400">{company?.name}</span></td><td>{peopleRows.find(p=>p.id===deal.personId)?.firstName ?? "—"}</td><td>{stage?.name}</td><td><Badge value={stage?.kind === "open" ? "active" : stage?.kind ?? "closed"}/></td><td className="font-semibold">{formatMoney(deal.valueCents)}</td><td>Alex Reeve</td><td>{fmtDate(deal.expectedClose)}</td></tr>})}</tbody></table></div>}
    </div>
    {params.filter && <div className="fixed bottom-0 right-0 top-[54px] z-30 w-[380px] border-l border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">▽ Advanced filters</h2><Link href={href({ filter: undefined })} className="text-xl text-slate-400">×</Link></div><form className="space-y-3 p-5"><select className="toolbar-control w-full"><option>Opportunity status</option><option>Owner</option><option>Pipeline stage</option><option>Value</option></select><select className="toolbar-control w-full"><option>Is</option><option>Is not</option><option>Greater than</option></select><select name="status" className="toolbar-control w-full"><option>Open</option><option>Won</option><option>Lost</option></select><div className="flex justify-center gap-2 py-2 text-xs text-slate-400"><button type="button" className="toolbar-control">AND</button><button type="button" className="toolbar-control">OR</button></div><Link href={href({ filter: undefined })} className="primary-cta w-full justify-center">Apply filter</Link></form></div>}
  </div>;
}
