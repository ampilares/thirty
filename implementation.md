# Thirty — Implementation Plan

Execution plan for [specifications.md](specifications.md). Milestones are ordered so the app is runnable from M0 onward and each milestone lands a demonstrable vertical slice. Checkboxes are updated as work completes.

**Stack:** Next.js 15 (App Router, TS), Tailwind v4, SQLite (better-sqlite3) + Drizzle ORM, Vitest.

**Status: ✅ Complete — all milestones done, acceptance criteria §5 verified end-to-end (2026-07-11).**

---

## M0 — Scaffold & foundation

- [x] Scaffold Next.js 15 app manually (TS, App Router, Tailwind v4, src dir) — hand-rolled instead of `create-next-app` because the repo was non-empty
- [x] Install deps: `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, `vitest`
- [x] Drizzle schema for all tables (§4.3), DB client singleton, migration push
- [x] Seed script: demo workspace "Coastal Digital" (agency) — companies, people, pipeline+stages, deals across stages, products, quotes, invoices (incl. overdue), payments, projects/milestones/tasks (incl. overdue), tickets+messages, notes, 5 agents, automation templates, custom field defs
- [x] `npm run db:reset` regenerates the database + seed

## M1 — Core services, audit, events

- [x] `lib/audit.ts` — audit writer; `lib/events.ts` — emit → persist → dispatch registry
- [x] `lib/core/*` services: people, companies, deals, projects, tasks/milestones, products, quotes, invoices/payments, tickets, notes — every mutation takes an `Actor`, writes audit, emits typed events
- [x] Money math (cents, totals, balance, overdue derivation) + unit tests
- [x] Overdue sweep (invoices, health refresh, daily agent runs) run on app touch (lazy cron, ≤1/min)

## M2 — App shell & Customers

- [x] Layout: sidebar nav, top bar with Ask entry, page chrome, shared UI primitives
- [x] Companies & People list + create forms (with custom fields rendering) + duplicate warning banners
- [x] Record pages with unified timeline (deals, stage changes, quotes, invoices, payments, tickets, projects, notes) + related records + add-note
- [x] Customer health computation + badge + reasons banner

## M3 — Sales

- [x] Deals kanban board grouped by stage with in-card stage move; create deal form
- [x] Stage-change events on timeline; lost-reason capture
- [x] Won handoff: auto-create project linked to deal (value, customer, scope carried)
- [x] Public lead capture endpoint `POST /api/v1/forms/lead` (with email dedupe)

## M4 — Delivery

- [x] Projects list + project page (milestones, tasks, progress %, overdue flags)
- [x] Task/milestone create, status transitions, events

## M5 — Money

- [x] Products catalogue CRUD (create; list)
- [x] Quotes: builder with line items, status flow, accept → deal Won option
- [x] Invoices: from quote/manual, line items, status flow, overdue detection
- [x] Payments: record against invoice, partials, auto-Paid at zero balance
- [x] Money overview page (collected, outstanding, overdue, invoiced)

## M6 — Support

- [x] Tickets list + ticket page with message thread + internal notes
- [x] Priority→SLA mapping, escalation flag, resolve/reopen with health effects

## M7 — Automation engine & UI

- [x] Engine: trigger matching, condition eval, action handlers (create task, add note/tag, create ticket, log message send, escalate, request approval, update field), `execute` vs `simulate`
- [x] Versioning (publish snapshots), pause/resume, run + step logs
- [x] Automations UI: list, structured builder, simulate button (recent event or synthesized sample → predicted effects), run history
- [x] 4 templates shipped (lead response, won→kickoff, overdue reminder, ticket escalation)
- [x] Engine unit tests incl. simulation zero-writes guarantee

## M8 — Agents & approvals

- [x] Agent runner + run ledger (evidence, actions, cost estimate, status)
- [x] Chief of Staff (daily briefing), Intake (lead triage/route/dedupe), Sales (stale-deal follow-up drafts), Delivery Coordinator (due-date watch + recovery tasks), Support (ticket triage + suggested reply)
- [x] Approvals queue UI (preview → approve/reject → execute via core services, correlated in audit)
- [x] Agent policies UI (enable, tier cap, daily budget) + run detail pages with evidence links
- [x] AI gateway (`heuristic` provider default; `anthropic` provider when key set)
- [x] Agent rule unit tests

## M9 — Ask Business & Analytics

- [x] Ask engine: 12 intents, answers with sources/confidence/freshness; graceful fallback with suggestions; LLM pass-through when key set
- [x] Ask page + top-bar entry
- [x] Analytics page: sales/money/delivery/support metrics + AI-trust panel, CSS bar charts

## M10 — Home, Audit, Settings, API

- [x] Owner Command Centre (briefing, stats, at-risk deals, overdue invoices, delivery exceptions, health/escalations, approvals inline, automation failures)
- [x] Audit page with actor/entity filters + before/after diff expansion
- [x] Settings: custom fields editor, stage renaming, AI provider status, export JSON, demo reset
- [x] REST API v1 (list/get + create for core resources, audit, ask, export) sharing core services

## M11 — Verification & polish

- [x] `npm test` green (18 tests); `npm run build` clean (31 routes)
- [x] Browser walkthrough of acceptance criteria §5:
  - Lead captured via public API → automation created response task, Intake agent classified it
  - Deal moved through pipeline → quote created → sent → accepted → deal Won → project auto-created + kickoff tasks → invoice generated from quote → payment recorded → status Paid, balance $0
  - New urgent ticket → Support agent triage (urgent/Bug/escalated/4h SLA) → drafted reply approved in UI → posted to thread as agent, attributed "approved by Alex Reeve"
  - Automation simulated (zero writes, predicted steps logged) then published as v2
  - 11 Ask questions answered offline with sources + confidence
  - Audit log contains all five actor types (user/agent/automation/api/system) with diffs
- [x] README: what/why/run/architecture
- [x] Final commit

---

## Working agreements

- Commit at each milestone boundary with a descriptive message.
- Any spec deviation discovered mid-build gets recorded in this file under "Deviations".

## Deviations

1. **Simulation sampling** — when no historical event exists for a trigger, simulation synthesizes a representative sample payload (labelled SAMPLE) instead of failing; real events are preferred when present.
2. **Task checkboxes on deal/project pages double as toggle forms** — no separate edit dialogs in MVP.
3. **`update_field` automation action limited to tickets** in MVP (safe field set); other entity types report "skipped" in the run log rather than writing.
4. **Daily agent runs are lazily scheduled** (first page touch of the day) rather than a background cron — consistent with the zero-infrastructure SQLite deployment.
