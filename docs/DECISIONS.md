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

---

## D-094: PPIT Sub-Activities Editable + Per-Capability Roles
**Date:** 2026-03-10
**Context:** PPIT Activities (purple items) and Roles (blue chips) were visible but not editable. Roles were attached at stage level, inconsistent with the metamodel which maps roles per capability.
**Decision:**
- PPIT sub-activities (the granular purple text items in CapabilityBlock) are now inline-editable, addable, and removable when capabilityPPIT exists. Five new store actions: `updatePpitActivity`, `addPpitActivity`, `removePpitActivity`, `addRoleToCapability`, `removeRoleFromCapability`.
- Roles moved from stage-level editing to per-capability PPIT editing. Stage header now shows aggregated "Participating Stakeholders" (read-only, Business Architecture Guild terminology).
- Smart role reuse: adding a role does case-insensitive name matching against the global registry before creating a new entry.
**Bug found during implementation:** `activity.id` is `undefined` in many scaffold bundles because the record key serves as the ID but is not duplicated on the object. All PPIT store actions silently bailed at guard clauses. Fixed by passing `activityId` as an explicit prop from StageCard → CapabilityBlock and StageColumn → StructurePane.
**Rationale:** Completes the editable canvas — every PPIT layer is now interactive. Per-capability role assignment aligns with the metamodel (capabilities are performed by specific roles, not inherited from stages).

## D-095: Ontology Without Repository — Architectural Principle
**Date:** 2026-03-10
**Context:** User observation that VCC has no graph backend and capabilities aren't treated as first-class objects with a registry.
**Decision:** VCC deliberately separates ontology (the metamodel — concepts and relationships) from repository (a persistent store of instances). The ontology is enforced; the repository is absent by design. The scaffold JSON is an ontology-conformant document that lives on the user's machine. No backend is a product feature: simple deployment (just hit the URI), portable data model (JSON bundle is the API spec), no infrastructure overhead for presales engagements.
**Rationale:** Lightweight architecture is a competitive advantage. The JSON bundle is simultaneously the working document, the save file, and the data model specification for downstream integration. Multi-user collaboration is the natural upgrade trigger — not a gap in the current product.

## D-096: TypeScript Type Drift — Identified Technical Debt
**Date:** 2026-03-10
**Context:** The `activity.id` bug (D-094) is a symptom of a broader problem: TypeScript types declare fields that runtime data doesn't always have. `ScaffoldActivity` declares `id: string` but many bundles don't include it. Other examples: `technologyIds` vs `technologyAppIds`, varying presence of `capabilityPPIT`.
**Decision:** Acknowledged as technical debt requiring a focused cleanup session. Current mitigations: double-cast through `unknown` for type assertions, explicit prop-passing for IDs instead of deriving from potentially-absent object fields, store-direct reads for mutable PPIT data. Full fix requires aligning TypeScript types with the union of all observed runtime data shapes, or implementing a normalisation layer on bundle load.
**Rationale:** The `as any` casts and `@ts-nocheck` directives are pragmatic but accumulate risk. Each one is a place where the compiler can't help catch future regressions.

## D-097: Data Architecture Trajectory — Three-Step Evolution
**Date:** 2026-03-10
**Context:** Discussion of how to bring graph capabilities into the product without losing the lightweight deployment advantage.
**Decision:** Three evolutionary steps, each independently valuable, each preserving no-backend deployment:
1. **Client-side graph index** — in-memory adjacency map built on bundle load. Enables capability selector (pick existing before creating new), element reuse detection, "where used?" traversal. No bundle format change.
2. **Ontology-as-schema validation** — formal metamodel relationship definitions (TypeScript or JSON-LD). Validate bundles on load/generation. Becomes the integration spec for customers. Resolves D-096 type drift.
3. **Client-side graph visualisation** — D3-force or vis.js rendering of the scaffold as a navigable network diagram. Visual query interface over the Step 1 index.
**Upgrade trigger:** Multi-user modelling. When a customer needs concurrent editing, introduce a thin backend (document store or graph DB). The ontology schema from Step 2 becomes the API contract. Bundle format unchanged — just persisted centrally.
**Architectural invariant:** The JSON bundle is the portable unit of work. Every evolution must preserve bundle portability.
**Rationale:** Maintains the product advantage of no-backend simplicity while providing a clear path to richer capabilities. Each step is a valuable product increment, not just infrastructure preparation. Candidate for GPT design spar review.

## D-098: Customer Story Filtering in FrictionPanel
**Date:** 2026-03-10
**Decision:** FrictionPanel gains sidebar filtering for customer stories: by industry, company size, and status. Filter chips with counts, toggleable, applied as intersection. Committed as `a892798`.
**Rationale:** Sales discovery users need to narrow customer stories to relevant examples when presenting to prospects.

## D-099: MVC Integration — Concept Cards & Policy Cards
**Date:** 2026-03-10
**Decision:** Full Minimum Viable Context (MVC) integration: `types/cards.ts` (CardRegistry, ConceptCard, PolicyCard types + `getCardsForActivity` query), `fixtures/cards/puretec-cards.json` (6 concept + 4 policy demo cards), `CardPanel.tsx` (480px sidebar with typed card rendering), C/P toolbar toggles, card count badges on StageCard, `cardRegistry` in Zustand store with `loadCards` action. Cards auto-load from bundle or demo fixture. Committed as `07e0a41`.
**Rationale:** Preparation for Eric Broda meeting. Demonstrates three layers of VCC+MVC value: content extraction (VCC bootstraps card library), governance at consumption (policy cards provide decision boundaries), orchestration scaffold (activity chain tells context compiler when to load which cards).

---

## D-100: Multi-Lens Canvas Architecture
**Date:** 2026-03-10
**Context:** VCC canvas has accumulated overlapping concerns — scaffold exploration, friction analysis, MVC cards, customer stories — with a growing toolbar. Governance simulation (GSM kernel) is next. Cognitive overload risk is real. The canvas started as a scaffold visualiser and is being asked to serve fundamentally different use cases.
**Decision:** Adopt a multi-lens architecture where the scaffold is the foundational substrate and use cases are independent projections (lenses) of that substrate.

**Foundational layer:**
- **Network View** — enterprise-level value stream topology (home page)
- **Stage View** — interactive canvas for a single value stream slice

These two views are the scaffold building and exploration surface. All data loads here. All structural editing happens here.

**Use-case lenses** (selected at Stage View level, each brings its own toolbar, panels, and simulation semantics):
- **Operational Productivity** — friction points, binding constraints, diagnostic heatmap. Current FrictionPanel + TransformationPane.
- **Sales Discovery** — solutions, customer stories, customer story filtering. Current StageWizard Step 3 + story panels.
- **Transformation** — strategic requirements, user stories, initiative tracking. Future capability.
- **Authority Governance** — entitlements, interactions, deontic evaluation, GSM kernel simulation. The CAPSICUM Execution Layer made operational.
- **Agentic Mesh MVC** — concept cards, policy cards, context compiler alignment. Third-party framework overlay demonstrating MVC integration.

Additional lenses can be defined without modifying the foundation. Simulations cut across all lenses but present differently per use case.

**Data model:** Single Zustand store, single scaffold, single bundle. Each lens reads from the same store but surfaces different relationships and panels. Lens selection filters the toolbar to show only relevant controls. Lens-specific data (cards, friction, stories) lives in the store but is only rendered when its lens is active.

**Bundle impact:** None. The lens is a UI concern, not a data format concern. Bundle portability preserved.
**Rationale:** Prevents cognitive overload by showing users only what's relevant to their current task. Aligns with the CAPSICUM orthogonality principle — each lens is a different projection of the same underlying 3×3 matrix, emphasising different rows and columns. Scales indefinitely without growing the toolbar.

## D-101: Class Inspector Pattern
**Date:** 2026-03-10
**Context:** FrictionPanel and CardPanel are both element-specific overlay panels triggered by clicking a scaffold element. They share the same UX pattern (side panel, contextual detail) but each was built ad-hoc. As lenses multiply, every Class of scaffold element needs a typed inspection surface.
**Decision:** Establish the Class Inspector as a formal UX pattern: clicking any scaffold element opens a typed overlay panel whose layout, properties, and linked data are determined by the element's Class (its position in the CAPSICUM 3×3 matrix).

**Pattern definition:**
- Each Class (Capability, Role, Activity, Outcome, Control, Information Object, Technology App, Concept, Term) has a metamodel of relevant properties and measures.
- The inspector for a given Class assembles a complete contextual perspective for that instance: where it's used, what it's linked to, relevant diagnostics, relevant measures.
- Content is progressively enriched as data sources become available (e.g., a Capability inspector initially shows name + where-used; later gains maturity score, friction points, requirements, in-train user stories, card anchors).

**Example metamodels:**
- **Capability** — description, where-used (activities × value streams), performing roles, PPIT decomposition, maturity assessment, known pain points, friction observations, requirements, user stories, concept card anchors.
- **Role** — description, entitlements held, activities performed, interaction history, qualification conditions.
- **Activity** — pre/post conditions, decision table rows (when GSM active), participating roles, required capabilities, friction observations.
- **Outcome** — defining properties (Terms), reachability (which states lead here), lifecycle position.
- **Control** — authority source, condition logic, linked activities, policy card reference.

**Existing implementations that become Class Inspectors:**
- FrictionPanel → observation-level inspector (subset of Activity/Capability inspector)
- CardPanel → card-level inspector (subset of Concept/Policy inspector)

**Future evolution:** Inspectors gain charts, widgets, and cross-reference visualisations as the data model matures. The Class Inspector is the primary surface for the client-side graph index (D-097 Step 1) — "where is this element used?" is an inspector query.
**Rationale:** Generalises the ad-hoc panel pattern into a systematic, extensible architecture. Every element type gets the same quality of contextual insight. The metamodel per Class is the bridge between the ontology (what relationships exist) and the user experience (what's shown when you click something).

## D-102: GSM Simulation on Current Architecture
**Date:** 2026-03-10
**Context:** The Governance Evaluation Kernel from the Logical Model of Endeavour paper (Roach, 2026) specifies a typed nine-tuple GSM = (S, Σ, map, δ, u, s₀, F, E, T, ε) with SHACL-based Terms validation over a JSON-LD state graph. Full implementation requires graph infrastructure. Immediate simulation value doesn't.
**Decision:** Implement GSM evaluation engine on the current TypeScript/Zustand architecture. Design types isomorphic to the formal tuple. Implement decision table evaluation as a pure function. Use Policy Cards for E (entitlement function) and Concept Card senses for T (terms). Defer SHACL validation to the D-097 graph evolution path.

**What this enables:** Faithful simulation of V(ρ, σ, s, κ, T) → {Fire, Reject, Escalate(εᵢ)} for any scenario expressible in the current data model. Four escalation triggers (ε₁ semantic subsumption, ε₂ deontic conflict, ε₃ missing entitlement, ε₄ evaluator indeterminacy) fire correctly. Decision table row matching is deterministic. Role Gate orthogonality is demonstrable.

**What this defers:** Declarative SHACL Terms validation (TypeScript conditionals instead), structural provenance chains (string references instead of queryable triples), formal Translation Integrity pipeline.

**Seam design:** The interface between the evaluation engine and Terms validation is a clean boundary. When D-097 Step 2 delivers ontology-as-schema validation, the Terms evaluator can be swapped from imperative TypeScript to declarative SHACL without changing the kernel's interface.

**Lens assignment:** GSM simulation is the core of the Authority Governance lens (D-100). The 3×3 grid, decision table, kernel status panel, and step-by-step narrative are Authority Governance lens components.
**Rationale:** The decision table evaluation is pure logic that doesn't require a graph store. Building it now delivers immediate demonstration value (Eric Broda conversation, paper PoC evolution) while the type design ensures clean migration when graph infrastructure arrives.
## D-108: Backend Architecture — Option C (Hybrid, API-First)
**Date:** 2026-03-11
**Context:** Field demand for multi-user access from Puretec engagement. Six requirements (R1-R6). One-person + AI team constraint. Target: Salesforce sales team trial (~20-30 users, ~12-15 client projects).

**Governing constraints:**
1. No messaging platform lock-in. Web app is primary client. Messaging integrations are pluggable adapters.
2. Success = sales team trial, not a single customer demo.
3. One person + AI builds everything. Managed services only. Zero custom DevOps.
4. Go/no-go based on trial outcomes. Production features post-trial.

**Decision:** Option C — API-first backend for state/auth (Supabase), edge for LLM compute (Vercel Edge Runtime). Web frontend is primary client. Messaging integrations (Slack first, then Teams/others) are thin adapters behind the same API.
- Supabase: Postgres + Auth + Row Level Security. Managed.
- LLM pipeline: Vercel Edge Runtime (unchanged). Passes A1-A5 stay edge-side.
- Bundle format: JSONB in Supabase Postgres. Same schema for storage, API, and export.
**Rationale:** Supabase provides auth, database, RLS, and realtime out of the box. A solo developer can have multi-user persistence working in days. Edge-resident LLM pipeline stays intact. API-first design ensures messaging integrations plug in later without refactoring.

## D-109: Minimum Backend Schema for Sales Team Trial
**Date:** 2026-03-11
**Context:** Trial requires ~20-30 users across ~12-15 projects. Need auth, project isolation, shared access.
**Decision:** Three tables: `users` (Supabase Auth), `projects`, `project_access`. Supabase Auth handles sign-in (Google OAuth, magic link). RLS policies enforce project isolation at database level. Optimistic locking via `revision` counter. `module` field on projects (default 'sales-discovery').
**Rationale:** Supabase RLS eliminates need for custom API layer for basic CRUD. Frontend talks directly to Postgres through Supabase client. Fastest path to multi-user persistence for solo developer.

## D-110: Bundle as Canonical Format
**Date:** 2026-03-11
**Context:** Bundle is currently a JSON file on user's filesystem. Backend requires deciding role of bundle format.
**Decision:** Bundle JSON schema is single source of truth for persistence, API exchange, and export. JSONB in Postgres stores bundle as-is. No normalisation. Single canonical schema version enforced. Old bundles auto-migrated on read. Export produces JSON file. Import accepts and migrates.
**Rationale:** Aligns with D-095. No impedance mismatch. Bundle remains portable.

## D-111: Module System — Explicit Choice, Soft Boundary
**Date:** 2026-03-11
**Context:** Different users need different features. Must be simple for one person to build.
**Decision:** Module set at project creation (dropdown: Sales Discovery, Board Diagnostic, Transformation Planning). Controls which pipeline passes are available and which UI panels render. Can be changed later via project settings (soft boundary). Existing data preserved when switching. No progressive disclosure in MVP.
**Rationale:** Explicit choice is simpler to build, test, and explain than context inference. Can evolve to progressive disclosure post-trial if user feedback warrants it.

## D-112: Editing Architecture — Structured Now, Conversational Later
**Date:** 2026-03-11
**Context:** R2 (structured editing) and R5 (conversational LLM editing) both needed. Both spar challengers agreed they should be separate pipelines.
**Decision:** Phase 1 (trial): Structured editing only. Edit mode on canvas. Direct field manipulation. Mutations save to backend via Supabase. Phase 2 (post-trial): Conversational editing via Pass 5 (Revision). Separate endpoint. Returns proposed delta. User approves before applying. Provenance tracked.
**Rationale:** Structured editing is deterministic, auditable, sufficient for trial. Conversational editing requires Pass 5 prompt design, delta logic, approval UX — too much scope for initial trial.

## D-113: Messaging Integration — Pluggable Adapters, No Lock-In
**Date:** 2026-03-11
**Context:** Slack is immediate opportunity (Salesforce owns Slack). But no platform lock-in.
**Decision:** Backend API is messaging-platform-agnostic. Messaging integrations are thin adapters (~200-300 lines each). Slack adapter first. Architecture supports Teams, WhatsApp Business, standalone chat, any future platform. Slack levels staged: Level 0 (inbound transcript, trial), Level 1 (copilot, post-trial), Level 2 (outbound feed, future).
**Rationale:** Adapter pattern ensures no platform is architecturally privileged. VCC API is the product; adapters are distribution channels.

## D-114: Build Sequence — Four Phases for Sales Team Trial
**Date:** 2026-03-11
**Context:** One person + AI. Target: sales team trial with ~12 clients.
**Decision:** Phase 1 (Weeks 1-3): Multi-user web app — Supabase auth, project CRUD, edit mode, module selection. Phase 2 (Weeks 3-5): Trial readiness — sharing, polish, concurrent access. Phase 3 (Weeks 5-7): Slack adapter Level 0. Phase 4 (Weeks 7+): Feedback-driven.
**Explicitly not in trial scope:** Conversational editing (Pass 5), multi-content ingest, multi-tenant isolation, audit trails, real-time co-editing, RBAC beyond view/edit, offline-first, graph storage.
**Rationale:** Phases 1-2 get trial running. Phase 3 adds Slack story. Phase 4 is feedback-driven. Solo developer + AI can deliver Phases 1-3 in 5-7 weeks.

## D-115: Network Layout Lens — Configurable Zone Stratification
**Date:** 2026-03-12
**Status:** Deferred (Phase 2)
**Context:** The IIBA model uses a two-zone layout (Ecosystem/Knowledge) driven by `layoutZone` on each value stream and `layoutZones` array on the scaffold. This produces a visually structured Network View with dashed boundary boxes and zone labels. The current implementation is hardcoded for exactly two zones with IIBA-specific sort orders. Multiple stratification patterns exist in practice: Strategic/Core/Enabling (classic value chain), Govern/Provide/Enable (IT operating models), Front Office/Back Office, Ecosystem/Knowledge, and custom user-defined groupings.
**Decision:** Generalise the Network View zone system to support N configurable layout lenses. Each lens defines a set of named zones with display order. Value streams carry a zone assignment per lens. The user selects the active lens from a toolbar dropdown. The scaffold schema will support: (1) a `layoutLenses` array defining available stratifications with zone definitions, (2) per-VS `zoneAssignments` keyed by lens ID, (3) a default lens ID. The Discovery Intake form's zone selector becomes lens-aware. The pipeline's Pass B prompt will suggest a default lens based on the extracted value streams.
**Known lens presets:** Strategic/Core/Enabling (3 horizontal bands), Govern/Provide/Enable (3 bands — common in ITSM/EA), Front Office/Back Office (2 bands), Ecosystem/Knowledge (2 bands — IIBA pattern), Custom (user-defined).
**Rationale:** Every demo is dramatically more impressive when the Network View shows domain-aware structure rather than a flat graph. Multiple lens support means the same model can be viewed through different strategic frames without changing the underlying data. Low schema cost (additive), high visual impact.
**Depends on:** Current two-zone implementation (working), intake form zone selector (working).
**Not in scope:** 3D or nested zone layouts, animated transitions between lenses, per-zone colour theming (nice-to-have later).

## D-116: Single Repository — Views as Projections, Not Owners
**Date:** 2026-03-12
**Status:** Approved — implementation pending
**Context:** The current architecture has two independent state trees: (1) `DiscoveryIntake` owns its own `FormState` via React `useState` (org, value streams, roles, tech, pain points, metrics), and (2) `canvas-store` owns `scaffoldData` (the canonical operating model). These are only connected at generation time — the pipeline transforms form → scaffold. After generation, they diverge: canvas edits mutate `scaffoldData` but never flow back to the form. This means round-tripping (editing the form after canvas edits) would silently discard canvas-level changes — renamed activities, added capabilities, reordered stages, etc. The root issue is that the form and canvas are both *owners* of state rather than *projections* of a shared repository.

**Decision:** Refactor so that a single source of truth (the Zustand store) holds the operating model, and both the Discovery Form and the Canvas/Network views are read-only projections that dispatch mutations to the store. Specifically:

1. **Extract form state into a `discovery-store`** (or extend `canvas-store`) so the pre-generation representation (org metadata, transcript, extraction state) lives alongside `scaffoldData` as a peer, not in component-local state.

2. **Build `scaffoldToForm()` hydration** — a reverse-mapping function that projects a scaffold back into `FormState`. When navigating to the Discovery tab, the form reads from the *current* scaffold, including any canvas edits. Fields that don't exist in the scaffold (e.g. transcript text, extraction metadata, pain point intensity) are preserved separately in the discovery store.

3. **Generation replaces the scaffold** as today, but the form stays synchronised because it's derived from the same store. Re-opening the form after generation shows the generated model's actual state, not the pre-generation input.

4. **Canvas edits continue to mutate `scaffoldData`** as today (D-092/093/094). The form simply re-derives on open.

**Migration path:** This is a refactor, not a rewrite. The DiscoveryIntake component keeps its UI and layout; only its state source changes from `useState(EMPTY_FORM)` to a Zustand selector. The existing `setOrg()`, `setVS()`, etc. updaters become store actions. The pipeline orchestrator writes to the store instead of returning a bundle to a callback.

**Why not just warn and block?** We considered adding a "you have unsaved canvas edits" warning when navigating to Discovery, but this treats the symptom (data loss) rather than the cause (two sources of truth). The warning would also be confusing — the user didn't think they had "unsaved" changes because they were editing directly on the canvas. The single-repository pattern is the correct long-term fix.

**Rationale:** Every view should be a dumb projection of the repository. This is the standard pattern for collaborative editing tools (Figma, Google Docs, Notion) and aligns with how Supabase persistence already works — `saveToProject()` serialises `scaffoldData`, not form state. Making the form a projection of the same data that the canvas projects eliminates an entire class of sync bugs.

**Depends on:** D-092 (editable canvas mutations), D-108 (Supabase persistence), D-112 (editing architecture).
**Not in scope (yet):** Real-time collaborative editing (CRDT/OT), undo/redo stack across views, form ↔ scaffold diff preview.

## D-117: Phase 2 Status — Session 25 Checkpoint
**Date:** 2026-03-12
**Status:** Progress note

**Completed this session:**
- Conflict detection UI (`ConflictBanner.tsx`) — amber banner with Reload / Overwrite options, auto-save pauses during unresolved conflicts (commit `612b178`)
- Placeholder cleanup — Puretec → Acme Corp in DiscoveryIntake (committed with conflict UI)
- Round-trip navigation — Discovery tab added to header mode switch; breadcrumb shows scaffold name when editing; intake form accessible from any view (uncommitted, in progress)

**Blocked / deferred:**
- Conflict testing — cannot simulate revision clash without two browser tabs on the same project. Currently no way to load a scaffold from a Supabase project in a second tab (discovery is the only scaffold entry point). Will be testable once project-load round-trip is working or after sharing is implemented.
- Round-trip form editing — safe to navigate back, but regenerating from the form would overwrite canvas edits. Requires D-116 (single repository) to fix properly. The Discovery tab is wired up but should show a warning until D-116 is implemented.

**Remaining Phase 2 items (priority order):**
1. D-116 implementation — single repository refactor (form state → store)
2. Project sharing — invite by email using `project_access` table
3. Module-specific panel visibility — show/hide UI sections based on selected module
4. Vercel deployment — env vars, edge function, production build
