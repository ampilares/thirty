import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { workspace, stages } from "@/lib/db/schema";
import { listCustomFields } from "@/lib/core/custom-fields";
import { aiProviderStatus } from "@/lib/ai/gateway";
import { selfhostSimStatus } from "@/lib/messaging/selfhostsim";
import { PageHeader, Card, Badge, inputClass, btnPrimary, btnSecondary, btnDanger } from "@/components/ui";
import { addCustomFieldAction, removeCustomFieldAction, renameStageAction, resetDemoDataAction } from "@/app/actions";

export default async function SettingsPage() {
  const db = getDb();
  const ws = db.select().from(workspace).get();
  const stageRows = db.select().from(stages).orderBy(stages.position).all();
  const fields = listCustomFields();
  const provider = aiProviderStatus();
  const sms = selfhostSimStatus();

  return (
    <>
      <PageHeader title="Settings" subtitle={`Workspace: ${ws?.name ?? "—"}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Custom fields (CORE-01)">
          <p className="mb-3 text-xs text-neutral-400">Typed fields on People, Companies, Deals, and Projects — they appear on forms and record pages immediately.</p>
          <ul className="mb-4 divide-y divide-neutral-100 text-sm">
            {fields.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-medium">{f.label}</span>
                  <span className="ml-2 text-xs text-neutral-400">{f.objectType} · {f.type}{f.options ? ` (${f.options.join(", ")})` : ""}</span>
                </span>
                <form action={removeCustomFieldAction}>
                  <input type="hidden" name="fieldId" value={f.id} />
                  <button className="text-xs text-red-500 hover:underline cursor-pointer">remove</button>
                </form>
              </li>
            ))}
            {fields.length === 0 && <li className="py-2 text-sm text-neutral-400">No custom fields defined.</li>}
          </ul>
          <form action={addCustomFieldAction} className="grid grid-cols-2 gap-2">
            <select name="objectType" className={inputClass}>
              <option value="deal">Deal</option>
              <option value="company">Company</option>
              <option value="person">Person</option>
              <option value="project">Project</option>
            </select>
            <input name="label" required placeholder="Field label" className={inputClass} />
            <select name="type" className={inputClass}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Select</option>
            </select>
            <input name="options" placeholder="Select options, comma-separated" className={inputClass} />
            <button className={`${btnPrimary} col-span-2 justify-center`}>Add field</button>
          </form>
        </Card>

        <Card title="Pipeline stages">
          <ul className="space-y-2">
            {stageRows.map((s) => (
              <li key={s.id}>
                <form action={renameStageAction} className="flex items-center gap-2">
                  <input type="hidden" name="stageId" value={s.id} />
                  <Badge value={s.kind === "won" ? "done" : s.kind === "lost" ? "failed" : "open"} label={s.kind} />
                  <input name="name" defaultValue={s.name} className={inputClass} />
                  <button className={btnSecondary}>Rename</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="AI provider">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-neutral-500">Active provider</dt><dd><Badge value={provider.provider === "anthropic" ? "active" : "draft"} label={provider.provider} /></dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">Model</dt><dd className="font-mono text-xs">{provider.model}</dd></div>
          </dl>
          <p className="mt-3 border-t border-neutral-100 pt-2 text-xs text-neutral-400">
            The platform is fully functional offline with the deterministic provider. Set <code className="rounded bg-neutral-100 px-1">ANTHROPIC_API_KEY</code> (and optionally <code className="rounded bg-neutral-100 px-1">THIRTY_AI_MODEL</code>) in <code className="rounded bg-neutral-100 px-1">.env.local</code> to upgrade briefings, drafts, and free-form Ask questions to an LLM. Keys never leave the server.
          </p>
        </Card>

        <Card title="Android SMS Gateway">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-800">SelfhostSim</p>
              <p className="mt-0.5 text-xs text-neutral-400">Workflow SMS delivery through your linked Android device.</p>
            </div>
            <Badge value={sms.configured ? "active" : "draft"} label={sms.configured ? "Ready" : "Setup required"} />
          </div>
          <dl className="mt-4 space-y-2 border-t border-neutral-100 pt-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-neutral-500">API URL</dt><dd className="max-w-[65%] truncate font-mono text-xs">{sms.baseUrl ?? "Not set"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-neutral-500">Device ID</dt><dd className="max-w-[65%] truncate font-mono text-xs">{sms.deviceId ?? "Not set"}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">API key</dt><dd className="font-mono text-xs">{sms.hasApiKey ? "•••••••• configured" : "Not set"}</dd></div>
          </dl>
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            Add <code>SELFHOSTSIM_BASE_URL</code>, <code>SELFHOSTSIM_API_KEY</code>, and <code>SELFHOSTSIM_DEVICE_ID</code> to <code>.env.local</code>, then restart Thirty. The API key stays server-side. Use HTTPS when the gateway is not on localhost.
          </div>
          <p className="mt-3 text-xs text-neutral-400">Workflow simulations never call the gateway. Live sends appear in the workflow execution log, audit ledger, and SelfhostSim message history.</p>
        </Card>

        <Card title="Data">
          <div className="flex flex-wrap items-center gap-3">
            <a href="/api/v1/export" className={btnSecondary} download>⬇ Export workspace JSON</a>
            <form action={resetDemoDataAction}>
              <button className={btnDanger}>Reset demo data</button>
            </form>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Export covers all core objects plus the audit log (ADM-02). Reset rebuilds the database with the seeded Coastal Digital workspace — everything you changed is lost.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            REST API: <Link href="/api/v1/deals" className="underline">/api/v1/&#123;people, companies, deals, projects, tasks, quotes, invoices, payments, tickets, audit, ask, forms/lead&#125;</Link>
          </p>
        </Card>
      </div>
    </>
  );
}
