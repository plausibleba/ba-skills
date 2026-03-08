# Current State — VCC Frontend

_Last updated: 2026-03-08 — Session 14_

---

## Deployment

| Environment | URL |
|-------------|-----|
| Production alias | https://frontend-five-eta-l0j2mk66gi.vercel.app |
| Deploy command | `cd packages/frontend && vercel --prod` |

---

## What Works (as of this session)

### End-to-end v5 bundle loading ✅

All five Water Filtration Company value streams load and render correctly in both Network View and Stage View:

| Value Stream | Stages | Friction | Binding Constraint |
|---|---|---|---|
| Partner Channel Development | 5 | 1 obs | — |
| Product Sales Lifecycle | 6 | 3 obs | — |
| Technology Integration Delivery | 6 | 2 obs | Develop Integrations (87%) |
| Maintenance Revenue Lifecycle | 5 | none loaded | — |
| Sales Performance Management | 5 | 1 obs | — |

### Stage View
- Chain walk (`activityChainHead` + `nextActivityId`) resolves correctly for v5 bundles
- Capability blocks render in all stages
- Entry/exit states render correctly
- Friction observations display with scores and Generate User Story buttons
- Binding constraint highlighted in red with correct stage identification
- PPIT layer toggles working: **Roles** and **Activities** populate from v5 activity fields
- Info / Tech tabs correctly empty (v5 Water Filtration fixture has no `informationObjectIds` / `technologyAppIds`)

### Network View
- All 5 VS nodes render with friction badges and constrained indicator
- Click-through to Stage View works for all nodes

### User Guide
- Contextually aware across all steps (Welcome → Network → Friction → Solutions)

---

## Schema Compatibility

VCC frontend now handles both v4 and v5 scaffold formats:

| Field | v4 | v5 |
|-------|----|----|
| VS activity list | `activityIds[]` | `activityChainHead` + `nextActivityId` on activity |
| VS layout zone | `layoutZone` | `zone` |
| Capability refs on activity | `requiresCapabilityIds` | `enabledByCapabilityIds` |
| PPIT breakdown | `activity.capabilityPPIT[capId]` | flat `performedByRoleIds` on activity (no per-cap PPIT) |

---

## Files Changed This Session

| File | Change |
|------|--------|
| `src/store/canvas-store.ts` | v5 chain walk in `generateCanvasForVs`; dual capability field (`enabledByCapabilityIds ?? requiresCapabilityIds`) |
| `src/components/CanvasView.tsx` | Guard `bindingConstraint?.bindingAnchor` against undefined |
| `src/components/canvas/StageCard.tsx` | `enabledByCapabilityIds ?? requiresCapabilityIds` for capability block rendering |
| `src/components/canvas/CapabilityBlock.tsx` | v5 PPIT fallback: reads `performedByRoleIds` for Roles layer, activity name for Activities layer |

---

## Known Gaps / Next Steps

### Step 2 — UX flow decoupling (next)
- Decouple friction from intake: scaffold generation → immediate canvas; friction on-demand from Stage Wizard Step 2
- Pipeline rewrite: Passes A + B with Gate 1, IR surfacing, determinism enforced at proxy level
- Aligns with D-035 and GPT architecture recommendation

### Step 3 — Two-pass extraction rewrite
- Replace single-pass extraction with properly sequenced multi-agent pipeline
- Passes A + B with intermediate IR surfacing
- Reference: `VCC_Scaffold_Generation_Prompt_Pack_v3_2`

### Pause — Eric Broda spar
- Question: Does Governance Kernel + GSM wire in as overlay (additive) or requires scaffold structural changes (breaking)?
- Determine before building MVC demo

### Step 4 — MVC demo for Eric
- Architecture diagram: VCC + MVC + Governance Kernel mapped onto Agentic Mesh Trust Framework
- `StageCard` identified as natural host for Governance Kernel overlay (PPIT layer system is the hook)

### Minor cosmetic
- Network View VS cards show `stages` label with no count (stageCount not derived for v5 chain format)

---

## Design Notes

- `StageCard` ↔ Eric Broda's Concept Card: structural alignment noted, no action yet
- PPIT layer system (`ppitToggles`) is the natural extension point for Governance Kernel overlay
