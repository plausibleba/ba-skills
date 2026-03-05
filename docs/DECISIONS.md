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
