# Decision Log

Numbered architectural and design decisions. One entry per meaningful choice.

---

## D-001 through D-022
*(Sessions 1–4 — see SESSION-LOG.md for detail)*

Stage card hierarchy, component extraction, network view topology, edge encoding, enterprise scaffold structure, metrics in Structure pane, atomic Verb-Object activities, capability-level PPIT, scaffold selector on Network View, info icon tooltips.

---

## D-023: Presales Scaffold Generation via LLM Inference
**Date:** 2026-02-28
**Decision:** A full VCC scaffold (4 VS, 13 stages, 70+ activities) is viable from a single discovery transcript with no pipeline infrastructure — LLM reasoning alone.
**Rationale:** Puretec demo validated this. Speed of generation is the value proposition for presales.

## D-024: Three-Agent Presales Pipeline
**Date:** 2026-02-28
**Decision:** Define presales workflow as three sequential agents: Discovery Ingestion → Scaffold Generation → Friction Assessment.
**Rationale:** Separates extraction (what exists) from assessment (what's wrong) from recommendation (what to do).

## D-025: Heatmap Category Enum Mapping
**Date:** 2026-02-28
**Decision:** Friction categories are: DataSignalFriction, ProcessHandoffFriction, GovernanceRiskFriction, IncentiveCapacityFriction, TechnologyIntegrationFriction, DecisionAuthorityFriction.
**Rationale:** Canonical enum — must match schema validation.

## D-026: scaffoldIntegrityHash Not in Heatmap Root
**Date:** 2026-02-28
**Decision:** Remove `scaffoldIntegrityHash` from heatmap root. It belongs on the observation level, not the document root.
**Rationale:** Schema validation failure. Root-level hash was incorrect placement.

## D-027: capabilityPPIT Must Be Preserved on Activity Objects
**Date:** 2026-02-28
**Decision:** `capabilityPPIT` is a required field on activity objects. Never strip it during schema processing.
**Rationale:** PPIT layer toggling depends on it. Missing field causes silent rendering failure.

## D-028: Discovery Intake as Primary Onboarding Path
**Date:** 2026-03-01
**Decision:** The primary way to create a VCC scaffold is via the in-browser Discovery Intake form (paste transcript → generate). File loader remains as secondary path for loading existing bundles.
**Rationale:** Removes dependency on Python pipeline for presales use. Rep can generate on a laptop during or after a discovery call.

## D-029: Two-Pass Extraction Architecture
**Date:** 2026-03-01
**Decision:** Pass 1 defines value streams at board level (outcome-driven, 2–4 max). Pass 2 extracts stages, roles, tech, pain points — all anchored to confirmed VS names from Pass 1.
**Rationale:** Prevents VS/stage conflation where a single-pass model mistakes stages for value streams.

## D-030: Scaffold Builder in Browser
**Date:** 2026-03-01
**Decision:** Canonical JSON is constructed client-side from structured form + LLM extraction. No backend scaffold generator.
**Rationale:** Keeps deployment simple (Vercel, no server). All state in browser until explicit save.

## D-031: Bundle Format for Save/Load
**Date:** 2026-03-01
**Decision:** Save as a single JSON bundle containing scaffold + all heatmaps. Load restores complete state.
**Rationale:** Single file per engagement. No file management complexity for the rep.

## D-032: Readiness Scoring Pre-Generation
**Date:** 2026-03-01
**Decision:** Show Commercial, Operational, Technical readiness scores + gap recommendations before generating the scaffold. Rep can decide whether to proceed.
**Rationale:** Sets expectations. Low readiness signals incomplete discovery, not a broken tool.

## D-033: Open in Canvas Without Mandatory Save
**Date:** 2026-03-04 (revised from original)
**Decision:** "Open in Canvas →" button is enabled immediately on generation success. Save is encouraged but not required to proceed.
**Rationale:** Friction in the success screen breaks the flow. Rep should be able to explore immediately.

## D-034: Pass 3 Runs After Scaffold Construction
**Date:** 2026-03-01
**Decision:** Original design ran Pass 3 immediately after scaffold construction in `generateIR()`. Revised in D-035.
**Rationale:** Superseded — see D-035.

## D-035: Pass 3 On Demand from Stage Wizard
**Date:** 2026-03-04
**Decision:** Friction assessment (Pass 3) runs on demand from Step 2 of the Stage Wizard, not automatically at Generate time. Discovery-generated bundles that already include a heatmap show it as pre-loaded.
**Rationale:** Gives rep control over when to assess. Supports Load previous / Run new pattern. Cleaner separation of scaffold creation from friction assessment.

## D-036: Stage Wizard Replaces ContentSelectors
**Date:** 2026-03-04
**Decision:** `StageWizard.tsx` replaces `ContentSelectors.tsx` as the primary Stage View toolbar. Three explicit steps with badge progression: Scaffold → Assess Friction → Enrich Solutions.
**Rationale:** ContentSelectors was a single-purpose component. The wizard makes the four-step workflow explicit and navigable.

## D-037: User Guide Panel Replaces Hint Banners
**Date:** 2026-03-04
**Decision:** Single fixed bottom-left `UserGuidePanel` with six contextual states replaces scattered coloured hint banners across App.tsx.
**Rationale:** Consistent location and style. Banners appeared in different colours and positions — disorienting for new users. One panel, one voice.

## D-038: Load Previous / Run New Pattern
**Date:** 2026-03-04
**Decision:** Steps 2 and 3 of the Stage Wizard each offer "↑ Load previous" (file picker) and "▶ Run new" (AI pass). When already complete, show re-load and re-run options.
**Rationale:** Supports quarterly re-use pattern. Rep can load a Q1 assessment and enrich with new solutions, or re-run friction against an evolved scaffold.

## D-039: enrichVersion Counter for FrictionPanel Remount
**Date:** 2026-03-04
**Decision:** `enrichVersion` counter in `canvas-store.ts` increments on every `loadHeatmap`. `FrictionPanel` is keyed on `${selectedActivityId}-${enrichVersion}` to force remount after enrichment.
**Rationale:** FrictionPanel stored observations in local state at mount. After enrichment, solutions were written to the store but the panel never re-read them. Key-based remount is the correct React pattern.

## D-040: Temperature 0 Across All Passes
**Date:** 2026-03-04
**Decision:** All four API calls use `temperature: 0` for deterministic output.
**Rationale:** Non-zero temperature caused different friction observations on re-runs of the same transcript, making it impossible to compare assessments across sessions.


## D-041: TransformationPane Scope — Transformation Only
**Date:** 2026-03-05
**Decision:** TransformationPane serves the transformation use case only — no vendor/solution mapping in this pane.
**Rationale:** Clear semantic separation between friction diagnosis (FrictionPanel) and transformation planning (TransformationPane). Vendor solutions live in the enrichment step, not the transformation layer.

## D-042: SBR Anchor at Activity Level
**Date:** 2026-03-05
**Decision:** SBRs anchor to Activity in the schema. Capability context is shown in the UI as a label only — no schema change required.
**Rationale:** Activities are the atomic execution units. Anchoring at capability level would make SBRs too coarse to drive actionable user stories.

## D-043: User Stories in Zustand — In-Memory Only
**Date:** 2026-03-05
**Decision:** User stories are stored in Zustand keyed by activityId. No backend persistence. In-memory only for v1.
**Rationale:** Consistent with no-backend architecture principle. Stories persist within a session and can be exported via bundle. No server required.

## D-044: Story Generation via API Proxy
**Date:** 2026-03-05
**Decision:** User story generation routes through `/api/claude` Vercel proxy — never direct to `api.anthropic.com` from the browser.
**Rationale:** Direct browser calls to Anthropic API are blocked by CORS. All LLM calls must route through the serverless proxy.

## D-045: summaryOnly=false Globally
**Date:** 2026-03-05
**Decision:** `summaryOnly` set to `false` globally in TransformationPane for now.
**Rationale:** Full SBR card render needed for demo. Proper expand/collapse UX deferred to a later session when expansion interaction is designed properly.

---

## D-046: Pause Implementation for Design Spar
**Date:** 2026-03-06
**Decision:** Pause all feature implementation. Complete design spar and PDS update before further build work.
**Rationale:** VCC has grown to serve three use cases without a formal design review. Continuing to build without resolving the architectural questions creates compounding UX and ontological confusion.

## D-047: Session 10 is a Design Day
**Date:** 2026-03-06
**Decision:** Session 10 agenda: design spar → settled positions → PDS update → code review → refactor plan.
**Rationale:** Sets clear scope for the session and prevents scope creep back into implementation before the design is resolved.

---

## D-048: Friction and Opportunity as Meta-Layer Diagnostics
**Date:** 2026-03-06
**Context:** Design spar surfaced the question of where Friction sits in the CAPSICUM framework. It had been treated implicitly as a property of Activities.
**Decision:** Friction and Opportunity are not first-class ontological objects and do not belong in any single cell of the 3×3. They are meta-layer diagnostic relationships — observations about the health of vertical alignment between the Purpose layer and the Execution layer. Friction = observed misalignment (execution diverging from intent). Opportunity = unrealised alignment (intent not yet served by execution).
**Rationale:** Placing Friction in a cell would make it a structural element of the model. It is not. It is a diagnostic assertion about relationships between elements. The FrictionHeatmap is therefore a view of alignment health, not a separate layer on top of the scaffold.

## D-049: SBRs Belong in the Intent/Governance Column
**Date:** 2026-03-06
**Context:** SBRs were anchored to Activities in Process × Behaviour, treating them as friction observations. This is ontologically wrong.
**Decision:** An SBR is a normative proposal for capability uplift in response to friction — not the friction itself. It belongs in the Intent/Governance column alongside requirements, user stories, change requests, and scope items.
**Rationale:** The current `FrictionObservation.rationale` field conflates observation (friction) with response (SBR). The schema must separate these: rationale describes the problem; upliftIntent/SBR describes the normative intent to address it. TransformationUserStory is the first correct step toward this separation.
**Schema implication:** Separate `rationale` (observation) from a new `upliftIntent` field. User Stories derive from intent, not from observation.

## D-050: Heatmap Splits into Three Conceptual Layers
**Date:** 2026-03-06
**Context:** FrictionHeatmap has accumulated responsibilities: friction observations, binding constraint, vendor mappings, transformation hooks — conflating three distinct epistemic acts.
**Decision:** The heatmap comprises three distinct layers:
1. **Diagnostic** — friction observations anchored to scaffold elements. Pure diagnosis.
2. **Interpretation** — binding constraint and executive conclusions. Human judgement formally committed.
3. **Intervention** — solutions, user stories, vendor mappings. Actions derived from diagnosis.
**Rationale:** These are different epistemic acts and must be separable. For v1 the layers coexist in one artefact but are clearly delineated by field structure. Full structural separation is a v2 concern.

## D-051: CapabilityInstance as Derived Artefact
**Date:** 2026-03-06
**Context:** The same Capability can be deployed across multiple Value Streams and Stages with different performance characteristics. Duplicating the Capability is ontologically wrong; attaching performance directly to Capability is epistemically wrong (context-dependent).
**Decision:** CapabilityInstance is a derived artefact computed deterministically from scaffold references. Never authored explicitly. Identity key: `capabilityId + valueStreamId + activityId`. Stage label is presentation grouping only — not part of the identity key.
**Rationale:** Scaffold references Capability per Activity. Instances are computed from those references plus context tuple. No new authoring burden. CapabilityInstance.prefLabel is human-readable. CapabilityInstance.id is opaque and stable.

## D-052: Topology is a Derived Deterministic Artefact
**Date:** 2026-03-06
**Context:** Network View DAG currently emerges from outcome chains. Question was whether topology should be authored explicitly or left as emergent visual.
**Decision:** Topology is neither authored into the scaffold nor informal/emergent. It is a deterministic derived artefact generated from a sealed scaffold, with its own hash and provenance ("derived from scaffold hash X using topology ruleset version Y").
**Topology derivation ruleset v1:** outcome-chain adjacency; shared roleIds; shared controlIds; shared applicationFunctionIds; shared primaryRecordClassId; capability co-deployment edges (shared capabilityId across activities).
**Rationale:** Topology must be deterministic and reproducible to be trustworthy. Derivation rules must be explicit and versioned. Topology inherits stability from the sealed scaffold.

## D-053: Activity Gains Three New Constitutional Fields
**Date:** 2026-03-06
**Context:** Current Activity schema lacks fields necessary to derive meaningful topology beyond outcome chains.
**Decision:** Three new optional fields on Activity:
1. **`primaryRecordClassId`** — the RecordClass this Activity transitions. Record only for v1 (see D-055). Execution grammar: *Activity = an entitled transition performed by a Role on a RecordClass, using Capability, under Control, via ApplicationFunction.*
2. **`applicationFunctionIds`** — replaces coarser "system" concept. Hierarchy: System → Application → Application Function. Must be a controlled identifier set, not free-text.
3. **`compositeActivityId?`** — optional mereological parthood reference (see D-054).
**Rationale:** These three fields close the topology derivation gaps. Without them the interference mesh can only couple on outcome chains — analytically anaemic.

## D-054: Composition is Mereological Parthood, Not Taxonomic
**Date:** 2026-03-06
**Context:** Composite Activities (ProcessOrder composed of ValidateOrderLines + CheckCreditLimit + ConfirmInventory) needed a schema mechanism without importing tree/hierarchy assumptions.
**Decision:** Composition is mereological parthood, not class hierarchy. Field is named `compositeActivityId` (not `parentActivityId`). A Composite Activity is an Activity whose transition is constituted by a set of lower-grain ordered parts.
**v1 semantic constraints (validator-enforced):**
- Strict parthood: each Activity has at most one `compositeActivityId`
- Ordered parthood: parts form a continuous FSM chain on the same RecordClass
- Composite preOutcome = first part's preOutcome
- Composite postOutcome = last part's postOutcome
- No "atomic" terminology in schema — parts are lower-grain Activities in the current modelling context
**v2 path:** `compositeActivityId` → `compositeMemberships[]` for sharable parthood.
**Rationale:** `parentActivityId` would smuggle a taxonomic/tree assumption that is ontologically wrong. Composition is not inheritance. Correct naming now prevents a painful migration later.

## D-055: Record Only for v1 Data Object References
**Date:** 2026-03-06
**Context:** CAPSICUM's Party/Product/Record triad governs the execution layer. Question was whether to model all three in the scaffold for v1.
**Decision:** Record only for v1. `primaryRecordClassId` references a RecordClass — the type of governed interaction record that transitions through Outcome states. Party and Product are implied domain context, not scaffolded explicitly yet.
**Rationale:** A Record already implies the other two: every Record has a subject (Party) and concerns an object (Product). Creating a Customer creates a Customer Record — distinct from the Customer person. Keeps the scaffold schema tight. The Verb+Noun activity pattern follows: Activity = transition operation (Verb) on a RecordClass (Noun) by an entitled Role.
**v2 path:** Add PartyClass and ProductClass references once the Record foundation is established.

## D-056: Validator Extended with Execution Grammar Rules
**Date:** 2026-03-06
**Context:** Session 11 schema delta introduced three new Activity fields. These require corresponding validator rules to enforce referential integrity and semantic constraints.
**Decision:** Four new rule functions added to `packages/shared/src/validator.ts`:
- `checkExecutionGrammarRefs()` — V-ACTIVITY-04/05/06: reference integrity for applicationFunctionIds, primaryRecordClassId, compositeActivityId
- `checkExecutionGrammarCardinality()` — V-ACTIVITY-09/10: cardinality enforcement (Warning on legacy scaffolds, Error when new registries are present)
- `checkCompositeActivitySemantics()` — V-COMPOSITE-02/03/04/05/06: mereological parthood semantics, boundary continuity, ordered chain integrity
- `checkHeatmapLayerIntegrity()` — V-HEATMAP-02/03/04: three-layer heatmap cross-reference validation (skips gracefully on legacy flat heatmaps)
**Validation phases extended:** Phase 4 (execution grammar), Phase 5 (composite), Phase 6 (friction + heatmap layer).
**Rationale:** Architectural invariants must be machine-enforceable, not just documented. Gradual adoption path preserved via severity promotion logic.

## D-057: Schema Files Updated with New Registries and Activity Fields
**Date:** 2026-03-06
**Context:** Session 11 schema delta required concrete JSON Schema changes.
**Decision:**
- `ScaffoldModel.schema.json`: Added `ApplicationFunction`, `RecordClass`, `ApplicationFunctionMap`, `RecordClassMap` defs. Added `applicationFunctionIds`, `primaryRecordClassId`, `compositeActivityId` to Activity properties. Added `applicationFunctions` and `recordClasses` to elements.
- `FrictionHeatmap.schema.json`: Added `DiagnosticLayer`, `InterpretiveLayer`, `InterventionLayer`, `HeatmapVNext`, `DiagnosticObservation`, `InterpretiveConclusion`, `Intervention` defs. Legacy shape preserved for migration.
**Rationale:** `schema-validator.ts` (AJV layer) requires no changes — it compiles schemas at load time. New schema content flows through automatically.

## D-058: types.ts Extended with Derived Artefact Types and Functions
**Date:** 2026-03-06
**Context:** Session 11 required frontend type coverage for all new schema additions and derived artefacts.
**Decision:** `packages/frontend/src/types.ts` extended with:
- `ApplicationFunction`, `RecordClass` interfaces (new registries)
- Three new Activity fields on `ScaffoldActivity`
- `HeatmapVNext`, `DiagnosticLayer`, `InterpretiveLayer`, `InterventionLayer` and component types (three-layer heatmap)
- `CapabilityInstance`, `CapabilityInstanceView`, `TopologyBasis`, `TopologyNode`, `TopologyEdge`, `TopologyView` (derived artefacts)
- `migrateHeatmap(legacy) → HeatmapVNext` — deterministic migration function
- `deriveCapabilityInstances(scaffold, hash) → CapabilityInstanceView` — pure function
- `deriveTopologyView(scaffold, ciView, hash, rulesetVersion) → TopologyView` — pure function, six coupling signal types
**Rationale:** All derivation functions are pure — identical inputs produce identical outputs. No hidden state. Ready to be moved to `network-derivation.ts` in a dedicated refactor session.

## D-059: Stale Schema Artefacts Identified for Deletion
**Date:** 2026-03-06
**Context:** Found `/schema` directory alongside `/schemas` containing `ScaffoldModel_schema_v3.json` — a pre-Session-11 version of the scaffold schema. Also found `ScaffoldModel_schema.json.bak` in `/schemas`.
**Decision:** Delete `/schema` directory and `ScaffoldModel_schema.json.bak`. Both are superseded noise with no referencing consumers.
**Rationale:** Stale schema files create ambiguity about which version is canonical. `/schemas` is the canonical location.

## D-060: canvas-store Derives CapabilityInstances and TopologyView on Load
**Date:** 2026-03-06
**Context:** Derivation functions existed in network-derivation.ts but were not wired into the store.
**Decision:** `loadScaffold` now derives `CapabilityInstanceView` and `TopologyView` immediately after network nodes are built. Both stored as nullable state fields, cleared on `reset()`. Seal uses `modelIntegrityHash ?? scaffoldId`.
**Rationale:** Derivation is a pure function of the scaffold — correct place to trigger is on scaffold load, not lazily on demand.

## D-061: NetworkView Surfaces Topology Coupling Counts
**Date:** 2026-03-06
**Context:** TopologyView now available in store. NetworkView needed a lightweight way to expose coupling signal without overwhelming the node card visual hierarchy.
**Decision:** Node cards show `N coupled` in indigo text alongside stage count. Tooltip shows `N coupled value streams`. Count is distinct partner VS count derived from topology edge traversal. Gracefully absent when topology is unavailable or count is zero.
**Rationale:** Coupling is a diagnostic signal, not a primary label. Indigo (distinct from amber/red friction palette) keeps it visually subordinate. Zero-count nodes are uncluttered.

## D-062: VCC Bundle Field Names Must Match Canonical Schema
**Date:** 2026-03-07
**Context:** Buildcraft fixture was authored with non-canonical field names throughout (label, capabilityIds, observation anchors as array, etc). Canvas rendered empty entry/exit states, no roles, no capabilities, no PPIT.
**Decision:** Canonical field names are authoritative — no aliases permitted in bundle JSON. Translation table:
- `label` → `name` (on VS, Activity, Outcome, Role, Capability, Control, Metric)
- `capabilityIds` → `requiresCapabilityIds` (on Activity)
- `capabilityPPIT` must be present and keyed by capabilityId with `{ roleIds, activities, informationObjectIds, technologyAppIds }`
- Heatmap observation: `id` → `observationId`, category must be camelCase enum (e.g. `TechnologyIntegrationFriction`), anchors split into `primaryAnchor` + `contributingAnchors` (not a flat `anchors[]` array), `intensity` must be `{ scale, score }` object
- `valueStreamId` is required (not nullable) on standalone heatmap files
**Rationale:** The schema is the contract. Fixture authors must use it — the canvas has no tolerance mode for field name variants.

## D-063: Heatmaps Are Per-VS, Not Multi-VS
**Date:** 2026-03-07
**Context:** Buildcraft fixture initially had a single heatmap with `valueStreamId: null` spanning all three value streams. FileLoader "Load previous" rejected it — `valueStreamId` is required by schema.
**Decision:** Each heatmap file is scoped to one value stream. Multi-VS friction is modelled by creating one heatmap per VS and distributing observations by their primary anchor's activity `valueStreamId`. The binding constraint sits on whichever VS hosts the binding observation's primary anchor.
**Rationale:** Schema contract. The FileLoader validates against FrictionHeatmap schema which requires `valueStreamId`. Per-VS scoping also aligns with the Stage Wizard flow — you assess friction one VS at a time.

## D-064: FrictionPanel Stale State Bug — Fix via key Prop
**Date:** 2026-03-07
**Context:** Keeping the friction panel open and clicking a different friction point left the panel showing stale observations from the previously selected activity. Required close + reclick to repaint.
**Decision:** Add `key={selectedActivityId}` to `<FrictionPanel>` in `CanvasView.tsx`. React tears down and remounts the component on activity change, resetting all `useState` cleanly.
**Rationale:** `useState(initialObservations)` only consumes the initialiser on first mount — prop changes do not reset state on a mounted component. `key` is the canonical React pattern for this. Alternative (useEffect reset) is more code for identical behaviour.

## D-065: Three-Pass Pipeline Architecture (GPT Design Spar — 2026-03-07)
**Date:** 2026-03-07
**Context:** Current four-pass pipeline collapses wrong epistemic boundaries — Pass 3 compresses Steps 05–10 into one LLM call, bypasses the post-Activities validation gate (Gate 1), and allows broken FSM semantics to contaminate downstream artefacts. GPT design spar called to resolve rewrite architecture.
**Decision:** Adopt three-pass runtime with internal B1/B2 sub-passes:
- **Pass A — Discovery IR:** Two internal LLM calls (1a: VS+stages, 1b: roles+capabilities+diagnostic signals). Persisted as one explicit DiscoveryIR artefact. Discovery is generative — determinism not required here.
- **Pass B — Formalised Scaffold:**
  - B1: Outcomes + Activities only (Steps 05–06). Gate 1 invoked immediately. One bounded auto-repair retry. Stop and surface errors if still invalid.
  - B2: Controls + Metrics + Conditions + Assembly (Steps 07–10). Full scaffold validation. Persisted as sealed ScaffoldModel.
- **Pass C — Friction Heatmap:** Steps 11–13. Consumes sealed scaffold only. Null binding constraint explicitly allowed. Full scaffold+heatmap validation. Persisted as HeatmapVNext.
**Three runtime artefacts:** DiscoveryIR, ScaffoldModel (sealed), HeatmapVNext — each recoverable if next pass fails.
**Rationale:** Minimum runtime shape that respects the prompt pack's structural-before-interpretive rule and the mandatory Gate 1 checkpoint. "Two-pass" only works by hiding a gate inside a pass — architecturally dishonest.

## D-066: Formalisation Gate — Surface with One Bounded Retry (GPT Design Spar — 2026-03-07)
**Date:** 2026-03-07
**Context:** Q2 from briefing — what happens when Gate 1 fails after Pass B1?
**Decision:** One automatic bounded repair attempt: feed validator output back into a repair prompt, rerun B1 once. If still fails → surface "Scaffold formalisation failed validation" with recoverable artefact view and explicit issues list. Do not silently retry forever. Do not dump raw validator noise on first failure.
**Rationale:** Preserves usability while respecting Gate 1 as architecturally terminal for the current attempt. More than one auto-repair retry becomes hidden improvisation and erodes trust.

## D-067: Null Binding Constraint is a Valid Diagnostic Output (GPT Design Spar — 2026-03-07)
**Date:** 2026-03-07
**Context:** Q3 — how to handle cases where no candidate meets eligibility (Downstream Dependency ≥ 2). Tension identified between MVP docs (lean toward exactly one binding constraint) and prompt pack (explicit null allowed).
**Decision:** Null binding constraint is a valid and distinct output state. Three states must be distinguishable in the UI:
1. "Not yet assessed" — Pass C has not run
2. "No binding constraint identified" — Pass C ran, candidates scored, none met eligibility
3. "Binding constraint: [X]" — eligible candidate identified
UI treatment for null: no gold banner, no binding badge. Neutral executive callout: "No eligible binding constraint identified in this assessment. No candidate met structural blocking threshold."
**Rationale:** A diagnostic that says "no constraint found, here's why" is more credible than forcing a selection. Prompt pack explicitly allows null. MVP docs amended by this decision.

## D-068: DiscoveryIR Surfaced as Light Review Panel (GPT Design Spar — 2026-03-07)
**Date:** 2026-03-07
**Context:** Q4 — should DiscoveryIR be surfaced to user before formalisation? Currently hidden state between passes.
**Decision:** Yes, surface DiscoveryIR — but lightly. A Review Discovery panel (expandable, not a full editor) shown before Pass B begins, displaying: org summary, value streams + stages, roles, capabilities, top gaps/low-confidence items. Allow minimal edits only: rename VS, rename/remove stage, remove spurious role/capability, add missing obvious item. No editing of formal scaffold semantics at this layer.
**Rationale:** Hallucination-reduction benefit without opening the full modelling problem. Consistent with design guardrail: no inline model editing, diagnostic surface not modelling workstation.

## D-069: Determinism Enforced at Proxy Level for Formalisation (GPT Design Spar — 2026-03-07)
**Date:** 2026-03-07
**Context:** Q5 — where to enforce temperature: 0 for Steps 05–10. D-040 locked temperature 0 but enforcement is currently prompt-only and not deployed.
**Decision:** temperature: 0 enforced at the API proxy level (api/claude.ts) for all formalisation and heatmap calls, not just in prompt wording. Logged into generation metadata. Client code and prompt text can drift — proxy is the only dependable enforcement boundary.
**Failure mode if not enforced:** IDs change between runs, outcome chains vary, scaffold hashes become unstable, friction comparisons across sessions become meaningless. Fatal to a governed reasoning instrument.
**Rationale:** D-040 is already locked. This decision specifies the enforcement mechanism.

## D-070: Five Named Tensions — Pipeline Rewrite (GPT Design Spar — 2026-03-07)
**Date:** 2026-03-07
**Context:** GPT identified five tensions to record before building. Recorded here as named tradeoffs, not decisions — each constrains implementation choices.
**Tensions:**
1. **User simplicity vs ontological correctness** — single "Generate" button is good UX but the system must enforce internal gates and preserve intermediate artefacts. UI simplicity must not flatten architectural truth.
2. **Visible recovery vs black-box resilience** — one bounded auto-repair retry is good; more becomes hidden improvisation and erodes trust. Hard cap at one retry per gate.
3. **Discovery review vs workflow friction** — surfacing DiscoveryIR improves accuracy but slows presales flow. Limit editable surface to low-confidence/high-impact fields only.
4. **Deterministic scaffolding vs rich generative detail** — if discovery is thin, correct response is fewer elements + surfaced gaps, not invented completeness. Do not infer missing ontology elements.
5. **Exact-one binding constraint (MVP docs) vs valid null (prompt pack)** — resolved by D-067 in favour of prompt pack. MVP docs superseded on this point.

## D-071: What Not to Build in Pipeline Rewrite (GPT Design Spar — 2026-03-07)
**Date:** 2026-03-07
**Context:** GPT explicitly scoped out the following to prevent scope creep in the pipeline rewrite.
**Deferred/excluded:**
- No persistent backend orchestrator — browser-first, serverless-proxy architecture stands
- No full scaffold editor — violates diagnostic-surface design intent
- No scenario modelling — PDS places this later, not needed to fix pipeline integrity
- Do not merge friction generation back into scaffold generation for efficiency — directly violates structural-before-interpretive
- Do not make binding constraint selection manual in intake pipeline — manual override belongs in canvas interpretation workflows, not initial heatmap generation

## D-072: FileLoader Error Surfacing
**Date:** 2026-03-08
**Decision:** FileLoader catch block logs real error and surfaces `err.message` in UI instead of always showing "Failed to parse JSON file".
**Rationale:** Generic error messages make debugging impossible. Surface the actual parse failure.

## D-073: resolveActivityIds() — v4/v5 Dual Format Support
**Date:** 2026-03-08
**Decision:** Added `resolveActivityIds()` helper in `network-derivation.ts` that handles both legacy `activityIds[]` format (v4) and `activityChainHead` + `nextActivityId` chain format (v5). Patched two call sites: `deriveNetworkEdges` and `buildNetworkNodes`.
**Rationale:** v5 pipeline bundles eliminated `activityIds[]`. Network View must work with both formats.

## D-074: layoutZone vs zone Field Fallback
**Date:** 2026-03-08
**Decision:** `network-derivation.ts` accepts both `layoutZone` (v4) and `zone` (v5) via `??` fallback at 3 locations.
**Rationale:** v5 bundles renamed the field. Frontend must tolerate both without migration.

---

## D-075: v5 Chain Walk in generateCanvasForVs
**Date:** 2026-03-08
**Context:** v5 bundles removed `activityIds[]` from value stream objects, replacing with `activityChainHead` + `nextActivityId` chain. `generateCanvasForVs` crashed on v5 bundles.
**Decision:** Added `resolveOrderedActivityIds()` helper inside `generateCanvasForVs` that detects format by presence of `activityIds` array (v4) or falls back to walking the chain (v5). Both paths produce identical ordered array.
**Rationale:** Normalise at load time within the function. Rejected load-time schema migration to preserve bundle provenance.

## D-076: Dual Capability Field Read
**Date:** 2026-03-08
**Decision:** All capability field reads use `enabledByCapabilityIds ?? requiresCapabilityIds ?? []`. Applied in `canvas-store.ts`, `StageCard.tsx`, `CapabilityBlock.tsx`.
**Rationale:** v5 renamed `requiresCapabilityIds` to `enabledByCapabilityIds`. Both must work.

## D-077: CapabilityBlock v5 PPIT Fallback
**Date:** 2026-03-08
**Decision:** When `capabilityPPIT` is absent (v5), PPIT layers fall back to activity-level arrays: `performedByRoleIds` for Roles, `[activity.name]` for Activities, `informationObjectIds`/`technologyAppIds` for Info/Tech.
**Rationale:** v5 bundles have no per-capability PPIT. Fallback is additive; v4 path unchanged.

## D-078: CanvasView bindingAnchor Guard
**Date:** 2026-03-08
**Decision:** Changed to optional chaining `heatmapData.bindingConstraint?.bindingAnchor` in `CanvasView.tsx`.
**Rationale:** v5 heatmaps with `bindingConstraint` present but `bindingAnchor` undefined caused blank white screen crash.

## D-079: StageCard ↔ Concept Card Alignment (Noted, Deferred)
**Date:** 2026-03-08
**Decision:** Noted structural alignment between `StageCard` and Eric Broda's Concept Card. No action. When MVC demo begins, `StageCard` is the candidate host for Governance Kernel overlay via `ppitToggles` layer system.

---

## D-080: Pass 3 Generates v4 Format Exclusively
**Date:** 2026-03-08
**Decision:** Pass 3 prompt generates v4 format only: `activityIds[]`, `requiresCapabilityIds`, `capabilityPPIT`. Not the v5 chain format.
**Rationale:** Deployed canvas-store reads v4 fields. Generating v5 from Pass 3 while canvas expects v4 causes silent render failures. (Previously D-044 in session log.)

## D-081: Pass 1 Excludes Initiatives; Stage Names 2–4 Words
**Date:** 2026-03-08
**Decision:** Pass 1 prompt explicitly excludes time-bounded initiatives/projects. Stage naming rule: "2–4 words, title case — short labels not sentences."
**Rationale:** LLM was surfacing initiatives (e.g. "Technology Integration Foundation") as value streams and generating verbose stage names. (Previously D-045 in session log.)

## D-082: Pass 3 RULE 1 — Preserve All Value Streams
**Date:** 2026-03-08
**Decision:** Pass 3 must produce exactly one `valueStream` entry for every VS in confirmed inputs. No silent drops, renames, or merges.
**Rationale:** Model was silently dropping VS based on its own judgement. "6 in = 6 out." (Previously D-046 in session log.)

## D-083: Template Literal Backtick Safety
**Date:** 2026-03-08
**Decision:** Closing backtick of template literals must be unescaped. Regexes containing backticks use `[backtick]` character class form to prevent template literal breakage.
**Rationale:** Python script wrote escaped backtick as closing delimiter, breaking the Vite build. (Previously D-047 in session log.)

## D-084: humanizeId Utility for Display Fallback
**Date:** 2026-03-09
**Decision:** Created `src/lib/humanize-id.ts` with `humanizeId()` function. Strips type prefix (`cap_`, `role_`, `act_`, etc.) and converts snake_case/kebab-case to Title Case. Applied as fallback display in 9 components.
**Rationale:** LLM-generated scaffolds don't always populate element registries fully. Raw IDs like `cap_lead_qualification` are unreadable. Fallback now shows "Lead Qualification".

---

## D-085: Single Source of Truth for Pipeline Prompts
**Date:** 2026-03-09
**Decision:** All LLM prompts extracted from inline TypeScript into dedicated files in `domain/pipeline/prompts/` — one file per pipeline pass (pass-a1, pass-a2, pass-b, pass-c). Pipeline runtime files (pipeline-orchestrator, scaffold-formaliser, heatmap-analyser) are pure plumbing that import prompt builders.
**Rationale:** Dual code path problem — inline prompts in DiscoveryIntake.tsx vs orphaned modular pipeline caused repeated regressions across sessions 15-17. Fixes to one weren't reflected in the other. Single source of truth eliminates this class of bug entirely.

## D-086: capabilityPPIT in Pass B Prompt
**Date:** 2026-03-09
**Decision:** Pass B scaffold prompt now requires capabilityPPIT decomposition for every capability on every activity: roleIds, exactly 3 stage-specific sub-activities, informationObjectIds, technologyAppIds. Includes worked example in prompt.
**Rationale:** Bundle v2 (gold standard) had rich PPIT mappings; bundle v9 had zero. The capabilityPPIT structure is what makes the model actionable — it shows HOW each capability is exercised at each stage. Requires `max_tokens: 32000` and `anthropic-beta: output-128k-2025-02-19`.

## D-087: Prompt Determinism Requirement
**Date:** 2026-03-09
**Decision:** Pass B prompt explicitly declares: "This is a structural formalisation step — a pure function. Given these inputs, produce the same output every time." IDs derived mechanically from names. No creative variation.
**Rationale:** User requirement — "This is a Deterministic practice and they will want that consistency." Each run of the same inputs should produce structurally identical output.

## D-088: Edge Runtime + Streaming for Vercel Proxy
**Date:** 2026-03-09
**Decision:** `/api/claude.ts` runs as Vercel Edge Runtime (`export const config = { runtime: "edge" }`) and forces `stream: true` on all Anthropic requests. Response body is a pass-through `ReadableStream`.
**Rationale:** Vercel Hobby caps serverless functions at 10s (non-negotiable). Edge Runtime gets 30s wall-clock. Streaming ensures first bytes arrive in ~1s, keeping the connection alive. Three progressive failures (timeout → Edge without streaming → streaming without Edge) proved both are needed together.

## D-089: Shared callLLM Client
**Date:** 2026-03-09
**Decision:** All LLM API calls go through `domain/pipeline/llm-client.ts` `callLLM()`. No raw `fetch` to `/api/claude` anywhere in the codebase. Client auto-detects SSE stream vs plain JSON (dev mode).
**Rationale:** Streaming proxy returns SSE events, not JSON. Every raw `fetch` + `res.json()` call broke with "Unexpected token 'e'" (trying to parse SSE text as JSON). Centralising in one client prevents this class of error.

## D-090: Extended Output for Scaffold Generation
**Date:** 2026-03-09
**Decision:** API proxy sends `anthropic-beta: output-128k-2025-02-19` header. Pass B uses `max_tokens: 32000` (up from 16000).
**Rationale:** capabilityPPIT scaffold generates 61K+ characters (~16K+ tokens). Was truncated at 16K limit, producing unparseable JSON. Extended output beta unlocks up to 128K tokens.

## D-091: Assess Friction Uses Pass C Pipeline (Not Inline Prompt)
**Date:** 2026-03-09
**Decision:** StageWizard "Run new" friction button calls `runPassC()` from heatmap-analyser.ts, not an inline prompt. Generates observations for ALL value streams in one call.
**Rationale:** Inline runPass3 had a simplified prompt that didn't match scaffold activity IDs, hardcoded first VS only, and lacked proper binding constraint scoring. The Pass C pipeline uses scaffold skeleton with exact IDs, proper taxonomy, and eligibility-based binding selection.

---

## D-092: Editable Canvas Phase 1 — Inline Editing + Bundle Save/Load
**Date:** 2026-03-10
**Decision:** All scaffold element labels are now editable via double-click inline editing (InlineEdit component). Scaffold mutations use immutable spread pattern in Zustand store. `scaffoldDirty` flag tracks unsaved changes. Bundle v2.0 format saves scaffold + heatmaps + userStoriesByActivity as a single JSON file via File System Access API (with blob download fallback). FileLoader detects and restores bundle v2.0.
**Rationale:** Daniel's top priority for Salesforce demo. The canvas was read-only after scaffold generation — any correction required re-running the entire intake. Inline editing makes the canvas a living document. Bundle save/load enables session continuity across browser refreshes.

## D-093: Editable Canvas Phase 2 — Add/Remove Elements
**Date:** 2026-03-10
**Decision:** Structural editing of scaffold elements directly on the canvas: add/remove capabilities (per activity), add/remove stages (activities in a value stream), add/remove roles (per activity, with smart name matching to reuse existing roles), add/remove information objects and technology apps (per capability, visible when PPIT toggles active). All mutations auto-regenerate canvas view and refresh network nodes. Last remaining stage cannot be removed.
**Rationale:** Extends D-092 to cover structural changes beyond label editing. Users identified in discovery that stages were missing or capabilities were misattributed — previously required re-running the pipeline. Now correctable in-place. Combined with D-092, the intake+scaffold build is effectively a one-off bootstrap.