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
- D-003 through D-012 (network topology, edge encoding, enterprise structure)
- v0.2.0 tagged

---

## Session 3 — Sunday 23 Feb 2026 (evening) / Monday 24 Feb

### Theme: IIBA Pipeline
- Designed PDS Addendum A (engagement automation architecture)
- Created IR specification (intermediate representation)
- Built XLSX → IR parser and IR → Scaffold generator
- Generated IIBA scaffold from BA model spreadsheet (6 VS, 28 stages)
- Two-layer network topology for IIBA

### Key Decisions
- D-013 through D-016 (IR transience, LLM governance, scoped enterprise enrichment)

---

## Session 4 — Monday 24 Feb 2026

### Theme: Stage View Refinement + PPIT Content
- Stage card layout fixes, metrics into Structure pane
- 233 atomic activities across 70 capabilities (Verb + Object pattern)
- "Process" layer renamed to "Activities" throughout
- Navigation restructure: scaffold selector → Network View, VS selector on Stage View
- Info icon tooltips (direction-aware, card-width)
- Colour alignment across toolbar and badges
- Full docs folder created: ARCHITECTURE, DESIGN-PRINCIPLES, SESSION-LOG, DECISIONS, CURRENT-STATE, INVENTORY, HANDOFF, WORKFLOW

### Key Decisions
- D-017 through D-022

---

## Session 5 — Saturday 28 Feb 2026

### Theme: Presales Discovery — Puretec Proof of Concept
- Puretec Water Filtration scaffold generated from live discovery transcript (4 VS, 13 stages)
- Two heatmaps: Channel Sales Execution + Customer Maintenance
- Schema iterative validation: 179 → 0 blocking errors
- UI fixes: StageColumn height, CSS after folder move
- Design refresh: Deep Obsidian/Slate palette, Cinnabar Oxide binding state
- Demo to Daniel Roach — strong positive reaction
- Three-agent presales pipeline defined (Ingestion → Scaffold → Assessment)
- F-001 Feature Spec: Editable Friction Panel authored

### Key Decisions
- D-023 through D-027

---

## Sessions 6–7 — 1–3 Mar 2026

### Theme: Discovery Intake + In-Browser Pipeline

**Discovery Intake form:**
- Full React form: org name, industry, roles, pain points, tech stack, transcript paste
- Readiness scoring: Commercial, Operational, Technical signals
- Gap recommendations before generation
- Success screen with Save Bundle + Open in Canvas

**Two-pass extraction:**
- Pass 1: Board-level value stream definition (outcome-driven, 2–4 VS max)
- Pass 2: Stage/role/tech/pain point extraction anchored to confirmed VS names
- Fixes VS/stage conflation bug in heatmap anchor IDs

**Pass 3 friction assessment:**
- Runs after scaffold construction in `generateIR()`
- Produces friction observations + binding constraint per VS

**Scaffold builder:**
- Constructs canonical JSON from form data
- "Open in Canvas" wired to load scaffold into Zustand + navigate to Network View

### Key Decisions
- D-028 through D-034

---

## Session 8 — 4 Mar 2026 (morning)

### Theme: New Laptop Baseline + Housekeeping
- New laptop setup confirmed, all dependencies installed
- Sessions 6–7 consolidated into SESSION-LOG
- Decisions D-028–D-034 added to DECISIONS.md
- Two work items queued: two-pass extraction rewrite, Daniel feature (friction → SF features)

---

## Session 9 — 4 Mar 2026

### Theme: Four-Pass Pipeline, Stage Wizard, User Guide Panel

**Pass 3 on demand:**
- Friction assessment no longer auto-runs at Generate time
- Runs from Step 2 of the Stage Wizard when rep clicks "▶ Run new"
- Discovery-generated bundles that include a heatmap show it as pre-loaded in Step 2

**Pass 4 — Vendor solution enrichment:**
- Salesforce Agentforce feature catalogue (47 features, 4 categories)
- Friction category → feature type matching guidance in prompt
- Per-observation `solutions[]` with `VendorFeatureRef`, rationale, customer story IDs
- Customer story cards rendering from fixture catalogue — full pipeline confirmed working

**Stage Wizard (`StageWizard.tsx` — new):**
- Replaces `ContentSelectors` across the top of Stage View
- Three explicit steps: Scaffold → Assess Friction → Enrich Solutions
- Each step: Load previous (file picker) or Run new (AI pass)
- Step badges: numbered → tick when complete
- VS selector in Step 1; vendor picker dropdown in Step 3
- Steps 2 and 3 show re-run / re-load options when already complete

**User Guide Panel (`UserGuidePanel.tsx` — new):**
- Fixed bottom-left, always visible, collapsible
- Six states: empty, network, stage-no-assessment, stage-assessed, stage-enriched
- Each state: Where you are / What you're looking at / Next steps
- Progress dots (Discovery → Network → Friction → Solutions)
- Replaces all scattered coloured hint banners

**Discovery Intake fixes:**
- "Open in Canvas →" no longer gated on saving bundle first
- FileLoader labelled "Load a saved VCC Bundle (.json)" for clarity
- `bundleSaved` state removed

**Null guard fixes (binding constraint on secondary VSs):**
- `FrictionPanel.tsx` — 7 patches
- `CanvasView.tsx` — 4 patches
- `FrictionOverlay.tsx` — 1 patch
- `network-derivation.ts` — 1 patch

**Store fixes:**
- `enrichVersion` counter added to `canvas-store.ts`, increments on every `loadHeatmap`
- `FrictionPanel` keyed on `${selectedActivityId}-${enrichVersion}` — forces remount after enrichment so solutions render
- `selectVs(currentVsId)` called after enrichment to re-derive `heatmapData` from updated store

**scaffold-resolver fix:**
- `resolveScaffoldMeasures` crashed when scaffold had no `elements.metrics` collection
- Guard added: early return if metrics missing or empty
- Leftover `console.log` debug statement removed

**Temperature stabilisation:**
- `temperature: 0` added to all four API calls for deterministic output

**Daniel QuickStart guide:**
- `VCC_QuickStart_Daniel.docx` produced — four-step rep workflow, what to see at each step, tips

**Files created/modified this session:**
- `src/components/StageWizard.tsx` *(new)*
- `src/components/UserGuidePanel.tsx` *(new)*
- `src/components/ContentSelectors.tsx` *(superseded by StageWizard)*
- `src/components/DiscoveryIntake.tsx`
- `src/components/FrictionPanel.tsx`
- `src/components/CanvasView.tsx`
- `src/components/FrictionOverlay.tsx`
- `src/store/canvas-store.ts`
- `src/store/scaffold-resolver.ts`
- `src/store/network-derivation.ts`
- `src/App.tsx`

### Key Decisions
- D-035: Pass 3 runs on demand from Stage Wizard, not automatically at Generate time
- D-036: Stage Wizard replaces ContentSelectors as the primary Stage View toolbar
- D-037: User Guide Panel (fixed bottom-left) replaces contextual hint banners
- D-038: Load previous / Run new pattern for Steps 2 and 3 (supports Q1/Q2/Q3 re-use)
- D-039: enrichVersion counter forces FrictionPanel remount after enrichment
- D-040: temperature: 0 across all passes for stable, repeatable output

---

## Pending Work

### Immediate
1. Customer story filtering by industry/size — match stories to client profile
2. Dummy discovery datasets — 2–3 fictitious non-Salesforce demos for Daniel
3. PDS update — document what's been built since original scope

### Pipeline
4. Formalise four-agent presales pipeline in WORKFLOW.md
5. Export enriched bundle (scaffold + heatmap with solutions) as download
6. Populate TransformationPane with painpoints/ideas/requirements schema

### Future
7. F-001 phase 2: delete observations, reassign binding constraint, persist edits
8. Multi-vendor support (vendor library beyond Salesforce)
9. Anchor roles/info/tech to specific activities (currently capability-level)
10. Enterprise banking scaffold with full enrichment on 1–2 exemplar streams

---

## Session 8 — Thursday 5 Mar 2026

### Theme: Transformation Layer — User Story Generation

**Context:**
- Transformation use case is distinct from presales (Daniel/Salesforce). No vendor mapping needed.
- Goal: SBRs (friction observations) → Transformation User Stories → delivery sprints (Jira).
- Network outage had erased previous context on this work. Session reconstructed from uploaded `TransformationPane.tsx` and project docs.

**Type system additions (`types.ts`):**
- Added `TransformationUserStory` interface after `HeatmapData`
- Fields: `storyId`, `observationId`, `activityId`, `asA`, `iWant`, `soThat`, `acceptanceCriteria[]`, `storyPoints`, `priority`, `epicId`, `status`, `createdAt`, `updatedAt`
- Status lifecycle: `draft → ready → sprint → done`
- Priority derived from friction score: ≥8.5=critical, ≥7=high, ≥5=medium, <5=low
- Added `toJiraExport()` utility function — converts story to Jira CSV import row

**Store additions (`canvas-store.ts`):**
- Added `userStoriesByActivity: Record<string, TransformationUserStory[]>` to state
- Added `saveUserStory(activityId, story)` — upsert by storyId
- Added `setActivityStories(activityId, stories)` — full replace for bulk updates
- Added `getAllUserStories()` — flattens all stories across activities for export
- `reset()` clears `userStoriesByActivity`

**`TransformationPane.tsx` — full rewrite:**
- `SBRCard`: renders friction observation + nested user stories + "Generate User Story" button
- `UserStoryCard`: As a / I want / So that in line-broken format, Acceptance Criteria bulleted list, status pill (click to cycle), story points, priority, epic ID, edit pencil
- `StoryEditor`: inline edit form for all story fields including Epic ID for Jira grouping
- `callGenerateUserStory()`: calls `/api/claude` proxy with system prompt encoding story generation rules — role specificity, verb-first iWant, quantified soThat, 3-5 binary ACs, Fibonacci points, priority from score
- Summary mode shows `N SBRs · N Stories · N Controls` compact line when card not expanded
- `summaryOnly` set to `false` globally (was gating full render behind card selection)

**`StageCard.tsx` — 3-line change:**
- Added `useCanvasStore` import
- Pulled `userStoriesByActivity` and `setActivityStories` from store
- Added `userStories` and `onStoriesChange` props to `<TransformationPane>` call

**Debugging resolved:**
- Initial deployment showed no change — root cause: old `TransformationPane.tsx` still in repo (outputs not copied in)
- Generate button silently failing — root cause: direct `api.anthropic.com` call blocked by CORS; fixed by routing through `/api/claude` Vercel proxy
- Correct file path confirmed: `packages/frontend/src/components/canvas/` (not `src/canvas/`)

**Output quality observed:**
- Generated story for Credit Risk Control SBR: "As a Credit Controller, I want to access real-time credit exposure calculations... So that I can prevent credit losses..." — 6 ACs, 8 pts, Critical
- Generated story for Order Management SBR (binding): 5 ACs, 13 pts, Critical — correctly weighted

**Ofluv scaffold and heatmap uploaded:**
- `ofluv-scaffold.json`: 12 VS, only OTC fully populated (8 activities, 6 capabilities, 4 metrics), 11 VS stubs
- `ofluv-heatmap-otc.json`: 6 SBRs anchored to OTC activities, binding constraint on `act_otc_receive_validate_order`
- Enhancement in progress: adding capabilities and metrics to stub VS

### Key Decisions
- D-041: TransformationPane serves transformation use case only — no vendor/solution mapping
- D-042: SBRs anchor to Activity in schema; Capability context shown in UI as label (no schema change)
- D-043: User stories stored in Zustand keyed by activityId — no backend, in-memory only
- D-044: Story generation routes through `/api/claude` proxy — never direct to `api.anthropic.com` from browser
- D-045: `summaryOnly=false` globally for now — revisit when expansion UX is designed properly

---

## Session 10 — 6 Mar 2026

### Theme: Design Spar — Use Case Separation + PDS Review

**Context recovery:**
- Session 9 ended mid-delivery due to connection drop; DiscoveryIntake.tsx was being rewritten
- Uploaded files confirmed Sessions 6–9 code state intact across all files except DiscoveryIntake.tsx
- DiscoveryIntake.tsx in repo is pre-Session-9 version (bundleSaved gate still present, temperature: 0 missing)
- Decision number collision identified and resolved: Session 8 (5 Mar) decisions renumbered D-041–D-045

**Decision to pause implementation:**
- Recognised that VCC has grown to serve three distinct use cases without a formal design review:
  1. **Board Friction Canvas** — structural operating model diagnosis for boards and architects
  2. **Presales Discovery Canvas** — rapid discovery-to-diagnostic workflow for pre-sales reps (Daniel/Salesforce)
  3. **Transformation Planning Canvas** — SBR-to-user-story pipeline for delivery teams (Henrik/Cordial/Volvo)
- These use cases share a data model but have different workflows, UX requirements, and buyer contexts
- Continuing to build without resolving this creates compounding UX and architectural confusion

**Design spar initiated:**
- Approach C selected: brief external reviewer (GPT/Reviewer) cold, bring response back, spar on delta
- Briefing document produced: `VCC_DesignSpar_Briefing_GPT.md`
- Briefing covers: data model, three use cases, four-pass pipeline, UX architecture, six named tensions
- Six tensions submitted for challenge:
  1. One product or three modes?
  2. Pipeline as universal entry point
  3. Scaffold ownership (architect vs LLM vs pre-built)
  4. StageWizard linear steps vs branching use case workflows
  5. Vendor enrichment vs transformation planning (two answers to same question?)
  6. Heatmap accumulation — is the data model doing too much?

**Planned outputs from this session:**
- Reviewer response → design spar → settled positions on the six tensions
- Updated PDS reflecting three use cases, pipeline architecture, UX model
- Code review of current codebase against agreed design
- Refactor plan (may span multiple sessions)

### Key Decisions
- D-046: Pause implementation; complete design spar + PDS update before further feature work
- D-047: Session 10 is a design day — spar → PDS → code review → refactor plan

---

## Pending Work (updated 6 Mar 2026)

### This Session
1. Design spar with external Reviewer — six tensions, briefing sent
2. PDS update — reflect three use cases, pipeline architecture, UX model
3. Code review — audit codebase against agreed design
4. Refactor plan

### Deferred Until After Design Spar
5. DiscoveryIntake.tsx fix — remove bundleSaved gate, add temperature: 0, strip scaffold for Pass 4
6. Enhance Ofluv scaffold — add 2-3 capabilities per stub VS + associated metrics
7. Jira export button — getAllUserStories() store action ready, needs CSV download trigger
8. Resolve 30 residual metric schema warnings in Puretec scaffold
9. Customer story filtering by industry/size
10. Dummy discovery datasets — 2-3 fictitious non-Salesforce demos for Daniel

### Pipeline (Post-PDS)
11. Formalise use-case-aware pipeline architecture in WORKFLOW.md
12. Build Friction Signal Agent (Track B)
13. Markdown export of scaffold + heatmap for human review

### Future
14. F-001 phase 2: delete observations, reassign binding constraint, persist edits
15. Anchor roles/info/tech to specific activities (not whole capability)
16. Story expansion UX: replace summaryOnly=false global with proper expand/collapse trigger
17. Multi-vendor support beyond Salesforce
