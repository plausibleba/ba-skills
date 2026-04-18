# Current State — VCC Frontend

_Last updated: 2026-04-15 — Session 34 (Cross-mapping pipeline, activity log, metamodel audit) — v0.4.0_

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
- Capabilities: Searchable dropdown per stage — search existing L4 capabilities (with level badges + parent context) or type a new name to create. × to remove on hover
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

### Network View ✅ (MAJOR UPDATE — Session 23, default scheme fix Session 28)

- **Layer Scheme Selector**: toggle pills for Ecosystem/Knowledge, Front/Back Office, Strategic/Core/Enabling, Wardley Zones — redistributes VS across layers on each switch using journey order
- **Default scheme migration**: Existing scaffolds on "ecosystem-knowledge" auto-migrate to Front Office / Back Office on first load (one-time, via `hasMigrated` ref guard)
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
- ~~R-001: Journey state machine~~ ✅ Complete (Session 31)
- R-005: Discovery Intake monolith (~1000 lines)
- R-007: Layer scheme not persisted as project setting
- ~~R-010: Scaffold type is `any` throughout~~ ✅ Complete (Session 31)
- R-013: Phases 1-2 complete (record lifecycle coupling + adjacency edges). Phase 3 pending: cross-VS lifecycle flow in Network view
- R-014/R-015: Partially addressed (topological sort, shared layer schemes)

---

## PlausibleBA BA Skills Library

_Last updated: 2026-03-31_

### Source of Truth
- **Development**: `vcc/packages/frontend/ba-skills/` (in VCC repo)
- **Distribution**: `plausibleba/ba-skills` on GitHub (marketplace repo — needs manual sync from VCC)
- **Website downloads**: `vcc/website/downloads/` (`.skill` + `.zip` formats)

### Skills (4)
| Skill | Command | Description |
|-------|---------|-------------|
| ba-plausibleba | `/plausibleba` | Orchestrator — all three in one guided flow |
| ba-capability-mapping | `/capability-map` | BIZBOK-grounded MECE capability hierarchy (L1-L3) |
| ba-concept-model | `/concept-model` | Business object taxonomy (Capsicum Triad) |
| ba-value-streams | `/value-stream` | Staged value delivery with outcome chains |

### Post-Delivery Behaviour (updated Session 25)
All four skills now auto-generate exports after rendering (no user prompt needed):
- XLSX workbook + JSON bundle with clickable `computer://` download links
- Companion skill recommendations (e.g. Capability Map → Concept Model → Value Stream)

### Distribution Formats
| Format | Audience | Structure |
|--------|----------|-----------|
| `.skill` | Cowork upload (primary) | Single folder + single SKILL.md |
| `.zip` | Claude Code (`~/.claude/skills/`) | Folder + SKILL.md + `commands/` subfolder |

### Marketplace Status
- **Claude Plugin Marketplace**: Resubmitted 31 March 2026. Pending review. Previous submission (16 March) rejected with no feedback.
- **License**: CC BY-SA 4.0 (LICENSE file in ba-skills repo)

### Sync Status
All four SKILL.md files in the `plausibleba/ba-skills` repo are now in sync with the VCC source (commit `c6cabfa`, 31 March 2026).

---

## PlausibleBA Website (plausibleba.com)

_Last updated: 2026-03-31_

### Deployment
- Repo: `plausibleba/website` on GitHub → auto-deploys to Vercel
- Local working copy: `vcc/website/` (has own `.git` pointing at plausibleba/website remote)
- Push from Mac Mini: `cd ~/projects/vcc/website && git push origin main`

### Lead Capture (fully operational as of 19 March)
- **Email gate**: Name + email collected before first canvas generation
- **Rate limiting**: 3 canvas sessions per email (2-min session window deduplicates multi-pass runs)
- **Vercel KV (Upstash Redis)**: `user:{email}` keys with count, timestamps — syd1 free tier
- **Google Sheets**: Webhook fires on each new session → "PlausibleBA Leads" spreadsheet
- **Leads API**: `GET /api/leads?key=PBA-LEADS-2026` returns all leads as JSON
- **Env vars**: ANTHROPIC_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN, LEADS_API_KEY, GSHEET_WEBHOOK_URL

### Install Page (updated Session 25)
- Primary download: `.skill` files for Cowork upload
- Secondary: `.zip` files linked as Claude Code fallback
- Step 4 updated to describe auto-generated exports and companion skill recommendations

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate` | POST | LLM proxy — rate-limited, streams SSE from Anthropic |
| `/api/leads` | GET | Lead list — protected by LEADS_API_KEY query param |
| `/api/claim-bundle` | POST/GET | Bundle handoff — POST stores bundle in KV (returns token), GET retrieves+deletes by token |

---

### D-118 Enrichment/Diagnostic Refactoring — Phase 1 COMPLETE ✅ (Sessions 26-27)

SPAR design review completed with Technical Architect (GPT-4o) and Functional Design Architect (Gemini). Decision Record D-118 + D-118a locked. Full Phase 1 built and compiling.

**Domain modules (all new, `src/domain/`):**
- `enrichment-taxonomy.ts` — canonical registry of 13 operations (5 enrichments, 8 diagnostics), ExternalInputArtefact with provenance ("provided"|"generated"), DiagnosticConfidence propagation, StalenessDelta computation, SWOT/Metrics Library types
- `scaffold-hash.ts` — deterministic content hash (cyrb53, `sh_` prefix), replaces `Date.now()` hash
- `readiness-engine.ts` — computed readiness states: Skeleton → Grounded → Detailed → Assessed → Governed
- `nba-engine.ts` — Next-Best-Action recommendation with provenance-weighted scoring (+5 provided, +3 generated)
- `model-checkpoints.ts` — IndexedDB checkpointing with auto-prune (50/branch), pin, label

**Store integration (new + modified, `src/store/`):**
- `d118-store.ts` — NEW Zustand store bridging domain modules: diagnostic artefacts, external inputs, scaffold hash, checkpoints, derived readiness/NBA
- `canvas-store.ts` — MODIFIED: now uses deterministic `computeScaffoldHash()` instead of `Date.now()` hash

**Components (new + restructured, `src/components/`):**
- `NBABanner.tsx` — floating banner for cross-view NBA surface (standard recommendation + stale diagnostic warning)
- `EnrichmentView.tsx` — RESTRUCTURED (Session 27): replaced 5-category layout with 2-zone Enrichment/Diagnostic layout. New sub-components: ReadinessStepper (horizontal pill chain Skeleton→Governed), NBACard (recommended next action), ExternalInputsPanel (collapsible, provenance badges, ✦ Generate buttons), CrossMappingBuilder, CustomSkillsManager, SkillEditorModal. Wired to d118-store for readiness, NBA, diagnostic artefacts, external inputs.
- `FrictionView.tsx` — MODIFIED: NBABanner with `staleDiagnosticId="friction"`
- `CanvasView.tsx` — MODIFIED: NBABanner (general NBA recommendation)
- `CapabilityMapView.tsx` — MODIFIED: NBABanner with `staleDiagnosticId="maturity"`
- `NetworkView.tsx` — MODIFIED: NBABanner with `staleDiagnosticId="dependencies"`

**Staleness UX (Session 27):**
- Diagnostic cards: CSS desaturation (opacity 0.55, saturate 0.3) when stale
- Amber staleness banner with quantified delta summary and Re-run button
- NBABanner integrated into 4 canvas views with view-specific staleDiagnosticId

**Session 28 polish:**
- `EnrichmentView.tsx` — full-width dark mode background wrapper (`tv.bgPrimary`)
- `NetworkView.tsx` — auto-migrate existing scaffolds from ecosystem-knowledge to front-back default scheme on first load
- `SideNav.tsx` — section header info icons (ⓘ) now visible at 50% white opacity (was ~13% effective opacity due to stacked opacity), hover highlight on headers, `pointer-events: none` when collapsed
- `layer-schemes.ts` — `DEFAULT_SCHEME` changed to Front Office / Back Office (Session 27)

**UX prototypes (`docs/`):**
- `ux-prototype-enrichment-v2.html` — initial two-zone layout, readiness stepper, staleness desaturation
- `ux-prototype-enrichment-v3.html` — adds provenance badges, ✦ Generate buttons, cross-view NBA banners, View All external input detail modal with SWOT grid

---

### Session 29 — Bug Fixes + R-010 Strict Types (7 April 2026)

**Bug fixes (4):**
- PPIT role duplication: v5 field name fallback (`enabledByCapabilityIds`) + prompt improvement
- Activity Flows empty: batched enrichment (≤10 activities/call, 700 tokens/activity) + canvas store fallback in `ActivityFlowsView`
- Cross-mapping NBA: `mappingPairCount` from enrichment store, not empty `scaffold.elements.crossMaps`
- Policy cards invisible: `mvcCards` feature flag enabled across all project modules

**R-010 — Strict scaffold type interfaces (22 files, 454 insertions):**
- New types: `PPITEntry`, `ScaffoldElements`, `ScaffoldRole`, `ScaffoldOutcome`, `ScaffoldTechnologyApp`, `ScaffoldConcept`
- Helper: `getCapabilityIds(act)` resolves v4/v5 capability field name ambiguity
- Expanded: `ScaffoldActivity` (capabilityPPIT, informationObjectIds, enabledByCapabilityIds, valueStreamId, stageNumber, description), `ScaffoldValueStream` (layoutZone, zone, accountableStakeholder, activityChainHead), `ScaffoldData` (layoutZones)
- `as any` reduced 166 → 53 (68% reduction). 7 `@ts-nocheck` files remain (network-derivation.ts and FrictionView.tsx cleared in Session 31).

---

## Known Gaps / Next Steps

### Immediate (v0.5.0 completion)
1. **Verify tier gating end-to-end** — test with DevTierSwitcher that switching to free tier blocks actions and shows upsell modal in deployed app
2. **Fix tier-store.ts type errors** — Supabase database types don't match the migration columns (tier, trial_ends_at, etc.). Regenerate types from migration or add manual type overrides
3. **Stripe integration** — wire the upsell modal's "Upgrade" button to Stripe checkout for starter/individual tiers
4. Wire "What's New" modal + version bump to v0.5.0 in app header

### Near Term (Structural Hardening)
5. ~~**TypeScript type drift cleanup (R-010)** — align types with runtime data~~ ✅ Session 29
6. ~~**Client-side graph index** — in-memory adjacency map on bundle load (D-097 Step 1)~~ ✅ Session 30
7. ~~**Record-lifecycle coupling Phase 1+2** — recordClasses, primaryRecordClassId, lifecycleStates, lifecycleStateId, lifecycleAdjacency coupling~~ ✅ Session 30-32. Phase 3 (VS-boundary handoff, decision gates) remains
8. ~~**Capability selector** — pick from existing capabilities before "create new" (D-097 Step 1 lite)~~ ✅ Session 31
9. ~~**`as any` cleanup** — network-derivation.ts and FrictionView.tsx cleared~~ ✅ Session 31. 53 instances remain in 7 `@ts-nocheck` files
10. ~~**R-001 Journey state machine** — AppPhase discriminated union replaces scattered viewMode + UI flags~~ ✅ Session 31 (Phase 1 + Phase 2 complete; viewMode deprecated, zero external consumers)
11. Phase 3: Surface Form view from Canvas — round-trip editing between form and canvas
12. Refactoring sprint using debt register (R-002 through R-009, R-012 remaining)

### Session 34 Additions (2026-04-15)
- Cross-mapping enrichment pipeline — VS-scoped, per-VS selective, matching filter, write-through
- Toast notification system + Session Activity log
- Capability Inspector cross-map section (Realised in N Stages)
- Stage delete confirmation dialog
- LLM model upgraded to claude-sonnet-4-6 (centralised DEFAULT_MODEL)
- Metamodel audit document: `docs/VCC-Metamodel-Audit-v0.4.0.docx`
- Repo cleanup: duplicates removed, superseded files archived

### Future
12. **Agentic orchestration** — executable state machine driven by record lifecycle (R-013)
13. **Ontology-as-schema validation** — formal metamodel definitions (D-097 Step 2)
14. F-001 phase 2: delete observations, reassign binding constraint
15. Multi-vendor support beyond Salesforce
16. Eric Broda MVC demo — Governance Kernel overlay on StageCard
17. Multi-user modelling backend (D-097 upgrade trigger)
18. **Graph-based backend** — SPAR briefing prepared (`docs/SPAR-BRIEFING-graph-backend.md`). Three options: in-memory graph layer, client-side triplestore, server-side graph DB. Triggered by metamodel complexity (Session 34).
19. **R-016: PPIT as relationships** — capabilityPPIT should be direct typed relationships on Capability, not a compound blob on Activity
20. **R-017: Deprecate enabledByCapabilityIds** — canonicalise on requiresCapabilityIds everywhere
21. **Workbench capability inspector** — Workbench catalog grid lacks click-to-inspect for capabilities (exists in CapabilityMapView but not wired into Workbench)
22. **Cross-mapping confidence tuning** — current threshold (0.5) produces prolific mappings. Consider L2-only constraint and 0.7 threshold for tighter results
