import { getDb } from "@/lib/db/client";
import { companies } from "@/lib/db/schema";
import { PageHeader, Card, inputClass, btnPrimary } from "@/components/ui";
import { listCustomFields } from "@/lib/core/custom-fields";
import { createPersonAction } from "@/app/actions";

export default async function NewPersonPage() {
  const db = getDb();
  const companyRows = db.select().from(companies).all();
  const fields = listCustomFields("person");
  return (
    <>
      <PageHeader title="New person" subtitle="Duplicates are detected automatically after creation" />
      <Card className="max-w-lg">
        <form action={createPersonAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">First name *</span>
              <input name="firstName" required className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Last name</span>
              <input name="lastName" className={inputClass} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input name="email" type="email" className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Title</span>
            <input name="title" className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Company</span>
            <select name="companyId" className={inputClass}>
              <option value="">—</option>
              {companyRows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
          <button className={btnPrimary}>Create person</button>
        </form>
      </Card>
    </>
  );
}
