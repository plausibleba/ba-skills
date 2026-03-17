# Session Log — 17 March 2026

---

## Participants
- Terry Roach (orchestrator)
- Claude Sonnet (claude.ai — planning, strategy, docs)
- Claude Opus (Cowork — execution, code, builds)

---

## What Was Discussed (Claude.ai)

### Product Strategy
- Formally reframed VCC as a platform family under the **Plausible** brand
- Defined 8 vertical products on a shared PlausibleCore engine
- Established three-tier product inventory: Active / Active Exploration / Parked
- Confirmed D-008 (client-side only) superseded — Postgres is the direction
- Produced `PRODUCT-STRATEGY.md` — first time this document exists

### PlausibleBA
- Redesigned skill flow: `/plausibleba` orchestrator replacing three standalone commands as primary entry point
- Bundle-first model: no downloads until Phase 3 complete, single `ba-skills-bundle.json` output
- Dark mode contrast fixes applied across all three visualisation specs
- Updated all command files to reference `/plausibleba` as recommended entry point
- Updated `marketplace.json` to list `ba-plausibleba` first
- Produced `ba-skills-v2.zip` with all changes
- Updated `plausibleba-context.md` to reflect current state

### Plugin Install Issue
- Investigated GitHub marketplace install failure extensively
- Root cause identified: GitHub marketplace install is for **private repos only** — public repos require official Anthropic marketplace. Not a bug.
- Produced `SKILLS-INSTALL-ISSUE.md` diagnostic for Opus
- Produced `ANTHROPIC-BUG-REPORT.md` (submitted to Anthropic support — clarified as by-design)
- Workaround: zip upload path confirmed working for all four plugins

### Context & Docs
- Reviewed Opus's planning session summary (8 items)
- Reviewed Opus's task delivery summaries throughout the day
- Updated `plausibleba-context.md`
- Updated `PRODUCT-STRATEGY.md`

---

## What Was Built (Opus in Cowork)

### Task 1 — Postgres Bundle Loading
- TypeScript type errors in `project-store.ts` fixed
- `loadProject` → `reloadProject` → `loadScaffold` pipeline working
- Bundle load/save cycle tested end-to-end

### Task 2 — Skills Prompts Alignment
- Updated SKILL.md files in VCC repo to match ba-skills repo
- Discovery intake prompts to be decommissioned
- Single source of truth: VCC repo

### Task 3 — Canvas Format Normalisation
- `normalizeBundle()` added to canvas.html — handles unified bundles, individual skill outputs, legacy fields
- `?bundle=<URL>` and `?demo=portfolioprop` URL parameters added
- Unified Dough-to-Door bundle generated (`case-study/dough-to-door-bundle.json`)
- Canvas SKILL.md updated to offer canvas visualisation as export option

### Task 4 — Bundle/Canvas Bug Fixes (from Dough-to-Door test)
Four root causes identified and fixed:
1. VCC `isPlausibleBABundle()` now accepts `meta.scaffoldId` (not just top-level)
2. Canvas capability map: L1/L2 auto-generated from `parent` refs; `level` integer → string
3. Canvas concept edges: inferred from stage co-occurrence (23 concept pairs from 7 stages)
4. Canvas value stream: `stages` string array handled; field names normalised (`capabilities` → `requiresCapabilityIds`, `entryCondition` → `entryCriteria`)
- Files fixed: `bundle-import.ts`, `canvas.html`, `install.html`
- Verified: 8 business areas, 17 domains, 48 capabilities, 24 concept edges, 7 stages all resolving

### Task 5 — Skills v1.7.0 (from install issue)
- Migrated plugin.json schema to correct format (author, skills[], commands[] as string arrays)
- Added `ba-plausibleba` to marketplace.json
- Bumped all plugins to v1.7.0
- Generated individual plugin zips for manual upload path
- Hosted zips on plausibleba.com/install

### Task 6 — Multi-user Sharing
- `003_profiles_table.sql` migration
- `shareProject()`, `fetchProjectAccess()`, `updateAccess()`, `revokeAccess()` implemented
- `ShareDialog` component built
- ProjectList split into "My Projects" and "Shared with me"

### Task 7 — Concept/Policy Card Generation
- `pass-d-card-generation.ts` prompt written
- `card-generator.ts` LLM call with validation and error recovery
- Pipeline orchestrator updated — Pass D runs after Pass B
- `generateCards()` exported for use on imported scaffolds
- Non-fatal design — card failure does not block scaffold delivery

---

## Test Results (17 March 2026)

### Skills v1.7.0 — Dough-to-Door cold run
| Phase | Result |
|-------|--------|
| `/plausibleba` orchestrator triggered | ✅ |
| Progress header (Phase N of 3) | ✅ |
| Phase 1 Capability Map — treemap rendered | ✅ |
| Phase 2 Concept Model — graph rendered | ✅ |
| Phase 3 Value Stream — stage view rendered | ✅ |
| Bundle assembled | ✅ |

### Bundle → Canvas / VCC (pre-fix)
| Target | Result |
|--------|--------|
| VCC bundle import | ❌ "Unrecognised JSON file" |
| Canvas capability map | ❌ 0 business areas, 0 domains |
| Canvas concept model | ❌ Missing edges |
| Canvas value stream | ❌ No stage cards |

### Bundle → Canvas / VCC (post-fix, pending re-test 18 March)
- All four issues fixed by Opus
- Re-test scheduled for tomorrow

---

## Pending — Test Tomorrow

- [ ] Drop Dough-to-Door bundle on VCC — confirm loads cleanly
- [ ] Drop Dough-to-Door bundle on plausibleba.com/canvas — confirm all three tabs render
- [ ] Confirm concept model shows 24 edges
- [ ] Confirm value stream shows 7 stage cards
- [ ] Confirm PortfolioProp still works after all fixes (regression test)
- [ ] Test Substack setup
- [ ] Test full install flow for a new user (zip path)

---

## Key Decisions Made Today

| Decision | What |
|----------|------|
| Platform reframe | VCC is PlausibleCore. Plausible is the family brand. |
| D-008 superseded | Postgres is the direction. Client-side only approach retired. |
| `/plausibleba` as primary entry point | Orchestrator replaces three standalone commands for new users |
| Bundle-first | No downloads until full bundle assembled at end of session |
| GitHub install | Not a bug — by design for private repos only. Zip upload is interim path. |
| Anthropic marketplace | Submission pending. Official path once approved. |

---

## Files Produced This Session

| File | Location |
|------|----------|
| PRODUCT-STRATEGY.md | Project knowledge |
| plausibleba-context.md | Project knowledge |
| ba-skills-v2.zip | Outputs |
| SKILLS-INSTALL-ISSUE.md | Outputs / Opus |
| ANTHROPIC-BUG-REPORT.md | Submitted to Anthropic support |
| SESSION-LOG-2026-03-17.md | This file |
