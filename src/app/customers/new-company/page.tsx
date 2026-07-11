import { PageHeader, Card, inputClass, btnPrimary } from "@/components/ui";
import { listCustomFields } from "@/lib/core/custom-fields";
import { createCompanyAction } from "@/app/actions";

export default async function NewCompanyPage() {
  const fields = listCustomFields("company");
  return (
    <>
      <PageHeader title="New company" subtitle="Duplicates are detected automatically after creation" />
      <Card className="max-w-lg">
        <form action={createCompanyAction} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Name *</span>
            <input name="name" required className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Domain</span>
            <input name="domain" placeholder="example.com" className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Industry</span>
            <input name="industry" className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Phone</span>
            <input name="phone" className={inputClass} />
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
          <button className={btnPrimary}>Create company</button>
        </form>
      </Card>
    </>
  );
}
