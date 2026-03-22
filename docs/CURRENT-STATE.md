# Current State — VCC Frontend

_Last updated: 2026-03-22 — Session 24 (Canvas→VCC handoff & commercial tier system) — v0.5.0 DRAFT_

---

## Deployment

| Environment | URL |
|-------------|-----|
| Production alias | https://frontend-five-eta-l0j2mk66gi.vercel.app |
| Deploy command | `cd packages/frontend && vercel --prod` |

### Vercel Project — Single Link (cleaned up Session 20)

Only one Vercel project is linked: **"frontend"** (`prj_I2Xc01mOmyu0FnvIQmcxPv4BVuTV`) at `packages/frontend/.vercel/`. A stale root-level "vcc" project link was removed in Session 20. The orphaned "vcc" project can optionally be deleted from the Vercel dashboard.

**Rule:** Always deploy from `packages/frontend/`. Never from the repo root.

---

## What Works (as of this session)

### End-to-end v5 bundle loading ✅

All five Water Filtration Company value streams load and render correctly in both Network View and Stage View (D-072–D-078).

### Scaffold Generation (PureTec presales scenario) ✅

Three-pass pipeline producing highest-quality scaffolds yet:
- Single source of truth: all prompts in `domain/pipeline/prompts/` (D-085)
- Deterministic formalisation (D-087) — consistent output across runs
- capabilityPPIT on every activity (D-086): roleIds, 3 sub-activities, informationObjectIds, technologyAppIds
- Shared capabilities across activities (structural coupling)
- Information objects, metrics, and tech wired correctly
- Gate 1 (FSM chain) + Gate 2 (referential integrity) validation with bounded repair

### Streaming Infrastructure ✅

All LLM calls stream through Edge Runtime proxy (D-088):
- `/api/claude.ts` — Edge Runtime + SSE streaming, extended output (128K) enabled
- `llm-client.ts` — shared `callLLM()` used by all 7 call sites (D-089)
- No raw `fetch` to API anywhere in codebase
- Survives Vercel Hobby 10s timeout via streaming (first bytes in ~1s)

### Friction Assessment (Pass C) ✅

- Wired to proper Pass C pipeline with scaffold skeleton and exact activity IDs (D-091)
- Generates observations for ALL value streams in one call
- Proper friction taxonomy (6 categories) with evidence basis rules
- Binding constraint scoring with eligibility criteria

### ID-vs-Label Display ✅

`humanizeId()` utility (D-084) converts raw IDs to readable display names across 9 components.

### Editable Canvas ✅ (NEW — Session 19)

The canvas is now a **living document**, not a read-only output:

**Inline editing (double-click any label):**
- Stage names (activity names) in dark column headers
- Capability names in capability blocks
- Entry/exit state names in Structure Pane
- VS name + description in canvas header
- Role names in Structure Pane chips

**Add/remove elements:**
- Capabilities: "+ Add Capability" per stage, × to remove on hover
- Stages: "+ Add Stage" at end of canvas, × on column headers
- Roles: "+ Role" in Structure Pane with smart name matching, × to remove
- Information Objects: + button per capability (amber, when I toggle active), × to remove
- Technology Apps: + button per capability (emerald, when T toggle active), × to remove

**PPIT sub-activities (Session 20):**
- Purple activity items (e.g., "Research potential customer profiles") are inline-editable, addable, removable
- Roles now edited per-capability (not per-stage), aggregated to "Participating Stakeholders" in stage header
- Smart role reuse via case-insensitive name matching against global registry

**Bundle save/load:**
- Save Bundle button in wizard toolbar (scaffold + heatmaps + user stories as v2.0 JSON)
- `scaffoldDirty` flag shows asterisk on button when unsaved changes exist
- FileLoader restores bundle v2.0 including user stories

### Stage View ✅

- Chain walk resolves correctly for both v4 and v5 bundles
- Capability blocks with PPIT layer toggles (Roles, Activities, Info, Tech)
- Entry/exit states, friction observations, binding constraint display
- User story generation via TransformationPane

### Network View ✅ (MAJOR UPDATE — Session 23)

- **Layer Scheme Selector**: toggle pills for Ecosystem/Knowledge, Front/Back Office, Strategic/Core/Enabling, Wardley Zones — redistributes VS across layers on each switch using journey order
- **Graph View**: draggable node-edge coupling visualisation with purple dashed coupling edges and blue flow edges
- **VS Editor Modal**: edit pencil on each card opens modal to change name, description, layer, stakeholder
- **Journey-Ordered Layout**: topological sort (Kahn's algorithm) replaces alphabetical within each zone row
- **Auto-Derive Layout Zones**: older scaffolds without `layoutZones` array auto-derive from per-VS fields
- All VS nodes render with friction badges and constrained indicator
- Topology coupling counts from derived TopologyView
- Click-through to Stage View works
- Load Assessment and Download Bundle buttons removed from header (declutter)

### Discovery Intake ✅ (UPDATED — Session 23)

- "Drop Transcript" renamed to "Provide Content"
- Tab-aware User Guide content (Provide Content vs Fill Form)
- Layer scheme selector replaces hardcoded Zone dropdown — 4 presets + Custom
- Heading line breaks, generic placeholder text, improved advice text prominence
- Scope toggle syncs to project store

### Canvas → VCC Bundle Handoff ✅ (NEW — Session 24)

Cross-domain handoff from PlausibleBA Canvas to VCC app:

- **Claim token flow**: Canvas POSTs bundle to `/api/claim-bundle` edge function → Vercel KV stores with `bndl_` prefix (24hr TTL) → redirects to VCC with `?claim=token&email=...`
- **sessionStorage bridge**: Claim token stashed in sessionStorage, survives Supabase auth redirects (OAuth, magic link) because sessionStorage is tab-scoped
- **One-time claim**: GET retrieves AND deletes from KV (consumed on first use)
- **Login pre-fill**: Email/name from Canvas email gate passed through URL params → sessionStorage → LoginPage useEffect. Contextual UI: green banner "Your operating model is ready to import", button "Sign in & import model"
- **Auto-import**: After auth completes, App.tsx useEffect consumes pending claim → fetches bundle → imports into project. Handles three formats: VCC-native, PlausibleBA, raw scaffold
- **Loading screen**: Spinner with "Importing your operating model..." shown during claim consumption
- **Test page**: `website/test-handoff.html` with full UX flow docs, edge cases table, and three-mode test harness

### Commercial Tier System ✅ (NEW — Session 24)

Action-level gating with upsell prompts:

- **Tier hierarchy**: free → trial (15 days, everything unlocked) → starter ($20/mo) → individual ($50/mo) → team
- **Architecture**: `tier-store.ts` (Zustand + Supabase sync) → `useGateCheck` hook → `UpsellModal` (contextual upgrade prompts)
- **Free tier rules**: READs free, WRITEs/EXECUTEs gated. Allowances: 1 friction analysis run, 3 bundle uploads
- **Gate wiring**: All write/execute actions across the app wrapped with `gate()` calls — InlineEdit (all edit pencils), ProjectList, FrictionView (all 5 tabs), DiscoveryIntake, NetworkView, CanvasView, StageWizard
- **23 gated action types**: edit_field, create_project, run_discovery, run_assessment, enrich_solutions, export_pdf, export_stories, upload_vendor_library, upload_stories, save_survey, edit_signals, etc.
- **DevTierSwitcher**: Development-only component for testing tier behaviour (bottom-right corner)
- **Supabase migration**: `profiles` table extended with tier, trial_ends_at, trial_started_at, active_use_cases columns; `usage_log` table for metered action tracking

---

## Architecture

### Pipeline Flow
```
Pass A1 (VS+Stages) → Pass A2 (Roles+Caps+Signals) → DiscoveryIR
                                                          ↓
                                               Pass B (Scaffold + Gate 1/2)
                                                          ↓
                                               Pass C (Friction Heatmaps)
```

### Prompt Files (domain/pipeline/prompts/)
| File | Purpose | Key Features |
|------|---------|-------------|
| pass-a1-value-streams.ts | VS extraction | Initiative exclusion, Trigger→Outcome naming |
| pass-a2-capability-mapping.ts | Roles, capabilities, signals | Shared capability rules, Verb-Noun convention |
| pass-b-scaffold-formalisation.ts | Scaffold formalisation | capabilityPPIT, Gate 1/2, registry population |
| pass-c-friction-analysis.ts | Friction assessment | 6-category taxonomy, binding constraint scoring |

### API Proxy
- Edge Runtime with SSE streaming pass-through
- `anthropic-beta: output-128k-2025-02-19` for extended output
- Pass B: 32K max tokens; other passes: 4K-8K

---

## Schema Compatibility

VCC frontend handles both v4 and v5 scaffold formats:

| Field | v4 | v5 |
|-------|----|----|
| VS activity list | `activityIds[]` | `activityChainHead` + `nextActivityId` on activity |
| VS layout zone | `layoutZone` | `zone` |
| Capability refs on activity | `requiresCapabilityIds` | `enabledByCapabilityIds` |
| PPIT breakdown | `activity.capabilityPPIT[capId]` | flat `performedByRoleIds` on activity |

---

## Data Architecture (D-095, D-097)

VCC deliberately separates ontology (enforced) from repository (absent). The scaffold JSON is an ontology-conformant document — portable, self-contained, no backend required. Three-step evolution planned: client-side graph index → ontology-as-schema validation → client-side graph visualisation. Multi-user is the upgrade trigger for a backend. See ARCHITECTURE.md § "Data Architecture — Ontology Without Repository" for full trajectory.

---

## Versioning

Starting v0.4.0, each working session produces a dot-release. Release notes live in `CHANGELOG.md` at the repo root and will be surfaced in-app via a "What's New" modal (TBD).

## Decision Log State

Decisions numbered D-001 through D-097. Single source of truth: `docs/DECISIONS.md`.

## Refactoring Debt Register

15 items tracked in `docs/REFACTORING-DEBT.md` (R-001 through R-015). Key items:
- R-001: Journey state machine (replaces scattered UI flags)
- R-005: Discovery Intake monolith (~1000 lines)
- R-007: Layer scheme not persisted as project setting
- R-010: Scaffold type is `any` throughout
- R-013: Topology coupling is resource-based, not record-lifecycle-based (critical for agentic orchestration)
- R-014/R-015: Partially addressed (topological sort, shared layer schemes)

---

## PlausibleBA Website (plausibleba.com)

_Last updated: 2026-03-19_

### Deployment
- Repo: `plausibleba/website` on GitHub → auto-deploys to Vercel
- Local working copy: `vcc/website/` (has own `.git` pointing at plausibleba/website remote)
- Push from laptop: `cd vcc/website && git push origin main`

### Lead Capture (fully operational as of 19 March)
- **Email gate**: Name + email collected before first canvas generation
- **Rate limiting**: 3 canvas sessions per email (2-min session window deduplicates multi-pass runs)
- **Vercel KV (Upstash Redis)**: `user:{email}` keys with count, timestamps — syd1 free tier
- **Google Sheets**: Webhook fires on each new session → "PlausibleBA Leads" spreadsheet
- **Leads API**: `GET /api/leads?key=PBA-LEADS-2026` returns all leads as JSON
- **Env vars**: ANTHROPIC_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN, LEADS_API_KEY, GSHEET_WEBHOOK_URL

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate` | POST | LLM proxy — rate-limited, streams SSE from Anthropic |
| `/api/leads` | GET | Lead list — protected by LEADS_API_KEY query param |
| `/api/claim-bundle` | POST/GET | Bundle handoff — POST stores bundle in KV (returns token), GET retrieves+deletes by token |

---

## Known Gaps / Next Steps

### Immediate (v0.5.0 completion)
1. **Verify tier gating end-to-end** — test with DevTierSwitcher that switching to free tier blocks actions and shows upsell modal in deployed app
2. **Fix tier-store.ts type errors** — Supabase database types don't match the migration columns (tier, trial_ends_at, etc.). Regenerate types from migration or add manual type overrides
3. **Stripe integration** — wire the upsell modal's "Upgrade" button to Stripe checkout for starter/individual tiers
4. Wire "What's New" modal + version bump to v0.5.0 in app header

### Near Term
5. **Record-lifecycle coupling** — make Record → Outcome Lifecycle mapping explicit in scaffold (R-013, foundation for agentic orchestration)
6. **Capability selector** — pick from existing capabilities before "create new" (D-097 Step 1 lite)
7. **Client-side graph index** — in-memory adjacency map on bundle load (D-097 Step 1)
8. **TypeScript type drift cleanup** — align types with runtime data (D-096)
9. Phase 3: Surface Form view from Canvas — round-trip editing between form and canvas
10. Refactoring sprint using debt register (R-001 through R-015)

### Future
11. **Agentic orchestration** — executable state machine driven by record lifecycle (R-013)
12. **Ontology-as-schema validation** — formal metamodel definitions (D-097 Step 2)
13. F-001 phase 2: delete observations, reassign binding constraint
14. Multi-vendor support beyond Salesforce
15. Eric Broda MVC demo — Governance Kernel overlay on StageCard
16. Multi-user modelling backend (D-097 upgrade trigger)
