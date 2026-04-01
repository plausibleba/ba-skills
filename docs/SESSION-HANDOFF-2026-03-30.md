# Session Handoff — 30 March 2026

**From**: Cowork session (Opus) — ran across two context windows
**For**: Next session on Mac Mini
**Read first**: `CURRENT-STATE.md`, then `docs/CLAUDE.md`
**Latest commit**: `5d930e9` (all code changes committed)
**Uncommitted**: Only `CHANGELOG.md` and `docs/CURRENT-STATE.md` (doc edits, non-breaking)
**index.lock**: You may need to `rm .git/index.lock` before committing — the lock file from a prior session is still present.

---

## What Was Built This Session

### 1. Sub-Activity DAG Visualisation (Activity Flows)

Introduced two new ways to see the per-activity DAGs that the enricher produces:

**A. L5 Drill Level in Graph Explorer** (`StructuredGraphExplorer.tsx`)
- Extended the drill hierarchy: L1 (Operating Model) → L2 (Value Stream) → L3 (Stage Detail) → L4 (PPIT) → **L5 (Activity Flow)**
- L3 now shows an "Activity Flow" section when a DAG exists, clickable to drill into L5
- L5 renders DAG nodes as cards with gate icons and flow arrows

**B. Flows Tab in Workbench** (`ActivityFlowsView.tsx` — new file)
- Swimlane layout grouped by value stream
- BFS-layered DAG layout engine
- Responsive CSS grid for multiple DAGs side-by-side
- Three-way toolbar toggle in WorkbenchView: Catalog | Graph | Flows

### 2. Standardised Elbow Connector Edge Routing

Both `ActivityFlowsView.tsx` and `InspectorPanel.tsx` DagGraph now use identical elbow connector logic:
- **Downstream**: straight vertical or L-shaped elbows
- **Upstream (loopback)**: exits from the OUTER side of the source node (toward the nearest SVG boundary), routes along the SVG perimeter, re-enters from the top of the target — never crosses intermediate nodes

### 3. Enrichment Detection & Uncommitted Banner

- Triple-fallback enrichment detection: checks `completedThisSession` set, workbench scaffold, AND canvas store scaffold
- Workbench toolbar shows an amber pulsing banner when enrichments are uncommitted, linking back to the commit page

### 4. "Deepen Structure" → "Derive Activity Flows" (Relabel + Restructure)

Complete rename across all 9 files that referenced "Deepen Structure". More importantly:

- **PPIT Mapping is now the 1st enrichment step** (was 2nd) — reordered in `shared.tsx`, `EnrichmentView.tsx`, and `EnrichmentWizard.tsx`
- **Activity Flows requires PPIT as a prerequisite** — new `requires: ["ppit"]` field on the card definition; UI shows amber "Requires PPIT" badge; `runBuiltIn` blocks execution with a helpful error if PPIT hasn't been run
- **Enricher now consumes PPIT activities** — `subactivity-enricher.ts` extracts `capabilityPPIT[capId].activities` and `roleIds` from each scaffold activity, passes them to the LLM as `ppitActivities` and `ppitRoleIds`, with explicit prompt instructions to use them as the basis for DAG nodes

### 5. Bug Fixes

- React error #185 (infinite re-render) from Zustand `.filter()` in selector — fixed with stable selector + `useMemo`
- DAGs rendering disproportionately large (SVG `width="100%"`) — fixed with capped pixel width
- Enrichment detection stale data — workbench deep-clone wasn't seeing canvas store updates

---

## Key Files Modified

### Core changes (all committed):

| File | What changed |
|------|-------------|
| `src/components/ActivityFlowsView.tsx` | **NEW** — Flows tab, BFS layout, elbow connectors, upstream routing |
| `src/components/WorkbenchView.tsx` | Added Flows tab toggle, uncommitted enrichment banner |
| `src/components/StructuredGraphExplorer.tsx` | L5 drill level, L3 Activity Flow section, enrichment detection fallback |
| `src/components/canvas/InspectorPanel.tsx` | Upstream edge routing fix (SVG perimeter routing) |
| `src/components/enrichment/shared.tsx` | PPIT→1st, `requires` field on interface, relabel |
| `src/components/EnrichmentView.tsx` | Reorder, relabel, prerequisite gating UI + runtime check |
| `src/components/EnrichmentWizard.tsx` | Reorder, relabel |
| `src/domain/pipeline/subactivity-enricher.ts` | PPIT activity consumption, updated prompt, relabel |
| `src/domain/pipeline/pipeline-orchestrator.ts` | Comment update |
| `src/domain/pipeline/prompts/pass-b-scaffold-formalisation.ts` | Pass ordering comment |

---

## Pending / Next Steps

1. **Deploy to Vercel** — all changes are committed but not deployed. Run `cd packages/frontend && vercel --prod` when ready.

2. **Test the full enrichment flow** — Run PPIT Mapping first, then Derive Activity Flows on a real model. Verify that:
   - Activity Flows card shows "Requires PPIT" when PPIT hasn't run
   - After PPIT runs, Activity Flows becomes available
   - The generated DAGs actually incorporate the PPIT activities (check the nodes match)

3. **Edge routing visual QA** — The upstream routing now goes to the SVG perimeter. Test with models that have loopback edges to confirm it looks clean.

4. **Future: Editable flows** — Terry noted "at some point we will probably have to make these flows editable." Not scoped for now, but the data model (`subActivityGraphs`) supports in-place mutation.

5. **Uncommitted doc edits** — `CHANGELOG.md` and `CURRENT-STATE.md` have local edits. Review and commit or discard.

---

## Files to Provide as Context for New Session

For a new Cowork session to pick up where this left off, attach or point to:

1. **This file** — `docs/SESSION-HANDOFF-2026-03-30.md`
2. **`docs/CURRENT-STATE.md`** — overall system state
3. **`docs/CLAUDE.md`** — project conventions and architecture

If the new session needs to work on specific areas, also point to:

- **Enrichment system**: `src/components/enrichment/shared.tsx` + `src/components/EnrichmentView.tsx`
- **Activity Flows**: `src/components/ActivityFlowsView.tsx` + `src/domain/pipeline/subactivity-enricher.ts`
- **Graph Explorer**: `src/components/StructuredGraphExplorer.tsx`
- **Workbench**: `src/components/WorkbenchView.tsx`
- **Data model**: `src/types.ts` (for `SubActivity`, `subActivityGraphs` types)
