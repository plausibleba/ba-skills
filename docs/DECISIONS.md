# VCC Decision Log

Maintained across sessions. Each decision records context, options considered, and rationale.

---

## D-001: Stage Card Cognitive Hierarchy
**Date:** 2026-02-22  
**Context:** Reviewer defined five-layer visual hierarchy for stage cards  
**Decision:** Layer order: Activity Name → Capability → Role → Metric → Control  
**Rationale:** Matches how practitioners read value stream structure — what happens first, then what enables it, who does it, how it's measured, what governs it.

## D-002: CanvasView Component Extraction
**Date:** 2026-02-22  
**Context:** CanvasView monolith grew to 800+ lines  
**Decision:** Extract into 12 focused components in canvas/ subfolder  
**Rationale:** Separation of concerns. Each component owns one pane or one layer of the stage card.

## D-003: Network View as Default Landing
**Date:** 2026-02-23  
**Context:** Multi-VS scaffolds need an entry point above stage level  
**Decision:** Multi-VS scaffolds land on Network View. Single-VS scaffolds skip to Stage View.  
**Rationale:** Positions tool as enterprise-level. Board-facing first impression should be strategic, not operational.

## D-004: Left-to-Right DAG Layout (Not Force-Directed)
**Date:** 2026-02-23  
**Context:** Network View layout algorithm selection  
**Decision:** Layered DAG with longest-path layer assignment, left-to-right rendering  
**Rationale:** Banking processes are directional. Visual metaphor should reflect economic progression. Force-directed layouts lose directionality and feel chaotic.

## D-005: DFS Back-Edge Detection for Cycle Breaking
**Date:** 2026-02-24  
**Context:** Kahn's topological sort failed on graphs with cycles — only sorted 1 of 7 nodes  
**Decision:** Replace with DFS WHITE/GRAY/BLACK coloring to identify minimal back-edge set  
**Rationale:** DFS correctly identifies just the cycle-causing edge(s) while preserving all forward edges. Kahn's marks all edges as feedback when cycles exist.

## D-006: Feedback Triggers at VS Level
**Date:** 2026-02-24  
**Context:** Reviewer concern: alternatePreOutcomeIds on activities conflates operational flow with governance recalibration  
**Decision:** Introduce secondaryTriggerOutcomeIds on ScaffoldValueStream. Remove alternatePreOutcomeIds from ScaffoldActivity.  
**Rationale:** Operational entry (new exposure arriving) and governance trigger (policy update) are semantically different. Activity preOutcomeId stays clean and unambiguous. Edge derivation uses both primary and secondary triggers.

## D-007: Network Derivation Before Validation
**Date:** 2026-02-24  
**Context:** Blank screen when loading enterprise scaffold because validation failed before network topology was derived  
**Decision:** Derive network topology immediately after scaffold resolution, before validation. Validation runs in background (non-blocking for network view).  
**Rationale:** Network view is purely structural — it doesn't need validation to render. Validation gates stage-level canvas generation, not topology display.

## D-008: Client-Side Canvas Generation for Drill-Through
**Date:** 2026-02-24  
**Context:** generateCanvasForVs called backend /v1/canvas/generate which wasn't running  
**Decision:** Build CanvasViewModel client-side from scaffold data  
**Rationale:** Each activity becomes a column with aggregated metadata. No backend dependency for basic stage view rendering. Backend validation can run asynchronously.

## D-009: Scaffold Integrity Enforcement on Heatmap Load
**Date:** 2026-02-24  
**Context:** Loading standalone heatmap against enterprise scaffold showed generic "Invalid"  
**Decision:** Check scaffoldId match and VS existence before loading. Show precise mismatch message instead of generic error.  
**Rationale:** "Heatmap scaffold mismatch" is honest, board-safe, and makes the tool feel rigorous. No silent fallback, no partial binding.

## D-010: Enterprise Stub Banner
**Date:** 2026-02-24  
**Context:** Drill-through from enterprise network to simplified 4-stage stubs felt like bait-and-switch  
**Decision:** Show info banner when viewing a stub VS in an enterprise scaffold  
**Rationale:** Avoids perception of hidden loss of detail. Neutral tone, not warning. Directs user to standalone scaffold for full diagnostics.

## D-011: Visual Encoding Hierarchy for Network Nodes
**Date:** 2026-02-24  
**Context:** Reviewer specified exact visual priority order for network view  
**Decision:** 1. Position → 2. Title → 3. Edge direction → 4. Binding border → 5. Friction tint → 6. Small heat badge  
**Rationale:** If friction becomes visually louder than structure, the strategic view is broken. Nodes first, edges second, health indicators third.

## D-012: Edge Visual Hierarchy
**Date:** 2026-02-24  
**Context:** Reviewer requested semantic differentiation of edge types  
**Decision:** Backbone edges: strokeWidth 2.5, opacity 65%, solid. Branch edges: strokeWidth 1.5, opacity 50%, solid. Feedback edges: strokeWidth 1.5, opacity 40%, dashed.  
**Rationale:** Creates visual hierarchy that matches structural importance.

## D-013: IR is Transient, Not Canonical
**Date:** 2026-02-24  
**Context:** Addendum A introduces Intermediate Representation for engagement automation  
**Decision:** IR is a provisional staging model. It is not a durable artefact. Only reconciled IR elements become canonical.  
**Rationale:** Prevents IR from becoming an ontology rabbit hole. The canonical scaffold is the durable artefact. The IR is the workspace.

## D-014: LLMs Propose, Humans Dispose
**Date:** 2026-02-24  
**Context:** Constitutional principle for engagement automation layer  
**Decision:** No LLM output directly creates canonical artefacts. All derived elements require human reconciliation.  
**Rationale:** Deterministic canonical core. Agent non-determinism stays upstream of the generation boundary.

## D-015: Track A First, Single Agent Only
**Date:** 2026-02-24  
**Context:** Sequencing decision for IIBA proving ground  
**Decision:** Build spreadsheet ingest (Track A) and deterministic generator first. Add single Friction Signal Agent only after pipeline is proven. No multi-agent chain in v1.  
**Rationale:** Mature sequencing. Prove ingest → IR → scaffold → validation before introducing LLM variability.

## D-016: Scoped Enterprise Enrichment (Option 2)
**Date:** 2026-02-24  
**Context:** Enterprise scaffold VS stubs vs. full detail  
**Decision:** Keep enterprise scaffold as topology backbone. Fully enrich 1-2 exemplar streams (Credit Risk Assessment + Regulatory Reporting). Rest remain stubs.  
**Rationale:** Avoids bait-and-switch on drill-through. Enables high-quality demo on key streams. Defers complex bundle architecture.

## D-017: Metrics in Structure Pane, Not Analytics
**Date:** 2026-02-24
**Context:** Metrics were gated behind heatmap loading in an analytics pane
**Decision:** Move metrics into Structure pane alongside entry/exit states. Always visible when Structure is open.
**Rationale:** Metrics measure state transitions. They belong with the structural description of the stage, not behind a conditional gate.

## D-018: TransformationPane for Future Artefacts
**Date:** 2026-02-24
**Context:** AnalyticsPane renamed and repurposed
**Decision:** Rename to TransformationPane. Reserve for painpoints, ideas, requirements, acceptance criteria, epics, initiatives. Currently shows friction observations only.
**Rationale:** Clear semantic boundary between structure (what is) and transformation (what should change).

## D-019: Atomic Verb-Object Activities
**Date:** 2026-02-24
**Context:** Reviewer flagged "Process" layer as narrative restating capability descriptions
**Decision:** Replace single process description string with array of 3-6 atomic activity statements. Each follows Verb + Object (6-12 words max). No conjunctions.
**Rationale:** Activities must be measurable, ownable, and capable of failure. Narrative descriptions can't anchor friction, metrics, or automation. Short activities give leverage.

## D-020: Capability-Level PPIT (Not Stage-Inherited)
**Date:** 2026-02-24
**Context:** Roles were inherited from stage level to all capabilities uniformly
**Decision:** Each capability instance gets specific PPIT assignments (roles, activities, info, tech) via capabilityPPIT map on each activity.
**Rationale:** "Marketing Team" owns "Member Marketing" but not "Billing & Collections" — even if both appear in the same stage. Stage-level inheritance was semantically incorrect.

## D-021: Scaffold Selector on Network View
**Date:** 2026-02-24
**Context:** Scaffold selector occupied space in Stage View content bar
**Decision:** Move scaffold selector to Network View. Replace with VS dropdown in Stage View.
**Rationale:** Scaffold is selected once at the enterprise level. VS switching happens within a scaffold. Different scopes, different locations.

## D-022: Info Icon Tooltips Over Inline Descriptions
**Date:** 2026-02-24
**Context:** Stage and capability descriptions need to be accessible but not visually dominant
**Decision:** Small ⓘ icon with hover tooltip. Stage: centred below icon. Capability: card-width, direction-aware (down for first, up for others).
**Rationale:** Progressive disclosure. Descriptions are validation aids, not primary reading material. They should be available on demand, not competing for attention.
