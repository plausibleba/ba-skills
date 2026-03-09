# Current State — VCC Frontend

_Last updated: 2026-03-09 — Session 18_

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

Three-pass pipeline producing highest-quality scaffolds yet:
- Single source of truth: all prompts in `domain/pipeline/prompts/` (D-085)
- Deterministic formalisation (D-087) — consistent output across runs
- capabilityPPIT on every activity (D-086): roleIds, 3 sub-activities, informationObjectIds, technologyAppIds
- Shared capabilities across activities (structural coupling)
- Information objects, metrics, and tech wired correctly
- Gate 1 (FSM chain) + Gate 2 (referential integrity) validation with bounded repair

### Streaming Infrastructure ✅

All LLM calls stream through Edge Runtime proxy (D-088):
- `/api/claude.ts` — Edge Runtime + SSE streaming, extended output (128K) enabled
- `llm-client.ts` — shared `callLLM()` used by all 7 call sites (D-089)
- No raw `fetch` to API anywhere in codebase
- Survives Vercel Hobby 10s timeout via streaming (first bytes in ~1s)

### Friction Assessment (Pass C) ✅

- Wired to proper Pass C pipeline with scaffold skeleton and exact activity IDs (D-091)
- Generates observations for ALL value streams in one call
- Proper friction taxonomy (6 categories) with evidence basis rules
- Binding constraint scoring with eligibility criteria

### ID-vs-Label Display ✅

`humanizeId()` utility (D-084) converts raw IDs to readable display names across 9 components.

### Stage View ✅

- Chain walk resolves correctly for both v4 and v5 bundles
- Capability blocks with PPIT layer toggles (Roles, Activities, Info, Tech)
- Entry/exit states, friction observations, binding constraint display
- User story generation via TransformationPane

### Network View ✅

- All VS nodes render with friction badges and constrained indicator
- Topology coupling counts from derived TopologyView
- Click-through to Stage View works

---

## Architecture

### Pipeline Flow
```
Pass A1 (VS+Stages) → Pass A2 (Roles+Caps+Signals) → DiscoveryIR
                                                          ↓
                                               Pass B (Scaffold + Gate 1/2)
                                                          ↓
                                               Pass C (Friction Heatmaps)
```

### Prompt Files (domain/pipeline/prompts/)
| File | Purpose | Key Features |
|------|---------|-------------|
| pass-a1-value-streams.ts | VS extraction | Initiative exclusion, Trigger→Outcome naming |
| pass-a2-capability-mapping.ts | Roles, capabilities, signals | Shared capability rules, Verb-Noun convention |
| pass-b-scaffold-formalisation.ts | Scaffold formalisation | capabilityPPIT, Gate 1/2, registry population |
| pass-c-friction-analysis.ts | Friction assessment | 6-category taxonomy, binding constraint scoring |

### API Proxy
- Edge Runtime with SSE streaming pass-through
- `anthropic-beta: output-128k-2025-02-19` for extended output
- Pass B: 32K max tokens; other passes: 4K-8K

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

Decisions numbered D-001 through D-091. Single source of truth: `docs/DECISIONS.md`.

---

## Known Gaps / Next Steps

### Immediate
1. Test Enrich Solutions after streaming wiring — confirm vendor feature suggestions work
2. Verify binding constraint highlighting on Stage View after Pass C wiring
3. PDS update — reflect Sessions 12–18 progress

### Near Term
4. Customer Story filtering by company size/revenue/industry
5. DiscoveryIR review panel before formalisation (D-068)
6. Prompt logic review session (user requested)
7. Jira export button for user stories

### Future
8. F-001 phase 2: delete observations, reassign binding constraint
9. Multi-vendor support beyond Salesforce
10. Eric Broda MVC demo — Governance Kernel overlay on StageCard
