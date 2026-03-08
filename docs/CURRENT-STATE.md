# Current State

**Read this first. Every session. One page.**

Last updated: 2026-03-07 (Session 13 — post GPT spar)

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
- **Fixtures**: Puretec (presales demo), IIBA (pipeline reference), Enterprise Banking, Ofluv (SAP transformation), Banking Regulation, Buildcraft (retail/home improvement, Henrik)

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

**Wired (Session 12):**
- Derivation functions moved from `types.ts` → `network-derivation.ts` ✓
- `canvas-store.ts` derives CapabilityInstanceView + TopologyView on `loadScaffold` ✓
- `NetworkView.tsx` surfaces coupling counts from TopologyView ✓
- `validator-session11.test.ts` in `packages/shared/src/` ✓

**Session 13 fixes:**
- Buildcraft fixture: all field names corrected to canonical schema (D-062) ✓
- Buildcraft heatmaps split per-VS — `valueStreamId` required (D-063) ✓
- `CanvasView.tsx`: `key={selectedActivityId}` on FrictionPanel — stale state fix (D-064) ✓

---

## Pipeline Architecture — Locked (Session 13 GPT Spar)

Three-pass runtime. D-065–D-071 are the governing decisions.

| Pass | Name | Steps | Gate |
|------|------|-------|------|
| A | Discovery IR | 01–04 (two internal calls: VS+stages, roles+caps) | None — generative |
| B1 | Outcomes + Activities | 05–06 | **Gate 1** — mandatory. One bounded auto-repair retry. |
| B2 | Controls + Metrics + Conditions + Assembly | 07–10 | Full scaffold validation |
| C | Friction Heatmap | 11–13 | Full scaffold+heatmap validation |

**Three persisted artefacts:** DiscoveryIR · ScaffoldModel (sealed) · HeatmapVNext — each recoverable if next pass fails.

**Non-negotiable implementation rules (D-065):**
- temperature: 0 at proxy level for B and C passes (D-069)
- Validator invoked between subpasses, not just at end
- Null binding constraint handled as distinct valid state (D-067)
- DiscoveryIR surfaced as light review panel before B (D-068)
- Open in Canvas enabled after valid scaffold, consistent with D-033
- Friction remains on-demand from Stage Wizard, consistent with D-035

---

## What's Next

| Priority | Item |
|----------|------|
| 1 | **Pipeline rewrite** — implement three-pass architecture (D-065). Module structure: `domain/pipeline/{discovery-ir, scaffold-formaliser, scaffold-gates, heatmap-analyser, pipeline-orchestrator}.ts` + `store/discovery-session-store.ts`. Refactor DiscoveryIntake.tsx to thin shell. |
| 2 | Deploy `CanvasView.tsx` FrictionPanel key fix (D-064) |
| 3 | Delete stale artefacts: `/schema/` directory + `ScaffoldModel_schema.json.bak` (D-059) |
| 4 | Add Buildcraft fixtures to `/fixtures` directory in repo |
| 5 | Enhance Ofluv scaffold — populate applicationFunctionIds, recordClassIds on key activities |
| 6 | Jira export button — getAllUserStories() ready, needs CSV download trigger |
| 7 | Customer story filtering by industry/size |

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
