import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { deals, stages, companies, people, quotes, projects, tasks, notes, events } from "@/lib/db/schema";
import { formatMoney, quoteTotal } from "@/lib/core/money";
import { listCustomFields } from "@/lib/core/custom-fields";
import { personName } from "@/lib/core/customers";
import { PageHeader, Card, Badge, EmptyState, fmtDate, fmtDateTime, inputClass, btnPrimary, btnSecondary } from "@/components/ui";
import { moveDealStageAction, addNoteAction, createTaskAction, toggleTaskAction } from "@/app/actions";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const deal = db.select().from(deals).where(eq(deals.id, Number(id))).get();
  if (!deal) notFound();

  const stageRows = db.select().from(stages).orderBy(stages.position).all();
  const stage = stageRows.find((s) => s.id === deal.stageId)!;
  const company = deal.companyId ? db.select().from(companies).where(eq(companies.id, deal.companyId)).get() : null;
  const person = deal.personId ? db.select().from(people).where(eq(people.id, deal.personId)).get() : null;
  const dealQuotes = db.select().from(quotes).where(eq(quotes.dealId, deal.id)).all();
  const project = db.select().from(projects).where(eq(projects.dealId, deal.id)).get();
  const dealTasks = db.select().from(tasks).where(eq(tasks.dealId, deal.id)).all();
  const dealNotes = db.select().from(notes).where(and(eq(notes.entityType, "deal"), eq(notes.entityId, deal.id))).all();
  const stageEvents = db.select().from(events).where(and(eq(events.type, "deal.stage_changed"), eq(events.entityId, deal.id))).all();
  const fieldDefs = listCustomFields("deal");
  const idleDays = Math.floor((Date.now() - new Date(deal.stageChangedAt).getTime()) / 86_400_000);

  return (
    <>
      <PageHeader
        title={deal.name}
        subtitle={`${company?.name ?? "No company"}${person ? ` · ${personName(person)}` : ""} · ${deal.source ?? "unknown source"}`}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{formatMoney(deal.valueCents)}</span>
            <Badge value={stage.kind === "won" ? "done" : stage.kind === "lost" ? "failed" : "open"} label={stage.name} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Stage">
            <div className="mb-3 flex flex-wrap gap-1">
              {stageRows.map((s) => (
                <span key={s.id} className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.id === deal.stageId ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>
                  {s.name}
                </span>
              ))}
            </div>
            <form action={moveDealStageAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Move to</span>
                <select name="stageId" defaultValue={deal.stageId} className={inputClass}>
                  {stageRows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Lost reason (required if moving to Lost)</span>
                <input name="lostReason" placeholder="e.g. price, timing…" className={inputClass} />
              </label>
              <button className={btnPrimary}>Move stage</button>
            </form>
            <p className="mt-2 text-xs text-neutral-400">
              {idleDays} day(s) in current stage. Winning creates the delivery project automatically (scope, value, and customer carry over).
            </p>
            {stageEvents.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
                {stageEvents.slice().reverse().map((e) => {
                  const p = e.payload as { from?: string; to?: string };
                  return <li key={e.id}>{fmtDateTime(e.createdAt)} — {p.from} → {p.to} <Badge value={e.actorType} /></li>;
                })}
              </ul>
            )}
          </Card>

          {project && (
            <Card title="Delivery handoff">
              <p className="text-sm">
                ✅ Won — project <Link href={`/delivery/${project.id}`} className="font-medium underline">{project.name}</Link> was created from this deal
                {" "}<Badge value={project.status} />
              </p>
            </Card>
          )}

          <Card title={`Quotes (${dealQuotes.length})`} actions={<Link href={`/money/new-quote?dealId=${deal.id}${deal.companyId ? `&companyId=${deal.companyId}` : ""}${deal.personId ? `&personId=${deal.personId}` : ""}`} className="text-xs text-neutral-500 underline hover:text-neutral-700">+ quote</Link>}>
            {dealQuotes.length === 0 ? <EmptyState text="No quotes yet." /> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {dealQuotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between py-2">
                    <Link href={`/money/quotes/${q.id}`} className="font-medium hover:underline">{q.number}</Link>
                    <span className="flex items-center gap-2 text-xs text-neutral-500">{formatMoney(quoteTotal(q.id))} <Badge value={q.status} /></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Tasks (${dealTasks.filter((t) => t.status === "open").length} open)`}>
            <form action={createTaskAction} className="mb-3 flex gap-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <input name="title" required placeholder="Add a task…" className={inputClass} />
              <input name="dueDate" type="date" className={`${inputClass} w-40`} />
              <button className={btnSecondary}>Add</button>
            </form>
            {dealTasks.length === 0 ? <EmptyState text="No tasks." /> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {dealTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                    <form action={toggleTaskAction} className="flex items-center gap-2">
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="to" value={t.status === "done" ? "open" : "done"} />
                      <button className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] cursor-pointer ${t.status === "done" ? "border-emerald-400 bg-emerald-100 text-emerald-700" : "border-neutral-300 bg-white"}`}>
                        {t.status === "done" ? "✓" : ""}
                      </button>
                      <span className={t.status === "done" ? "text-neutral-400 line-through" : ""}>{t.title}</span>
                    </form>
                    <span className="text-xs text-neutral-400">{fmtDate(t.dueDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Notes">
            <form action={addNoteAction} className="mb-3 space-y-2">
              <input type="hidden" name="entityType" value="deal" />
              <input type="hidden" name="entityId" value={deal.id} />
              <textarea name="body" rows={2} required placeholder="Write a note…" className={inputClass} />
              <button className={btnPrimary}>Save note</button>
            </form>
            {dealNotes.length === 0 ? <EmptyState text="No notes yet." /> : (
              <ul className="space-y-3">
                {dealNotes.slice().reverse().map((n) => (
                  <li key={n.id} className="rounded-lg bg-neutral-50 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-neutral-400">{n.authorLabel} · {fmtDateTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Details">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-neutral-500">Value</dt><dd className="font-medium">{formatMoney(deal.valueCents)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-neutral-500">Priority</dt><dd><Badge value={deal.priority} /></dd></div>
              <div className="flex justify-between gap-2"><dt className="text-neutral-500">Source</dt><dd>{deal.source ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-neutral-500">Expected close</dt><dd>{fmtDate(deal.expectedClose)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-neutral-500">Created</dt><dd>{fmtDate(deal.createdAt)}</dd></div>
              {deal.lostReason && <div className="flex justify-between gap-2"><dt className="text-neutral-500">Lost reason</dt><dd className="text-red-600">{deal.lostReason}</dd></div>}
              {fieldDefs.map((f) => (
                <div key={f.id} className="flex justify-between gap-2">
                  <dt className="text-neutral-500">{f.label}</dt>
                  <dd className="font-medium">{String((deal.custom as Record<string, unknown>)?.[f.key] ?? "—")}</dd>
                </div>
              ))}
            </dl>
            {deal.description && <p className="mt-3 border-t border-neutral-100 pt-2 text-sm text-neutral-600">{deal.description}</p>}
          </Card>
          {company && (
            <Card title="Customer">
              <Link href={`/customers/companies/${company.id}`} className="text-sm font-medium hover:underline">{company.name}</Link>
              <div className="mt-1"><Badge value={company.health} label={`health: ${company.health}`} /></div>
              {person && <p className="mt-2 text-sm text-neutral-500">{personName(person)} · {person.email}</p>}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
