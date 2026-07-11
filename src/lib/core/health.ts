import { eq } from "drizzle-orm";
import { getDb, now, today } from "../db/client";
import { companies, invoices, tickets, projects, tasks } from "../db/schema";
import { SYSTEM } from "../actor";
import { writeAudit } from "../audit";
import { emitEvent } from "../events";

export type Health = "good" | "watch" | "at_risk";

/**
 * Customer health (§3.3): at_risk when money or support is on fire,
 * watch when delivery/support needs attention, otherwise good.
 */
export function computeCompanyHealth(companyId: number): { health: Health; reasons: string[] } {
  const db = getDb();
  const t = today();
  const reasons: string[] = [];

  const companyInvoices = db.select().from(invoices).where(eq(invoices.companyId, companyId)).all();
  const overdueInvoices = companyInvoices.filter((i) => i.status === "overdue");
  if (overdueInvoices.length > 0) reasons.push(`${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""}`);

  const companyTickets = db.select().from(tickets).where(eq(tickets.companyId, companyId)).all();
  const escalated = companyTickets.filter((tk) => tk.escalated === 1 && (tk.status === "open" || tk.status === "pending"));
  if (escalated.length > 0) reasons.push(`${escalated.length} escalated open ticket${escalated.length > 1 ? "s" : ""}`);

  const urgentOpen = companyTickets.filter((tk) => (tk.priority === "urgent" || tk.priority === "high") && (tk.status === "open" || tk.status === "pending"));
  if (urgentOpen.length > 0 && escalated.length === 0) reasons.push(`${urgentOpen.length} high-priority open ticket${urgentOpen.length > 1 ? "s" : ""}`);

  const companyProjects = db.select().from(projects).where(eq(projects.companyId, companyId)).all();
  let overdueWork = 0;
  for (const p of companyProjects) {
    const projTasks = db.select().from(tasks).where(eq(tasks.projectId, p.id)).all();
    overdueWork += projTasks.filter((tk) => tk.status === "open" && tk.dueDate && tk.dueDate < t).length;
    if (p.status === "on_hold") reasons.push(`project "${p.name}" on hold`);
  }
  if (overdueWork > 0) reasons.push(`${overdueWork} overdue task${overdueWork > 1 ? "s" : ""} on their projects`);

  let health: Health = "good";
  if (overdueInvoices.length > 0 || escalated.length > 0) health = "at_risk";
  else if (reasons.length > 0) health = "watch";
  return { health, reasons };
}

/** Recomputes and persists health; emits an event when it changes. */
export async function refreshCompanyHealth(companyId: number): Promise<Health> {
  const db = getDb();
  const company = db.select().from(companies).where(eq(companies.id, companyId)).get();
  if (!company) return "good";
  const { health, reasons } = computeCompanyHealth(companyId);
  if (health !== company.health) {
    db.update(companies).set({ health, updatedAt: now() }).where(eq(companies.id, companyId)).run();
    writeAudit({
      actor: SYSTEM,
      action: "update",
      entityType: "company",
      entityId: companyId,
      entityLabel: company.name,
      before: { health: company.health },
      after: { health, reasons },
    });
    await emitEvent("company.health_changed", "company", companyId, { name: company.name, from: company.health, to: health, reasons }, SYSTEM);
  }
  return health;
}

export async function refreshAllHealth(): Promise<void> {
  const db = getDb();
  for (const c of db.select({ id: companies.id }).from(companies).all()) {
    await refreshCompanyHealth(c.id);
  }
}
