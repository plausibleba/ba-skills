# VCC Design Spar — Backend Architecture & Multi-User Evolution
**Date:** 11 March 2026
**Author:** Terry Roach and Claude (Anthropic)
**Spar Topic:** Introducing a backend to serve field-validated multi-user demand
**Participants:** Architect (challenger), UX (challenger), Terry (decision maker), Claude (implementer)

---

## Context: Why Now

On 11 March 2026, Daniel Roach demonstrated the VCC to a Puretec customer on a live call with a Salesforce sales representative. The customer wanted access immediately. The sales rep had Daniel run a second VCC for their next customer — who also wanted access. The sales rep is now requesting a demo to the entire sales team, saying: *"we need to buy these guys before someone else does."*

They have already produced a requirements list. The demand is pull, not push. The question is no longer whether to build a backend — it is how to build one that preserves VCC's architectural advantages while meeting the requirements that come with multi-user enterprise deployment.

This spar is Phase 1 (Before Building) per the Spar Protocol. We need a Decision Record with locked decisions, deferred items, and named tensions before code is written.

---

## The Six Field Requirements

These emerged directly from the Puretec engagement. They are listed in priority order as understood by the customer and sales team:

### R1: Multi-User Version (Backend)
Multiple users need to access, create, and share VCC bundles. This requires authentication, persistence, and shared state. Currently everything runs client-side in the browser with no server-side storage.

### R2: Round-Trip Editing (Return to Form)
Users need to get back to the discovery form to edit content after generation — modify friction points, add value streams, rename elements, adjust the scaffold. Currently the pipeline is one-way: form -> extract -> generate -> canvas. There is no edit path back.

### R3: Modular Feature Surface (Use-Case Profiles)
Different users need different features. Sales Discovery does not need Requirements, User Stories, or MVC Cards. A Board Diagnostic does not need vendor enrichment. The product needs to show the right features for the right context. This is the "Lenses" concept (D-100) made operational.

### R4: Slack Integration
Salesforce owns Slack. Integration would be a significant adoption accelerant within Salesforce's ecosystem. Range: from posting summaries to channels, to ingesting Slack threads as discovery content.

### R5: Transcript-Based Content Updates
Users want to send natural language corrections to modify the scaffold: "we need a new ValueStream for X", "we don't call it that, we call it Y", "add a friction point about Z". This is a conversational editing loop — corrections processed by the LLM to produce scaffold deltas.

### R6: Multiple Discovery Content Types
Users want to upload structured artefacts alongside the discovery transcript: industry capability maps, customer application portfolios, process catalogues, org charts. The pipeline currently accepts a single text narrative. It needs to accept heterogeneous structured inputs.

---

## Current Architecture (What We Have)

### Frontend
- React 18 / Vite / Tailwind CSS / TypeScript
- Zustand for all application state (in-memory, no persistence)
- Deployed on Vercel as static SPA + Edge Runtime serverless proxy

### LLM Pipeline
- Four-pass pipeline (VS Definition -> Capabilities -> Scaffold Formalisation -> Friction Assessment)
- All passes run client-side, calling through `/api/claude` Edge Runtime proxy
- Prompts in `packages/frontend/src/domain/pipeline/prompts/`
- Streaming via SSE, temperature 0 for deterministic output

### Backend Stub
- Express app in `packages/backend/` with 5 stateless endpoints
- Validation, canvas generation, import/export — all delegating to `@vcc/shared`
- No auth, no database, no session management, no persistence

### Data Model
- **Bundle** = ScaffoldData + HeatmapData[] + UserStories + CardRegistry
- Bundle is a single JSON file — the universal persistence unit
- File System Access API for save/load (fallback to blob download)
- `heatmapsByVs: Map<string, HeatmapData>` supports multi-VS heatmaps

### Design Principles (Established)
- **D-095:** Ontology without repository — no backend is a product feature
- **D-097:** Multi-user collaboration is the trigger for backend introduction
- **D-100:** Multi-lens architecture — Core + role-specific Lenses

---

## Architectural Options Under Consideration

We see three broad approaches. Each has different implications for the six requirements.

### Option A: Thin Persistence Layer
Add a minimal backend that stores bundles and manages user identity. The frontend remains the primary computation engine. The backend is a document store with auth.

**Stack:** Supabase (Postgres + Auth + Realtime) or equivalent
**Bundle storage:** Bundles stored as JSON documents, one per project
**Auth:** OAuth (Google, Microsoft, Salesforce SSO)
**LLM calls:** Continue through Edge Runtime proxy, but now associated with a user session
**Collaboration:** Optimistic locking (last-write-wins with conflict detection) — no real-time co-editing

**Serves:** R1 (multi-user), partially R2 (persistence enables reload/edit), R3 (user profiles can store module preferences)
**Does not serve:** R4 (Slack), R5 (transcript updates need server-side LLM orchestration), R6 (structured ingest needs server processing)

**Tension:** This is the smallest step but may be too small. If R5 and R6 require server-side LLM orchestration anyway, we end up building the heavier backend regardless.

### Option B: Full API Backend
Move the pipeline orchestration server-side. The frontend becomes a thin client for UX. All LLM calls, scaffold mutations, and persistence happen on the server.

**Stack:** Node/Express or Fastify + Postgres + Redis (job queue for LLM calls)
**API:** RESTful or tRPC, with bundle CRUD, pipeline execution, and mutation endpoints
**Auth:** Full auth layer with roles (admin, analyst, viewer)
**LLM calls:** Server-side with queue management, retry logic, cost tracking per user
**Collaboration:** Server-authoritative state with WebSocket push for live updates

**Serves:** All six requirements. R5 becomes a server endpoint (POST correction transcript -> LLM processes -> scaffold delta applied). R6 becomes a multi-format ingest pipeline.
**Risk:** Significant engineering effort. Changes the deployment model from static SPA to managed infrastructure. Introduces operational complexity (uptime, scaling, monitoring).

**Tension:** This is the right architecture for a product, but it is a large step from where we are. Risk of over-building before product-market fit is confirmed beyond one customer.

### Option C: Hybrid — Backend for State, Edge for Compute
Keep LLM pipeline execution at the edge (Vercel/Cloudflare Workers) but add a thin backend for state management, auth, and async job coordination.

**Stack:** Vercel + Supabase (or PlanetScale) + Vercel KV (Redis) for job state
**Bundle storage:** Postgres with JSONB columns, or dedicated document store
**Auth:** Supabase Auth or Clerk (managed auth with SSO)
**LLM calls:** Edge Runtime (existing) but results persisted server-side
**Collaboration:** Supabase Realtime for presence and bundle change notification
**Slack:** Supabase Edge Functions or Vercel serverless for webhook handling

**Serves:** All six requirements with incremental deployment. Start with auth + persistence (R1), add module profiles (R3), add mutation endpoints (R2, R5), add ingest pipeline (R6), add Slack webhooks (R4).
**Risk:** Complexity spread across multiple managed services. Harder to reason about than a single server. Vendor coupling to Supabase/Vercel ecosystem.

**Tension:** Pragmatic but architecturally diffuse. The "best of both worlds" pitch often means "coherent in neither."

---

## The Data Model Question

The backend introduction forces decisions about the data model that are currently deferred:

### Bundle as Document vs Bundle as Graph
Currently the bundle is a monolithic JSON document. This works for single-user file-based persistence. For multi-user, we need to decide:

- **Document storage:** Bundle remains a single JSON blob in a `projects` table. Simple. But mutations require full document replacement (no granular updates). Conflict resolution is whole-document.
- **Normalised relational:** Scaffold elements (activities, roles, capabilities, etc.) stored as rows in relational tables. Enables granular queries, per-element permissions, audit trails. But requires a mapping layer between the JSON model and the database schema.
- **Graph storage:** Elements as nodes, relationships as edges. Natural fit for the CAPSICUM ontology. Enables graph queries (e.g., "which capabilities share roles across value streams?"). But adds infrastructure complexity (Neo4j, or Postgres with recursive CTEs).

**Our current lean:** Start with document storage (JSONB in Postgres). The bundle format is the API contract — it doesn't change. The backend stores and retrieves bundles. Granular storage is a future evolution when query patterns demand it.

**Question for the Architect:** Is document storage a viable stepping stone, or does it create migration debt that makes the eventual move to normalised/graph storage harder? What triggers should signal it's time to decompose the bundle?

### Schema Evolution
The bundle schema has evolved significantly (schemaVersion field, dual-format support for legacy bundles). A multi-user backend must handle:

- **Version migration:** Bundles stored at different schema versions need on-read migration
- **Forward compatibility:** Older clients reading bundles saved by newer clients
- **Validation on write:** Server-side validation before persisting (the `@vcc/shared` validator already exists)

**Question for the Architect:** Should the backend enforce a single canonical schema version (migrating on ingest), or support multi-version storage with on-read transformation?

---

## The Module System Question

R3 (modular feature surface) interacts with every other requirement. The current D-100 decision defines five lenses: Operational Productivity, Sales Discovery, Transformation, Authority Governance, Agentic Mesh MVC.

For the backend, modules affect:

- **What pipeline passes run:** Sales Discovery needs all four passes. Board Diagnostic may skip Pass 4 (friction) if loading a pre-built heatmap. Transformation may skip Passes 1-3 entirely.
- **What UI panels render:** Sales Discovery hides TransformationPane, MVC Cards, Requirements. Board Diagnostic hides vendor enrichment.
- **What data is stored:** A Sales Discovery project may not have user stories. A Transformation project may not have vendor feature mappings.
- **What API endpoints are relevant:** Module determines which mutations and which pipeline passes are available.

**Proposed approach:** Module is a first-class entity — a named configuration that controls pipeline availability, panel visibility, and available actions. Stored as a `module` field on the project record. The frontend reads the module config and conditionally renders. The backend reads the module config and conditionally exposes endpoints.

**Question for the UX role:** Should the module be set at project creation time and locked, or should users be able to switch modules mid-project (revealing/hiding features dynamically)? What happens to data created in one module when switching to another (e.g., user stories created in Transformation mode when switching to Sales Discovery)?

---

## The Round-Trip Editing Question

R2 (return to form for editing) and R5 (transcript-based updates) are related but distinct:

### R2: Structured Editing
User clicks on a friction point, value stream, or activity and directly modifies fields. This requires:
- The canvas to expose edit controls (currently read-only)
- Mutations to write back to the scaffold/heatmap in the store
- The backend to persist those mutations
- Validation to run on every mutation (the scaffold must remain structurally valid)

### R5: Conversational Editing
User submits a natural language correction: "rename Value Stream 2 to 'Customer Onboarding'", "add a friction point about data migration latency to the Provisioning stage." This requires:
- A new LLM pass: **Pass 5 — Revision** (takes current scaffold + correction transcript -> produces delta)
- Delta application logic (merge the LLM's proposed changes into the existing scaffold)
- Conflict resolution (what if the user has also made structured edits?)
- Audit trail (what changed, why, by whom/what)

**Tension:** Structured editing (R2) is deterministic and auditable. Conversational editing (R5) involves LLM inference and is probabilistic. Mixing both on the same scaffold creates a provenance problem: which changes came from human editing and which from LLM revision? Does this matter?

**Question for the Architect:** Should structured edits and LLM revisions share the same mutation pipeline, or should they be separate channels with a merge step?

---

## The Slack Integration Question

R4 is not a bolt-on notification feature. It is potentially the primary interaction surface for the Salesforce sales team.

### Field Context
Daniel Roach reports that the Salesforce sales team already operates heavily within Slack. They have multiple "apps" inside Slack that generate sales-related content: proposal content, product content, discovery notes. Their natural workflow is Slack-native — they do not context-switch to separate web applications for sales tooling. They push content into Slack and interact with it there.

This reframes the Slack integration from "post a summary to a channel" to something much more significant: **Slack as a first-class client for VCC**, potentially the primary interface for the Sales Discovery lens.

### Level 1: Inbound — Slack as Discovery Input
Push call transcripts and related documents directly from Slack into the VCC pipeline. A sales rep finishes a discovery call, drops the transcript into a Slack channel, and VCC processes it.

This requires:
- A Slack app that listens for file uploads or message content in designated channels
- Preprocessing to extract meaningful content from Slack's noisy message format
- Integration with the VCC pipeline as an input source (equivalent to the Discovery Intake form, but headless)
- Status updates posted back to the thread (processing, complete, link to canvas)

### Level 2: Copilot — Conversational Agent in Slack
A VCC copilot bot that lives in Slack. Sales reps interact with it conversationally: "run a VCC on this transcript", "add a friction point about data migration", "rename the second value stream to Customer Onboarding", "show me the binding constraint". This merges R4 (Slack) with R5 (transcript-based updates) into a single conversational interface.

This requires:
- A Slack bot with conversational state (knows which VCC project the thread refers to)
- The Revision Pass (Pass 5) exposed as an API endpoint the bot can call
- Read access to the current scaffold state for context-aware responses
- Formatted Slack message output (Block Kit cards showing scaffold summaries, friction highlights, etc.)

### Level 3: Outbound — Feed Downstream Sales Tools
The sales team already uses Slack apps for proposal generation and product content. VCC output (operating model diagnostics, friction analysis, solution mappings) should flow back into those tools via Slack. A completed VCC becomes input to proposal generators, demo scripts, and account planning tools.

This requires:
- Structured output formats that downstream Slack apps can consume (JSON payloads, formatted summaries)
- Webhook or Slack workflow integration to trigger downstream processes
- Understanding the specific APIs and data formats those existing sales tools expect

**Architectural implication:** If Slack is the operating surface, then the backend is not optional — it is the prerequisite. A Slack bot cannot interact with a client-side SPA. The backend must expose the full VCC pipeline as an API that the Slack bot (and potentially other clients) can call. This strengthens the case for Option B (Full API Backend) or at minimum a robust Option C (Hybrid) that can serve headless clients.

**This also reframes the module question:** The Sales Discovery lens may not primarily be a web UI at all. It may be a Slack-native experience with the web canvas as a read-only output view. The web UI becomes one client among several, not the only client.

**Question for the Architect:** If Slack is a first-class client, does the backend need to be designed API-first (headless) from day one? Does this change which architectural option we should pursue?

**Question for the UX role:** What is the minimum viable Slack experience that would impress the sales team at a demo? Is it the inbound flow (push transcript, get VCC), the copilot (conversational editing), or the outbound feed (VCC results flowing to proposal tools)? Can we stage these, or do they expect the full loop?

---

## The Multi-Content Ingest Question

R6 (multiple discovery content types) extends the pipeline's input schema. Currently, Passes A1/A2 accept a single text block (the discovery transcript). The field wants to feed in:

- Industry capability reference maps (structured: JSON or CSV)
- Customer application portfolios (semi-structured: spreadsheets, lists)
- Process catalogues (structured: BPMN exports, process lists)
- Org charts (semi-structured: hierarchy data)
- Existing documentation (unstructured: PDFs, Word docs)

**Architectural question:** Does each content type get its own preprocessing pass (normalise to a common intermediate representation before feeding the main pipeline), or does the pipeline become content-type-aware (Passes A1/A2 receive typed inputs and handle them differently)?

**Our lean:** Preprocessing into an intermediate representation (IR). The pipeline should receive a normalised input package, not raw heterogeneous files. This keeps the prompts clean and the pipeline testable. The IR schema becomes the contract between ingest and pipeline.

**Question for the Architect:** The existing `discovery-ir.ts` handles a single narrative. What should the multi-content IR look like? Is it a tagged union of content blocks, or a merged enriched narrative?

---

## Key Design Tensions for This Spar

### Tension 1: Speed to Market vs Architectural Integrity
The sales team wants a demo now. The customer wants access now. But a rushed backend creates technical debt that compounds. How do we build the minimum backend that satisfies the pull demand without creating migration pain?

### Tension 2: Bundle as File vs Bundle as Service
The bundle-as-file model (D-095) is a genuine architectural advantage: portable, versionable, no vendor lock-in. A backend necessarily centralises state. How do we preserve the file's portability while adding server-side persistence? Can the bundle remain the canonical format even with a backend?

### Tension 3: Web App vs API-First / Multi-Client
The current architecture is a web SPA that happens to call an LLM. The Slack integration reframes VCC as an API with multiple clients: a web canvas, a Slack bot, and potentially downstream sales tools. If the backend is API-first, the web frontend becomes one consumer among many. This is a fundamentally different product architecture. Who owns pipeline execution — the client, the server, or the edge? What are the implications for cost tracking, rate limiting, and audit?

### Tension 4: Module Granularity
R3 asks for modular features. But modules interact with each other: a Sales Discovery session might evolve into a Transformation engagement. Is the module boundary hard (separate projects) or soft (toggle features within a project)?

### Tension 5: LLM as Editor vs LLM as Generator
R5 (transcript-based updates) turns the LLM from a generator (create scaffold from nothing) into an editor (modify existing scaffold from instructions). These are fundamentally different cognitive tasks for the model. The generator can hallucinate freely within structural constraints. The editor must preserve existing content while applying targeted changes. Is this a prompt engineering problem or an architectural one?

### Tension 6: Single-Tenant MVP vs Multi-Tenant Architecture
The immediate need is "multiple users can access VCC." But the Salesforce sales team context implies multi-tenancy: different customers, different data, different access controls. Do we build single-tenant now and refactor later, or invest in multi-tenant foundations from the start?

---

## What We're Asking the Spar Participants

### For the Architect Role:
1. Which of the three architectural options (A/B/C) do you advocate, and why? Or is there a fourth option we haven't considered?
2. What is the minimum viable backend that satisfies R1 (multi-user) without blocking the path to R2-R6?
3. Where does the bundle format sit in the backend architecture — is it the persistence format, the API contract, the export format, or all three?
4. What is the most dangerous assumption in our current thinking?

### For the UX Role:
1. How should the module system present to users? Project templates at creation time? Dynamic mode switching? Progressive disclosure?
2. What does the round-trip editing experience look like? Inline editing on the canvas? A dedicated edit mode? A side panel?
3. How should conversational editing (R5) surface? A chat panel alongside the canvas? A revision submission form? Integration with Slack threads?
4. What is the minimum UX change needed to make VCC demo-ready for a sales team audience?

### For Both:
1. What should we build first? Propose a sequencing of R1-R6 that maximises customer value while minimising architectural risk.
2. Where is the boundary between "MVP for the Puretec demo" and "product for the sales team rollout"?
3. What should we explicitly NOT build yet, and what is the trigger condition for building it later?

Be direct. We have market pull and a window of opportunity. Over-engineering loses the moment. Under-engineering loses the customer.

---

## Reference: Current Decisions That Constrain This Spar

| Decision | Summary | Implication for Backend |
|----------|---------|------------------------|
| D-095 | Ontology without repository | Backend must not become the ontology — bundle remains portable |
| D-097 | Data architecture trajectory | Client-side graph index first, backend for multi-user collaboration |
| D-100 | Multi-lens architecture | Module system is already conceptually designed — needs operationalising |
| D-092 | Bundle save with dirty tracking | Mutation tracking exists client-side — needs server-side equivalent |
| D-088/089 | Edge Runtime + streaming + centralised LLM client | LLM call infrastructure exists — question is where it lives in backend world |
| D-050 | Three-layer heatmap (diagnostic/interpretive/intervention) | Schema evolution in flight — backend must handle both legacy and VNext formats |

---

## Reference: Current Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Zustand, TypeScript
- **Deployment:** Vercel (SPA + Edge Runtime serverless)
- **LLM:** Claude Sonnet via `/api/claude` Edge proxy, temperature 0
- **Backend stub:** Express, stateless, delegates to `@vcc/shared`
- **Persistence:** None (browser memory + local filesystem)
- **Auth:** None

---

*This briefing was prepared by Terry Roach and Claude (Anthropic) ahead of a design spar session on 11 March 2026. It follows the VCC Spar Protocol and is intended for agents acting in Architect and UX challenger roles.*
