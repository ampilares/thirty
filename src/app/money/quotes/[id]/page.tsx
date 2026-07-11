import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { quotes, quoteItems, companies, deals, invoices } from "@/lib/db/schema";
import { formatMoney, lineTotal, quoteTotal } from "@/lib/core/money";
import { PageHeader, Card, Badge, fmtDate, btnPrimary, btnSecondary } from "@/components/ui";
import { setQuoteStatusAction, createInvoiceFromQuoteAction } from "@/app/actions";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const quote = db.select().from(quotes).where(eq(quotes.id, Number(id))).get();
  if (!quote) notFound();
  const items = db.select().from(quoteItems).where(eq(quoteItems.quoteId, quote.id)).all();
  const company = quote.companyId ? db.select().from(companies).where(eq(companies.id, quote.companyId)).get() : null;
  const deal = quote.dealId ? db.select().from(deals).where(eq(deals.id, quote.dealId)).get() : null;
  const linkedInvoices = db.select().from(invoices).where(eq(invoices.quoteId, quote.id)).all();

  return (
    <>
      <PageHeader
        title={`Quote ${quote.number}`}
        subtitle={`${company?.name ?? "No customer"}${deal ? ` · deal "${deal.name}"` : ""}`}
        actions={<Badge value={quote.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
                <tr className="border-t border-neutral-200 font-semibold">
                  <td className="py-2" colSpan={3}>Total</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(quoteTotal(quote.id))}</td>
                </tr>
              </tfoot>
            </table>
            {quote.notes && <p className="mt-2 border-t border-neutral-100 pt-2 text-sm text-neutral-500">{quote.notes}</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Actions">
            <div className="flex flex-col gap-2">
              {quote.status === "draft" && (
                <form action={setQuoteStatusAction}>
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <input type="hidden" name="status" value="sent" />
                  <button className={btnPrimary}>Mark as sent</button>
                </form>
              )}
              {quote.status === "sent" && (
                <>
                  <form action={setQuoteStatusAction}>
                    <input type="hidden" name="quoteId" value={quote.id} />
                    <input type="hidden" name="status" value="accepted" />
                    <input type="hidden" name="winDeal" value="1" />
                    <button className={btnPrimary}>Accepted {deal ? "→ win deal" : ""}</button>
                  </form>
                  <form action={setQuoteStatusAction}>
                    <input type="hidden" name="quoteId" value={quote.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button className={btnSecondary}>Rejected</button>
                  </form>
                </>
              )}
              {quote.status === "accepted" && linkedInvoices.length === 0 && (
                <form action={createInvoiceFromQuoteAction}>
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <button className={btnPrimary}>Generate invoice</button>
                </form>
              )}
              {linkedInvoices.map((i) => (
                <p key={i.id} className="text-sm">
                  Invoiced as <Link href={`/money/invoices/${i.id}`} className="font-medium underline">{i.number}</Link> <Badge value={i.status} />
                </p>
              ))}
            </div>
            <dl className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">Issued</dt><dd>{fmtDate(quote.issueDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Valid until</dt><dd>{fmtDate(quote.validUntil)}</dd></div>
              {deal && <div className="flex justify-between"><dt className="text-neutral-500">Deal</dt><dd><Link href={`/sales/${deal.id}`} className="underline">{deal.name}</Link></dd></div>}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
