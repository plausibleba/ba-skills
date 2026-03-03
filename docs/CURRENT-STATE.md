# Current State

**Read this first. Every session. One page.**

Last updated: 2026-03-03

---

## What We're Building

A **board-level governance instrument** for organisational value stream analysis. The Value Cognition Canvas (VCC) lets stakeholders visualise how value flows through an organisation, validate structural completeness, and identify friction.

## Zoom Levels

| Level | View | Status |
|-------|------|--------|
| Enterprise | Network View — DAG topology of all value streams | **Stable** |
| Stream | Stage View — per-VS stages, capabilities, PPIT layers | **Stable** |
| Capability | PPIT expansion — activities, roles, info, tech per capability | **Stable** |
| Friction | Heatmap overlay — observations, binding constraints | **Stable** (enterprise banking demo) |
| Transformation | Painpoints, ideas, requirements, epics | **Not yet built** |

## What Is Stable

- **Frontend**: React/Vite/Tailwind SPA, no backend. Network View + Stage View with full PPIT.
- **Pipeline**: XLSX → IR → scaffold generator with PPIT enrichment.
- **IIBA Scaffold**: 6 VS, 28 stages, 70 capabilities, 233 atomic activities, 200 info objects, 61 tech apps.
- **Data model**: Scaffold JSON schema with `capabilityPPIT` structure.
- **Visual encoding**: Colour semantics, edge discipline, progressive disclosure, tooltip patterns.
- **Design principles**: Documented and enforced (see `DESIGN-PRINCIPLES.md`).
- **Discovery Intake**: Transcript → extract → scaffold + heatmap generation → VCC Bundle download.
- **VCC Bundle format**: Single JSON containing scaffold + heatmaps. FileLoader accepts bundles.
- **F-001 Editable Friction Panel**: Implemented (Session 6).

## What Is Experimental

- **Discovery Intake extraction quality** — single-pass extraction causes VS/stage confusion. Two-pass rewrite planned.
- **Heatmap from Discovery Intake** — friction observations generate and bind, but quality depends on extraction accuracy.
- **Binding constraint** — anchor ID matching partially working; binding constraint highlight not reliably rendering.
- **Capability tooltip direction** — works but could be refined with scroll-aware positioning.

## Deployment

- **Production URL**: `https://frontend-five-eta-l0j2mk66gi.vercel.app`
- **Deploy method**: `cd packages/frontend && vercel --prod` (CLI linked to `frontend` project)
- **GitHub**: commits to `main` do NOT auto-deploy — manual CLI deploy required
- **Root directory**: `packages/frontend`
- **API proxy**: `vercel.json` rewrites `/api/*` before SPA catch-all

## What's Next

| Priority | Item | Notes |
|----------|------|-------|
| 1 | Two-pass extraction rewrite | Fix VS/stage confusion. Use prompt pack phased approach. |
| 2 | Daniel feature: friction → solutions → SF features → case studies | Matching/enrichment layer on heatmap observations |
| 3 | Dummy discovery datasets (2-3) | Fictitious prospects for demo use outside Salesforce context |
| 4 | Design folder → Project files migration | Terry to upload full design folder to Claude Project |
| 5 | Build Friction Signal Agent (Track B) | Single LLM agent, not multi-agent |
| 6 | Populate TransformationPane schema | Painpoints → epics |

## Participants

| Role | Responsibility |
|------|---------------|
| **Terry** | Orchestrator. Decision integrator. Owns repo. |
| **Claude** | Implementation. Architecture. Pipeline. Documentation. |
| **Daniel Roach** | Salesforce pre-sales. Demo recipient. Feature requester. |
| **Reviewer** | Structural critique. Ontological discipline. Visual hierarchy. |

## Key Files

```
packages/frontend/src/components/DiscoveryIntake.tsx   Discovery Intake + extraction + scaffold/heatmap generation
packages/frontend/src/components/FileLoader.tsx        Accepts scaffold, heatmap, or VCC bundle
packages/frontend/src/store/canvas-store.ts            All state
packages/frontend/vercel.json                          API proxy config (critical)
fixtures/Puretec/                                      Hand-crafted Puretec fixture scaffold + heatmaps
```
