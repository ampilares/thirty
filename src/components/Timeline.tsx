import Link from "next/link";
import type { TimelineItem } from "@/lib/core/timeline";
import { fmtDateTime } from "@/components/ui";

const kindIcon: Record<TimelineItem["kind"], string> = {
  note: "✎",
  deal: "◈",
  stage: "→",
  quote: "❏",
  invoice: "◍",
  payment: "✓",
  ticket: "◖",
  project: "▣",
  agent: "✦",
};

const kindColor: Record<TimelineItem["kind"], string> = {
  note: "bg-neutral-200 text-neutral-600",
  deal: "bg-sky-100 text-sky-700",
  stage: "bg-violet-100 text-violet-700",
  quote: "bg-teal-100 text-teal-700",
  invoice: "bg-amber-100 text-amber-700",
  payment: "bg-emerald-100 text-emerald-700",
  ticket: "bg-red-100 text-red-700",
  project: "bg-indigo-100 text-indigo-700",
  agent: "bg-fuchsia-100 text-fuchsia-700",
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-neutral-400">No activity yet.</p>;
  return (
    <ol className="space-y-0">
      {items.map((item, i) => (
        <li key={i} className="timeline-line flex gap-3 pb-4">
          <span className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${kindColor[item.kind]}`}>{kindIcon[item.kind]}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              {item.href ? (
                <Link href={item.href} className="text-sm font-medium hover:underline">{item.title}</Link>
              ) : (
                <span className="text-sm font-medium">{item.title}</span>
              )}
              <time className="text-xs text-neutral-400">{fmtDateTime(item.at)}</time>
            </div>
            {item.detail && <p className="mt-0.5 whitespace-pre-wrap text-xs text-neutral-500">{item.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
