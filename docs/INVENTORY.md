# Component Inventory

Last updated: 2026-03-22

---

## Frontend (`/frontend/src/`)

### Core
| File | Purpose | Key Props/State |
|------|---------|-----------------|
| `App.tsx` | Root. Mode switch, breadcrumb, claim token consumption, tier init | `viewMode`, `scaffoldData`, `selectedVsId`, `claimImporting` |
| `main.tsx` | ReactDOM entry point | — |
| `index.css` | Tailwind imports + custom VCC colours | — |
| `types.ts` | All TypeScript interfaces (ScaffoldData, HeatmapData, etc.) | — |
| `vite-env.d.ts` | Vite type declarations | — |

### Store (`store/`)
| File | Purpose |
|------|---------|
| `canvas-store.ts` | Zustand store: scaffold loading, network derivation, VS selection, heatmap binding, validation |
| `network-derivation.ts` | Edge derivation, DFS cycle detection, DAG layer assignment, two-layer zone layout |
| `tier-store.ts` | Commercial tier state (Zustand + Supabase sync), `canPerform()` gate logic, usage tracking |
| `project-store.ts` | Project state: selected project, intake tab, scope toggle |
| `vendor-library-store.ts` | Custom vendor libraries and customer story catalogues |
| `discovery-session-store.ts` | Discovery IR persistence across pipeline passes |

### Components — Top Level (`components/`)
| File | Purpose |
|------|---------|
| `LoginPage.tsx` | Supabase auth with claim-aware UI (pre-fill email, contextual banner) |
| `ProjectList.tsx` | Project list with create/discover/import (all tier-gated) |
| `FileLoader.tsx` | Scaffold JSON drag-and-drop loader |
| `ContentSelectors.tsx` | VS dropdown selector + heatmap assessment loader (stage view bar) |
| `NetworkView.tsx` | Enterprise topology: layer schemes, graph view, VS editor modal (tier-gated) |
| `CanvasView.tsx` | Stage-level orchestrator: VS header, toolbar, stage columns (tier-gated) |
| `DiscoveryIntake.tsx` | Freeform/structured discovery with LLM extraction (tier-gated) |
| `FrictionView.tsx` | 5-tab friction workspace: observations, how-it-works, survey, solutions, settings (all tier-gated) |
| `StageWizard.tsx` | 3-step toolbar: scaffold → friction assessment → solutions enrichment (tier-gated) |
| `FrictionPanel.tsx` | Side panel for selected friction observation detail |
| `FrictionOverlay.tsx` | Friction binding/activity resolution helpers |
| `UpsellModal.tsx` | Contextual upgrade prompt when free-tier user hits a gated action |
| `DevTierSwitcher.tsx` | Dev-only floating widget for testing tier behaviour |

### Hooks (`hooks/`)
| File | Purpose |
|------|---------|
| `useGateCheck.ts` | `gate(action, callback, description)` — wraps actions with tier check |
| `useModuleFeatures.ts` | Feature flags for progressive module rollout |

### Utils (`utils/`)
| File | Purpose |
|------|---------|
| `bundle-claim.ts` | Client-side claim token lifecycle: extract, stash, fetch, consume |

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
| `InlineEdit.tsx` | Double-click-to-edit component — tier-gated (gates all edit pencils app-wide) |
| `ppit.ts` | PPIT type definitions and layer labels |
| `useCanvasControls.ts` | Hook for pane/layer toggle state (defaults: structure=open, transformation=open, all PPIT=off) |

### Fixtures (`fixtures/`)
| Directory | Contents |
|-----------|----------|
| `enterprise-banking/` | 7 VS scaffold + 2 heatmaps (CRA, RR) |
| `iiba/` | 6 VS IIBA scaffold with PPIT-enriched capabilities |
| `vendor-libraries/` | Salesforce Agentforce + SAP S/4HANA feature libraries, customer stories |
| `Puretec/` | Puretec Water Filtration bundles (L4, v6) |
| `TradieBot/` | TradieBot solo tradie bundles, vendor library, customer stories |
| `Buildcraft/` | Buildcraft construction bundles |

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
| `v0.3.0` | Lead capture, module gating, editable canvas |
| `v0.4.0` | First-time UX, Network View overhaul, layer schemes |
| *(untagged)* | v0.5.0 DRAFT: Canvas→VCC handoff, commercial tier system, gate wiring |
