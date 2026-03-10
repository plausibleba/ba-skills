# VCC Architecture

Last updated: 2026-03-10 (Session 21)

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

## Data Architecture — Ontology Without Repository (D-095)

### The Distinction

VCC separates two concerns that are often conflated:

- **Ontology** — the concepts and their relationships (Capability *enables* Activity, Role *performs* Capability, Information Object *flows between* Activities). This is the metamodel.
- **Repository** — a persistent store of element instances with identity, versioning, and multi-user access.

VCC enforces the ontology but deliberately avoids a repository. The scaffold JSON is an ontology-conformant document that lives on the user's machine. This is a product feature, not a shortcut.

### Where the Metamodel Lives Today

The metamodel is implicit in three places:

1. **JSON Schema** (`schemas/ScaffoldModel.schema.json`) — defines the structural contract: what elements exist, what fields they have, which references are valid.
2. **TypeScript types** (`types.ts`) — `ScaffoldActivity`, `ScaffoldData`, etc. — the frontend's compile-time view of the schema. Currently drifting from runtime data shapes (see D-096).
3. **Zustand store** (`canvas-store.ts`) — the runtime instance. When a bundle loads, elements live as flat key-value records: `elements.capabilities["cap_crm"] = { name: "CRM Management" }`.

What's **missing** is a formal relationship graph. The scaffold JSON already *contains* a graph — elements are nodes, ID references (capabilityIds, roleIds, informationObjectIds) are edges — but it's serialised as flat lookups rather than traversable relationships. When you add a capability today, you type a name and create a new record rather than selecting from the existing registry.

### Why No Backend Is a Product Advantage

No backend makes deployment trivially simple: the customer hits a URI and saves their file locally. The JSON bundle is simultaneously the data model spec for an API — a customer could plug it into their own backend. No server infrastructure, no account provisioning, no data residency concerns. This is a genuine competitive advantage for presales and lightweight engagements.

### Data Architecture Trajectory (D-097)

Three evolutionary steps, each independently valuable, each preserving the lightweight deployment model:

**Step 1 — Client-Side Graph Index (no backend)**

When a bundle loads into the store, build an in-memory adjacency index:

```
{
  "cap_crm": {
    usedInActivities: ["act_qualify_lead", "act_manage_account"],
    performedByRoles: ["role_sales_rep"],
    informationObjects: ["io_customer_record"],
    technologyApps: ["tech_salesforce"]
  }
}
```

This enables: capability selector dropdown (pick from existing before creating new), "where is this element used?" traversal, cross-VS element reuse detection. The bundle file format is unchanged. Deployment is unchanged.

**Step 2 — Ontology-as-Schema Validation**

Define the metamodel relationships formally — either as a TypeScript schema or JSON-LD context that ships with the app. On bundle load or scaffold generation, validate conformance: does every capabilityId reference an existing capability? Are relationship cardinalities correct? This catches the data shape drift that currently requires `as any` casts and `@ts-nocheck` workarounds. It also becomes the spec document for customers who want to integrate: "here's the ontology, here's a conformant instance."

**Step 3 — Client-Side Graph Visualisation**

A force-directed or hierarchical graph view of the scaffold using D3-force or vis.js, running entirely in the browser. Click a capability node to see every connected activity, role, and information object. This is effectively a visual query interface over the Step 1 index — no backend required.

**Upgrade Trigger — Multi-User Modelling**

The single-user version runs entirely in the browser with local JSON files. When a customer needs multiple architects working simultaneously, that's the trigger for a thin backend — a document store (e.g., Supabase, S3 with versioning) or a graph database (Neo4j). The ontology schema from Step 2 becomes the API contract. The JSON bundle format doesn't change — it just gets persisted centrally instead of locally. The client-side graph index from Step 1 still works, hydrating from an API instead of a local file.

### Architectural Invariant

The JSON bundle is the portable unit of work. Every evolution of the data architecture must preserve bundle portability — a bundle saved today must load correctly into every future version of the app, whether client-only or backend-connected.

---

## Multi-Lens Canvas Architecture (D-100)

The VCC canvas serves multiple distinct use cases that share a common data substrate but require different views, controls, and cognitive focus. Rather than overloading a single canvas with every concern, the architecture separates the foundational scaffold from use-case-specific projections (lenses).

### Foundational Layer

```
┌─────────────────────────────────────────────┐
│                Network View                  │
│        (enterprise value stream topology)    │
│              ── home page ──                 │
└──────────────────┬──────────────────────────┘
                   │ drill into VS
┌──────────────────▼──────────────────────────┐
│                Stage View                    │
│     (interactive canvas per value stream)    │
│                                              │
│   ┌─────────────────────────────────────┐   │
│   │         Lens Selector               │   │
│   │  [Ops] [Sales] [Transform] [Gov] …  │   │
│   └─────────────────────────────────────┘   │
│                                              │
│   Scaffold + PPIT + lens-specific panels    │
└─────────────────────────────────────────────┘
```

Network View and Stage View are the scaffold building surface. All structural editing (D-092, D-093, D-094) happens here regardless of active lens.

### Use-Case Lenses

Each lens is a projection of the CAPSICUM 3×3 matrix, emphasising different rows and columns:

| Lens | Primary Focus | Matrix Emphasis | Key Components |
|------|--------------|-----------------|----------------|
| **Operational Productivity** | Friction, bottlenecks, binding constraints | Process row, Governance column | FrictionPanel, heatmap overlay, binding indicators |
| **Sales Discovery** | Solutions, customer evidence, pain points | People row (as customers), Information row | Customer stories, solution panels, story filtering |
| **Transformation** | Strategic requirements, user stories, initiatives | Full matrix at Plan level | Requirements, user story generation, initiative tracking |
| **Authority Governance** | Entitlements, deontic evaluation, GSM kernel | Governance column (all rows) | 3×3 grid, decision table, kernel status, escalation |
| **Agentic Mesh MVC** | Concept cards, policy cards, context compilation | Information row, Governance column | CardPanel, C/P toggles, card badges |

Each lens defines its own toolbar surface, panel components, and simulation semantics. The store is shared; the view layer filters what's visible.

### Simulation Layer

Simulations cut across all lenses but mean different things in each context:
- **Ops Productivity**: walk the activity chain, show bottleneck accumulation
- **Authority Governance**: full GSM kernel evaluation with decision tables and escalation triggers
- **Sales Discovery**: trace customer journey through stages, map pain points to evidence

The simulation engine is the State Transition Quartet (Responsibility → Interaction → Activity → Outcome). The presentation varies per lens.

---

## Class Inspector Pattern (D-101)

Every scaffold element is an instance of a typed Class. Clicking any element opens a **Class Inspector** — a typed overlay panel whose layout and content are determined by the element's Class.

### Pattern

```
User clicks element → resolve Class → load metamodel → assemble contextual view
                                                              │
                                              ┌───────────────┤
                                              │ Where used    │
                                              │ Linked data   │
                                              │ Diagnostics   │
                                              │ Measures      │
                                              │ Charts/widgets│
                                              └───────────────┘
```

Each Class has a metamodel defining which properties, relationships, and measures are relevant. Content is progressively enriched as data sources mature:

- **Capability** — where-used, performing roles, maturity, friction, requirements, user stories, card anchors
- **Role** — entitlements, activities performed, qualification conditions, interaction patterns
- **Activity** — pre/post conditions, decision table rows, participating roles, capabilities, friction
- **Outcome** — defining properties (Terms), reachability, lifecycle position
- **Control** — authority source, condition logic, linked activities, policy card reference

Existing panels (FrictionPanel, CardPanel) become specialised Class Inspector instances.

---

## Key Design Principles

1. **Board-appropriate** — Every visual choice must work at executive level
2. **Progressive disclosure** — Structure/Transformation panes, PPIT layer toggles, lens selection
3. **Ontological clarity** — Capability ≠ Activity ≠ Process. Separate layers, separate semantics
4. **Governance is constitutive** — Not overlay. No state transition without Entitlements, Conditions, and Terms
5. **Structural before interpretive** — Scaffold must validate before friction assessment runs
6. **LLMs propose, humans dispose** — No AI output directly creates canonical artefacts
7. **IR is transient** — Only reconciled elements become canonical
8. **Friction is diagnostic** — Not a first-class ontological object; an observation about alignment health (D-048)
9. **Ontology without repository** — Enforce the metamodel without requiring a persistent backend. The JSON bundle is the portable unit of work (D-095)
10. **Lenses, not overload** — Each use case gets the minimum interface it needs. The scaffold is the shared substrate; projections are independent (D-100)
11. **Typed inspection** — Every element Class has a metamodel. Clicking an element shows its complete contextual perspective, typed to its Class (D-101)
