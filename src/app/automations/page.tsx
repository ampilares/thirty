import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { automations, automationRuns } from "@/lib/db/schema";
import { Badge, ModuleHeader, ToolbarSearch, fmtDateTime } from "@/components/ui";
import { toggleAutomationAction } from "@/app/actions";

type Params = { folder?: string; q?: string; tab?: string; filters?: string };

export default async function AutomationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const db = getDb();
  const allRows = db.select().from(automations).all();
  const runs = db.select().from(automationRuns).orderBy(desc(automationRuns.id)).limit(200).all();
  const q=(params.q??"").toLowerCase();
  const family = (trigger:string)=>trigger.split(".")[0];
  const rows=allRows.filter(a=>(!params.folder||family(a.trigger)===params.folder)&&(!q||[a.name,a.description,a.trigger].some(v=>v?.toLowerCase().includes(q))));
  const folders=[...new Set(allRows.map(a=>family(a.trigger)))];
  const href=(next:Partial<Params>)=>{const merged={...params,...next};const sp=new URLSearchParams();Object.entries(merged).forEach(([k,v])=>v&&sp.set(k,v));return `/automations?${sp}`};

  return <div className="module-shell min-h-full">
    <ModuleHeader title="Automation" tabs={[
      { label:"Workflows",href:"/automations",active:true },
      { label:"Overview",href:"/analytics",badge:"Beta" },
      { label:"Global Workflow Settings",href:"/settings" },
    ]}/>
    <div className="module-content">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Workflows list</h2><p className="mt-1 text-xs text-slate-400">Build, publish and monitor customer operations</p></div><div className="flex items-center gap-2"><button type="button" className="toolbar-control">▱ Create folder</button><Link href="/automations/new?mode=ai" className="toolbar-control border-violet-200 text-violet-700">✦ Build using AI</Link><details className="group relative"><summary className="primary-cta list-none cursor-pointer">＋ Create workflow</summary><div className="absolute right-0 top-11 z-30 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"><Link href="/automations/new" className="flex items-center gap-3 px-4 py-3 text-xs text-slate-700 hover:bg-slate-50"><span className="text-lg">＋</span><span><strong className="block">Start from scratch</strong><span className="mt-0.5 block text-[10px] text-slate-400">Open the visual builder</span></span></Link><Link href="/automations/new?mode=ai" className="flex items-center gap-3 px-4 py-3 text-xs text-slate-700 hover:bg-slate-50"><span className="text-violet-600">✦</span>Build using AI</Link><Link href="/automations/new?mode=template" className="flex items-center gap-3 px-4 py-3 text-xs text-slate-700 hover:bg-slate-50"><span>▱</span>Select from template</Link><span className="flex cursor-not-allowed items-center gap-3 px-4 py-3 text-xs text-slate-300"><span>⇧</span>Import from campaign</span><Link href="/automations/new?mode=company" className="flex items-center gap-3 px-4 py-3 text-xs text-slate-700 hover:bg-slate-50"><span>▦</span>Company-based workflow</Link></div></details></div></div>
      <nav className="mb-4 flex flex-wrap items-center gap-7 border-b border-slate-200 text-xs"><Link href={href({tab:"all"})} className={`border-b-2 px-2 pb-3 ${(params.tab??"all")==="all"?"border-blue-600 font-semibold text-blue-700":"border-transparent text-slate-500"}`}>All workflows</Link><Link href={href({tab:"review"})} className="border-b-2 border-transparent px-2 pb-3 text-slate-500">Needs review <span className="text-slate-300">(0)</span></Link><Link href={href({tab:"deleted"})} className="border-b-2 border-transparent px-2 pb-3 text-slate-500">Deleted</Link><button type="button" className="border-b-2 border-transparent px-2 pb-3 text-slate-500">＋ New smart list</button><button type="button" className="ml-auto pb-3 text-slate-400">⚙ Customize list</button></nav>
      <form className="mb-4 flex flex-wrap items-center gap-2"><Link href={href({filters:params.filters?undefined:"open"})} className={`toolbar-control ${params.filters?"is-active":""}`}>▽ Advanced filters</Link><div className="ml-auto flex items-center gap-2"><button type="button" className="toolbar-control">◷</button><button type="button" className="toolbar-control">☷</button><ToolbarSearch defaultValue={params.q} placeholder="Search workflows"/><button className="toolbar-control">Search</button></div></form>
      <div className="surface-card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">{params.folder?<><Link href="/automations" className="hover:text-blue-600">Back</Link><span className="mx-2">/</span><strong className="text-slate-700 capitalize">{params.folder}</strong></>:"Home"}</div>
        <table className="ghl-table"><thead><tr><th className="w-10"><input type="checkbox"/></th><th>Name</th><th>Status</th><th>Total enrolled</th><th>Active enrolled</th><th>Last updated</th><th className="w-20"></th></tr></thead><tbody>
          {!params.folder&&folders.map(folder=><tr key={folder}><td><input type="checkbox"/></td><td colSpan={5}><Link href={href({folder})} className="flex items-center gap-3 font-semibold capitalize text-slate-700"><span className="text-lg text-slate-500">▱</span>{folder} workflows<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-400">{allRows.filter(a=>family(a.trigger)===folder).length}</span></Link></td><td>⋮</td></tr>)}
          {(params.folder||q)&&rows.map(a=>{const aRuns=runs.filter(r=>r.automationId===a.id&&!r.simulated);const last=aRuns[0];const activeCount=aRuns.filter(r=>r.status==="success").length;return <tr key={a.id}><td><input type="checkbox"/></td><td><Link href={`/automations/${a.id}`} className="font-semibold text-blue-600 hover:underline">{a.name} ↗</Link><span className="block max-w-xl truncate text-[10px] text-slate-400">{a.description}</span></td><td><Badge value={a.enabled?"active":"draft"} label={a.enabled?"Published":a.currentVersion>0?"Paused":"Draft"}/></td><td>{aRuns.length}</td><td>{activeCount}</td><td><span className="text-[11px] text-slate-500">{last?fmtDateTime(last.startedAt):fmtDateTime(a.updatedAt)}</span></td><td>{a.currentVersion>0&&<form action={toggleAutomationAction}><input type="hidden" name="automationId" value={a.id}/><input type="hidden" name="to" value={a.enabled?"off":"on"}/><button className="toolbar-control min-h-8 px-2">{a.enabled?"Pause":"Resume"}</button></form>}</td></tr>})}
        </tbody></table>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 text-xs"><button disabled className="toolbar-control min-h-8 opacity-40">Previous</button><span className="flex h-8 w-8 items-center justify-center rounded border border-blue-500 text-blue-600">1</span><button disabled className="toolbar-control min-h-8 opacity-40">Next</button><select className="toolbar-control min-h-8"><option>10 / page</option></select></div>
      </div>
      {!params.folder&&!q&&<p className="mt-3 text-[11px] text-slate-400">Open a folder to view its workflows. Search spans every folder.</p>}
    </div>
  </div>;
}
