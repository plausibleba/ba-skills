# Session Log

Chronological record of what was built, decided, and learned.

---

## Session 31 — Hardening: `as any` Cleanup, R-013, Capability Selector UX
**Date:** 2026-04-07
**Status:** Complete

### 1. `as any` Cleanup (166 → 53 instances, 9 → 7 `@ts-nocheck` files)

Removed `@ts-nocheck` pragmas from two of the largest files and fixed all resulting type errors:

**network-derivation.ts** (6 errors):
- Replaced 5 `as any` casts in `resolveActivityIds()` with typed property access
- Replaced `Record<string, unknown>` casts with typed `ScaffoldValueStream` / `ScaffoldData` properties
- Fixed `id` overwrite warning in `activityList` construction

**FrictionView.tsx** (16 errors):
- Removed unused imports (`classifyCategory`, `buildActivityFrictionMap`)
- Fixed `vs.stages?.some()` → `vs.activityIds?.includes()` (field name correction)
- Extended `GatedAction` type in tier-store.ts with `"import_observations"` and `"generate_observations"`
- Fixed category type narrowing with `as typeof ALL_CATEGORIES[number]`
- Changed `bindingConstraint: null as any` → `bindingConstraint: null` (3 locations), then updated `HeatmapData.bindingConstraint` type to `BindingConstraint | null` and added optional chaining in CanvasView.tsx and ThroughputPanel.tsx
- Removed/prefixed unused variables

### 2. R-013 Record-Lifecycle Coupling (Phase 1)

Added `deriveRecordLifecycleCoupling()` to network-derivation.ts (~120 lines). Called during `loadScaffold()` before topology derivation.

**Algorithm:**
- Step 1: Build `recordClasses` from Record-type concepts + key IOs (2+ activity refs or name pattern match)
- Step 2: Name → recordClassId index
- Step 3: Score-based linking of activities to `primaryRecordClassId`: direct IO match = 3, name match = 2, capability businessObject = 2, PPIT IO = 1
- Highest-scoring record class wins; ties broken by first match

### 3. Capability Selector UX

Built `CapabilitySelector` component — a searchable dropdown that shows existing L4 capabilities before offering "create new":
- Filters existing capabilities by fuzzy query match, excludes those already on the activity
- Shows level badges (L1–L4) and parent capability context
- Keyboard navigation (Arrow keys, Enter, Escape)
- "Create new" option appears at bottom when no exact match
- Wired into StageCard.tsx replacing the old `AddItemInput` for capabilities

Added `linkExistingCapabilityToActivity` action to canvas-store.ts for linking without duplication.

### 4. R-001 Journey State Machine (Phase 1 + Phase 2 — Complete)

Replaced scattered UI state flags with a single `AppPhase` discriminated union — the canonical source of truth for where the user is in the VCC journey.

**Phase 1 — Type + Store:**
- Defined `AppPhase` type with 11 phase variants: `projectList`, `creatingProject`, `intake` (with `tab`), `import`, `network`, `stage` (with `vsId`), `capabilityMap`, `conceptGraph`, `friction`, `enrich` (with `section`), `workbench`
- Added `appPhase` to canvas-store; all `goTo*` actions now transition through `setPhase()`
- `viewMode` and `enrichSection` derived from `appPhase` for backward compat
- Migrated `isCreatingProject` (ProjectList) and `intakeTab` (DiscoveryIntake) from project-store to `setPhase()` calls

**Phase 2 — Consumer Migration:**
- **SideNav**: All 14 `viewMode ===` comparisons → `phase ===` from `appPhase`; removed separate `enrichSection` store selector
- **App.tsx**: All 11 boolean view flags → derived from `appPhase.phase`; removed `viewMode`/`enrichSection` from store destructure
- **UserGuidePanel**: `deriveGuideState()` now accepts `AppPhase` directly instead of a `viewMode` string
- **Zero external consumers** of `viewMode` remain; field marked `@deprecated`

### 5. Dark Mode Fix — Friction Observation Section Headers

Replaced hardcoded `text-gray-900`, `text-gray-500`, and `border-gray-200` with theme tokens (`tv.textPrimary`, `tv.textDim`, `tv.borderSubtle`) so "Pain Points", "Friction", "Risks" etc. are visible in dark mode.

### Files Changed
- `store/network-derivation.ts` — Removed `@ts-nocheck`, fixed 6 type errors, added `deriveRecordLifecycleCoupling()`
- `components/FrictionView.tsx` — Removed `@ts-nocheck`, fixed 16 type errors, dark mode theme tokens on section headers
- `types.ts` — `HeatmapData.bindingConstraint` now nullable
- `store/tier-store.ts` — Added `"import_observations"` and `"generate_observations"` to GatedAction
- `hooks/useGateCheck.ts` — Added action labels for new gated actions
- `components/CanvasView.tsx` — Optional chaining on nullable bindingConstraint
- `components/ThroughputPanel.tsx` — Optional chaining on nullable bindingConstraint
- `store/canvas-store.ts` — `AppPhase` type, `appPhase` state, `setPhase()` action, `linkExistingCapabilityToActivity`, `deriveRecordLifecycleCoupling()`
- `store/project-store.ts` — `isCreatingProject`/`intakeTab` marked `@deprecated`
- `components/canvas/CapabilitySelector.tsx` — **NEW** — Searchable capability dropdown with portal
- `components/canvas/StageCard.tsx` — Replaced `AddItemInput` with `CapabilitySelector`
- `components/SideNav.tsx` — All nav items read from `appPhase` instead of `viewMode`
- `App.tsx` — View flags derived from `appPhase.phase`
- `components/UserGuidePanel.tsx` — `deriveGuideState()` accepts `AppPhase`
- `components/DiscoveryIntake.tsx` — Calls `setPhase()` instead of project-store `setIntakeTab()`
- `components/ProjectList.tsx` — Calls `setPhase()` instead of project-store `setCreatingProject()`

---

## Session 30 — D-097 Graph Index + Workbench Catalog Completeness
**Date:** 2026-04-07
**Status:** Complete

### D-097 Step 1: Client-Side Graph Index

Built `graph-index.ts` — an in-memory adjacency map computed on every `loadScaffold()` that materialises ALL cross-references between element types. Pure function, never mutates scaffold.

**Cross-references indexed:**
- Activity → Role (performedBy), Capability (requiresCapability), Outcome (pre/post), InformationObject, Control, Constraint, Metric, TechnologyApp (via PPIT), RecordClass, ApplicationFunction
- ValueStream → Activity (containsActivity), Role (accountableStakeholder)
- Capability → Capability (hierarchy via parentId), Concept (governsConcept via businessObject name match)
- Concept → Concept (explicit relationships + relatedConceptIds), Capability (anchoredToCapability), Activity (anchoredToActivity)
- InformationObject ↔ Concept (name-matched instanceOf)

**API:**
- `edgesFor(elementId)` — all edges involving an element (both directions)
- `relatedIds(elementId, { relation?, targetType? })` — filtered related element IDs
- `referencedBy(elementId, sourceType)` — which elements of a given type reference this element

### Workbench Catalog Completeness

**Root cause:** The "Concepts" catalog had `scaffoldKey: "informationObjects"`, meaning it displayed Information Objects while the Concept Model view read from `scaffold.elements.concepts`. This mismatch caused concepts to appear in one view but not the other.

**Fixes:**
1. Changed Concepts catalog `scaffoldKey` to `"concepts"` — now shows the actual ontological concept model (Party/Record/Resource classification, relationships, capability anchors)
2. Added **Information Objects** catalog (`scaffoldKey: "informationObjects"`) — data artefacts with lifecycle states and activity cross-reference counts
3. Added **Systems** catalog (`scaffoldKey: "technologyApps"`) — technology applications with vendor, category, and description
4. Updated `CatalogType` union, `CATALOG_SCAFFOLD_KEY`, `emptyDirtyCounts`, `emptyCatalogViewMode`, `emptyMessages`, `ALL_CATALOGS`, `CATALOG_DESCRIPTIONS`, and example prompts
5. Added accessor functions: `conceptDefinition`, `conceptRelationCount`, `conceptCapabilityCount`, `infoObjectActivityCount`

### Concept Model Graph-Index Integration

Rewired `ConceptGraphView` to consume the graph index for relationship discovery:
- When a concept has explicit `relationships[]`, those are displayed (as before)
- When the graph index is available, **additional edges are derived** from shared capabilities, activity co-occurrence, and stage co-occurrence
- This means selecting "Product" now shows related concepts like "Product Catalog", "Shopping Cart", and "Customer" through their shared participation in capabilities and value stream stages
- Edge deduplication prevents duplicate relationship lines

### Files Changed
- `store/graph-index.ts` — **NEW** — ScaffoldGraphIndex builder (240 lines)
- `store/canvas-store.ts` — Added `graphIndex` state, computed in `loadScaffold()`
- `store/workbench-store.ts` — Extended `CatalogType` union, `CATALOG_SCAFFOLD_KEY`, dirty counts, view modes, messages, validation
- `lib/catalog-configs.ts` — Fixed Concepts scaffoldKey, added Information Objects and Systems catalogs, new accessor functions
- `components/ConceptGraphView.tsx` — Consumes graphIndex, derives relationships from cross-references
- `components/WorkbenchView.tsx` — Added example prompts for new catalogs
- `domain/pipeline/prompts/refinement-agent.ts` — Added catalog descriptions for new types

---

## Session 29 — Bug Fixes + R-010 Structural Hardening
**Date:** 2026-04-07
**Status:** Complete

### Bug Fixes (from weekend demo)

1. **PPIT role duplication** — enrichers used v4 field name `requiresCapabilityIds` but runtime scaffolds use v5 `enabledByCapabilityIds`. Added fallback handling in `pass-c-ppit-enrichment.ts` and `ppit-enricher.ts`. Improved prompt to differentiate roles per capability.

2. **Activity Flows not showing on Flows tab** — two separate causes:
   - **Token truncation** (primary): 19 activities × 500 tokens + 1000 = 10,500 max_tokens was insufficient. LLM response truncated mid-JSON → parse failure → zero DAGs saved. Fixed by batching (≤10 activities per LLM call), raising per-activity budget to 700 tokens, and adding partial JSON recovery on truncation.
   - **Canvas store fallback** (defensive): `ActivityFlowsView` relied solely on its prop scaffold for `subActivityGraphs`, unlike `StructuredGraphExplorer` which falls back to the canvas store. Added matching fallback with diagnostic logging.

3. **Cross-mapping NBA always suggesting** — `checkOperationOutput` checked `scaffold.elements.crossMaps` (never populated). Cross-maps live in `enrichmentStore.mappingPairs`. Added `mappingPairCount` parameter to NBA computation.

4. **Policy cards invisible on canvas** — `mvcCards` feature flag was `false` for all modules except "mvc". Enabled across all project modules.

### R-010: Strict Scaffold Type Interfaces

Full type system hardening — 22 files changed, 454 insertions, 297 deletions.

**New types:**
- `PPITEntry` — capabilityPPIT decomposition (was completely untyped, accessed via `as any` in 8+ files)
- `ScaffoldElements` — named interface for `scaffold.elements`
- `ScaffoldRole`, `ScaffoldOutcome`, `ScaffoldTechnologyApp`, `ScaffoldConcept` — specific element types
- `getCapabilityIds(act)` — resolves v4/v5 capability field name ambiguity

**Expanded types:**
- `ScaffoldActivity` — `enabledByCapabilityIds`, `capabilityPPIT`, `informationObjectIds`, `valueStreamId`, `stageNumber`, `description`
- `ScaffoldValueStream` — `layoutZone`, `zone`, `accountableStakeholder`, `activityChainHead`
- `ScaffoldData` — `layoutZones` field

**Impact:** `as any` reduced from 166 to 58 instances (65% reduction). Remaining instances are in files with `@ts-nocheck` (FrictionView, CapabilityBlock, network-derivation) — candidates for follow-up.

### Files Changed
- `types.ts` — 134 lines added (new interfaces, expanded fields, helper function)
- Pipeline: `ppit-enricher.ts`, `subactivity-enricher.ts`, `pipeline-orchestrator.ts`, `scaffold-gates.ts`, `pass-c-ppit-enrichment.ts`, `pass-b-scaffold-formalisation.ts`
- Stores: `canvas-store.ts`, `workbench-store.ts`, `project-store.ts`
- Components: `ActivityFlowsView.tsx`, `StructuredGraphExplorer.tsx`, `StageCard.tsx`, `CapabilityMapView.tsx`, `FileLoader.tsx`, `enrichment/shared.tsx`
- Utils: `bundle-import.ts`, `reference-model-import.ts`, `auto-save.ts`

### Decisions
- Canonical capability field name is `requiresCapabilityIds` (Pass B source of truth); `enabledByCapabilityIds` typed as v5 alias
- Sub-activity enrichment batches at ≤10 activities per LLM call
- `getCapabilityIds()` helper replaces all inline `?? ` coalesce patterns

---

## Session 12 — Wiring and Testing
**Date:** 2026-03-06
**Status:** In progress

### Completed
1. `types.ts` refactor — derivation functions removed, redirect comment added. 716 → 473 lines.
2. `network-derivation.ts` — `migrateHeatmap()`, `deriveCapabilityInstances()`, `deriveTopologyView()` moved in from types.ts. Updated imports.
3. `canvas-store.ts` — `capabilityInstanceView` and `topologyView` state fields added. `loadScaffold` wires derivation chain. `reset()` clears both.
4. `NetworkView.tsx` — reads `topologyView` from store, computes `couplingByVs` per node, surfaces coupling counts on node cards and tooltip.
5. `validator-session11.test.ts` → `packages/shared/src/` (co-located with validator.ts, not in __tests__)
6. Stale artefacts identified for deletion: `/schema/` directory + `ScaffoldModel_schema.json.bak`

### Decisions
- D-060: canvas-store derives CapabilityInstances + TopologyView on load
- D-061: NetworkView surfaces topology coupling counts

### In Progress
- Deploy and smoke test

### Commit Message
`Session 12: derivation wiring — canvas-store, NetworkView coupling counts, types.ts refactor D-060–D-061`

---

## Session 11 — Schema Delta Implementation
**Date:** 2026-03-06
**Duration:** ~45 minutes
**Status:** Complete

### Completed
1. `types.ts` — ScaffoldActivity extended with `applicationFunctionIds`, `primaryRecordClassId`, `compositeActivityId`. New `ApplicationFunction` and `RecordClass` interfaces. New `ScaffoldData.elements` registries.
2. `types.ts` — Three-layer heatmap types: `HeatmapVNext`, `DiagnosticLayer`, `InterpretiveLayer`, `InterventionLayer` and all component types. `migrateHeatmap()` migration function.
3. `types.ts` — Derived artefact types: `CapabilityInstance`, `CapabilityInstanceView`, `TopologyView`, `TopologyBasis`, `TopologyNode`, `TopologyEdge`. `deriveCapabilityInstances()` and `deriveTopologyView()` pure functions.
4. `ScaffoldModel.schema.json` — `ApplicationFunction`, `RecordClass`, map defs added. Activity patched with three new properties. Element registries added.
5. `FrictionHeatmap.schema.json` — `HeatmapVNext` three-layer shape and all component defs added. Legacy shape preserved.
6. `validator.ts` — Four new rule function families: `checkExecutionGrammarRefs()`, `checkExecutionGrammarCardinality()`, `checkCompositeActivitySemantics()`, `checkHeatmapLayerIntegrity()`. validateSemantic extended to Phase 6.
7. `schema-validator.ts` — confirmed no changes needed (AJV compiles schemas at load time).
8. Stale artefacts identified: `/schema/ScaffoldModel_schema_v3.json` and `ScaffoldModel_schema.json.bak` — flagged for deletion (D-059).

### Decisions
- D-056: Validator extended with execution grammar rules
- D-057: Schema files updated with new registries and Activity fields
- D-058: types.ts extended with derived artefact types and functions
- D-059: Stale schema artefacts identified for deletion

### Deferred to Next Session
- Move `deriveCapabilityInstances()` and `deriveTopologyView()` from `types.ts` to `network-derivation.ts`
- Unit tests for new validator rules (V-ACTIVITY-04–10, V-COMPOSITE-02–06, V-HEATMAP-02–04)
- `DiscoveryIntake.tsx` fixes: bundleSaved gate removal, temperature: 0, Pass 4 scaffold strip
- Wire `deriveCapabilityInstances()` and `deriveTopologyView()` into canvas-store / NetworkView

### Commit Message
`Session 11: schema delta — Activity execution grammar fields, three-layer heatmap, derived artefact types, validator rules D-056–D-059`

---


## Session 1 — Saturday 22 Feb 2026

### Theme: Foundation
- Built initial VCC frontend: React + Vite + Tailwind + Zustand
- Created canvas store with scaffold loading and validation
- Implemented Stage View with five-layer cognitive hierarchy
- Component extraction: monolith → 12 focused components in `canvas/` subfolder
- Created enterprise banking scaffold (7 VS) for demo
- Created heatmaps for Credit Risk Assessment and Regulatory Reporting
- PPIT layer toggles (Roles, Process, Info, Tech) on toolbar

### Key Decisions
- D-001: Stage card cognitive hierarchy order
- D-002: Component extraction pattern
- v0.1.0 tagged

---

## Session 2 — Sunday 23 Feb 2026

### Theme: Enterprise Level
- Built Network View as default landing for multi-VS scaffolds
- DAG layout with longest-path layer assignment
- Edge derivation from outcome chains
- DFS cycle detection (replaced Kahn's which failed on cyclic graphs)
- Two-layer zone model (Ecosystem / Knowledge)
- Cross-stream outcome contracts with solid/dashed edge encoding
- Drill-through: click VS node → Stage View

### Key Decisions
- D-003 through D-012 (network topology, edge encoding, enterprise structure)
- v0.2.0 tagged

---

## Session 3 — Sunday 23 Feb 2026 (evening) / Monday 24 Feb

### Theme: IIBA Pipeline
- Designed PDS Addendum A (engagement automation architecture)
- Created IR specification (intermediate representation)
- Built XLSX → IR parser and IR → Scaffold generator
- Generated IIBA scaffold from BA model spreadsheet (6 VS, 28 stages)
- Two-layer network topology for IIBA

### Key Decisions
- D-013 through D-016 (IR transience, LLM governance, scoped enterprise enrichment)

---

## Session 4 — Monday 24 Feb 2026

### Theme: Stage View Refinement + PPIT Content
- Stage card layout fixes, metrics into Structure pane
- 233 atomic activities across 70 capabilities (Verb + Object pattern)
- "Process" layer renamed to "Activities" throughout
- Navigation restructure: scaffold selector → Network View, VS selector on Stage View
- Info icon tooltips (direction-aware, card-width)
- Colour alignment across toolbar and badges
- Full docs folder created: ARCHITECTURE, DESIGN-PRINCIPLES, SESSION-LOG, DECISIONS, CURRENT-STATE, INVENTORY, HANDOFF, WORKFLOW

### Key Decisions
- D-017 through D-022

---

## Session 5 — Saturday 28 Feb 2026

### Theme: Presales Discovery — Puretec Proof of Concept
- Puretec Water Filtration scaffold generated from live discovery transcript (4 VS, 13 stages)
- Two heatmaps: Channel Sales Execution + Customer Maintenance
- Schema iterative validation: 179 → 0 blocking errors
- UI fixes: StageColumn height, CSS after folder move
- Design refresh: Deep Obsidian/Slate palette, Cinnabar Oxide binding state
- Demo to Daniel Roach — strong positive reaction
- Three-agent presales pipeline defined (Ingestion → Scaffold → Assessment)
- F-001 Feature Spec: Editable Friction Panel authored

### Key Decisions
- D-023 through D-027

---

## Sessions 6–7 — 1–3 Mar 2026

### Theme: Discovery Intake + In-Browser Pipeline

**Discovery Intake form:**
- Full React form: org name, industry, roles, pain points, tech stack, transcript paste
- Readiness scoring: Commercial, Operational, Technical signals
- Gap recommendations before generation
- Success screen with Save Bundle + Open in Canvas

**Two-pass extraction:**
- Pass 1: Board-level value stream definition (outcome-driven, 2–4 VS max)
- Pass 2: Stage/role/tech/pain point extraction anchored to confirmed VS names
- Fixes VS/stage conflation bug in heatmap anchor IDs

**Pass 3 friction assessment:**
- Runs after scaffold construction in `generateIR()`
- Produces friction observations + binding constraint per VS

**Scaffold builder:**
- Constructs canonical JSON from form data
- "Open in Canvas" wired to load scaffold into Zustand + navigate to Network View

### Key Decisions
- D-028 through D-034

---

## Session 8 — 4 Mar 2026 (morning)

### Theme: New Laptop Baseline + Housekeeping
- New laptop setup confirmed, all dependencies installed
- Sessions 6–7 consolidated into SESSION-LOG
- Decisions D-028–D-034 added to DECISIONS.md
- Two work items queued: two-pass extraction rewrite, Daniel feature (friction → SF features)

---

## Session 9 — 4 Mar 2026

### Theme: Four-Pass Pipeline, Stage Wizard, User Guide Panel

**Pass 3 on demand:**
- Friction assessment no longer auto-runs at Generate time
- Runs from Step 2 of the Stage Wizard when rep clicks "▶ Run new"
- Discovery-generated bundles that include a heatmap show it as pre-loaded in Step 2

**Pass 4 — Vendor solution enrichment:**
- Salesforce Agentforce feature catalogue (47 features, 4 categories)
- Friction category → feature type matching guidance in prompt
- Per-observation `solutions[]` with `VendorFeatureRef`, rationale, customer story IDs
- Customer story cards rendering from fixture catalogue — full pipeline confirmed working

**Stage Wizard (`StageWizard.tsx` — new):**
- Replaces `ContentSelectors` across the top of Stage View
- Three explicit steps: Scaffold → Assess Friction → Enrich Solutions
- Each step: Load previous (file picker) or Run new (AI pass)
- Step badges: numbered → tick when complete
- VS selector in Step 1; vendor picker dropdown in Step 3
- Steps 2 and 3 show re-run / re-load options when already complete

**User Guide Panel (`UserGuidePanel.tsx` — new):**
- Fixed bottom-left, always visible, collapsible
- Six states: empty, network, stage-no-assessment, stage-assessed, stage-enriched
- Each state: Where you are / What you're looking at / Next steps
- Progress dots (Discovery → Network → Friction → Solutions)
- Replaces all scattered coloured hint banners

**Discovery Intake fixes:**
- "Open in Canvas →" no longer gated on saving bundle first
- FileLoader labelled "Load a saved VCC Bundle (.json)" for clarity
- `bundleSaved` state removed

**Null guard fixes (binding constraint on secondary VSs):**
- `FrictionPanel.tsx` — 7 patches
- `CanvasView.tsx` — 4 patches
- `FrictionOverlay.tsx` — 1 patch
- `network-derivation.ts` — 1 patch

**Store fixes:**
- `enrichVersion` counter added to `canvas-store.ts`, increments on every `loadHeatmap`
- `FrictionPanel` keyed on `${selectedActivityId}-${enrichVersion}` — forces remount after enrichment so solutions render
- `selectVs(currentVsId)` called after enrichment to re-derive `heatmapData` from updated store

**scaffold-resolver fix:**
- `resolveScaffoldMeasures` crashed when scaffold had no `elements.metrics` collection
- Guard added: early return if metrics missing or empty
- Leftover `console.log` debug statement removed

**Temperature stabilisation:**
- `temperature: 0` added to all four API calls for deterministic output

**Daniel QuickStart guide:**
- `VCC_QuickStart_Daniel.docx` produced — four-step rep workflow, what to see at each step, tips

**Files created/modified this session:**
- `src/components/StageWizard.tsx` *(new)*
- `src/components/UserGuidePanel.tsx` *(new)*
- `src/components/ContentSelectors.tsx` *(superseded by StageWizard)*
- `src/components/DiscoveryIntake.tsx`
- `src/components/FrictionPanel.tsx`
- `src/components/CanvasView.tsx`
- `src/components/FrictionOverlay.tsx`
- `src/store/canvas-store.ts`
- `src/store/scaffold-resolver.ts`
- `src/store/network-derivation.ts`
- `src/App.tsx`

### Key Decisions
- D-035: Pass 3 runs on demand from Stage Wizard, not automatically at Generate time
- D-036: Stage Wizard replaces ContentSelectors as the primary Stage View toolbar
- D-037: User Guide Panel (fixed bottom-left) replaces contextual hint banners
- D-038: Load previous / Run new pattern for Steps 2 and 3 (supports Q1/Q2/Q3 re-use)
- D-039: enrichVersion counter forces FrictionPanel remount after enrichment
- D-040: temperature: 0 across all passes for stable, repeatable output

---

## Pending Work

### Immediate
1. Customer story filtering by industry/size — match stories to client profile
2. Dummy discovery datasets — 2–3 fictitious non-Salesforce demos for Daniel
3. PDS update — document what's been built since original scope

### Pipeline
4. Formalise four-agent presales pipeline in WORKFLOW.md
5. Export enriched bundle (scaffold + heatmap with solutions) as download
6. Populate TransformationPane with painpoints/ideas/requirements schema

### Future
7. F-001 phase 2: delete observations, reassign binding constraint, persist edits
8. Multi-vendor support (vendor library beyond Salesforce)
9. Anchor roles/info/tech to specific activities (currently capability-level)
10. Enterprise banking scaffold with full enrichment on 1–2 exemplar streams

---

## Session 8 — Thursday 5 Mar 2026

### Theme: Transformation Layer — User Story Generation

**Context:**
- Transformation use case is distinct from presales (Daniel/Salesforce). No vendor mapping needed.
- Goal: SBRs (friction observations) → Transformation User Stories → delivery sprints (Jira).
- Network outage had erased previous context on this work. Session reconstructed from uploaded `TransformationPane.tsx` and project docs.

**Type system additions (`types.ts`):**
- Added `TransformationUserStory` interface after `HeatmapData`
- Fields: `storyId`, `observationId`, `activityId`, `asA`, `iWant`, `soThat`, `acceptanceCriteria[]`, `storyPoints`, `priority`, `epicId`, `status`, `createdAt`, `updatedAt`
- Status lifecycle: `draft → ready → sprint → done`
- Priority derived from friction score: ≥8.5=critical, ≥7=high, ≥5=medium, <5=low
- Added `toJiraExport()` utility function — converts story to Jira CSV import row

**Store additions (`canvas-store.ts`):**
- Added `userStoriesByActivity: Record<string, TransformationUserStory[]>` to state
- Added `saveUserStory(activityId, story)` — upsert by storyId
- Added `setActivityStories(activityId, stories)` — full replace for bulk updates
- Added `getAllUserStories()` — flattens all stories across activities for export
- `reset()` clears `userStoriesByActivity`

**`TransformationPane.tsx` — full rewrite:**
- `SBRCard`: renders friction observation + nested user stories + "Generate User Story" button
- `UserStoryCard`: As a / I want / So that in line-broken format, Acceptance Criteria bulleted list, status pill (click to cycle), story points, priority, epic ID, edit pencil
- `StoryEditor`: inline edit form for all story fields including Epic ID for Jira grouping
- `callGenerateUserStory()`: calls `/api/claude` proxy with system prompt encoding story generation rules — role specificity, verb-first iWant, quantified soThat, 3-5 binary ACs, Fibonacci points, priority from score
- Summary mode shows `N SBRs · N Stories · N Controls` compact line when card not expanded
- `summaryOnly` set to `false` globally (was gating full render behind card selection)

**`StageCard.tsx` — 3-line change:**
- Added `useCanvasStore` import
- Pulled `userStoriesByActivity` and `setActivityStories` from store
- Added `userStories` and `onStoriesChange` props to `<TransformationPane>` call

**Debugging resolved:**
- Initial deployment showed no change — root cause: old `TransformationPane.tsx` still in repo (outputs not copied in)
- Generate button silently failing — root cause: direct `api.anthropic.com` call blocked by CORS; fixed by routing through `/api/claude` Vercel proxy
- Correct file path confirmed: `packages/frontend/src/components/canvas/` (not `src/canvas/`)

**Output quality observed:**
- Generated story for Credit Risk Control SBR: "As a Credit Controller, I want to access real-time credit exposure calculations... So that I can prevent credit losses..." — 6 ACs, 8 pts, Critical
- Generated story for Order Management SBR (binding): 5 ACs, 13 pts, Critical — correctly weighted

**Ofluv scaffold and heatmap uploaded:**
- `ofluv-scaffold.json`: 12 VS, only OTC fully populated (8 activities, 6 capabilities, 4 metrics), 11 VS stubs
- `ofluv-heatmap-otc.json`: 6 SBRs anchored to OTC activities, binding constraint on `act_otc_receive_validate_order`
- Enhancement in progress: adding capabilities and metrics to stub VS

### Key Decisions
- D-041: TransformationPane serves transformation use case only — no vendor/solution mapping
- D-042: SBRs anchor to Activity in schema; Capability context shown in UI as label (no schema change)
- D-043: User stories stored in Zustand keyed by activityId — no backend, in-memory only
- D-044: Story generation routes through `/api/claude` proxy — never direct to `api.anthropic.com` from browser
- D-045: `summaryOnly=false` globally for now — revisit when expansion UX is designed properly

---

## Session 10 — 6 Mar 2026

### Theme: Design Spar — Use Case Separation + PDS Review

**Context recovery:**
- Session 9 ended mid-delivery due to connection drop; DiscoveryIntake.tsx was being rewritten
- Uploaded files confirmed Sessions 6–9 code state intact across all files except DiscoveryIntake.tsx
- DiscoveryIntake.tsx in repo is pre-Session-9 version (bundleSaved gate still present, temperature: 0 missing)
- Decision number collision identified and resolved: Session 8 (5 Mar) decisions renumbered D-041–D-045

**Decision to pause implementation:**
- Recognised that VCC has grown to serve three distinct use cases without a formal design review:
  1. **Board Friction Canvas** — structural operating model diagnosis for boards and architects
  2. **Presales Discovery Canvas** — rapid discovery-to-diagnostic workflow for pre-sales reps (Daniel/Salesforce)
  3. **Transformation Planning Canvas** — SBR-to-user-story pipeline for delivery teams (Henrik/Cordial/Volvo)
- These use cases share a data model but have different workflows, UX requirements, and buyer contexts
- Continuing to build without resolving this creates compounding UX and architectural confusion

**Design spar initiated:**
- Approach C selected: brief external reviewer (GPT/Reviewer) cold, bring response back, spar on delta
- Briefing document produced: `VCC_DesignSpar_Briefing_GPT.md`
- Briefing covers: data model, three use cases, four-pass pipeline, UX architecture, six named tensions
- Six tensions submitted for challenge:
  1. One product or three modes?
  2. Pipeline as universal entry point
  3. Scaffold ownership (architect vs LLM vs pre-built)
  4. StageWizard linear steps vs branching use case workflows
  5. Vendor enrichment vs transformation planning (two answers to same question?)
  6. Heatmap accumulation — is the data model doing too much?

**Planned outputs from this session:**
- Reviewer response → design spar → settled positions on the six tensions
- Updated PDS reflecting three use cases, pipeline architecture, UX model
- Code review of current codebase against agreed design
- Refactor plan (may span multiple sessions)

### Key Decisions
- D-046: Pause implementation; complete design spar + PDS update before further feature work
- D-047: Session 10 is a design day — spar → PDS → code review → refactor plan

---

## Pending Work (updated 6 Mar 2026)

### This Session
1. Design spar with external Reviewer — six tensions, briefing sent
2. PDS update — reflect three use cases, pipeline architecture, UX model
3. Code review — audit codebase against agreed design
4. Refactor plan

### Immediate (design spar complete — unblocked)
5. Schema delta — Activity gains primaryRecordClassId, applicationFunctionIds, compositeActivityId (D-053/054/055)
6. FrictionHeatmap three-layer restructure — Diagnostic / Interpretation / Intervention (D-050)
7. DiscoveryIntake.tsx fix — remove bundleSaved gate, add temperature: 0, strip scaffold for Pass 4
8. PDS update — reflect three phases, pipeline architecture, ontological foundations (D-048–D-055)

### Near Term
9. CapabilityInstance derivation in network-derivation.ts (D-051)
10. TopologyView derivation — extends Network View (D-052)
11. Enhance Ofluv scaffold — add applicationFunctionIds, recordClassIds to key activities
12. Jira export button — getAllUserStories() store action ready, needs CSV download trigger
13. Customer story filtering by industry/size
14. Dummy discovery datasets — 2-3 fictitious non-Salesforce demos for Daniel

### Pipeline (Post-PDS)
15. Formalise use-case-aware pipeline architecture in WORKFLOW.md
16. Build Friction Signal Agent (Track B)
17. Markdown export of scaffold + heatmap for human review

### Future
18. F-001 phase 2: delete observations, reassign binding constraint, persist edits
19. Anchor roles/info/tech to specific activities (not whole capability)
20. Story expansion UX: replace summaryOnly=false global with proper expand/collapse trigger
21. Multi-vendor support beyond Salesforce
22. RecordClass and ApplicationFunction fixture population across all demo scaffolds

---

## Session 13 — Buildcraft Fixture Validation and Bug Fix
**Date:** 2026-03-07
**Status:** Complete

### Completed
1. **Buildcraft bundle field name correction** — translated all non-canonical fields to schema-compliant names: `label→name`, `capabilityIds→requiresCapabilityIds`, `capabilityPPIT` structure added, heatmap observation format corrected (`observationId`, camelCase category enum, `primaryAnchor`+`contributingAnchors`, `intensity: {scale,score}`). D-062.
2. **Heatmap split per VS** — single multi-VS heatmap with `valueStreamId: null` replaced with three per-VS standalone heatmap files. `valueStreamId` is required by schema — FileLoader was correctly rejecting the null value. D-063. Files: `buildcraft-heatmap-vs_multi_channel.json` (5 obs), `buildcraft-heatmap-vs_in_store_sales.json` (2 obs), `buildcraft-heatmap-vs_frame_agreements.json` (2 obs).
3. **FrictionPanel stale state bug fixed** — panel not refreshing when navigating between friction points with panel open. Fix: `key={selectedActivityId}` on `<FrictionPanel>` in `CanvasView.tsx`. D-064.
4. **Buildcraft canvas smoke test** — Multi-Channel Journeys rendering correctly: entry/exit states, capability blocks with roles (R/A badges), metrics, controls, PPIT. Binding constraint (pricing authority fragmentation) highlighted on "Process Payment and Confirm Order". Friction overlay: 5 observations, Decision Authority / Governing friction visible. Network View: 3 VS with coupling counts.

### Decisions
- D-062: Bundle field names must match canonical schema — no aliases
- D-063: Heatmaps are per-VS — `valueStreamId` required
- D-064: FrictionPanel stale state — fix via `key={selectedActivityId}`

### Fixtures Produced
- `buildcraft-cef-bundle.json` — 3 VS, 15 activities, 9 friction observations (split across 3 per-VS heatmaps)
- `buildcraft-heatmap-vs_multi_channel.json`
- `buildcraft-heatmap-vs_in_store_sales.json`
- `buildcraft-heatmap-vs_frame_agreements.json`

### Commit Message
`Session 13: Buildcraft fixture — field name corrections, per-VS heatmaps, FrictionPanel key fix D-062–D-064`

---

## Session 13 — GPT Design Spar (addendum)
**Date:** 2026-03-07

### Spar Outcome
GPT design spar completed on pipeline architecture. Full response received and recorded.

**Architecture locked (D-065):** Three-pass runtime — Pass A (DiscoveryIR) → Pass B (ValidatedScaffold, with internal B1/B2 gate) → Pass C (HeatmapVNext).

**Additional decisions locked:**
- D-066: Gate 1 failure → one bounded auto-repair retry, then surface errors
- D-067: Null binding constraint is valid distinct output state (three states: not assessed / no constraint / constraint identified)
- D-068: DiscoveryIR surfaced as light review panel before formalisation
- D-069: temperature: 0 enforced at proxy level, not prompt-only
- D-070: Five named tensions recorded
- D-071: Scope exclusions locked — no backend orchestrator, no scaffold editor, no scenario modelling, no friction-scaffold merge

### Next Session
Pipeline rewrite implementation. Start with domain/pipeline/ module structure as specified by GPT:
- discovery-ir.ts
- scaffold-formaliser.ts
- scaffold-gates.ts
- heatmap-analyser.ts
- pipeline-orchestrator.ts
- discovery-session-store.ts (in store/)
- DiscoveryIntake.tsx refactored to thin interaction shell

## Session 14 — 8 Mar 2026

### Theme: v5 Bundle Loading + Compatibility Fixes

**v5 bundle loading (Network View):**
- D-072: FileLoader error surfacing — real error messages instead of generic "Failed to parse JSON"
- D-073: `resolveActivityIds()` helper for v4 `activityIds[]` / v5 chain walk dual support
- D-074: `layoutZone` vs `zone` field fallback in network-derivation.ts
- Result: v5 Water Filtration bundle loads cleanly — 5 VS, two-row layout, friction badges, constrained indicator

**v5 bundle loading (Stage View):**
- D-075: Chain walk in `generateCanvasForVs` — `resolveOrderedActivityIds()` detects v4/v5 format
- D-076: Dual capability field read (`enabledByCapabilityIds ?? requiresCapabilityIds`)
- D-077: CapabilityBlock v5 PPIT fallback to activity-level arrays
- D-078: CanvasView `bindingAnchor` optional chaining guard
- D-079: StageCard ↔ Concept Card alignment noted, deferred

**Prompt updates:**
- Multiple prompt refinement commits for Pass 3 formalisation quality

### Decisions
D-072 through D-079

---

## Session 15 — 8 Mar 2026

### Theme: Scaffold Generation Quality + Build Fix

**Context:** PureTec presales scenario. PPIT rendering confirmed working, but generation quality issues remained.

**Build fix:**
- D-083: Template literal closing backtick was escaped by Python script, breaking Vite build. Fixed backtick + regex patterns.

**Generation quality fixes:**
- D-081: Pass 1 now excludes time-bounded initiatives/projects; stage names constrained to 2–4 words title case
- D-082: Pass 3 RULE 1 — preserve all VS from confirmed inputs, no silent drops
- D-080: Pass 3 generates v4 format exclusively (`activityIds[]`, `requiresCapabilityIds`, `capabilityPPIT`)
- Pass 4 (friction) removed from auto-run — pain points stashed on `scaffold._discoveryPainPoints`

**What's working after this session:**
- PPIT rendering (Activities, Roles, Info) confirmed
- Capability names: operational, specific
- Activity names: 5-10 word verb+object
- Metrics & Roles painting on canvas
- `capabilityPPIT` populated with micro-level work statements

### Decisions
D-080 through D-083

### Deployment
- Last good: `frontend-9vh29gem2` (PPIT working, v9 bundle generated)
- Production alias: `frontend-five-eta-l0j2mk66gi.vercel.app`

---

## Session 16 — 9 Mar 2026

### Theme: ID-vs-Label Bug Fix + Docs Cleanup

**humanizeId utility (D-084):**
- Created `src/lib/humanize-id.ts` — strips type prefix, converts snake_case/kebab-case to Title Case
- Applied as display fallback in 9 components: CapabilityBlock, TransformationPane, AnalyticsPane, StructurePane, FrictionPanel, ThroughputPanel, CanvasView, StageWizard, ContentSelectors
- e.g. `cap_lead_qualification` → "Lead Qualification"

**Docs cleanup:**
- Deleted duplicate `Session 11 Implementation Brief.md` (kept `SESSION11_BRIEF.md`)
- Archived `SCHEMA_DELTA_Session10.md` → `docs/archive/`
- Merged `DECISIONS_session14.md` into `DECISIONS.md` with correct numbering (D-075–D-079)
- Fixed Session 14 decision number collision in SESSION-LOG.md (was using D-066–D-068, now D-072–D-074)
- Renumbered Session 15 decisions (D-044–D-047 → D-080–D-083) for global uniqueness
- Updated CURRENT-STATE.md, SESSION-LOG.md, ARCHITECTURE.md

### Decisions
D-084

---

## Session 17 — Prompt Extraction & Single Source of Truth
**Date:** 2026-03-09
**Status:** Complete

### Theme: Eliminate Dual Code Path + Restore capabilityPPIT Quality

**Problem:** Two parallel implementations of the pipeline existed — inline prompts in DiscoveryIntake.tsx (1,156 lines, active) vs modular pipeline in domain/pipeline/ (orphaned). Fixes to one weren't reflected in the other, causing regressions across sessions 15-17. Additionally, bundle v9 had zero capabilityPPIT entries compared to bundle v2 (the gold standard).

**Refactoring (commit 0f8d609):**
- Stripped inline prompts from DiscoveryIntake.tsx (1,156 → 925 lines)
- Wired DiscoveryIntake to call `runPipeline()` and `continuePipeline()` from pipeline-orchestrator
- Fixed heatmap-analyser backtick regex, discovery-session-store heatmaps reference

**Prompt extraction (commit dce2fbc):**
- Created `domain/pipeline/prompts/` — one file per pipeline pass:
  - `pass-a1-value-streams.ts` — VS extraction with initiative exclusion, Trigger→Outcome naming
  - `pass-a2-capability-mapping.ts` — role/capability extraction with shared capability rules
  - `pass-b-scaffold-formalisation.ts` — scaffold with capabilityPPIT (CRITICAL), Gate 1/2, context builders
  - `pass-c-friction-analysis.ts` — friction taxonomy, binding constraint scoring, scaffold skeleton
- Pipeline files (pipeline-orchestrator, scaffold-formaliser, heatmap-analyser) now pure plumbing — import prompts
- capabilityPPIT added to Pass B: roleIds, 3 sub-activities, informationObjectIds, technologyAppIds per capability per activity
- Net: 383 insertions, 753 deletions — eliminated 370 lines of duplicated prompt logic

### Decisions
D-085, D-086, D-087

### Commits
- `0f8d609` — Session 17: refactor — single source of truth for pipeline prompts
- `dce2fbc` — Session 17: extract prompts to dedicated files + add capabilityPPIT

---

## Session 18 — Streaming Infrastructure & Vercel Timeout Resolution
**Date:** 2026-03-09
**Status:** Complete

### Theme: Fix Vercel Hobby 10s Timeout + Wire All LLM Calls Through Streaming

**Problem chain (progressive debugging):**
1. Pass B failed with `FUNCTION_INVOCATION_TIMEOUT` — Vercel Hobby caps serverless functions at 10s, `maxDuration: 60` ignored
2. Edge Runtime alone (non-streaming) failed — 504 still, Edge config not supported for Vite projects as serverless
3. Streaming serverless function worked initially but died mid-stream (`ERR_NETWORK_CHANGED`) — function killed at 10s
4. Pass B response truncated at `max_tokens: 16000` — capabilityPPIT scaffold generates 61K+ characters

**Solution — Edge Runtime + Streaming + Extended Output (commits 314d54b → 3efa0d7):**
- `/api/claude.ts` rewritten as Edge Runtime function (`export const config = { runtime: "edge" }`)
- Forces `stream: true` on all Anthropic requests — SSE chunks flow through as `ReadableStream`
- Added `anthropic-beta: output-128k-2025-02-19` header for extended output
- Pass B `max_tokens` bumped from 16,000 to 32,000

**Shared LLM client (commit 314d54b):**
- Created `domain/pipeline/llm-client.ts` — `callLLM()` function used by all pipeline passes
- Auto-detects SSE stream vs plain JSON response (dev mode compatibility)
- Collects `content_block_delta` events, extracts `stop_reason` from `message_delta`
- Replaced raw `fetch` in ALL 7 callers: pipeline-orchestrator, scaffold-formaliser, heatmap-analyser, StageWizard (runPass3, runPass4), ContentSelectors, TransformationPane

**Assess Friction — wired to proper Pass C pipeline (commit 6d6ffcf):**
- Replaced 65-line inline `runPass3` in StageWizard with call to `runPassC` from heatmap-analyser
- Now generates friction observations for ALL value streams (not just first)
- Uses full Pass C prompt with scaffold skeleton, exact activity IDs, binding constraint scoring
- Pulls pain points from discoveryIR session store when available

### Decisions
D-088, D-089, D-090, D-091

### Commits
- `c86275e` — fix: improve Pass B error reporting + set Vercel maxDuration
- `34c11e4` — fix: convert /api/claude to Edge Runtime (30s timeout)
- `314d54b` — fix: streaming API proxy to eliminate Vercel 10s timeout
- `e229fa8` — fix: enable extended output (128K) + bump Pass B to 32K tokens
- `a50ffab` — fix: convert all remaining LLM calls to streaming callLLM
- `6d6ffcf` — fix: wire Assess Friction to proper Pass C pipeline for all VS
- `3efa0d7` — fix: Edge Runtime + streaming to survive Vercel Hobby limits

---

## Session 19 — Editable Canvas
**Date:** 2026-03-10
**Status:** Complete

### Completed

**Phase 1: Inline Editing + Bundle Save/Load (D-092)**
1. `InlineEdit` component — double-click-to-edit with Enter/Escape, pencil icon affordance on hover
2. Scaffold mutation actions in `canvas-store.ts` — immutable spread pattern for `updateActivityName`, `updateCapabilityName`, `updateRoleName`, `updateVsName`, `updateVsDescription`, `updateOutcomeName`
3. Editable stage names in `StageColumn` dark header (double-click to rename)
4. Editable entry/exit state names in `StructurePane` (double-click outcome labels)
5. Editable capability names in `CapabilityBlock` (double-click to rename)
6. Editable VS name + description in `CanvasView` header
7. `scaffoldDirty` flag tracks unsaved local mutations — Save Bundle button shows asterisk when dirty
8. Save Bundle button in `StageWizard` toolbar — serialises scaffold + heatmaps + user stories as bundle v2.0 JSON
9. `FileLoader` updated to detect and restore bundle v2.0 including `userStoriesByActivity`

**Phase 2: Add/Remove Elements (D-093)**
10. `AddItemInput` component — compact "+ Add" button that expands to inline text input
11. Add/remove capabilities per activity — "+ Add Capability" button on each `StageCard`, hover × to remove
12. Add/remove stages (activities) — "+ Add Stage" button at end of canvas, × on column headers (disabled on last stage)
13. Add/remove roles in `StructurePane` — blue chips with inline edit + ×, "+ Role" with smart name matching to reuse existing roles
14. Add/remove Information Objects per capability — amber chips with × and + button (visible when I toggle active)
15. Add/remove Technology Apps per capability — emerald chips with × and + button (visible when T toggle active)
16. `MiniAddButton` component — compact + chip that expands to inline input for PPIT elements
17. All mutations auto-regenerate canvas view and refresh network nodes

### Key Outcome
The canvas is now a **living document** — Discovery Intake generates the initial scaffold, then all refinement happens directly on the canvas. The intake+scaffold build is effectively a one-off. Users can rename, add, and remove any structural element, run assessments, generate user stories, and save the complete bundle to reload later.

### Decisions
- D-092: Editable Canvas Phase 1 — inline editing + bundle save/load
- D-093: Editable Canvas Phase 2 — add/remove capabilities, activities, roles, info objects, tech apps

### Commits
- `43f4679` — feat: editable canvas Phase 1 — inline editing + bundle save/load (D-092)
- `7034110` — feat: editable canvas Phase 2 — add/remove capabilities, stages, roles (D-093)
- `ddfe3ec` — feat: add/remove Information Objects and Technology Apps (D-093)

---

## Session 20 — PPIT Editing Completion, Bug Fixes, Data Architecture
**Date:** 2026-03-10
**Status:** Complete

### Completed
1. **PPIT sub-activities editable** — Purple activity items in CapabilityBlock now support inline edit, × remove, and + add. Five new store actions in canvas-store.ts.
2. **Per-capability role editing** — Roles moved from stage-level to capability-level PPIT. Stage header renamed to "Participating Stakeholders" (read-only aggregation from all capabilities). Smart role reuse via case-insensitive name matching.
3. **Critical bug fix: activityId undefined** — Many scaffold bundles don't include `id` field on activity objects (the record key IS the ID). All PPIT store actions silently failed. Fixed by passing `activityId` as explicit prop from StageCard → CapabilityBlock and StageColumn → StructurePane.
4. **Store reactivity fix** — CapabilityBlock and StructurePane now read PPIT data from Zustand store's `scaffoldData` directly instead of prop chain, preventing stale renders.
5. **Debug cleanup** — Diagnostic console.log statements added then removed in separate commits.
6. **Data Architecture Trajectory documented** — New ARCHITECTURE.md section: Ontology Without Repository principle, three-step evolution (graph index → schema validation → graph visualisation), multi-user upgrade trigger. Flagged as candidate for GPT design spar.

### Decisions
- D-094: PPIT sub-activities editable + per-capability roles
- D-095: Ontology Without Repository — architectural principle
- D-096: TypeScript type drift — identified technical debt
- D-097: Data Architecture Trajectory — three-step evolution

### Key Learning
The `activity.id` bug was a textbook example of TypeScript types diverging from runtime data. The type declares `id: string` but the runtime object doesn't have it — the key in the parent record serves as the ID. Console.log diagnostics pinpointed the issue in one round-trip with the user. This class of bug is exactly what D-096 (type drift cleanup) and D-097 Step 2 (ontology-as-schema validation) would prevent.

### Commits
- `5f615e0` — feat: PPIT sub-activities & per-capability roles editable, fix store reactivity (D-094)
- `5895143` — debug: add console.log to PPIT store actions
- `f7a4f44` — fix: pass activityId as prop to CapabilityBlock — fixes PPIT actions
- `cefd28d` — chore: remove PPIT diagnostic console.log statements
- `835360e` — fix: pass activityId prop to StructurePane

---

## Session 20b — MVC Demo, Customer Story Filtering
**Date:** 2026-03-10
**Status:** Complete

### Completed
1. **Customer Story filtering** — FrictionPanel sidebar filtering by industry, company size, and status with filter chips and counts. Committed as `a892798` (D-098).
2. **MVC Integration — Concept Cards & Policy Cards** — Full card system: `types/cards.ts`, `fixtures/cards/puretec-cards.json` (6 concept + 4 policy cards), `CardPanel.tsx` (480px sidebar), C/P toolbar toggles, card count badges on StageCard, `cardRegistry` in Zustand store. Committed as `07e0a41` (D-099).
3. **Architecture diagram** — `ArchitectureDiagram.html`: three-column Trust Framework × VCC × MVC mapping with value proposition cards.
4. **Slide deck** — `VCC-MVC-Three-Layers-of-Value.pptx`: 6-slide deck for Eric Broda conversation (built with python-pptx after npm registry blocked pptxgenjs).

### Decisions
- D-098: Customer Story Filtering
- D-099: MVC Integration — Concept Cards & Policy Cards

### Commits
- `a892798` — feat: customer story filtering (D-098)
- `07e0a41` — feat: MVC integration — Concept Cards & Policy Cards in VCC canvas (D-099)
- `396cb04` — docs: update architecture, decisions, session log for Session 20

---

## Session 21 — Kernel PoC Analysis, Multi-Lens Architecture
**Date:** 2026-03-10
**Status:** Complete

### Completed
1. **Kernel PoC exploration** — Read and analysed kernel-poc.zip (Governance Evaluation Kernel built with Sonnet, deployed at tinyurl.com/capsicum-kernel). 535-line React app with 5 scenarios, 3×3 grid, 15-row decision table, step-by-step narrative with animated arrows. Mapped PoC architecture to VCC data model.
2. **Logical Model of Endeavour paper review** — Read full 27-page paper. Grounded VCC adaptation in the formal GSM specification: nine-tuple (S, Σ, map, δ, u, s₀, F, E, T, ε), tri-valued validity function V → {Fire, Reject, Escalate(εᵢ)}, four escalation triggers, State Transition Quartet, Governance as constitutive not overlay.
3. **Multi-Lens Canvas Architecture** — Defined foundational scaffold layer (Network View + Stage View) with use-case lenses: Operational Productivity, Sales Discovery, Transformation, Authority Governance, Agentic Mesh MVC. Each lens projects different rows/columns of the CAPSICUM 3×3 matrix.
4. **Class Inspector Pattern** — Generalised FrictionPanel/CardPanel into a formal UX pattern: every scaffold element Class has a typed metamodel determining its inspection surface. Progressively enriched as data sources mature.
5. **GSM on current architecture decision** — Build evaluation engine in TypeScript with types isomorphic to formal tuple. Policy Cards → E (entitlement function), Concept Card senses → T (terms). Defer SHACL to D-097 graph evolution. Clean seam for future swap.

### Decisions
- D-100: Multi-Lens Canvas Architecture
- D-101: Class Inspector Pattern
- D-102: GSM Simulation on Current Architecture

### Key Learning
Reading the paper changed the adaptation analysis materially. The kernel PoC implements the State Transition Quartet, not just a UI grid. Governance is constitutive (Section 5.3) — it's not an optional panel but a condition of execution. The Entitlement function E returns a norm *set* (4-tuples with provenance), not a single value. Terms T provide the typing and constraint system that makes pre/postcondition evaluation precise. Building without this understanding would have produced a simulation that looked right but missed the formal semantics.

The multi-lens decision resolves a growing tension: the canvas was accumulating overlapping concerns with no principle for what to show when. The CAPSICUM orthogonality principle provides that principle — each lens is a projection of the same matrix, emphasising different dimensions.

---

## Pending Work (updated 10 Mar 2026 — Session 21)

### Immediate
1. **UX session: lens selector prototype** — design the lens selection UI for Stage View (D-100)
2. **GSM type definitions** — `gsm.ts` with types isomorphic to the formal nine-tuple (D-102)
3. Test Enrich Solutions after streaming wiring — confirm vendor feature suggestions
4. PDS update — reflect Sessions 12–21 progress

### Near Term
5. **Class Inspector framework** — generalise FrictionPanel/CardPanel into typed inspector pattern (D-101)
6. **GSM evaluation engine** — decision table evaluator, Eff(), Conflicts(), V() as pure functions (D-102)
7. **Kernel simulation panel** — Authority Governance lens with 3×3 grid and step-by-step narrative (D-100, D-102)
8. **Capability selector** — dropdown showing existing capabilities before "create new" (D-097 Step 1 lite)
9. **Client-side graph index** — in-memory adjacency map on bundle load (D-097 Step 1)
10. **TypeScript type drift cleanup** — align types with runtime data shapes (D-096)
11. DiscoveryIR review panel before formalisation (D-068)
12. Proxy-level temperature enforcement (D-069)
13. Jira export button for user stories
14. Prompt logic review session (user requested)

### Future
15. **Graph visualisation** — D3-force/vis.js scaffold network view (D-097 Step 3)
16. **Ontology-as-schema validation + SHACL Terms** — formal metamodel definitions, replaces TypeScript conditionals in GSM (D-097 Step 2, D-102 seam)
17. **GPT design spar: Data Architecture Trajectory** — review D-095/D-097 decisions
18. F-001 phase 2: delete observations, reassign binding constraint
19. Multi-vendor support beyond Salesforce
20. Slack MCP integration
21. Multi-user modelling backend (D-097 upgrade trigger)
22. **Translation Integrity pipeline** — natural language policy → signed entitlement tables (paper §7.3)