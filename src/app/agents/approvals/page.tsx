import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { approvals } from "@/lib/db/schema";
import { PageHeader, Card, Badge, fmtDateTime, EmptyState, btnPrimary, btnSecondary } from "@/components/ui";
import { decideApprovalAction } from "@/app/actions";

export default async function ApprovalsPage() {
  const db = getDb();
  const rows = db.select().from(approvals).orderBy(desc(approvals.id)).all();
  const pending = rows.filter((a) => a.status === "pending");
  const decided = rows.filter((a) => a.status !== "pending").slice(0, 20);

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Agent actions above their autonomy tier wait here — approve to execute through the normal write path, with full audit"
      />
      <h2 className="mb-2 text-sm font-semibold text-neutral-700">Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <Card><EmptyState text="Nothing waiting for you." /></Card>
      ) : (
        <div className="space-y-3">
          {pending.map((a) => {
            const draft = (a.payload as { draft?: string })?.draft;
            return (
              <Card key={a.id} title={a.title} actions={<span className="text-xs text-neutral-400">requested by {a.requestedBy} · {fmtDateTime(a.createdAt)}</span>}>
                <p className="text-sm text-neutral-600">{a.description}</p>
                {draft && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-sm">{draft}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <form action={decideApprovalAction}>
                    <input type="hidden" name="approvalId" value={a.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button className={btnPrimary}>Approve & execute</button>
                  </form>
                  <form action={decideApprovalAction}>
                    <input type="hidden" name="approvalId" value={a.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className={btnSecondary}>Reject</button>
                  </form>
                  {a.agentRunId && <Link href={`/agents/runs/${a.agentRunId}`} className="ml-2 text-xs text-neutral-400 underline hover:text-neutral-600">view agent run & evidence</Link>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mt-8 mb-2 text-sm font-semibold text-neutral-700">Recently decided</h2>
      <div className="space-y-2">
        {decided.length === 0 && <Card><EmptyState text="No decisions yet." /></Card>}
        {decided.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm shadow-sm">
            <span className="min-w-0">
              <span className="font-medium">{a.title}</span>
              {a.executedResult && <span className="block truncate text-xs text-neutral-400">{a.executedResult}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-neutral-400">
              <Badge value={a.status} /> {fmtDateTime(a.decidedAt)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
