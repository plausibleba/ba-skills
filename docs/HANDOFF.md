# Handoff Guide

How to onboard a new participant (model or human) to the VCC project.

---

## Quick Orientation

The **Value Cognition Canvas (VCC)** is a governance instrument for value stream analysis. It has two views:

1. **Network View** — Enterprise-level topology showing how 6 value streams connect
2. **Stage View** — Per-stream drill-through showing stages, capabilities, and PPIT layers

The project has two codebases:
- **Frontend** — React/Vite/Tailwind SPA, no backend needed
- **Pipeline** — Python scripts that transform XLSX business models into scaffold JSON

---

## Read These First

1. `ARCHITECTURE.md` — System overview, data model, component tree
2. `DESIGN-PRINCIPLES.md` — Reviewer's design rules (essential for UI work)
3. `DECISIONS.md` — Why things are the way they are
4. `SESSION-LOG.md` — What was built when

---

## Key Concepts

### Scaffold
The canonical data model. A JSON file containing value streams, activities (stages), capabilities, roles, metrics, outcomes, and PPIT assignments. Everything renders from this.

### PPIT
People, (Activities), Information, Technology — the four layers that describe HOW a capability operates within a specific stage. These are toggled on/off in the Stage View toolbar.

### Activities vs Capabilities
**Capability** = "what the organisation must be able to do" (stable, noun-like)
**Activity** = "what actually happens" (observable, verb-object, atomic)

These are distinct ontological layers. Never conflate them. See DESIGN-PRINCIPLES.md for the Reviewer's rules.

### Heatmap
An assessment overlay that adds friction observations to a scaffold. Loaded separately, matched by scaffoldId.

### IR (Intermediate Representation)
Transient staging format between XLSX and scaffold. Not durable. Not canonical.

---

## Working on the Frontend

**Stack:** React 18 + Vite + Tailwind CSS + Zustand

**Key files to understand:**
- `store/canvas-store.ts` — All state lives here
- `CanvasView.tsx` — Stage view orchestrator
- `NetworkView.tsx` — Network view orchestrator
- `components/canvas/CapabilityBlock.tsx` — Most complex rendering component

**Running locally:**
```bash
cd frontend
npm install
npm run dev
```

Load a scaffold JSON via the file loader. The IIBA scaffold is in `fixtures/iiba/scaffold.json`.

---

## Working on the Pipeline

**Stack:** Python 3.12, no external dependencies (stdlib only)

**Key files:**
- `src/generate_scaffold.py` — Main generator
- `src/ppit_assignments.py` — All 70 capability PPIT maps

**Running:**
```bash
cd pipeline/src
python3 generate_scaffold.py
# Outputs to ../outputs/iiba_scaffold.json
```

After regenerating, copy to frontend fixtures:
```bash
cp pipeline/outputs/iiba_scaffold.json frontend/fixtures/iiba/scaffold.json
```

---

## Collaboration Protocol

### For AI Participants
1. Read `ARCHITECTURE.md` and `DESIGN-PRINCIPLES.md` before making changes
2. Follow the Reviewer's activity statement rules (Verb + Object, 6-12 words, no conjunctions)
3. Follow the colour semantics (blue=roles, violet=activities, amber=info, emerald=tech)
4. Update `SESSION-LOG.md` with what you changed
5. Update `DECISIONS.md` if you made a non-trivial design choice

### For the Reviewer
- Feedback goes into the conversation, then gets distilled into `DESIGN-PRINCIPLES.md`
- Focus on ontological clarity and visual hierarchy
- Flag semantic blur (e.g., capability descriptions restating activities)

### For Terry
- Upload relevant docs from `/docs` at the start of each session
- The participant reads them, works, produces updated files + updated docs
- You commit everything to the repo

---

## Current State (as of 24 Feb 2026)

**Working:**
- Full IIBA scaffold with 6 VS, 28 stages, 70 capabilities, 233 activities
- Network View with two-layer topology
- Stage View with PPIT layer toggles, info tooltips, VS selector
- Pipeline: XLSX → IR → scaffold with PPIT enrichment

**Not yet built:**
- IIBA heatmap (need to fill discovery questionnaire first)
- Friction Signal Agent (Track B)
- TransformationPane content (painpoints, ideas, requirements)
- Activity-level PPIT anchoring (currently capability-level)

---

## Anti-Patterns to Avoid

1. **Don't restate capabilities as activities** — If the activity text sounds like the capability name in different words, it's wrong
2. **Don't use composite activities** — "Process payment and send confirmation" is two activities
3. **Don't vary edge stroke widths** — Uniform encoding discipline
4. **Don't add colours without semantic meaning** — Every colour must mean something
5. **Don't skip the Decisions log** — If you chose between options, record it
6. **Don't treat IR as canonical** — It's a workspace, not a deliverable
