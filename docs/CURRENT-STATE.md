# Current State — VCC Frontend

_Last updated: 2026-03-09 — Session 16_

---

## Deployment

| Environment | URL |
|-------------|-----|
| Production alias | https://frontend-five-eta-l0j2mk66gi.vercel.app |
| Deploy command | `cd packages/frontend && vercel --prod` |

---

## What Works (as of this session)

### End-to-end v5 bundle loading ✅

All five Water Filtration Company value streams load and render correctly in both Network View and Stage View (D-072–D-078).

### Scaffold Generation (PureTec presales scenario) ✅

Four-pass pipeline (Passes 1–3 + friction stashed) generating quality scaffolds:
- 6 VS preserved from extraction (RULE 1, D-082)
- Short stage labels (2–4 words, D-081)
- Initiatives excluded from VS (D-081)
- v4 format output (D-080)
- PPIT rendering confirmed: Activities, Roles, Info, capabilityPPIT populated

### ID-vs-Label Display ✅

`humanizeId()` utility (D-084) converts raw IDs to readable display names across 9 components. `cap_lead_qualification` → "Lead Qualification".

### Stage View
- Chain walk (`activityChainHead` + `nextActivityId`) resolves correctly for v5 bundles
- Capability blocks render with humanized fallback labels
- Entry/exit states, friction observations, binding constraint all working
- PPIT layer toggles: Roles and Activities populate from both v4 capabilityPPIT and v5 activity-level fallback
- User story generation via TransformationPane

### Network View
- All VS nodes render with friction badges and constrained indicator
- Topology coupling counts from derived TopologyView
- Click-through to Stage View works for all nodes

---

## Schema Compatibility

VCC frontend handles both v4 and v5 scaffold formats:

| Field | v4 | v5 |
|-------|----|----|
| VS activity list | `activityIds[]` | `activityChainHead` + `nextActivityId` on activity |
| VS layout zone | `layoutZone` | `zone` |
| Capability refs on activity | `requiresCapabilityIds` | `enabledByCapabilityIds` |
| PPIT breakdown | `activity.capabilityPPIT[capId]` | flat `performedByRoleIds` on activity |

---

## Decision Log State

Decisions numbered D-001 through D-084. Single source of truth: `docs/DECISIONS.md`.

---

## Known Gaps / Next Steps

### Immediate
1. Verify Vercel deployment — re-run PureTec to confirm clean labels on canvas
2. Pipeline rewrite to 3-pass architecture (D-065): Pass A (DiscoveryIR) → Pass B (Scaffold with Gate 1) → Pass C (Heatmap)
3. PDS update — document Sessions 12–16 progress

### Near Term
4. DiscoveryIR review panel (D-068)
5. Proxy-level temperature enforcement (D-069)
6. Jira export for user stories
7. Dummy discovery datasets for Daniel

### Future
8. Eric Broda MVC demo — Governance Kernel overlay on StageCard
9. Multi-vendor support beyond Salesforce
10. F-001 phase 2: delete observations, reassign binding constraint
