import Link from "next/link";
import type { ReactNode } from "react";

export type ModuleTab = { label: string; href: string; active?: boolean; badge?: string };

export function ModuleHeader({ title, tabs, actions }: { title: string; tabs: ModuleTab[]; actions?: ReactNode }) {
  return (
    <header className="module-header">
      <div className="module-title-row">
        <h1 className="module-title">{title}</h1>
        {actions && <div className="flex items-center gap-2 pb-2">{actions}</div>}
      </div>
      <nav className="module-tabs" aria-label={`${title} sections`}>
        {tabs.map((tab) => (
          <Link key={`${tab.href}-${tab.label}`} href={tab.href} className={`module-tab ${tab.active ? "is-active" : ""}`}>
            {tab.label}{tab.badge && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{tab.badge}</span>}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function ToolbarSearch({ name = "q", defaultValue, placeholder }: { name?: string; defaultValue?: string; placeholder: string }) {
  return <label className="toolbar-search"><span className="text-slate-400">⌕</span><input name={name} defaultValue={defaultValue} placeholder={placeholder} /></label>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-neutral-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
          {title && <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const badgeStyles: Record<string, string> = {
  // health
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  watch: "bg-amber-50 text-amber-700 border-amber-200",
  at_risk: "bg-red-50 text-red-700 border-red-200",
  // priority
  low: "bg-neutral-100 text-neutral-600 border-neutral-200",
  normal: "bg-sky-50 text-sky-700 border-sky-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
  // statuses
  open: "bg-sky-50 text-sky-700 border-sky-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-neutral-100 text-neutral-600 border-neutral-200",
  draft: "bg-neutral-100 text-neutral-600 border-neutral-200",
  sent: "bg-sky-50 text-sky-700 border-sky-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  void: "bg-neutral-100 text-neutral-500 border-neutral-200 line-through",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  planning: "bg-violet-50 text-violet-700 border-violet-200",
  active: "bg-sky-50 text-sky-700 border-sky-200",
  on_hold: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  missed: "bg-red-50 text-red-700 border-red-200",
  // runs & approvals
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  simulated: "bg-violet-50 text-violet-700 border-violet-200",
  skipped: "bg-neutral-100 text-neutral-600 border-neutral-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  awaiting_approval: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  // actors
  user: "bg-sky-50 text-sky-700 border-sky-200",
  agent: "bg-violet-50 text-violet-700 border-violet-200",
  automation: "bg-teal-50 text-teal-700 border-teal-200",
  api: "bg-orange-50 text-orange-700 border-orange-200",
  system: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  const style = badgeStyles[value] ?? "bg-neutral-100 text-neutral-600 border-neutral-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style}`}>
      {(label ?? value).replace(/_/g, " ")}
    </span>
  );
}

export function Stat({ label, value, sub, href, tone }: { label: string; value: string; sub?: string; href?: string; tone?: "danger" | "warn" | "ok" }) {
  const toneClass = tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-neutral-900";
  const body = (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-neutral-400">{text}</p>;
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm ${className}`}>{children}</td>;
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] border-collapse">
        <thead className="border-b border-neutral-200 bg-neutral-50/60">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400";
export const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-700 cursor-pointer";
export const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 cursor-pointer";
export const btnDanger =
  "inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 cursor-pointer";

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 16).replace("T", " ");
}
