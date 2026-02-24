# VCC Architecture

Last updated: 2026-02-24

---

## What This Is

The **Value Cognition Canvas (VCC)** is a board-level governance instrument for organisational value stream analysis. It enables stakeholders to visualise, validate, and analyse how value flows through an organisation — from strategic capability through operational activities to measurable outcomes.

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  XLSX Input   │────▶│   Pipeline   │────▶│  Scaffold JSON   │
│ (BA Model)    │     │ XLSX→IR→Scaf │     │  (canonical)     │
└──────────────┘     └──────────────┘     └────────┬─────────┘
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

## Two-Tier Architecture

### 1. Pipeline (`/pipeline/`)

Transforms raw business analysis models into canonical scaffold JSON.

```
XLSX → parse_xlsx.py → IR (intermediate) → generate_scaffold.py → scaffold.json
                                                    │
                                          ppit_assignments.py
                                          (capability-level PPIT)
```

**Key files:**
- `src/parse_xlsx.py` — Parses BA model spreadsheet into IR dataclasses
- `src/ir_types.py` — IR dataclass definitions (IRValueStream, IRActivity, etc.)
- `src/generate_scaffold.py` — IR → canonical scaffold with cross-stream outcomes and PPIT enrichment
- `src/ppit_assignments.py` — 70 capability-level People/Activities/Information/Technology assignments
- `outputs/iiba_scaffold.json` — Generated scaffold (6 VS, 28 stages, 70 capabilities)

### 2. Frontend (`/frontend/`)

React + Vite + Tailwind single-page application. No backend dependency.

**Entry flow:**
1. User loads scaffold JSON via FileLoader
2. Store derives network topology (edges, layers, zones)
3. Network View renders enterprise DAG
4. User clicks VS node → store generates CanvasViewModel → Stage View renders

---

## Data Model

### Scaffold JSON (canonical artefact)

```
scaffold
├── scaffoldId, name, description
├── elements
│   ├── valueStreams     { id → { name, description, activityIds, layoutZone } }
│   ├── activities       { id → { name, description, preOutcomeId, postOutcomeId,
│   │                             requiresCapabilityIds, performedByRoleIds,
│   │                             metricIds, controlIds, capabilityPPIT } }
│   ├── capabilities     { id → { name, description } }
│   ├── roles            { id → { name } }
│   ├── outcomes         { id → { name, status } }
│   ├── metrics          { id → { name } }
│   ├── controls         { id → { name } }
│   ├── informationObjects  { id → { name, type } }
│   └── technologyApps      { id → { name, type } }
├── crossStreamOutcomes  [ { fromVsId, toVsId, outcomeId, direction } ]
└── scaffoldIntegrityHash
```

### capabilityPPIT (per-activity, per-capability)

```
activity.capabilityPPIT = {
  "cap-xxx": {
    roleIds: ["role-a", "role-b"],           // People — specific to this capability in this stage
    activities: [                             // Activities — atomic verb-object statements
      "Validate applicant eligibility",
      "Process membership payment",
      "Send activation confirmation"
    ],
    informationObjectIds: ["info-a", ...],   // Information — data consumed/produced
    technologyAppIds: ["tech-a", ...]        // Technology — systems used
  }
}
```

### Heatmap JSON (assessment overlay)

```
heatmap
├── heatmapId, scaffoldId, valueStreamId
├── observations [ { activityId, frictionType, severity, description } ]
└── bindingConstraint { bindingAnchor, throughputImpact }
```

---

## Frontend Component Tree

```
App.tsx
├── Header (mode switch: Network/Stage, breadcrumb with scaffold name)
├── FileLoader.tsx (scaffold JSON drop zone)
├── ContentSelectors.tsx (VS dropdown + assessment loader) [stage view only]
├── NetworkView.tsx
│   ├── Scaffold selector
│   ├── Two-layer DAG (Ecosystem / Knowledge zones)
│   ├── NetworkEdge (solid/dashed, backbone/branch/feedback)
│   └── NetworkNode (click → selectVs → Stage View)
└── CanvasView.tsx
    ├── VS header (name, description in shaded box, accountable stakeholder)
    ├── CanvasToolbar.tsx
    │   ├── Structure / Transformation toggles
    │   └── PPIT layer toggles (Roles, Activities, Info, Tech)
    ├── StageColumn.tsx (per-stage column, height-equalised)
    │   ├── Stage header (name, info icon with tooltip, binding badge)
    │   ├── StructurePane.tsx (entry/exit states, metrics)
    │   ├── StageCard.tsx
    │   │   └── CapabilityBlock.tsx (per-capability)
    │   │       ├── Name + info icon tooltip
    │   │       ├── Badge counts (R2 A5 I3 T3)
    │   │       └── PPIT expansion (activities as stacked items, chips for R/I/T)
    │   └── TransformationPane.tsx (friction observations, future: painpoints/ideas)
    └── FrictionPanel.tsx (side panel for selected friction observation)
```

### State Management

**Zustand store** (`store/canvas-store.ts`):
- `scaffoldData` — loaded scaffold
- `viewMode` — "network" | "stage"
- `selectedVsId` — current VS for stage view
- `canvasViewModel` — derived stage columns with aggregated metadata
- `heatmapData` — loaded heatmap overlay
- `heatmapsByVs` — VS-keyed heatmap map for enterprise scaffolds
- `validationReport` — scaffold validation results
- `networkTopology` — derived { nodes, edges }

**Network derivation** (`store/network-derivation.ts`):
- Edge derivation from outcome chains + cross-stream contracts
- DFS cycle detection with back-edge removal
- Longest-path DAG layer assignment
- Two-layer zone layout (Ecosystem row 0, Knowledge row 1)

---

## Visual Encoding Rules

### Network View
| Element | Encoding |
|---------|----------|
| Node position | DAG layer assignment (left-to-right flow) |
| Node label | VS name (primary), stage count (secondary) |
| Edge solid | Backbone or branch flow |
| Edge dashed | Feedback loop |
| Stroke width | Uniform (no thickness variation) |
| Binding border | Red ring on constrained node |
| Friction tint | Amber background intensity |
| Zone | Labelled horizontal band (Ecosystem / Knowledge) |

### Stage View
| Element | Encoding |
|---------|----------|
| Column | One per stage, height-equalised via flex-stretch |
| Dark header | Stage name + info icon |
| Structure pane | Entry/exit states (line-clamp-2, hover for full text), metrics as badges |
| Capability block | White card with name, info icon, PPIT badge counts |
| PPIT layers | Toggleable: Roles (blue), Activities (violet), Info (amber), Tech (emerald) |
| Activities | Stacked bullet items (primary visual weight when toggled) |
| Roles/Info/Tech | Wrapped badge chips (secondary) |
| Transformation pane | Friction observations + controls |
| Binding indicator | Red header + "▲ Binding" badge |

### Colour System
| Colour | Meaning |
|--------|---------|
| `vcc-700` / `vcc-900` | Primary brand (slate-blue headers, nav) |
| Blue (`blue-50/600`) | People/Roles |
| Violet (`violet-50/600`) | Activities/Process |
| Amber (`amber-50/700`) | Information objects |
| Emerald (`emerald-50/600`) | Technology |
| Red | Binding constraint, critical friction |
| Gray | Neutral structure, disabled states |

---

## Pipeline Architecture

### IR (Intermediate Representation)

Transient staging model. **Not a durable artefact.** IR elements become canonical only after scaffold generation.

```python
@dataclass
class IRValueStream:
    name: str
    description: str
    activities: list[IRActivity]
    layout_zone: str  # "ecosystem" | "knowledge"

@dataclass
class IRActivity:
    name: str
    description: str
    capabilities: list[str]
    roles: list[str]
    metrics: list[str]
    controls: list[str]
    pre_outcome: str
    post_outcome: str
```

### Scaffold Generation Steps
1. Parse XLSX → IR dataclasses
2. Generate canonical IDs (`canonical_id(prefix, name)`)
3. Deduplicate shared elements (capabilities, roles, metrics across VS)
4. Build scaffold JSON with element registry
5. Add cross-stream outcome contracts
6. Enrich with PPIT assignments (per-capability roles, activities, info, tech)
7. Compute integrity hash

### PPIT Assignment Rules
- **Activities** follow Verb + Object pattern (6-12 words max)
- No conjunctions ("and"), no composite logic
- Each activity is measurable, ownable, and can fail
- 3-6 activities per capability
- Roles are capability-specific (not inherited from stage)
- 233 total activities across 70 capabilities

---

## Current Scaffold Stats (IIBA Operating Model)

| Element | Count |
|---------|-------|
| Value Streams | 6 |
| Stages (activities) | 28 |
| Capabilities | 70 (with PPIT) |
| Roles | 64 |
| Metrics | ~30 |
| Information Objects | 200 |
| Technology Apps | 61 |
| Atomic Activities | 233 |
| Cross-stream outcomes | 12 |

---

## Key Design Principles

1. **Board-appropriate** — Every visual choice must work at executive level
2. **Progressive disclosure** — Structure/Transformation panes, PPIT layer toggles
3. **Ontological clarity** — Capability ≠ Activity ≠ Process. Separate layers, separate semantics
4. **Visual hierarchy** — Position first, then labels, then indicators. Never let metadata outshout structure
5. **Uniform encoding** — Consistent stroke widths, colour meanings, badge patterns
6. **LLMs propose, humans dispose** — No AI output directly creates canonical artefacts
7. **IR is transient** — Only reconciled elements become canonical
