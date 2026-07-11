import { getDb } from "@/lib/db/client";
import { companies, projects } from "@/lib/db/schema";
import { PageHeader, Card, inputClass, btnPrimary } from "@/components/ui";
import { createInvoiceAction } from "@/app/actions";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ companyId?: string; projectId?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const companyRows = db.select().from(companies).all();
  const projectRows = db.select().from(projects).all();

  return (
    <>
      <PageHeader title="New invoice" subtitle="Issue immediately or keep as draft" />
      <Card className="max-w-2xl">
        <form action={createInvoiceAction} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Customer</span>
              <select name="companyId" defaultValue={sp.companyId ?? ""} className={inputClass}>
                <option value="">—</option>
                {companyRows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Project</span>
              <select name="projectId" defaultValue={sp.projectId ?? ""} className={inputClass}>
                <option value="">—</option>
                {projectRows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Payment terms</span>
              <select name="dueInDays" defaultValue="14" className={inputClass}>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
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
                  <input name={`item_desc_${i}`} placeholder={i === 0 ? "e.g. Milestone 2 — content migration *" : "optional"} required={i === 0} className={inputClass} />
                  <input name={`item_qty_${i}`} type="number" min="1" defaultValue="1" className={inputClass} />
                  <input name={`item_price_${i}`} type="number" step="0.01" min="0" placeholder="0.00" className={inputClass} />
                </div>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea name="notes" rows={2} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="issue" value="1" defaultChecked className="h-4 w-4 rounded border-neutral-300" />
            Issue immediately (sets issue date + due date)
          </label>
          <button className={btnPrimary}>Create invoice</button>
        </form>
      </Card>
    </>
  );
}
