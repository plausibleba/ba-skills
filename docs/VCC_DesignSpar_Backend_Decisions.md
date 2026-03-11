# VCC Design Spar — Backend Architecture Decision Record
**Date:** 11 March 2026
**Spar participants:** Terry Roach (decision maker), Claude/Opus (implementer), Architect challenger, UX challenger
**Spar phase:** Phase 1 — Before Building

---

## Governing Constraints (from Terry, post-spar)

These four statements from the decision maker override challenger positions where they conflict:

1. **No messaging platform lock-in.** The product must work without Slack. Slack is one integration channel, not the operating surface. The web app is the primary client. Messaging integrations (Slack, Teams, standalone) are pluggable adapters behind a common API.

2. **Success definition is a Salesforce sales team trial.** Not a single customer demo. Target: a dozen reps running VCC against a dozen clients over a trial period. Scale: ~20-30 users, ~12-15 projects.

3. **One person + AI builds everything.** There is no team. Every architectural choice must pass the test: "can one person build and maintain this with AI support?" Managed services only. Zero custom DevOps. If it's beyond this capability, pare back scope.

4. **Go/no-go based on trial outcomes.** Investment in production-grade features (multi-tenant, audit trails, compliance) happens only after the trial validates demand.

---

## DEC-108: Backend Architecture — Option C (Hybrid, API-First)

**Context:** Field demand for multi-user access. Six requirements (R1-R6) from the Puretec engagement. One-person team constraint eliminates Option B (full API backend) and makes managed services mandatory.

**Decided:**
- **Option C: API-first backend for state, edge for compute.**
- Backend: Supabase (Postgres + Auth + Row Level Security). Managed. No custom infra.
- LLM pipeline: Vercel Edge Runtime (existing). Passes A1-A5 stay edge-side.
- Web frontend: React SPA remains the primary client. Not secondary to any messaging platform.
- Messaging integrations: Slack (and later Teams, others) are pluggable API consumers. Not architecturally privileged.
- Bundle format: JSONB in Supabase Postgres. Same schema for storage, API exchange, and export.

**Deferred:**
- Custom backend server (Option B). Trigger: when Supabase limits are hit or custom business logic exceeds what edge functions can handle.
- Self-hosted deployment. Trigger: enterprise customer requires on-premise.

**Tensions resolved:**
- Slack-first vs web-first: Web is primary. Slack is one adapter. API-first design ensures both are served equally.
- Speed vs integrity: Managed services (Supabase) give architectural integrity without operational burden.
- Team size: One person can operate Supabase + Vercel. Cannot operate custom Express/Postgres/Redis.

**Rationale:** Supabase provides auth, database, row-level security, and realtime subscriptions out of the box. A solo developer can have multi-user persistence working in days, not weeks. The edge-resident LLM pipeline keeps the existing streaming architecture intact. API-first design means messaging integrations plug in later without refactoring.

---

## DEC-109: Minimum Backend Schema for Sales Team Trial

**Context:** Trial requires ~20-30 users across ~12-15 client projects. Need auth, project isolation, and shared access.

**Decided:**
- Three tables: `users`, `projects`, `project_access`
- Supabase Auth handles sign-in (Google OAuth, magic link email). No custom auth.
- Row Level Security (RLS) policies enforce project isolation at the database level.
- Optimistic locking via `revision` counter on projects table.
- `module` field on projects (VARCHAR, default 'sales-discovery'). Set at creation time.

**Schema:**
```sql
-- users table managed by Supabase Auth (auth.users)
-- projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT 'sales-discovery',
  bundle JSONB NOT NULL,
  schema_version INT NOT NULL DEFAULT 1,
  revision INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- project access (sharing)
CREATE TABLE project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- RLS: users see own projects + projects shared with them
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own projects" ON projects
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users see shared projects" ON projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM project_access WHERE user_id = auth.uid())
  );
CREATE POLICY "Owners can update" ON projects
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Editors can update" ON projects
  FOR UPDATE USING (
    id IN (SELECT project_id FROM project_access WHERE user_id = auth.uid() AND permission = 'edit')
  );
```

**API surface:** Supabase client library handles CRUD directly (no custom API layer needed for MVP). The frontend calls `supabase.from('projects').select()`, etc. RLS enforces permissions at the database level.

**Deferred:**
- Custom API endpoints. Trigger: when business logic exceeds what RLS + edge functions can express.
- Audit tables. Trigger: when a customer asks for change history.
- Workspace/tenant isolation. Trigger: when distinct organisations need data separation.

**Rationale:** Supabase RLS eliminates the need for a custom API layer for basic CRUD. The frontend talks directly to Postgres through the Supabase client, with security enforced at the row level. This is the fastest path to multi-user persistence for a solo developer.

---

## DEC-110: Bundle as Canonical Format

**Context:** The bundle is currently a JSON file on the user's filesystem. Moving to a backend requires deciding what role the bundle format plays.

**Decided:**
- Bundle JSON schema is the single source of truth for persistence, API exchange, and export.
- JSONB in Postgres stores the bundle as-is. No normalisation. No transformation layer.
- Single canonical schema version enforced by the backend. Old bundles auto-migrated on read.
- Export produces a JSON file with current schema version. Import accepts and migrates.
- The `@vcc/shared` validator runs on every write (via Supabase edge function or client-side).

**Deferred:**
- Normalised relational storage. Trigger: when cross-project queries are needed and JSONB is too slow.
- Graph storage. Trigger: when the ontology requires graph traversal queries.

**Rationale:** Aligns with D-095 (ontology without repository). No impedance mismatch. The bundle remains portable — export to file, import elsewhere, version in Git. The backend is just a more convenient place to store the file than the user's filesystem.

---

## DEC-111: Module System — Soft Boundaries with Progressive Disclosure

**Context:** Different users need different features. Architect proposed hard boundaries (locked at creation). UX proposed invisible context-inferred modules. Terry's constraint: one person building, must be simple.

**Decided:**
- Module is set at project creation (dropdown: Sales Discovery, Board Diagnostic, Transformation Planning).
- Module controls which pipeline passes are available and which UI panels render.
- Module can be changed later via project settings (soft boundary, not hard lock).
- No progressive disclosure in MVP — too complex to build and test for one person. Explicit choice is simpler.
- If a user switches module, existing data is preserved (not deleted). Panels appear/disappear but data persists in the bundle.

**Implementation:**
- `module` field on projects table.
- Frontend reads module and conditionally renders panels:
  - Sales Discovery: hides TransformationPane, MVC Cards, Requirements
  - Board Diagnostic: hides vendor enrichment, customer stories
  - Transformation: shows full feature set
- Pipeline passes gated by module config (e.g., Sales Discovery skips user story generation).

**Deferred:**
- Progressive disclosure / auto-inference. Trigger: UX testing shows users struggle with module choice.
- Custom modules. Trigger: customer requests a module configuration we haven't anticipated.

**Rationale:** Explicit module choice is simpler to build, test, and explain. Progressive disclosure is a better UX but harder to implement correctly — save it for after the trial when we have user feedback on whether the choice causes confusion.

---

## DEC-112: Editing Architecture — Structured Now, Conversational Later

**Context:** R2 (round-trip editing) and R5 (transcript-based conversational editing) are both needed. Both challengers agreed they should be separate pipelines. Terry's constraint: one person building.

**Decided:**
- **Phase 1 (trial):** Structured editing only. Edit mode on canvas. Direct field manipulation. Mutations save to backend via Supabase.
- **Phase 2 (post-trial):** Conversational editing via Pass 5 (Revision). Separate endpoint. Returns proposed delta. User approves before applying. Available from both web UI and messaging integrations.
- Both pipelines use the same final persistence path (Supabase update with optimistic lock).
- Provenance tracked: structured edits attributed to user, LLM revisions attributed to "VCC AI" with user approval recorded.

**Deferred:**
- Pass 5 (Revision) prompt engineering and implementation. Trigger: trial feedback shows users want conversational editing.
- Merge conflict resolution between structured and conversational edits. Trigger: when both are live simultaneously.

**Rationale:** Structured editing is deterministic, auditable, and sufficient for a trial. Conversational editing is the higher-value feature but requires Pass 5 prompt design, delta application logic, and an approval UX — too much scope for the initial trial.

---

## DEC-113: Messaging Integration Architecture — Pluggable Adapters

**Context:** Slack is the immediate opportunity (Salesforce owns Slack). But no platform lock-in per Terry's constraint.

**Decided:**
- Backend API is messaging-platform-agnostic. All business logic exposed as API endpoints (or Supabase edge functions).
- Messaging integrations are thin adapters: receive webhook from platform, call VCC API, format response for platform.
- Slack adapter built first (Slack app with webhook handler + Block Kit message formatting).
- Architecture supports Teams, WhatsApp Business, standalone web chat, or any future messaging platform.
- Adapter pattern: `SlackAdapter`, `TeamsAdapter`, etc. — each ~200-300 lines. Translates platform events to VCC API calls and VCC responses to platform message format.

**Slack levels (staged):**
- Level 0 (trial): Inbound only. Push transcript to channel, get summary + canvas link in thread.
- Level 1 (post-trial): Copilot. Conversational corrections via bot mention. Requires Pass 5.
- Level 2 (future): Outbound feed to downstream sales tools.

**Deferred:**
- Teams adapter. Trigger: customer without Slack requests it.
- Copilot (Level 1). Trigger: trial users request conversational editing from messaging.
- Outbound feed (Level 2). Trigger: understanding of downstream tool APIs and data formats.

**Rationale:** The adapter pattern ensures Slack is not architecturally privileged. Each adapter is small and self-contained. The VCC API is the product; adapters are distribution channels.

---

## DEC-114: Build Sequence for Sales Team Trial

**Context:** One person + AI. Target: sales team trial with ~12 clients.

**Decided — four phases:**

**Phase 1: Multi-User Web App (Weeks 1-3)**
- Supabase project setup (auth, database, RLS policies)
- Frontend: auth flow (login/logout), project list, create/load/save
- Frontend: module selection at project creation
- Frontend: basic edit mode on canvas (rename elements, edit fields, save to backend)
- Migrate existing Vercel deployment to use Supabase for persistence
- Test: 2-3 users can create projects, edit, and share

**Phase 2: Trial Readiness (Weeks 3-5)**
- Polish: loading states, error handling, conflict detection UX
- Project sharing: invite by email, permission levels
- Module-specific panel visibility (Sales Discovery hides transformation features)
- Visual polish for sales audience (Slack Block Kit not needed yet — web canvas is the demo)
- Test: 10+ users, 12+ projects, concurrent access

**Phase 3: Slack Adapter — Level 0 (Weeks 5-7)**
- Slack app setup (webhook handler as Supabase edge function)
- Inbound: file upload or message triggers VCC pipeline
- Outbound: summary card posted to thread with canvas link
- Test: sales rep pushes transcript via Slack, gets working canvas

**Phase 4: Refinement Based on Trial Feedback (Weeks 7+)**
- Scope determined by trial outcomes
- Likely candidates: conversational editing (R5), multi-content ingest (R6), additional messaging adapters

**What is explicitly NOT in scope for the trial:**
- Conversational editing (Pass 5 / R5)
- Multi-content ingest (R6)
- Multi-tenant workspace isolation
- Audit trails
- Real-time co-editing
- RBAC beyond view/edit
- Offline-first
- Graph storage

**Rationale:** Phases 1-2 get the trial running. Phase 3 adds the Slack story for sales credibility. Phase 4 is feedback-driven. A solo developer with AI can realistically deliver Phases 1-3 in 5-7 weeks.

---

## Summary of Locked Decisions

| Decision | Summary | Status |
|----------|---------|--------|
| DEC-108 | Option C: Supabase + Vercel Edge. API-first. Web is primary client. | LOCKED |
| DEC-109 | Three tables, RLS, optimistic locking. Supabase Auth. | LOCKED |
| DEC-110 | Bundle is canonical format for storage, API, and export. JSONB. | LOCKED |
| DEC-111 | Explicit module choice at creation. Soft boundary (changeable). | LOCKED |
| DEC-112 | Structured editing for trial. Conversational editing deferred to post-trial. | LOCKED |
| DEC-113 | Pluggable messaging adapters. Slack first. No platform lock-in. | LOCKED |
| DEC-114 | Four-phase build: Web MVP → Trial Ready → Slack → Feedback-driven | LOCKED |

---

## Tensions Resolved

| Tension | Resolution |
|---------|------------|
| Speed vs Integrity | Supabase gives both. Managed services = fast delivery + solid foundation. |
| Bundle File vs Service | Bundle format unchanged. Backend is just a better filing cabinet. |
| Web vs API-First | Web is primary. API-first design ensures messaging adapters plug in cleanly. |
| Module Granularity | Explicit choice, soft boundary. Simple to build, changeable later. |
| LLM Editor vs Generator | Deferred. Structured editing only for trial. Pass 5 post-trial. |
| Single vs Multi-Tenant | Single-tenant for trial. Schema prepared for future multi-tenant. |

---

*Decision record prepared 11 March 2026. To be appended to DECISIONS.md upon approval.*
