"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primary = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/conversations", label: "Conversations", icon: "◯" },
  { href: "/customers", label: "Contacts", icon: "▣" },
  { href: "/sales", label: "Opportunities", icon: "✣" },
  { href: "/money", label: "Payments", icon: "▤" },
];

const operations = [
  { href: "/delivery", label: "Delivery", icon: "◇" },
  { href: "/support", label: "Support", icon: "◔" },
  { href: "/automations", label: "Automations", icon: "◉" },
  { href: "/agents", label: "AI Agents", icon: "✦" },
  { href: "/analytics", label: "Analytics", icon: "▥" },
  { href: "/audit", label: "Audit", icon: "≡" },
];

function NavItem({ item, active, approvalsPending }: {
  item: { href: string; label: string; icon: string };
  active: boolean;
  approvalsPending: number;
}) {
  return (
    <Link href={item.href} className={`ghl-nav-item ${active ? "is-active" : ""}`}>
      <span className="ghl-nav-icon">{item.icon}</span>
      <span>{item.label}</span>
      {item.label === "AI Agents" && approvalsPending > 0 && (
        <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-slate-900">{approvalsPending}</span>
      )}
    </Link>
  );
}

export function Sidebar({ approvalsPending }: { approvalsPending: number }) {
  const pathname = usePathname();
  const activeFor = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <aside className="ghl-sidebar">
      <div className="ghl-brand">
        <div className="ghl-logo">30</div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white">Thirty</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Business OS</div>
        </div>
      </div>

      <button className="ghl-workspace-switcher" type="button">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-600 text-xs font-semibold">CD</span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-xs font-semibold text-white">Coastal Digital</span>
          <span className="block truncate text-[10px] text-slate-400">Melbourne, Australia</span>
        </span>
        <span className="text-slate-400">⌄</span>
      </button>

      <Link href="/ask" className="ghl-sidebar-search">
        <span>⌕</span><span className="flex-1">Search</span><kbd>⌘K</kbd>
      </Link>

      <nav className="ghl-nav-scroll">
        {primary.map((item) => <NavItem key={item.href} item={item} active={activeFor(item.href)} approvalsPending={approvalsPending} />)}
        <div className="ghl-nav-rule" />
        {operations.map((item) => <NavItem key={item.href} item={item} active={activeFor(item.href)} approvalsPending={approvalsPending} />)}
      </nav>

      <div className="border-t border-slate-600/50 p-2">
        <NavItem item={{ href: "/settings", label: "Settings", icon: "⚙" }} active={activeFor("/settings")} approvalsPending={approvalsPending} />
      </div>
    </aside>
  );
}
