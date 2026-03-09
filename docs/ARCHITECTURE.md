# VCC Architecture

Last updated: 2026-03-09 (Session 16)

---

## What This Is

The **Value Cognition Canvas (VCC)** is a board-level governance instrument for organisational value stream analysis. It enables stakeholders to visualise, validate, and analyse how value flows through an organisation — from strategic capability through operational activities to measurable outcomes.

VCC is the first working instantiation of the CAPSICUM ontology (3×3 matrix: Domain/Behaviour/Governance × People/Process/Information). The trajectory: model construction → diagnostics → interpretation → executability → digital twin.

## System Overview

```
┌──────────────────┐       ┌──────────────────┐
│  Discovery Intake │──────▶│  LLM Pipeline     │
│  (paste/form)     │       │  (3-pass + gates) │
└──────────────────┘       └────────┬─────────┘
                                     │
┌──────────────┐            ┌────────▼─────────┐
│  XLSX Input   │───────────▶│  Scaffold JSON   │
│ (BA Model)    │  (legacy)  │  (canonical)     │
└──────────────┘            └────────┬─────────┘
                                     │
                           ┌─────────▼─────────┐
                           │   Frontend App     │
                           │                    │
                           │  ┌──────────────┐  │
                           │  │ Network View  │  │
                           │  │ (enterprise)  │  │
                           │  └──────┬───────┘  │
                           │         │drill     │
                           │  ┌──────▼───────┐  │
                           │  │  Stage View   │  │
                           │  │ (per VS)      │  │
                           │  └──────────────┘  │
                           └───────────────────┘
```

## Two Entry Paths

### 1. Discovery Intake (primary — presales/consulting)

Paste transcript or fill structured form → LLM extraction → confirm → generate scaffold.

### 2. File Loader (secondary — existing bundles)

Load a saved VCC bundle (scaffold + heatmaps) from JSON file.

---

## Three-Pass LLM Pipeline (D-065)

The canonical pipeline architecture, established by GPT design spar (Session 13):

```
Pass A — Discovery IR
  ├── 1a: VS + Stages (board-level extraction)
  └── 1b: Roles + Capabilities + Pain Points
  Output: DiscoveryIR artefact

Pass B — Formalised Scaffold
  ├── B1: Outcomes + Activities (FSM chain)
  │   └── Gate 1 — validator invoked (one bounded auto-repair retry)
  └── B2: Controls + Metrics + Conditions + Assembly
  Output: Sealed ScaffoldModel

Pass C — Friction Heatmap
  └── Observations + Binding Constraint (null allowed per D-067)
  Output: HeatmapVNext
```

**Key constraints:**
- temperature: 0 enforced at proxy level for Passes B and C (D-069)
- Each artefact is recoverable if next pass fails
- Gate 1 is architecturally terminal — one auto-repair retry, then surface errors (D-066)
- Null binding constraint is a valid diagnostic output with three UI states (D-067)

**Current implementation:** DiscoveryIntake.tsx implements Passes 1–3 inline. Pass 4 (friction) stashed on `scaffold._discoveryPainPoints`. Full 3-pass refactor with module separation pending.

---

## Legacy Pipeline (`/packages/pipeline/`)

Python pipeline for XLSX → IR → scaffold transformation. Used for pre-built fixtures (IIBA, etc.).

```
XLSX → parse_xlsx.py → IR (intermediate) → generate_scaffold.py → scaffold.json
```

---

## Data Model

### Scaffold JSON (canonical artefact)

Supports both v4 and v5 formats:

```
scaffold
├── scaffoldId, name, description, schemaVersion
├── elements
│   ├── valueStreams     { id → { name, description,
│   │                             activityIds (v4) OR activityChainHead (v5),
│   │                             layoutZone (v4) / zone (v5) } }
│   ├── activities       { id → { name, preOutcomeId, postOutcomeId,
│   │                             nextActivityId (v5),
│   │                             requiresCapabilityIds (v4) / enabledByCapabilityIds (v5),
│   │                             performedByRoleIds, metricIds, controlIds,
│   │                             capabilityPPIT (v4, per-capability PPIT),
│   │                             applicationFunctionIds?, primaryRecordClassId?,
│   │                             compositeActivityId? } }
│   ├── capabilities     { id → { name, description } }
│   ├── roles            { id → { name } }
│   ├── outcomes         { id → { name, status } }
│   ├── metrics          { id → { name } }
│   ├── controls         { id → { name } }
│   ├── applicationFunctions  { id → { name, applicationId } }
│   ├── recordClasses    { id → { name } }
│   └── ... (constraints, directives, deonticLogic, flowLogic, concepts, properties, measures, conditions)
└── modelIntegrityHash
```

### Heatmap — Three Conceptual Layers (D-050)

```
heatmap
├── heatmapId, scaffoldId, valueStreamId (required, per-VS)
├── Diagnostic: observations [ { observationId, category, evidenceBasis,
│                                primaryAnchor, contributingAnchors,
│                                intensity: {scale, score}, rationale } ]
├── Interpretive: bindingConstraint { bindingAnchor, constraintScoring,
│                                     confidence, justification }
└── Intervention: solutions [ { vendorFeatureRef, rationale, customerStoryIds } ]
```

### Derived Artefacts (computed, never authored)

- **CapabilityInstance** — identity: `capabilityId + valueStreamId + activityId`. Computed on scaffold load (D-051).
- **TopologyView** — deterministic DAG from sealed scaffold using six coupling signals: outcome-chain, shared roles, shared controls, shared applicationFunctions, shared recordClass, capability co-deployment (D-052).

---

## Frontend Component Tree

```
App.tsx
├── Header (mode switch: Network/Stage)
├── FileLoader.tsx (bundle JSON drop zone)
├── DiscoveryIntake.tsx (paste transcript → extraction → generation)
├── NetworkView.tsx
│   ├── Two-layer DAG (Ecosystem / Knowledge zones)
│   ├── Topology coupling counts (from TopologyView)
│   └── NetworkNode (click → selectVs → Stage View)
└── CanvasView.tsx
    ├── StageWizard.tsx (3-step toolbar: Scaffold → Friction → Solutions)
    ├── VS header (name, description, stakeholder)
    ├── CanvasToolbar.tsx (Structure/Transformation toggles, PPIT layers)
    ├── StageColumn.tsx (per-stage column)
    │   ├── StructurePane.tsx (entry/exit states, metrics)
    │   ├── StageCard.tsx
    │   │   └── CapabilityBlock.tsx (per-capability, humanizeId fallback)
    │   └── TransformationPane.tsx (friction, user stories, controls)
    ├── FrictionPanel.tsx (side panel for selected observation)
    └── UserGuidePanel.tsx (contextual guidance, fixed bottom-left)
```

### State Management

**Zustand store** (`store/canvas-store.ts`):
- `scaffoldData` — loaded scaffold
- `viewMode` — "network" | "stage"
- `selectedVsId` — current VS for stage view
- `canvasViewModel` — derived stage columns
- `heatmapData` — loaded heatmap overlay
- `heatmapsByVs` — VS-keyed heatmap map
- `capabilityInstanceView` — derived CapabilityInstance set
- `topologyView` — derived topology DAG
- `userStoriesByActivity` — transformation user stories (in-memory)

**Network derivation** (`store/network-derivation.ts`):
- Edge derivation from outcome chains + cross-stream contracts
- `resolveActivityIds()` — handles v4 `activityIds[]` and v5 chain walk
- DFS cycle detection, longest-path DAG layer assignment
- Two-layer zone layout (Ecosystem/Knowledge)
- `deriveCapabilityInstances()`, `deriveTopologyView()` — pure functions

### Utility Library

- `lib/humanize-id.ts` — `humanizeId()`: strips type prefix, converts snake_case/kebab-case to Title Case for display fallback (D-084)

---

## Visual Encoding Rules

### Network View
| Element | Encoding |
|---------|----------|
| Node position | DAG layer assignment (left-to-right flow) |
| Node label | VS name (primary), stage count + coupling count (secondary) |
| Edge solid/dashed | Backbone vs feedback |
| Binding border | Red ring on constrained node |
| Friction tint | Amber background intensity |
| Zone | Labelled horizontal band (Ecosystem / Knowledge) |

### Stage View
| Element | Encoding |
|---------|----------|
| Column | One per stage, flex-stretch height-equalised |
| Capability block | White card with name (humanized fallback), PPIT badge counts |
| PPIT layers | Roles (blue), Activities (violet), Info (amber), Tech (emerald) |
| Binding indicator | Red header + "▲ Binding Constraint" banner |
| Transformation pane | Friction observations + user story generation |

---

## Key Design Principles

1. **Board-appropriate** — Every visual choice must work at executive level
2. **Progressive disclosure** — Structure/Transformation panes, PPIT layer toggles
3. **Ontological clarity** — Capability ≠ Activity ≠ Process. Separate layers, separate semantics
4. **Governance is constitutive** — Not overlay. No state transition without Entitlements, Conditions, and Terms
5. **Structural before interpretive** — Scaffold must validate before friction assessment runs
6. **LLMs propose, humans dispose** — No AI output directly creates canonical artefacts
7. **IR is transient** — Only reconciled elements become canonical
8. **Friction is diagnostic** — Not a first-class ontological object; an observation about alignment health (D-048)
