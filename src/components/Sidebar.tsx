"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Home", icon: "◧" },
  { href: "/customers", label: "Customers", icon: "◔" },
  { href: "/sales", label: "Sales", icon: "◈" },
  { href: "/delivery", label: "Delivery", icon: "▣" },
  { href: "/money", label: "Money", icon: "◍" },
  { href: "/support", label: "Support", icon: "◖" },
  { href: "/automations", label: "Automations", icon: "⚙" },
  { href: "/agents", label: "Agents", icon: "✦" },
  { href: "/ask", label: "Ask", icon: "?" },
  { href: "/analytics", label: "Analytics", icon: "▤" },
  { href: "/audit", label: "Audit", icon: "≡" },
  { href: "/settings", label: "Settings", icon: "☼" },
];

export function Sidebar({ approvalsPending }: { approvalsPending: number }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white">30</div>
        <div>
          <div className="text-sm font-semibold leading-tight">Thirty</div>
          <div className="text-[11px] leading-tight text-neutral-500">Coastal Digital</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm transition ${
                active ? "bg-neutral-900 font-medium text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
                {item.label}
              </span>
              {item.label === "Agents" && approvalsPending > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] font-semibold ${active ? "bg-white text-neutral-900" : "bg-amber-100 text-amber-700"}`}>
                  {approvalsPending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-100 px-4 py-3 text-[11px] text-neutral-400">
        AI-native business OS
        <br />
        Alex Reeve · Owner
      </div>
    </aside>
  );
}
