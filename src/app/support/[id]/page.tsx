import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { getDb, now } from "@/lib/db/client";
import { tickets, ticketMessages, companies, people, approvals, agentRuns, invoices } from "@/lib/db/schema";
import { personName } from "@/lib/core/customers";
import { PageHeader, Card, Badge, fmtDateTime, inputClass, btnPrimary, btnSecondary, EmptyState } from "@/components/ui";
import { addTicketMessageAction, updateTicketAction, decideApprovalAction } from "@/app/actions";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const ticket = db.select().from(tickets).where(eq(tickets.id, Number(id))).get();
  if (!ticket) notFound();
  const messages = db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticket.id)).all();
  const company = ticket.companyId ? db.select().from(companies).where(eq(companies.id, ticket.companyId)).get() : null;
  const person = ticket.personId ? db.select().from(people).where(eq(people.id, ticket.personId)).get() : null;
  const overdueInvoices = company ? db.select().from(invoices).where(eq(invoices.companyId, company.id)).all().filter((i) => i.status === "overdue") : [];
  const pendingReply = db.select().from(approvals).all().find((a) => a.status === "pending" && a.actionType === "send_reply" && (a.payload as { ticketId?: number })?.ticketId === ticket.id);
  const triageRun = db.select().from(agentRuns).where(eq(agentRuns.agentKey, "support")).orderBy(desc(agentRuns.id)).all().find((r) => (r.evidence ?? []).some((e) => e.entityType === "ticket" && e.entityId === ticket.id));
  const breached = ticket.slaDueAt && ticket.slaDueAt < now() && (ticket.status === "open" || ticket.status === "pending");

  return (
    <>
      <PageHeader
        title={ticket.subject}
        subtitle={`${company?.name ?? "Unknown customer"}${person ? ` · ${personName(person)}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            {ticket.escalated === 1 && <Badge value="urgent" label="escalated" />}
            <Badge value={ticket.priority} />
            <Badge value={ticket.status} />
          </div>
        }
      />
      {breached && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          ⚠ SLA breached — response was due {fmtDateTime(ticket.slaDueAt)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {ticket.triageSummary && (
            <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-2.5 text-sm text-violet-800">
              ✦ {ticket.triageSummary}
              {triageRun && <Link href={`/agents/runs/${triageRun.id}`} className="ml-2 text-xs underline">view run</Link>}
            </div>
          )}

          {pendingReply && (
            <Card title="✦ Suggested reply — awaiting your approval">
              <p className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-sm">{String((pendingReply.payload as { draft?: string })?.draft ?? "")}</p>
              <div className="mt-3 flex gap-2">
                <form action={decideApprovalAction}>
                  <input type="hidden" name="approvalId" value={pendingReply.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <button className={btnPrimary}>Approve & post reply</button>
                </form>
                <form action={decideApprovalAction}>
                  <input type="hidden" name="approvalId" value={pendingReply.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <button className={btnSecondary}>Reject draft</button>
                </form>
              </div>
            </Card>
          )}

          <Card title="Conversation">
            {messages.length === 0 ? <EmptyState text="No messages." /> : (
              <ul className="space-y-3">
                {messages.map((msg) => (
                  <li key={msg.id} className={`rounded-lg p-3 text-sm ${msg.internal ? "border border-dashed border-amber-200 bg-amber-50/60" : msg.authorType === "customer" ? "bg-neutral-100" : msg.authorType === "agent" ? "bg-violet-50" : "bg-sky-50"}`}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-neutral-500">
                      <span className="font-medium">{msg.authorName} {msg.internal ? "· internal note" : ""} {msg.authorType === "agent" && <Badge value="agent" />}</span>
                      <time>{fmtDateTime(msg.createdAt)}</time>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <form action={addTicketMessageAction} className="mt-4 space-y-2 border-t border-neutral-100 pt-3">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea name="body" rows={3} required placeholder="Write a reply…" className={inputClass} />
              <div className="flex items-center gap-3">
                <button className={btnPrimary}>Send reply</button>
                <label className="flex items-center gap-1.5 text-sm text-neutral-500">
                  <input type="checkbox" name="internal" value="1" className="h-4 w-4 rounded border-neutral-300" /> internal note
                </label>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Triage">
            <form action={updateTicketAction} className="space-y-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Priority</span>
                <select name="priority" defaultValue={ticket.priority} className={inputClass}>
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Status</span>
                <select name="status" defaultValue={ticket.status} className={inputClass}>
                  <option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Category</span>
                <input name="category" defaultValue={ticket.category ?? ""} className={inputClass} />
              </label>
              <button className={btnSecondary}>Update ticket</button>
            </form>
            <dl className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-500">SLA due</dt><dd className={breached ? "font-medium text-red-600" : ""}>{fmtDateTime(ticket.slaDueAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Opened</dt><dd>{fmtDateTime(ticket.createdAt)}</dd></div>
              {ticket.resolvedAt && <div className="flex justify-between"><dt className="text-neutral-500">Resolved</dt><dd>{fmtDateTime(ticket.resolvedAt)}</dd></div>}
            </dl>
          </Card>

          {company && (
            <Card title="Customer context">
              <Link href={`/customers/companies/${company.id}`} className="text-sm font-medium hover:underline">{company.name}</Link>
              <div className="mt-1"><Badge value={company.health} label={`health: ${company.health}`} /></div>
              {overdueInvoices.length > 0 && (
                <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
                  ⚠ {overdueInvoices.length} overdue invoice(s) — loop in the account manager before promising work.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
