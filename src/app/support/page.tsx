import Link from "next/link";
import { getDb, now } from "@/lib/db/client";
import { tickets, companies } from "@/lib/db/schema";
import { PageHeader, Badge, Table, Th, Td, btnPrimary, fmtDateTime } from "@/components/ui";

export default async function SupportPage() {
  const db = getDb();
  const nowIso = now();
  const ticketRows = db.select().from(tickets).all().slice().sort((a, b) => {
    const rank = (t: typeof a) => (t.status === "open" ? 0 : t.status === "pending" ? 1 : 2);
    return rank(a) - rank(b) || (a.createdAt < b.createdAt ? 1 : -1);
  });
  const companyRows = db.select().from(companies).all();

  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Tickets are triaged by the Support agent — priority, category, SLA, and a drafted reply"
        actions={<Link href="/support/new" className={btnPrimary}>+ New ticket</Link>}
      />
      <Table head={<><Th>Subject</Th><Th>Customer</Th><Th>Priority</Th><Th>Category</Th><Th>Status</Th><Th>SLA due</Th><Th>Opened</Th></>}>
        {ticketRows.map((t) => {
          const company = companyRows.find((c) => c.id === t.companyId);
          const breached = t.slaDueAt && t.slaDueAt < nowIso && (t.status === "open" || t.status === "pending");
          return (
            <tr key={t.id} className="hover:bg-neutral-50">
              <Td>
                <Link href={`/support/${t.id}`} className="font-medium hover:underline">
                  {t.escalated === 1 && <span className="mr-1 text-red-500">⚠</span>}{t.subject}
                </Link>
              </Td>
              <Td>{company?.name ?? "—"}</Td>
              <Td><Badge value={t.priority} /></Td>
              <Td>{t.category ?? "—"}</Td>
              <Td><Badge value={t.status} /></Td>
              <Td className={breached ? "font-medium text-red-600" : ""}>{fmtDateTime(t.slaDueAt)}{breached ? " ⚠" : ""}</Td>
              <Td><span className="text-neutral-500">{fmtDateTime(t.createdAt)}</span></Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
