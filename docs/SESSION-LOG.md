# Session Log

Chronological record of what was built, decided, and learned.

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

## Pending Work (updated 9 Mar 2026)

### Immediate
1. Verify Vercel deployment with humanizeId fix — re-run PureTec to confirm clean labels
2. Pipeline rewrite implementation (D-065 architecture: Pass A/B/C with Gate 1)
3. PDS update — reflect Sessions 12–16 progress

### Near Term
4. DiscoveryIR review panel before formalisation (D-068)
5. Proxy-level temperature enforcement (D-069)
6. Jira export button for user stories
7. Dummy discovery datasets for Daniel demos

### Future
8. F-001 phase 2: delete observations, reassign binding constraint
9. Multi-vendor support beyond Salesforce
10. Eric Broda MVC demo — Governance Kernel overlay on StageCard