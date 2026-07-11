import Link from "next/link";
import { getDb, today } from "@/lib/db/client";
import { projects, companies, milestones, tasks } from "@/lib/db/schema";
import { formatMoney } from "@/lib/core/money";
import { projectProgress } from "@/lib/core/delivery";
import { PageHeader, Badge, Table, Th, Td, fmtDate } from "@/components/ui";

export default async function DeliveryPage() {
  const db = getDb();
  const t = today();
  const projectRows = db.select().from(projects).all();
  const companyRows = db.select().from(companies).all();
  const milestoneRows = db.select().from(milestones).all();
  const taskRows = db.select().from(tasks).all();

  return (
    <>
      <PageHeader title="Delivery" subtitle="Projects created from won deals — scope and value carry over automatically" />
      <Table head={<><Th>Project</Th><Th>Customer</Th><Th>Status</Th><Th>Progress</Th><Th>Milestones</Th><Th>Due</Th><Th>Value</Th></>}>
        {projectRows.map((p) => {
          const company = companyRows.find((c) => c.id === p.companyId);
          const progress = projectProgress(p.id);
          const ms = milestoneRows.filter((m) => m.projectId === p.id);
          const lateMs = ms.filter((m) => m.status === "pending" && m.dueDate && m.dueDate < t).length;
          const lateTasks = taskRows.filter((x) => x.projectId === p.id && x.status === "open" && x.dueDate && x.dueDate < t).length;
          return (
            <tr key={p.id} className="hover:bg-neutral-50">
              <Td><Link href={`/delivery/${p.id}`} className="font-medium hover:underline">{p.name}</Link></Td>
              <Td>{company ? <Link href={`/customers/companies/${company.id}`} className="hover:underline">{company.name}</Link> : "—"}</Td>
              <Td><Badge value={p.status} /></Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full rounded-full bg-neutral-800" style={{ width: `${progress.pct}%` }} />
                  </div>
                  <span className="text-xs text-neutral-500">{progress.done}/{progress.total}</span>
                </div>
              </Td>
              <Td>
                {ms.filter((m) => m.status === "done").length}/{ms.length}
                {(lateMs > 0 || lateTasks > 0) && <span className="ml-2 text-xs text-red-600">⚠ {lateMs + lateTasks} late</span>}
              </Td>
              <Td>{fmtDate(p.dueDate)}</Td>
              <Td><span className="tabular-nums">{formatMoney(p.valueCents)}</span></Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
