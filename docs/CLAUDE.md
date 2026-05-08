# Value Cognition Canvas (VCC)

Read `CURRENT-STATE.md` first every session.
Read `SPAR_PROTOCOL.md` when design decisions are being discussed.
Read `DESIGN-PRINCIPLES.md` before any UI/component work.
Read `REFACTORING-DEBT.md` (R-001..R-017) before structural work.

## Project Overview

Board-level governance instrument for organisational value stream analysis. Visualises how value flows through an organisation — from strategic capability through operational activities to measurable outcomes. Built on CAPSICUM Framework (Roach 2011) — treats enterprise as finite state machine where stakeholder value interactions evolve through bounded states.

## Repository Layout (monorepo)

```
packages/
├── frontend/    React SPA (Vite + TypeScript) — main app, also hosts Vercel Edge functions in api/
├── backend/     Express + TypeScript service (validation/canvas/export endpoints; not yet deployed)
├── shared/      @vcc/shared — validator, schema-validator, canvas-generator, export-bundle
├── pipeline/    Python reference pipeline for the IIBA seed model (XLSX → scaffold)
└── cli/         @vcc/cli — `vcc` command (init, assemble, bundle, validate)
schemas/         JSON Schemas (Scaffold, FrictionHeatmap, CanvasViewModel, ExportBundle, ValidationReport, ba-skills-bundle)
website/         plausibleba.com static site + edge functions (claim-bundle, generate, leads)
supabase/        SQL migrations (initial, RLS fix, profiles, commercial tiers)
docs/            Architecture, decisions, current state, SPAR briefings
```

The active scaffold-generation pipeline is the **TypeScript multi-pass pipeline** in `packages/frontend/src/domain/pipeline/`, not the Python pipeline. Python pipeline produces the seed IIBA reference model only.

## Architecture

Three tiers. Frontend is the centre of mass.

```
Discovery (transcript / form)
        │
        ▼
LLM Pipeline (Edge proxy → /api/claude SSE)        Browser (React SPA)
A1 → A2 → B → C/D/E ────────────────────────────►  scaffold + heatmaps + cards + cross-maps
                                                          │
                                                          ▼
                                                   Network View ↔ Stage View ↔ Workbench ↔ Enrichment
```

### Frontend (`packages/frontend/`)
- **Runtime**: Vite + React 18 + TypeScript
- **State**: Zustand. ~13 stores under `src/store/` (canvas, project, auth, tier, enrichment, workbench, d118, theme, throughput-validator, vendor-library, discovery-session, graph-index, network-derivation, scaffold-resolver)
- **Styling**: Tailwind CSS with custom `vcc-*` palette. No component library — all custom components.
- **Views**: Network · Stage (Canvas) · Capability Map · Concept Graph · Friction · Workbench · Enrichment (5 sub-views) · Activity Flows · Discovery Intake · Project List
- **Edge functions** (`packages/frontend/api/`): `claude.ts` (LLM proxy, SSE streaming, 128K extended output), `checkout.ts`, `stripe-webhook.ts`
- **Auth & persistence**: Supabase (magic link + OAuth; profiles + commercial tier columns)
- **Deploy**: `cd packages/frontend && vercel --prod`. Single linked project: `frontend` (`prj_I2Xc01mOmyu0FnvIQmcxPv4BVuTV`).

### LLM Pipeline (`packages/frontend/src/domain/pipeline/`)
All pipeline passes run client-side via the Edge proxy. Default model centralised: `DEFAULT_MODEL = "claude-sonnet-4-6"` in `llm-client.ts`.

| Pass | File | Purpose |
|------|------|---------|
| A1 | `prompts/pass-a1-value-streams.ts` | VS + Stage extraction (slim output, jsonrepair recovery) |
| A2 | `prompts/pass-a2-capability-mapping.ts` | Roles, capabilities, signals (shared capability rules) |
| B  | `scaffold-formaliser.ts` + `prompts/pass-b-scaffold-formalisation.ts` | Scaffold formalisation, Gate 1 (FSM chain) + Gate 2 (referential integrity), bounded repair |
| C (friction) | `heatmap-analyser.ts` + `prompts/pass-c-friction-analysis.ts` | 6-category friction taxonomy + binding constraint scoring |
| C (PPIT) | `ppit-enricher.ts` + `prompts/pass-c-ppit-enrichment.ts` | Per-capability PPIT (roles, sub-activities, info, tech) |
| D | `card-generator.ts` + `prompts/pass-d-card-generation.ts` | MVC card generation |
| E | `cross-mapping-enricher.ts` + `prompts/pass-e-cross-mapping.ts` | VS-scoped cross-mapping (per-VS selective, matching filter, write-through) |

Orchestration: `pipeline-orchestrator.ts`. Discovery normalisation: `discovery-ir.ts`. Gate logic: `scaffold-gates.ts`. Sub-activity expansion: `subactivity-enricher.ts`.

LLM JSON robustness: large transcripts are recovered via the `jsonrepair` library; SSE collector detects Vercel Edge streaming timeouts; A1/A2 max_tokens raised to 32K with truncation detection.

### Backend (`packages/backend/`)
Express + TypeScript service. Wraps `@vcc/shared` validators and exposes endpoints for validation/canvas-generation/export bundle. Not currently in the deployed product path — the SPA does this work in-browser. Reserved for the multi-user backend trigger (D-097).

### Shared (`packages/shared/`)
Pure logic reused across frontend, backend, and CLI:
- `validator.ts` — V-SCAFFOLD-01..08 + V-FRICTION-01..05 + `computeScaffoldHash` (cyrb53 → `sh_` prefix; deterministic)
- `schema-validator.ts` — Ajv-based JSON-Schema checks
- `canvas-generator.ts` — scaffold → CanvasViewModel
- `export-bundle.ts` — JSZip pack/unpack of v2.0 bundles

### CLI (`packages/cli/`)
`vcc` command with `init`, `assemble`, `bundle`, `validate` sub-commands. Uses `@vcc/shared`.

## Core Principles

1. **Scaffold is canonical**: The JSON scaffold is the single source of truth. Everything renders from it.
2. **Deterministic**: Same inputs produce identical outputs and integrity hashes (`computeScaffoldHash`, not `Date.now()`).
3. **No mutation**: Validators and generators are pure functions. Never mutate input objects.
4. **Referential integrity**: All ID references must resolve within the appropriate element map.
5. **FSM semantics**: Activities have distinct pre/post outcomes (no no-ops). Outcome chains connect stages.
6. **IR is transient**: The intermediate representation is a workspace, not a durable artefact.
7. **LLMs propose, humans dispose**: No AI output directly creates canonical artefacts.
8. **Progressive disclosure**: Every layer of detail is gated behind a toggle or hover interaction.
9. **Ontology without repository**: Scaffold is an ontology-conformant document — portable, self-contained, no backend required until multi-user (D-095, D-097).

## Data Model (Scaffold JSON)

```
scaffold
├── scaffoldId, name, description
├── elements
│   ├── valueStreams       { id → name, description, activityIds | activityChainHead, layoutZone | zone, accountableStakeholder }
│   ├── activities         { id → name, description, preOutcomeId, postOutcomeId, nextActivityId,
│   │                        requiresCapabilityIds | enabledByCapabilityIds, performedByRoleIds,
│   │                        metricIds, controlIds, capabilityPPIT, valueStreamId, stageNumber }
│   ├── capabilities       { id → name, description }
│   ├── roles              { id → name }
│   ├── outcomes           { id → name, status }
│   ├── metrics            { id → name }
│   ├── controls           { id → name }
│   ├── informationObjects { id → name, type }
│   ├── technologyApps     { id → name, type }
│   ├── recordClasses      { id → name, primaryRecordClassId, lifecycleStates }   // R-013
│   └── concepts           { id → name, type, definition }
├── crossStreamOutcomes    [ { fromVsId, toVsId, outcomeId, direction } ]
├── lifecycleAdjacency     [ { fromStateId, toStateId, recordClassId } ]          // R-013 Phase 2
├── layoutZones            [ { id, label, order } ]
└── scaffoldIntegrityHash  // sh_<cyrb53>
```

### Schema Compatibility (v4 ↔ v5)

| Field | v4 | v5 |
|-------|----|----|
| VS activity list | `activityIds[]` | `activityChainHead` + `nextActivityId` on activity |
| VS layout zone | `layoutZone` | `zone` |
| Capability refs on activity | `requiresCapabilityIds` | `enabledByCapabilityIds` |
| PPIT breakdown | `activity.capabilityPPIT[capId]` | flat `performedByRoleIds` on activity |

Helper `getCapabilityIds(activity)` resolves the v4/v5 ambiguity. R-017 plans to canonicalise on `requiresCapabilityIds`.

### capabilityPPIT (per-activity, per-capability)

```
activity.capabilityPPIT[capabilityId] = {
  roleIds: [...],            // People — specific to this capability in this stage
  activities: [...],         // Atomic verb-object statements (3-6 per capability)
  informationObjectIds: [],  // Data consumed or produced
  technologyAppIds: []       // Systems used
}
```

R-016 plans to refactor PPIT into typed relationships on Capability, not a compound blob on Activity.

### Activity Statement Rules
- Verb + Object format (6-12 words max)
- No conjunctions, no composite logic
- Each activity creates or transforms state
- Each activity can fail — that's where friction anchors

## Colour Semantics (Global)

| Colour | Meaning |
|--------|---------|
| Blue | People / Roles |
| Violet | Activities |
| Amber | Information objects |
| Emerald | Technology |
| Red | Binding constraint / Critical |
| Slate-blue (vcc-700/900) | Primary brand / Headers |
| Gray | Neutral / Disabled |

These are absolute. A blue chip always means a role. No exceptions.

## Key Components

Paths are relative to `packages/frontend/src/`.

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root — `appPhase` journey state machine (R-001), claim-token consumption, tier init, analytics heartbeat |
| `components/SideNav.tsx` | Module nav with feature flags (`useModuleFeatures`) and section info icons |
| `store/canvas-store.ts` | Scaffold, network topology, VS selection, heatmaps, cards, deterministic hash |
| `store/project-store.ts` | Project list + Supabase persistence + auto-save |
| `store/auth-store.ts` | Supabase auth (magic link + OAuth + local mode) |
| `store/tier-store.ts` | Tier state (Zustand + Supabase sync), gate logic, usage tracking |
| `store/enrichment-store.ts` | Enrichment artefacts, cross-map state |
| `store/workbench-store.ts` | Vendor library / catalog browsing |
| `store/d118-store.ts` | D-118 bridge: diagnostic artefacts, external inputs, scaffold hash, checkpoints, derived readiness/NBA |
| `domain/readiness-engine.ts` | Skeleton → Grounded → Detailed → Assessed → Governed |
| `domain/nba-engine.ts` | Next-Best-Action with provenance-weighted scoring (+5 provided, +3 generated) |
| `domain/model-checkpoints.ts` | IndexedDB checkpointing (auto-prune 50/branch, pin, label) |
| `domain/scaffold-hash.ts` | `computeScaffoldHash()` — deterministic cyrb53, `sh_` prefix |
| `hooks/useGateCheck.ts` | `gate(action, callback, description)` wrapping for tier-gated actions |
| `components/UpsellModal.tsx` | Contextual upgrade prompt for gated free-tier actions |
| `components/LoginPage.tsx` | Auth page with claim-aware UI (pre-fill, contextual banner) |
| `components/NetworkView.tsx` | Enterprise DAG: layer-scheme selector, Graph view, VS Editor modal, journey-ordered layout |
| `components/CanvasView.tsx` | Stage view orchestrator: VS header, toolbar, stage columns, NBA banner |
| `components/canvas/StageColumn.tsx` | Per-stage column: header, structure pane, capabilities |
| `components/canvas/CapabilityBlock.tsx` | Capability with PPIT badge counts and expandable layers |
| `components/canvas/StructurePane.tsx` | Entry/exit states + metrics |
| `components/canvas/TransformationPane.tsx` | Friction observations, painpoints, ideas, requirements |
| `components/canvas/CanvasToolbar.tsx` | Structure/Transformation toggles + PPIT layer toggles |
| `components/canvas/InspectorPanel.tsx` | Click-to-inspect for capabilities (cross-map section: Realised in N Stages) |
| `components/canvas/InlineEdit.tsx` | Double-click-to-edit — tier-gated for all edit pencils |
| `components/CapabilityMapView.tsx` | BIZBOK-grounded MECE hierarchy view |
| `components/ConceptGraphView.tsx` | Concept model (Capsicum Triad) graph |
| `components/FrictionView.tsx` | Five friction tabs: observations, solutions, survey, signals, settings |
| `components/EnrichmentView.tsx` | Two-zone Enrichment/Diagnostic layout: ReadinessStepper, NBACard, ExternalInputsPanel, CrossMappingBuilder, CustomSkillsManager |
| `components/enrichment/*` | Sub-views: Structure, Mapping, Friction, Assessment, Custom |
| `components/WorkbenchView.tsx` | Vendor library / catalog grid |
| `components/ActivityFlowsView.tsx` | Per-VS activity flow with batched enrichment |
| `components/StructuredGraphExplorer.tsx` | Multi-element graph navigator |
| `components/DiscoveryIntake.tsx` | Provide Content / Fill Form intake — layer-scheme selector, scope toggle |
| `components/ProjectList.tsx` | Project picker with create/discover/import |
| `components/NBABanner.tsx` | Cross-view recommendation banner (general or stale-diagnostic-aware) |
| `components/Toast.tsx` | Toast notifications + Session Activity log |
| `components/DevTierSwitcher.tsx` | Dev-only tier switcher (bottom-right) |
| `utils/bundle-claim.ts` | Client-side claim-token lifecycle (extract, stash, fetch, consume) |
| `utils/auto-save.ts` | Debounced project auto-save |
| `lib/layer-schemes.ts` | Shared layer-scheme definitions (Front/Back, Strategic/Core/Enabling, Wardley, Ecosystem/Knowledge) |
| `lib/module-registry.ts` + `lib/module-features.ts` | Module catalogue and feature flags |
| `lib/guide-content.ts` | Tab-aware User Guide content |

## Commercial / Tier System

Action-level gating, not page-level. Free users browse everything; writes and executions are gated.

```
tier-store.ts (state + Supabase sync)
    ↓
useGateCheck — gate(action, callback, description)
    ↓ blocked?
UpsellModal — contextual "upgrade to unlock X"
```

**Tiers**: free → trial (15 days, everything unlocked) → starter ($20/mo per use case) → individual ($50/mo) → team
**Free allowances**: 1 friction analysis, 3 bundle uploads. READs free, WRITEs/EXECUTEs gated.
**23 gated action types**: edit_field, create_project, run_discovery, run_assessment, enrich_solutions, export_pdf, export_stories, upload_vendor_library, etc.
**Pattern**: `gate("action_name", () => originalCallback())` wraps existing onClick handlers.
**Stripe**: `api/checkout.ts` + `api/stripe-webhook.ts` (wiring in progress).

## Canvas → VCC Handoff

Cross-domain bundle transfer from plausibleba.com/canvas to app.plausibleba.com:

```
Canvas → POST /api/claim-bundle → Vercel KV (bndl_xxx, 24hr TTL)
                                       ↓
VCC ← ?claim=token&email=... → sessionStorage (survives auth redirect)
                                       ↓ after login
App.tsx useEffect → fetchClaimedBundle → import → create project
```

Edge function: `website/api/claim-bundle.ts`. Client lifecycle: `utils/bundle-claim.ts`. Handles three formats: VCC-native, PlausibleBA, raw scaffold.

## Validation Rules

Source of truth: `packages/shared/src/validator.ts`.

### Scaffold (V-SCAFFOLD-01..08)
- 01: Referential integrity (all IDs resolve)
- 02: No no-op transitions (pre ≠ post outcome)
- 03: No cycles in nextActivityId chain
- 04: ValueStream must have activities
- 06: No orphan metrics
- 07: Chain reachability (all VS activityIds reachable via nextActivityId)
- 08: Outcome chain consistency (adjacent activity outcomes match)

### Heatmap (V-FRICTION-01..05)
- 01: Anchor referential integrity
- 02: Binding anchor must appear in at least one observation
- 03: Binding anchor must appear in the specific referenced observation
- 04: valueStreamId must exist in scaffold
- 05: scaffoldIntegrityHash must match computed scaffold SHA-256

### Pipeline Gates (in `domain/pipeline/scaffold-gates.ts`)
- Gate 1: FSM chain integrity
- Gate 2: Referential integrity with bounded repair

## Scope Boundaries

**In scope**: Scaffold validation, canvas rendering (Network + Stage), PPIT layers, friction overlay, binding constraint, heatmap loading, multi-VS navigation, progressive disclosure, commercial tier gating, Canvas→VCC bundle handoff, Supabase auth, LLM pipeline (A1→A2→B→C/D/E), readiness/NBA recommendations, model checkpoints, cross-mapping enrichment, activity log, lifecycle-state coupling (R-013 Phase 1+2).

**In progress**: Stripe wiring for paid tiers, end-to-end tier testing, Supabase type regeneration, R-013 Phase 3 (cross-VS lifecycle flow in Network view), R-016/R-017 PPIT/capability-field canonicalisation, marketplace resubmission for skills.

**Explicitly deferred**: Runtime workflow execution, telemetry ingestion, automated metric calculation, simulation engine, multi-tenant SaaS, Throughput Impact Panel (see `POSTURE_non_prescriptive.md`), activity-level PPIT anchoring (currently capability-level), graph-based backend (D-097 — triggered by multi-user requirement; SPAR briefing in `SPAR-BRIEFING-graph-backend.md`).

## PlausibleBA Skills (in this repo)

Source: `packages/frontend/ba-skills/`. Four skills (`/plausibleba`, `/capability-map`, `/concept-model`, `/value-stream`) auto-generate XLSX + JSON exports after rendering and recommend companion skills. Distributed as `.skill` files (Cowork) and `.zip` files (Claude Code) via `plausibleba.com/install`. See `CURRENT-STATE.md` § "PlausibleBA BA Skills Library" for marketplace status and sync details.

## Versioning & Decision Log

- Each working session produces a dot-release. Notes in `CHANGELOG.md`.
- Decisions D-001..D-120. Single source of truth: `docs/DECISIONS.md`.
- Refactoring debt R-001..R-017 in `docs/REFACTORING-DEBT.md`.
- Metamodel audits: `docs/VCC-Metamodel-Audit-v0.4.0.docx`, `docs/BACM-v1.0-vs-VCC-Metamodel-Comparison.md`, `docs/BIZBOK-v15-Analysis-PlausibleBA-Alignment.md`.
