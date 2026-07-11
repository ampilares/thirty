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
            <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-2.5">
              <form action="/ask" method="get" className="w-full max-w-lg">
                <input
                  name="q"
                  placeholder="Ask your business anything…  e.g. “Which invoices are overdue?”"
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm outline-none transition focus:border-neutral-400 focus:bg-white"
                />
              </form>
              <nav className="ml-4 flex shrink-0 items-center gap-3 text-sm text-neutral-500">
                <Link href="/sales/new" className="hover:text-neutral-900">+ Deal</Link>
                <Link href="/support/new" className="hover:text-neutral-900">+ Ticket</Link>
                <Link href="/agents/approvals" className="hover:text-neutral-900">
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
