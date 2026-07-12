import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { people, companies, tickets, ticketMessages } from "@/lib/db/schema";
import { customerTimeline } from "@/lib/core/timeline";
import { findDuplicatePeople, personName } from "@/lib/core/customers";
import { listCustomFields } from "@/lib/core/custom-fields";
import { ModuleHeader, Badge, fmtDateTime } from "@/components/ui";
import { addNoteAction, addTicketMessageAction } from "@/app/actions";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const person = db.select().from(people).where(eq(people.id, Number(id))).get();
  if (!person) notFound();
  const company = person.companyId ? db.select().from(companies).where(eq(companies.id, person.companyId)).get() : null;
  const timeline = customerTimeline({ personId: person.id, companyId: person.companyId ?? undefined });
  const duplicates = findDuplicatePeople({ email: person.email ?? undefined, firstName: person.firstName, lastName: person.lastName }, person.id);
  const fieldDefs = listCustomFields("person");
  const conversation = db.select().from(tickets).where(eq(tickets.personId, person.id)).orderBy(desc(tickets.updatedAt)).limit(1).get();
  const messages = conversation ? db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, conversation.id)).all() : [];

  return <div className="module-shell flex min-h-full flex-col">
    <ModuleHeader title="Contacts" tabs={[
      { label: "Smart Lists", href: "/customers", active: true }, { label: "Bulk Actions", href: "/customers" },
      { label: "Custom Fields", href: "/settings" }, { label: "Tasks", href: "/delivery" }, { label: "Companies", href: "/customers?tab=companies" },
    ]} />
    {duplicates.length > 0 && <div className="mx-5 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">Possible duplicate: {duplicates.map(d=><Link key={d.id} href={`/customers/people/${d.id}`} className="ml-1 underline">{personName(d)}</Link>)}</div>}
    <div className="flex min-h-[650px] flex-1 gap-3 overflow-hidden p-3">
      <aside className="pane-scroll surface-card w-[310px] shrink-0 overflow-y-auto">
        <div className="border-b border-slate-200 p-4"><Link href="/customers" className="text-xs text-slate-500 hover:text-blue-600">← Contact details</Link><div className="mt-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{person.firstName[0]}{person.lastName[0]}</span><div className="min-w-0"><h1 className="truncate text-sm font-semibold">{personName(person)}</h1><p className="truncate text-[11px] text-slate-400">{person.title ?? "Contact"}</p></div><button type="button" className="ml-auto text-slate-400">⋮</button></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><label><span className="mb-1 block text-slate-400">Owner</span><select className="toolbar-control w-full"><option>Alex Reeve</option><option>Unassigned</option></select></label><label><span className="mb-1 block text-slate-400">Followers</span><button className="toolbar-control w-full" type="button">＋ Add</button></label></div>
          <div className="mt-4"><span className="text-xs text-slate-400">Tags ({person.tags?.length ?? 0})</span><div className="mt-1 flex flex-wrap gap-1">{(person.tags ?? []).map(t=><span key={t} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px]">{t} ×</span>)}<button type="button" className="rounded border border-dashed border-slate-300 px-2 py-1 text-[10px] text-slate-500">＋</button></div></div>
        </div>
        <nav className="grid grid-cols-3 border-b border-slate-200 text-center text-xs"><button className="border-b-2 border-blue-600 py-3 font-semibold text-blue-700">All fields</button><button className="py-3 text-slate-500">DND</button><button className="py-3 text-slate-500">Actions</button></nav>
        <div className="p-4"><label className="toolbar-search min-w-0"><span>⌕</span><input placeholder="Search fields and folders" /></label>
          <div className="mt-4 rounded-lg border border-slate-200"><div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-3 text-xs font-semibold"><span>Contact</span><span>⌃</span></div><dl className="space-y-4 p-3 text-xs">
            <div><dt className="text-slate-400">First name</dt><dd className="mt-1 font-medium">{person.firstName}</dd></div><div><dt className="text-slate-400">Last name</dt><dd className="mt-1 font-medium">{person.lastName || "—"}</dd></div><div><dt className="text-slate-400">Email (Primary)</dt><dd className="mt-1 break-all font-medium">{person.email ?? "—"}</dd></div><div><dt className="text-slate-400">Phone</dt><dd className="mt-1 font-medium">{person.phone ?? "—"}</dd></div><div><dt className="text-slate-400">Company</dt><dd className="mt-1 font-medium">{company ? <Link href={`/customers/companies/${company.id}`} className="text-blue-600">{company.name}</Link> : "—"}</dd></div>{fieldDefs.map(f=><div key={f.id}><dt className="text-slate-400">{f.label}</dt><dd className="mt-1 font-medium">{String((person.custom as Record<string,unknown>)?.[f.key] ?? "—")}</dd></div>)}
          </dl></div>
          <form action={addNoteAction} className="mt-4"><input type="hidden" name="entityType" value="person"/><input type="hidden" name="entityId" value={person.id}/><textarea name="body" rows={2} required className="w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-blue-400" placeholder="Add a note..."/><button className="primary-cta mt-2 w-full justify-center">Save note</button></form>
        </div>
      </aside>

      <section className="surface-card flex min-w-[340px] flex-1 flex-col overflow-hidden">
        <header className="flex h-[58px] items-center justify-between border-b border-slate-200 px-4"><div className="flex gap-3 text-slate-500"><button type="button">◔⌄</button><button type="button">▣</button><button type="button">☆</button><button type="button">✉</button></div>{conversation && <Link href={`/conversations?id=${conversation.id}`} className="text-xs font-medium text-blue-600">Open inbox ↗</Link>}</header>
        <div className="pane-scroll flex-1 overflow-y-auto bg-[#fbfcfe] p-5"><div className="mb-5 text-center"><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-500">Today</span></div>{messages.length ? <div className="space-y-3">{messages.map(m=><div key={m.id} className={`flex ${m.authorType === "customer" ? "justify-start" : "justify-end"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs ${m.authorType === "customer" ? "rounded-bl-md border border-slate-200 bg-white" : "rounded-br-md bg-blue-600 text-white"}`}><p className="mb-1 text-[10px] opacity-60">{m.authorName}</p><p>{m.body}</p><time className="mt-1 block text-right text-[9px] opacity-60">{fmtDateTime(m.createdAt).slice(11)}</time></div></div>)}</div> : <div className="flex h-full items-center justify-center text-center"><div><div className="text-4xl text-slate-200">✉</div><p className="mt-2 text-sm font-semibold text-slate-600">No conversation yet</p><Link href="/support/new" className="mt-3 inline-flex text-xs font-semibold text-blue-600">Start a conversation</Link></div></div>}</div>
        {conversation && <form action={addTicketMessageAction} className="m-3 rounded-lg border border-slate-200 p-2"><input type="hidden" name="ticketId" value={conversation.id}/><textarea name="body" rows={2} required placeholder="Type a message" className="w-full resize-none border-0 p-2 text-xs outline-none"/><div className="flex justify-between border-t border-slate-100 pt-2"><button type="button" className="text-slate-400">✉⌄ ＋</button><button className="primary-cta">Send ➤</button></div></form>}
      </section>

      <aside className="pane-scroll surface-card w-[300px] shrink-0 overflow-y-auto">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-4"><div><h2 className="text-sm font-semibold">Activity</h2><p className="text-[10px] text-slate-400">Customer timeline</p></div><button type="button" className="text-slate-400">×</button></header>
        <ol className="p-4">{timeline.map((item,i)=><li key={i} className="relative flex gap-3 pb-5 before:absolute before:bottom-0 before:left-[9px] before:top-5 before:w-px before:bg-slate-200 last:before:hidden"><span className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[9px] text-blue-600">{item.kind === "stage" ? "→" : item.kind === "note" ? "✎" : "•"}</span><div className="min-w-0"><p className="text-xs font-medium leading-4 text-slate-700">{item.title}</p>{item.detail && <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-slate-400">{item.detail}</p>}<time className="mt-1 block text-[9px] text-slate-300">{fmtDateTime(item.at)}</time></div></li>)}{!timeline.length && <p className="py-20 text-center text-xs text-slate-400">No activities yet.</p>}</ol>
      </aside>
    </div>
  </div>;
}
