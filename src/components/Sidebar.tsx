"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, string> = {
  home: "M4 11 12 4l8 7v9h-5v-6h-6v6H4v-9Z",
  customers: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 19c0-2.8 2.2-5 5-5s5 2.2 5 5m1-1c.4-1.9 1.9-3 3-3 1.7 0 3.2 1.3 3.5 3",
  sales: "M4 19V5m0 14h16M8 15l3-4 3 2 4-6",
  delivery: "M5 5h9v11H5V5Zm9 4h4l2 3v4h-6M7 19a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 7 19Zm10 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
  money: "M4 7h16v10H4V7Zm8 7.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z",
  support: "M12 4a7 7 0 0 0-7 7v4a2 2 0 0 0 2 2h1v-5H6m13 5h-1v-5h2m-1 5a7 7 0 0 1-7 3",
  automations: "M13 3 5 13h5l-1 8 8-10h-5l1-8Z",
  agents: "M12 3v3m0 0a6 6 0 0 1 6 6v5H6v-5a6 6 0 0 1 6-6Zm-9 9h1m17 0h1M9.5 13.5h0m5 0h0",
  ask: "M9 9a3 3 0 1 1 4.6 2.5c-.9.6-1.6 1.1-1.6 2.1M12 17h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  analytics: "M5 20V10m7 10V4m7 16v-7",
  audit: "M6 4h9l4 4v12H6V4Zm4 8h5m-5 3h5m-5-6h2",
  settings: "M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm7.5 2.5-1.8-.5.4-1.8-1.6-1.6-1.8.4-.5-1.8h-2.4l-.5 1.8-1.8-.4-1.6 1.6.4 1.8-1.8.5v2.4l1.8.5-.4 1.8 1.6 1.6 1.8-.4.5 1.8h2.4l.5-1.8 1.8.4 1.6-1.6-.4-1.8 1.8-.5v-2.4Z",
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
      <path d={ICONS[name]} />
    </svg>
  );
}

const groups: { label?: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    items: [{ href: "/", label: "Home", icon: "home" }],
  },
  {
    label: "Work",
    items: [
      { href: "/customers", label: "Customers", icon: "customers" },
      { href: "/sales", label: "Sales", icon: "sales" },
      { href: "/delivery", label: "Delivery", icon: "delivery" },
      { href: "/money", label: "Money", icon: "money" },
      { href: "/support", label: "Support", icon: "support" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/automations", label: "Automations", icon: "automations" },
      { href: "/agents", label: "Agents", icon: "agents" },
      { href: "/ask", label: "Ask", icon: "ask" },
      { href: "/analytics", label: "Analytics", icon: "analytics" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/audit", label: "Audit", icon: "audit" },
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

export function Sidebar({ approvalsPending }: { approvalsPending: number }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-neutral-200/80 bg-white">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-sm">30</div>
        <div>
          <div className="text-sm font-semibold leading-tight tracking-tight">Thirty</div>
          <div className="text-[11px] leading-tight text-neutral-400">Coastal Digital</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {g.label && <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{g.label}</div>}
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] transition ${
                      active ? "bg-indigo-50 font-medium text-indigo-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={active ? "text-indigo-600" : "text-neutral-400"}>
                        <NavIcon name={item.icon} />
                      </span>
                      {item.label}
                    </span>
                    {item.label === "Agents" && approvalsPending > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-700">{approvalsPending}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">AR</div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-neutral-700">Alex Reeve</div>
            <div className="text-[11px] text-neutral-400">Owner</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
