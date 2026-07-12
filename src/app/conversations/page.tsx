import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, people, ticketMessages, tickets, users } from "@/lib/db/schema";
import { addTicketMessageAction } from "@/app/actions";
import { Badge, ModuleHeader, ToolbarSearch, fmtDateTime } from "@/components/ui";

type Params = { id?: string; scope?: string; q?: string; filters?: string };

function initials(first: string, last = "") {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const db = getDb();
  const allTickets = db.select().from(tickets).orderBy(desc(tickets.updatedAt)).all();
  const peopleRows = db.select().from(people).all();
  const companyRows = db.select().from(companies).all();
  const userRows = db.select().from(users).all();
  const q = (params.q ?? "").toLowerCase();
  const scope = params.scope ?? "all";
  const filtered = allTickets.filter((t) => {
    const person = peopleRows.find((p) => p.id === t.personId);
    const company = companyRows.find((c) => c.id === t.companyId);
    const matchesQ = !q || [t.subject, person?.firstName, person?.lastName, company?.name].some((v) => v?.toLowerCase().includes(q));
    const matchesScope = scope === "all" || (scope === "unread" && t.status === "open") || (scope === "recent" && t.status !== "closed") || (scope === "starred" && (t.priority === "high" || t.priority === "urgent"));
    return matchesQ && matchesScope;
  });
  const selected = params.id ? allTickets.find((t) => t.id === Number(params.id)) : undefined;
  const selectedPerson = selected ? peopleRows.find((p) => p.id === selected.personId) : undefined;
  const selectedCompany = selected ? companyRows.find((c) => c.id === selected.companyId) : undefined;
  const selectedOwner = selected ? userRows.find((u) => u.id === selected.assigneeId) : undefined;
  const messages = selected ? db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, selected.id)).all() : [];

  const queryFor = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { ...params, ...next };
    Object.entries(merged).forEach(([key, value]) => value && query.set(key, value));
    return `/conversations?${query.toString()}`;
  };

  return (
    <div className="module-shell flex min-h-full flex-col">
      <ModuleHeader title="Conversations" tabs={[
        { label: "Conversations", href: "/conversations", active: true },
        { label: "Manual Actions", href: "/agents/approvals" },
        { label: "Snippets", href: "/settings" },
        { label: "Analytics", href: "/analytics" },
        { label: "Settings", href: "/settings" },
      ]} />

      <div className="relative flex min-h-[650px] flex-1 overflow-hidden bg-white">
        <aside className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-slate-200 bg-[#f8fafc] py-3 text-slate-500">
          <Link href="/support/new" className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-lg text-white" title="New conversation">＋</Link>
          {['⌕','♙','♟','△','▣'].map((icon, i) => <button key={i} type="button" className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${i === 2 ? "border border-blue-500 bg-white text-blue-600" : "hover:bg-slate-100"}`}>{icon}</button>)}
        </aside>

        <section className="pane-scroll flex w-[330px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pb-3 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-slate-900">Team inbox</h2>
              <div className="flex gap-1 text-slate-500">
                <Link href={queryFor({ filters: params.filters ? undefined : "open" })} className={`rounded-md px-2 py-1.5 hover:bg-slate-100 ${params.filters ? "text-blue-600" : ""}`}>≡</Link>
                <button className="rounded-md px-2 py-1.5 hover:bg-slate-100" type="button">⇅</button>
              </div>
            </div>
            <form className="mb-3"><ToolbarSearch defaultValue={params.q} placeholder="Search conversations" /></form>
            <nav className="grid grid-cols-4 gap-1 text-center text-[11px]">
              {[['unread','✉','Unread'],['all','▱','All'],['recent','◷','Recent'],['starred','☆','Starred']].map(([value,icon,label]) => (
                <Link key={value} href={queryFor({ scope: value, id: undefined })} className={`rounded-md px-1 py-2 ${scope === value ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}>
                  <span className="mb-1 block text-base">{icon}</span>{label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((ticket) => {
              const person = peopleRows.find((p) => p.id === ticket.personId);
              const company = companyRows.find((c) => c.id === ticket.companyId);
              const lastMessage = db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticket.id)).orderBy(desc(ticketMessages.id)).limit(1).get();
              return (
                <Link href={queryFor({ id: String(ticket.id) })} key={ticket.id} className={`flex gap-3 px-4 py-3.5 transition hover:bg-slate-50 ${selected?.id === ticket.id ? "border-l-2 border-blue-600 bg-blue-50/70" : "border-l-2 border-transparent"}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{person ? initials(person.firstName, person.lastName) : "CO"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-slate-800">{person ? `${person.firstName} ${person.lastName}` : company?.name ?? "Unknown"}</span><time className="text-[10px] text-slate-400">{ticket.updatedAt.slice(5,10)}</time></span>
                    <span className="mt-0.5 block truncate text-xs text-slate-600">{ticket.subject}</span>
                    <span className="mt-1 block truncate text-[11px] text-slate-400">{lastMessage?.body ?? "No messages yet"}</span>
                  </span>
                  {ticket.status === "open" && <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />}
                </Link>
              );
            })}
            {!filtered.length && <div className="px-8 py-16 text-center"><div className="text-3xl text-slate-300">✓</div><p className="mt-3 text-sm font-semibold text-slate-700">All caught up!</p><p className="mt-1 text-xs text-slate-400">No conversations match this view.</p></div>}
          </div>
        </section>

        <section className="flex min-w-[360px] flex-1 flex-col bg-[#fbfcfe]">
          {selected ? (
            <>
              <header className="flex h-[66px] items-center justify-between border-b border-slate-200 bg-white px-5">
                <div><h2 className="text-sm font-semibold text-slate-900">{selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}` : selectedCompany?.name}</h2><p className="text-[11px] text-slate-400">{selected.subject}</p></div>
                <div className="flex items-center gap-1 text-slate-500"><button className="toolbar-control" type="button">☆</button><Link className="toolbar-control" href={`/support/${selected.id}`}>Open ticket ↗</Link></div>
              </header>
              <div className="pane-scroll flex-1 overflow-y-auto px-6 py-5">
                <div className="mb-5 flex justify-center"><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-500">Today</span></div>
                <div className="space-y-4">
                  {messages.map((message) => {
                    const outbound = message.authorType !== "customer";
                    return (
                      <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[74%] rounded-2xl px-4 py-3 text-xs leading-5 shadow-sm ${outbound ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700"}`}>
                          <div className={`mb-1 text-[10px] font-semibold ${outbound ? "text-blue-100" : "text-slate-400"}`}>{message.authorName}</div>
                          <p className="whitespace-pre-wrap">{message.body}</p>
                          <time className={`mt-1 block text-right text-[9px] ${outbound ? "text-blue-100" : "text-slate-400"}`}>{fmtDateTime(message.createdAt).slice(11)}</time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <form action={addTicketMessageAction} className="m-4 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <input type="hidden" name="ticketId" value={selected.id} />
                <textarea name="body" required rows={2} placeholder="Type a message..." className="w-full resize-none border-0 px-2 py-1 text-sm outline-none" />
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <div className="flex gap-1 text-slate-400"><button type="button" className="rounded px-2 py-1 hover:bg-slate-100">✉</button><button type="button" className="rounded px-2 py-1 hover:bg-slate-100">⌕</button><button type="button" className="rounded px-2 py-1 hover:bg-slate-100">＋</button></div>
                  <button className="primary-cta">Send message <span>➤</span></button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center"><div><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200 text-3xl text-slate-300">◎</div><h2 className="mt-4 text-sm font-semibold text-slate-700">No conversation selected</h2><p className="mt-1 text-xs text-slate-400">Choose a conversation to view messages.</p></div></div>
          )}
        </section>

        <aside className="pane-scroll w-[270px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
          {selected ? <>
            <div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{selectedPerson ? initials(selectedPerson.firstName, selectedPerson.lastName) : "CO"}</span><h3 className="mt-2 text-sm font-semibold">{selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}` : selectedCompany?.name}</h3><p className="text-[11px] text-slate-400">{selectedPerson?.email}</p></div>
            <div className="my-4 grid grid-cols-4 gap-2 text-center text-slate-500">{['✉','◔','☆','⋯'].map((i)=><button key={i} type="button" className="rounded-lg border border-slate-200 py-2 hover:bg-slate-50">{i}</button>)}</div>
            <div className="space-y-4 border-t border-slate-100 pt-4 text-xs">
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Contact</p><Link href={selectedPerson ? `/customers/people/${selectedPerson.id}` : "/customers"} className="mt-1 block font-medium text-blue-600">View contact record ↗</Link></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Company</p><p className="mt-1 text-slate-700">{selectedCompany?.name ?? "—"}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Assigned to</p><p className="mt-1 text-slate-700">{selectedOwner?.name ?? "Unassigned"}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p><div className="mt-1"><Badge value={selected.status} /></div></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</p><div className="mt-1"><Badge value={selected.priority} /></div></div>
            </div>
          </> : <p className="py-10 text-center text-xs text-slate-400">Contact details appear here.</p>}
        </aside>

        {params.filters && <div className="absolute inset-y-0 right-0 z-30 w-[360px] border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">☷ &nbsp;Filters</h2><Link href={queryFor({ filters: undefined })} className="text-xl text-slate-400">×</Link></div>
          <div className="space-y-3 p-5"><select className="toolbar-control w-full"><option>Filter type</option><option>Assignee</option><option>Status</option><option>Priority</option><option>Contact tag</option></select><select className="toolbar-control w-full"><option>Is</option><option>Is not</option><option>Contains</option></select><input className="toolbar-control w-full" placeholder="Value" /></div>
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t border-slate-200 p-4"><Link href={queryFor({ filters: undefined })} className="toolbar-control">Cancel</Link><Link href={queryFor({ filters: undefined, scope: "all" })} className="primary-cta">Apply</Link></div>
        </div>}
      </div>
    </div>
  );
}
