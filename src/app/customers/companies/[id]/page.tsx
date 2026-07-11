import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { companies, people, deals, projects, invoices, tickets, stages } from "@/lib/db/schema";
import { customerTimeline } from "@/lib/core/timeline";
import { computeCompanyHealth, } from "@/lib/core/health";
import { findDuplicateCompanies, personName } from "@/lib/core/customers";
import { formatMoney, invoiceTotals } from "@/lib/core/money";
import { listCustomFields } from "@/lib/core/custom-fields";
import { PageHeader, Card, Badge, EmptyState, fmtDate, inputClass, btnPrimary } from "@/components/ui";
import { Timeline } from "@/components/Timeline";
import { addNoteAction } from "@/app/actions";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const company = db.select().from(companies).where(eq(companies.id, Number(id))).get();
  if (!company) notFound();

  const contacts = db.select().from(people).where(eq(people.companyId, company.id)).all();
  const companyDeals = db.select().from(deals).where(eq(deals.companyId, company.id)).all();
  const companyProjects = db.select().from(projects).where(eq(projects.companyId, company.id)).all();
  const companyInvoices = db.select().from(invoices).where(eq(invoices.companyId, company.id)).all();
  const companyTickets = db.select().from(tickets).where(eq(tickets.companyId, company.id)).all();
  const stageRows = db.select().from(stages).all();
  const timeline = customerTimeline({ companyId: company.id });
  const { reasons } = computeCompanyHealth(company.id);
  const duplicates = findDuplicateCompanies(company.name, company.id);
  const fieldDefs = listCustomFields("company");

  return (
    <>
      <PageHeader
        title={company.name}
        subtitle={[company.industry, company.domain].filter(Boolean).join(" · ") || "Company"}
        actions={<Badge value={company.health} label={`health: ${company.health}`} />}
      />

      {duplicates.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          ⚠ Possible duplicate: {duplicates.map((d) => <Link key={d.id} href={`/customers/companies/${d.id}`} className="underline">{d.name} (#{d.id})</Link>)}
        </div>
      )}
      {reasons.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Health signals: {reasons.join(" · ")}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Unified timeline">
            <Timeline items={timeline} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Add note">
            <form action={addNoteAction} className="space-y-2">
              <input type="hidden" name="entityType" value="company" />
              <input type="hidden" name="entityId" value={company.id} />
              <textarea name="body" rows={2} required placeholder="Write a note…" className={inputClass} />
              <button className={btnPrimary}>Save note</button>
            </form>
          </Card>

          {fieldDefs.length > 0 && (
            <Card title="Details">
              <dl className="space-y-1.5 text-sm">
                {fieldDefs.map((f) => (
                  <div key={f.id} className="flex justify-between gap-2">
                    <dt className="text-neutral-500">{f.label}</dt>
                    <dd className="font-medium">{String((company.custom as Record<string, unknown>)?.[f.key] ?? "—")}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-2"><dt className="text-neutral-500">Tags</dt><dd>{(company.tags ?? []).join(", ") || "—"}</dd></div>
              </dl>
            </Card>
          )}

          <Card title={`Contacts (${contacts.length})`}>
            {contacts.length === 0 ? <EmptyState text="No contacts." /> : (
              <ul className="space-y-1.5 text-sm">
                {contacts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/customers/people/${p.id}`} className="font-medium hover:underline">{personName(p)}</Link>
                    <span className="text-neutral-500"> — {p.title ?? "contact"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Deals (${companyDeals.length})`}>
            {companyDeals.length === 0 ? <EmptyState text="No deals." /> : (
              <ul className="space-y-1.5 text-sm">
                {companyDeals.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <Link href={`/sales/${d.id}`} className="truncate hover:underline">{d.name}</Link>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500">
                      {formatMoney(d.valueCents)} <Badge value={stageRows.find((s) => s.id === d.stageId)?.kind === "won" ? "done" : "open"} label={stageRows.find((s) => s.id === d.stageId)?.name ?? "?"} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Projects (${companyProjects.length})`}>
            {companyProjects.length === 0 ? <EmptyState text="No projects." /> : (
              <ul className="space-y-1.5 text-sm">
                {companyProjects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/delivery/${p.id}`} className="truncate hover:underline">{p.name}</Link>
                    <Badge value={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Invoices (${companyInvoices.length})`}>
            {companyInvoices.length === 0 ? <EmptyState text="No invoices." /> : (
              <ul className="space-y-1.5 text-sm">
                {companyInvoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2">
                    <Link href={`/money/invoices/${i.id}`} className="hover:underline">{i.number}</Link>
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                      {formatMoney(invoiceTotals(i.id).totalCents)} <Badge value={i.status} /> {i.dueDate && i.status === "overdue" ? `due ${fmtDate(i.dueDate)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Tickets (${companyTickets.length})`}>
            {companyTickets.length === 0 ? <EmptyState text="No tickets." /> : (
              <ul className="space-y-1.5 text-sm">
                {companyTickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <Link href={`/support/${t.id}`} className="truncate hover:underline">{t.subject}</Link>
                    <Badge value={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
