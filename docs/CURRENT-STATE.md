# Current State

**Read this first. Every session. One page.**

Last updated: 2026-03-06

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

## Schema Delta — Next Implementation Target

Three new fields on Activity (see SCHEMA_DELTA_Session10.md for full spec):

```typescript
primaryRecordClassId?: string      // RecordClass this Activity transitions
applicationFunctionIds?: string[]  // Application Function substrate references
compositeActivityId?: string       // Mereological parthood — ordered part of composite
```

New top-level registries on ScaffoldData:
- `recordClasses[]` — RecordClass type definitions
- `applicationFunctions[]` — ApplicationFunction controlled identifier set

FrictionHeatmap restructured into three layers:
- `observations[]` — diagnostic (pure friction)
- `interpretations[]` — interpretation (binding constraint, executive narrative)
- `interventions[]` — intervention (solutions, stories, vendor mappings)

New derived artefacts (computed, never authored):
- `CapabilityInstance` — per (capabilityId, valueStreamId, activityId) tuple
- `TopologyView` — deterministic interference mesh with own hash and provenance

---

## What's Next

| Priority | Item |
|----------|------|
| 1 | Schema delta implementation (Activity fields, RecordClass + ApplicationFunction registries) |
| 2 | FrictionHeatmap three-layer restructure (with migration path for existing fixtures) |
| 3 | DiscoveryIntake.tsx fix — bundleSaved gate, temperature: 0, strip scaffold for Pass 4 |
| 4 | PDS update — reflect three phases, pipeline, ontological foundations |
| 5 | CapabilityInstance derivation in network-derivation.ts |
| 6 | TopologyView derivation (extends Network View) |
| 7 | Enhance Ofluv scaffold — applicationFunctionIds, recordClassIds |
| 8 | Jira export button — getAllUserStories() ready, needs CSV download trigger |
| 9 | Customer story filtering by industry/size |
| 10 | Dummy discovery datasets — 2-3 fictitious non-Salesforce demos |

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
