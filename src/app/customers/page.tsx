import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { companies, people, deals, tickets } from "@/lib/db/schema";
import { Badge, ModuleHeader, ToolbarSearch } from "@/components/ui";
import { personName } from "@/lib/core/customers";

type Params = { tab?: string; q?: string; sort?: string; tag?: string; filters?: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const active = params.tab === "companies" ? "companies" : "people";
  const db = getDb();
  const companyRows = db.select().from(companies).all();
  const peopleRows = db.select().from(people).all();
  const dealRows = db.select().from(deals).all();
  const ticketRows = db.select().from(tickets).all();
  const q = (params.q ?? "").toLowerCase();
  const sortedPeople = peopleRows.filter((p) => {
    const company = companyRows.find((c) => c.id === p.companyId);
    return !q || [p.firstName,p.lastName,p.email,p.phone,company?.name].some((v)=>v?.toLowerCase().includes(q));
  }).sort((a,b)=> params.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const sortedCompanies = companyRows.filter((c)=>!q || [c.name,c.domain,c.industry].some((v)=>v?.toLowerCase().includes(q)));

  const href = (next: Partial<Params>) => {
    const merged = { ...params, ...next };
    const sp = new URLSearchParams();
    Object.entries(merged).forEach(([k,v])=>v && sp.set(k,v));
    return `/customers?${sp.toString()}`;
  };

  return (
    <div className="module-shell relative min-h-full">
      <ModuleHeader title="Contacts" tabs={[
        { label: "Smart Lists", href: "/customers", active: true },
        { label: "Bulk Actions", href: "/customers?tab=people" },
        { label: "Custom Fields", href: "/settings" },
        { label: "Tasks", href: "/delivery" },
        { label: "Companies", href: "/customers?tab=companies" },
      ]} actions={<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{active === "people" ? peopleRows.length : companyRows.length} records</span>} />

      <div className="module-content">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-3"><h2 className="text-xl font-semibold text-slate-900">{active === "people" ? "Contacts" : "Companies"}</h2><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{active === "people" ? peopleRows.length : companyRows.length} {active === "people" ? "Contacts" : "Companies"}</span></div></div>
          <div className="flex items-center gap-2"><button type="button" className="toolbar-control">⇩ Import</button><Link href={active === "people" ? "/customers/new-person" : "/customers/new-company"} className="primary-cta">＋ Add {active === "people" ? "Contact" : "Company"}</Link><button type="button" className="toolbar-control px-3">⋮</button></div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex gap-5 text-sm"><Link href={href({ tab: "people" })} className={`border-b-2 px-1 pb-3 ${active === "people" ? "border-blue-600 font-semibold text-blue-700" : "border-transparent text-slate-500"}`}>☷ All contacts</Link><Link href={href({ tab: "companies" })} className={`border-b-2 px-1 pb-3 ${active === "companies" ? "border-blue-600 font-semibold text-blue-700" : "border-transparent text-slate-500"}`}>▣ Companies</Link><button className="border-b-2 border-transparent px-1 pb-3 text-slate-500">＋ Add Smart List</button></div>
        </div>

        <form className="mb-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="tab" value={active} />
          <Link href={href({ filters: params.filters ? undefined : "open" })} className={`toolbar-control ${params.filters ? "is-active" : ""}`}>▽ Filters{params.tag && <span className="rounded-full bg-blue-600 px-1.5 text-[10px] text-white">1</span>}</Link>
          <select name="sort" defaultValue={params.sort ?? "newest"} className="toolbar-control" aria-label="Sort contacts"><option value="newest">⇅ Newest first</option><option value="oldest">Oldest first</option></select>
          <div className="ml-auto flex items-center gap-2"><ToolbarSearch defaultValue={params.q} placeholder={`Search ${active === "people" ? "Contacts" : "Companies"}`} /><button className="toolbar-control" type="submit">Search</button><button className="toolbar-control" type="button">⚙ Manage fields</button></div>
        </form>

        <div className="surface-card overflow-hidden">
          {active === "people" ? <table className="ghl-table">
            <thead><tr><th className="w-10"><input type="checkbox" aria-label="Select all" /></th><th>Contact name ↕</th><th>Phone ↕</th><th>Email ↕</th><th>Business name ↕</th><th>Created</th><th>Last activity</th><th>Tags</th></tr></thead>
            <tbody>{sortedPeople.map((p)=>{ const c=companyRows.find((row)=>row.id===p.companyId); return <tr key={p.id}><td><input type="checkbox" aria-label={`Select ${personName(p)}`} /></td><td><Link href={`/customers/people/${p.id}`} className="flex items-center gap-2 font-semibold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] text-indigo-700">{p.firstName[0]}{p.lastName[0]}</span>{personName(p)}</Link></td><td>{p.phone ?? <span className="text-slate-300">—</span>}</td><td><span className="text-slate-600">{p.email ?? "—"}</span></td><td>{c ? <Link href={`/customers/companies/${c.id}`} className="hover:text-blue-600">{c.name}</Link> : "—"}</td><td><span className="block">{p.createdAt.slice(0,10)}</span><span className="text-[10px] text-slate-400">{p.createdAt.slice(11,16)}</span></td><td><span className="text-slate-400">{p.updatedAt.slice(0,10)}</span></td><td><div className="flex gap-1">{(p.tags ?? []).length ? p.tags!.map(t=><span key={t} className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">{t}</span>) : <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">contact</span>}</div></td></tr>})}</tbody>
          </table> : <table className="ghl-table">
            <thead><tr><th className="w-10"><input type="checkbox" /></th><th>Company</th><th>Industry</th><th>Health</th><th>Open opportunities</th><th>Open conversations</th><th>Tags</th></tr></thead>
            <tbody>{sortedCompanies.map((c)=><tr key={c.id}><td><input type="checkbox" /></td><td><Link href={`/customers/companies/${c.id}`} className="font-semibold text-slate-800">{c.name}</Link><span className="block text-[10px] text-slate-400">{c.domain}</span></td><td>{c.industry ?? "—"}</td><td><Badge value={c.health}/></td><td>{dealRows.filter(d=>d.companyId===c.id).length}</td><td>{ticketRows.filter(t=>t.companyId===c.id && t.status!=="closed").length}</td><td>{(c.tags ?? []).map(t=><span key={t} className="mr-1 rounded-full bg-slate-100 px-2 py-1 text-[10px]">{t}</span>)}</td></tr>)}</tbody>
          </table>}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500"><span>Page 1 of 1</span><div className="flex items-center gap-2"><select className="toolbar-control min-h-8"><option>20 / page</option><option>50 / page</option><option>100 / page</option></select><button disabled className="toolbar-control min-h-8 opacity-40">Previous</button><span className="flex h-8 w-8 items-center justify-center rounded border border-blue-500 text-blue-600">1</span><button disabled className="toolbar-control min-h-8 opacity-40">Next</button></div></div>
        </div>
      </div>

      {params.filters && <div className="fixed bottom-0 right-0 top-[54px] z-30 w-[380px] border-l border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">▽ Contact filters</h2><Link href={href({ filters: undefined })} className="text-xl text-slate-400">×</Link></div><form className="space-y-4 p-5"><input type="hidden" name="tab" value={active}/><label className="block text-xs font-semibold text-slate-500">Tag<select name="tag" defaultValue={params.tag} className="toolbar-control mt-1 w-full"><option value="">Any tag</option><option value="client">Client</option><option value="prospect">Prospect</option></select></label><label className="block text-xs font-semibold text-slate-500">Created date<select className="toolbar-control mt-1 w-full"><option>Any time</option><option>Last 7 days</option><option>Last 30 days</option></select></label><button className="primary-cta w-full justify-center">Apply filters</button></form></div>}
    </div>
  );
}
