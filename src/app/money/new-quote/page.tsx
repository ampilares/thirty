import { getDb } from "@/lib/db/client";
import { companies, deals, products } from "@/lib/db/schema";
import { formatMoney } from "@/lib/core/money";
import { PageHeader, Card, inputClass, btnPrimary } from "@/components/ui";
import { createQuoteAction } from "@/app/actions";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ dealId?: string; companyId?: string; personId?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const companyRows = db.select().from(companies).all();
  const dealRows = db.select().from(deals).all();
  const productRows = db.select().from(products).all();

  return (
    <>
      <PageHeader title="New quote" subtitle="Up to 5 line items — accepting a sent quote can win the linked deal" />
      <Card className="max-w-2xl">
        <form action={createQuoteAction} className="space-y-3">
          {sp.personId && <input type="hidden" name="personId" value={sp.personId} />}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Customer</span>
              <select name="companyId" defaultValue={sp.companyId ?? ""} className={inputClass}>
                <option value="">—</option>
                {companyRows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Linked deal</span>
              <select name="dealId" defaultValue={sp.dealId ?? ""} className={inputClass}>
                <option value="">—</option>
                {dealRows.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-lg border border-neutral-200">
            <div className="grid grid-cols-[1fr_80px_120px] gap-2 border-b border-neutral-100 bg-neutral-50 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
              <span>Description</span><span>Qty</span><span>Unit price</span>
            </div>
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_120px] gap-2">
                  <input name={`item_desc_${i}`} placeholder={i === 0 ? "e.g. Website design & build *" : "optional"} required={i === 0} className={inputClass} list="catalogue" />
                  <input name={`item_qty_${i}`} type="number" min="1" defaultValue="1" className={inputClass} />
                  <input name={`item_price_${i}`} type="number" step="0.01" min="0" placeholder="0.00" className={inputClass} />
                </div>
              ))}
              <datalist id="catalogue">
                {productRows.map((p) => <option key={p.id} value={p.name}>{formatMoney(p.unitPriceCents)}</option>)}
              </datalist>
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea name="notes" rows={2} className={inputClass} />
          </label>
          <button className={btnPrimary}>Create quote (draft)</button>
        </form>
      </Card>
    </>
  );
}
