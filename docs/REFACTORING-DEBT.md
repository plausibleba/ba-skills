# Refactoring Debt Register

Tracked choices where we picked expediency over elegance. Each item is a candidate for a future cleanup sprint.

---

## R-001: ~~Scattered UI state flags instead of a journey state machine~~ ✅ COMPLETE
**Filed:** 2026-03-21 | **Resolved:** 2026-04-07 (Session 31)
**What was done:** Defined `AppPhase` discriminated union (11 phase variants) as single source of truth for user journey state. All `goTo*` actions transition through `setPhase()` which derives deprecated `viewMode`/`enrichSection` for remaining internal consumers. Migrated all external consumers: SideNav (14 comparisons), App.tsx (11 boolean flags), UserGuidePanel (`deriveGuideState()` accepts `AppPhase` directly), ProjectList (`setCreatingProject` → `setPhase`), DiscoveryIntake (`setIntakeTab` → `setPhase`). Zero external `viewMode` consumers remain. Old project-store UI hints (`isCreatingProject`, `intakeTab`) deprecated.

## R-002: ~~Module info duplicated across components~~ ✅ COMPLETE
**Filed:** 2026-03-21 | **Resolved:** 2026-04-13 (Session 33)
**What was done:** Created `lib/module-registry.ts` with unified `MODULE_REGISTRY` carrying id, label, description, color, and feature flags. `module-features.ts` now re-exports from registry for backward compatibility. `ProjectList.tsx` imports `MODULE_REGISTRY` + `MODULE_IDS` (removed local `MODULE_INFO`). `UserGuidePanel.tsx` uses `getModuleLabel()` (removed inline lookup). Adding a module is now one entry in one file.

## R-003: ~~UserGuidePanel content as inline constants~~ ✅ COMPLETE
**Filed:** 2026-03-21 | **Resolved:** 2026-04-13 (Session 33)
**What was done:** Extracted all guide content to `lib/guide-content.ts` — types (`GuideState`, `GuideContent`), phase-specific constants (`CREATING_PROJECT_CONTENT`, `INTAKE_PROVIDE_CONTENT`, `INTAKE_FORM_CONTENT`), `getGuideContent()`, and `getProgressSteps()`. `UserGuidePanel.tsx` reduced from 314 to ~120 lines — pure rendering, no content ownership.

## R-004: ~~FileLoader compact mode is a boolean prop, not a variant~~ ✅ COMPLETE
**Filed:** 2026-03-21 | **Resolved:** 2026-04-13 (Session 33)
**What was done:** Split into `FileDropZone` (full mode, used in App.tsx) and `FileUploadButton` (compact, used in ProjectList.tsx). Shared file-handling logic extracted to `useFileImport()` hook. Deprecated `FileLoader` wrapper kept for backward compatibility. Zero shared JSX — each component owns its own markup; hook owns the parsing pipeline.

## R-005: Discovery Intake is a monolith (~900 lines)
**Filed:** 2026-03-21
**Where:** `DiscoveryIntake.tsx`
**What we did:** The freeform pane, structured form, extraction logic, generation pipeline, and all UI states live in a single component file.
**What we should do:** Extract into sub-components (`IntakeProvideContent`, `IntakeStructuredForm`, `ExtractionSummary` is already separate) and move pipeline orchestration into a custom hook (`useDiscoveryPipeline`).
**Payoff:** Easier to reason about, test, and extend each section independently.

## R-006: Network layout uses simple alphabetical sort within layers
**Filed:** 2026-03-21
**Where:** `network-derivation.ts` (`_layeredLayout`)
**What we did:** Replaced the hardcoded two-layer layout with a generalised N-layer layout. But column ordering within each row is just alphabetical by VS name — no intelligence about flow relationships or user preference.
**What we should do:** Allow user-draggable positioning (persisted per project), or use edge-crossing minimisation heuristic to order nodes within each row for cleaner edge rendering.
**Payoff:** Better readability of complex models with many cross-layer edges.

## R-007: Layer scheme lives in FormState, not in the project/scaffold
**Filed:** 2026-03-21
**Where:** `DiscoveryIntake.tsx` (`FormState.layerSchemeId`), `discovery-ir.ts` (`layoutZones`)
**What we did:** The layer scheme choice is captured only in the intake form state and written once into the scaffold's `layoutZones` array at generation time. There's no way to change the scheme after generation without re-running the whole pipeline.
**What we should do:** Persist the layer scheme as a project-level setting (in `project-store` or the scaffold metadata). Allow re-layering existing models by reassigning VS zones post-generation — just a metadata update, no LLM call needed.
**Payoff:** Users can experiment with different layer views of the same model. Supports the "lenses" concept.

## R-008: LLM prompts embed structural rules as long prose strings
**Filed:** 2026-03-21
**Where:** `pass-a1-value-streams.ts`, `pass-b-scaffold-formalisation.ts`
**What we did:** Each prompt is a single giant template literal mixing rules, schema examples, and dynamic context. Adding a new field (like `layoutZones`) means editing deep into the string and hoping indentation and JSON fragments stay valid.
**What we should do:** Decompose prompts into composable sections: system rules (reusable), schema template (generated from a TS type), dynamic context (injected). Consider a prompt builder pattern where sections are assembled and validated.
**Payoff:** Safer prompt changes, reusable rule fragments, easier testing of prompt variations.

## R-009: Two stores (canvas-store, project-store) with overlapping concerns — PARTIALLY ADDRESSED
**Filed:** 2026-03-21 | **Partial:** 2026-04-07 (Session 31 — R-001 resolution)
**Where:** `canvas-store.ts`, `project-store.ts`
**What we did:** R-001 moved all navigation state (`isCreatingProject`, `intakeTab`) out of project-store into canvas-store's `AppPhase`. UserGuidePanel no longer needs both stores for navigation — it reads `appPhase` from canvas-store only (still needs project-store for `currentModule`).
**What remains:** Consider whether `currentModule` belongs in canvas-store too, and whether a dedicated `ui-store` or `navigation-store` would be cleaner than growing canvas-store further.
**Payoff:** Cleaner separation of concerns, less cross-store coupling, easier to reason about state changes.

## R-010: ~~Scaffold type is `any` / `Record<string, unknown>` throughout~~ ✅ COMPLETE
**Filed:** 2026-03-21 | **Resolved:** 2026-04-07 (Session 29 — type interfaces, Session 31 — @ts-nocheck cleanup)
**What was done:** Defined comprehensive typed interfaces (`PPITEntry`, `ScaffoldElements`, `ScaffoldRole`, `ScaffoldOutcome`, `ScaffoldTechnologyApp`, `ScaffoldConcept`, etc.) across 22 files. `as any` reduced from 166 → 53 instances (68% reduction). Removed `@ts-nocheck` from network-derivation.ts and FrictionView.tsx (9 → 7 files remain). `getCapabilityIds()` helper resolves v4/v5 field ambiguity.

## R-011: LAYER_SCHEMES defined in component, not in a shared config
**Filed:** 2026-03-21
**Where:** `DiscoveryIntake.tsx`
**What we did:** The preset layer schemes (Ecosystem/Knowledge, Front/Back, Strategic/Core/Enabling, Wardley) are defined as constants inside the component file.
**What we should do:** Move to `lib/layer-schemes.ts` as an exported registry. The form, the guide, the network view zone labels, and future settings pages can all import from one place. Ties into R-002 (single registry pattern).
**Payoff:** One place to add/edit layer schemes. The form, the scaffold prompt, and the network view all stay consistent.

## R-012: No back-navigation from inside a project to the project list
**Filed:** 2026-03-21
**Where:** `App.tsx`
**What we did:** Once a project is loaded, there's no UI to go back to the project list without a full page reload. The `showProjectList` flag is derived from `!isLocalMode && !isLoaded && !isIntake` — so loading a project hides the list permanently for that session.
**What we should do:** Add a "Back to Projects" action (already noted as upsell trigger point). Needs a `closeProject()` action that clears canvas-store and project-store state cleanly. This is also where the journey state machine (R-001) would help — transitioning from `{ phase: "canvas" }` back to `{ phase: "project-list" }`.
**Payoff:** Basic navigation. Also the trigger point Terry identified for upsell/signup flow.

## R-013: Topology coupling is resource-based, not record-lifecycle-based — PHASE 2 COMPLETE + BUG FIX
**Filed:** 2026-03-21 | **Phase 1:** 2026-04-07 (Session 31) | **Phase 2:** 2026-04-08 (Session 32) | **Phase 2 bug fix:** 2026-04-13 (Session 33)
**Where:** `network-derivation.ts` (`deriveTopologyView`, `deriveRecordLifecycleCoupling`), `types.ts`, `ConstraintDAGOverlay.tsx`
**Phase 1:** `deriveRecordLifecycleCoupling()` populates `recordClasses` from Record-type concepts + key IOs, links activities to `primaryRecordClassId` via score-based algorithm.
**Phase 2:** Extended `RecordClass` with `lifecycleStates` (ordered state sequence derived from outcome chain). Activities assigned `lifecycleStateId` via outcome mapping. New `'lifecycleAdjacency'` topology signal creates directional coupling edges between activities that transition the same record through adjacent lifecycle states. Consolidated `LifecycleState` interface across IO and RecordClass usage.
**Phase 2 bug fix:** Step 5's `outcomeToLifecycleState` was a flat global map — shared outcomes across record classes caused cross-contamination. Fixed to scoped `Map<rcId, Map<outcomeId, lsId>>`. Also added `lifecycleAdjacency` to directed basis set in `deduplicateStageEdges`.
**Key insight:** Lifecycle adjacency is primarily a cross-VS signal (ecommerce model: 4 of 6 edges cross VS boundaries). Within a single VS, stages typically touch different record classes, so within-VS lifecycle edges are sparse. The real value surfaces in Phase 3 cross-VS coupling.
**What remains (Phase 3):** (a) Surface cross-VS lifecycle coupling in Network view — this is where the signal has most value. (b) VS-boundary record handoff — terminal lifecycle state of one VS triggers initial state of another. (c) Decision gates as explicit branching state transitions.
**Payoff:** Coupling graph now reflects causal flow alongside operational interference. Foundation for executable orchestration.

## R-014: R-006 partially addressed — topological sort replaces alphabetical
**Filed:** 2026-03-21 (update to R-006)
**Where:** `network-derivation.ts` (`_layeredLayout`, `_topologicalOrder`)
**What we did:** Replaced alphabetical sort with Kahn's-algorithm topological ordering based on forward edges. This gives journey-sequence ordering within each layer. Alphabetical is now tie-breaker only.
**What remains:** User-draggable positioning and edge-crossing minimisation (original R-006 scope).

## R-015: R-011 partially addressed — LAYER_SCHEMES extracted to shared config
**Filed:** 2026-03-21 (update to R-011)
**Where:** `lib/layer-schemes.ts`
**What we did:** Extracted LAYER_SCHEMES, DEFAULT_SCHEME, LayerDef, LayerScheme, and detectSchemeId to `lib/layer-schemes.ts`. Both DiscoveryIntake and NetworkView now import from one place.
**What remains:** The scheme choice isn't yet persisted as a project-level setting (R-007 scope).

## R-016: ~~capabilityPPIT is a compound blob on Activity — should be relationships on Capability~~ ✅ SUBSUMED BY DEC-122
**Filed:** 2026-04-15 (Session 34) | **Re-statused:** 2026-05-08 (Session 37)
**Resolution path:** Folded into the v0.6 graph-runtime migration (DEC-122). In the CAPSICUM JSON-LD shape, PPI&T become direct typed relationships on Capability via `cap:performedByRole`, `cap:informedByInformationObject`, `cap:enabledByTechnology`, traversed from the Capability node rather than bundled into a compound attribute on Stage. The special-case PPIT enricher disappears once the cross-mapping pipeline operates over the typed graph.
**Implementation:** Lands as part of the v4/v5 → CAPSICUM JSON-LD migration tool. Scheduled in Phase 1 of the DEC-122 implementation sequencing.

## R-017: ~~Deprecate enabledByCapabilityIds v5 alias~~ ✅ SUBSUMED BY DEC-122
**Filed:** 2026-04-15 (Session 34) | **Re-statused:** 2026-05-08 (Session 37)
**Resolution path:** The v0 CAPSICUM JSON-LD shape uses a single canonical predicate `cap:enabledByCapability` (not the v4 `requiresCapabilityIds` nor the v5 `enabledByCapabilityIds`). The migration tool re-canonicalises both legacy shapes. The dual-field bug class is closed at validation time via the SHACL constraint that asserts every Stage references at least one Capability via the canonical predicate (proven in the spike). `getCapabilityIds()` helper retires once the migration completes.
**Implementation:** Migration tool emits canonical predicate; legacy reader-side fallbacks removed when scaffold-store reads switch to graph queries.

---

*This register is append-only. When we fix an item, mark it with a completion date rather than deleting it.*
