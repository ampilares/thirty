import { getDb } from "@/lib/db/client";
import { companies, people } from "@/lib/db/schema";
import { personName } from "@/lib/core/customers";
import { PageHeader, Card, inputClass, btnPrimary } from "@/components/ui";
import { createTicketAction } from "@/app/actions";

export default async function NewTicketPage() {
  const db = getDb();
  const companyRows = db.select().from(companies).all();
  const peopleRows = db.select().from(people).all();
  return (
    <>
      <PageHeader title="New ticket" subtitle="The Support agent will triage it (priority, category, SLA) and draft a reply for your approval" />
      <Card className="max-w-lg">
        <form action={createTicketAction} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Subject *</span>
            <input name="subject" required className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Message</span>
            <textarea name="body" rows={3} placeholder="The customer's message…" className={inputClass} />
          </label>
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
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Reported by (name shown on the thread)</span>
            <input name="authorName" placeholder="e.g. Marta Kowalski" className={inputClass} />
          </label>
          <button className={btnPrimary}>Create ticket</button>
        </form>
      </Card>
    </>
  );
}
