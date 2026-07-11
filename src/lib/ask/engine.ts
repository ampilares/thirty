/**
 * Ask Business (PRD §20, AI-01): deterministic intent engine that answers
 * cross-module questions with linked source records, confidence, and
 * freshness. When ANTHROPIC_API_KEY is set, unmatched questions fall through
 * to the LLM with a structured business snapshot.
 */
import { eq } from "drizzle-orm";
import { getDb, now, today } from "../db/client";
import { deals, stages, companies, people, invoices, tickets, tasks, milestones, projects, payments, events, approvals } from "../db/schema";
import { formatMoney, invoiceTotals } from "../core/money";
import { staleDeals } from "../core/sales";
import { personName } from "../core/customers";
import { generateDraft, aiProviderStatus } from "../ai/gateway";

export type AskSource = { label: string; href: string };
export type AskAnswer = {
  question: string;
  answer: string;
  sources: AskSource[];
  confidence: "high" | "medium" | "low";
  freshness: string;
  engine: "rules" | "llm";
  suggestions?: string[];
};

type Intent = {
  id: string;
  patterns: RegExp[];
  example: string;
  resolve: () => { answer: string; sources: AskSource[]; confidence: "high" | "medium" | "low" };
};

function db() {
  return getDb();
}

function openStageIds(): Set<number> {
  return new Set(db().select().from(stages).all().filter((s) => s.kind === "open").map((s) => s.id));
}

const intents: Intent[] = [
  {
    id: "overdue_invoices",
    patterns: [/overdue invoice/, /invoices?.*(overdue|late|unpaid past)/, /who owes/, /late payments?/],
    example: "Which invoices are overdue?",
    resolve: () => {
      const rows = db().select().from(invoices).where(eq(invoices.status, "overdue")).all();
      if (!rows.length) return { answer: "No invoices are overdue right now.", sources: [], confidence: "high" };
      const parts = rows.map((i) => {
        const t = invoiceTotals(i.id);
        const company = i.companyId ? db().select().from(companies).where(eq(companies.id, i.companyId)).get() : null;
        return `${i.number} — ${company?.name ?? "Unknown"} — ${formatMoney(t.balanceCents)} outstanding (due ${i.dueDate})`;
      });
      const total = rows.reduce((s, i) => s + invoiceTotals(i.id).balanceCents, 0);
      return {
        answer: `${rows.length} invoice(s) are overdue, totalling ${formatMoney(total)} outstanding:\n` + parts.map((p) => `• ${p}`).join("\n"),
        sources: rows.map((i) => ({ label: `Invoice ${i.number}`, href: `/money/invoices/${i.id}` })),
        confidence: "high",
      };
    },
  },
  {
    id: "pipeline_value",
    patterns: [/pipeline (value|worth)/, /how much.*pipeline/, /value.*pipeline/, /open deals?.*(worth|value)/],
    example: "What is our pipeline worth by stage?",
    resolve: () => {
      const stageRows = db().select().from(stages).all().filter((s) => s.kind === "open");
      const allDeals = db().select().from(deals).all();
      const lines: string[] = [];
      let total = 0;
      for (const s of stageRows) {
        const inStage = allDeals.filter((d) => d.stageId === s.id);
        const value = inStage.reduce((sum, d) => sum + d.valueCents, 0);
        total += value;
        if (inStage.length) lines.push(`• ${s.name}: ${inStage.length} deal(s), ${formatMoney(value)}`);
      }
      return {
        answer: `Open pipeline is ${formatMoney(total)} across ${allDeals.filter((d) => openStageIds().has(d.stageId)).length} deals:\n${lines.join("\n")}`,
        sources: [{ label: "Sales pipeline", href: "/sales" }],
        confidence: "high",
      };
    },
  },
  {
    id: "deals_at_risk",
    patterns: [/deals?.*(slip|risk|stale|stuck)/, /(stale|stuck|at.risk).*deals?/, /which deals.*attention/],
    example: "Which deals are likely to slip?",
    resolve: () => {
      const stale = staleDeals(10);
      const t = today();
      const allDeals = db().select().from(deals).all();
      const openIds = openStageIds();
      const pastClose = allDeals.filter((d) => openIds.has(d.stageId) && d.expectedClose && d.expectedClose < t);
      const flagged = new Map<number, { deal: (typeof allDeals)[0]; reasons: string[] }>();
      for (const d of stale) {
        const days = Math.floor((Date.now() - new Date(d.stageChangedAt).getTime()) / 86_400_000);
        flagged.set(d.id, { deal: d, reasons: [`no movement for ${days} days`] });
      }
      for (const d of pastClose) {
        const entry = flagged.get(d.id) ?? { deal: d, reasons: [] };
        entry.reasons.push(`expected close date ${d.expectedClose} has passed`);
        flagged.set(d.id, entry);
      }
      if (!flagged.size) return { answer: "No open deals look at risk — everything has moved recently and no close dates have slipped.", sources: [], confidence: "medium" };
      const lines = [...flagged.values()].map(({ deal, reasons }) => `• ${deal.name} (${formatMoney(deal.valueCents)}): ${reasons.join("; ")}`);
      return {
        answer: `${flagged.size} deal(s) look at risk:\n${lines.join("\n")}`,
        sources: [...flagged.values()].map(({ deal }) => ({ label: deal.name, href: `/sales/${deal.id}` })),
        confidence: "medium",
      };
    },
  },
  {
    id: "customers_open_tickets",
    patterns: [/customers?.*(open )?tickets?/, /tickets?.*open/, /support (load|queue)/, /who.*waiting.*support/],
    example: "Which customers have open tickets?",
    resolve: () => {
      const rows = db().select().from(tickets).all().filter((t) => t.status === "open" || t.status === "pending");
      if (!rows.length) return { answer: "No open support tickets. Inbox zero.", sources: [], confidence: "high" };
      const lines = rows.map((t) => {
        const company = t.companyId ? db().select().from(companies).where(eq(companies.id, t.companyId)).get() : null;
        return `• ${company?.name ?? "Unknown"}: "${t.subject}" (${t.priority}${t.escalated ? ", escalated" : ""}, ${t.status})`;
      });
      return {
        answer: `${rows.length} open ticket(s):\n${lines.join("\n")}`,
        sources: rows.map((t) => ({ label: t.subject, href: `/support/${t.id}` })),
        confidence: "high",
      };
    },
  },
  {
    id: "collected_this_month",
    patterns: [/(collected|cash|revenue|received).*(this|last) month/, /how much.*(collected|paid|came in)/, /cash (in|collected)/],
    example: "How much cash have we collected this month?",
    resolve: () => {
      const month = today().slice(0, 7);
      const rows = db().select().from(payments).all().filter((p) => p.paidAt.slice(0, 7) === month);
      const total = rows.reduce((s, p) => s + p.amountCents, 0);
      const allUnpaid = db().select().from(invoices).all().filter((i) => i.status === "sent" || i.status === "overdue");
      const outstanding = allUnpaid.reduce((s, i) => s + invoiceTotals(i.id).balanceCents, 0);
      return {
        answer: `${formatMoney(total)} collected this month across ${rows.length} payment(s). ${formatMoney(outstanding)} is still outstanding on ${allUnpaid.length} unpaid invoice(s).`,
        sources: [{ label: "Money overview", href: "/money" }],
        confidence: "high",
      };
    },
  },
  {
    id: "top_sources",
    patterns: [/lead sources?/, /where.*leads.*(from|come)/, /best.*(source|channel)/, /which (channel|source)/],
    example: "Which lead sources work best?",
    resolve: () => {
      const allDeals = db().select().from(deals).all();
      const wonStage = db().select().from(stages).all().find((s) => s.kind === "won");
      const bySource = new Map<string, { count: number; value: number; won: number }>();
      for (const d of allDeals) {
        const key = d.source ?? "Unknown";
        const entry = bySource.get(key) ?? { count: 0, value: 0, won: 0 };
        entry.count++;
        entry.value += d.valueCents;
        if (wonStage && d.stageId === wonStage.id) entry.won++;
        bySource.set(key, entry);
      }
      const lines = [...bySource.entries()]
        .sort((a, b) => b[1].value - a[1].value)
        .map(([source, s]) => `• ${source}: ${s.count} deal(s), ${formatMoney(s.value)} total value, ${s.won} won`);
      return { answer: `Lead sources by total deal value:\n${lines.join("\n")}`, sources: [{ label: "Sales pipeline", href: "/sales" }], confidence: "high" };
    },
  },
  {
    id: "at_risk_customers",
    patterns: [/customers?.*(at.risk|unhappy|churn|health)/, /(at.risk|unhealthy).*customers?/, /who.*might.*(churn|leave)/],
    example: "Which customers are at risk?",
    resolve: () => {
      const rows = db().select().from(companies).all().filter((c) => c.health !== "good");
      if (!rows.length) return { answer: "All customers are currently healthy.", sources: [], confidence: "medium" };
      const lines = rows.map((c) => `• ${c.name}: ${c.health === "at_risk" ? "AT RISK" : "watch"}`);
      return {
        answer: `${rows.length} customer(s) need attention:\n${lines.join("\n")}\n\nHealth combines overdue invoices, escalated tickets, and overdue project work.`,
        sources: rows.map((c) => ({ label: c.name, href: `/customers/companies/${c.id}` })),
        confidence: "medium",
      };
    },
  },
  {
    id: "today_priorities",
    patterns: [/what.*(today|priorit|focus|attention)/, /todays? (tasks|priorities)/, /what should i do/, /what needs (me|attention)/],
    example: "What needs my attention today?",
    resolve: () => {
      const t = today();
      const openTasks = db().select().from(tasks).all().filter((x) => x.status === "open" && x.dueDate && x.dueDate <= t);
      const pendingApr = db().select().from(approvals).where(eq(approvals.status, "pending")).all();
      const escalated = db().select().from(tickets).all().filter((tk) => tk.escalated === 1 && tk.status !== "resolved" && tk.status !== "closed");
      const lines: string[] = [];
      if (escalated.length) lines.push(`• ${escalated.length} escalated ticket(s) open: ${escalated.map((x) => `"${x.subject}"`).join(", ")}`);
      if (pendingApr.length) lines.push(`• ${pendingApr.length} agent action(s) waiting for approval`);
      if (openTasks.length) lines.push(`• ${openTasks.length} task(s) due or overdue: ${openTasks.slice(0, 5).map((x) => x.title).join("; ")}`);
      if (!lines.length) lines.push("• Nothing urgent — pipeline and delivery are moving.");
      return {
        answer: `Today's priorities:\n${lines.join("\n")}`,
        sources: [
          { label: "Home", href: "/" },
          ...(pendingApr.length ? [{ label: "Approvals", href: "/agents/approvals" }] : []),
        ],
        confidence: "high",
      };
    },
  },
  {
    id: "outstanding_balance",
    patterns: [/outstanding|owed to us|receivables?|unpaid invoices?/],
    example: "What's our outstanding balance?",
    resolve: () => {
      const rows = db().select().from(invoices).all().filter((i) => i.status === "sent" || i.status === "overdue");
      const total = rows.reduce((s, i) => s + invoiceTotals(i.id).balanceCents, 0);
      const overdue = rows.filter((i) => i.status === "overdue");
      const overdueTotal = overdue.reduce((s, i) => s + invoiceTotals(i.id).balanceCents, 0);
      return {
        answer: `${formatMoney(total)} outstanding across ${rows.length} unpaid invoice(s), of which ${formatMoney(overdueTotal)} (${overdue.length} invoice(s)) is overdue.`,
        sources: rows.map((i) => ({ label: `Invoice ${i.number}`, href: `/money/invoices/${i.id}` })),
        confidence: "high",
      };
    },
  },
  {
    id: "win_rate",
    patterns: [/win rate/, /why.*(lose|lost)/, /(won|lost).*deals?/, /how many deals.*(won|lost)/],
    example: "What's our win rate and why do we lose deals?",
    resolve: () => {
      const stageRows = db().select().from(stages).all();
      const won = stageRows.find((s) => s.kind === "won");
      const lost = stageRows.find((s) => s.kind === "lost");
      const allDeals = db().select().from(deals).all();
      const wonDeals = allDeals.filter((d) => d.stageId === won?.id);
      const lostDeals = allDeals.filter((d) => d.stageId === lost?.id);
      const closed = wonDeals.length + lostDeals.length;
      const rate = closed ? Math.round((wonDeals.length / closed) * 100) : 0;
      const reasons = lostDeals.map((d) => `• ${d.name}: ${d.lostReason ?? "no reason recorded"}`);
      return {
        answer:
          `Win rate: ${rate}% (${wonDeals.length} won, ${lostDeals.length} lost, ${formatMoney(wonDeals.reduce((s, d) => s + d.valueCents, 0))} in won value).` +
          (reasons.length ? `\n\nLost deal reasons:\n${reasons.join("\n")}` : ""),
        sources: [...wonDeals, ...lostDeals].map((d) => ({ label: d.name, href: `/sales/${d.id}` })),
        confidence: "high",
      };
    },
  },
  {
    id: "recent_changes",
    patterns: [/what (changed|happened)/, /recent (activity|changes|events)/, /catch me up/],
    example: "What changed recently?",
    resolve: () => {
      const rows = db().select().from(events).all().slice(-12).reverse();
      if (!rows.length) return { answer: "No recorded activity yet.", sources: [], confidence: "high" };
      const lines = rows.map((e) => {
        const p = e.payload as Record<string, unknown>;
        return `• ${e.createdAt.slice(0, 16).replace("T", " ")} — ${e.type}${p?.name ? `: ${p.name}` : p?.subject ? `: ${p.subject}` : p?.number ? `: ${p.number}` : ""} (${e.actorType})`;
      });
      return { answer: `Recent activity:\n${lines.join("\n")}`, sources: [{ label: "Audit log", href: "/audit" }], confidence: "high" };
    },
  },
  {
    id: "upcoming_milestones",
    patterns: [/upcoming (milestones?|deadlines?)/, /milestones?.*(due|coming|next)/, /project deadlines?/, /delivery status/],
    example: "What milestones are coming up?",
    resolve: () => {
      const t = today();
      const rows = db().select().from(milestones).all().filter((m) => m.status === "pending");
      if (!rows.length) return { answer: "No pending milestones.", sources: [], confidence: "high" };
      const lines = rows
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
        .map((m) => {
          const project = db().select().from(projects).where(eq(projects.id, m.projectId)).get();
          const late = m.dueDate && m.dueDate < t;
          return `• ${m.name} (${project?.name ?? "?"}) — due ${m.dueDate ?? "unscheduled"}${late ? " ⚠ OVERDUE" : ""}`;
        });
      return {
        answer: `Pending milestones:\n${lines.join("\n")}`,
        sources: rows.map((m) => ({ label: m.name, href: `/delivery/${m.projectId}` })),
        confidence: "high",
      };
    },
  },
];

export function supportedQuestions(): string[] {
  return intents.map((i) => i.example);
}

/** Compact structured snapshot for LLM mode — the model reasons over live data, not embeddings. */
function businessSnapshot(): Record<string, unknown> {
  const d = db();
  const stageRows = d.select().from(stages).all();
  return {
    generatedAt: now(),
    deals: d.select().from(deals).all().map((x) => ({ id: x.id, name: x.name, valueCents: x.valueCents, stage: stageRows.find((s) => s.id === x.stageId)?.name, priority: x.priority, source: x.source, expectedClose: x.expectedClose, stageChangedAt: x.stageChangedAt, companyId: x.companyId })),
    companies: d.select().from(companies).all().map((x) => ({ id: x.id, name: x.name, health: x.health, industry: x.industry })),
    people: d.select().from(people).all().map((x) => ({ id: x.id, name: personName(x), companyId: x.companyId, title: x.title })),
    invoices: d.select().from(invoices).all().map((x) => ({ id: x.id, number: x.number, status: x.status, dueDate: x.dueDate, companyId: x.companyId, ...invoiceTotals(x.id) })),
    projects: d.select().from(projects).all().map((x) => ({ id: x.id, name: x.name, status: x.status, dueDate: x.dueDate, companyId: x.companyId })),
    milestones: d.select().from(milestones).all(),
    openTasks: d.select().from(tasks).all().filter((x) => x.status === "open"),
    tickets: d.select().from(tickets).all().map((x) => ({ id: x.id, subject: x.subject, status: x.status, priority: x.priority, escalated: x.escalated, companyId: x.companyId })),
  };
}

export async function ask(question: string): Promise<AskAnswer> {
  const q = question.toLowerCase().trim();
  const freshness = now();
  for (const intent of intents) {
    if (intent.patterns.some((p) => p.test(q))) {
      const r = intent.resolve();
      return { question, ...r, freshness, engine: "rules" };
    }
  }
  // LLM fallback when configured
  if (aiProviderStatus().provider === "anthropic") {
    const draft = await generateDraft({ kind: "ask", context: { question, snapshot: businessSnapshot() } });
    return { question, answer: draft.text, sources: [{ label: "Live business snapshot", href: "/analytics" }], confidence: "medium", freshness, engine: "llm" };
  }
  return {
    question,
    answer: "I couldn't match that question to the data I can query offline. Try one of the supported questions, or set ANTHROPIC_API_KEY to enable free-form questions.",
    sources: [],
    confidence: "low",
    freshness,
    engine: "rules",
    suggestions: supportedQuestions(),
  };
}
