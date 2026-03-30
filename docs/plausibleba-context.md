# PlausibleBA — Project Context Record

*Last updated: 17 March 2026*
*Separate from VCC context. Do not merge.*

---

## What PlausibleBA Is

A methodology-grade Claude skills library for Business Analysts. Four slash commands that produce BIZBOK-grounded capability maps, concept models, and value streams from any business description — with interactive visualisations as the primary deliverable and XLSX/JSON as on-demand exports. A single `/plausibleba` orchestrator runs all three in sequence and delivers a complete bundle.

**Tagline:** Just enough business architecture. For every BA, on every project.

**Positioning:** Intentionally ambiguous — "Plausible BA" reads as Business Analyst to the IIBA crowd and Business Architecture to the Guild crowd simultaneously. The skills enlist BAs to do business architecture at project scope, without requiring Guild certification or full BIZBOK mastery.

**Grounding:** BIZBOK (Business Architecture Guild) — NOT BABOK. The Capsicum Triad (Party/Record/Resource) grounds the concept model classification. REA theory (McCarthy 1982) and Bunge's ontology underpin the triad.

---

## Infrastructure

| Asset | Status |
|-------|--------|
| plausibleba.com | ✅ Live — website built and deployed |
| plausibleba.io | ✅ Registered |
| github.com/plausibleba | ✅ Organisation created |
| github.com/plausibleba/ba-skills | ✅ Public repo — skills at v1.5.0 (pending push) |
| plausibleba.com/canvas | ✅ Live — accepts ba-skills-bundle.json, renders all three artefacts |
| Substack | ⏳ Not yet set up |
| LinkedIn company page | ⏳ Not yet set up |
| X/Twitter @plausibleba | ⏳ Not yet claimed |

---

## Skills — Current State (v1.5.0)

### ba-plausibleba (NEW)
- Command: `/plausibleba`
- Purpose: Orchestrates all three skills in sequence — Capability Map → Concept Model → Value Stream
- Single entry point for full business architecture sessions
- Progress indicator shows Phase N of 3 throughout
- Downloads deferred until bundle is complete at end of Phase 3
- Outputs: `[organisation]-ba-skills-bundle.json` + optional XLSX per artefact
- Checkpoints: 5 total (2 for capability map, 1 each for concept model and value stream, 1 bundle confirm)

### ba-capability-mapping
- Command: `/capability-map` (standalone — power users)
- Output: Interactive treemap (PRIMARY) → XLSX on demand
- Treemap: L1 containers (blue=Execution, purple=Governance), L2 sub-groups, L3 hoverable tiles
- Checkpoints: 2 (L1/L2 draft, full map draft)
- XLSX: 4-tab workbook (Summary, Register, Validation, Legend)
- Now references `/plausibleba` as recommended entry point

### ba-concept-model
- Command: `/concept-model` (standalone — power users)
- Output: Interactive concept graph (PRIMARY) → XLSX on demand
- Graph: Party=teal circle, Resource=blue circle, Record=pink rectangle; click for definition + lifecycle
- Checkpoints: 1 (classification + relationships)
- Now references `/plausibleba` as recommended entry point

### ba-value-streams
- Command: `/value-stream` (standalone — power users)
- Output: Interactive stage view (PRIMARY) → XLSX on demand
- Stage view: Outcome chain + stage cards + PPIT dots + detail panel on click
- Checkpoints: 1 (stage draft validation)
- Exports: ba-skills-bundle.json for VCC pipeline
- Now references `/plausibleba` as recommended entry point

### Dark mode contrast fixes (v1.5.0)
All three visualisation specs updated:
- Secondary text: `#64748b` → `#94a3b8`; dim labels: `#475569` → `#94a3b8`
- Tile/panel background opacity boosted (0.03→0.06, 0.05→0.09)
- Lifecycle pills: text `#94a3b8`→`#cbd5e1`, border opacity doubled

---

## Repository Structure

```
ba-skills/
├── .claude-plugin/marketplace.json       (ba-plausibleba listed first)
├── ba-plausibleba/                        (NEW in v1.5.0)
│   ├── .claude-plugin/plugin.json        (v1.5.0)
│   ├── commands/plausibleba.md
│   └── skills/ba-plausibleba/SKILL.md
├── ba-capability-mapping/
│   ├── .claude-plugin/plugin.json        (v1.5.0)
│   ├── commands/capability-map.md
│   └── skills/
│       ├── ba-capability-mapping/SKILL.md
│       └── ba-taxonomy-standard/SKILL.md
├── ba-concept-model/
│   ├── .claude-plugin/plugin.json        (v1.5.0)
│   ├── commands/concept-model.md
│   └── skills/
│       ├── ba-concept-model/SKILL.md
│       └── ba-taxonomy-standard/SKILL.md
├── ba-value-streams/
│   ├── .claude-plugin/plugin.json        (v1.5.0)
│   ├── commands/value-stream.md
│   └── skills/
│       ├── ba-value-streams/SKILL.md
│       └── ba-taxonomy-standard/SKILL.md
└── examples/
    ├── ba-skills-bundle.schema.json
    ├── portfolioprop_ba-skills-bundle_v1.json
    ├── portfolioprop_capability_map_v2.xlsx
    ├── portfolioprop_concept_model_v1.xlsx
    └── portfolioprop_value_stream_v1.xlsx
```

**Local path on Terry's Mac:** `~/projects/vcc/packages/frontend/ba-skills`

**Note:** The ba-skills directory also lives inside the VCC repo. The VCC repo is the single source of truth for skill prompts. The GitHub plausibleba/ba-skills repo mirrors this for public install.

---

## ba-skills-bundle Schema (v1.0.0)

VCC import format. PlausibleBA writes structural layers; VCC adds analytical layers.

```
elements:
  capabilities        L1/L2/L3 hierarchy
  concepts            Party/Record/Resource typed
  valueStreams        trigger, terminalOutcome, layoutZone
  valueStreamStages   outcome chain, capabilities, PPIT
  outcomes            entry/exit criteria
  roles               derived from Party concepts
  metrics             name, unit, direction
  informationObjects  derived from Record/Resource concepts
```

VCC adds: frictionObservations, solutions, controls, userStories, throughputProjections.

---

## PlausibleBA Canvas (plausibleba.com/canvas)

**Deployed on Vercel** (moved from GitHub Pages on 19 March 2026). Connected to `plausibleba/website` repo.

**Two entry paths:**
1. **Direct intake (NEW):** Paste meeting notes / upload files → email gate → 3-pass LLM pipeline → full operating model rendered
2. **Bundle drop:** Drop `ba-skills-bundle.json` or VCC bundle → renders immediately

**What it renders:**
- Capability map (treemap with L1/L2/L3 hierarchy)
- Concept model (Capsicum Triad: Party/Record/Resource columns)
- Value streams (stage view with outcomes, capabilities, metrics)
- Metrics
- JSON download button

**Direct intake pipeline:**
- Pass A1: Value stream extraction (8K tokens)
- Pass A2: Capability mapping + roles (12K tokens)
- Pass B: Scaffold formalisation (32K tokens)
- Post-processing: Capability hierarchy injection + selective concept derivation
- Prompts aligned with VCC pipeline (identical)
- API: `/api/generate` Edge Runtime proxy on Vercel, `ANTHROPIC_API_KEY` env var

**Email gate:**
- First name, last name, email required before generation
- 3 free generations per email address
- Rate limiting via Vercel KV (in-memory fallback until KV provisioned)
- File uploads: .txt, .md, .csv, .xlsx, .docx, .pdf (binary parsing via CDN libs)

**Demo path:** "Load PortfolioProp demo" link — confirmed working.

**Current status:**
- Direct intake: deployed and working ✅
- PortfolioProp bundle renders correctly ✅
- TradieBot PDF tested through Canvas — produces 5 VS, 26 capabilities, 26 concepts ✅
- Prompt alignment with VCC confirmed ✅
- "Open in VCC" button not yet wired up — pending

---

## Reference Case Studies

### PortfolioProp (canonical)
Short-stay and long-term rental portfolio management platform.
- 64 capabilities, L1:8 / L2:21
- 14 concepts
- 1 value stream
- Bundle: `examples/portfolioprop_ba-skills-bundle_v1.json`
- Canvas render: confirmed ✅
- VCC import: confirmed ✅

### Dough-to-Door
Food delivery platform. Used for cold-run testing across all 3 skills.
- All 3 skills confirmed working on this domain
- Bundle: needs regeneration with v1.5.0 skills
- Canvas render: pending v1.5.0 bundle test

---

## Cowork Install Workflow

**Install:** Customize → Skills → Browse Plugins → Personal → + → `plausibleba/ba-skills` → Install each skill

**Update:** `···` → Remove marketplace → re-add → reinstall (picks up latest version)

**Update button** greyed out = version in plugin.json matches GitHub. Bump version to activate.

**Version bump pattern:**
```bash
cd ~/projects/vcc/packages/frontend/ba-skills
git add -A
git commit -m "v1.5.0 — /plausibleba orchestrator, contrast fixes, bundle-first flow"
git tag v1.5.0
git push origin main
git push origin v1.5.0
```

---

## Event Deadlines

| Event | Date | Required |
|-------|------|---------|
| Guild Summit | 23 March 2026 | Skills live at v1.5.0, website live, Substack launched |
| IIBA BBC Event | Mid April 2026 | 2+ skills live |
| Australian BA Leadership Summit | 12 May 2026 | 3 skills live + full pipeline demo |

---

## Content Plan

### Substack Series (plausibleba.substack.com)
- Post 1: "Why BAs should be doing business architecture (and why they're not)"
- Post 2: "Just enough biz arch — a new standard for project-scoped architecture"
- Post 3: "The three things every BA should map before writing a requirement"
- Post 4: "How we built a BIZBOK-grounded skill library on Claude Cowork"

### Website Pages (plausibleba.com)
1. Home — tagline, hero, 3-skill overview, CTA to install
2. Skills — detail on each skill with screenshot/gif
3. Install — the install guide (also at /install)
4. Methodology — BIZBOK grounding, Capsicum Triad, VCC pipeline
5. Case Studies — PortfolioProp, Dough-To-Door
6. Blog — Substack embed or mirror
7. About — Terry + Daniel, PlausibleBA mission
8. Canvas — `/canvas` page live ✅

---

## Pending Items

- [ ] Push v1.5.0 to GitHub (`git tag v1.5.0 && git push origin main && git push origin v1.5.0`)
- [ ] Reinstall skills in Cowork at v1.5.0
- [ ] Run `/plausibleba Dough-to-Door` smoke test — confirm new orchestrator flow works
- [ ] Produce fresh Dough-to-Door bundle and test on plausibleba.com/canvas
- [ ] Explore seamless skill → canvas transfer (auto-redirect or deep link)
- [ ] Set up Substack (plausibleba.substack.com)
- [ ] Write Post 1 and Post 2 (pre-Guild Summit)
- [ ] Create LinkedIn company page
- [ ] Claim X/Twitter @plausibleba
- [ ] Regenerate PortfolioProp Concept Model XLSX (stale — uses old 5-type classification)
- [ ] Build ba-ppit-mapping skill (4th skill, post-Summit)

## Completed

- [x] BIZBOK vs BABOK positioning locked
- [x] "Just enough biz arch" tagline confirmed
- [x] Capsicum Triad adopted (Party/Record/Resource)
- [x] All 3 skills built and live on GitHub
- [x] All 3 skills confirmed installing in Cowork
- [x] Interactive treemap (capability map) built and embedded
- [x] Interactive concept graph built and embedded
- [x] Interactive stage view built and embedded
- [x] Visualisation moved to primary deliverable, XLSX to on-demand
- [x] Dough-To-Door cold run confirmed — all 3 skills working on novel domain
- [x] PortfolioProp reference bundle generated and VCC import confirmed
- [x] ba-skills-bundle schema locked at v1.0.0
- [x] Install guide written (install-guide.html)
- [x] Website live at plausibleba.com
- [x] Canvas page live at plausibleba.com/canvas — PortfolioProp demo confirmed working
- [x] /plausibleba orchestrator command written (v1.5.0)
- [x] Dark mode contrast fixes applied across all three visualisations (v1.5.0)
- [x] Individual command files updated — reference /plausibleba as primary entry point
- [x] marketplace.json updated — ba-plausibleba listed first

---

## Key People

- **Terry Roach** — founder, orchestrator, methodology
- **Daniel Roach** — VCC collaborator (separate context)
- **Eric Broda** — Agentic Mesh; PlausibleAgents stakeholder (separate VCC context)
- **Francis (Crosslake)** — PE due diligence; PlausibleDiligence stakeholder (separate VCC context)
- **Prof Asif Gil (UTS)** — academic sponsor (governance paper context, not PlausibleBA)

---

## Relationship to VCC

PlausibleBA is the front door to VCC. The skills produce a `ba-skills-bundle.json` that imports directly into VCC. PlausibleBA owns the structural scaffold (capabilities, concepts, value streams). VCC owns the analytical layer (friction, solutions, controls, throughput).

**PlausibleBA is free. VCC is the paid platform.**

**The pipeline:**
```
/plausibleba (Cowork)
      ↓
ba-skills-bundle.json
      ↓
plausibleba.com/canvas  ← lightweight free visualiser
      ↓
"Turn this into an interactive workshopping canvas" CTA
      ↓
VCC (paid — persistence, friction, governance, multi-user)
```

The moat: PlausibleBA methodology feeds VCC. Anyone can ask Claude to draw a capability map. Almost nobody gets one that is MECE, BIZBOK-grounded, Capsicum-typed, and VCC-importable in one conversation.

*Do not merge this context with the VCC context record.*
