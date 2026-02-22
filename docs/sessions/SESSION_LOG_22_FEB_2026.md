# Session Log — 22 Feb 2026

## Session Focus
Throughput Impact Panel integration into VCC + UI overhaul + schema/validation alignment

## Context
Recovered from connection drop mid-session. Rebuilt context from uploaded artifacts (design doc, posture doc, standalone component, integration guidance).

---

## Work Completed

### 1. Throughput Panel Integration (v1)
- Built `ThroughputPanel.tsx` — VCC-native Tailwind, reads scaffold metrics + heatmap binding constraint
- Wired into `FrictionPanel.tsx` — renders only for binding constraint activity, between callout and observations
- Collapsed by default (progressive disclosure)
- Extended `types.ts`: added `ScaffoldMetric`, `EngagementParams`, `throughputMetricId` on `ScaffoldActivity`
- Changed `metrics` record type from `ScaffoldElement` to `ScaffoldMetric`

### 2. Reviewer Feedback Round 1 — Integration Adjustments (v2)
- Fixed epistemic language: "has the potential to reduce under these assumptions"
- Fixed collapsed chip: "200 days/qtr" (not "business days/qtr")
- Metric resolution via `throughputMetricId` (not hardcoded IDs)
- Decimal step (0.25) on Cycles/yr input
- Subordinated secondary escalation projection (smaller font, lighter colour, "*conditional")
- Added scenario override toggle (directors can test "what if we only get to 9 days?")
- Added justification truncation with "Show more/less" on binding constraint callout

### 3. Reviewer Feedback Round 2 — Computation Fixes
- Direction-aware delta calculation (respects metricDirection: Increase/Decrease/Attain)
- Negative delta protection: zero-floor with `isWorseningScenario` flag + amber warning banner
- `exposureReduction` uses effective (floored) delta

### 4. UI Overhaul — CanvasView
- Binding constraint card: prominent label with warning icon, no pulse animation (calm, executive)
- Column containing binding constraint gets red-tinted header
- Heatmap summary bar: observation count, binding constraint name (clickable), confidence
- Flow arrows between columns
- Entire activity card clickable when heatmap loaded
- Selected activity ring state
- Confidence percentage on friction badges (max observation confidence)
- Right panel widened from w-80 to w-96

### 5. Alignment Gap Fixes (Reviewer Round 3)
- **Removed metric guessing**: `resolveBindingMetrics` requires `throughputMetricId`. If missing → "Projection unavailable: [reason]". No heuristic fallback.
- Filter requires both `currentMeasure` AND `targetMeasure`
- Validates `throughputMetricId ∈ activity.metricIds`

### 6. Scaffold Resolver
- Created `scaffold-resolver.ts`: maps canonical scaffold (measure IDs) → resolved scaffold (inline values)
- Handles: `measures.currentMeasureId` → `elements.measures[id].measureValue`
- Maps `metricDirection` → `direction`, `unitOfMeasure` → `unit`
- Preserves all original metric properties (spreads full object)
- Handles `measureValue` as number or string
- Idempotent — already-resolved values preserved
- Wired into `canvas-store.ts` at scaffold load time

### 7. Schema Patch
- Added `throughputMetricId` (optional, `$ref: Id`) to canonical Activity
- Added `secondaryMetricIds` (optional, `$ref: RefList`) to canonical Activity
- Additive only, no breaking changes
- Output: `ScaffoldModel_schema_v3.json`

### 8. Semantic Validation Rules
- Created `throughput-validator.ts` with 8 rules per Reviewer specification:
  - V-SCAFFOLD-ACT-MET-THR-01: throughputMetricId exists and in metricIds (Error)
  - V-SCAFFOLD-ACT-MET-THR-02: secondaryMetricIds exist and in metricIds (Error)
  - V-SCAFFOLD-MET-MEAS-01: throughput metric has current+target measureIds (Warning)
  - V-SCAFFOLD-MET-MEAS-02: measure IDs resolve to elements.measures (Error)
  - V-SCAFFOLD-MEAS-VALUE-01: measureValue is numeric (Warning)
  - V-SCAFFOLD-MEAS-UNIT-01: unitOfMeasure present (Warning)
  - V-SCAFFOLD-MET-DIR-01: metricDirection present and valid (Warning)
  - V-SCAFFOLD-ACT-MET-THR-03: throughput metric targets the activity (Warning)
- Runs client-side after backend validation, findings merged into ValidationReport

---

## Files Changed/Created

### New files
- `frontend/src/components/ThroughputPanel.tsx` — throughput impact panel component
- `frontend/src/store/scaffold-resolver.ts` — canonical → resolved scaffold mapping
- `frontend/src/store/throughput-validator.ts` — semantic validation rules
- `ScaffoldModel_schema_v3.json` — patched canonical schema

### Modified files
- `frontend/src/types.ts` — ScaffoldMetric, EngagementParams, throughputMetricId on Activity, metrics record type
- `frontend/src/components/FrictionPanel.tsx` — ThroughputPanel integration, justification truncation
- `frontend/src/components/CanvasView.tsx` — UI overhaul (summary bar, flow arrows, card redesign, selection state)
- `frontend/src/store/canvas-store.ts` — resolver + validator wiring

### Unchanged files
- `frontend/src/App.tsx`
- `frontend/src/components/FileLoader.tsx`
- `frontend/src/components/FrictionOverlay.tsx`

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `throughputMetricId` promoted to canonical schema | UI refuses to guess; schema should be able to express it. Governance alignment. |
| Measures resolved at load time (not in schema) | Keeps canonical contract clean (measure-ID based); UI consumes resolved view |
| No metric guessing / no heuristic fallback | Board credibility requires explicit designation, not silent auto-selection |
| Direction-aware delta with zero-floor | Prevents confusing negative projections; explicit worsening state |
| Scenario override as UI-only state | Non-prescriptive; doesn't persist to scaffold; lets directors "play" |
| Validation runs client-side | Throughput rules are cross-field semantic checks; don't need backend |

---

## Open Items / Next Session

1. **Update golden scaffold fixtures** — add `throughputMetricId` to banking supervision activities so the throughput panel renders with real data
2. **Reviewer suggested**: update measure ID refs in Metric schema from `type: "string"` to `$ref: "#/$defs/Id"` for consistency (low priority)
3. **Broader UI overhaul continues** — the Reviewer flagged several areas to observe in first live run:
   - Where do eyes go first?
   - Do directors adjust assumptions or jump to "what do we do?"
   - Is binding constraint visually dominant enough with new card design?
   - Does right panel feel overloaded?
4. **Capability density** — Reviewer noted the "1 capability per VSS" issue is rendering, not model. UI aggregation may need attention.
5. **candidateConstraints** — Reviewer flagged optional `candidateConstraints?: BindingConstraint[]` for future ranking exploration (not urgent)
