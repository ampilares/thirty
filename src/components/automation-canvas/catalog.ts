import type { AutomationCondition, AutomationAction } from "@/lib/db/schema";

export type ActionType = AutomationAction["type"];
export type CondOp = AutomationCondition["op"];

export const OPS: { value: CondOp; label: string; needsValue: boolean }[] = [
  { value: "eq", label: "equals", needsValue: true },
  { value: "neq", label: "does not equal", needsValue: true },
  { value: "contains", label: "contains", needsValue: true },
  { value: "gt", label: "greater than", needsValue: true },
  { value: "lt", label: "less than", needsValue: true },
  { value: "gte", label: "≥", needsValue: true },
  { value: "lte", label: "≤", needsValue: true },
  { value: "is_set", label: "is set", needsValue: false },
  { value: "not_set", label: "is not set", needsValue: false },
];

export type TriggerMeta = { event: string; label: string; group: string; payloadHint: string };

export const TRIGGERS: TriggerMeta[] = [
  { event: "person.created", label: "Contact created", group: "Customers", payloadHint: "name, email, role" },
  { event: "company.created", label: "Company created", group: "Customers", payloadHint: "name, industry, size" },
  { event: "company.health_changed", label: "Company health changed", group: "Customers", payloadHint: "name, health (good/watch/at_risk)" },
  { event: "deal.created", label: "Deal created", group: "Sales", payloadHint: "name, valueCents, source, priority" },
  { event: "deal.stage_changed", label: "Deal stage changed", group: "Sales", payloadHint: "name, stage, valueCents" },
  { event: "deal.won", label: "Deal won", group: "Sales", payloadHint: "name, valueCents" },
  { event: "deal.lost", label: "Deal lost", group: "Sales", payloadHint: "name, valueCents, reason" },
  { event: "quote.accepted", label: "Quote accepted", group: "Sales", payloadHint: "number, totalCents" },
  { event: "invoice.issued", label: "Invoice issued", group: "Money", payloadHint: "number, totalCents, dueDate" },
  { event: "invoice.overdue", label: "Invoice overdue", group: "Money", payloadHint: "number, totalCents, daysOverdue" },
  { event: "invoice.paid", label: "Invoice paid", group: "Money", payloadHint: "number, totalCents" },
  { event: "payment.recorded", label: "Payment recorded", group: "Money", payloadHint: "amountCents, method" },
  { event: "project.created", label: "Project created", group: "Delivery", payloadHint: "name, status" },
  { event: "milestone.reached", label: "Milestone reached", group: "Delivery", payloadHint: "name, project" },
  { event: "task.completed", label: "Task completed", group: "Delivery", payloadHint: "title, project" },
  { event: "ticket.created", label: "Ticket created", group: "Support", payloadHint: "subject, priority" },
  { event: "ticket.escalated", label: "Ticket escalated", group: "Support", payloadHint: "subject, priority" },
  { event: "ticket.resolved", label: "Ticket resolved", group: "Support", payloadHint: "subject" },
];

export const TRIGGER_GROUPS = ["Customers", "Sales", "Money", "Delivery", "Support"];

export function triggerMeta(event: string): TriggerMeta {
  return TRIGGERS.find((t) => t.event === event) ?? { event, label: event, group: "Other", payloadHint: "" };
}

export type ParamSpec = { key: string; label: string; placeholder?: string; kind: "text" | "number" | "select"; options?: string[] };

export type ActionMeta = {
  type: ActionType;
  label: string;
  hint: string;
  /** tailwind classes for the icon chip */
  chip: string;
  /** left accent border */
  accent: string;
  icon: string; // key into ICON_PATHS
  params: ParamSpec[];
  summary: (p: Record<string, string | number>) => string;
};

export const ACTIONS: ActionMeta[] = [
  {
    type: "create_task",
    label: "Create task",
    hint: "Adds a to-do on the matched record's project or company",
    chip: "bg-sky-100 text-sky-700",
    accent: "border-l-sky-400",
    icon: "task",
    params: [
      { key: "title", label: "Task title", placeholder: "Follow up on {name}", kind: "text" },
      { key: "dueInDays", label: "Due in (days)", placeholder: "1", kind: "number" },
    ],
    summary: (p) => `“${p.title || "Follow up on {name}"}” · due in ${p.dueInDays || 1}d`,
  },
  {
    type: "add_note",
    label: "Add note",
    hint: "Writes a note to the record's timeline",
    chip: "bg-amber-100 text-amber-700",
    accent: "border-l-amber-400",
    icon: "note",
    params: [{ key: "body", label: "Note body", placeholder: "Deal {name} moved…", kind: "text" }],
    summary: (p) => String(p.body || "(empty note)"),
  },
  {
    type: "send_message",
    label: "Send message",
    hint: "Logs an outbound message to the customer (no real email in MVP)",
    chip: "bg-indigo-100 text-indigo-700",
    accent: "border-l-indigo-400",
    icon: "message",
    params: [{ key: "body", label: "Message body", placeholder: "Hi {name}, …", kind: "text" }],
    summary: (p) => String(p.body || "(empty message)"),
  },
  {
    type: "add_tag",
    label: "Tag company",
    hint: "Applies a tag to the related company",
    chip: "bg-teal-100 text-teal-700",
    accent: "border-l-teal-400",
    icon: "tag",
    params: [{ key: "tag", label: "Tag", placeholder: "vip", kind: "text" }],
    summary: (p) => `#${p.tag || "flagged"}`,
  },
  {
    type: "create_ticket",
    label: "Create ticket",
    hint: "Opens a support ticket",
    chip: "bg-rose-100 text-rose-700",
    accent: "border-l-rose-400",
    icon: "ticket",
    params: [
      { key: "subject", label: "Subject", placeholder: "Follow-up needed on {name}", kind: "text" },
      { key: "priority", label: "Priority", kind: "select", options: ["low", "normal", "high", "urgent"] },
    ],
    summary: (p) => `“${p.subject || "Follow-up needed"}” · ${p.priority || "normal"}`,
  },
  {
    type: "escalate_ticket",
    label: "Escalate ticket",
    hint: "Bumps the matched ticket's priority and flags it",
    chip: "bg-red-100 text-red-700",
    accent: "border-l-red-400",
    icon: "escalate",
    params: [],
    summary: () => "Raise priority one level",
  },
  {
    type: "request_approval",
    label: "Request approval",
    hint: "Pauses for a human decision in Agents → Approvals",
    chip: "bg-purple-100 text-purple-700",
    accent: "border-l-purple-400",
    icon: "shield",
    params: [
      { key: "title", label: "Approval title", placeholder: "Approve discount", kind: "text" },
      { key: "description", label: "Description", placeholder: "Why this needs a human", kind: "text" },
    ],
    summary: (p) => String(p.title || "Approval requested"),
  },
  {
    type: "update_field",
    label: "Update field",
    hint: "Sets a field on the matched ticket",
    chip: "bg-slate-200 text-slate-700",
    accent: "border-l-slate-400",
    icon: "pencil",
    params: [
      { key: "field", label: "Field", placeholder: "status", kind: "text" },
      { key: "value", label: "Value", placeholder: "pending", kind: "text" },
    ],
    summary: (p) => `${p.field || "field"} = ${p.value || "value"}`,
  },
];

export function actionMeta(type: string): ActionMeta {
  return ACTIONS.find((a) => a.type === type) ?? ACTIONS[0];
}

/** Minimal 24×24 stroke icon paths (stroke-width 2, round caps). */
export const ICON_PATHS: Record<string, string> = {
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  funnel: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
  task: "M9 11.5 11 13.5 15 9.5 M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z",
  note: "M5 4h14v13l-4 3H5V4Z M15 20v-3h4",
  message: "M4 5h16v11H9l-5 4V5Z",
  tag: "M3 12V4h8l9 9-8 8-9-9Z M7.5 8.5h0",
  ticket: "M4 7h16v4a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4V7Z",
  escalate: "M12 4v10 M12 4l-5 5 M12 4l5 5 M5 20h14",
  shield: "M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6l8-3Z",
  pencil: "M4 20l1-4L16 5l3 3L8 19l-4 1Z",
  plus: "M12 5v14 M5 12h14",
  play: "M7 5v14l12-7L7 5Z",
  history: "M4 12a8 8 0 1 1 2.3 5.6 M4 12V7 M4 12h5",
};
