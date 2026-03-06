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
