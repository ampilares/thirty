import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { runSweep } from "@/lib/bootstrap";
import { getDb } from "@/lib/db/client";
import { approvals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Thirty — AI-native business OS",
  description: "One system from first lead to final payment and ongoing support.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Lazy "cron": overdue sweep, health refresh, daily agent runs (max 1/min).
  await runSweep();
  const pending = getDb().select().from(approvals).where(eq(approvals.status, "pending")).all().length;

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar approvalsPending={pending} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-neutral-200/80 bg-white px-6 py-2.5">
              <form action="/ask" method="get" className="relative w-full max-w-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400">
                  <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4" />
                </svg>
                <input
                  name="q"
                  placeholder="Ask your business anything…  e.g. “Which invoices are overdue?”"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-1.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </form>
              <nav className="ml-4 flex shrink-0 items-center gap-2 text-sm">
                <Link href="/sales/new" className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[13px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900">+ Deal</Link>
                <Link href="/support/new" className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[13px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900">+ Ticket</Link>
                <Link href="/agents/approvals" className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[13px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900">
                  Approvals{pending > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">{pending}</span>}
                </Link>
              </nav>
            </header>
            <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
