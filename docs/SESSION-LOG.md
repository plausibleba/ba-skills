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

## Session 5 — Saturday 28 Feb 2026

### Theme: Presales Discovery — Puretec Proof of Concept

**Context:**
- Daniel Roach (Salesforce pre-sales, Terry's son, former Capsifi dev) requested VCC demo for a live prospect
- Prospect: Puretec Water Filtration — Adelaide-based manufacturer/distributor, 15% YoY growth, 4000+ SKUs, 12-month cartridge replacement revenue model
- Source material: discovery call transcript with Daniel

**Scaffold generation — ad hoc inference:**
- No pipeline infrastructure used — scaffold generated by LLM reasoning directly from transcript
- Extracted pain points, roles, tech stack, friction signals, and value stream topology from transcript
- Generated `puretec_scaffold.json` via Python script: 4 VS, 13 stages, 18 capabilities, 72 atomic activities
- Two detailed streams (Channel Sales, Customer Maintenance), two stubs (Order Fulfilment, Installation & Support)
- Real tech stack: Salesforce, NetSuite, Meldoc, WhatsApp/SMS, Salesforce Maps, Einstein AI
- Real roles: Field Sales Rep, Customer Care Agent, Plumber Partner, Distributor, Head of Tech

**Heatmap generation — ad hoc inference:**
- Two heatmaps generated from transcript pain points: `puretec_heatmap_channel_sales.json`, `puretec_heatmap_customer_maintenance.json`
- Channel Sales binding constraint: Pre-Visit Intelligence (score 9.5) — no consolidated account brief, 3 days/week lost to admin
- Customer Maintenance binding constraint: Replacement Scheduling (score 9.5) — NetSuite-Salesforce integration failure, 9-month overrun
- 6 friction observations each, all rationale drawn verbatim from discovery call

**Schema iteration:**
- Scaffolds and heatmaps validated against live VCC validator — iterative fixes across 4 rounds
- 179 → 142 → 31 → 11 → 1 → 30 validation errors (30 residual are metric schema warnings, non-blocking)
- Key fixes: added schemaVersion/createdAt, elementType on all elements, measures as object, metric enum values, heatmap category enum mapping, removed disallowed collections (informationObjects, technologyApps), removed scaffoldIntegrityHash from heatmap root

**UI fixes this session:**
- StageColumn outer div missing `h-full` — root cause of dark lane height mismatch — fixed via sed
- CSS not loading after iCloud Drive folder move — resolved by npm install + clean Vite restart
- capabilityPPIT missing from all fixtures including Banking Reg — restored to Puretec scaffold manually
- PPIT layer toggles not rendering — root cause was missing capabilityPPIT on activity objects, not a UI bug

**Design refresh:**
- Tailwind palette replaced: blue-grey slate → Deep Obsidian/Slate (vcc-950 to vcc-50)
- Binding state: flat red-800 → Cinnabar Oxide (#7C2D2D) — urgent but not alarming
- Stage headers: flat vcc-700 → flat #2D4A6B (original blue-slate preserved)
- Badges: solid fills → glassmorphism (bg-white/10 backdrop-blur-sm border border-white/20)
- Gradients trialled and rejected — flat fills with stronger contrast perform better at this density

**Daniel Roach demo — outcome:**
- Demo completed successfully despite machine crash mid-session
- Daniel's reaction: strong positive — impressed by speed of generation from discovery transcript
- Key feedback: friction observation data should be editable in the UI
- Next step: Daniel to study content in detail, reconvene for deeper session

**Key insight — workflow implication:**
- The transcript → scaffold → heatmap pipeline was executed entirely by LLM reasoning with no infrastructure
- This defines a natural three-agent workflow for VCC presales onboarding:
  - **Discovery Ingestion Agent**: reads transcript, extracts entities (roles, pain points, tech, friction signals)
  - **Scaffold Generation Agent**: structures entities into VCC schema, generates canonical JSON
  - **Friction Assessment Agent**: scores observations, identifies binding constraint, generates heatmap
- Artefacts (scaffold + heatmap) are the decisions; conversations are the thinking

### Key Decisions
- D-023: Presales scaffold generation is viable via LLM inference from discovery transcript alone
- D-024: Three-agent presales pipeline defined (Ingestion → Scaffold → Assessment)
- D-025: Heatmap observation categories map to VCC enum: DataSignalFriction, ProcessHandoffFriction, GovernanceRiskFriction, IncentiveCapacityFriction
- D-026: scaffoldIntegrityHash not part of heatmap schema (remove from heatmap root)
- D-027: capabilityPPIT must be preserved on activity objects — not subject to schema stripping

---

## Feature Spec — Editable Friction Panel (F-001)

**Origin:** Daniel Roach feedback, Session 5 demo, 28 Feb 2026

**Problem:**
Friction observations are currently read-only. During a live presales or discovery session, a consultant needs to tune observation rationale, adjust scores, and add new observations in real time as the client reacts. Exporting and re-importing JSON to make corrections breaks the flow entirely.

**Proposed behaviour:**

*Edit mode toggle*
- Friction panel gets an "Edit" button (pencil icon) in the header alongside the existing close (×) button
- Clicking Edit switches the panel to edit mode — all static text fields become inputs
- Clicking "Save" commits changes to in-memory heatmap state; clicking "Cancel" reverts

*Editable fields per observation*
- `rationale` → textarea (multiline, auto-resize)
- `intensity.score` → number input (0–10, step 0.5)
- `category` → select dropdown (enum values: DataSignalFriction, ProcessHandoffFriction, GovernanceRiskFriction, IncentiveCapacityFriction, DecisionAuthorityFriction)
- Read-only: `observationId`, `primaryAnchor`, `contributingAnchors`, `evidence`, `observedAt`

*Binding constraint editing*
- `justification` → textarea
- `confidence` → number input (0–1, step 0.01)
- Binding anchor remains read-only (changing it requires reassigning the constraint entirely — phase 2)

*Add new observation*
- "+" button at bottom of friction panel observation list
- Opens a blank observation form pre-populated with current activity anchor
- Requires: category (select), rationale (textarea), score (number)
- On save: generates a new `observationId`, appends to heatmap observations array

*Export edited heatmap*
- "Download Heatmap" button appears in the assessment toolbar when a heatmap is loaded
- Exports current in-memory heatmap state as JSON
- Filename: `{heatmapId}-edited-{timestamp}.json`

**Implementation notes:**
- All edits are in-memory only — no backend, no persistence between page reloads
- Zustand heatmap store needs a `updateObservation(observationId, patch)` action
- Zustand heatmap store needs an `addObservation(activityId, observation)` action
- FrictionPanel component: add `editMode` boolean state, conditional rendering of inputs vs text
- Export: `JSON.stringify(heatmapState, null, 2)` + `URL.createObjectURL(blob)` download trigger
- No schema validation on edited content — trust the user, validate on re-import

**Out of scope for F-001:**
- Deleting existing observations (phase 2)
- Reassigning binding constraint anchor (phase 2)
- Persisting edits across sessions (phase 2 — requires backend or localStorage)
- Editing scaffold content (separate feature)

---

## Pending Work

### Immediate
1. ~~Demo Puretec scaffold to Daniel Roach~~ ✓ — completed Session 5, positive reaction
2. Daniel to study Puretec content and provide feedback
3. Implement F-001: Editable Friction Panel
4. Resolve 30 residual metric schema warnings in Puretec scaffold
5. IIBA discovery questionnaire (Sections 1.1, 1.2, 1.4, 2.1, 2.3, 3.1, 3.4)

### Pipeline
6. Formalise three-agent presales pipeline as WORKFLOW.md addition
7. Build Friction Signal Agent (Track B) — single LLM agent, not multi-agent
8. Populate TransformationPane with painpoints/ideas/requirements schema
9. Markdown export of scaffold + heatmap for human review (Daniel use case)

### Future
10. F-001 phase 2: delete observations, reassign binding constraint, persist edits
11. Anchor roles/info/tech to specific activities (not whole capability)
12. Enterprise banking scaffold with full enrichment on 1-2 exemplar streams
13. Automation layer: agent-derived IR → human reconciliation → canonical scaffold

---

## Session 6 — Monday 2 Mar 2026

### Theme: Discovery Intake — Open in Canvas Fix

**Bug diagnosed:**
- "Open in Canvas →" button on the Scaffold Generated success screen had no `onClick` handler
- Confirmed via browser bundle inspection — button rendered with className only, no handler wired
- `generateIR()` was a stub: 1500ms timeout then `setGenerated(true)` — no scaffold object produced

**Fix implemented:**
- `DiscoveryIntake_prod.tsx`: added `onComplete?: (scaffold: any) => void` prop
- `DiscoveryIntake_prod.tsx`: replaced stub `generateIR()` with real scaffold builder — constructs canonical scaffold JSON from form data (value streams → activities → outcomes → capabilities, roles, tech, metrics, controls all wired)
- `DiscoveryIntake_prod.tsx`: wired "Open in Canvas →" button to call `onComplete(generatedScaffold)`
- `App.tsx`: added `loadScaffold` to Zustand store destructure
- `App.tsx`: passed `onComplete` prop to `<DiscoveryIntake>` — calls `loadScaffold(scaffold)` then `backToNetwork()`

**Flow after fix:**
Discovery form → Generate scaffold → success screen → "Open in Canvas" → scaffold loads into store → Network View renders with new scaffold active

**Production URL confirmed:**
- Stable production URL: `https://frontend-five-eta-l0j2mk66gi.vercel.app`
- Deployment hash URLs (e.g. `frontend-1uopbjshx-...`) change per deploy — do not share these

**Pending:**
- Verify fix works end-to-end after Vercel redeploy
- `DiscoveryIntake_prod.tsx` should be the canonical file — confirm it replaces `DiscoveryIntake.tsx` in the import or rename accordingly

---

## Pending Work

### Immediate
1. ~~Demo Puretec scaffold to Daniel Roach~~ ✓ — completed Session 5, positive reaction
2. ~~Fix "Open in Canvas" dead button~~ ✓ — completed Session 6
3. Verify Open in Canvas end-to-end after redeploy
4. Daniel to study Puretec content and provide feedback
5. Implement F-001: Editable Friction Panel
6. Resolve 30 residual metric schema warnings in Puretec scaffold
7. IIBA discovery questionnaire (Sections 1.1, 1.2, 1.4, 2.1, 2.3, 3.1, 3.4)

### Pipeline
8. Formalise three-agent presales pipeline as WORKFLOW.md addition
9. Build Friction Signal Agent (Track B) — single LLM agent, not multi-agent
10. Populate TransformationPane with painpoints/ideas/requirements schema
11. Markdown export of scaffold + heatmap for human review (Daniel use case)

### Future
12. F-001 phase 2: delete observations, reassign binding constraint, persist edits
13. Anchor roles/info/tech to specific activities (not whole capability)
14. Enterprise banking scaffold with full enrichment on 1-2 exemplar streams
15. Automation layer: agent-derived IR → human reconciliation → canonical scaffold
