# PRD v2.0 — AI-Native CRM and Business Operations Platform for SMBs

> Source: ChatGPT conversation "PRD for AI CRM" (https://chatgpt.com/c/6a519b31-66a4-83ec-bb94-2d9799cf86bd), extracted 2026-07-11.
> Text is verbatim from the conversation; heading markup added for readability. Inline citation labels from the original (e.g. "Attio +3", "G2") are retained where they appeared.

Status: Founder review
Research date: 11 July 2026
Working category: AI-native customer and operations OS
Primary inspirations: Attio, Twenty, GoHighLevel
Recommended initial market: Service-based small businesses with 2–50 employees

## 1. Executive decision

Build an AI-native CRM that owns the complete customer lifecycle, from initial demand generation through sales, service delivery, payment, support, retention, and reactivation.

The product should not be positioned as "a CRM with an AI assistant." Its foundation should be:

- A unified, real-time business context graph.
- Flexible objects, processes, and relationships.
- Policy-controlled agents that can read, reason, and act.
- A visual automation system that humans and AI can build together.
- An extensible integration platform with APIs, webhooks, MCP, connector creation, and embedded apps.
- Opinionated business templates that make the platform usable without a RevOps administrator.

### Recommended positioning

The AI-native operating system for service businesses—from first lead to final payment and ongoing support.

### Recommended beachhead

Start with businesses whose customer journey follows a broadly repeatable pattern:

1. Marketing or referrals generate enquiries.
2. Leads are qualified and converted.
3. A quote, proposal, or agreement is issued.
4. Work is delivered as a project, job, engagement, or recurring service.
5. The customer is invoiced or charged.
6. Support and retention continue after delivery.

Initial verticals should include agencies, consultancies, IT service providers, professional services firms, and other B2B service businesses. Inventory-heavy retail, manufacturing, healthcare, construction ERP, and other highly regulated or operationally specialised sectors should remain outside the first release.

### Central product thesis

Small businesses do not need another collection of disconnected modules. They need one shared operational context and agents capable of moving work across the entire customer lifecycle under clear permissions, budgets, and approval policies.

The recommended product combines:

- Attio's flexible data model, context architecture, agentic interaction model, and modern developer platform.
- GoHighLevel's breadth, packaged SMB workflows, communications, lead capture, and lead-to-cash orientation.
- Twenty's open architecture, metadata-driven platform, self-hosting potential, and CRM-as-code philosophy.

Attio currently presents itself as an agentic revenue system covering pipeline generation, selling, forecasting, retention, and expansion. Its architecture demonstrates that AI-native CRM requires a consistent data context, permission-aware tools, and deeply embedded agent experiences—not an external chatbot layered over records. [Attio +3]

## 2. Assumptions used in this PRD

| Decision | Working assumption |
| --- | --- |
| Customer size | 2–50 employees initially; up to 250 later |
| Customer type | Service-based SMBs |
| Buyer | Owner, managing director, operations leader, or revenue leader |
| Deployment | Multi-tenant cloud SaaS |
| Mobile | Responsive web at launch; native mobile after core workflows stabilise |
| Accounting | Integrate with accounting systems rather than build a general ledger |
| Communications | Native shared inbox and orchestration; underlying delivery may use external providers |
| AI autonomy | Risk-based autonomy with configurable human approval |
| Customisation | Template-first, then progressively customisable |
| Extensibility | Public API, webhooks, MCP, no-code integration builder, and application SDK |
| Geographic launch | English-speaking markets, with localisation architecture from the start |
| Primary business model | Workspace subscription plus transparent usage charges |

# Part I — Attio research synthesis

## 3. Why Attio qualifies as AI-native

Attio provides several architectural patterns that should materially influence this product.

### 3.1 Flexible objects and processes

Attio separates domain entities from the processes in which they participate. Objects represent entities such as people, companies, and deals, while lists organise those records around a particular business process. Attributes and relationships can be customised rather than being limited to a rigid CRM schema. [Attio Docs]

Product implication:
The new platform should use the same broad separation:

- Objects describe what something is.
- Processes describe how it moves through the business.
- Views describe how a user wants to inspect it.
- Automations describe what should happen.
- Agents describe who or what is responsible for acting.

This is preferable to hard-coding separate, disconnected tables for leads, clients, jobs, tickets, and invoices.

### 3.2 Universal business context

Attio's Universal Context architecture combines structured CRM data with communications, calls, notes, product information, billing signals, and connected-system data. Its engineering approach emphasises synchronisation between transactional data, full-text search, and semantic retrieval so that agents do not reason against a stale, detached vector index. [Attio]

Product implication:
Every agent should operate on a common Business Context Plane containing:

- Structured records and relationships.
- Email, messages, calls, meetings, and notes.
- Documents and files.
- Marketing interactions.
- Sales activity.
- Work-delivery events.
- Invoice and payment status.
- Support history.
- Connected application data.
- Provenance, timestamps, confidence, and permissions.

This context plane is the most important architectural requirement in the PRD.

### 3.3 AI embedded in the application rather than added beside it

Ask Attio is embedded in the product interface and receives screen context, user permissions, available tools, and workspace configuration dynamically. Attio builds the agent's permitted tool registry for each interaction rather than giving every model unrestricted access to every operation. [Attio]

Product implication:
AI should appear throughout the product:

- On records.
- In lists and dashboards.
- Within inboxes.
- During pipeline reviews.
- Inside projects and jobs.
- On invoices and support tickets.
- In the automation builder.
- In the integration builder.
- In a global command interface.

The system should know what the user is looking at without requiring them to restate all context.

### 3.4 Agent engineering, evaluation, and cost attribution

Attio's internal AI framework includes model-provider abstraction, structured outputs, agent traces, evaluation suites, cost attribution by workspace and feature, and comparisons across model variants. [Attio +1]

Product implication:
Agent reliability cannot be treated as an application-level afterthought. The platform requires:

- A model gateway.
- Typed tool contracts.
- Prompt and agent versioning.
- Evaluation datasets.
- Production traces.
- Cost and latency measurements.
- Model fallback.
- Per-agent budgets.
- Failure classification.
- Human feedback and correction loops.

### 3.5 Visual workflows and agent orchestration

Attio's workflow system supports event, schedule, webhook, and manual triggers; branching; loops; record actions; third-party integrations; JavaScript; HTTP requests; natural-language workflow creation; workflow versions; run history; and custom agent blocks. Runs expose execution details, credits, and per-step results. [Attio +4]

Product implication:
The automation builder should match this flexibility but improve its suitability for nontechnical SMB users through:

- Business-process templates.
- Simulation before publishing.
- Version comparison and rollback.
- Replay from a failed step.
- Native idempotency.
- Automatic loop detection.
- Cost forecasting.
- Spending caps.
- Plain-language explanations.
- Transactional groups and compensating actions.
- Safer external communication and financial actions.

### 3.6 Developer platform and MCP

Attio offers a REST API, OAuth, webhooks, hosted MCP access, and a TypeScript/React application SDK for creating embedded interfaces, server-side functions, authenticated connections, and marketplace applications. Its MCP design uses user-scoped OAuth permissions, confirmation for writes, auditability, and a smaller set of agent-friendly tools rather than mechanically exposing every REST endpoint. [Attio +3, Attio Docs +3]

Product implication:
The integration platform needs two distinct surfaces:

- A conventional API designed for developers and deterministic software.
- Agent-oriented tools designed for LLM planning, compact context, and safe execution.

MCP should not merely wrap the REST API.

## 4. Where Attio leaves room for differentiation

### 4.1 First-party scope remains revenue-centred

Attio's core product is centred on revenue and customer relationship workflows. Support and billing are possible through custom modelling and partner applications, but its marketplace listings show that many support, billing, CPQ, and finance functions are supplied through external products. [Attio +2]

Opportunity:
Create a coherent first-party lifecycle linking:

Lead → Opportunity → Proposal / Contract → Project or Job → Milestone → Invoice / Payment → Support Ticket → Renewal / Expansion

All of these should live in one customer context rather than being separate applications joined by fragile synchronisation.

### 4.2 Flexibility creates a blank-page problem

Users generally praise Attio's interface, adaptability, and modern approach. However, independent reviews also mention learning the objects/lists model, setup effort, missing integrations, reporting limitations, and the need for more plug-and-play workflows. [G2 +3]

Opportunity:
Adopt the flexible core but place an opinionated layer above it:

- Business-type onboarding.
- Preconfigured objects and processes.
- Role-based dashboards.
- Ready-made agents.
- Recommended automations.
- Sample reports.
- Guided data migration.
- Progressive disclosure of advanced configuration.

The platform should be usable before the customer understands its internal data model.

### 4.3 Integration breadth and depth remain a source of friction

Attio's application platform is expanding rapidly, but user feedback still identifies integration availability and manual setup as recurring limitations. [G2 +1]

Opportunity:
Make integration creation a core product experience. A user should be able to describe an application, import its API specification, authenticate it, and have AI generate proposed triggers, actions, field mappings, tests, and documentation.

### 4.4 Credit systems can undermine automation confidence

Attio currently combines seat-based plans with seat and workspace credits. At least one independent SMB review reports stopping automations after unexpected credit consumption and uncertainty about control or recovery. [Attio +1]

Opportunity:
Do not expose customers to an opaque credit abstraction. Show:

- Estimated dollar cost before publishing.
- Estimated cost per workflow run.
- Actual cost by customer, workflow, agent, and outcome.
- Hard budgets.
- Automatic pause thresholds.
- An explicit reservation before expensive work begins.
- No workflow silently stopping halfway because usage ran out.

### 4.5 Research conclusion

The product should adopt Attio's architectural principles but not reproduce Attio's product boundary.

| Attio pattern | Product response |
| --- | --- |
| Flexible objects and lists | Adopt, but add vertical and lifecycle templates |
| Universal Context | Extend through sales, delivery, finance, and support |
| Embedded Ask experience | Expand into an owner command centre that can act across the business |
| Permission-aware agents | Add explicit agent identities, risk tiers, budgets, and approval policies |
| Powerful workflows | Add simulation, replay, compensation, cost planning, and SMB templates |
| API, MCP, and App SDK | Add an AI-assisted connector studio and two-way sync engine |
| Revenue-centric scope | Own the full lead-to-cash-to-delivery-to-support lifecycle |
| Per-seat and credit pricing | Use workspace-first packaging with transparent metering |

# Part II — Product definition

## 5. Vision

Enable a small business to operate with the coordination, responsiveness, and analytical capability of a much larger organisation—without needing separate CRM, marketing automation, project management, billing orchestration, customer support, integration, and business-intelligence teams.

## 6. Mission

Provide one intelligent system that:

- Understands the entire business context.
- Identifies what requires attention.
- Recommends the next action.
- Completes routine work autonomously.
- Coordinates humans when judgement is required.
- Keeps every customer-facing and operational action traceable.

## 7. Product promise

Connect the business once. The platform organises the customer lifecycle, builds the necessary workflows, and gives each team an AI coworker that can safely move work forward.

## 8. Problem statement

Small businesses commonly manage the customer journey across multiple disconnected systems:

- Advertising and lead forms.
- Email and messaging.
- Contact databases.
- Sales pipelines.
- Proposals and contracts.
- Project or job management.
- Invoices and payments.
- Customer support.
- Reporting.
- Automation platforms.

This creates duplicate data, missed handoffs, inconsistent customer experiences, poor visibility, repetitive administration, and automation that breaks whenever one system or field changes.

Existing CRM products tend to fall into one of four categories:

1. Mature but expensive and administratively demanding suites.
2. All-in-one products with broad feature coverage but inconsistent data and UX.
3. Flexible databases that require substantial setup.
4. AI assistants that answer questions but do not reliably execute business processes.

The proposed product addresses these limitations through a single operational context and a policy-controlled execution layer.

## 9. Target customers

### 9.1 Primary ideal customer profile

A service-based business that:

- Has 2–50 employees.
- Has no dedicated CRM administrator or automation engineer.
- Sells through enquiries, consultations, proposals, or recurring contracts.
- Delivers work through projects, engagements, appointments, or jobs.
- Uses several disconnected SaaS products.
- Has repeatable but inconsistently followed operating processes.
- Wants automation but is concerned about complexity and AI reliability.
- Values an integrated system more than best-in-class depth in every individual module.

### 9.2 Initial vertical templates

- Marketing and creative agencies
- Consulting and advisory firms
- IT service providers and MSPs
- Professional service firms
- B2B recurring-service businesses
- Simple appointment or field-service businesses

A horizontal platform should remain underneath these templates, but launch messaging and onboarding should be verticalised.

### 9.3 Out-of-scope initial segments

- Inventory-intensive retail and wholesale.
- Manufacturing and supply-chain operations.
- Full construction ERP.
- Clinical healthcare workflows.
- Highly regulated financial decisioning.
- Complex payroll and workforce management.
- Full legal practice management.
- Large enterprise sales organisations.

## 10. Personas

| Persona | Primary need |
| --- | --- |
| Owner or managing director | Understand the business, know what needs attention, reduce administrative overhead |
| Growth lead | Capture, segment, nurture, and attribute demand |
| Salesperson | Prioritise leads, maintain relationships, close deals, and reduce data entry |
| Operations or project lead | Convert sold work into a controlled delivery plan |
| Service team member | Know what to do, when, for whom, and with what context |
| Finance administrator | Issue invoices, track payments, and manage exceptions |
| Support or customer-success lead | Resolve issues and identify retention or expansion risk |
| Automation builder | Create processes without maintaining an external integration platform |
| Developer or implementation partner | Extend the product through APIs, applications, and connectors |

In very small companies, one person may hold several of these roles. The experience must therefore organise work around outcomes, not organisational departments.

## 11. Core jobs to be done

1. Show the owner what is happening across the business.
2. Capture every prospective customer without manual data entry.
3. Qualify and route leads consistently.
4. Maintain complete relationship context.
5. Move deals forward and follow up at the right time.
6. Generate proposals, agreements, and payment requests.
7. Transfer sold work into delivery without re-entering data.
8. Coordinate projects, jobs, milestones, and client communication.
9. Invoice and collect payments on time.
10. Resolve customer questions and support requests.
11. Identify churn, renewal, referral, and expansion opportunities.
12. Build and maintain automations without a specialist.
13. Connect new systems without waiting for a vendor-built integration.
14. Ask questions about the business and receive evidence-backed answers.
15. Delegate routine work to agents while maintaining control.

# Part III — Product principles

## 12. Design principles

### 12.1 Opinionated on day one, programmable forever

New workspaces begin with usable processes, dashboards, and agents. Advanced users can change the underlying objects, relationships, views, workflows, and applications.

### 12.2 One customer context

A customer should not have separate identities in sales, delivery, billing, and support. All lifecycle records should resolve to a canonical person, company, household, or account.

### 12.3 Outcomes before modules

The interface should emphasise business outcomes such as:

- Leads requiring attention.
- Proposals waiting for approval.
- Work at risk.
- Invoices overdue.
- Customers needing support.
- Renewals approaching.

### 12.4 AI actions are permissioned actions

Agents receive identities, scopes, budgets, and policies. They cannot access more data or perform more actions than explicitly permitted.

### 12.5 Explain before acting

Users should see:

- The evidence used.
- The proposed action.
- Expected side effects.
- Estimated cost.
- Required approval.
- The result after execution.

### 12.6 Every consequential action is reversible where possible

Record updates, communications, workflow changes, and agent actions should support preview, version history, rollback, or compensating action.

### 12.7 Natural language, visual configuration, and code share one runtime

A workflow created through chat must be editable visually. A visual workflow must be exportable as a structured definition. A developer may extend the same workflow with code.

### 12.8 Progressive disclosure

A business owner should not see advanced schema, APIs, or code unless needed. Builders and developers should not be constrained by the simplified default interface.

### 12.9 Integrate broadly; replace selectively

The platform should own the customer lifecycle and operational coordination. It should not attempt to replace specialist accounting, payroll, communications infrastructure, or document-signature systems before there is clear demand.

### 12.10 Transparent economics

Every expensive AI or automation operation should expose expected and actual cost in understandable units.

# Part IV — Product experience

## 13. End-to-end customer lifecycle

Attract → Capture → Identify → Qualify → Nurture → Sell → Quote / Contract → Onboard → Deliver → Invoice / Collect → Support → Retain / Expand → Refer / Reactivate

The same customer context persists throughout every stage.

## 14. Recommended information architecture

Main navigation:

- Home
- Customers
- Growth
- Sales
- Delivery
- Money
- Support
- Automations
- Agents
- Apps
- Analytics
- Builder
- Settings

### Home: Owner Command Centre

The home experience should answer:

- What changed?
- What is at risk?
- What should happen today?
- What can an agent handle?
- What requires human judgement?
- What is likely to affect revenue or cash?
- Which customers are dissatisfied or disengaged?
- Which automations failed?
- How much AI and automation spend has been consumed?

Suggested panels:

- Daily briefing.
- Revenue and cash outlook.
- At-risk deals.
- Delivery exceptions.
- Outstanding invoices.
- Open support escalations.
- Customer-health changes.
- Agent approvals.
- Automation failures.
- Recommended actions.

## 15. Primary user journeys

### 15.1 Guided business setup

1. User selects a business template.
2. User connects Google or Microsoft email and calendar.
3. User connects accounting, payments, and communications systems.
4. AI analyses imported metadata and proposes:
   - Customer object structure.
   - Pipeline stages.
   - Service catalogue.
   - Delivery process.
   - Support categories.
   - Common automations.
   - Suggested dashboards.
5. User reviews and accepts the proposal.
6. Contacts and companies are imported and deduplicated.
7. The platform creates an initial owner briefing and recommended task list.

Target: A usable workspace within 30 minutes, without requiring the customer to understand schema design.

### 15.2 Lead to cash

1. Lead submits a form, sends a message, or is imported.
2. Identity resolution links the interaction to an existing customer or creates a new record.
3. Intake Agent enriches and classifies the lead.
4. Qualification rules and an AI assessment assign priority.
5. Sales Agent prepares a personalised response or schedules follow-up.
6. The prospect books a meeting.
7. Call Intelligence records notes and proposed next steps.
8. Proposal Agent generates a draft scope and quote.
9. A human approves the commercial terms.
10. Customer signs and pays a deposit.
11. The system creates the delivery workspace and onboarding plan.
12. Finance and owner dashboards update automatically.

### 15.3 Sale to delivery

1. A deal entering "won" triggers the appropriate project or job template.
2. Scope, stakeholders, promised dates, pricing, and documents carry forward.
3. Delivery Agent proposes milestones, tasks, responsibilities, and risks.
4. The client receives portal access and onboarding requests.
5. Internal and client communications attach to the same context.
6. Delivery status drives invoicing, alerts, and customer-health updates.
7. Scope changes create a change request or additional quote rather than remaining informal.

### 15.4 Support to retention

1. A customer contacts the business through email, chat, form, or supported messaging channel.
2. The system identifies the customer and displays their complete commercial and delivery history.
3. Support Agent classifies severity and proposes or sends an answer based on confidence and policy.
4. Complex issues are escalated with a complete summary.
5. Resolution updates customer health.
6. Repeated issues generate a root-cause insight.
7. Customer Success Agent creates a retention or expansion action when appropriate.

### 15.5 Create an automation

1. User describes the intended process in natural language.
2. AI asks only for missing decisions.
3. The system generates a visual workflow.
4. User inspects sample inputs and predicted branches.
5. The platform estimates cost and potential side effects.
6. The workflow runs in simulation mode.
7. User publishes a version.
8. Runs are monitored through a plain-language execution log.
9. Failures can be retried, replayed, or rolled back.

# Part V — Functional requirements

## 16. Capability scope by release

| Domain | P0: Initial product | P1: Expansion | P2: Platform maturity |
| --- | --- | --- | --- |
| Customer system | Flexible records, relationships, views, deduplication, timeline | Advanced identity resolution, household/account hierarchies | Cross-workspace and multi-entity models |
| Growth | Forms, source tracking, segments, basic campaigns | Landing pages, experimentation, ad audiences | Broader campaign orchestration |
| Sales | Pipeline, inbox, activities, scheduling, sequences, proposals | Forecasting, territory/routing, advanced scoring | Partner and channel sales |
| Delivery | Projects/jobs, templates, milestones, tasks, files, portal | Resource planning, time tracking, profitability | Vertical delivery applications |
| Money | Products, pricing, quotes, invoices, payment links, accounting sync | Subscriptions, change orders, collections | Advanced revenue operations |
| Support | Shared inbox, tickets, SLAs, knowledge, AI triage | Omnichannel routing and customer health | Advanced service operations |
| AI | Ask, five core agents, contextual recommendations | Agent builder, multi-agent processes | Marketplace agents and partner agents |
| Automations | Visual builder, templates, AI generation, testing, history | Subflows, compensation, advanced concurrency | Distributed orchestration and marketplace blocks |
| Integrations | Core native connectors, REST, webhooks, MCP, connector builder | App SDK and private apps | Public marketplace |
| Analytics | Operational dashboards, saved reports, natural-language analysis | Cohorts, forecasting, attribution | Embedded warehouse and advanced modelling |
| Administration | Roles, teams, audit log, agent permissions, usage budgets | SSO, advanced policy management | Enterprise governance and residency |

## 17. P0 functional requirements and acceptance criteria

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| CORE-01 | Flexible object model | Administrator can create an object, fields, relationships, validation, and views without code |
| CORE-02 | Business-process model | The same record can participate in multiple pipelines or processes without being duplicated |
| CORE-03 | Unified customer timeline | Email, meetings, calls, deals, delivery, invoices, payments, and tickets appear chronologically on one record |
| CORE-04 | Identity resolution | Imports and connected channels identify likely duplicates and support review, merge, and rollback |
| AI-01 | Ask Business | User can ask cross-module questions and receive an answer with source records, confidence, and freshness |
| AI-02 | Safe write actions | AI can propose changes, show a diff, obtain required approval, and execute through normal product APIs |
| AGT-01 | Agent identity | Every agent run records the responsible agent, initiating user, permissions, tools, cost, and actions |
| AGT-02 | Agent policy | Administrator can limit records, fields, actions, communication channels, recipients, spend, and operating hours |
| AUT-01 | Visual automation builder | User can create triggers, conditions, loops, waits, actions, approvals, AI steps, and integration steps |
| AUT-02 | Testing and simulation | Workflow can run against sample or historical data without sending messages or changing production records |
| AUT-03 | Operations | Published workflows support versioning, pause, resume, retry, cancel, replay, and failure alerts |
| INT-01 | Native connectors | Workspace can connect initial communication, payment, accounting, meeting, and storage systems |
| INT-02 | Custom connectors | Builder can create a connector from OpenAPI or manually define authentication, triggers, and actions |
| INT-03 | Developer access | Public REST API, OAuth, webhooks, API keys, SDKs, and an MCP server are available |
| SAL-01 | Sales workflow | User can manage a lead from capture through activity, meeting, proposal, agreement, and close |
| OPS-01 | Delivery workflow | Won work can create a project/job with copied scope, participants, milestones, tasks, documents, and dates |
| FIN-01 | Commercial documents | User can generate a quote, obtain acceptance, issue an invoice/payment request, and see payment state |
| SUP-01 | Customer support | Incoming messages can become tickets with priority, owner, status, SLA, AI summary, and suggested response |
| AN-01 | Operational analytics | Owner can see pipeline, booked revenue, delivery status, cash status, support load, and automation health |
| ADM-01 | Auditability | All user, automation, integration, and agent write actions are queryable in a unified audit log |
| ADM-02 | Data portability | Administrator can export standard objects, attachments, activity, and audit data in documented formats |

# Part VI — AI-native system

## 18. Definition of AI-native for this product

The platform is AI-native only when all of the following are true:

1. AI reasons over the same current data used by the application.
2. AI capabilities are present across workflows rather than confined to a chatbot.
3. Agents use typed tools and normal business APIs.
4. Permissions and policies are evaluated before every tool call.
5. AI can create and modify product configuration, not only record data.
6. Outputs include provenance, confidence, and an understandable explanation.
7. Actions are observable, budgeted, testable, and reversible.
8. The system supports multiple model providers.
9. Agent quality is evaluated continuously.
10. Human approval is determined by risk, not by a blanket all-or-nothing autonomy setting.

## 19. Business Context Plane

The Business Context Plane is the shared retrieval and reasoning layer for humans, agents, automations, and integrations.

Required inputs:

- Object records and relationships.
- Process participation and stage history.
- Email and calendar.
- Calls and transcripts.
- Messaging conversations.
- Forms and marketing events.
- Website and product signals.
- Quotes, contracts, invoices, and payments.
- Projects, jobs, milestones, and tasks.
- Support tickets and knowledge articles.
- Documents and attachments.
- Integration data.
- User-entered notes.
- Derived classifications and predictions.

Every context item must include:

- Source system.
- Source record.
- Author or actor.
- Ingestion timestamp.
- Effective timestamp.
- Version.
- Workspace and access scope.
- Confidence where inferred.
- Extraction or transformation method.
- Retention policy.
- Links back to source evidence.

Freshness requirement:

Agents must not silently use stale embeddings as if they represented current transactional state. Retrieval results should carry a source version or snapshot identifier. Consequential write decisions should revalidate relevant records immediately before execution.

## 20. Ask Business

Ask Business is the global command and analysis interface.

Read capabilities:

- "Which deals are likely to slip this month?"
- "Why did cash collection slow down?"
- "Which customers have delivery delays and unresolved tickets?"
- "Summarise everything I need before today's client meetings."
- "Which lead sources generate the most profitable projects?"
- "Which customers appear ready for an expansion conversation?"

Write and build capabilities:

- Create or update records.
- Draft communications.
- Create views and reports.
- Add custom fields and relationships.
- Create a dashboard.
- Generate a workflow.
- Generate a project template.
- Build a customer segment.
- Create an internal connector.
- Propose a new agent.
- Diagnose a failed automation.

Interaction requirements:

Every consequential answer or action should show:

- Data sources used.
- Records included or excluded.
- Assumptions.
- Confidence.
- Estimated action count.
- Estimated cost.
- Required approvals.
- Expected downstream effects.

## 21. Initial agent catalogue

| Agent | Primary responsibility | Default autonomy |
| --- | --- | --- |
| Owner Chief of Staff | Daily briefing, exceptions, priorities, business questions | Read and recommend |
| Intake and Enrichment Agent | Identify, deduplicate, enrich, classify, and route new enquiries | Autonomous for low-risk internal updates |
| Marketing Agent | Segment audiences, draft campaigns, analyse results | Draft; approval before external sends |
| Sales Agent | Research, prioritise, follow up, prepare meetings, advance opportunities | Internal updates autonomous; external messages policy-controlled |
| Proposal Agent | Draft scope, pricing, proposal, and agreement | Human approval required |
| Onboarding Agent | Collect information, schedule onboarding, create delivery records | Autonomous for approved templates |
| Delivery Coordinator | Build plans, monitor milestones, surface risks, prepare client updates | Internal actions autonomous; external commitments require approval |
| Finance Operations Agent | Create invoice drafts, reconcile status, send reminders | Approval for first use or high-value actions |
| Support Agent | Classify, research, draft, respond, and escalate | Autonomous only above confidence and policy thresholds |
| Customer Success Agent | Monitor health, prepare reviews, identify renewal or expansion actions | Recommend by default |
| Data Steward Agent | Detect duplicates, missing data, invalid values, and schema drift | Auto-fix reversible low-risk issues |
| Integration Builder Agent | Generate connectors, mappings, tests, and documentation | May build and test; publishing requires approval |

## 22. Agent autonomy model

### Tier 0 — Observe

- Search.
- Summarise.
- Analyse.
- Explain.
- No writes.

### Tier 1 — Recommend

- Draft changes or actions.
- Human explicitly approves execution.

### Tier 2 — Execute reversible internal actions

- Update internal fields.
- Create tasks.
- Assign owners.
- Add tags.
- Generate drafts.
- Actions automatically logged and reversible.

### Tier 3 — Execute policy-approved external actions

- Send routine communications.
- Schedule meetings.
- Request information.
- Send standard payment reminders.
- Requires validated recipient, template, consent, limits, and confidence.

### Tier 4 — Restricted actions

Always require approval or stronger controls:

- Changing prices or contractual terms.
- Issuing refunds.
- Deleting material records.
- Bulk outbound communications.
- Making financial commitments.
- Cancelling active work.
- Exporting sensitive data.
- Publishing applications or integrations.
- Changing permissions.
- Making legally significant decisions.

## 23. AI platform requirements

### Model gateway

- Provider-independent request interface.
- Model routing based on task, risk, latency, and cost.
- Fallback between providers.
- Support for structured output.
- Provider and model version tracking.
- Data-handling configuration by workspace.
- Optional customer-supplied model credentials for advanced plans.

### Tool registry

Tools are assembled dynamically according to:

- User identity.
- Agent identity.
- Workspace plan.
- Record access.
- Field access.
- Current screen.
- Workflow policy.
- Risk classification.
- Approval status.
- Integration availability.

### Evaluation system

Every production agent should have:

- Golden test cases.
- Adversarial tests.
- Permission tests.
- Tool-selection tests.
- Hallucination and unsupported-claim tests.
- Cost and latency benchmarks.
- Regression thresholds.
- Human scoring.
- Production trace sampling.

### Observability

Each agent run records:

- User request.
- Context retrieved.
- Models used.
- Prompts and versions.
- Tool calls.
- Approvals.
- Output.
- Cost.
- Latency.
- Errors.
- User corrections.
- Final business outcome.

# Part VII — Visual automation platform

## 24. Automation design goal

A business owner should be able to describe a process in plain language, inspect it visually, test it safely, and understand every production run. A developer should be able to extend the same process with code and external APIs.

## 25. Creation modes

Template-first:

- Lead response.
- Meeting follow-up.
- Proposal approval.
- Deal-to-project handoff.
- Client onboarding.
- Milestone reminder.
- Invoice collection.
- Support escalation.
- Renewal preparation.

Natural-language generation:

- User describes desired outcome.
- AI generates the workflow graph.
- Ambiguities are represented as explicit decisions.

Visual canvas:

- Drag-and-drop editing.
- Typed ports and variables.
- Field mapping.
- Branch and loop configuration.

Code extension:

- Sandboxed JavaScript or TypeScript initially.
- Package allowlist.
- Secrets injected through managed connections.
- Typed input and output schema.

All creation modes compile to the same versioned workflow representation.

## 26. Trigger catalogue

- Record created, updated, deleted, or stage changed.
- Process entry added or removed.
- Form submitted.
- Email or message received.
- Meeting booked, completed, cancelled, or missed.
- Call completed.
- Quote accepted or rejected.
- Contract signed.
- Invoice issued, due, overdue, paid, or failed.
- Project milestone reached or missed.
- Task due or completed.
- Ticket created, updated, escalated, or resolved.
- Schedule.
- Webhook.
- Integration event.
- Manual button.
- Agent request.
- API invocation.

## 27. Workflow block catalogue

### Logic

Condition. Multi-way branch. Loop. Delay. Wait until event. Deadline. Parallel branches. Merge. Rate limit. Deduplication. Idempotency check. Error boundary. Human approval. Subflow.

### Data

Find or query records. Create or update records. Transform values. Parse JSON. Enrich data. Aggregate. Compare changes. File extraction. Semantic search.

### AI

Classify. Extract. Summarise. Generate structured data. Research. Select next action. Run a constrained agent. Evaluate confidence. Compare evidence. Generate communication. Generate a workflow or integration.

### Business actions

Send email or message. Create task or appointment. Add to sequence. Update pipeline. Generate proposal. Request signature. Create project or job. Assign work. Generate invoice. Request payment. Create or update ticket. Notify team or customer.

### Developer and integration actions

HTTP request. MCP tool call. Native connector action. Custom application action. Sandboxed code. Webhook response.

## 28. Workflow safety and operations

The automation platform must include:

### Before publishing

- Schema validation.
- Permission validation.
- Missing-connection detection.
- Sample-data testing.
- Historical-data simulation.
- Branch-coverage report.
- Loop detection.
- Estimated run volume.
- Estimated cost.
- Recipient and consent checks.
- Side-effect summary.

### After publishing

- Immutable workflow versions.
- Version comparison.
- Publish notes.
- Rollback.
- Pause and resume.
- Per-run timeline.
- Per-step inputs and outputs.
- Retry with same input.
- Replay from selected step.
- Dead-letter queue.
- Alerting.
- Bulk remediation.
- Concurrency controls.
- Rate-limit handling.
- Automatic suspension after error or spending thresholds.

### Transactional behaviour

For multi-step business actions, the platform should support:

- Idempotency keys.
- Commit groups.
- Compensating actions.
- Safe retries.
- At-least-once event delivery.
- Duplicate suppression.
- External-effect recording.

# Part VIII — Integration and application platform

## 29. Integration strategy

The product requires four integration levels.

- Level 1 — Native connectors: Maintained by the platform with full support, health monitoring, and tested data models.
- Level 2 — No-code Connector Studio: Created by customers or implementation partners through configuration.
- Level 3 — Generated connectors: AI imports API documentation or an OpenAPI specification and proposes authentication, triggers, actions, schemas, tests, and field mappings.
- Level 4 — Application SDK: Developers create embedded interfaces, server-side logic, custom objects, workflow blocks, agents, and marketplace applications.

## 30. Initial native integrations

Communication and productivity:

- Google Workspace. Microsoft 365. Google Calendar. Microsoft Calendar. Slack. Twilio. WhatsApp Business-compatible provider. Zoom. Google Meet. Microsoft Teams.

Finance:

- Stripe. Xero. QuickBooks Online. One regional payment provider based on launch market.

Documents and storage:

- Google Drive. OneDrive. Dropbox. DocuSign or PandaDoc.

Marketing and web:

- Meta lead forms. Google Ads conversion signals. WordPress forms. Webhook-based generic form ingestion.

The exact launch set should be determined by design-partner usage rather than maximising connector count.

## 31. No-code Connector Studio

A builder should be able to:

1. Select authentication method: API key, OAuth 2.0, Basic authentication, Signed webhook, Service account.
2. Define connection fields and scopes.
3. Create triggers: Polling, Webhook, Scheduled query.
4. Create actions.
5. Define request and response schemas.
6. Map external identities to internal records.
7. Configure pagination and rate limits.
8. Add retries and error handling.
9. Test against a sandbox or sample response.
10. Publish privately to the workspace.
11. Submit for marketplace review.

AI-assisted flow:

The user can provide an OpenAPI document, API documentation, example requests and responses, or a plain-language description. The Integration Builder Agent proposes a connector and produces:

- Authentication configuration.
- Trigger and action catalogue.
- Field schemas.
- Sample mappings.
- Test cases.
- Rate-limit strategy.
- Error mappings.
- End-user documentation.

Publishing still requires human review.

## 32. Synchronisation engine

For integrations that exchange system-of-record data, the platform must support:

- One-way and two-way synchronisation.
- Initial backfill.
- Incremental synchronisation.
- External IDs.
- Identity mapping.
- Conflict resolution.
- Field ownership.
- Deletion policy.
- Transformation rules.
- Schema-drift detection.
- Sync replay.
- Failed-record quarantine.
- Health dashboard.
- Volume, latency, and error metrics.

A workflow action and a persistent data sync should be separate concepts.

## 33. API platform

### Public REST API

Metadata. Objects. Records. Relationships. Processes. Activities. Conversations. Workflows. Projects/jobs. Quotes/invoices/payments. Tickets. Files. Agents. Audit events.

### Webhooks

- Signed payloads.
- Replay protection.
- Delivery history.
- Exponential retry.
- Filtering.
- Versioned schemas.
- Test events.

### Authentication

- OAuth 2.0 for third-party applications.
- Scoped API keys for internal use.
- User-delegated tokens.
- Service identities.
- Short-lived tokens where appropriate.

### MCP

The MCP layer should expose compact, task-oriented tools such as:

- Find customer context.
- Summarise an account.
- Create or update a business record.
- Prepare a proposal.
- Create a project from a won opportunity.
- Review outstanding customer obligations.
- Execute an approved workflow.
- Query operational metrics.

MCP calls must inherit the authenticated user's permissions and remain fully auditable.

## 34. Application SDK

The SDK should eventually support:

- Custom objects and fields.
- Custom pages.
- Record panels.
- Record actions.
- Dashboard widgets.
- Command-menu actions.
- Workflow blocks.
- Agent tools.
- Forms.
- Serverless functions.
- Incoming webhooks.
- Authenticated connections.
- Managed secrets.
- Application settings.
- Versioning and migrations.
- Private and public distribution.

Third-party code must execute inside a sandbox with explicit scopes and resource limits.

# Part IX — Core business modules

## 35. Customers

Capabilities:

- People, companies, households, and custom account types.
- Relationship mapping.
- Contact roles.
- Full interaction timeline.
- Consent and communication preferences.
- Tags, segments, and calculated attributes.
- Duplicate detection and merging.
- Customer health.
- Customer portal access.
- Custom objects and relationships.

## 36. Growth

P0:

- Forms. Lead-source tracking. UTM and campaign data. Segments. Basic broadcast email. Lead routing. Conversion tracking. Suppression and preferences. Campaign reporting.

Later:

- Landing-page builder. Advanced campaign journeys. Experimentation. Ad-audience synchronisation. Social scheduling.

A broad website and funnel builder should not be part of the initial release. GoHighLevel demonstrates the commercial value of having capture, messaging, pipelines, automation, scheduling, proposals, invoices, payments, and reputation workflows in one package, but its scope is also shaped by an agency and subaccount model. The proposed product should borrow its lifecycle coverage without inheriting an agency-first interface or trying to reproduce every marketing feature immediately. [GoHighLevel]

## 37. Sales

- Lead and opportunity pipelines.
- Multiple processes and pipeline types.
- Shared and personal inboxes.
- Email and calendar synchronisation.
- Meeting booking.
- Tasks and reminders.
- Sequences.
- Call notes and transcription.
- Lead qualification.
- Opportunity scoring.
- Next-action recommendations.
- Proposal and quote generation.
- Agreement and signature integration.
- Forecasting.
- Win/loss analysis.

## 38. Delivery

- Project and job templates.
- Milestones.
- Tasks and dependencies.
- Team assignment.
- Work queues.
- Status and risk.
- Files and deliverables.
- Client approvals.
- Client portal.
- Comments and messages.
- Scope and change requests.
- Time tracking in P1.
- Resource planning in P1.
- Delivery profitability in P1.

## 39. Money

P0:

- Product and service catalogue.
- Price books.
- Quotes and estimates.
- Discounts and taxes as configurable inputs.
- Proposal acceptance.
- Payment links.
- Deposit requests.
- Invoice creation.
- Payment state.
- Overdue reminders.
- Accounting-system synchronisation.
- Customer balance summary.

Explicit boundary:

The platform should not become a general ledger, tax engine, payroll system, or statutory accounting system in the first phases.

## 40. Support and customer success

- Shared support inbox.
- Ticket creation.
- Categories and priority.
- Assignment and queues.
- Statuses.
- SLA policies.
- Internal notes.
- Knowledge base.
- AI triage.
- AI draft and resolution.
- Escalation.
- Customer-facing portal.
- Customer health.
- Renewal and review dates.
- Expansion opportunities.
- Product or service issue trends.
- Root-cause insights.

# Part X — Data model

## 41. Metadata layer

The core should be metadata-driven.

Definitions:

ObjectDefinition. AttributeDefinition. RelationshipDefinition. ValidationDefinition. ViewDefinition. ProcessDefinition. StageDefinition. AutomationDefinition. AgentDefinition. PermissionPolicy.

Runtime records:

Record. RelationshipEdge. ProcessEntry. Activity. Event. File. Comment. Conversation. Message. Meeting. Call.

Customer-lifecycle records:

Person. Company. Lead. Opportunity. Quote. Contract. Project. Job. Milestone. Task. Invoice. Payment. Subscription. Ticket. SLA. Renewal.

Platform records:

WorkflowDefinition. WorkflowVersion. WorkflowRun. StepRun. AgentDefinition. AgentPolicy. AgentRun. ToolCall. Integration. Connection. SyncJob. Application. AuditEvent.

## 42. Temporal and audit model

Every material write must record:

- Actor type.
- Actor ID.
- Initiating user.
- Source application.
- Source workflow or agent.
- Previous value.
- New value.
- Effective time.
- Recorded time.
- Workspace.
- Request or trace ID.
- Reason or explanation.
- Confidence where inferred.
- Approval event where required.

Humans, agents, workflows, integrations, and system processes should all use the same actor model.

## 43. Process model

An object and a process must remain separate.

Example:

A company is an object. The same company may participate in:

- A sales pipeline.
- An onboarding process.
- A customer-health process.
- A renewal process.
- A collections process.

This prevents the schema from requiring a different copy of the customer for each departmental workflow.

# Part XI — Technical architecture

## 44. Architectural recommendation

Begin with a modular monolith with event-driven boundaries, rather than prematurely splitting the product into many microservices.

This provides:

- Faster product iteration.
- Easier transactional consistency.
- Simpler local development.
- Lower operational burden.
- Clear future extraction points.

High-volume or independently scaling functions—workflow execution, messaging, AI inference, ingestion, search, and integration sync—can run as separate workers or services from the beginning.

## 45. Logical architecture

```
User Interfaces
Web app | Mobile web | Client portal | Embedded apps | Public API
│
Experience Layer
Home | CRM | Growth | Sales | Delivery | Money | Support | Builder
│
Business Services
Customer | Sales | Projects | Billing orchestration | Support | Reporting
│
Agent and Automation Layer
Agent runtime | Workflow engine | Policy engine | Approvals | Scheduler
│
Business Context Plane
Structured query | Full-text search | Semantic search | Knowledge retrieval
│
Data and Event Layer
Postgres | Event log | Object storage | Search index | Analytics store
│
Integration Platform
Native connectors | Sync engine | Webhooks | REST API | MCP | App runtime
```

## 46. Core infrastructure

### Transactional database

- PostgreSQL as the primary system of record.
- Metadata-driven relational model.
- Strong tenant isolation.
- Transactional outbox.
- Row-level or application-enforced access controls.
- JSON only where flexibility is valuable; avoid storing all business data as untyped JSON.

### Event layer

- Immutable business-event stream.
- At-least-once delivery.
- Versioned event contracts.
- Idempotent consumers.
- Replay for recovery and analytics.
- Correlation and causation IDs.

### Search and retrieval

- Full-text search.
- Faceted search.
- Semantic embeddings.
- Permission-aware retrieval.
- Incremental indexing.
- Index version and freshness monitoring.
- Source-record links.

PostgreSQL plus a vector extension may be sufficient initially; a dedicated search platform can be introduced as volume and retrieval needs grow.

### Workflow engine

Use a durable workflow runtime with:

- Long-running state.
- Timers.
- Retries.
- Human approvals.
- Durable execution.
- Cancellation.
- Compensation.
- Replay.
- Version-safe deployment.

### Files and media

- Object storage.
- Virus scanning.
- Signed access.
- Transcription pipeline.
- Extraction pipeline.
- Retention and deletion policies.

### AI platform

- Multi-provider gateway.
- Prompt registry.
- Agent registry.
- Tool registry.
- Policy engine.
- Structured-output validator.
- Trace store.
- Evaluation service.
- Cost ledger.
- Feedback store.

### Application runtime

- Sandboxed serverless functions.
- Managed secrets.
- Per-application scopes.
- CPU, memory, time, and network limits.
- Dependency allowlist.
- Versioned deployment.
- Application review.

## 47. Non-functional requirements

These are initial design targets rather than externally committed service levels.

| Area | Initial target |
| --- | --- |
| Availability | 99.9% monthly platform availability |
| Record-read performance | P95 under 500 ms for standard indexed views |
| Search | P95 under 2 seconds for normal workspace searches |
| Workflow reliability | Durable execution with idempotent retry support |
| Data durability | Point-in-time recovery and tested backups |
| Recovery | RPO under 15 minutes; RTO under 4 hours |
| Accessibility | WCAG 2.2 AA target |
| Audit | 100% of consequential writes attributable to an actor |
| Tenant isolation | No cross-tenant access by default; automated isolation tests |
| Export | Documented export of customer-owned data |
| Scale | Initial design for at least 250,000 records per workspace; scale tier to 1 million or more |
| Agent writes | All writes through validated application tools, never direct model access to the database |
| Workflow simulation | No external side effects in test mode |
| Secrets | Encrypted storage with scoped runtime access |
| Observability | Distributed traces across user request, agent, workflow, integration, and data write |

# Part XII — Security, permissions, and governance

## 48. Permission model

Permissions should support:

Workspace. Team. Role. Object type. Record. Field. View. Workflow. Agent. Integration. Application. Action type. Export. Communication channel.

An agent cannot exceed the combined access of:

- Its configured identity.
- The initiating user.
- The workflow policy.
- The application or integration scope.
- Any approval granted for the action.

## 49. AI governance

- Administrators can enable or disable providers.
- Sensitive fields can be excluded from model context.
- Model requests are logged.
- Data-retention options are configurable.
- Customer data is not used for model training without explicit agreement.
- High-risk actions require human approval.
- Agent-generated content is visibly identified internally.
- Users can inspect evidence and correct outputs.
- Corrections feed evaluation and product improvement without silently rewriting historical records.
- The platform does not delegate legally significant decisions to autonomous agents.

## 50. Communication governance

- Communication preferences.
- Consent records.
- Suppression lists.
- Sending limits.
- Quiet hours.
- Sender verification.
- Template approval.
- Unsubscribe handling.
- Channel-specific policies.
- Audit history.
- Bulk-send approval thresholds.

# Part XIII — Analytics

## 51. Analytics philosophy

Analytics should be generated from the same operational model rather than a disconnected reporting module.

### Initial dashboards

Owner:

- Leads created. Pipeline value. Expected revenue. Booked work. Delivery at risk. Invoices issued. Cash collected. Overdue amount. Open support risk. Customer-health movement. Agent activity. Automation failures. AI and automation spending.

Growth:

- Lead source. Conversion by campaign. Cost and value by source. Response time. Qualification rate.

Sales:

- Pipeline movement. Stage conversion. Deal velocity. Follow-up compliance. Forecast. Win/loss reasons.

Delivery:

- Work by stage. Milestones at risk. Capacity. Scope changes. Planned versus actual timing. Profitability in P1.

Support and success:

- Volume. Response and resolution time. SLA performance. Reopen rate. Recurring issue categories. Customer-health changes. Renewal exposure.

### Natural-language analytics

Ask Business should be able to:

- Generate a chart.
- Explain a change.
- Define the calculation.
- Link to underlying records.
- Save the result as a dashboard component.
- Schedule a recurring briefing.

# Part XIV — MVP and roadmap

## 52. Minimum lovable product

The initial product must demonstrate the complete lifecycle rather than achieving depth in only sales CRM.

MLP scope:

- Flexible customer data model.
- Business-type onboarding.
- Email and calendar connection.
- Unified timeline.
- Lead capture.
- Pipeline and sales inbox.
- Scheduling and follow-up.
- Proposal or quote.
- Project/job handoff.
- Basic delivery tracking.
- Invoice/payment orchestration.
- Shared support inbox and tickets.
- Ask Business.
- Five initial agents.
- Visual automations.
- Core integrations.
- REST API, webhooks, and MCP.
- Owner dashboard.
- Agent and automation audit.
- Usage budgets and cost reporting.

Initial five agents:

1. Owner Chief of Staff.
2. Intake and Enrichment Agent.
3. Sales Agent.
4. Delivery Coordinator.
5. Support Agent.

Proposal, Finance, Customer Success, Data Steward, and Integration Builder agents follow in later releases or private beta.

## 53. Phased roadmap

The timing below assumes a well-funded, experienced multidisciplinary team and should be replanned after technical discovery.

### Phase 0 — Foundation, months 0–3

- Metadata model. Tenant and identity model. Permissions. Actor and audit model. Event architecture. Core record APIs. Integration framework. AI gateway. Design-partner discovery. Initial business templates.

### Phase 1 — Customer and sales core, months 4–6

- Customers and relationships. Email/calendar sync. Unified timeline. Pipeline. Forms. Inbox. Scheduling. Ask Business. Intake and Sales Agents. Automations v1. Initial owner dashboard.

### Phase 2 — Lead to cash, months 7–9

- Sequences. Calls and meeting intelligence. Products and pricing. Quotes and proposals. Signature integration. Invoices and payment links. Finance integrations. Reporting improvements. Cost and budget controls.

### Phase 3 — Delivery and support, months 10–12

- Project/job templates. Milestones and tasks. Client portal. Delivery Agent. Support inbox. Tickets and SLAs. Knowledge base. Support Agent. Customer health.

### Phase 4 — Extensibility, months 13–18

- Connector Studio. OpenAPI import. Integration Builder Agent. App SDK. Private applications. Advanced agent builder. Advanced workflow recovery. Multi-location and multi-entity support. Partner implementation console.

### Phase 5 — Ecosystem

- Public application marketplace. Agent marketplace. Vertical solution packs. Partner certification. Optional self-hosted or controlled-deployment offering. Larger-account governance.

## 54. Explicit MVP non-goals

Do not include these in the initial release:

- Full accounting ledger. Payroll. Tax preparation. Inventory and warehouse management. Manufacturing resource planning. Full website builder. Full social-media management suite. Advertising network management. Native telephony carrier infrastructure. Learning-management system. Community platform. E-commerce storefront. Advanced workforce scheduling. Public application marketplace. White-label agency platform. Highly regulated autonomous decisioning.

These capabilities can be integrated or revisited after the core lifecycle demonstrates strong retention.

# Part XV — Success metrics

## 55. North-star metric

Successful customer-lifecycle outcomes completed per active workspace per week.

An outcome is not a click or an AI response. It is a completed business event such as:

- Qualified lead. Booked meeting. Accepted proposal. Won opportunity. Completed onboarding. Delivered milestone. Paid invoice. Resolved support issue. Renewed customer. Reactivated customer.

The metric should distinguish:

- Human-completed outcomes.
- Agent-assisted outcomes.
- Agent-completed outcomes.
- Outcomes subsequently corrected or reversed.

## 56. Activation metrics

Initial hypotheses:

- Median time to usable workspace below 30 minutes.
- At least one communication account connected.
- At least 50 customer records created or imported.
- First pipeline or process active.
- First workflow published.
- First AI-assisted action completed.
- First complete lifecycle outcome achieved within seven days.
- More than 50% of new workspaces reach activation within seven days.

These targets should be validated with design partners rather than treated as permanent goals.

## 57. Engagement and retention

- Weekly active workspace rate.
- Active users by role.
- Workspaces using three or more modules.
- Workspaces with a published automation.
- Workspaces using at least one agent weekly.
- 30-, 90-, and 180-day workspace retention.
- Expansion into additional users, modules, and integrations.

## 58. AI trust metrics

- Suggestion acceptance rate.
- Autonomous action success rate.
- Human correction rate.
- Rollback rate.
- Unsupported-answer rate.
- Approval rejection rate.
- Agent escalation rate.
- Cost per successful outcome.
- Percentage of answers with inspectable evidence.
- Policy-violation attempts blocked.

## 59. Automation metrics

- Successful run rate.
- Failure rate by block.
- Median recovery time.
- Simulations performed before publishing.
- Runs replayed.
- Workflows paused due to budget.
- Duplicate external actions prevented.
- Manual hours estimated as saved.

## 60. Customer business-impact metrics

Where customers consent to measurement:

- Lead response time.
- Lead-to-meeting conversion.
- Sales cycle.
- Deal-to-delivery handoff time.
- On-time milestone rate.
- Invoice collection time.
- Support resolution time.
- Renewal rate.
- Customer-health improvement.

# Part XVI — Packaging and monetisation

## 61. Pricing principles

Attio currently uses per-seat subscription pricing combined with included seat and workspace credits, while GoHighLevel packages broad functionality into larger flat monthly plans aimed partly at agencies and their subaccounts. [Attio +1]

The new platform should use a workspace-first model with included users, because small businesses often have occasional or cross-functional users and should not be discouraged from placing the whole team in one system.

Recommended charging dimensions:

- Base workspace.
- Included active users.
- Additional active users.
- AI model expenditure.
- Automation executions.
- Outbound communications.
- Storage.
- Premium integrations.
- Advanced governance.
- Additional businesses or legal entities.

Avoid:

- Unexplained abstract credits.
- Charging for every passive record.
- Per-seat pricing that discourages delivery or support users.
- Workflows stopping mid-run because a balance was exhausted.
- Hidden margins on model usage.
- Charging for failed platform executions.

## 62. Illustrative packaging hypothesis

Pricing requires market testing; these are packaging hypotheses rather than final recommendations.

| Plan | Illustrative price | Intended customer |
| --- | --- | --- |
| Launch | US$49/month | Solo operator or very small team; up to 3 users |
| Growth | US$149/month | Established small business; up to 10 users |
| Scale | US$399/month | Multi-team business; up to 25 users |
| Advanced | Custom | Larger businesses, governance, multiple entities, deployment options |

Usage model:

- Include a meaningful monthly AI allowance.
- Show estimated dollar cost before running an agent or high-volume workflow.
- Allow per-workspace, per-agent, and per-workflow budgets.
- Alert at configurable percentages.
- Reserve the maximum expected spend before long-running execution.
- Return unused reserved capacity.
- Allow administrators to select lower-cost or higher-quality model modes.
- Offer customer-supplied provider credentials on advanced plans.
- Charge communication-provider costs transparently.

# Part XVII — Competitive positioning

## 63. Competitive synthesis

| Product category | Primary strength | Opportunity for this product |
| --- | --- | --- |
| Attio | Flexible, modern, AI-native revenue context and developer platform | Extend the same architectural quality through delivery, money, and support; add stronger templates and cost control |
| GoHighLevel | Broad SMB growth, communications, automation, and monetisation workflows | Provide a more coherent data model, modern UX, first-party operations, and direct-SMB orientation |
| Twenty | Open-source, developer-friendly, customisable CRM architecture | Add packaged business outcomes and broader operational modules |
| HubSpot-style suites | Mature customer platform and ecosystem | Offer simpler architecture, flexible data, and genuinely agentic execution |
| Zoho/Odoo-style suites | Very broad application coverage | Provide a more unified experience, context layer, and AI governance |
| Monday/ClickUp/Airtable-style tools | Flexible work and data management | Add customer lifecycle, communications, commercial records, and first-party agents |
| Zapier/Make/n8n-style automation | Integration and workflow breadth | Combine automation with the operational system of record and business context |

Twenty's current open-source platform uses configurable objects, fields, views, workflows, and agents, exposes CRM configuration through code and an SDK, and supports self-hosting. This is the strongest reference for an open and versionable extension model. [GitHub +1]

## 64. Differentiation pillars

### 64.1 Complete customer lifecycle

Not merely marketing and sales. The product links demand, commercial agreement, delivery, payment, support, and retention.

### 64.2 One business context for humans and agents

Agents do not assemble fragmented context through brittle point-to-point integrations.

### 64.3 Template-first flexibility

Users receive immediate value while retaining an Attio-like ability to customise the data and process model.

### 64.4 Trusted agentic execution

Every action has identity, evidence, permission, policy, approval, cost, and traceability.

### 64.5 Automation without a separate automation product

Visual workflows, AI, integrations, and business records share one execution environment.

### 64.6 Integrations that customers can create

The connector studio and application platform reduce dependence on the vendor's roadmap.

### 64.7 Predictable economics

Costs are shown in money and business outcomes rather than obscure credits.

# Part XVIII — Risks and mitigations

## 65. Major product risks

| Risk | Consequence | Mitigation |
| --- | --- | --- |
| Horizontal scope becomes unmanageable | Slow delivery and shallow modules | Beachhead on service SMBs; strict non-goals; vertical templates |
| Flexibility recreates Attio's blank-page problem | Poor activation | Guided setup, defaults, sample data, role dashboards |
| Templates become too restrictive | Advanced users leave | Metadata-driven core and progressive customisation |
| AI takes incorrect action | Customer harm and loss of trust | Risk tiers, approvals, typed tools, revalidation, rollback |
| Agent cost becomes unpredictable | Customers disable automation | Dollar estimates, budgets, reservations, caps, model routing |
| Integrations create maintenance debt | Reliability degrades | Prioritised native connectors, contract tests, schema-drift monitoring |
| Two-way sync causes conflicting truth | Duplicate or overwritten records | Field ownership, conflict policy, versions, sync audit |
| Automation duplicates external actions | Repeated messages or charges | Idempotency, external-effect ledger, safe retry |
| Marketplace applications create security exposure | Data leakage or compromised workspaces | Sandboxing, scopes, review, runtime limits, kill switch |
| The platform becomes difficult to support | High onboarding and service costs | In-product guidance, diagnostics, templates, partner programme |
| Accounting scope expands uncontrollably | Regulatory and product complexity | Remain an orchestration layer and integrate with ledgers |
| AI context is stale | Incorrect recommendations | Transactional outbox, freshness markers, write-time revalidation |
| SMBs resist migration | Low adoption | Import tooling, parallel operation, data-quality agent, rollback |
| Communications create compliance risk | Deliverability and legal exposure | Consent, suppression, sending policies, approval thresholds |

# Part XIX — Founder decisions to lock

## 66. Recommended decisions

### Decision 1: CRM or Business OS?

Recommendation: Enter through CRM, but design and position the product as a customer and operations OS.

CRM provides a familiar buying category. End-to-end operational coordination provides the differentiation.

### Decision 2: Horizontal or vertical?

Recommendation: Horizontal architecture, vertical go-to-market.

Launch with two or three high-quality service-business templates rather than marketing to every small business.

### Decision 3: How much accounting should be native?

Recommendation: Own quotes, payment requests, invoice orchestration, collections, and cash visibility. Integrate with the accounting ledger.

### Decision 4: How autonomous should agents be?

Recommendation: Default to recommendation and reversible internal execution. Allow external autonomous actions only under explicit policies.

### Decision 5: Open source or proprietary?

Recommendation: Keep the hosted core proprietary initially, while making APIs, SDKs, schemas, connector tooling, and application examples open. Reassess self-hosting after product-market fit.

Twenty shows the strategic appeal of an open, code-defined CRM platform, but full self-hosting would materially increase support, deployment, and upgrade complexity during the earliest product phase. [GitHub]

### Decision 6: Direct SMB or agency channel?

Recommendation: Design for direct SMB use first. Add an implementation-partner console later. Do not make white-labelling a P0 constraint.

### Decision 7: Native communications or provider orchestration?

Recommendation: Build the inbox, identity, routing, policies, templates, and analytics. Use established providers for underlying message delivery and calling infrastructure.

### Decision 8: Marketplace timing?

Recommendation: Release private apps and internal connectors before launching a public marketplace. Security, versioning, review, billing, and support processes must exist first.

# Part XX — Launch criteria

## 67. Private beta exit criteria

The product should not enter general availability until:

- At least 20 design-partner businesses have used it with live customers.
- At least three service-business templates have been validated.
- A new customer can reach a usable workspace without implementation support.
- The lead-to-cash-to-delivery journey works end to end.
- Customer context correctly joins sales, delivery, billing, and support data.
- Every AI write action is attributable, inspectable, and governed.
- Workflows can be simulated, versioned, paused, and recovered.
- Core integrations have automated contract and regression tests.
- No workflow can repeat an external financial or communication action solely because of an internal retry.
- Usage costs are visible before and after execution.
- Data export and deletion have been tested.
- Security, tenant isolation, recovery, and incident procedures have been independently reviewed.
- At least half of active pilot workspaces publish an automation.
- Pilot users report measurable value in at least two lifecycle stages—not only CRM record management.
- Support load is sustainable without a dedicated implementation project for every customer.

# Final product recommendation

The strongest opportunity is not "Attio with more modules."

It is:

An Attio-grade AI and context architecture, extended across the complete operating lifecycle of a small service business, delivered with GoHighLevel-grade packaged outcomes and Twenty-grade extensibility.

The winning product should feel simple and opinionated during onboarding, flexible when the business evolves, and deeply programmable when technical users need more. Its defining capability should be that sales, delivery, money, and support are not separate systems: they are related states in one business context that humans and agents can safely operate together.
