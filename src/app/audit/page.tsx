import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { PageHeader, Badge, fmtDateTime, inputClass, btnSecondary } from "@/components/ui";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ actor?: string; entity?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  let rows = db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(500).all();
  if (sp.actor) rows = rows.filter((r) => r.actorType === sp.actor);
  if (sp.entity) rows = rows.filter((r) => r.entityType === sp.entity);
  const entityTypes = [...new Set(db.select({ e: auditLog.entityType }).from(auditLog).all().map((r) => r.e))].sort();

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every write — human, agent, automation, or API — lands here with actor, diff, and correlation (ADM-01)"
      />
      <form action="/audit" method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-500">Actor type</span>
          <select name="actor" defaultValue={sp.actor ?? ""} className={inputClass}>
            <option value="">All</option>
            {["user", "agent", "automation", "api", "system"].map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-neutral-500">Entity type</span>
          <select name="entity" defaultValue={sp.entity ?? ""} className={inputClass}>
            <option value="">All</option>
            {entityTypes.map((e) => <option key={e}>{e}</option>)}
          </select>
        </label>
        <button className={btnSecondary}>Filter</button>
        <span className="pb-2 text-xs text-neutral-400">{rows.length} entries</span>
      </form>

      <div className="space-y-1.5">
        {rows.map((r) => (
          <details key={r.id} className="group rounded-lg border border-neutral-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <Badge value={r.actorType} />
                <span className="shrink-0 font-medium">{r.actorLabel}</span>
                <span className="text-neutral-400">{r.action}d</span>
                <span className="truncate text-neutral-600">{r.entityType} — {r.entityLabel ?? `#${r.entityId}`}</span>
                {r.correlationType && <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">{r.correlationType} #{r.correlationId}</span>}
              </span>
              <time className="shrink-0 text-xs text-neutral-400">{fmtDateTime(r.createdAt)}</time>
            </summary>
            <div className="grid gap-2 border-t border-neutral-100 px-4 py-3 md:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Before</span>
                <pre className="mt-1 overflow-x-auto rounded-md bg-red-50/60 p-2 text-xs text-neutral-700">{r.before ? JSON.stringify(r.before, null, 2) : "—"}</pre>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">After</span>
                <pre className="mt-1 overflow-x-auto rounded-md bg-emerald-50/60 p-2 text-xs text-neutral-700">{r.after ? JSON.stringify(r.after, null, 2) : "—"}</pre>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
