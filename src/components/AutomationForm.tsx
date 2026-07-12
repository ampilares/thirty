import type { automations } from "@/lib/db/schema";
import { inputClass, btnPrimary } from "@/components/ui";

const TRIGGERS = [
  "deal.created",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "quote.accepted",
  "invoice.issued",
  "invoice.overdue",
  "invoice.paid",
  "payment.recorded",
  "project.created",
  "milestone.reached",
  "task.completed",
  "ticket.created",
  "ticket.escalated",
  "ticket.resolved",
  "person.created",
  "company.created",
  "company.health_changed",
];

const OPS = ["eq", "neq", "contains", "gt", "lt", "gte", "lte", "is_set", "not_set"] as const;

const ACTION_TYPES: { value: string; label: string; p1: string; p2?: string }[] = [
  { value: "create_task", label: "Create task", p1: "Task title (use {name}, {id}, {number}…)", p2: "Due in days" },
  { value: "add_note", label: "Add note", p1: "Note body" },
  { value: "send_message", label: "Send SMS (SelfhostSim)", p1: "Message body", p2: "Recipient: contact.phone, payload.phone, or number:+…" },
  { value: "add_tag", label: "Tag the company", p1: "Tag" },
  { value: "create_ticket", label: "Create ticket", p1: "Subject", p2: "Priority (low/normal/high/urgent)" },
  { value: "escalate_ticket", label: "Escalate ticket", p1: "—" },
  { value: "request_approval", label: "Request human approval", p1: "Approval title", p2: "Description" },
  { value: "update_field", label: "Update ticket field", p1: "Field", p2: "Value" },
];

type Def = typeof automations.$inferSelect;

export function AutomationForm({ action, existing }: { action: (form: FormData) => Promise<void>; existing?: Def }) {
  const conds = existing?.conditions ?? [];
  const acts = existing?.actions ?? [];
  return (
    <form action={action} className="space-y-4">
      {existing && <input type="hidden" name="automationId" value={existing.id} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name *</span>
          <input name="name" required defaultValue={existing?.name} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">When this happens (trigger) *</span>
          <select name="trigger" required defaultValue={existing?.trigger ?? "deal.created"} className={inputClass}>
            {TRIGGERS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Description</span>
        <input name="description" defaultValue={existing?.description ?? ""} className={inputClass} />
      </label>

      <fieldset className="rounded-lg border border-neutral-200 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">If all of these match (optional)</legend>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => {
            const c = conds[i];
            return (
              <div key={i} className="grid grid-cols-[1fr_140px_1fr] gap-2">
                <input name={`cond_field_${i}`} placeholder="payload field, e.g. source" defaultValue={c?.field} className={inputClass} />
                <select name={`cond_op_${i}`} defaultValue={c?.op ?? "eq"} className={inputClass}>
                  {OPS.map((op) => <option key={op}>{op}</option>)}
                </select>
                <input name={`cond_value_${i}`} placeholder="value" defaultValue={c?.value !== undefined ? String(c.value) : ""} className={inputClass} />
              </div>
            );
          })}
          <p className="text-xs text-neutral-400">Leave a row's field empty to skip it. Payload fields depend on the trigger — e.g. deal events carry name, valueCents, source, priority; ticket events carry subject, priority.</p>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-neutral-200 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Then do (in order)</legend>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = acts[i];
            const p = (a?.params ?? {}) as Record<string, unknown>;
            const p1Default = a ? String(p.title ?? p.body ?? p.tag ?? p.subject ?? p.field ?? "") : "";
            const p2Default = a ? String(p.dueInDays ?? p.priority ?? p.description ?? p.value ?? p.recipientSource ?? "") : "";
            return (
              <div key={i} className="grid grid-cols-[190px_1fr_150px] gap-2">
                <select name={`action_type_${i}`} defaultValue={a?.type ?? (i === 0 ? "create_task" : "")} className={inputClass}>
                  <option value="">—</option>
                  {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input name={`action_p1_${i}`} placeholder="primary parameter (title / body / tag …)" defaultValue={p1Default} className={inputClass} />
                <input name={`action_p2_${i}`} placeholder="secondary (days / priority …)" defaultValue={p2Default} className={inputClass} />
              </div>
            );
          })}
        </div>
      </fieldset>

      <button className={btnPrimary}>{existing ? "Save changes" : "Create automation (draft)"}</button>
    </form>
  );
}
