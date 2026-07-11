import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { invoices, invoiceItems, payments, companies, projects, quotes } from "@/lib/db/schema";
import { formatMoney, invoiceTotals, lineTotal } from "@/lib/core/money";
import { PageHeader, Card, Badge, fmtDate, fmtDateTime, inputClass, btnPrimary, btnSecondary, EmptyState } from "@/components/ui";
import { recordPaymentAction, setInvoiceStatusAction } from "@/app/actions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const invoice = db.select().from(invoices).where(eq(invoices.id, Number(id))).get();
  if (!invoice) notFound();
  const items = db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)).all();
  const paymentRows = db.select().from(payments).where(eq(payments.invoiceId, invoice.id)).all();
  const company = invoice.companyId ? db.select().from(companies).where(eq(companies.id, invoice.companyId)).get() : null;
  const project = invoice.projectId ? db.select().from(projects).where(eq(projects.id, invoice.projectId)).get() : null;
  const quote = invoice.quoteId ? db.select().from(quotes).where(eq(quotes.id, invoice.quoteId)).get() : null;
  const totals = invoiceTotals(invoice.id);

  return (
    <>
      <PageHeader
        title={`Invoice ${invoice.number}`}
        subtitle={`${company?.name ?? "No customer"}${project ? ` · ${project.name}` : ""}${quote ? ` · from ${quote.number}` : ""}`}
        actions={<Badge value={invoice.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Line items">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-400">
                  <th className="py-1.5">Description</th><th className="py-1.5 text-right">Qty</th><th className="py-1.5 text-right">Unit</th><th className="py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right tabular-nums">{item.qty}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(item.unitPriceCents)}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(lineTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 font-medium">
                  <td className="py-2" colSpan={3}>Total</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(totals.totalCents)}</td>
                </tr>
                <tr className="text-sm text-neutral-500">
                  <td className="py-1" colSpan={3}>Paid</td>
                  <td className="py-1 text-right tabular-nums">−{formatMoney(totals.paidCents)}</td>
                </tr>
                <tr className={`font-semibold ${totals.balanceCents > 0 && invoice.status === "overdue" ? "text-red-600" : ""}`}>
                  <td className="py-2" colSpan={3}>Balance due</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(totals.balanceCents)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card title={`Payments (${paymentRows.length})`}>
            {paymentRows.length === 0 ? <EmptyState text="No payments recorded." /> : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {paymentRows.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span>✓ {formatMoney(p.amountCents)} via {p.method.replace(/_/g, " ")}{p.reference ? ` · ref ${p.reference}` : ""}</span>
                    <span className="text-xs text-neutral-400">{fmtDateTime(p.paidAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            {totals.balanceCents > 0 && invoice.status !== "void" && invoice.status !== "draft" && (
              <form action={recordPaymentAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">Amount (USD)</span>
                  <input name="amount" type="number" step="0.01" min="0.01" defaultValue={(totals.balanceCents / 100).toFixed(2)} required className={inputClass} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">Method</span>
                  <select name="method" className={inputClass}>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">Reference</span>
                  <input name="reference" className={inputClass} />
                </label>
                <button className={btnPrimary}>Record payment</button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Status">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Issued</dt><dd>{fmtDate(invoice.issueDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Due</dt><dd className={invoice.status === "overdue" ? "font-medium text-red-600" : ""}>{fmtDate(invoice.dueDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Customer</dt><dd>{company ? <Link href={`/customers/companies/${company.id}`} className="underline">{company.name}</Link> : "—"}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
              {invoice.status === "draft" && (
                <form action={setInvoiceStatusAction}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <input type="hidden" name="status" value="sent" />
                  <button className={btnPrimary}>Issue invoice</button>
                </form>
              )}
              {invoice.status !== "void" && invoice.status !== "paid" && (
                <form action={setInvoiceStatusAction}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <input type="hidden" name="status" value="void" />
                  <button className={btnSecondary}>Void</button>
                </form>
              )}
            </div>
            {invoice.notes && <p className="mt-3 border-t border-neutral-100 pt-2 text-sm text-neutral-500">{invoice.notes}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
