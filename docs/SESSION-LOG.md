# Session Log

Chronological record of what was built, decided, and learned.

---

## Session 1 — Saturday 22 Feb 2026

### Theme: Foundation
- Built initial VCC frontend: React + Vite + Tailwind + Zustand
- Created canvas store with scaffold loading and validation
- Implemented Stage View with five-layer cognitive hierarchy
- Component extraction: monolith → 12 focused components in `canvas/` subfolder
- Created enterprise banking scaffold (7 VS) for demo
- Created heatmaps for Credit Risk Assessment and Regulatory Reporting
- PPIT layer toggles (Roles, Process, Info, Tech) on toolbar

### Key Decisions
- D-001: Stage card cognitive hierarchy order
- D-002: Component extraction pattern
- v0.1.0 tagged

---

## Session 2 — Sunday 23 Feb 2026

### Theme: Enterprise Level
- Built Network View as default landing for multi-VS scaffolds
- DAG layout with longest-path layer assignment
- Edge derivation from outcome chains
- DFS cycle detection (replaced Kahn's which failed on cyclic graphs)
- Two-layer zone model (Ecosystem / Knowledge)
- Cross-stream outcome contracts with solid/dashed edge encoding
- Drill-through: click VS node → Stage View

### Key Decisions
- D-003: Network View as default landing
- D-004: Left-to-right DAG layout
- D-005: DFS back-edge detection
- D-006: Feedback triggers at VS level
- D-007: Network derivation before validation
- D-008: Client-side canvas generation
- D-009: Scaffold integrity enforcement on heatmap load
- D-010: Enterprise stub banner
- D-011: Visual encoding hierarchy for nodes
- D-012: Edge visual hierarchy
- v0.2.0 tagged

---

## Session 3 — Sunday 23 Feb 2026 (evening) / Monday 24 Feb

### Theme: IIBA Pipeline
- Designed PDS Addendum A (engagement automation architecture)
- Created IR specification (intermediate representation)
- Built XLSX → IR parser (`parse_xlsx.py`)
- Built IR → Scaffold generator (`generate_scaffold.py`)
- Generated IIBA scaffold from BA model spreadsheet (6 VS, 28 stages)
- Created IIBA discovery questionnaire template
- Two-layer network topology for IIBA (Ecosystem: 4 VS, Knowledge: 2 VS)

### Key Decisions
- D-013: IR is transient, not canonical
- D-014: LLMs propose, humans dispose
- D-015: Track A first, single agent only
- D-016: Scoped enterprise enrichment

---

## Session 4 — Monday 24 Feb 2026

### Theme: Stage View Refinement + PPIT Content

**Stage card layout fixes:**
- Removed capability truncation (was sliced to 3)
- Removed analytics pane heatmap gate
- Consolidated metrics into Structure pane
- Renamed AnalyticsPane → TransformationPane
- Column height equalisation (items-stretch + flex-1 + maxMetricRows)
- Entry/exit state sizing (10px, px-2, py-0.5)
- VS description: line-clamp-3 → line-clamp-4, shaded box

**PPIT content enrichment:**
- Created `ppit_assignments.py` with 70 capability-level assignments
- Each capability gets specific roles (not stage-inherited), process, info objects, tech apps
- Reviewer feedback: "Process" was narrative, not process → rewrote as atomic verb-object activities
- 233 atomic activities following Verb + Object pattern
- Renamed "Process" layer → "Activities" throughout
- Badge counts changed from `R3` to `R2 A5 I3 T3`

**Navigation restructure:**
- Scaffold selector moved from Stage View → Network View
- VS selector added to Stage View (dropdown with all 6 VS)
- Breadcrumb: "Enterprise" → scaffold name (clickable, returns to Network)

**Info tooltips:**
- Stage header: ⓘ icon with hover tooltip showing stage description
- Capability: ⓘ icon with hover tooltip showing capability description
- Tooltip styling: pale blue (bg-blue-50), direction-aware (down for first cap, up for others)
- Tooltips use card-relative positioning (inset-x-0) to prevent overflow

**Colour alignment:**
- Toolbar layer toggle colours matched to capability badge colours
- Roles=blue, Activities=violet, Info=amber, Tech=emerald (consistent everywhere)

### Key Decisions (this session, not yet numbered)
- Metrics belong in Structure pane (state transitions + measurement)
- TransformationPane reserved for future painpoints/ideas/requirements
- Entry/exit states: 2-line clamp optimal
- Activities follow atomic Verb + Object pattern (Reviewer mandate)
- Tooltip direction: down for first capability, up for all others

---

## Session 4b — Monday 24 Feb 2026 (afternoon)

### Theme: PPIT Content, Stage Refinement, Multi-Agent Workflow

**PPIT content — first pass:**
- Created `ppit_assignments.py` with 70 capability-level assignments
- Each capability got specific roles, process description, info objects, tech apps
- Updated `generate_scaffold.py` with `_enrich_ppit()` step
- CapabilityBlock updated to read `capabilityPPIT` instead of stage-level `performedByRoleIds`
- Badge counts changed from `R3` to `R2 P1 I3 T3`
- Toolbar layer colours aligned: Roles=blue, Process=violet, Info=amber, Tech=emerald

**Reviewer intervention — ontological blur:**
- Reviewer identified "Process" layer as narrative restating capability descriptions
- Mandated atomic Verb + Object activity statements (6-12 words, no conjunctions)
- Full rewrite of all 70 capability entries: single `processActivity` string → `activities` array
- 233 atomic activities generated across 70 capabilities
- Layer label renamed "Process" → "Activities" throughout
- CapabilityBlock renders activities as stacked violet bullet items (primary visual weight)
- Roles/info/tech remain secondary chips below

**Navigation restructure:**
- Scaffold selector moved from Stage View → Network View
- VS selector dropdown added to Stage View (native `<select>`, all 6 VS)
- Breadcrumb: "Enterprise" text → scaffold name (e.g. "IIBA Operating Model"), click returns to Network

**VS description styling:**
- Widened to `max-w-4xl`, `line-clamp-4`
- Placed in shaded `bg-gray-50` rounded box
- Added `pt-1` padding before Accountable Stakeholder

**Info icon tooltips:**
- Stage header: ⓘ icon with hover tooltip showing stage description
- Capability: ⓘ icon with hover tooltip showing capability description
- Initial colour: dark (bg-gray-900) → changed to vcc-700 → final: pale blue (`bg-blue-50 text-blue-800 ring-1 ring-blue-200`)
- Capability tooltip width: w-48 → w-64 → w-72 → card-width (`inset-x-0` on relative card)
- Removed caret arrows (clipPath was masking content)
- Direction-aware: down for first capability (`top-full`), up for others (`bottom-full`)
- Passed `isFirst` prop from StageCard to CapabilityBlock

**Entry/exit state sizing:**
- Text: 11px → 10px
- Padding: px-3 → px-2, py-1 → py-0.5

**Multi-agent workflow formalisation:**
- Created `/docs` folder with 8 documents
- `ARCHITECTURE.md` — full system overview, data model, component tree
- `DESIGN-PRINCIPLES.md` — all Reviewer rules distilled
- `SESSION-LOG.md` — chronological build record
- `INVENTORY.md` — file-by-file inventory
- `HANDOFF.md` — onboarding guide for new participants
- `DECISIONS.md` — 22 numbered decisions (D-001 through D-022)
- `CURRENT-STATE.md` — one-page status (Reviewer's specification)
- `WORKFLOW.md` — multi-agent coordination contracts and output formats

### Decisions This Session
- D-017: Metrics in Structure pane
- D-018: TransformationPane for future artefacts
- D-019: Atomic Verb-Object activities
- D-020: Capability-level PPIT
- D-021: Scaffold selector on Network View
- D-022: Info icon tooltips over inline descriptions

---

## Pending Work

### Immediate
1. IIBA discovery questionnaire (Sections 1.1, 1.2, 1.4, 2.1, 2.3, 3.1, 3.4)
2. Generate IIBA heatmap from questionnaire responses
3. Test scaffold with heatmap overlay in Stage View

### Pipeline
4. Build Friction Signal Agent (Track B) — single LLM agent, not multi-agent
5. Populate TransformationPane with painpoints/ideas/requirements schema

### Future
6. Anchor roles/info/tech to specific activities (not whole capability) — phase 2
7. Enterprise banking scaffold with full enrichment on 1-2 exemplar streams
8. Automation layer: agent-derived IR → human reconciliation → canonical scaffold
