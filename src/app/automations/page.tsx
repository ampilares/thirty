import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { automations, automationRuns } from "@/lib/db/schema";
import { PageHeader, Badge, EmptyState, btnPrimary, fmtDateTime } from "@/components/ui";
import { Icon } from "@/components/automation-canvas/AutomationCanvas";
import { actionMeta, triggerMeta } from "@/components/automation-canvas/catalog";
import { toggleAutomationAction } from "@/app/actions";

export default async function AutomationsPage() {
  const db = getDb();
  const rows = db.select().from(automations).all();
  const runs = db.select().from(automationRuns).orderBy(desc(automationRuns.id)).limit(200).all();

  return (
    <>
      <PageHeader
        title="Automations"
        subtitle="Visual workflows: a trigger fires, a filter decides, steps run in order. Simulate safely before publishing — every run is logged."
        actions={<Link href="/automations/new" className={btnPrimary}>+ New automation</Link>}
      />
      {rows.length === 0 ? (
        <EmptyState text="No automations yet — create one to put your busywork on autopilot." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => {
            const aRuns = runs.filter((r) => r.automationId === a.id && !r.simulated);
            const last = aRuns[0];
            const failures = aRuns.filter((r) => r.status === "failed").length;
            const trig = triggerMeta(a.trigger);
            const acts = a.actions ?? [];
            return (
              <div key={a.id} className="group relative flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/automations/${a.id}`} className="min-w-0 after:absolute after:inset-0">
                    <h3 className="truncate text-sm font-semibold text-neutral-900">{a.name}</h3>
                    {a.description && <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{a.description}</p>}
                  </Link>
                  <Badge value={a.enabled ? "active" : "draft"} label={a.enabled ? "published" : a.currentVersion > 0 ? "paused" : "draft"} />
                </div>

                {/* mini flow preview */}
                <div className="mt-3 flex items-center gap-1 overflow-hidden">
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                    <Icon name="bolt" className="h-3 w-3" />
                    <span className="max-w-32 truncate">{trig.label}</span>
                  </span>
                  {(a.conditions?.length ?? 0) > 0 && (
                    <>
                      <span className="shrink-0 text-neutral-300">→</span>
                      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700">
                        <Icon name="funnel" className="h-3 w-3" />
                        {a.conditions!.length}
                      </span>
                    </>
                  )}
                  {acts.slice(0, 4).map((act, i) => {
                    const m = actionMeta(act.type);
                    return (
                      <span key={i} className="flex shrink-0 items-center gap-1">
                        <span className="text-neutral-300">→</span>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${m.chip}`} title={m.label}>
                          <Icon name={m.icon} className="h-3 w-3" />
                        </span>
                      </span>
                    );
                  })}
                  {acts.length > 4 && <span className="text-[11px] text-neutral-400">+{acts.length - 4}</span>}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-xs text-neutral-500">
                  <span>
                    {a.currentVersion > 0 ? `v${a.currentVersion} · ` : ""}
                    {aRuns.length} run{aRuns.length === 1 ? "" : "s"}
                    {failures > 0 && <span className="ml-1 font-medium text-red-600">({failures} failed)</span>}
                    {last && <span className="text-neutral-400"> · {fmtDateTime(last.startedAt)}</span>}
                  </span>
                  {a.currentVersion > 0 && (
                    <form action={toggleAutomationAction} className="relative z-10">
                      <input type="hidden" name="automationId" value={a.id} />
                      <input type="hidden" name="to" value={a.enabled ? "off" : "on"} />
                      <button className="cursor-pointer rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 transition hover:bg-neutral-50">
                        {a.enabled ? "Pause" : "Resume"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
