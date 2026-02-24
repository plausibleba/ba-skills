# Current State

**Read this first. Every session. One page.**

Last updated: 2026-02-24

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

## What Is Experimental

- **Capability tooltip direction** — works but could be refined with scroll-aware positioning.
- **VS selector dropdown** — functional but visually basic (native `<select>`).
- **Column height equalisation** — works via `maxMetricRows` formula, may need revisiting with more PPIT content open.

## What's Next

| Priority | Item | Owner |
|----------|------|-------|
| 1 | Fill IIBA discovery questionnaire (Sections 1.1–3.4) | Terry + Claude |
| 2 | Generate IIBA heatmap from questionnaire | Claude |
| 3 | Test heatmap overlay on IIBA scaffold in Stage View | Terry |
| 4 | Formalise multi-agent workflow contracts | Claude + Reviewer |
| 5 | Build Friction Signal Agent (Track B, single agent) | Claude |
| 6 | Populate TransformationPane schema (painpoints → epics) | Claude + Reviewer |
| 7 | Introduce UI/UX model for layout refinement | Terry |

## Participants

| Role | Responsibility |
|------|---------------|
| **Terry** | Orchestrator. Decision integrator. Owns repo. |
| **Claude** | Implementation. Architecture. Pipeline. Documentation. |
| **Reviewer** | Structural critique. Ontological discipline. Visual hierarchy. Design doctrine. |
| **UI/UX model** | *(Not yet onboarded)* Layout, spacing, interaction patterns. |

## Repo Structure

```
/frontend          React SPA (the product)
/pipeline          Python XLSX→IR→scaffold pipeline
/docs              All shared documentation
  ARCHITECTURE.md       System overview + data model
  DESIGN-PRINCIPLES.md  Reviewer's design rules
  DECISIONS.md          Numbered ADR-style decision log
  SESSION-LOG.md        What was built when
  INVENTORY.md          File-by-file inventory
  HANDOFF.md            Onboarding guide for new participants
  CURRENT-STATE.md      This file
  WORKFLOW.md           Multi-agent coordination contracts
```
