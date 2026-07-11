import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { people, companies } from "@/lib/db/schema";
import { customerTimeline } from "@/lib/core/timeline";
import { findDuplicatePeople, personName } from "@/lib/core/customers";
import { listCustomFields } from "@/lib/core/custom-fields";
import { PageHeader, Card, EmptyState, inputClass, btnPrimary } from "@/components/ui";
import { Timeline } from "@/components/Timeline";
import { addNoteAction } from "@/app/actions";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const person = db.select().from(people).where(eq(people.id, Number(id))).get();
  if (!person) notFound();
  const company = person.companyId ? db.select().from(companies).where(eq(companies.id, person.companyId)).get() : null;
  const timeline = customerTimeline({ personId: person.id, companyId: person.companyId ?? undefined });
  const duplicates = findDuplicatePeople({ email: person.email ?? undefined, firstName: person.firstName, lastName: person.lastName }, person.id);
  const fieldDefs = listCustomFields("person");

  return (
    <>
      <PageHeader
        title={personName(person)}
        subtitle={[person.title, company?.name].filter(Boolean).join(" · ") || "Person"}
      />
      {duplicates.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          ⚠ Possible duplicate: {duplicates.map((d) => <Link key={d.id} href={`/customers/people/${d.id}`} className="underline">{personName(d)} (#{d.id})</Link>)}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Unified timeline (person + company)">
            <Timeline items={timeline} />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Contact details">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-neutral-500">Email</dt><dd className="font-medium">{person.email ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-neutral-500">Phone</dt><dd className="font-medium">{person.phone ?? "—"}</dd></div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Company</dt>
                <dd className="font-medium">{company ? <Link href={`/customers/companies/${company.id}`} className="hover:underline">{company.name}</Link> : "—"}</dd>
              </div>
              {fieldDefs.map((f) => (
                <div key={f.id} className="flex justify-between gap-2">
                  <dt className="text-neutral-500">{f.label}</dt>
                  <dd className="font-medium">{String((person.custom as Record<string, unknown>)?.[f.key] ?? "—")}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Add note">
            <form action={addNoteAction} className="space-y-2">
              <input type="hidden" name="entityType" value="person" />
              <input type="hidden" name="entityId" value={person.id} />
              <textarea name="body" rows={2} required placeholder="Write a note…" className={inputClass} />
              <button className={btnPrimary}>Save note</button>
            </form>
          </Card>
          {(person.tags ?? []).length > 0 && (
            <Card title="Tags"><p className="text-sm">{(person.tags ?? []).join(", ")}</p></Card>
          )}
        </div>
      </div>
    </>
  );
}
