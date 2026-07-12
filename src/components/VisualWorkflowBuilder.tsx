"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ServerAction = (form: FormData) => Promise<void>;
type Condition = { field: string; op: string; value: string };
type BuilderAction = { id: string; type: string; p1: string; p2: string };
type Graph = { trigger: string; conditions: Condition[]; actions: BuilderAction[] };

const TRIGGERS = [
  { value: "deal.created", label: "Opportunity created", category: "Opportunities", detail: "Runs when a new opportunity enters the CRM." },
  { value: "deal.stage_changed", label: "Pipeline stage changed", category: "Opportunities", detail: "Runs after an opportunity moves to another stage." },
  { value: "deal.won", label: "Opportunity won", category: "Opportunities", detail: "Runs when an opportunity is marked won." },
  { value: "deal.lost", label: "Opportunity lost", category: "Opportunities", detail: "Runs when an opportunity is marked lost." },
  { value: "person.created", label: "Contact created", category: "Contacts", detail: "Runs when a new person is added." },
  { value: "company.created", label: "Company created", category: "Contacts", detail: "Runs when a company is added." },
  { value: "company.health_changed", label: "Company health changed", category: "Contacts", detail: "Runs when account health changes." },
  { value: "ticket.created", label: "Conversation / ticket created", category: "Conversations", detail: "Runs when a support conversation starts." },
  { value: "ticket.escalated", label: "Ticket escalated", category: "Conversations", detail: "Runs when a conversation is escalated." },
  { value: "ticket.resolved", label: "Ticket resolved", category: "Conversations", detail: "Runs when a ticket is resolved." },
  { value: "quote.accepted", label: "Quote accepted", category: "Payments", detail: "Runs after quote acceptance." },
  { value: "invoice.issued", label: "Invoice issued", category: "Payments", detail: "Runs when an invoice is issued." },
  { value: "invoice.overdue", label: "Invoice overdue", category: "Payments", detail: "Runs when payment passes its due date." },
  { value: "invoice.paid", label: "Invoice paid", category: "Payments", detail: "Runs when an invoice becomes fully paid." },
  { value: "payment.recorded", label: "Payment recorded", category: "Payments", detail: "Runs for each recorded payment." },
  { value: "project.created", label: "Project created", category: "Delivery", detail: "Runs when delivery work begins." },
  { value: "milestone.reached", label: "Milestone reached", category: "Delivery", detail: "Runs when a milestone completes." },
  { value: "task.completed", label: "Task completed", category: "Delivery", detail: "Runs when a task is completed." },
];

const ACTIONS = [
  { value: "send_message", label: "Send SMS", category: "Communication", icon: "▤", tone: "blue", detail: "Send a personalised text through your Android SMS Gateway.", p1: "Message", p2: "Recipient" },
  { value: "create_task", label: "Create task", category: "Internal", icon: "✓", tone: "violet", detail: "Create a follow-up task for the team.", p1: "Task title", p2: "Due in days" },
  { value: "add_note", label: "Add note", category: "CRM", icon: "✎", tone: "amber", detail: "Append an internal note to the related record.", p1: "Note body", p2: "" },
  { value: "add_tag", label: "Add contact tag", category: "CRM", icon: "◆", tone: "emerald", detail: "Apply a tag for segmentation and downstream triggers.", p1: "Tag", p2: "" },
  { value: "update_field", label: "Update field", category: "CRM", icon: "↻", tone: "cyan", detail: "Update a field on the related ticket or record.", p1: "Field", p2: "Value" },
  { value: "create_ticket", label: "Create ticket", category: "Conversations", icon: "◔", tone: "rose", detail: "Create a new support ticket or conversation.", p1: "Subject", p2: "Priority" },
  { value: "escalate_ticket", label: "Escalate ticket", category: "Conversations", icon: "↑", tone: "orange", detail: "Escalate the related ticket immediately.", p1: "", p2: "" },
  { value: "request_approval", label: "Request approval", category: "Internal", icon: "♟", tone: "indigo", detail: "Pause for a human decision before continuing.", p1: "Approval title", p2: "Description" },
] as const;

const OPS = ["eq", "neq", "contains", "gt", "lt", "gte", "lte", "is_set", "not_set"];
const initialGraph: Graph = { trigger: "", conditions: [], actions: [] };

function actionMeta(type: string) {
  return ACTIONS.find((item) => item.value === type) ?? ACTIONS[0];
}

const toneClasses: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  cyan: "bg-cyan-50 text-cyan-600",
  rose: "bg-rose-50 text-rose-600",
  orange: "bg-orange-50 text-orange-600",
  indigo: "bg-indigo-50 text-indigo-600",
};

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function VisualWorkflowBuilder({ action }: { action: ServerAction }) {
  const [name, setName] = useState("Untitled Workflow");
  const [description, setDescription] = useState("");
  const [graph, setGraph] = useState<Graph>(initialGraph);
  const [history, setHistory] = useState<Graph[]>([initialGraph]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [drawer, setDrawer] = useState<"trigger" | "trigger-config" | "actions" | "action-config" | "workflow" | null>("trigger");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(100);

  const selectedAction = graph.actions.find((item) => item.id === selectedActionId);
  const triggerMeta = TRIGGERS.find((item) => item.value === graph.trigger);
  const filteredTriggers = useMemo(() => TRIGGERS.filter((item) => `${item.label} ${item.category} ${item.detail}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const filteredActions = useMemo(() => ACTIONS.filter((item) => `${item.label} ${item.category} ${item.detail}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const canCreate = name.trim().length > 0 && graph.trigger.length > 0 && graph.actions.length > 0;

  function commit(next: Graph) {
    setGraph(next);
    const nextHistory = history.slice(0, historyIndex + 1).concat(next);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }

  function undo() {
    if (historyIndex === 0) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    setGraph(history[next]);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setGraph(history[next]);
  }

  function selectTrigger(value: string) {
    commit({ ...graph, trigger: value });
    setSearch("");
    setDrawer("trigger-config");
  }

  function addAction(type: string) {
    const nextAction: BuilderAction = { id: id(), type, p1: "", p2: type === "send_message" ? "contact.phone" : "" };
    commit({ ...graph, actions: [...graph.actions, nextAction] });
    setSelectedActionId(nextAction.id);
    setSearch("");
    setDrawer("action-config");
  }

  function updateAction(actionId: string, patch: Partial<BuilderAction>) {
    setGraph((current) => ({ ...current, actions: current.actions.map((item) => item.id === actionId ? { ...item, ...patch } : item) }));
  }

  function removeAction(actionId: string) {
    commit({ ...graph, actions: graph.actions.filter((item) => item.id !== actionId) });
    setSelectedActionId(null);
    setDrawer(null);
  }

  function moveAction(actionId: string, delta: number) {
    const index = graph.actions.findIndex((item) => item.id === actionId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= graph.actions.length) return;
    const actions = [...graph.actions];
    [actions[index], actions[target]] = [actions[target], actions[index]];
    commit({ ...graph, actions });
  }

  function addCondition() {
    if (graph.conditions.length >= 5) return;
    commit({ ...graph, conditions: [...graph.conditions, { field: "", op: "eq", value: "" }] });
  }

  function updateCondition(index: number, patch: Partial<Condition>) {
    setGraph((current) => ({ ...current, conditions: current.conditions.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  }

  function removeCondition(index: number) {
    commit({ ...graph, conditions: graph.conditions.filter((_, i) => i !== index) });
  }

  return (
    <form action={action} className="flex min-h-[calc(100vh-54px)] flex-col bg-[#f6f8fb]">
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="trigger" value={graph.trigger} />
      {Array.from({ length: 5 }).map((_, index) => <span key={`condition-hidden-${index}`}>
        <input type="hidden" name={`cond_field_${index}`} value={graph.conditions[index]?.field ?? ""} />
        <input type="hidden" name={`cond_op_${index}`} value={graph.conditions[index]?.op ?? "eq"} />
        <input type="hidden" name={`cond_value_${index}`} value={graph.conditions[index]?.value ?? ""} />
      </span>)}
      {Array.from({ length: 8 }).map((_, index) => <span key={`action-hidden-${index}`}>
        <input type="hidden" name={`action_type_${index}`} value={graph.actions[index]?.type ?? ""} />
        <input type="hidden" name={`action_p1_${index}`} value={graph.actions[index]?.p1 ?? ""} />
        <input type="hidden" name={`action_p2_${index}`} value={graph.actions[index]?.p2 ?? ""} />
      </span>)}

      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-3 px-5">
          <Link href="/automations" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Workflows list</Link>
          <span className="h-6 w-px bg-slate-200" />
          <button type="button" onClick={() => setDrawer("workflow")} className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-slate-900">{name} <span className="ml-1 text-slate-400">✎</span></button>
          <span className="ghl-avatar">AR</span>
          <button type="button" onClick={undo} disabled={historyIndex === 0} className="toolbar-control px-3 disabled:opacity-35" title="Undo">↶</button>
          <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className="toolbar-control px-3 disabled:opacity-35" title="Redo">↷</button>
          <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600">Draft</span>
        </div>
        <div className="flex min-h-12 items-center justify-between border-t border-slate-100 px-5">
          <select className="toolbar-control my-2 w-[170px]" aria-label="Builder type"><option>Standard builder</option></select>
          <nav className="flex self-stretch items-end gap-7 text-xs">
            <span className="border-b-2 border-blue-600 px-1 pb-3 font-semibold text-blue-700">Builder</span>
            <span className="px-1 pb-3 text-slate-400">Settings</span>
            <span className="px-1 pb-3 text-slate-400">Enrollment history</span>
            <span className="px-1 pb-3 text-slate-400">Execution logs</span>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Create the draft before testing or publishing</span>
            <button type="submit" disabled={!canCreate} className="primary-cta disabled:cursor-not-allowed disabled:bg-slate-300">Create workflow</button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-[630px] flex-1 overflow-hidden">
        <aside className="flex w-14 shrink-0 flex-col items-center gap-4 border-r border-slate-200 bg-white py-4 text-slate-500">
          {[
            ["◯", "Trigger", () => { setSearch(""); setDrawer("trigger"); }],
            ["✓", "Actions", () => { setSearch(""); setDrawer("actions"); }],
            ["◷", "History", () => null], ["▱", "Templates", () => null], ["⌕", "Search", () => null], ["✦", "AI builder", () => null],
          ].map(([icon, label, onClick]) => <button key={String(label)} type="button" onClick={onClick as () => void} title={String(label)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-blue-600">{String(icon)}</button>)}
        </aside>

        <div className="pane-scroll relative flex-1 overflow-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="mx-auto flex min-h-full w-[520px] origin-top flex-col items-center py-10 transition-transform" style={{ transform: `scale(${zoom / 100})` }}>
            {graph.trigger ? <button type="button" onClick={() => setDrawer("trigger-config")} className="w-[310px] rounded-xl border-2 border-blue-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md">
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg text-blue-600">⚡</span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-blue-500">Workflow trigger</p><h3 className="mt-1 text-sm font-semibold">{triggerMeta?.label ?? graph.trigger}</h3><p className="mt-1 text-[10px] text-slate-400">{graph.conditions.length ? `${graph.conditions.length} filter${graph.conditions.length === 1 ? "" : "s"} configured` : "Runs every time the event occurs"}</p></div></div>
            </button> : <button type="button" onClick={() => setDrawer("trigger")} className="w-[310px] rounded-xl border-2 border-dashed border-blue-300 bg-white/90 p-5 text-center shadow-sm hover:border-blue-500 hover:bg-white"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xl text-blue-600">＋</span><h3 className="mt-3 text-sm font-semibold">Add New Trigger</h3><p className="mt-1 text-[10px] text-slate-400">Choose the event that enrolls records</p></button>}

            {graph.actions.map((item, index) => {
              const meta = actionMeta(item.type);
              return <div key={item.id} className="flex flex-col items-center">
                <span className="h-7 w-px bg-slate-300" />
                <button type="button" onClick={() => { setSelectedActionId(item.id); setDrawer("action-config"); }} className={`group w-[320px] rounded-xl border bg-white p-4 text-left shadow-sm transition ${selectedActionId === item.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300 hover:shadow-md"}`}>
                  <div className="flex items-start gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${toneClasses[meta.tone]}`}>{meta.icon}</span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-violet-500">Action {index + 1}</p><h3 className="mt-1 text-sm font-semibold text-slate-800">{meta.label}</h3><p className="mt-1 truncate text-[10px] text-slate-400">{item.p1 || meta.detail}</p></div><span className="text-slate-300 group-hover:text-slate-500">⋮</span></div>
                </button>
              </div>;
            })}
            <span className="h-7 w-px bg-slate-300" />
            <button type="button" onClick={() => { setSearch(""); setDrawer("actions"); }} disabled={!graph.trigger || graph.actions.length >= 8} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-lg text-blue-600 shadow-sm hover:bg-blue-50 disabled:border-slate-300 disabled:text-slate-300">＋</button>
            <span className="mt-2 text-[10px] text-slate-400">{graph.actions.length >= 8 ? "Action limit reached" : "Add action"}</span>
          </div>

          <div className="fixed bottom-6 left-[300px] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <button type="button" className="border-b border-slate-100 p-3 text-xs">☝</button>
            <button type="button" onClick={() => setZoom(Math.min(125, zoom + 10))} className="border-b border-slate-100 p-3">＋</button>
            <button type="button" onClick={() => setZoom(100)} className="border-b border-slate-100 px-2 py-3 text-[10px]">{zoom}%</button>
            <button type="button" onClick={() => setZoom(Math.max(70, zoom - 10))} className="border-b border-slate-100 p-3">−</button>
            <button type="button" onClick={() => setZoom(90)} className="p-3">⛶</button>
          </div>
          <div className="fixed bottom-6 right-6 h-24 w-36 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-lg">
            <div className="mx-auto mt-1 h-3 w-20 rounded bg-blue-100" />
            {graph.actions.slice(0, 3).map((item) => <div key={item.id} className="mx-auto mt-2 h-2 w-16 rounded bg-slate-200" />)}
          </div>
        </div>

        {drawer && <aside className="pane-scroll w-[390px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white shadow-[-8px_0_24px_rgba(15,23,42,.06)]">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
            <div><h2 className="text-sm font-semibold text-slate-900">{drawer === "trigger" ? "Add workflow trigger" : drawer === "trigger-config" ? "Trigger configuration" : drawer === "actions" ? "Add an action" : drawer === "workflow" ? "Workflow details" : "Action configuration"}</h2><p className="mt-1 text-[11px] text-slate-400">{drawer === "trigger" ? "What should start this workflow?" : drawer === "actions" ? "What should happen next?" : "Configure this step"}</p></div>
            <button type="button" onClick={() => setDrawer(null)} className="text-xl text-slate-400">×</button>
          </div>

          {(drawer === "trigger" || drawer === "actions") && <div className="p-4"><label className="toolbar-search min-w-0 w-full"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${drawer === "trigger" ? "triggers" : "actions"}`} /></label>
            <div className="mt-4 space-y-2">{drawer === "trigger" ? filteredTriggers.map((item) => <button type="button" key={item.value} onClick={() => selectTrigger(item.value)} className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">⚡</span><span><span className="block text-xs font-semibold text-slate-800">{item.label}</span><span className="mt-0.5 block text-[10px] font-medium text-blue-500">{item.category}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{item.detail}</span></span></button>) : filteredActions.map((item) => <button type="button" key={item.value} onClick={() => addAction(item.value)} className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[item.tone]}`}>{item.icon}</span><span><span className="block text-xs font-semibold text-slate-800">{item.label}</span><span className="mt-0.5 block text-[10px] font-medium text-blue-500">{item.category}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{item.detail}</span></span></button>)}</div>
          </div>}

          {drawer === "workflow" && <div className="space-y-4 p-5"><label className="block text-xs font-semibold text-slate-600">Workflow name<input value={name} onChange={(event) => setName(event.target.value)} className="toolbar-control mt-1 w-full" /></label><label className="block text-xs font-semibold text-slate-600">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-xs outline-none focus:border-blue-400" placeholder="Describe what this workflow does" /></label><button type="button" onClick={() => setDrawer(null)} className="primary-cta w-full justify-center">Done</button></div>}

          {drawer === "trigger-config" && <div className="p-5">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><p className="text-[10px] font-semibold uppercase text-blue-500">Selected trigger</p><p className="mt-1 text-sm font-semibold text-slate-800">{triggerMeta?.label}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{triggerMeta?.detail}</p><button type="button" onClick={() => { setSearch(""); setDrawer("trigger"); }} className="mt-2 text-[10px] font-semibold text-blue-600">Change trigger</button></div>
            <div className="mt-5 flex items-center justify-between"><div><h3 className="text-xs font-semibold">Filters</h3><p className="mt-1 text-[10px] text-slate-400">All filters must match before enrollment.</p></div><button type="button" onClick={addCondition} disabled={graph.conditions.length >= 5} className="toolbar-control min-h-8">＋ Add filter</button></div>
            <div className="mt-3 space-y-3">{graph.conditions.map((condition, index) => <div key={index} className="rounded-lg border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase text-slate-400"><span>Filter {index + 1}</span><button type="button" onClick={() => removeCondition(index)} className="text-red-500">Remove</button></div><div className="space-y-2"><input value={condition.field} onChange={(event) => updateCondition(index, { field: event.target.value })} className="toolbar-control w-full" placeholder="Payload field, e.g. source"/><select value={condition.op} onChange={(event) => updateCondition(index, { op: event.target.value })} className="toolbar-control w-full">{OPS.map((op) => <option key={op}>{op}</option>)}</select>{!['is_set','not_set'].includes(condition.op) && <input value={condition.value} onChange={(event) => updateCondition(index, { value: event.target.value })} className="toolbar-control w-full" placeholder="Value"/>}</div></div>)}</div>
            {!graph.conditions.length && <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-5 text-center text-[10px] text-slate-400">No filters. Every matching event will enroll.</div>}
            <button type="button" onClick={() => setDrawer(null)} className="primary-cta mt-5 w-full justify-center">Save trigger</button>
          </div>}

          {drawer === "action-config" && selectedAction && <div className="p-5">{(() => { const meta = actionMeta(selectedAction.type); return <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-start gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[meta.tone]}`}>{meta.icon}</span><div><p className="text-sm font-semibold">{meta.label}</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{meta.detail}</p></div></div></div>
            {selectedAction.type === "send_message" ? <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold text-slate-600">Action name<input value="Send SMS" readOnly className="toolbar-control mt-1 w-full bg-slate-50" /></label>
              <label className="block text-xs font-semibold text-slate-600">Recipient
                <select value={selectedAction.p2 || "contact.phone"} onChange={(event) => updateAction(selectedAction.id, { p2: event.target.value })} className="toolbar-control mt-1 w-full">
                  <option value="contact.phone">Related contact phone</option>
                  <option value="payload.phone">Phone from trigger payload</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">Message
                <textarea value={selectedAction.p1} onChange={(event) => updateAction(selectedAction.id, { p1: event.target.value })} rows={7} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-xs leading-5 outline-none focus:border-blue-400" placeholder="Hi {firstName}, thanks for getting in touch…" />
              </label>
              <div className="flex flex-wrap gap-1.5">{["{firstName}", "{lastName}", "{name}", "{number}", "{id}"].map((variable) => <button key={variable} type="button" onClick={() => updateAction(selectedAction.id, { p1: `${selectedAction.p1}${selectedAction.p1 ? " " : ""}${variable}` })} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600 hover:border-blue-300">{variable}</button>)}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400"><span>{selectedAction.p1.length} characters · {Math.max(1, Math.ceil(selectedAction.p1.length / 160))} SMS segment{selectedAction.p1.length > 160 ? "s" : ""}</span><span>SelfhostSim</span></div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-[10px] leading-4 text-amber-800">Tests use workflow simulation and do not send a real SMS. Publishing enables live delivery for future matching events.</div>
            </div> : <div className="mt-5 space-y-4">{meta.p1 && <label className="block text-xs font-semibold text-slate-600">{meta.p1}{selectedAction.type === "add_note" ? <textarea value={selectedAction.p1} onChange={(event) => updateAction(selectedAction.id, { p1: event.target.value })} rows={5} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-xs outline-none focus:border-blue-400" placeholder={`Enter ${meta.p1.toLowerCase()}`} /> : <input value={selectedAction.p1} onChange={(event) => updateAction(selectedAction.id, { p1: event.target.value })} className="toolbar-control mt-1 w-full" placeholder={`Enter ${meta.p1.toLowerCase()}`} />}</label>}{meta.p2 && <label className="block text-xs font-semibold text-slate-600">{meta.p2}<input value={selectedAction.p2} onChange={(event) => updateAction(selectedAction.id, { p2: event.target.value })} className="toolbar-control mt-1 w-full" placeholder={`Enter ${meta.p2.toLowerCase()}`} /></label>}</div>}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4"><div className="flex gap-1"><button type="button" onClick={() => moveAction(selectedAction.id, -1)} className="toolbar-control min-h-8 px-2">↑</button><button type="button" onClick={() => moveAction(selectedAction.id, 1)} className="toolbar-control min-h-8 px-2">↓</button><button type="button" onClick={() => removeAction(selectedAction.id)} className="toolbar-control min-h-8 border-red-200 px-2 text-red-600">Delete</button></div><button type="button" onClick={() => setDrawer(null)} className="primary-cta">Save action</button></div>
          </>; })()}</div>}
        </aside>}
      </div>
    </form>
  );
}
