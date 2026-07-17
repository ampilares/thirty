"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AutomationCondition, AutomationAction } from "@/lib/db/schema";
import { ACTIONS, OPS, TRIGGERS, TRIGGER_GROUPS, ICON_PATHS, actionMeta, triggerMeta } from "./catalog";

export function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={ICON_PATHS[name] ?? ICON_PATHS.bolt} />
    </svg>
  );
}

type Draft = {
  name: string;
  description: string;
  trigger: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
};

type NodeId = "trigger" | "filter" | `action-${number}`;

const NODE_W = 272;
const GAP_Y = 72;

type Props = {
  existing?: {
    id: number;
    name: string;
    description: string | null;
    trigger: string;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    enabled: boolean;
    currentVersion: number;
  };
  saveAction: (form: FormData) => Promise<void>;
  /** ids of sibling <form> elements rendered by the server page (simulate / publish / toggle) */
  simulateFormId?: string;
  publishFormId?: string;
  toggleFormId?: string;
};

export function AutomationCanvas({ existing, saveAction, simulateFormId, publishFormId, toggleFormId }: Props) {
  const initial: Draft = useMemo(
    () => ({
      name: existing?.name ?? "Untitled automation",
      description: existing?.description ?? "",
      trigger: existing?.trigger ?? "deal.created",
      conditions: existing?.conditions ?? [],
      actions: existing?.actions?.length ? existing.actions : [],
    }),
    [existing]
  );

  const [draft, setDraft] = useState<Draft>(initial);
  const [selected, setSelected] = useState<NodeId | null>(existing ? null : "trigger");
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [heights, setHeights] = useState<Record<string, number>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragRef = useRef<{ kind: "pan" | "node"; id?: string; startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const definition = JSON.stringify(draft);

  // ---------- layout ----------
  const nodeIds: NodeId[] = useMemo(() => ["trigger", "filter", ...draft.actions.map((_, i) => `action-${i}` as const)], [draft.actions]);

  const layout = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    let y = 0;
    for (const id of nodeIds) {
      const off = offsets[id] ?? { x: 0, y: 0 };
      pos[id] = { x: -NODE_W / 2 + off.x, y: y + off.y };
      y += (heights[id] ?? 96) + GAP_Y;
    }
    return pos;
  }, [nodeIds, offsets, heights]);

  useLayoutEffect(() => {
    const next: Record<string, number> = {};
    let changed = false;
    for (const id of nodeIds) {
      const h = nodeRefs.current[id]?.offsetHeight ?? 96;
      next[id] = h;
      if (heights[id] !== h) changed = true;
    }
    if (changed || Object.keys(heights).length !== nodeIds.length) setHeights(next);
  });

  // center on mount / fit
  const fit = () => {
    const el = canvasRef.current;
    if (!el) return;
    const totalH = nodeIds.reduce((s, id) => s + (heights[id] ?? 96) + GAP_Y, -GAP_Y);
    const scale = Math.min(1, (el.clientHeight - 120) / Math.max(totalH, 1));
    setView({ x: el.clientWidth / 2, y: 56, scale: Math.max(0.4, scale) });
  };
  const fitOnce = useRef(false);
  useEffect(() => {
    if (!fitOnce.current && Object.keys(heights).length > 0) {
      fitOnce.current = true;
      fit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heights]);

  // ---------- pan / zoom / drag ----------
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        setView((v) => {
          const scale = Math.min(1.6, Math.max(0.35, v.scale * (e.deltaY < 0 ? 1.08 : 0.925)));
          const k = scale / v.scale;
          return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY, baseX: view.x, baseY: view.y, moved: false };
  };
  const onNodePointerDown = (e: React.PointerEvent, id: NodeId) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const off = offsets[id] ?? { x: 0, y: 0 };
    dragRef.current = { kind: "node", id, startX: e.clientX, startY: e.clientY, baseX: off.x, baseY: off.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (d.kind === "pan") setView((v) => ({ ...v, x: d.baseX + dx, y: d.baseY + dy }));
    else if (d.id) setOffsets((o) => ({ ...o, [d.id!]: { x: d.baseX + dx / view.scale, y: d.baseY + dy / view.scale } }));
  };
  const onPointerUp = (e: React.PointerEvent, id?: NodeId) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) {
      if (d.kind === "node" && id) setSelected(id);
      else if (d.kind === "pan") setSelected(null);
    }
  };

  // ---------- mutations ----------
  const setAction = (i: number, a: AutomationAction) => setDraft((dr) => ({ ...dr, actions: dr.actions.map((x, j) => (j === i ? a : x)) }));
  const insertAction = (i: number, type?: string) => {
    const meta = actionMeta(type ?? "create_task");
    const params: Record<string, string | number> = {};
    for (const p of meta.params) params[p.key] = p.kind === "select" ? (p.options?.[1] ?? p.options?.[0] ?? "") : "";
    setDraft((dr) => {
      const actions = [...dr.actions];
      actions.splice(i, 0, { type: meta.type, params });
      return { ...dr, actions };
    });
    setOffsets({});
    setSelected(`action-${i}`);
  };
  const removeAction = (i: number) => {
    setDraft((dr) => ({ ...dr, actions: dr.actions.filter((_, j) => j !== i) }));
    setOffsets({});
    setSelected(null);
  };
  const moveAction = (i: number, dir: -1 | 1) => {
    setDraft((dr) => {
      const actions = [...dr.actions];
      const j = i + dir;
      if (j < 0 || j >= actions.length) return dr;
      [actions[i], actions[j]] = [actions[j], actions[i]];
      return { ...dr, actions };
    });
    setOffsets({});
    setSelected(`action-${i + dir}`);
  };

  // ---------- rendering helpers ----------
  const edges = useMemo(() => {
    const list: { from: NodeId; to: NodeId; insertAt: number }[] = [];
    for (let i = 0; i < nodeIds.length - 1; i++) {
      list.push({ from: nodeIds[i], to: nodeIds[i + 1], insertAt: i === 0 ? 0 : i - 1 + 1 });
    }
    return list;
  }, [nodeIds]);

  const anchor = (id: NodeId, side: "top" | "bottom") => {
    const p = layout[id];
    const h = heights[id] ?? 96;
    return { x: p.x + NODE_W / 2, y: side === "top" ? p.y : p.y + h };
  };

  const trigMeta = triggerMeta(draft.trigger);
  const status = !existing || existing.currentVersion === 0 ? "draft" : existing.enabled ? `published v${existing.currentVersion}` : `paused v${existing.currentVersion}`;
  const statusTone = status.startsWith("published") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status.startsWith("paused") ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-neutral-100 text-neutral-600 border-neutral-200";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---------- toolbar ---------- */}
      <form action={saveAction} className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
        {existing && <input type="hidden" name="automationId" value={existing.id} />}
        <input type="hidden" name="definition" value={definition} />
        <Link href="/automations" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" title="Back to automations">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        <input
          name="name"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          className="w-64 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-200 focus:border-indigo-400"
        />
        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone}`}>{status}</span>
        {dirty && <span className="text-xs text-amber-600">● unsaved changes</span>}
        <div className="ml-auto flex items-center gap-2">
          {simulateFormId && (
            <button type="submit" form={simulateFormId} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50" title="Replay the most recent matching event with zero side effects">
              <Icon name="play" className="h-3.5 w-3.5" /> Simulate
            </button>
          )}
          {toggleFormId && existing && existing.currentVersion > 0 && (
            <button type="submit" form={toggleFormId} className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
              {existing.enabled ? "Pause" : "Resume"}
            </button>
          )}
          {publishFormId && (
            <details className="relative">
              <summary className="inline-flex cursor-pointer list-none items-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 [&::-webkit-details-marker]:hidden">
                Publish…
              </summary>
              <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
                <label className="block text-xs font-medium text-neutral-500">
                  Publish notes
                  <input name="notes" form={publishFormId} placeholder="what changed?" className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm font-normal text-neutral-800 outline-none focus:border-indigo-400" />
                </label>
                <button type="submit" form={publishFormId} className="mt-2 w-full cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500">
                  Publish v{(existing?.currentVersion ?? 0) + 1}
                </button>
                <p className="mt-1.5 text-[11px] leading-snug text-neutral-400">Snapshots an immutable version and enables the automation. {dirty && "Save your changes first — publishing uses the last saved definition."}</p>
              </div>
            </details>
          )}
          <button type="submit" className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700">
            {existing ? "Save" : "Create automation"}
          </button>
        </div>
      </form>

      <div className="flex min-h-0 flex-1">
        {/* ---------- palette ---------- */}
        <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white md:flex">
          <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Steps</div>
          <p className="px-3 pb-2 text-[11px] leading-snug text-neutral-400">Click to add to the end of the flow, or use the + on a connector.</p>
          {ACTIONS.map((a) => (
            <button
              key={a.type}
              type="button"
              onClick={() => insertAction(draft.actions.length, a.type)}
              className="group mx-2 mb-1 flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-neutral-50"
              title={a.hint}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${a.chip}`}>
                <Icon name={a.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-neutral-700">{a.label}</span>
                <span className="block truncate text-[11px] text-neutral-400">{a.hint}</span>
              </span>
            </button>
          ))}
        </aside>

        {/* ---------- canvas ---------- */}
        <div
          ref={canvasRef}
          className="canvas-dots relative min-w-0 flex-1 touch-none overflow-hidden"
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => onPointerUp(e)}
          style={{ cursor: dragRef.current?.kind === "pan" ? "grabbing" : "default" }}
        >
          <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
            {/* edges */}
            <svg className="pointer-events-none absolute -left-[2000px] -top-[2000px] h-[4000px] w-[4000px] overflow-visible" viewBox="-2000 -2000 4000 4000">
              {edges.map(({ from, to }) => {
                const a = anchor(from, "bottom");
                const b = anchor(to, "top");
                const my = (a.y + b.y) / 2;
                return (
                  <path
                    key={`${from}-${to}`}
                    d={`M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`}
                    fill="none"
                    stroke="#c3c7d1"
                    strokeWidth="1.75"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9" fill="none" stroke="#c3c7d1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>
            </svg>

            {/* edge + buttons (insert between actions; edge after filter inserts at 0) */}
            {edges.map(({ from, to }, ei) => {
              const a = anchor(from, "bottom");
              const b = anchor(to, "top");
              const insertAt = ei === 0 ? -1 : ei - 1; // -1 = edge trigger→filter (no insert)
              if (insertAt < 0) return null;
              return (
                <button
                  key={`plus-${ei}`}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => insertAction(insertAt)}
                  className="absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-400 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600"
                  style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }}
                  title="Insert step here"
                >
                  <Icon name="plus" className="h-3 w-3" />
                </button>
              );
            })}

            {/* trigger node */}
            <CanvasNode
              id="trigger"
              layout={layout}
              selected={selected === "trigger"}
              nodeRefs={nodeRefs}
              onPointerDown={onNodePointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <div className="flex items-center gap-2.5 px-3.5 pt-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Icon name="bolt" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Trigger</div>
                  <div className="truncate text-sm font-semibold text-neutral-800">{trigMeta.label}</div>
                </div>
              </div>
              <div className="px-3.5 pb-3 pt-1.5">
                <code className="text-[11px] text-neutral-400">{draft.trigger}</code>
              </div>
            </CanvasNode>

            {/* filter node */}
            <CanvasNode
              id="filter"
              layout={layout}
              selected={selected === "filter"}
              nodeRefs={nodeRefs}
              onPointerDown={onNodePointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <div className="flex items-center gap-2.5 px-3.5 pt-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Icon name="funnel" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">Filter</div>
                  <div className="text-sm font-semibold text-neutral-800">{draft.conditions.length === 0 ? "Every event" : `${draft.conditions.length} condition${draft.conditions.length > 1 ? "s" : ""}`}</div>
                </div>
              </div>
              <div className="px-3.5 pb-3 pt-1.5 text-[11px] leading-relaxed text-neutral-500">
                {draft.conditions.length === 0 ? (
                  <span className="text-neutral-400">No conditions — runs every time.</span>
                ) : (
                  draft.conditions.map((c, i) => (
                    <div key={i} className="truncate">
                      <code className="text-neutral-600">{c.field}</code> {OPS.find((o) => o.value === c.op)?.label ?? c.op} {c.value !== undefined && <code className="text-neutral-600">{String(c.value)}</code>}
                    </div>
                  ))
                )}
              </div>
            </CanvasNode>

            {/* action nodes */}
            {draft.actions.map((a, i) => {
              const meta = actionMeta(a.type);
              const id = `action-${i}` as const;
              return (
                <CanvasNode key={id} id={id} layout={layout} selected={selected === id} nodeRefs={nodeRefs} onPointerDown={onNodePointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} accent={meta.accent}>
                  <div className="flex items-center gap-2.5 px-3.5 pt-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.chip}`}>
                      <Icon name={meta.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Step {i + 1}</div>
                      <div className="truncate text-sm font-semibold text-neutral-800">{meta.label}</div>
                    </div>
                  </div>
                  <div className="truncate px-3.5 pb-3 pt-1.5 text-[11px] text-neutral-500">{meta.summary(a.params)}</div>
                </CanvasNode>
              );
            })}

            {/* terminal add button */}
            {(() => {
              const last = nodeIds[nodeIds.length - 1];
              const a = anchor(last, "bottom");
              return (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => insertAction(draft.actions.length)}
                  className="absolute z-10 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-neutral-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:border-indigo-400 hover:text-indigo-600"
                  style={{ left: a.x, top: a.y + 28 }}
                >
                  <Icon name="plus" className="h-3 w-3" /> Add step
                </button>
              );
            })()}
          </div>

          {/* zoom controls */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setView((v) => ({ ...v, scale: Math.max(0.35, v.scale * 0.9) }))} className="h-7 w-7 cursor-pointer rounded-lg text-neutral-500 hover:bg-neutral-100">−</button>
            <span className="w-10 text-center text-xs tabular-nums text-neutral-500">{Math.round(view.scale * 100)}%</span>
            <button type="button" onClick={() => setView((v) => ({ ...v, scale: Math.min(1.6, v.scale * 1.1) }))} className="h-7 w-7 cursor-pointer rounded-lg text-neutral-500 hover:bg-neutral-100">+</button>
            <button type="button" onClick={fit} className="h-7 cursor-pointer rounded-lg px-2 text-xs text-neutral-500 hover:bg-neutral-100">Fit</button>
            <button type="button" onClick={() => { setOffsets({}); fit(); }} className="h-7 cursor-pointer rounded-lg px-2 text-xs text-neutral-500 hover:bg-neutral-100" title="Reset node positions">Tidy up</button>
          </div>
          <p className="pointer-events-none absolute bottom-4 right-4 z-20 hidden text-[11px] text-neutral-400 lg:block">drag canvas to pan · ctrl+scroll to zoom · click a node to configure</p>
        </div>

        {/* ---------- config panel ---------- */}
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white">
          {selected === null && (
            <PanelSection title="Automation settings" subtitle="Select a node on the canvas to configure it.">
              <Field label="Name">
                <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className={panelInput} />
              </Field>
              <Field label="Description">
                <textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} rows={3} className={panelInput} placeholder="What is this automation for?" />
              </Field>
              <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-500">
                <span className="font-medium text-neutral-600">How it runs:</span> when <code>{draft.trigger}</code> fires, the filter is evaluated; if it passes, the {draft.actions.length || "…"} step{draft.actions.length === 1 ? "" : "s"} run in order. Every run is logged step by step.
              </div>
            </PanelSection>
          )}

          {selected === "trigger" && (
            <PanelSection title="Trigger" subtitle="The event that starts this automation." icon={<span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-600"><Icon name="bolt" className="h-3.5 w-3.5" /></span>}>
              <Field label="Event">
                <select value={draft.trigger} onChange={(e) => setDraft((d) => ({ ...d, trigger: e.target.value }))} className={panelInput}>
                  {TRIGGER_GROUPS.map((g) => (
                    <optgroup key={g} label={g}>
                      {TRIGGERS.filter((t) => t.group === g).map((t) => (
                        <option key={t.event} value={t.event}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <div className="mt-3 rounded-lg bg-amber-50/60 p-3 text-[11px] leading-relaxed text-amber-800">
                Payload fields you can filter on and use in templates: <code className="font-medium">{trigMeta.payloadHint || "varies by event"}</code>. Reference them in action text as <code className="font-medium">{"{name}"}</code>, <code className="font-medium">{"{number}"}</code>, etc.
              </div>
            </PanelSection>
          )}

          {selected === "filter" && (
            <PanelSection title="Filter" subtitle="All conditions must match (AND). No conditions = always run." icon={<span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-100 text-violet-600"><Icon name="funnel" className="h-3.5 w-3.5" /></span>}>
              {draft.conditions.map((c, i) => (
                <div key={i} className="mb-2 rounded-lg border border-neutral-200 p-2">
                  <div className="flex gap-1.5">
                    <input
                      value={c.field}
                      onChange={(e) => setDraft((d) => ({ ...d, conditions: d.conditions.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)) }))}
                      placeholder="field e.g. source"
                      className={panelInput}
                    />
                    <button type="button" onClick={() => setDraft((d) => ({ ...d, conditions: d.conditions.filter((_, j) => j !== i) }))} className="shrink-0 cursor-pointer rounded-lg px-2 text-neutral-300 transition hover:bg-red-50 hover:text-red-500" title="Remove condition">✕</button>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <select
                      value={c.op}
                      onChange={(e) => {
                        const op = e.target.value as AutomationCondition["op"];
                        setDraft((d) => ({ ...d, conditions: d.conditions.map((x, j) => (j === i ? { ...x, op, ...(op === "is_set" || op === "not_set" ? { value: undefined } : {}) } : x)) }));
                      }}
                      className={panelInput}
                    >
                      {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {OPS.find((o) => o.value === c.op)?.needsValue && (
                      <input
                        value={c.value !== undefined ? String(c.value) : ""}
                        onChange={(e) => setDraft((d) => ({ ...d, conditions: d.conditions.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) }))}
                        placeholder="value"
                        className={panelInput}
                      />
                    )}
                  </div>
                </div>
              ))}
              {draft.conditions.length < 6 && (
                <button type="button" onClick={() => setDraft((d) => ({ ...d, conditions: [...d.conditions, { field: "", op: "eq", value: "" }] }))} className="mt-1 w-full cursor-pointer rounded-lg border border-dashed border-neutral-300 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-violet-300 hover:text-violet-600">
                  + Add condition
                </button>
              )}
            </PanelSection>
          )}

          {selected?.startsWith("action-") && (() => {
            const i = Number(selected.split("-")[1]);
            const a = draft.actions[i];
            if (!a) return null;
            const meta = actionMeta(a.type);
            return (
              <PanelSection
                title={`Step ${i + 1} — ${meta.label}`}
                subtitle={meta.hint}
                icon={<span className={`flex h-7 w-7 items-center justify-center rounded-md ${meta.chip}`}><Icon name={meta.icon} className="h-3.5 w-3.5" /></span>}
              >
                <Field label="Action type">
                  <select
                    value={a.type}
                    onChange={(e) => {
                      const m = actionMeta(e.target.value);
                      const params: Record<string, string | number> = {};
                      for (const p of m.params) params[p.key] = a.params[p.key] ?? (p.kind === "select" ? (p.options?.[1] ?? "") : "");
                      setAction(i, { type: m.type, params });
                    }}
                    className={panelInput}
                  >
                    {ACTIONS.map((x) => <option key={x.type} value={x.type}>{x.label}</option>)}
                  </select>
                </Field>
                {meta.params.map((p) => (
                  <Field key={p.key} label={p.label}>
                    {p.kind === "select" ? (
                      <select value={String(a.params[p.key] ?? "")} onChange={(e) => setAction(i, { ...a, params: { ...a.params, [p.key]: e.target.value } })} className={panelInput}>
                        {p.options?.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={p.kind === "number" ? "number" : "text"}
                        value={String(a.params[p.key] ?? "")}
                        onChange={(e) => setAction(i, { ...a, params: { ...a.params, [p.key]: p.kind === "number" ? Number(e.target.value) : e.target.value } })}
                        placeholder={p.placeholder}
                        className={panelInput}
                      />
                    )}
                  </Field>
                ))}
                <div className="mt-4 flex items-center gap-1.5 border-t border-neutral-100 pt-3">
                  <button type="button" onClick={() => moveAction(i, -1)} disabled={i === 0} className="cursor-pointer rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-default disabled:opacity-40">↑ Move up</button>
                  <button type="button" onClick={() => moveAction(i, 1)} disabled={i === draft.actions.length - 1} className="cursor-pointer rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-default disabled:opacity-40">↓ Move down</button>
                  <button type="button" onClick={() => removeAction(i)} className="ml-auto cursor-pointer rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50">Delete step</button>
                </div>
              </PanelSection>
            );
          })()}
        </aside>
      </div>
    </div>
  );
}

function CanvasNode({
  id,
  layout,
  selected,
  accent,
  nodeRefs,
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  id: NodeId;
  layout: Record<string, { x: number; y: number }>;
  selected: boolean;
  accent?: string;
  nodeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  children: React.ReactNode;
  onPointerDown: (e: React.PointerEvent, id: NodeId) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent, id: NodeId) => void;
}) {
  const p = layout[id] ?? { x: -NODE_W / 2, y: 0 };
  return (
    <div
      ref={(el) => { nodeRefs.current[id] = el; }}
      onPointerDown={(e) => onPointerDown(e, id)}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => onPointerUp(e, id)}
      className={`absolute cursor-grab select-none rounded-xl border bg-white shadow-sm transition-shadow active:cursor-grabbing ${accent ? `border-l-[3px] ${accent}` : ""} ${
        selected ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]" : "border-neutral-200 hover:shadow-md"
      }`}
      style={{ left: p.x, top: p.y, width: NODE_W }}
    >
      {children}
    </div>
  );
}

function PanelSection({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-start gap-2.5">
        {icon}
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] leading-snug text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2.5 block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

const panelInput =
  "w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
