import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { automations, automationRuns } from "@/lib/db/schema";
import { PageHeader, Badge, Table, Th, Td, btnPrimary, fmtDateTime } from "@/components/ui";
import { toggleAutomationAction } from "@/app/actions";

export default async function AutomationsPage() {
  const db = getDb();
  const rows = db.select().from(automations).all();
  const runs = db.select().from(automationRuns).orderBy(desc(automationRuns.id)).limit(200).all();

  return (
    <>
      <PageHeader
        title="Automations"
        subtitle="Trigger → conditions → actions. Simulate safely before publishing; every run is logged step by step."
        actions={<Link href="/automations/new" className={btnPrimary}>+ New automation</Link>}
      />
      <Table head={<><Th>Automation</Th><Th>Trigger</Th><Th>Status</Th><Th>Version</Th><Th>Runs</Th><Th>Last run</Th><Th>Controls</Th></>}>
        {rows.map((a) => {
          const aRuns = runs.filter((r) => r.automationId === a.id && !r.simulated);
          const last = aRuns[0];
          const failures = aRuns.filter((r) => r.status === "failed").length;
          return (
            <tr key={a.id} className="hover:bg-neutral-50">
              <Td>
                <Link href={`/automations/${a.id}`} className="font-medium hover:underline">{a.name}</Link>
                <span className="block text-xs text-neutral-400">{a.description}</span>
              </Td>
              <Td><code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{a.trigger}</code></Td>
              <Td><Badge value={a.enabled ? "active" : "draft"} label={a.enabled ? "published" : a.currentVersion > 0 ? "paused" : "draft"} /></Td>
              <Td>{a.currentVersion > 0 ? `v${a.currentVersion}` : "—"}</Td>
              <Td>{aRuns.length}{failures > 0 && <span className="ml-1 text-xs text-red-600">({failures} failed)</span>}</Td>
              <Td><span className="text-xs text-neutral-500">{last ? fmtDateTime(last.startedAt) : "—"}</span></Td>
              <Td>
                {a.currentVersion > 0 && (
                  <form action={toggleAutomationAction}>
                    <input type="hidden" name="automationId" value={a.id} />
                    <input type="hidden" name="to" value={a.enabled ? "off" : "on"} />
                    <button className="rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 cursor-pointer">
                      {a.enabled ? "Pause" : "Resume"}
                    </button>
                  </form>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
