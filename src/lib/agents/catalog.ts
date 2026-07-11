/**
 * The five MVP agents (PRD §21/§52). Deterministic heuristics over live data;
 * text drafting upgrades to the LLM provider when a key is configured.
 * All writes go through core services with the agent's actor identity, and
 * anything above the agent's autonomous tier becomes a pending approval.
 */
import { eq, and, desc } from "drizzle-orm";
import { getDb, now, today, daysFromNow } from "../db/client";
import {
  deals,
  stages,
  people,
  companies,
  invoices,
  tasks,
  milestones,
  projects,
  tickets,
  ticketMessages,
  approvals,
  type AgentEvidence,
  type AgentAction,
} from "../db/schema";
import { getAgent, recordAgentRun, actorFor, budgetRemaining, consumeBudget } from "./runner";
import { generateDraft } from "../ai/gateway";
import { updateDeal, staleDeals } from "../core/sales";
import { createTask, overdueTasks, overdueMilestones } from "../core/delivery";
import { updateTicket } from "../core/support";
import { formatMoney, invoiceTotals } from "../core/money";
import { personName } from "../core/customers";
import { slaBreached } from "../core/support";

// ---------- pure classification rules (unit-tested) ----------

export function classifyLeadPriority(input: { valueCents: number; source?: string | null }): "low" | "normal" | "high" {
  const source = (input.source ?? "").toLowerCase();
  if (input.valueCents >= 1_000_000) return "high";
  if (source.includes("referral") || source.includes("existing")) return "high";
  if (input.valueCents >= 300_000) return "normal";
  if (source.includes("form") || source.includes("web")) return "normal";
  return "low";
}

export function classifyTicket(subject: string, body: string): { priority: "low" | "normal" | "high" | "urgent"; category: string } {
  const text = `${subject} ${body}`.toLowerCase();
  const urgentSignals = ["down", "outage", "not loading", "broken", "urgent", "asap", "losing", "cannot", "can't access", "error 5"];
  const bugSignals = ["bug", "error", "broken", "issue", "warning", "fail", "down", "not working", "spinner"];
  const billingSignals = ["invoice", "payment", "charge", "billing", "refund"];
  const questionSignals = ["question", "how do", "can you explain", "clarif", "wondering"];

  let category = "Change request";
  if (bugSignals.some((s) => text.includes(s))) category = "Bug";
  else if (billingSignals.some((s) => text.includes(s))) category = "Billing";
  else if (questionSignals.some((s) => text.includes(s))) category = "Question";

  let priority: "low" | "normal" | "high" | "urgent" = "normal";
  if (urgentSignals.some((s) => text.includes(s))) priority = "urgent";
  else if (category === "Bug") priority = "high";
  else if (category === "Question") priority = "low";
  return { priority, category };
}

// ---------- Owner Chief of Staff (tier 0: observe) ----------

export async function runChiefOfStaff(trigger = "manual") {
  const agent = getAgent("chief_of_staff");
  if (!agent || !agent.enabled) return null;
  const started = Date.now();
  const db = getDb();
  const t = today();
  const evidence: AgentEvidence[] = [];
  const facts: string[] = [];

  const stageRows = db.select().from(stages).all();
  const openStages = new Set(stageRows.filter((s) => s.kind === "open").map((s) => s.id));
  const allDeals = db.select().from(deals).all();
  const openDeals = allDeals.filter((d) => openStages.has(d.stageId));
  const pipelineValue = openDeals.reduce((s, d) => s + d.valueCents, 0);
  facts.push(`Pipeline: ${openDeals.length} open deals worth ${formatMoney(pipelineValue)}.`);

  const stale = staleDeals(10);
  if (stale.length) {
    facts.push(`${stale.length} deal(s) have not moved in 10+ days: ${stale.map((d) => d.name).join("; ")}.`);
    stale.forEach((d) => evidence.push({ label: `Stale deal: ${d.name}`, entityType: "deal", entityId: d.id }));
  }

  const overdueInv = db.select().from(invoices).where(eq(invoices.status, "overdue")).all();
  if (overdueInv.length) {
    const total = overdueInv.reduce((s, i) => s + invoiceTotals(i.id).balanceCents, 0);
    facts.push(`Cash risk: ${overdueInv.length} overdue invoice(s) with ${formatMoney(total)} outstanding.`);
    overdueInv.forEach((i) => evidence.push({ label: `Overdue: ${i.number}`, entityType: "invoice", entityId: i.id }));
  }

  const lateTasks = overdueTasks();
  const lateMilestones = overdueMilestones();
  if (lateTasks.length || lateMilestones.length) {
    facts.push(`Delivery: ${lateMilestones.length} milestone(s) and ${lateTasks.length} task(s) past due.`);
    lateMilestones.forEach((m) => evidence.push({ label: `Late milestone: ${m.name}`, entityType: "milestone", entityId: m.id }));
  }

  const breaches = slaBreached();
  const escalated = db.select().from(tickets).all().filter((tk) => tk.escalated === 1 && tk.status !== "resolved" && tk.status !== "closed");
  if (breaches.length || escalated.length) {
    facts.push(`Support: ${escalated.length} escalated ticket(s), ${breaches.length} past SLA.`);
    escalated.forEach((tk) => evidence.push({ label: `Escalated: ${tk.subject}`, entityType: "ticket", entityId: tk.id }));
  }

  const pendingApprovals = db.select().from(approvals).where(eq(approvals.status, "pending")).all();
  if (pendingApprovals.length) facts.push(`${pendingApprovals.length} agent action(s) are waiting for your approval.`);

  const dueTodayTasks = db.select().from(tasks).where(and(eq(tasks.status, "open"))).all().filter((x) => x.dueDate === t);
  if (dueTodayTasks.length) facts.push(`Today: ${dueTodayTasks.length} task(s) due — ${dueTodayTasks.map((x) => x.title).join("; ")}.`);

  const factsText = facts.join("\n");
  const draft = await generateDraft({ kind: "briefing", context: { factsText, date: t } });

  const run = recordAgentRun(
    agent,
    { trigger, summary: draft.text, evidence, actions: [], costCents: draft.costCents, status: "completed" },
    Date.now() - started
  );
  return run;
}

// ---------- Intake & Enrichment (tier 2: internal execute) ----------

export async function runIntake(dealId: number, trigger = "deal.created") {
  const agent = getAgent("intake");
  if (!agent || !agent.enabled) return null;
  const started = Date.now();
  const db = getDb();
  const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
  if (!deal) return null;
  const evidence: AgentEvidence[] = [{ label: `New deal: ${deal.name}`, entityType: "deal", entityId: deal.id }];
  const actions: AgentAction[] = [];
  const actor = actorFor(agent);
  let budget = budgetRemaining(agent);
  let consumed = 0;

  // Duplicate / existing-relationship check
  const related: string[] = [];
  if (deal.companyId) {
    const company = db.select().from(companies).where(eq(companies.id, deal.companyId)).get();
    if (company) {
      evidence.push({ label: `Company: ${company.name} (health: ${company.health})`, entityType: "company", entityId: company.id });
      const otherDeals = db.select().from(deals).where(eq(deals.companyId, company.id)).all().filter((d) => d.id !== deal.id);
      if (otherDeals.length) related.push(`${otherDeals.length} existing deal(s) with ${company.name}`);
    }
  }
  if (deal.personId) {
    const person = db.select().from(people).where(eq(people.id, deal.personId)).get();
    if (person) evidence.push({ label: `Contact: ${personName(person)}`, entityType: "person", entityId: person.id });
  }

  // Classify priority (internal reversible write — within tier 2)
  const priority = classifyLeadPriority({ valueCents: deal.valueCents, source: deal.source });
  if (priority !== deal.priority && budget > consumed) {
    await updateDeal(actor, deal.id, { priority });
    actions.push({ type: "update_field", description: `Set priority to "${priority}" based on value ${formatMoney(deal.valueCents)} and source "${deal.source ?? "unknown"}"`, executed: true, needsApproval: false });
    consumed++;
  }

  // Route: ensure a same-day response task exists
  const existingTask = db.select().from(tasks).where(eq(tasks.dealId, deal.id)).all().find((x) => x.status === "open" && x.title.toLowerCase().includes("respond"));
  if (!existingTask && budget > consumed) {
    const task = await createTask(actor, { title: `Respond to new lead: ${deal.name}`, dealId: deal.id, dueDate: today(), priority: "high", assigneeId: 1 });
    actions.push({ type: "create_task", description: `Created same-day response task #${task.id}`, executed: true, needsApproval: false });
    consumed++;
  }

  const summary =
    `Classified new lead "${deal.name}" as ${priority} priority` +
    (related.length ? ` — existing relationship found (${related.join(", ")})` : " — no duplicate records found") +
    ". Routed for same-day response.";
  if (consumed) consumeBudget(agent.id, consumed);
  return recordAgentRun(agent, { trigger, summary, evidence, actions, costCents: 0 }, Date.now() - started);
}

// ---------- Sales Agent (tier 1: drafts need approval) ----------

export async function runSalesAgent(trigger = "manual") {
  const agent = getAgent("sales");
  if (!agent || !agent.enabled) return null;
  const started = Date.now();
  const db = getDb();
  const stale = staleDeals(10).slice(0, 3);
  const evidence: AgentEvidence[] = [];
  const actions: AgentAction[] = [];
  let cost = 0;

  if (stale.length === 0) {
    return recordAgentRun(agent, { trigger, summary: "No stale deals — every open deal has moved within the last 10 days.", evidence, actions, costCents: 0, status: "completed" }, Date.now() - started);
  }

  const pending = db.select().from(approvals).where(and(eq(approvals.status, "pending"), eq(approvals.actionType, "send_followup"))).all();

  for (const deal of stale) {
    const days = Math.floor((Date.now() - new Date(deal.stageChangedAt).getTime()) / 86_400_000);
    evidence.push({ label: `${deal.name} — ${days} days without movement`, entityType: "deal", entityId: deal.id, detail: formatMoney(deal.valueCents) });
    const alreadyPending = pending.some((p) => (p.payload as { dealId?: number })?.dealId === deal.id);
    if (alreadyPending) {
      actions.push({ type: "send_followup", description: `Follow-up for "${deal.name}" already awaiting approval — skipped duplicate`, executed: false, needsApproval: false });
      continue;
    }
    const person = deal.personId ? db.select().from(people).where(eq(people.id, deal.personId)).get() : null;
    const draft = await generateDraft({
      kind: "deal_followup",
      context: { contactName: person ? personName(person) : "there", dealName: deal.name, daysSinceActivity: days },
    });
    cost += draft.costCents;
    const approval = db
      .insert(approvals)
      .values({
        requestedBy: agent.name,
        actionType: "send_followup",
        title: `Send follow-up for "${deal.name}"`,
        description: `Deal has not moved in ${days} days. Draft follow-up to ${person ? personName(person) : "the contact"}:`,
        payload: { dealId: deal.id, personId: deal.personId, draft: draft.text },
        status: "pending",
        createdAt: now(),
      })
      .returning()
      .get();
    actions.push({ type: "send_followup", description: `Drafted follow-up for "${deal.name}" (needs your approval)`, executed: false, needsApproval: true, approvalId: approval.id });
  }

  const run = recordAgentRun(
    agent,
    {
      trigger,
      summary: `${stale.length} deal(s) look stale. Drafted ${actions.filter((a) => a.needsApproval).length} follow-up(s) for approval.`,
      evidence,
      actions,
      costCents: cost,
    },
    Date.now() - started
  );
  // Link approvals back to this run
  const db2 = getDb();
  for (const a of actions) {
    if (a.approvalId) db2.update(approvals).set({ agentRunId: run.id }).where(eq(approvals.id, a.approvalId)).run();
  }
  return run;
}

// ---------- Delivery Coordinator (tier 2: internal execute) ----------

export async function runDeliveryCoordinator(trigger = "manual") {
  const agent = getAgent("delivery");
  if (!agent || !agent.enabled) return null;
  const started = Date.now();
  const db = getDb();
  const actor = actorFor(agent);
  const evidence: AgentEvidence[] = [];
  const actions: AgentAction[] = [];
  let budget = budgetRemaining(agent);
  let consumed = 0;

  const lateMilestones = overdueMilestones();
  const lateTasks = overdueTasks();

  for (const m of lateMilestones) {
    const project = db.select().from(projects).where(eq(projects.id, m.projectId)).get();
    evidence.push({ label: `Milestone past due: ${m.name} (${project?.name ?? "?"})`, entityType: "project", entityId: m.projectId, detail: `was due ${m.dueDate}` });
    const catchUpTitle = `Recovery plan: ${m.name}`;
    const existing = db.select().from(tasks).where(eq(tasks.projectId, m.projectId)).all().find((x) => x.title === catchUpTitle && x.status === "open");
    if (!existing && budget > consumed) {
      const task = await createTask(actor, { title: catchUpTitle, projectId: m.projectId, milestoneId: m.id, dueDate: daysFromNow(1), priority: "high", assigneeId: 2 });
      actions.push({ type: "create_task", description: `Created "${catchUpTitle}" (task #${task.id}) due tomorrow`, executed: true, needsApproval: false });
      consumed++;
    }
  }

  for (const x of lateTasks.slice(0, 10)) {
    evidence.push({ label: `Task overdue: ${x.title}`, entityType: "task", entityId: x.id, detail: `was due ${x.dueDate}` });
  }

  const summary =
    lateMilestones.length || lateTasks.length
      ? `Delivery watch: ${lateMilestones.length} milestone(s) and ${lateTasks.length} task(s) past due. Created ${actions.filter((a) => a.executed).length} recovery task(s).`
      : "All milestones and tasks are on schedule.";
  if (consumed) consumeBudget(agent.id, consumed);
  return recordAgentRun(agent, { trigger, summary, evidence, actions, costCents: 0 }, Date.now() - started);
}

// ---------- Support Agent (tier 2 triage; tier 1 outbound drafts) ----------

export async function runSupportAgent(ticketId: number, trigger = "ticket.created") {
  const agent = getAgent("support");
  if (!agent || !agent.enabled) return null;
  const started = Date.now();
  const db = getDb();
  const ticket = db.select().from(tickets).where(eq(tickets.id, ticketId)).get();
  if (!ticket) return null;
  const firstMessage = db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.id).get();
  const actor = actorFor(agent);
  const evidence: AgentEvidence[] = [{ label: `Ticket: ${ticket.subject}`, entityType: "ticket", entityId: ticket.id }];
  const actions: AgentAction[] = [];
  let cost = 0;

  // Customer context (the whole point: support sees commercial + delivery state)
  let customerName = "there";
  if (ticket.companyId) {
    const company = db.select().from(companies).where(eq(companies.id, ticket.companyId)).get();
    if (company) {
      evidence.push({ label: `Customer: ${company.name} (health: ${company.health})`, entityType: "company", entityId: company.id });
      const overdue = db.select().from(invoices).where(eq(invoices.companyId, company.id)).all().filter((i) => i.status === "overdue");
      if (overdue.length) evidence.push({ label: `${company.name} has ${overdue.length} overdue invoice(s) — flag for account manager`, entityType: "invoice", entityId: overdue[0].id });
    }
  }
  if (ticket.personId) {
    const person = db.select().from(people).where(eq(people.id, ticket.personId)).get();
    if (person) customerName = personName(person);
  }

  // Triage (tier 2 internal writes)
  const { priority, category } = classifyTicket(ticket.subject, firstMessage?.body ?? "");
  const triageSummary = `Auto-triage: classified as ${category} / ${priority} priority based on message content.`;
  const patch: Record<string, unknown> = { triageSummary };
  const changes: string[] = [];
  if (ticket.priority !== priority) {
    patch.priority = priority;
    changes.push(`priority → ${priority}`);
  }
  if (ticket.category !== category) {
    patch.category = category;
    changes.push(`category → ${category}`);
  }
  if (priority === "urgent" && !ticket.escalated) {
    patch.escalated = 1;
    changes.push("escalated");
  }
  await updateTicket(actor, ticket.id, patch as never);
  actions.push({ type: "triage", description: changes.length ? `Triaged: ${changes.join(", ")}` : "Triage confirmed existing classification", executed: true, needsApproval: false });

  // Draft reply (tier 1 → approval)
  const draft = await generateDraft({
    kind: "ticket_reply",
    context: { customerName, subject: ticket.subject, category, priority, message: firstMessage?.body ?? "" },
  });
  cost += draft.costCents;
  const approval = db
    .insert(approvals)
    .values({
      requestedBy: agent.name,
      actionType: "send_reply",
      title: `Send reply on "${ticket.subject}"`,
      description: `Draft response to ${customerName} (${category}, ${priority} priority):`,
      payload: { ticketId: ticket.id, draft: draft.text },
      status: "pending",
      createdAt: now(),
    })
    .returning()
    .get();
  actions.push({ type: "send_reply", description: "Drafted customer reply (needs your approval)", executed: false, needsApproval: true, approvalId: approval.id });

  consumeBudget(agent.id, 1);
  const run = recordAgentRun(
    agent,
    { trigger, summary: `Triaged "${ticket.subject}" as ${category}/${priority}${priority === "urgent" ? " and escalated it" : ""}. Reply drafted for approval.`, evidence, actions, costCents: cost },
    Date.now() - started
  );
  db.update(approvals).set({ agentRunId: run.id }).where(eq(approvals.id, approval.id)).run();
  return run;
}

// ---------- event dispatcher ----------

export async function dispatchToAgents(evt: { type: string; entityId: number; actor: { type: string } }): Promise<void> {
  // Agents don't react to their own or other agents' events (keeps loops impossible).
  if (evt.actor.type === "agent") return;
  if (evt.type === "deal.created") await runIntake(evt.entityId);
  if (evt.type === "ticket.created") await runSupportAgent(evt.entityId);
}
