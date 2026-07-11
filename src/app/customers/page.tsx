import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { companies, people, deals, tickets } from "@/lib/db/schema";
import { PageHeader, Badge, Table, Th, Td, btnPrimary, btnSecondary } from "@/components/ui";
import { personName } from "@/lib/core/customers";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = tab === "people" ? "people" : "companies";
  const db = getDb();
  const companyRows = db.select().from(companies).all();
  const peopleRows = db.select().from(people).all();
  const dealRows = db.select().from(deals).all();
  const ticketRows = db.select().from(tickets).all();

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="One canonical record per relationship — sales, delivery, money, and support in one context"
        actions={
          <>
            <Link href="/customers/new-person" className={btnSecondary}>+ Person</Link>
            <Link href="/customers/new-company" className={btnPrimary}>+ Company</Link>
          </>
        }
      />
      <div className="mb-4 flex gap-1 rounded-lg bg-neutral-100 p-1 text-sm w-fit">
        <Link href="/customers" className={`rounded-md px-3 py-1 ${active === "companies" ? "bg-white font-medium shadow-sm" : "text-neutral-500"}`}>
          Companies ({companyRows.length})
        </Link>
        <Link href="/customers?tab=people" className={`rounded-md px-3 py-1 ${active === "people" ? "bg-white font-medium shadow-sm" : "text-neutral-500"}`}>
          People ({peopleRows.length})
        </Link>
      </div>

      {active === "companies" ? (
        <Table head={<><Th>Company</Th><Th>Industry</Th><Th>Health</Th><Th>Open deals</Th><Th>Open tickets</Th><Th>Tags</Th></>}>
          {companyRows.map((c) => (
            <tr key={c.id} className="hover:bg-neutral-50">
              <Td><Link href={`/customers/companies/${c.id}`} className="font-medium hover:underline">{c.name}</Link></Td>
              <Td>{c.industry ?? "—"}</Td>
              <Td><Badge value={c.health} /></Td>
              <Td>{dealRows.filter((d) => d.companyId === c.id).length}</Td>
              <Td>{ticketRows.filter((t) => t.companyId === c.id && (t.status === "open" || t.status === "pending")).length}</Td>
              <Td><span className="text-xs text-neutral-500">{(c.tags ?? []).join(", ") || "—"}</span></Td>
            </tr>
          ))}
        </Table>
      ) : (
        <Table head={<><Th>Name</Th><Th>Title</Th><Th>Company</Th><Th>Email</Th></>}>
          {peopleRows.map((p) => {
            const company = companyRows.find((c) => c.id === p.companyId);
            return (
              <tr key={p.id} className="hover:bg-neutral-50">
                <Td><Link href={`/customers/people/${p.id}`} className="font-medium hover:underline">{personName(p)}</Link></Td>
                <Td>{p.title ?? "—"}</Td>
                <Td>{company ? <Link href={`/customers/companies/${company.id}`} className="hover:underline">{company.name}</Link> : "—"}</Td>
                <Td><span className="text-neutral-500">{p.email ?? "—"}</span></Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
