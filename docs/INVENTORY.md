# Component Inventory

Last updated: 2026-02-24

---

## Frontend (`/frontend/src/`)

### Core
| File | Purpose | Key Props/State |
|------|---------|-----------------|
| `App.tsx` | Root. Mode switch (Network/Stage), breadcrumb (scaffold name → VS name), error display | `viewMode`, `scaffoldData`, `selectedVsId` |
| `main.tsx` | ReactDOM entry point | — |
| `index.css` | Tailwind imports + custom VCC colours | — |
| `types.ts` | All TypeScript interfaces (ScaffoldData, HeatmapData, etc.) | — |
| `vite-env.d.ts` | Vite type declarations | — |

### Store (`store/`)
| File | Purpose |
|------|---------|
| `canvas-store.ts` | Zustand store: scaffold loading, network derivation, VS selection, heatmap binding, validation |
| `network-derivation.ts` | Edge derivation, DFS cycle detection, DAG layer assignment, two-layer zone layout |

### Components — Top Level (`components/`)
| File | Purpose |
|------|---------|
| `FileLoader.tsx` | Scaffold JSON drag-and-drop loader |
| `ContentSelectors.tsx` | VS dropdown selector + heatmap assessment loader (stage view bar) |
| `NetworkView.tsx` | Enterprise topology: scaffold selector, two-layer DAG, zone containers, friction overlay |
| `CanvasView.tsx` | Stage-level orchestrator: VS header, toolbar, stage columns, friction panel |
| `FrictionPanel.tsx` | Side panel for selected friction observation detail |
| `FrictionOverlay.tsx` | Friction binding/activity resolution helpers |

### Components — Canvas (`components/canvas/`)
| File | Purpose |
|------|---------|
| `StageColumn.tsx` | Column wrapper: dark header with info icon tooltip, structure pane, stage card, transformation pane. Height-equalised via flex-stretch |
| `StageCard.tsx` | Capability list renderer. Passes `isFirst` to CapabilityBlock for tooltip direction |
| `CapabilityBlock.tsx` | Per-capability card: name, info icon tooltip (direction-aware), PPIT badge counts, expandable layers (activities as stacked items, roles/info/tech as chips) |
| `StructurePane.tsx` | Entry/exit state pair (line-clamp-2 with hover title), metrics as wrapped badges. Collapsible |
| `TransformationPane.tsx` | Friction observations + controls. Future: painpoints, ideas, requirements. Collapsible |
| `CanvasToolbar.tsx` | Structure/Transformation toggles + PPIT layer toggles (Roles, Activities, Info, Tech) |
| `FlowChevron.tsx` | SVG chevron arrow between stage columns |
| `ChevronIcon.tsx` | Small toggle chevron for pane headers |
| `ppit.ts` | PPIT type definitions and layer labels |
| `useCanvasControls.ts` | Hook for pane/layer toggle state (defaults: structure=open, transformation=open, all PPIT=off) |

### Fixtures (`fixtures/`)
| Directory | Contents |
|-----------|----------|
| `enterprise-banking/` | 7 VS scaffold + 2 heatmaps (CRA, RR) |
| `iiba/` | 6 VS IIBA scaffold with PPIT-enriched capabilities |

---

## Pipeline (`/pipeline/src/`)

| File | Purpose |
|------|---------|
| `parse_xlsx.py` | XLSX → IR dataclass parser |
| `ir_types.py` | IR dataclass definitions (IRValueStream, IRActivity, etc.) |
| `generate_scaffold.py` | IR → canonical scaffold JSON. Cross-stream outcomes. PPIT enrichment. Integrity hash |
| `ppit_assignments.py` | 70 capability-level PPIT maps (roles, activities, info objects, tech apps) |

### Pipeline Outputs (`/pipeline/outputs/`)
| File | Purpose |
|------|---------|
| `ir.json` | Intermediate representation (transient) |
| `iiba_scaffold.json` | Canonical IIBA scaffold (6 VS, 28 stages, 233 activities) |

---

## Documentation (`/docs/`)

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System overview, data model, component tree, pipeline flow |
| `DESIGN-PRINCIPLES.md` | Reviewer's design rules: ontological separation, visual hierarchy, colour semantics |
| `SESSION-LOG.md` | Chronological record of what was built each session |
| `INVENTORY.md` | This file |
| `DECISIONS.md` | Numbered decision log with context and rationale |
| `HANDOFF.md` | How to onboard a new participant (model or human) |

---

## Git Tags

| Tag | Description |
|-----|-------------|
| `v0.2.0` | Network View + Enterprise Demo complete |
| *(untagged)* | Current: IIBA scaffold with PPIT, stage view refinements, info tooltips |
