import { getDb } from "@/lib/db/client";
import { companies, people } from "@/lib/db/schema";
import { personName } from "@/lib/core/customers";
import { listCustomFields } from "@/lib/core/custom-fields";
import { PageHeader, Card, inputClass, btnPrimary } from "@/components/ui";
import { createDealAction } from "@/app/actions";

export default async function NewDealPage() {
  const db = getDb();
  const companyRows = db.select().from(companies).all();
  const peopleRows = db.select().from(people).all();
  const fields = listCustomFields("deal");

  return (
    <>
      <PageHeader title="New deal" subtitle="The Intake agent will classify and route it automatically" />
      <Card className="max-w-lg">
        <form action={createDealAction} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Deal name *</span>
            <input name="name" required placeholder="Acme — website redesign" className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Value (USD)</span>
              <input name="value" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Expected close</span>
              <input name="expectedClose" type="date" className={inputClass} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Company</span>
              <select name="companyId" className={inputClass}>
                <option value="">—</option>
                {companyRows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Contact</span>
              <select name="personId" className={inputClass}>
                <option value="">—</option>
                {peopleRows.map((p) => <option key={p.id} value={p.id}>{personName(p)}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Source</span>
              <select name="source" className={inputClass}>
                <option>Website form</option>
                <option>Referral</option>
                <option>LinkedIn</option>
                <option>Existing client</option>
                <option>Cold outreach</option>
                <option>Other</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Priority</span>
              <select name="priority" defaultValue="normal" className={inputClass}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description</span>
            <textarea name="description" rows={2} className={inputClass} />
          </label>
          {fields.map((f) => (
            <label key={f.id} className="block text-sm">
              <span className="mb-1 block font-medium">{f.label} <span className="text-xs text-neutral-400">(custom)</span></span>
              {f.type === "select" ? (
                <select name={`custom_${f.key}`} className={inputClass}>
                  <option value="">—</option>
                  {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input name={`custom_${f.key}`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} className={inputClass} />
              )}
            </label>
          ))}
          <button className={btnPrimary}>Create deal</button>
        </form>
      </Card>
    </>
  );
}
