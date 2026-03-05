# Handoff Guide

How to onboard a new participant (model or human) to the VCC project.

---

## Quick Orientation

The **Value Cognition Canvas (VCC)** is a presales intelligence instrument. It turns a client discovery conversation into a structured operating model diagnostic — surfacing friction points, binding constraints, and technology solution recommendations.

**The four-step rep workflow:**
1. Run Discovery Intake (paste transcript → generate scaffold)
2. Inspect Network View (value stream topology)
3. Assess Friction (Pass 3 → observations + binding constraint)
4. Enrich Solutions (Pass 4 → vendor feature matching + customer stories)

**Two ways to load a model:**
- **New Discovery** — paste transcript into Discovery Intake form, AI builds scaffold + heatmap
- **Load Bundle** — load a previously saved VCC Bundle JSON (scaffold + heatmaps)

---

## Read These First

1. `CURRENT-STATE.md` — one-page status, what's stable, what's next
2. `ARCHITECTURE.md` — system overview, data model, component tree
3. `DESIGN-PRINCIPLES.md` — Reviewer's design rules (essential for UI work)
4. `DECISIONS.md` — why things are the way they are (D-001 through D-040)
5. `SESSION-LOG.md` — chronological build record

---

## Key Concepts

### Scaffold
The canonical data model. A JSON file containing value streams, stages (activities), capabilities, roles, metrics, outcomes, and PPIT assignments. Everything renders from this.

### Heatmap
An assessment overlay that adds friction observations and a binding constraint to a scaffold VS. Loaded separately via the Stage Wizard or embedded in a Bundle.

### Bundle
A single JSON file containing scaffold + all heatmaps for an engagement. The save/load unit for presales work.

### The Four Passes

| Pass | Runs In | What It Does |
|------|---------|-------------|
| 1 | Discovery Intake | Defines board-level value streams (outcome-driven, 2–4 max) |
| 2 | Discovery Intake | Extracts stages, roles, tech, pain points per VS |
| 3 | Stage Wizard Step 2 | Friction assessment — observations + binding constraint |
| 4 | Stage Wizard Step 3 | Vendor enrichment — technology features per friction point |

All passes run at `temperature: 0` for deterministic output.

### PPIT
People, (Activities), Information, Technology — the four layers that describe HOW a capability operates. Toggled on/off in the Stage View toolbar.

### Binding Constraint
The single highest-leverage friction point — the one that cascades through the most downstream activities. Highlighted in red on the Stage View.

---

## Working on the Frontend

**Stack:** React 18 + Vite + Tailwind CSS + Zustand  
**Deployment:** Vercel (auto-deploy from GitHub main)

**Key files:**
- `store/canvas-store.ts` — all state, `enrichVersion` counter, `loadHeatmap`, `selectVs`
- `store/scaffold-resolver.ts` — resolves metric measure IDs to inline values
- `store/network-derivation.ts` — DAG topology, node/edge derivation
- `components/StageWizard.tsx` — three-step wizard bar (Stage View toolbar)
- `components/UserGuidePanel.tsx` — fixed bottom-left contextual guide
- `components/DiscoveryIntake.tsx` — four-pass intake form
- `components/FrictionPanel.tsx` — editable friction overlay panel
- `components/CanvasView.tsx` — Stage View orchestrator
- `components/NetworkView.tsx` — Network View orchestrator
- `fixtures/vendor-libraries/salesforce-agentforce.json` — 47 features, customer stories

**Running locally:**
```bash
cd frontend
npm install
npm run dev
```

---

## Key Architecture Decisions to Know

**enrichVersion pattern:** `loadHeatmap` increments `enrichVersion` in the store. `FrictionPanel` uses `key={selectedActivityId-enrichVersion}` to force remount after enrichment, ensuring updated observations (with solutions) are picked up from local state.

**selectVs after enrichment:** After Pass 4 completes, `selectVs(currentVsId)` is called to re-derive `heatmapData` from the updated `heatmapsByVs` map.

**scaffold-resolver guard:** `resolveScaffoldMeasures` returns early if `elements.metrics` is missing or empty — discovery-generated scaffolds may not have a metrics collection.

**Temperature 0:** All API calls use `temperature: 0`. Never change this without recording it as a decision — it affects output reproducibility.

---

## Collaboration Protocol

### For AI Participants
1. Read `CURRENT-STATE.md` first — it's one page
2. Read `ARCHITECTURE.md` and `DESIGN-PRINCIPLES.md` before UI changes
3. Follow the Reviewer's activity statement rules (Verb + Object, 6–12 words, no conjunctions)
4. Follow colour semantics: blue=roles, violet=activities, amber=info, emerald=tech
5. Update `SESSION-LOG.md` with what you changed
6. Update `DECISIONS.md` for any non-trivial design choice (next number: D-041)
7. Update `CURRENT-STATE.md` to reflect new stable state

### For Terry
- Upload relevant docs from `/docs` at the start of each session
- Commit all outputs to repo after each session
- Share production URL with Daniel after stable deploys

### For Daniel
- Use the QuickStart guide (`VCC_QuickStart_Daniel.docx`) for first run
- Run a full transcript → generate → assess → enrich flow before reporting feedback
- Note which VS and which stage produced unexpected results

---

## Anti-Patterns to Avoid

1. **Don't restate capabilities as activities** — activity text ≠ capability name in different words
2. **Don't use composite activities** — "Process payment and send confirmation" is two activities
3. **Don't vary edge stroke widths** — uniform encoding discipline
4. **Don't add colours without semantic meaning** — every colour must mean something
5. **Don't skip the Decisions log** — if you chose between options, record it
6. **Don't treat IR as canonical** — it's a workspace, not a deliverable
7. **Don't run Pass 3/4 at temperature > 0** — breaks output reproducibility
8. **Don't gate "Open in Canvas" on saving** — was reversed in D-033, don't reintroduce
