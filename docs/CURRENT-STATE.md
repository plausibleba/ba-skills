# Current State

**Read this first. Every session. One page.**

Last updated: 2026-03-04

---

## What We're Building

A **presales intelligence instrument** for value stream analysis. The Value Cognition Canvas (VCC) turns a client discovery conversation into a structured operating model diagnostic — surfacing friction points, binding constraints, and technology solution recommendations in minutes.

## Zoom Levels

| Level | View | Status |
|-------|------|--------|
| Enterprise | Network View — DAG topology of all value streams | **Stable** |
| Stream | Stage View — per-VS stages, capabilities, PPIT layers | **Stable** |
| Friction | Heatmap overlay — observations, binding constraints | **Stable** |
| Solutions | Vendor enrichment — technology features per friction point | **Stable** |
| Transformation | Painpoints, ideas, requirements, epics | **Not yet built** |

## What Is Stable

- **Frontend**: React/Vite/Tailwind SPA, deployed on Vercel. Network View + Stage View + full four-pass pipeline.
- **Discovery Intake**: Paste transcript → AI extracts value streams, stages, roles, tech, friction in four passes.
- **Stage Wizard**: Three-step toolbar (Scaffold → Assess Friction → Enrich Solutions). Each step: Load previous or Run new.
- **User Guide Panel**: Fixed bottom-left, contextually aware, six states, progress dots.
- **Pass 1–2**: Board-level VS definition + stage/role/tech extraction anchored to confirmed VS names.
- **Pass 3**: Friction assessment on demand — observations, intensity scores, binding constraint.
- **Pass 4**: Vendor solution enrichment — Salesforce Agentforce catalogue (47 features), customer story matching.
- **Puretec fixture**: 4 VS, 13 stages, 2 heatmaps — demo-ready.
- **IIBA scaffold**: 6 VS, 28 stages, 70 capabilities, 233 atomic activities — pipeline reference.

## What Is Experimental

- **Pass 3 quality**: Observation count and category distribution varies by transcript richness.
- **Pass 4 matching**: Feature-to-friction category heuristics are prompt-guided, not rule-based.
- **Customer story matching**: Story IDs attached by feature ID from fixture. No industry/size filtering yet.

## The Four-Pass Pipeline

| Pass | Where | Input | Output |
|------|-------|-------|--------|
| 1 | Discovery Intake | Transcript | Board-level VS names + descriptions |
| 2 | Discovery Intake | Transcript + VS names | Stages, roles, tech, pain points per VS |
| 3 | Stage Wizard Step 2 | Scaffold JSON | Friction observations + binding constraint |
| 4 | Stage Wizard Step 3 | Friction + feature catalogue | Solutions per observation + story IDs |

## What's Next

| Priority | Item |
|----------|------|
| 1 | Customer story filtering by industry/size |
| 2 | Dummy discovery datasets (2–3 fictitious non-Salesforce demos) |
| 3 | PDS update — document features built since original scope |
| 4 | Formalise four-agent pipeline in WORKFLOW.md |
| 5 | Export enriched bundle as download |
| 6 | TransformationPane content (painpoints → epics) |

## Participants

| Role | Responsibility |
|------|----------------|
| **Terry** | Orchestrator. Decision integrator. Owns repo. Sends to Daniel. |
| **Daniel** | Field tester. Salesforce pre-sales. Prospect-facing validation. |
| **Claude** | Implementation. Architecture. Pipeline. Documentation. |
| **Reviewer** | Structural critique. Ontological discipline. Visual hierarchy. |

## Repo Structure

```
/frontend
  src/
    components/
      StageWizard.tsx        ← NEW: three-step wizard bar
      UserGuidePanel.tsx     ← NEW: fixed bottom-left guide
      DiscoveryIntake.tsx    ← four-pass intake form
      FrictionPanel.tsx      ← editable friction overlay
      CanvasView.tsx         ← stage view orchestrator
      NetworkView.tsx        ← network view orchestrator
    store/
      canvas-store.ts        ← all state, enrichVersion counter
      scaffold-resolver.ts   ← metric measure resolution
      network-derivation.ts  ← DAG topology derivation
  fixtures/
    vendor-libraries/
      salesforce-agentforce.json  ← 47 features, customer stories
    puretec/                 ← demo scaffold + heatmaps
    iiba/                    ← reference scaffold
/docs
  SESSION-LOG.md, DECISIONS.md, CURRENT-STATE.md, HANDOFF.md, etc.
```
