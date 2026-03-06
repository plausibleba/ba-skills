# Current State

**Read this first. Every session. One page.**

Last updated: 2026-03-06 (Session 11)

---

## What We're Building

A **governed operating model reasoning instrument** built on the CAPSICUM ontological framework. The Value Cognition Canvas (VCC) turns a discovery conversation or structured source into a formal operating model — then provides diagnostic, interpretive, and intervention reasoning over it.

Three phases of organisational cognition, one reasoning environment:
1. **Model Construction** — generate or ingest a scaffold (plausible from transcript, or stable from structured source)
2. **Diagnosis / Interpretation** — identify Friction and Opportunity across the operating model; commit binding constraints
3. **Intervention Design** — propose solutions, delegate activities, generate user stories

The canvas is the centre of gravity. Phase 1 produces input to it. Phase 3 derives from it.

---

## Architecture Decisions from Session 10 Design Spar

The following decisions are now locked and will shape the next implementation phase (D-048–D-055 in DECISIONS.md):

| Decision | Summary |
|----------|---------|
| D-048 | Friction/Opportunity are meta-layer diagnostics, not first-class objects |
| D-049 | SBRs belong in Intent/Governance column, not anchored to Activities |
| D-050 | Heatmap splits into three layers: Diagnostic / Interpretation / Intervention |
| D-051 | CapabilityInstance is a derived artefact (capabilityId + valueStreamId + activityId) |
| D-052 | Topology is a derived deterministic artefact with its own hash and provenance |
| D-053 | Activity gains: primaryRecordClassId, applicationFunctionIds, compositeActivityId? |
| D-054 | Composition is mereological parthood — field is compositeActivityId not parentActivityId |
| D-055 | Record only for v1 — Party and Product are implied domain context |

---

## Zoom Levels

| Level | View | Status |
|-------|------|--------|
| Enterprise | Network View — DAG topology of all value streams | **Stable** |
| Stream | Stage View — per-VS stages, capabilities, PPIT layers | **Stable** |
| Friction | Heatmap overlay — observations, binding constraints | **Stable** |
| Solutions | Vendor enrichment — Salesforce Agentforce (47 features) | **Stable** |
| Transformation | SBR cards + user story generation | **Stable** |
| Topology | Derived interference mesh across value streams | **Not yet built** |

---

## What Is Stable

- **Frontend**: React/Vite/Tailwind SPA, deployed on Vercel
- **Discovery Intake**: Paste transcript → four-pass AI pipeline → scaffold + heatmap bundle
- **Stage Wizard**: Three-step toolbar (Scaffold → Assess Friction → Enrich Solutions)
- **User Guide Panel**: Fixed bottom-left, contextually aware, six states
- **Pass 1–4**: VS definition → stage extraction → friction assessment → vendor enrichment
- **TransformationPane**: SBR cards + user story generation via AI, Zustand state
- **Fixtures**: Puretec (presales demo), IIBA (pipeline reference), Enterprise Banking, Ofluv (SAP transformation), Banking Regulation

---

## What Is Experimental / Needs Fixing

- **DiscoveryIntake.tsx**: Pre-Session-9 version in repo — bundleSaved gate still present, temperature: 0 missing (deferred pending design spar, now unblocked)
- **Pass 3 quality**: Observation count varies by transcript richness
- **Pass 4 matching**: Feature-to-friction heuristics are prompt-guided, not rule-based

---

## Schema Delta — Session 11 (Implemented)

Three new fields on Activity — **implemented in Session 11**:

```typescript
applicationFunctionIds?: string[]  // Application Function substrate references
primaryRecordClassId?: string      // RecordClass this Activity transitions
compositeActivityId?: string       // Mereological parthood — ordered part of composite
```

New top-level registries on ScaffoldData — **implemented**:
- `applicationFunctions` — ApplicationFunction controlled identifier set
- `recordClasses` — RecordClass type definitions

FrictionHeatmap three-layer target shape — **types implemented, migration function ready**:
- `diagnosticLayer.observations[]` — pure friction/opportunity analysis
- `interpretiveLayer.bindingConstraint` — human judgement formally committed
- `interventionLayer.interventions[]` — solutions, stories, vendor mappings

New derived artefacts — **types and pure functions implemented in types.ts**:
- `CapabilityInstance` + `deriveCapabilityInstances()` — per (capabilityId, valueStreamId, activityId)
- `TopologyView` + `deriveTopologyView()` — deterministic interference mesh, six coupling signals

Validator extended — **implemented**:
- V-ACTIVITY-04/05/06: ref integrity for new fields
- V-ACTIVITY-09/10: cardinality (Warning/Error based on registry presence)
- V-COMPOSITE-02–06: mereological parthood semantics
- V-HEATMAP-02–04: three-layer cross-reference integrity

**Pending wiring:**
- Move derivation functions from `types.ts` → `network-derivation.ts`
- Wire into `canvas-store.ts` and `NetworkView.tsx`
- Unit tests for new validator rules

---

## What's Next

| Priority | Item |
|----------|------|
| 1 | DiscoveryIntake.tsx fix — bundleSaved gate removal, temperature: 0, Pass 4 scaffold strip |
| 2 | Move derivation functions (`deriveCapabilityInstances`, `deriveTopologyView`) → `network-derivation.ts` |
| 3 | Wire CapabilityInstance + TopologyView into canvas-store and NetworkView |
| 4 | Unit tests for new validator rules (V-ACTIVITY-04–10, V-COMPOSITE-02–06, V-HEATMAP-02–04) |
| 5 | Delete stale artefacts: `/schema/` directory + `ScaffoldModel_schema.json.bak` (D-059) |
| 6 | PDS update — reflect three phases, pipeline, ontological foundations |
| 7 | Enhance Ofluv scaffold — populate applicationFunctionIds, recordClassIds on key activities |
| 8 | Jira export button — getAllUserStories() ready, needs CSV download trigger |
| 9 | Customer story filtering by industry/size |
| 10 | Dummy discovery datasets — 2-3 fictitious non-Salesforce demos for Daniel |

---

## Participants

| Role | Responsibility |
|------|----------------|
| **Terry** | Product Owner. Orchestrator. Owns repo. CAPSICUM author. |
| **GPT** | Solution Architect. Structural critique. Ontological discipline. |
| **Claude** | Dev team. Implementation. Architecture. Pipeline. Documentation. |
| **Daniel** | Field tester. Salesforce pre-sales. Prospect-facing validation. |
| **Henrik** | Transformation use case. Cordial/Volvo SAP rollout. |

---

## Session Start Checklist

Upload at the start of every session:
- [ ] `docs/SESSION-LOG.md`
- [ ] `docs/DECISIONS.md`
- [ ] `docs/CURRENT-STATE.md`

The `/mnt/project/` files are a stale snapshot — treat as background reference only.

---

## Repo Structure

```
/docs         SESSION-LOG, DECISIONS (D-001–D-055), CURRENT-STATE, HANDOFF,
              ARCHITECTURE, WORKFLOW, DESIGN-PRINCIPLES, SPAR_PROTOCOL, ENGAGEMENTS
/prompts      00_GENERATION_GUIDE through 14_VALIDATION_REFERENCE (15-step prompt pack)
/schemas      ScaffoldModel, FrictionHeatmap, CanvasViewModel, ExportBundle,
              ValidationReport JSON schemas
/fixtures     Banking Regulation, Enterprise Banking, IIBA Knowledge Hub,
              Ofluv Industrial Vehicles, Puretec, golden, negative, paired-negative,
              semantic-negative, vendor-libraries
/runs         banking-supervision (full 15-step manual generation run)
/packages
  /frontend   Active React SPA (Vercel deployment)
    src/
      App.tsx, types.ts
      store/    canvas-store, network-derivation, scaffold-resolver, throughput-validator
      components/
        DiscoveryIntake.tsx    ← four-pass pipeline (needs Session 9 fixes)
        StageWizard.tsx        ← three-step wizard (Steps 1/2/3)
        CanvasView.tsx         ← Stage View orchestrator
        NetworkView.tsx        ← Enterprise DAG view
        FrictionPanel.tsx      ← friction detail slide-in
        FrictionOverlay.tsx    ← activity friction mapping
        TransformationPane.tsx ← SBR cards + user story generation
        UserGuidePanel.tsx     ← fixed bottom-left guide
        FileLoader.tsx         ← bundle JSON file picker
      canvas/
        StageCard, StageColumn, CapabilityBlock, StructurePane, CanvasToolbar
    api/claude.ts              ← Vercel serverless proxy to Anthropic API
  /shared     validator, schema-validator, canvas-generator, export-bundle
  /cli        validate, assemble, bundle, init commands
  /pipeline   Python XLSX→IR→scaffold parser (IIBA source)
  /backend    Stub (not deployed — optional persistence layer when needed)
```
