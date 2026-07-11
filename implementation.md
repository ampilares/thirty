# Thirty — Implementation Plan

Execution plan for [specifications.md](specifications.md). Milestones are ordered so the app is runnable from M0 onward and each milestone lands a demonstrable vertical slice. Checkboxes are updated as work completes.

**Stack:** Next.js 15 (App Router, TS), Tailwind v4, SQLite (better-sqlite3) + Drizzle ORM, Vitest.

---

## M0 — Scaffold & foundation

- [x] Scaffold Next.js 15 app manually (TS, App Router, Tailwind v4, src dir) — hand-rolled instead of `create-next-app` because the repo was non-empty
- [x] Install deps: `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, `vitest`
- [x] Drizzle schema for all tables (§4.3), DB client singleton, migration push
- [x] Seed script: demo workspace "Coastal Digital" (agency) — companies, people, pipeline+stages, deals across stages, products, quotes, invoices (incl. overdue), payments, projects/milestones/tasks (incl. overdue), tickets+messages, notes, 5 agents, automation templates, custom field defs
- [x] `npm run db:reset` regenerates the database + seed

## M1 — Core services, audit, events

- [ ] `lib/audit.ts` — audit writer; `lib/events.ts` — emit → persist → dispatch registry
- [ ] `lib/core/*` services: people, companies, deals, projects, tasks/milestones, products, quotes, invoices/payments, tickets, notes — every mutation takes an `Actor`, writes audit, emits typed events
- [ ] Money math (cents, totals, balance, overdue derivation) + unit tests
- [ ] Overdue sweep (invoices, tasks, milestones, SLA) run on app touch (lazy cron)

## M2 — App shell & Customers

- [ ] Layout: sidebar nav, top bar with Ask entry, page chrome, shared UI primitives (table, badge, card, dialog/forms via server actions)
- [ ] Companies & People list + create/edit (with custom fields rendering) + duplicate warning
- [ ] Record pages with unified timeline (aggregated from notes, audit-relevant events, deals, quotes, invoices, payments, tickets) + related records + add-note
- [ ] Customer health computation + badge

## M3 — Sales

- [ ] Deals list + kanban board grouped by stage; stage move; create/edit deal
- [ ] Stage-change events on timeline; lost-reason capture
- [ ] Won handoff: auto-create project (+kickoff tasks) linked to deal
- [ ] Public lead capture endpoint `POST /api/v1/forms/lead`

## M4 — Delivery

- [ ] Projects list + project page (milestones, tasks, progress %, overdue flags)
- [ ] Task/milestone CRUD, status transitions, events

## M5 — Money

- [ ] Products catalogue CRUD
- [ ] Quotes: builder with line items, status flow, accept → deal Won option
- [ ] Invoices: from quote/project/manual, line items, status flow, overdue detection
- [ ] Payments: record against invoice, partials, auto-Paid
- [ ] Money overview page (outstanding, overdue, collected)

## M6 — Support

- [ ] Tickets list + ticket page with message thread + internal notes
- [ ] Priority→SLA mapping, escalation flag, resolve/reopen with health effects

## M7 — Automation engine & UI

- [ ] Engine: trigger matching, condition eval (field/op/value on payload), action handlers (create task, update field, add tag/note, create ticket, log message send, request approval), `execute` vs `simulate`
- [ ] Versioning (publish snapshots), pause/resume, run + step logs
- [ ] Automations UI: list, structured builder, simulate panel (pick sample record → predicted effects), run history
- [ ] Ship 4 templates (lead response, won→kickoff, overdue reminder, ticket escalation)
- [ ] Engine unit tests

## M8 — Agents & approvals

- [ ] Agent runner + run ledger (evidence, actions, cost estimate, status)
- [ ] Chief of Staff (daily briefing), Intake (lead triage/route), Sales (stale-deal follow-ups + drafts), Delivery Coordinator (due-date watch), Support (ticket triage + suggested reply)
- [ ] Approvals queue UI (preview/diff → approve/reject → execute via core services)
- [ ] Agent policies UI (enable, tier cap, daily budget); agent runs UI
- [ ] AI gateway (`heuristic` provider default; `anthropic` provider when key set) for briefing narrative + drafts
- [ ] Agent rule unit tests

## M9 — Ask Business & Analytics

- [ ] Ask engine: question catalogue (≥10 intents), entity linking, answers with sources/confidence/freshness + tests
- [ ] Ask page + command-bar hook; LLM mode pass-through with citations
- [ ] Analytics page: metrics + lightweight SVG charts (§3.11)

## M10 — Home, Audit, Settings, API

- [ ] Owner Command Centre assembling briefing, risk panels, approvals, failures (§3.2)
- [ ] Audit page with filters + diff expansion
- [ ] Settings: workspace, stage editor, custom fields editor, agent policies link, export JSON, demo reset
- [ ] REST API v1 routes (CRUD set + audit + ask) sharing core services

## M11 — Verification & polish

- [ ] `npm test` green; `npm run build` clean
- [ ] Browser walkthrough of acceptance criteria §5 (J2 lead-to-cash end-to-end, agent approval flow, automation simulate/publish, Ask offline answers)
- [ ] README: what/why/run/architecture
- [ ] Final commit

---

## Working agreements

- Commit at each milestone boundary with a descriptive message.
- Any spec deviation discovered mid-build gets recorded in this file under "Deviations".

## Deviations

*(none yet)*
