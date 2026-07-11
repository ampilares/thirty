import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { invoices, quotes, products, companies } from "@/lib/db/schema";
import { formatMoney, invoiceTotals, quoteTotal } from "@/lib/core/money";
import { computeMetrics } from "@/lib/analytics";
import { PageHeader, Badge, Table, Th, Td, Stat, Card, fmtDate, inputClass, btnPrimary, btnSecondary } from "@/components/ui";
import { createProductAction } from "@/app/actions";

export default async function MoneyPage() {
  const db = getDb();
  const m = computeMetrics();
  const invoiceRows = db.select().from(invoices).all().slice().reverse();
  const quoteRows = db.select().from(quotes).all().slice().reverse();
  const productRows = db.select().from(products).all();
  const companyRows = db.select().from(companies).all();
  const companyName = (id: number | null) => companyRows.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title="Money"
        subtitle="Quotes, invoices, payments, and cash visibility — the ledger stays in your accounting system"
        actions={
          <>
            <Link href="/money/new-quote" className={btnSecondary}>+ Quote</Link>
            <Link href="/money/new-invoice" className={btnPrimary}>+ Invoice</Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Collected (all time)" value={formatMoney(m.collectedCents)} sub={`${formatMoney(m.collectedThisMonthCents)} this month`} tone="ok" />
        <Stat label="Outstanding" value={formatMoney(m.outstandingCents)} />
        <Stat label="Overdue" value={formatMoney(m.overdueCents)} sub={`${m.overdueCount} invoice(s)`} tone={m.overdueCents > 0 ? "danger" : "ok"} />
        <Stat label="Invoiced (issued)" value={formatMoney(m.invoicedCents)} />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">Invoices</h2>
      <Table head={<><Th>Number</Th><Th>Customer</Th><Th>Status</Th><Th>Issued</Th><Th>Due</Th><Th>Total</Th><Th>Balance</Th></>}>
        {invoiceRows.map((i) => {
          const t = invoiceTotals(i.id);
          return (
            <tr key={i.id} className="hover:bg-neutral-50">
              <Td><Link href={`/money/invoices/${i.id}`} className="font-medium hover:underline">{i.number}</Link></Td>
              <Td>{companyName(i.companyId)}</Td>
              <Td><Badge value={i.status} /></Td>
              <Td>{fmtDate(i.issueDate)}</Td>
              <Td className={i.status === "overdue" ? "text-red-600" : ""}>{fmtDate(i.dueDate)}</Td>
              <Td><span className="tabular-nums">{formatMoney(t.totalCents)}</span></Td>
              <Td><span className={`tabular-nums ${t.balanceCents > 0 && i.status === "overdue" ? "font-medium text-red-600" : ""}`}>{formatMoney(t.balanceCents)}</span></Td>
            </tr>
          );
        })}
      </Table>

      <h2 className="mt-8 mb-2 text-sm font-semibold text-neutral-700">Quotes</h2>
      <Table head={<><Th>Number</Th><Th>Customer</Th><Th>Status</Th><Th>Issued</Th><Th>Total</Th></>}>
        {quoteRows.map((q) => (
          <tr key={q.id} className="hover:bg-neutral-50">
            <Td><Link href={`/money/quotes/${q.id}`} className="font-medium hover:underline">{q.number}</Link></Td>
            <Td>{companyName(q.companyId)}</Td>
            <Td><Badge value={q.status} /></Td>
            <Td>{fmtDate(q.issueDate)}</Td>
            <Td><span className="tabular-nums">{formatMoney(quoteTotal(q.id))}</span></Td>
          </tr>
        ))}
      </Table>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card title={`Service catalogue (${productRows.length})`}>
          <ul className="divide-y divide-neutral-100 text-sm">
            {productRows.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>{p.name}<span className="block text-xs text-neutral-400">{p.description}</span></span>
                <span className="font-medium tabular-nums">{formatMoney(p.unitPriceCents)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Add product / service">
          <form action={createProductAction} className="space-y-2">
            <input name="name" required placeholder="Name" className={inputClass} />
            <input name="description" placeholder="Description" className={inputClass} />
            <input name="price" type="number" step="0.01" min="0" required placeholder="Unit price (USD)" className={inputClass} />
            <button className={btnPrimary}>Add to catalogue</button>
          </form>
        </Card>
      </div>
    </>
  );
}
