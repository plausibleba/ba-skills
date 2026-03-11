# ARCHITECT CHALLENGE RESPONSE
## VCC Backend Architecture & Multi-User Evolution
**Date:** 11 March 2026
**Role:** External Reviewer / Architect Challenger
**For:** Terry Roach, Claude (Implementer), UX Challenger

---

## EXECUTIVE POSITION

I advocate for **Option C (Hybrid — Backend for State, Edge for Compute)** as the path forward, with a crucial reframing: we are not building a backend. We are **separating concerns into layers** that can evolve independently. The bundle remains the canonical portable format. The backend exists to coordinate multi-user state, not to own the ontology.

However, this decision comes with a structural warning: the Slack integration requirement is *not* an optional feature on top of the architecture — it is a forcing function that determines whether the entire architecture holds. If Slack is a first-class client (not a bolt-on), then the backend must be API-first from day one. This is not a separate tension. This is a constraint that collapses Options A and B into incoherence.

Let me work through this systematically.

---

## PART 1: WHICH OPTION, AND WHY

### Why Not Option A (Thin Persistence Layer)

Option A is architecturally clean but strategically insufficient. It solves R1 (multi-user access) and partially R2 (persistence enables reload/edit). It fails on R4, R5, and R6 in ways that matter:

- **R4 (Slack):** A Slack bot cannot be a thin client to a SPA. It needs a headless API. Option A leaves you with a web app that happens to have a database, not a platform with multiple clients.
- **R5 (transcript-based updates):** The LLM revision pass (Pass 5) lives where? If it runs client-side, every client must have the full pipeline embedded. If it runs server-side, you've built half of Option B anyway.
- **R6 (multi-content ingest):** Preprocessing structured inputs (spreadsheets, process catalogues, org charts) requires server-side file handling, type detection, and normalization. This is not a client-side concern.

**The trap:** You ship Option A as a "minimum" backend. Six months later, the sales team asks for Slack integration, and you realise Option A makes it harder, not easier. You end up refactoring to Option B anyway, creating exactly the migration debt you tried to avoid.

**Status:** Reject Option A. It is not a pragmatic stepping stone — it is a false economy.

### Why Not Option B (Full API Backend)

Option B is the "correct" architecture for a product at scale. It is also overkill for a team that hasn't yet confirmed product-market fit beyond one customer and doesn't have infrastructure expertise.

The risks are real:
- **Operational complexity:** You are now running a service, not deploying a static SPA. This means uptime SLOs, monitoring, scaling decisions, database migrations, and on-call support.
- **Cost optics:** Option B requires infrastructure. Every LLM call goes through your backend, which means you pay for compute even if it's just passing requests to Claude. The bundle-as-file model (D-095) gives you the advantage of being *cheap to operate* — this trades that away.
- **Over-specification:** The full API surface (project CRUD, pipeline execution, mutation endpoints, auth roles, audit trails) is correct for a product, but it is also a lot of surface to specify, test, and maintain before you even know if the sales team wants this or something else.

**Status:** Option B is the future. Not the now.

### Why Option C, Reframed

Option C is correct — but not for the reasons usually given. The framing of "best of both worlds" is weak. The real insight is this:

**The backend's job is coordination and persistence. The edge's job is computation. These are different concerns.**

The architecture should be:
- **Edge Runtime:** LLM pipeline passes (A1-A5) continue here. This is where you have the most operational control and the fewest coordination problems. Streaming works better at the edge. Cost is clearer. Debugging is simpler.
- **Backend:** User identity, bundle versioning, mutation audit trails, module preferences, Slack webhook dispatch, job queuing for async work that doesn't need streaming.
- **State:** Postgres + JSONB for bundle storage (for now). Redis for job state. No complex ORM. No schema migrations.

This is Option C, but I want to be clearer about what it is *not*:

- It is not "Vercel doing the heavy lifting." Vercel is just deployment convenience. You could run this on any managed host.
- It is not "microservices." It is two separate concerns, not a distributed system.
- It is not "best of both worlds" — it is "appropriate separation of concerns."

**Why this works:**

1. **Slack integration becomes feasible.** The backend exposes a `/graphql` or `/api/projects/:id/...` endpoint. Slack bot calls it. Web frontend calls it. Both are clients to the same backend.
2. **LLM costs stay predictable.** You invoice Claude calls directly, not as part of your infrastructure bill.
3. **Bundle remains portable.** You export a bundle and run it offline. The backend is optional infrastructure, not a requirement for the product to work.
4. **Scaling happens at the right layer.** If you need to add more LLM throughput, you tune edge function concurrency. If you need more user load, you scale the backend database.

**Status:** Advocate for Option C. But reframe it as "API-first backend with edge compute," not "hybrid."

---

## PART 2: THE MINIMUM VIABLE BACKEND FOR R1

### What We're Actually Building for R1

R1 is "multiple users access VCC." This is not as trivial as "add a database." It requires:

1. **Authentication.** Users log in. We know who they are.
2. **Project isolation.** User A's bundles are not visible to User B.
3. **Shared access.** User A can share a bundle with User B, with a permission level (view / edit).
4. **Persistence.** When User A logs out, their bundle is still there when they log back in.
5. **Concurrency safety.** If User A and User B both edit the same bundle simultaneously, we don't lose data.

### Minimum Viable Schema

Three tables, no more:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  auth_provider VARCHAR,
  created_at TIMESTAMP
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name VARCHAR,
  bundle JSONB,
  schema_version INT,
  module VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  revision INT -- optimistic lock counter
);

CREATE TABLE access_grants (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  permission ENUM ('view', 'edit'),
  created_at TIMESTAMP
);
```

No audit tables yet. No mutation logs. No role hierarchy. No feature flags. Those are V2.

### API Surface for R1

Four endpoints, no more:

```
GET  /api/projects          -- list my projects
POST /api/projects          -- create new project
GET  /api/projects/:id      -- fetch bundle
PATCH /api/projects/:id     -- update bundle (optimistic lock check)
```

Plus auth endpoints (sign in, token refresh). Use Supabase Auth or Clerk — do not write your own.

### Concurrency Handling for R1

The "revision" field on projects table handles optimistic locking. When the frontend saves a bundle:

1. Frontend sends: `{ bundle, knownRevision: 5 }`
2. Server checks: `SELECT revision FROM projects WHERE id = ?`
3. If `revision == 5`, apply the update and increment revision to 6
4. If `revision > 5`, return HTTP 409 Conflict. Frontend must reload and retry.

**My position:** Accept optimistic locking for MVP. Real-time co-editing is a V2 feature triggered when you have *multiple customers reporting this as a blocker.*

---

## PART 3: WHERE DOES THE BUNDLE SIT

### The Bundle is Three Things Simultaneously

1. **Persistence format:** How the data is stored at rest (JSONB in Postgres, or JSON file on disk).
2. **API contract:** The JSON schema that clients and servers exchange.
3. **Export format:** What the user downloads when they want to take their data elsewhere.

**Here is the key insight:** All three must be *identical*. The same JSON schema. No transformation layers.

**The principle: there is one canonical bundle format. Everything else derives from it.**

### Data Model Decision

I recommend **document storage (JSONB in Postgres), not normalised relational**.

**Why:**
1. **No impedance mismatch.** The bundle is a JSON document. Postgres JSONB stores it as-is.
2. **Schema flexibility.** Add a field to the Activity object → add it to the schema version → migrate old bundles on read. No migration scripts.
3. **Audit is simpler.** You version the entire document, not individual rows.

**When do you move to normalised storage?** When you have written three cross-project queries in production and noticed they are slow. **Trigger condition:** Performance-driven, not architecture-driven.

### Schema Evolution Policy

**Decision:** Single canonical schema version in the backend. Automatic migration on read.

**Rationale:** Server enforces a single canonical schema. No multi-version confusion. Old clients can still work. No coordination required.

---

## PART 4: THE MOST DANGEROUS ASSUMPTION

**The most dangerous assumption is that Slack is an integration, not a transformation of the product.**

The field tells you the Slack team operates Slack-native. They don't context-switch to web apps for sales tools. They expect Slack to be *the operating surface*.

**If you underestimate this,** you will:
1. Build Option A (thin persistence layer) for "the web."
2. Discover you need API endpoints that Option A doesn't provide.
3. Refactor the entire backend to be API-first.
4. Realise you should have done this from the start.

**My recommendation:** Shift the demo narrative. Do not demo VCC as "a web app for multiple users." Demo it as "a Slack-native AI agent that runs operating model diagnostics." The web canvas is where you *review* the results. The Slack bot is where you *work*.

---

## PART 5: BUILD SEQUENCE AND MVP BOUNDARIES

### Sequencing R1-R6 (Proposed)

**Phase 1 (Week 1-2):** R1 + R2: Multi-user backend with auth, project isolation, shared access. Round-trip editing (structured edit UI on canvas, mutations to backend).

**Phase 2 (Week 3-4):** R3 + R5: Module system (project creation chooses module). Pass 5 (Revision) and conversational editing (API endpoint + UI component).

**Phase 3 (Week 5-6):** R6 + R4 Level 1: Multi-content ingest (preprocessing pipeline → IR). Slack integration (inbound transcript upload, respond with canvas).

**Phase 4 (Week 7-8):** R4 Level 2 + 3: Slack conversational copilot and outbound feed to downstream sales tools.

### MVP for Puretec Demo

**Minimum required:** R1, R2, R3 (Sales Discovery module selected). **Time budget:** 3 weeks.

### Product for Sales Team Rollout

**Additional required:** R4 Level 1 & 2, R5 fully baked, R6 partially. **Time budget:** 6 weeks.

---

## PART 6: WHAT NOT TO BUILD YET

### Explicitly Defer

1. **Multi-tenant with customer isolation.** Trigger: three or more independent organisations wanting data isolation.
2. **Full audit trails and compliance features.** Trigger: customer asks about FedRAMP or compliance reports.
3. **Real-time collaborative editing.** Trigger: >30% of edits happening with concurrent users.
4. **Graph storage and complex queries.** Trigger: three slow cross-project queries in production.
5. **Role-based access control (RBAC).** Trigger: customer with >10 people needing different access levels.
6. **Feature flags and A/B testing.** Trigger: need to experiment within same module.
7. **Offline-first architecture.** Trigger: field teams frequently offline.

**Defer cleanly.** Create stub functions that do nothing. When you implement, the code path is already there.

---

## PART 7: ROUND-TRIP EDITING — SEPARATE PIPELINES WITH EXPLICIT MERGE

### My Position: Separate Pipelines

**Structured editing pipeline:**
1. User edits field on canvas → Frontend validates → PATCH /api/projects/:id with delta → Server validates and applies.

**Conversational editing pipeline (Pass 5: Revision):**
1. User submits correction → POST /api/projects/:id/revise with correction text + current bundle → Server calls Claude (Pass 5) → Returns proposed delta (not auto-applied) → Frontend shows preview → User clicks "Apply" → PATCH endpoint.

**Why separate:** Provenance is explicit. Audit is clear. Reversibility preserved.

---

## PART 8: MULTI-CONTENT INGEST — INTERMEDIATE REPRESENTATION

### The Solution: Canonical IR Schema

All ingest paths produce the same IR. Pass A1/A2 receives the IR, not raw files. The pipeline is content-type-agnostic.

**Where preprocessing happens:** Backend. Centralized logic, easier to test, easier to evolve.

```
POST /api/projects/:id/ingest
  Content-Type: multipart/form-data
  - file: <the uploaded file>
  - fileType: 'csv_orgchart' | 'bpmn' | 'portfolio_csv' | 'narrative_text'
  Returns: { ir: DiscoveryIR, preview: string }
```

---

## PART 9: ADDRESSING THE SIX TENSIONS

### Tension 1: Speed to Market vs Architectural Integrity
**Choose speed.** Build the minimum backend. Demo by end of Week 2. Schedule Phase 2 spar for architectural integrity after the demo.

### Tension 2: Bundle as File vs Bundle as Service
**The bundle is both.** Same JSON schema whether stored as a file on disk or JSONB in Postgres. Export always produces a file. Import always accepts a file.

### Tension 3: Web App vs API-First / Multi-Client
**API-first from day one.** Design the API surface first. Web frontend is a client, not the product.

### Tension 4: Module Granularity
**Hard boundary at creation time.** Simpler, clearer, no complex state.

### Tension 5: LLM as Editor vs LLM as Generator
**Different cognitive tasks.** Design Pass 5 (Revision) differently from Passes A1-A4. Delta-only output, preserve existing structure, minimal change principle.

### Tension 6: Single-Tenant MVP vs Multi-Tenant
**Single-tenant now.** Add `workspace_id` field everywhere as preparation. Never use it in the MVP (there is only one workspace, ID = "default"). When you ship multi-tenancy, the foundation is there.

---

## PROPOSED DECISION RECORDS

### DEC-103: Backend Architecture for Multi-User
**Decided:** Option C (Hybrid — API-first backend with edge compute). Supabase for auth + persistence. Vercel Edge for LLM pipeline. Bundle storage in JSONB. Optimistic locking. Hard module boundaries.

### DEC-104: Minimum Backend Surface for R1
**Decided:** Three tables (users, projects, access_grants). Four endpoints. Supabase Auth. Optimistic locking with revision counters.

### DEC-105: Bundle Format as Canonical API Contract
**Decided:** One bundle format for persistence, API exchange, and export. Single canonical schema version. Auto-migrate on read.

### DEC-106: Separate Editing Pipelines
**Decided:** Structured edits via PATCH. Conversational edits via Pass 5 with preview/approval. Both use same final PATCH for persistence.

### DEC-107: API-First Backend Design
**Decided:** All business logic is client-agnostic. Web and Slack are both API consumers.

---

## FINAL QUESTIONS FOR TERRY

1. **Can the Slack team wait for Level 1-2 integration, or do they need it in the Puretec demo?**
2. **What is the definition of success for the Puretec demo?**
3. **What is the go/no-go criteria for sales team rollout?**
4. **Who is building the backend?**

These answers determine the final decision.
