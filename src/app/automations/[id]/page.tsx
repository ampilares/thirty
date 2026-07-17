import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { automations, automationRuns, automationVersions } from "@/lib/db/schema";
import { Badge, EmptyState, fmtDateTime } from "@/components/ui";
import { AutomationCanvas } from "@/components/automation-canvas/AutomationCanvas";
import { updateAutomationAction, publishAutomationAction, simulateAutomationAction, toggleAutomationAction } from "@/app/actions";

export default async function AutomationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const db = getDb();
  const automation = db.select().from(automations).where(eq(automations.id, Number(id))).get();
  if (!automation) notFound();
  const runs = db.select().from(automationRuns).where(eq(automationRuns.automationId, automation.id)).orderBy(desc(automationRuns.id)).limit(30).all();
  const versions = db.select().from(automationVersions).where(eq(automationVersions.automationId, automation.id)).orderBy(desc(automationVersions.version)).all();
  const activity = tab === "activity";

  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] flex-col">
      {/* hidden sibling forms targeted from the canvas toolbar via the `form` attribute */}
      <form id="automation-simulate" action={simulateAutomationAction} className="hidden">
        <input type="hidden" name="automationId" value={automation.id} />
      </form>
      <form id="automation-publish" action={publishAutomationAction} className="hidden">
        <input type="hidden" name="automationId" value={automation.id} />
      </form>
      <form id="automation-toggle" action={toggleAutomationAction} className="hidden">
        <input type="hidden" name="automationId" value={automation.id} />
        <input type="hidden" name="to" value={automation.enabled ? "off" : "on"} />
      </form>

      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 bg-white px-4 pt-1.5">
        {[
          { href: `/automations/${automation.id}`, label: "Builder", active: !activity },
          { href: `/automations/${automation.id}?tab=activity`, label: `Activity (${runs.length})`, active: activity },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`rounded-t-lg border-b-2 px-3 py-1.5 text-sm font-medium transition ${
              t.active ? "border-indigo-500 text-indigo-700" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activity ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <header className="border-b border-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700">Run history</header>
              <div className="p-4">
                {runs.length === 0 ? (
                  <EmptyState text="No runs yet — simulate from the builder or wait for the trigger." />
                ) : (
                  <ul className="space-y-3">
                    {runs.map((r) => (
                      <li key={r.id} className="rounded-xl border border-neutral-100 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Badge value={r.simulated ? "simulated" : r.status} label={r.simulated ? `simulated · ${r.status}` : r.status} />
                            <code className="text-xs text-neutral-500">{r.eventType}</code>
                            {r.version > 0 && <span className="text-xs text-neutral-400">v{r.version}</span>}
                          </span>
                          <time className="text-xs text-neutral-400">{fmtDateTime(r.startedAt)}</time>
                        </div>
                        <ol className="mt-2 space-y-1 text-xs text-neutral-600">
                          {(r.steps ?? []).map((step, i) => (
                            <li key={i} className="flex gap-1.5">
                              <span className={step.ok ? "text-emerald-500" : "text-red-500"}>{step.ok ? "✓" : "✗"}</span>
                              <span><span className="font-medium">{step.action}</span> — {step.detail}</span>
                            </li>
                          ))}
                        </ol>
                        {r.error && <p className="mt-1 text-xs text-red-600">{r.error}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
            <section className="h-fit rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <header className="border-b border-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700">Versions ({versions.length})</header>
              <div className="p-4">
                {versions.length === 0 ? (
                  <EmptyState text="Not published yet — this automation is a draft." />
                ) : (
                  <ul className="divide-y divide-neutral-100 text-sm">
                    {versions.map((v) => (
                      <li key={v.id} className="flex items-center justify-between py-2">
                        <span className="flex items-center gap-2">v{v.version} {v.version === automation.currentVersion && <Badge value="active" label="current" />}</span>
                        <span className="text-xs text-neutral-400">{v.publishNotes ?? "—"} · {fmtDateTime(v.publishedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <AutomationCanvas
            existing={{
              id: automation.id,
              name: automation.name,
              description: automation.description,
              trigger: automation.trigger,
              conditions: automation.conditions ?? [],
              actions: automation.actions ?? [],
              enabled: !!automation.enabled,
              currentVersion: automation.currentVersion,
            }}
            saveAction={updateAutomationAction}
            simulateFormId="automation-simulate"
            publishFormId="automation-publish"
            toggleFormId="automation-toggle"
          />
        </div>
      )}
    </div>
  );
}
