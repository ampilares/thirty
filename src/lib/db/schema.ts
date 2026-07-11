import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ---------- Workspace & users ----------

export const workspace = sqliteTable("workspace", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  businessType: text("business_type").notNull().default("consultancy"),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("owner"),
});

// ---------- Metadata ----------

export const customFieldDefs = sqliteTable("custom_field_defs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  objectType: text("object_type").notNull(), // person | company | deal | project
  key: text("key").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(), // text | number | date | select
  options: text("options", { mode: "json" }).$type<string[]>(),
  createdAt: text("created_at").notNull(),
});

// ---------- Customers ----------

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  phone: text("phone"),
  address: text("address"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  custom: text("custom", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  health: text("health").notNull().default("good"), // good | watch | at_risk
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const people = sqliteTable("people", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull().default(""),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  companyId: integer("company_id"),
  role: text("role"), // role at the company
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  custom: text("custom", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------- Sales ----------

export const pipelines = sqliteTable("pipelines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const stages = sqliteTable("stages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pipelineId: integer("pipeline_id").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  kind: text("kind").notNull().default("open"), // open | won | lost
});

export const deals = sqliteTable("deals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  companyId: integer("company_id"),
  personId: integer("person_id"),
  valueCents: integer("value_cents").notNull().default(0),
  pipelineId: integer("pipeline_id").notNull(),
  stageId: integer("stage_id").notNull(),
  priority: text("priority").notNull().default("normal"), // low | normal | high
  source: text("source"),
  ownerId: integer("owner_id"),
  expectedClose: text("expected_close"),
  lostReason: text("lost_reason"),
  description: text("description"),
  custom: text("custom", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  stageChangedAt: text("stage_changed_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ---------- Delivery ----------

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  companyId: integer("company_id"),
  dealId: integer("deal_id"),
  status: text("status").notNull().default("planning"), // planning | active | on_hold | done
  startDate: text("start_date"),
  dueDate: text("due_date"),
  valueCents: integer("value_cents").notNull().default(0),
  description: text("description"),
  custom: text("custom", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const milestones = sqliteTable("milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  dueDate: text("due_date"),
  status: text("status").notNull().default("pending"), // pending | done | missed
  createdAt: text("created_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  projectId: integer("project_id"),
  milestoneId: integer("milestone_id"),
  dealId: integer("deal_id"),
  ticketId: integer("ticket_id"),
  assigneeId: integer("assignee_id"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("open"), // open | done
  priority: text("priority").notNull().default("normal"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at"),
});

// ---------- Money ----------

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  active: integer("active").notNull().default(1),
});

export const quotes = sqliteTable("quotes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull(),
  dealId: integer("deal_id"),
  companyId: integer("company_id"),
  personId: integer("person_id"),
  status: text("status").notNull().default("draft"), // draft | sent | accepted | rejected
  issueDate: text("issue_date"),
  validUntil: text("valid_until"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const quoteItems = sqliteTable("quote_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteId: integer("quote_id").notNull(),
  productId: integer("product_id"),
  description: text("description").notNull(),
  qty: integer("qty").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull(),
  companyId: integer("company_id"),
  personId: integer("person_id"),
  projectId: integer("project_id"),
  quoteId: integer("quote_id"),
  status: text("status").notNull().default("draft"), // draft | sent | paid | overdue | void
  issueDate: text("issue_date"),
  dueDate: text("due_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull(),
  description: text("description").notNull(),
  qty: integer("qty").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  method: text("method").notNull().default("bank_transfer"),
  reference: text("reference"),
  paidAt: text("paid_at").notNull(),
});

// ---------- Support ----------

export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subject: text("subject").notNull(),
  companyId: integer("company_id"),
  personId: integer("person_id"),
  priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
  category: text("category"),
  status: text("status").notNull().default("open"), // open | pending | resolved | closed
  slaDueAt: text("sla_due_at"),
  assigneeId: integer("assignee_id"),
  escalated: integer("escalated").notNull().default(0),
  triageSummary: text("triage_summary"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const ticketMessages = sqliteTable("ticket_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id").notNull(),
  authorType: text("author_type").notNull(), // customer | user | agent
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  internal: integer("internal").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// ---------- Notes ----------

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(), // person | company | deal | project | ticket | invoice
  entityId: integer("entity_id").notNull(),
  authorLabel: text("author_label").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

// ---------- Automations ----------

export type AutomationCondition = {
  field: string;
  op: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "is_set" | "not_set";
  value?: string | number;
};

export type AutomationAction = {
  type:
    | "create_task"
    | "update_field"
    | "add_tag"
    | "add_note"
    | "create_ticket"
    | "send_message"
    | "request_approval"
    | "escalate_ticket";
  params: Record<string, string | number>;
};

export const automations = sqliteTable("automations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(), // event type e.g. deal.stage_changed
  conditions: text("conditions", { mode: "json" }).$type<AutomationCondition[]>().default([]),
  actions: text("actions", { mode: "json" }).$type<AutomationAction[]>().default([]),
  enabled: integer("enabled").notNull().default(0),
  currentVersion: integer("current_version").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const automationVersions = sqliteTable("automation_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  automationId: integer("automation_id").notNull(),
  version: integer("version").notNull(),
  definition: text("definition", { mode: "json" }).$type<{
    name: string;
    trigger: string;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
  }>(),
  publishNotes: text("publish_notes"),
  publishedAt: text("published_at").notNull(),
});

export const automationRuns = sqliteTable("automation_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  automationId: integer("automation_id").notNull(),
  version: integer("version").notNull(),
  eventType: text("event_type").notNull(),
  eventId: integer("event_id"),
  status: text("status").notNull(), // success | failed | skipped | simulated
  simulated: integer("simulated").notNull().default(0),
  steps: text("steps", { mode: "json" })
    .$type<{ action: string; detail: string; ok: boolean }[]>()
    .default([]),
  error: text("error"),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
});

// ---------- Agents ----------

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(), // chief_of_staff | intake | sales | delivery | support
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: integer("tier").notNull().default(1), // autonomy tier cap 0-3
  enabled: integer("enabled").notNull().default(1),
  dailyActionBudget: integer("daily_action_budget").notNull().default(25),
  actionsToday: integer("actions_today").notNull().default(0),
  budgetDate: text("budget_date"),
  createdAt: text("created_at").notNull(),
});

export type AgentEvidence = { label: string; entityType: string; entityId: number; detail?: string };
export type AgentAction = {
  type: string;
  description: string;
  executed: boolean;
  needsApproval: boolean;
  approvalId?: number;
  result?: string;
};

export const agentRuns = sqliteTable("agent_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  agentKey: text("agent_key").notNull(),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(), // completed | failed | awaiting_approval
  summary: text("summary").notNull().default(""),
  evidence: text("evidence", { mode: "json" }).$type<AgentEvidence[]>().default([]),
  actions: text("actions", { mode: "json" }).$type<AgentAction[]>().default([]),
  costCents: integer("cost_cents").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentRunId: integer("agent_run_id"),
  automationRunId: integer("automation_run_id"),
  requestedBy: text("requested_by").notNull(), // e.g. agent:support
  actionType: text("action_type").notNull(), // send_reply | send_followup | generic
  title: text("title").notNull(),
  description: text("description").notNull(),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  decidedAt: text("decided_at"),
  executedResult: text("executed_result"),
  createdAt: text("created_at").notNull(),
});

// ---------- Events & audit ----------

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // e.g. deal.created, invoice.overdue
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  createdAt: text("created_at").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorType: text("actor_type").notNull(), // user | agent | automation | api | system
  actorId: text("actor_id"),
  actorLabel: text("actor_label").notNull(),
  action: text("action").notNull(), // create | update | delete | execute
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  entityLabel: text("entity_label"),
  before: text("before", { mode: "json" }).$type<Record<string, unknown> | null>(),
  after: text("after", { mode: "json" }).$type<Record<string, unknown> | null>(),
  correlationType: text("correlation_type"), // agent_run | automation_run | approval
  correlationId: integer("correlation_id"),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>(),
});
