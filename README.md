# Thirty

**The AI-native operating system for service businesses — from first lead to final payment and ongoing support.**

Thirty is an MVP implementation of the [PRD](references/PRD.md) for an AI-native CRM and business-operations platform, scoped by [specifications.md](specifications.md) and built per [implementation.md](implementation.md). One system owns the complete customer lifecycle:

**Lead → Opportunity → Quote → Project → Invoice / Payment → Support → Retention**

Sales, delivery, money, and support are not separate modules — they are related states in one business context that humans and policy-controlled AI agents operate together.

## Run it

```bash
npm install
npm run db:reset   # create schema + seed the "Coastal Digital" demo workspace
npm run dev        # http://localhost:3000
npm test           # engine unit tests (run db:reset first)
```

Works fully offline. Optionally create `.env.local` with `ANTHROPIC_API_KEY` (and `THIRTY_AI_MODEL`) to upgrade agent drafting, briefings, and free-form Ask questions from deterministic rules to an LLM — the approval/audit machinery is identical in both modes.

## What's inside

| Area | What it does |
| --- | --- |
| **Home** | Owner Command Centre: daily agent briefing, at-risk deals, overdue invoices, delivery exceptions, escalations, pending approvals |
| **Customers** | People & companies, custom fields, duplicate detection, computed health, and a unified timeline joining every module (CORE-03) |
| **Sales** | Kanban pipeline; winning a deal auto-creates the delivery project with scope/value carried over (OPS-01) |
| **Delivery** | Projects, milestones, tasks, progress, overdue flags |
| **Money** | Catalogue, quotes → acceptance (can win the deal) → invoices → payments; automatic overdue detection (FIN-01) |
| **Support** | Tickets with SLA-by-priority, AI triage, drafted replies gated behind approval (SUP-01) |
| **Automations** | Trigger → conditions → actions with zero-side-effect simulation, immutable versions, pause/resume, per-step run logs (AUT-01..03) |
| **Agents** | Five agents (Chief of Staff, Intake, Sales, Delivery, Support) with autonomy tiers, daily budgets, evidence-backed run ledger, approvals queue (AGT-01/02) |
| **Ask** | Natural-language questions answered from live data with linked sources, confidence, and freshness (AI-01) |
| **Analytics** | Live operational metrics incl. AI-trust measures (acceptance rate, spend ledger) |
| **Audit** | Every write — human, agent, automation, API — with actor, diff, and correlation (ADM-01) |
| **API** | `/api/v1/*` REST + public lead-capture endpoint sharing the same audited write path |

## Architecture

Next.js 15 modular monolith over SQLite (Drizzle). The load-bearing invariant: **no route touches the database directly** — all writes flow through `src/lib/core/*` services, which attribute an actor, write the audit ledger, and emit events; the event bus dispatches to the automation engine and agents, which act through those same services. Agents can't do anything a human couldn't, and everything is traceable.

```
src/lib/
  core/         # customers, sales, delivery, money, support — the single write path
  audit.ts      # actor-attributed audit ledger
  events.ts     # persisted event bus (with cascade guard)
  automations/  # trigger/condition/action engine + simulation + versioning
  agents/       # 5 agents, autonomy tiers, budgets, approvals
  ai/gateway.ts # provider-agnostic: deterministic rules ↔ Anthropic API
  ask/          # NL question engine over live data
```
