# Value Cognition Canvas (VCC)

Read `CURRENT-STATE.md` first every session.
Read `SPAR_PROTOCOL.md` when design decisions are being discussed.
Read `DESIGN-PRINCIPLES.md` before any UI/component work.

## Project Overview

Board-level governance instrument for organisational value stream analysis. Visualises how value flows through an organisation — from strategic capability through operational activities to measurable outcomes. Built on CAPSICUM Framework (Roach 2011) — treats enterprise as finite state machine where stakeholder value interactions evolve through bounded states.

## Current Architecture

Two-tier system. No backend. No build server. All client-side.

```
Pipeline (Python)          Frontend (React SPA)
XLSX → IR → scaffold.json → FileLoader → Network View → Stage View
```

### Frontend (`/frontend/`)
- **Runtime**: Vite + React 18 + TypeScript
- **State**: Zustand (single store, `canvas-store.ts`)
- **Styling**: Tailwind CSS with custom `vcc-*` colour palette
- **Layout**: No component library. All custom components.
- **Views**: Network View (enterprise DAG) + Stage View (per-VS drill-through)
- **No backend dependency**: Scaffold JSON loaded via file drop. All rendering client-side.

### Pipeline (`/pipeline/`)
- **Runtime**: Python 3.12, stdlib only (no pip dependencies)
- **Input**: XLSX business analysis model
- **Output**: Canonical scaffold JSON
- **Steps**: `parse_xlsx.py` → IR dataclasses → `generate_scaffold.py` → scaffold.json
- **Enrichment**: `ppit_assignments.py` adds per-capability People/Activities/Information/Technology

## Core Principles

1. **Scaffold is canonical**: The JSON scaffold is the single source of truth. Everything renders from it.
2. **Deterministic**: Same inputs produce identical outputs and integrity hashes.
3. **No mutation**: Validators and generators are pure functions. Never mutate input objects.
4. **Referential integrity**: All ID references must resolve within the appropriate element map.
5. **FSM semantics**: Activities have distinct pre/post outcomes (no no-ops). Outcome chains connect stages.
6. **IR is transient**: The intermediate representation is a workspace, not a durable artefact.
7. **LLMs propose, humans dispose**: No AI output directly creates canonical artefacts.
8. **Progressive disclosure**: Every layer of detail is gated behind a toggle or hover interaction.

## Data Model (Scaffold JSON)

```
scaffold
├── scaffoldId, name, description
├── elements
│   ├── valueStreams       { id → name, description, activityIds, layoutZone }
│   ├── activities         { id → name, description, preOutcomeId, postOutcomeId,
│   │                        requiresCapabilityIds, performedByRoleIds,
│   │                        metricIds, controlIds, capabilityPPIT }
│   ├── capabilities       { id → name, description }
│   ├── roles              { id → name }
│   ├── outcomes           { id → name, status }
│   ├── metrics            { id → name }
│   ├── controls           { id → name }
│   ├── informationObjects { id → name, type }
│   └── technologyApps     { id → name, type }
├── crossStreamOutcomes    [ { fromVsId, toVsId, outcomeId, direction } ]
└── scaffoldIntegrityHash
```

### capabilityPPIT (per-activity, per-capability)

```
activity.capabilityPPIT[capabilityId] = {
  roleIds: [...],           // People — specific to this capability in this stage
  activities: [...],        // Atomic verb-object statements (3-6 per capability)
  informationObjectIds: [], // Data consumed or produced
  technologyAppIds: []      // Systems used
}
```

### Activity Statement Rules
- Verb + Object format (6-12 words max)
- No conjunctions, no composite logic
- Each activity creates or transforms state
- Each activity can fail — that's where friction anchors

## Colour Semantics (Global)

| Colour | Meaning |
|--------|---------|
| Blue | People / Roles |
| Violet | Activities |
| Amber | Information objects |
| Emerald | Technology |
| Red | Binding constraint / Critical |
| Slate-blue (vcc-700/900) | Primary brand / Headers |
| Gray | Neutral / Disabled |

These are absolute. A blue chip always means a role. No exceptions.

## Key Components

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root — mode switch, breadcrumb, claim token consumption, tier init |
| `canvas-store.ts` | All state: scaffold, network topology, VS selection, heatmaps |
| `tier-store.ts` | Tier state (Zustand + Supabase sync), gate check logic, usage tracking |
| `useGateCheck.ts` | Hook wrapping actions with tier gate — returns `gate(action, callback)` |
| `UpsellModal.tsx` | Contextual upgrade prompt shown when free-tier user hits a gated action |
| `LoginPage.tsx` | Auth page with claim-aware UI (pre-fill email, contextual banner) |
| `NetworkView.tsx` | Enterprise DAG with layer schemes, graph view, VS editor modal |
| `CanvasView.tsx` | Stage view orchestrator: VS header, toolbar, stage columns |
| `StageColumn.tsx` | Per-stage column: header with info tooltip, structure pane, capabilities |
| `CapabilityBlock.tsx` | Per-capability: name, info tooltip, PPIT badge counts, expandable layers |
| `StructurePane.tsx` | Entry/exit states + metrics |
| `TransformationPane.tsx` | Friction observations (future: painpoints, ideas, requirements) |
| `CanvasToolbar.tsx` | Structure/Transformation toggles + PPIT layer toggles |
| `ContentSelectors.tsx` | VS dropdown + heatmap assessment loader |
| `InlineEdit.tsx` | Double-click-to-edit component — tier-gated (all edit pencils in app) |
| `bundle-claim.ts` | Client-side claim token lifecycle (extract, stash, fetch, consume) |

## Commercial / Tier System

Action-level gating, not page-level. Free users can browse everything; writes and executions are gated.

```
tier-store.ts (state + Supabase sync)
    ↓
useGateCheck hook — gate(action, callback, description)
    ↓ blocked?
UpsellModal — contextual "upgrade to unlock X" prompt
```

**Tiers**: free → trial (15 days) → starter ($20/mo) → individual ($50/mo) → team
**Free allowances**: 1 friction analysis, 3 bundle uploads. READs free, WRITEs gated.
**23 gated actions**: edit_field, create_project, run_discovery, run_assessment, export_pdf, etc.
**Pattern**: `gate("action_name", () => originalCallback())` wraps existing onClick handlers.

## Canvas → VCC Handoff

Cross-domain bundle transfer from plausibleba.com/canvas to app.plausibleba.com:

```
Canvas → POST /api/claim-bundle → Vercel KV (bndl_xxx, 24hr TTL)
                                       ↓
VCC ← ?claim=token&email=... → sessionStorage (survives auth redirect)
                                       ↓ after login
App.tsx useEffect → fetchClaimedBundle → import → create project
```

Key files: `website/api/claim-bundle.ts` (edge function), `utils/bundle-claim.ts` (client lifecycle).

## Validation Rules

### Scaffold (V-SCAFFOLD-01..08)
- 01: Referential integrity (all IDs resolve)
- 02: No no-op transitions (pre ≠ post outcome)
- 03: No cycles in nextActivityId chain
- 04: ValueStream must have activities
- 06: No orphan metrics
- 07: Chain reachability (all VS activityIds reachable via nextActivityId)
- 08: Outcome chain consistency (adjacent activity outcomes match)

### Heatmap (V-FRICTION-01..05)
- 01: Anchor referential integrity
- 02: Binding anchor must appear in at least one observation
- 03: Binding anchor must appear in the specific referenced observation
- 04: valueStreamId must exist in scaffold
- 05: scaffoldIntegrityHash must match computed scaffold SHA-256

## Scope Boundaries

**In scope**: Scaffold validation, canvas rendering (Network + Stage), PPIT layers, friction overlay, binding constraint, heatmap loading, multi-VS navigation, progressive disclosure, commercial tier gating, Canvas→VCC bundle handoff, Supabase auth (magic link + OAuth).

**In progress**: Stripe integration for paid tiers, end-to-end tier testing, Supabase type regeneration.

**Explicitly deferred**: Runtime workflow execution, telemetry ingestion, automated metric calculation, simulation engine, multi-tenant SaaS, Throughput Impact Panel (see `POSTURE_non_prescriptive.md`), activity-level PPIT anchoring (currently capability-level).

## Current Stats (IIBA Operating Model)

| Element | Count |
|---------|-------|
| Value Streams | 6 |
| Stages | 28 |
| Capabilities | 70 |
| Atomic Activities | 233 |
| Roles | 64 |
| Information Objects | 200 |
| Technology Apps | 61 |
| Cross-stream Outcomes | 12 |
