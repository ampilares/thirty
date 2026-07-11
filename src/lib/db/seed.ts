/** Seeds the demo workspace "Coastal Digital" — a small digital consultancy. */
import { getDb, now } from "./client";
import * as s from "./schema";

const db = getDb();

function iso(daysOffset: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function day(daysOffset: number): string {
  return iso(daysOffset).slice(0, 10);
}

const ts = now();

// ---------- Workspace & users ----------
db.insert(s.workspace).values({ name: "Coastal Digital", businessType: "agency", createdAt: ts }).run();
db.insert(s.users)
  .values([
    { name: "Alex Reeve", email: "alex@coastaldigital.example", role: "owner" },
    { name: "Sam Ortiz", email: "sam@coastaldigital.example", role: "delivery" },
    { name: "Priya Nair", email: "priya@coastaldigital.example", role: "support" },
  ])
  .run();

// ---------- Custom fields ----------
db.insert(s.customFieldDefs)
  .values([
    { objectType: "deal", key: "contract_type", label: "Contract type", type: "select", options: ["Fixed price", "Retainer", "Time & materials"], createdAt: ts },
    { objectType: "company", key: "account_manager", label: "Account manager", type: "text", options: null, createdAt: ts },
  ])
  .run();

// ---------- Pipeline ----------
db.insert(s.pipelines).values({ name: "Sales" }).run();
db.insert(s.stages)
  .values([
    { pipelineId: 1, name: "New", position: 1, kind: "open" },
    { pipelineId: 1, name: "Qualified", position: 2, kind: "open" },
    { pipelineId: 1, name: "Proposal", position: 3, kind: "open" },
    { pipelineId: 1, name: "Negotiation", position: 4, kind: "open" },
    { pipelineId: 1, name: "Won", position: 5, kind: "won" },
    { pipelineId: 1, name: "Lost", position: 6, kind: "lost" },
  ])
  .run();

// ---------- Companies ----------
db.insert(s.companies)
  .values([
    { name: "Harbourview Hotels", domain: "harbourview.example", industry: "Hospitality", tags: ["client"], custom: { account_manager: "Alex Reeve" }, health: "good", createdAt: iso(-160), updatedAt: ts },
    { name: "Meridian Legal", domain: "meridianlegal.example", industry: "Legal services", tags: ["client"], custom: { account_manager: "Sam Ortiz" }, health: "watch", createdAt: iso(-140), updatedAt: ts },
    { name: "GreenLeaf Organics", domain: "greenleaf.example", industry: "Food & beverage", tags: ["client"], custom: {}, health: "at_risk", createdAt: iso(-120), updatedAt: ts },
    { name: "Solstice Fitness", domain: "solsticefit.example", industry: "Health & fitness", tags: ["prospect"], custom: {}, health: "good", createdAt: iso(-45), updatedAt: ts },
    { name: "Brightpath Accounting", domain: "brightpath.example", industry: "Accounting", tags: ["prospect"], custom: {}, health: "good", createdAt: iso(-30), updatedAt: ts },
    { name: "Northgate Property Group", domain: "northgate.example", industry: "Real estate", tags: ["prospect"], custom: {}, health: "good", createdAt: iso(-12), updatedAt: ts },
    { name: "Cobalt Robotics Supply", domain: "cobaltsupply.example", industry: "Industrial", tags: ["prospect"], custom: {}, health: "good", createdAt: iso(-6), updatedAt: ts },
  ])
  .run();

// ---------- People ----------
db.insert(s.people)
  .values([
    { firstName: "Marta", lastName: "Kowalski", email: "marta@harbourview.example", title: "Marketing Director", companyId: 1, createdAt: iso(-160), updatedAt: ts },
    { firstName: "James", lastName: "Chen", email: "james@harbourview.example", title: "GM", companyId: 1, createdAt: iso(-150), updatedAt: ts },
    { firstName: "Deborah", lastName: "Osei", email: "deborah@meridianlegal.example", title: "Managing Partner", companyId: 2, createdAt: iso(-140), updatedAt: ts },
    { firstName: "Tom", lastName: "Whitfield", email: "tom@greenleaf.example", title: "Founder", companyId: 3, createdAt: iso(-120), updatedAt: ts },
    { firstName: "Ava", lastName: "Lindqvist", email: "ava@solsticefit.example", title: "Owner", companyId: 4, createdAt: iso(-45), updatedAt: ts },
    { firstName: "Ray", lastName: "Donnelly", email: "ray@brightpath.example", title: "Partner", companyId: 5, createdAt: iso(-30), updatedAt: ts },
    { firstName: "Ingrid", lastName: "Baum", email: "ingrid@northgate.example", title: "Head of Marketing", companyId: 6, createdAt: iso(-12), updatedAt: ts },
    { firstName: "Victor", lastName: "Alonso", email: "victor@cobaltsupply.example", title: "Operations Manager", companyId: 7, createdAt: iso(-6), updatedAt: ts },
  ])
  .run();

// ---------- Products ----------
db.insert(s.products)
  .values([
    { name: "Website design & build", description: "Full design and CMS build", unitPriceCents: 1200000, active: 1 },
    { name: "SEO retainer (monthly)", description: "Ongoing SEO programme", unitPriceCents: 150000, active: 1 },
    { name: "Brand identity package", description: "Logo, guidelines, collateral", unitPriceCents: 650000, active: 1 },
    { name: "Care & support plan (monthly)", description: "Hosting, updates, support", unitPriceCents: 45000, active: 1 },
    { name: "Analytics & tracking setup", description: "GA4, dashboards, attribution", unitPriceCents: 220000, active: 1 },
  ])
  .run();

// ---------- Deals ----------
db.insert(s.deals)
  .values([
    // open pipeline
    { name: "Cobalt Robotics — website enquiry", companyId: 7, personId: 8, valueCents: 1200000, pipelineId: 1, stageId: 1, priority: "normal", source: "Website form", ownerId: 1, expectedClose: day(30), custom: {}, stageChangedAt: iso(-2), createdAt: iso(-2), updatedAt: iso(-2) },
    { name: "Northgate — brand refresh", companyId: 6, personId: 7, valueCents: 650000, pipelineId: 1, stageId: 2, priority: "high", source: "Referral", ownerId: 1, expectedClose: day(21), custom: { contract_type: "Fixed price" }, stageChangedAt: iso(-5), createdAt: iso(-12), updatedAt: iso(-5) },
    { name: "Brightpath — SEO programme", companyId: 5, personId: 6, valueCents: 900000, pipelineId: 1, stageId: 3, priority: "normal", source: "LinkedIn", ownerId: 1, expectedClose: day(14), custom: { contract_type: "Retainer" }, stageChangedAt: iso(-19), createdAt: iso(-30), updatedAt: iso(-19) },
    { name: "Solstice Fitness — site + membership portal", companyId: 4, personId: 5, valueCents: 1850000, pipelineId: 1, stageId: 4, priority: "high", source: "Referral", ownerId: 1, expectedClose: day(7), custom: { contract_type: "Fixed price" }, stageChangedAt: iso(-9), createdAt: iso(-45), updatedAt: iso(-9) },
    // won
    { name: "Harbourview — website rebuild", companyId: 1, personId: 1, valueCents: 1400000, pipelineId: 1, stageId: 5, priority: "high", source: "Existing client", ownerId: 1, expectedClose: day(-60), custom: { contract_type: "Fixed price" }, stageChangedAt: iso(-58), createdAt: iso(-95), updatedAt: iso(-58) },
    { name: "Meridian Legal — brand + site", companyId: 2, personId: 3, valueCents: 1850000, pipelineId: 1, stageId: 5, priority: "normal", source: "Referral", ownerId: 1, expectedClose: day(-30), custom: { contract_type: "Fixed price" }, stageChangedAt: iso(-28), createdAt: iso(-70), updatedAt: iso(-28) },
    // lost
    { name: "GreenLeaf — packaging design", companyId: 3, personId: 4, valueCents: 400000, pipelineId: 1, stageId: 6, priority: "low", source: "Website form", ownerId: 1, lostReason: "Chose a cheaper freelancer", custom: {}, stageChangedAt: iso(-40), createdAt: iso(-60), updatedAt: iso(-40) },
  ])
  .run();

// deal stage-change events for timeline history
db.insert(s.events)
  .values([
    { type: "deal.stage_changed", entityType: "deal", entityId: 3, payload: { from: "Qualified", to: "Proposal", name: "Brightpath — SEO programme" }, actorType: "user", actorId: "1", createdAt: iso(-19) },
    { type: "deal.stage_changed", entityType: "deal", entityId: 4, payload: { from: "Proposal", to: "Negotiation", name: "Solstice Fitness — site + membership portal" }, actorType: "user", actorId: "1", createdAt: iso(-9) },
    { type: "deal.stage_changed", entityType: "deal", entityId: 5, payload: { from: "Negotiation", to: "Won", name: "Harbourview — website rebuild" }, actorType: "user", actorId: "1", createdAt: iso(-58) },
    { type: "deal.stage_changed", entityType: "deal", entityId: 6, payload: { from: "Negotiation", to: "Won", name: "Meridian Legal — brand + site" }, actorType: "user", actorId: "1", createdAt: iso(-28) },
  ])
  .run();

// ---------- Projects ----------
db.insert(s.projects)
  .values([
    { name: "Harbourview website rebuild", companyId: 1, dealId: 5, status: "active", startDate: day(-55), dueDate: day(10), valueCents: 1400000, description: "Full rebuild of harbourview.example on new CMS.", custom: {}, createdAt: iso(-55), updatedAt: ts },
    { name: "Meridian brand + site", companyId: 2, dealId: 6, status: "active", startDate: day(-25), dueDate: day(35), valueCents: 1850000, description: "Brand identity refresh followed by site build.", custom: {}, createdAt: iso(-25), updatedAt: ts },
    { name: "GreenLeaf SEO retainer", companyId: 3, dealId: null, status: "on_hold", startDate: day(-100), dueDate: null, valueCents: 450000, description: "Quarterly SEO programme — paused pending overdue invoices.", custom: {}, createdAt: iso(-100), updatedAt: ts },
  ])
  .run();

db.insert(s.milestones)
  .values([
    { projectId: 1, name: "Design sign-off", dueDate: day(-20), status: "done", createdAt: iso(-55) },
    { projectId: 1, name: "Content migration complete", dueDate: day(-3), status: "pending", createdAt: iso(-55) }, // overdue
    { projectId: 1, name: "Launch", dueDate: day(10), status: "pending", createdAt: iso(-55) },
    { projectId: 2, name: "Brand concepts presented", dueDate: day(-5), status: "done", createdAt: iso(-25) },
    { projectId: 2, name: "Brand guidelines delivered", dueDate: day(12), status: "pending", createdAt: iso(-25) },
    { projectId: 2, name: "Site wireframes approved", dueDate: day(20), status: "pending", createdAt: iso(-25) },
  ])
  .run();

db.insert(s.tasks)
  .values([
    { title: "Migrate blog articles to new CMS", projectId: 1, milestoneId: 2, assigneeId: 2, dueDate: day(-4), status: "open", priority: "high", createdAt: iso(-20), updatedAt: ts }, // overdue
    { title: "QA checkout + booking flows", projectId: 1, milestoneId: 3, assigneeId: 2, dueDate: day(5), status: "open", priority: "normal", createdAt: iso(-10), updatedAt: ts },
    { title: "Set up launch redirects", projectId: 1, milestoneId: 3, assigneeId: 2, dueDate: day(8), status: "open", priority: "normal", createdAt: iso(-10), updatedAt: ts },
    { title: "Collate brand questionnaire responses", projectId: 2, milestoneId: 5, assigneeId: 2, dueDate: day(-1), status: "open", priority: "normal", createdAt: iso(-15), updatedAt: ts }, // overdue
    { title: "Prepare typography options", projectId: 2, milestoneId: 5, assigneeId: 2, dueDate: day(6), status: "open", priority: "normal", createdAt: iso(-15), updatedAt: ts },
    { title: "Send Solstice revised proposal", dealId: 4, assigneeId: 1, dueDate: day(1), status: "open", priority: "high", createdAt: iso(-3), updatedAt: ts },
  ])
  .run();

// ---------- Quotes ----------
db.insert(s.quotes)
  .values([
    { number: "Q-2026-014", dealId: 4, companyId: 4, personId: 5, status: "sent", issueDate: day(-8), validUntil: day(22), notes: "Revised scope incl. membership portal.", createdAt: iso(-8), updatedAt: iso(-8) },
    { number: "Q-2026-013", dealId: 3, companyId: 5, personId: 6, status: "draft", issueDate: null, validUntil: null, notes: "6-month SEO programme.", createdAt: iso(-10), updatedAt: iso(-10) },
    { number: "Q-2026-011", dealId: 6, companyId: 2, personId: 3, status: "accepted", issueDate: day(-32), validUntil: day(-2), notes: "Accepted 4 weeks ago.", createdAt: iso(-32), updatedAt: iso(-28) },
  ])
  .run();
db.insert(s.quoteItems)
  .values([
    { quoteId: 1, productId: 1, description: "Website design & build", qty: 1, unitPriceCents: 1200000 },
    { quoteId: 1, productId: null, description: "Membership portal module", qty: 1, unitPriceCents: 650000 },
    { quoteId: 2, productId: 2, description: "SEO retainer (monthly)", qty: 6, unitPriceCents: 150000 },
    { quoteId: 3, productId: 3, description: "Brand identity package", qty: 1, unitPriceCents: 650000 },
    { quoteId: 3, productId: 1, description: "Website design & build", qty: 1, unitPriceCents: 1200000 },
  ])
  .run();

// ---------- Invoices & payments ----------
db.insert(s.invoices)
  .values([
    { number: "INV-2026-041", companyId: 1, personId: 1, projectId: 1, quoteId: null, status: "paid", issueDate: day(-50), dueDate: day(-36), notes: "50% deposit — Harbourview rebuild", createdAt: iso(-50), updatedAt: iso(-34) },
    { number: "INV-2026-046", companyId: 2, personId: 3, projectId: 2, quoteId: 3, status: "sent", issueDate: day(-20), dueDate: day(8), notes: "Brand phase — Meridian", createdAt: iso(-20), updatedAt: iso(-20) },
    { number: "INV-2026-044", companyId: 3, personId: 4, projectId: 3, quoteId: null, status: "overdue", issueDate: day(-45), dueDate: day(-15), notes: "SEO retainer Q2", createdAt: iso(-45), updatedAt: iso(-14) },
    { number: "INV-2026-045", companyId: 3, personId: 4, projectId: 3, quoteId: null, status: "overdue", issueDate: day(-38), dueDate: day(-8), notes: "SEO retainer Q2 (part 2)", createdAt: iso(-38), updatedAt: iso(-7) },
    { number: "INV-2026-047", companyId: 1, personId: 1, projectId: 1, quoteId: null, status: "draft", issueDate: null, dueDate: null, notes: "Content migration extras", createdAt: iso(-2), updatedAt: iso(-2) },
  ])
  .run();
db.insert(s.invoiceItems)
  .values([
    { invoiceId: 1, description: "Website rebuild — 50% deposit", qty: 1, unitPriceCents: 700000 },
    { invoiceId: 2, description: "Brand identity package", qty: 1, unitPriceCents: 650000 },
    { invoiceId: 3, description: "SEO retainer — April", qty: 1, unitPriceCents: 150000 },
    { invoiceId: 3, description: "SEO retainer — May", qty: 1, unitPriceCents: 150000 },
    { invoiceId: 4, description: "SEO retainer — June", qty: 1, unitPriceCents: 150000 },
    { invoiceId: 5, description: "Additional content migration (12h)", qty: 12, unitPriceCents: 14000 },
  ])
  .run();
db.insert(s.payments)
  .values([
    { invoiceId: 1, amountCents: 700000, method: "bank_transfer", reference: "HV-4471", paidAt: iso(-34) },
    { invoiceId: 3, amountCents: 150000, method: "bank_transfer", reference: "GL-1102", paidAt: iso(-10) }, // partial
  ])
  .run();

// ---------- Tickets ----------
db.insert(s.tickets)
  .values([
    { subject: "Booking widget down on homepage", companyId: 1, personId: 1, priority: "urgent", category: "Bug", status: "open", slaDueAt: iso(0, 16), assigneeId: 3, escalated: 1, triageSummary: null, createdAt: iso(0, 8), updatedAt: iso(0, 8) },
    { subject: "Update partner logos on About page", companyId: 2, personId: 3, priority: "normal", category: "Change request", status: "open", slaDueAt: iso(2), assigneeId: 3, escalated: 0, triageSummary: null, createdAt: iso(-1), updatedAt: iso(-1) },
    { subject: "Question about analytics report", companyId: 3, personId: 4, priority: "low", category: "Question", status: "pending", slaDueAt: iso(3), assigneeId: 3, escalated: 0, triageSummary: null, createdAt: iso(-4), updatedAt: iso(-2) },
    { subject: "SSL certificate warning", companyId: 2, personId: 3, priority: "high", category: "Bug", status: "resolved", slaDueAt: iso(-6), assigneeId: 3, escalated: 0, triageSummary: null, createdAt: iso(-8), updatedAt: iso(-6), resolvedAt: iso(-6) },
  ])
  .run();
db.insert(s.ticketMessages)
  .values([
    { ticketId: 1, authorType: "customer", authorName: "Marta Kowalski", body: "The booking widget on the homepage shows a spinner and never loads. We are losing reservations — please treat as urgent.", internal: 0, createdAt: iso(0, 8) },
    { ticketId: 2, authorType: "customer", authorName: "Deborah Osei", body: "Could you swap the partner logos on the About page for the attached new set?", internal: 0, createdAt: iso(-1) },
    { ticketId: 3, authorType: "customer", authorName: "Tom Whitfield", body: "The organic traffic chart in last month's report looks off — can you explain the drop in week 3?", internal: 0, createdAt: iso(-4) },
    { ticketId: 3, authorType: "user", authorName: "Priya Nair", body: "Looking into it — the tracking change on the 14th likely explains this. Will confirm.", internal: 0, createdAt: iso(-2) },
    { ticketId: 4, authorType: "customer", authorName: "Deborah Osei", body: "Browsers are warning about the certificate on our site.", internal: 0, createdAt: iso(-8) },
    { ticketId: 4, authorType: "user", authorName: "Priya Nair", body: "Renewed and redeployed the certificate — confirmed clean across browsers.", internal: 0, createdAt: iso(-6) },
  ])
  .run();

// ---------- Notes ----------
db.insert(s.notes)
  .values([
    { entityType: "company", entityId: 3, authorLabel: "Alex Reeve", body: "Tom flagged cash-flow issues on our last call. Watch the overdue invoices before restarting SEO work.", createdAt: iso(-9) },
    { entityType: "deal", entityId: 4, authorLabel: "Alex Reeve", body: "Ava wants the membership portal in phase 1. Revised quote sent — follow up Friday.", createdAt: iso(-8) },
    { entityType: "company", entityId: 1, authorLabel: "Sam Ortiz", body: "Launch window agreed with James: second week of next month, avoid weekend changeover.", createdAt: iso(-6) },
  ])
  .run();

// ---------- Agents ----------
db.insert(s.agents)
  .values([
    { key: "chief_of_staff", name: "Owner Chief of Staff", description: "Daily briefing: what changed, what is at risk, what needs you today.", tier: 0, enabled: 1, dailyActionBudget: 10, actionsToday: 0, budgetDate: day(0), createdAt: ts },
    { key: "intake", name: "Intake & Enrichment", description: "Classifies and routes new leads, checks for duplicates, sets priority.", tier: 2, enabled: 1, dailyActionBudget: 50, actionsToday: 0, budgetDate: day(0), createdAt: ts },
    { key: "sales", name: "Sales Agent", description: "Flags stale deals and drafts follow-up messages for approval.", tier: 1, enabled: 1, dailyActionBudget: 25, actionsToday: 0, budgetDate: day(0), createdAt: ts },
    { key: "delivery", name: "Delivery Coordinator", description: "Watches milestones and tasks, flags at-risk work, creates catch-up tasks.", tier: 2, enabled: 1, dailyActionBudget: 25, actionsToday: 0, budgetDate: day(0), createdAt: ts },
    { key: "support", name: "Support Agent", description: "Triages new tickets, sets SLA, drafts responses for approval, escalates.", tier: 2, enabled: 1, dailyActionBudget: 50, actionsToday: 0, budgetDate: day(0), createdAt: ts },
  ])
  .run();

// ---------- Automations (templates; two published & enabled) ----------
const autoTs = ts;
db.insert(s.automations)
  .values([
    {
      name: "New lead response task",
      description: "When a deal is created from a web lead, create a same-day follow-up task.",
      trigger: "deal.created",
      conditions: [{ field: "source", op: "contains", value: "form" }],
      actions: [
        { type: "create_task", params: { title: "Respond to new lead: {name}", dueInDays: 0, priority: "high" } },
        { type: "add_note", params: { body: "Automation: lead response task created within SLA." } },
      ],
      enabled: 1,
      currentVersion: 1,
      createdAt: autoTs,
      updatedAt: autoTs,
    },
    {
      name: "Deal won → project kickoff checklist",
      description: "When a deal is won, add kickoff tasks to the auto-created project.",
      trigger: "deal.won",
      conditions: [],
      actions: [
        { type: "create_task", params: { title: "Schedule kickoff call for {name}", dueInDays: 3, priority: "high" } },
        { type: "create_task", params: { title: "Send onboarding questionnaire", dueInDays: 2, priority: "normal" } },
      ],
      enabled: 1,
      currentVersion: 1,
      createdAt: autoTs,
      updatedAt: autoTs,
    },
    {
      name: "Invoice overdue reminder",
      description: "When an invoice becomes overdue, log a reminder message and note it on the customer.",
      trigger: "invoice.overdue",
      conditions: [],
      actions: [
        { type: "send_message", params: { to: "{customer}", template: "payment_reminder", body: "Friendly reminder: invoice {number} is past its due date." } },
        { type: "add_note", params: { body: "Automation: payment reminder queued for invoice {number}." } },
      ],
      enabled: 0,
      currentVersion: 1,
      createdAt: autoTs,
      updatedAt: autoTs,
    },
    {
      name: "Urgent ticket escalation",
      description: "When an urgent ticket is created, escalate it and create an immediate response task.",
      trigger: "ticket.created",
      conditions: [{ field: "priority", op: "eq", value: "urgent" }],
      actions: [
        { type: "escalate_ticket", params: {} },
        { type: "create_task", params: { title: "URGENT: first response for ticket #{id}", dueInDays: 0, priority: "high" } },
      ],
      enabled: 1,
      currentVersion: 1,
      createdAt: autoTs,
      updatedAt: autoTs,
    },
  ])
  .run();

// published versions for the seeded automations
const seededAutomations = db.select().from(s.automations).all();
for (const a of seededAutomations) {
  db.insert(s.automationVersions)
    .values({
      automationId: a.id,
      version: 1,
      definition: { name: a.name, trigger: a.trigger, conditions: a.conditions ?? [], actions: a.actions ?? [] },
      publishNotes: "Initial version (seeded)",
      publishedAt: autoTs,
    })
    .run();
}

// ---------- Settings & audit ----------
db.insert(s.settings).values({ key: "workspace", value: { seededAt: ts } }).run();
db.insert(s.auditLog)
  .values({
    actorType: "system",
    actorId: null,
    actorLabel: "Seed",
    action: "create",
    entityType: "workspace",
    entityId: 1,
    entityLabel: "Coastal Digital",
    before: null,
    after: { note: "Demo workspace seeded" },
    createdAt: ts,
  })
  .run();

console.log("Seed complete: Coastal Digital demo workspace created.");
