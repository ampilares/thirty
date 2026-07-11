import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { automations, automationRuns, automationVersions } from "@/lib/db/schema";
import { PageHeader, Card, Badge, EmptyState, fmtDateTime, inputClass, btnPrimary, btnSecondary } from "@/components/ui";
import { AutomationForm } from "@/components/AutomationForm";
import { updateAutomationAction, publishAutomationAction, simulateAutomationAction, toggleAutomationAction } from "@/app/actions";

export default async function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const automation = db.select().from(automations).where(eq(automations.id, Number(id))).get();
  if (!automation) notFound();
  const runs = db.select().from(automationRuns).where(eq(automationRuns.automationId, automation.id)).orderBy(desc(automationRuns.id)).limit(30).all();
  const versions = db.select().from(automationVersions).where(eq(automationVersions.automationId, automation.id)).orderBy(desc(automationVersions.version)).all();

  return (
    <>
      <PageHeader
        title={automation.name}
        subtitle={automation.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Badge value={automation.enabled ? "active" : "draft"} label={automation.enabled ? `published v${automation.currentVersion}` : automation.currentVersion > 0 ? `paused v${automation.currentVersion}` : "draft"} />
            {automation.currentVersion > 0 && (
              <form action={toggleAutomationAction}>
                <input type="hidden" name="automationId" value={automation.id} />
                <input type="hidden" name="to" value={automation.enabled ? "off" : "on"} />
                <button className={btnSecondary}>{automation.enabled ? "Pause" : "Resume"}</button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card title="Definition (editing creates unpublished changes — publish to activate them)">
            <AutomationForm action={updateAutomationAction} existing={automation} />
          </Card>
          <Card title="Safety rails">
            <div className="flex flex-wrap items-end gap-3">
              <form action={simulateAutomationAction}>
                <input type="hidden" name="automationId" value={automation.id} />
                <button className={btnSecondary}>▶ Simulate against recent data</button>
              </form>
              <form action={publishAutomationAction} className="flex items-end gap-2">
                <input type="hidden" name="automationId" value={automation.id} />
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">Publish notes</span>
                  <input name="notes" placeholder="what changed?" className={inputClass} />
                </label>
                <button className={btnPrimary}>Publish v{automation.currentVersion + 1}</button>
              </form>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Simulation replays the most recent matching event with zero side effects — predicted actions appear in run history marked “simulated”. Publishing snapshots an immutable version and enables the automation.
            </p>
          </Card>
          {versions.length > 0 && (
            <Card title={`Versions (${versions.length})`}>
              <ul className="divide-y divide-neutral-100 text-sm">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2">
                    <span>v{v.version} {v.version === automation.currentVersion && <Badge value="active" label="current" />}</span>
                    <span className="text-xs text-neutral-400">{v.publishNotes ?? "—"} · {fmtDateTime(v.publishedAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card title={`Run history (${runs.length})`}>
          {runs.length === 0 ? <EmptyState text="No runs yet — simulate or wait for the trigger." /> : (
            <ul className="space-y-3">
              {runs.map((r) => (
                <li key={r.id} className="rounded-lg border border-neutral-100 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge value={r.status} />
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
        </Card>
      </div>
    </>
  );
}
