import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, today } from "@/lib/db/client";
import { projects, companies, deals, milestones, tasks, invoices } from "@/lib/db/schema";
import { formatMoney, invoiceTotals } from "@/lib/core/money";
import { projectProgress } from "@/lib/core/delivery";
import { PageHeader, Card, Badge, EmptyState, fmtDate, inputClass, btnPrimary, btnSecondary } from "@/components/ui";
import { createTaskAction, toggleTaskAction, createMilestoneAction, setMilestoneStatusAction, updateProjectStatusAction } from "@/app/actions";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const project = db.select().from(projects).where(eq(projects.id, Number(id))).get();
  if (!project) notFound();
  const t = today();
  const company = project.companyId ? db.select().from(companies).where(eq(companies.id, project.companyId)).get() : null;
  const deal = project.dealId ? db.select().from(deals).where(eq(deals.id, project.dealId)).get() : null;
  const ms = db.select().from(milestones).where(eq(milestones.projectId, project.id)).all();
  const projectTasks = db.select().from(tasks).where(eq(tasks.projectId, project.id)).all();
  const projectInvoices = db.select().from(invoices).where(eq(invoices.projectId, project.id)).all();
  const progress = projectProgress(project.id);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${company?.name ?? "No customer"}${deal ? ` · from deal "${deal.name}"` : ""} · ${formatMoney(project.valueCents)}`}
        actions={
          <form action={updateProjectStatusAction} className="flex items-center gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <select name="status" defaultValue={project.status} className={inputClass}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="done">Done</option>
            </select>
            <button className={btnSecondary}>Set status</button>
          </form>
        }
      />

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-neutral-800 transition-all" style={{ width: `${progress.pct}%` }} />
        </div>
        <span className="text-sm text-neutral-500">{progress.pct}% · {progress.done}/{progress.total} tasks done</span>
        <Badge value={project.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Milestones (${ms.filter((m) => m.status === "done").length}/${ms.length})`}>
          <form action={createMilestoneAction} className="mb-3 flex gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <input name="name" required placeholder="New milestone…" className={inputClass} />
            <input name="dueDate" type="date" className={`${inputClass} w-40`} />
            <button className={btnSecondary}>Add</button>
          </form>
          {ms.length === 0 ? <EmptyState text="No milestones." /> : (
            <ul className="divide-y divide-neutral-100">
              {ms.map((m) => {
                const late = m.status === "pending" && m.dueDate && m.dueDate < t;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className={m.status === "done" ? "text-neutral-400 line-through" : ""}>
                      ◆ {m.name}
                      {late && <span className="ml-2 text-xs font-medium text-red-600">OVERDUE</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">{fmtDate(m.dueDate)}</span>
                      <Badge value={m.status} />
                      {m.status !== "done" && (
                        <form action={setMilestoneStatusAction}>
                          <input type="hidden" name="milestoneId" value={m.id} />
                          <input type="hidden" name="status" value="done" />
                          <button className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50 cursor-pointer">Mark done</button>
                        </form>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Tasks (${projectTasks.filter((x) => x.status === "open").length} open)`}>
          <form action={createTaskAction} className="mb-3 flex gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <input name="title" required placeholder="New task…" className={inputClass} />
            <input name="dueDate" type="date" className={`${inputClass} w-40`} />
            <button className={btnSecondary}>Add</button>
          </form>
          {projectTasks.length === 0 ? <EmptyState text="No tasks." /> : (
            <ul className="divide-y divide-neutral-100">
              {projectTasks.map((x) => {
                const late = x.status === "open" && x.dueDate && x.dueDate < t;
                return (
                  <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <form action={toggleTaskAction} className="flex min-w-0 items-center gap-2">
                      <input type="hidden" name="taskId" value={x.id} />
                      <input type="hidden" name="to" value={x.status === "done" ? "open" : "done"} />
                      <button className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] cursor-pointer ${x.status === "done" ? "border-emerald-400 bg-emerald-100 text-emerald-700" : "border-neutral-300 bg-white"}`}>
                        {x.status === "done" ? "✓" : ""}
                      </button>
                      <span className={`truncate ${x.status === "done" ? "text-neutral-400 line-through" : ""}`}>{x.title}</span>
                    </form>
                    <span className={`shrink-0 text-xs ${late ? "font-medium text-red-600" : "text-neutral-400"}`}>{fmtDate(x.dueDate)}{late ? " ⚠" : ""}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title={`Invoices (${projectInvoices.length})`} actions={<Link href={`/money/new-invoice?projectId=${project.id}${project.companyId ? `&companyId=${project.companyId}` : ""}`} className="text-xs text-neutral-500 underline hover:text-neutral-700">+ invoice</Link>}>
          {projectInvoices.length === 0 ? <EmptyState text="Nothing invoiced for this project yet." /> : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {projectInvoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2">
                  <Link href={`/money/invoices/${i.id}`} className="font-medium hover:underline">{i.number}</Link>
                  <span className="flex items-center gap-2 text-xs text-neutral-500">{formatMoney(invoiceTotals(i.id).totalCents)} <Badge value={i.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="About">
          <p className="text-sm text-neutral-600">{project.description ?? "No description."}</p>
          <dl className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-neutral-500">Started</dt><dd>{fmtDate(project.startDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">Due</dt><dd>{fmtDate(project.dueDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">Value</dt><dd className="font-medium">{formatMoney(project.valueCents)}</dd></div>
            {deal && <div className="flex justify-between"><dt className="text-neutral-500">Source deal</dt><dd><Link href={`/sales/${deal.id}`} className="underline">{deal.name}</Link></dd></div>}
          </dl>
        </Card>
      </div>
    </>
  );
}
