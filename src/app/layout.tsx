import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { runSweep } from "@/lib/bootstrap";
import { getDb } from "@/lib/db/client";
import { approvals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Thirty — Customer operations",
  description: "One workspace for conversations, contacts, opportunities and automations.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await runSweep();
  const pending = getDb().select().from(approvals).where(eq(approvals.status, "pending")).all().length;

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar approvalsPending={pending} />
          <div className="flex min-w-0 flex-1 flex-col bg-[#f6f8fb]">
            <header className="ghl-global-header">
              <form action="/ask" method="get" className="w-full max-w-md">
                <label className="ghl-global-search">
                  <span className="text-slate-400">⌕</span>
                  <input name="q" placeholder="Search Thirty or ask AI..." />
                  <kbd>⌘K</kbd>
                </label>
              </form>
              <nav className="flex shrink-0 items-center gap-2">
                <Link href="/conversations" className="ghl-round-action bg-emerald-500" aria-label="Conversations">◔</Link>
                <Link href="/ask" className="ghl-ai-action">✦ Ask AI</Link>
                <Link href="/agents/approvals" className="ghl-round-action bg-orange-500" aria-label={`Approvals${pending ? ` (${pending})` : ""}`}>♟</Link>
                <Link href="/audit" className="ghl-round-action bg-blue-500" aria-label="Audit log">i</Link>
                <button className="ghl-avatar" type="button" aria-label="Open profile">AR</button>
              </nav>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
