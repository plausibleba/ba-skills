# Refactoring Debt Register

Tracked choices where we picked expediency over elegance. Each item is a candidate for a future cleanup sprint.

---

## R-001: Scattered UI state flags instead of a journey state machine
**Filed:** 2026-03-21
**Where:** `project-store.ts`, `UserGuidePanel.tsx`, `deriveGuideState()`
**What we did:** Added `isCreatingProject`, `intakeTab`, and a `deriveGuideState()` function that stitches together `viewMode`, `scaffoldData`, `heatmapsByVs`, and `enrichVersion` to infer the user's current phase.
**What we should do:** Replace with a single discriminated-union `appPhase` state machine (e.g. `{ phase: "intake", tab: "provide" }`, `{ phase: "stage-view", vsId, assessed }`) so the Guide and any future phase-dependent logic reads from one source of truth.
**Payoff:** Cleaner guide logic, analytics hooks, undo/back navigation, fewer bugs as pages multiply.

## R-002: Module info duplicated across components
**Filed:** 2026-03-21
**Where:** `ProjectList.tsx` (`MODULE_INFO`), `module-features.ts`, `UserGuidePanel.tsx` (inline label map)
**What we did:** Each component defines its own label/description map for modules. `ProjectList` has `MODULE_INFO`, the guide has an inline `moduleLabel` lookup, and `module-features.ts` has the feature flags.
**What we should do:** Single `MODULE_REGISTRY` object that carries label, description, icon, and feature flags. All components import from one place.
**Payoff:** Add a new module in one file, not three.

## R-003: UserGuidePanel content as inline constants
**Filed:** 2026-03-21
**Where:** `UserGuidePanel.tsx`
**What we did:** Guide content for every state is defined as constants and functions inside the component file. As we add more pages (intake provide, intake form, creating project, etc.) the file keeps growing with static content.
**What we should do:** Extract guide content into a separate `guide-content.ts` or a JSON/record keyed by `appPhase`. The component just renders — it doesn't own the copy.
**Payoff:** Easier to edit copy without touching component logic. Could eventually be driven by a CMS or i18n file.

## R-004: FileLoader compact mode is a boolean prop, not a variant
**Filed:** 2026-03-21
**Where:** `FileLoader.tsx`
**What we did:** Added a `compact` boolean prop that switches between two completely different render paths (full drop zone vs. inline button). The two modes share almost no markup.
**What we should do:** Either split into two components (`FileDropZone` and `FileUploadButton`) or use a `variant` prop with a union type if we expect more modes.
**Payoff:** Clearer API, easier to test each variant independently.

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

## R-009: Two stores (canvas-store, project-store) with overlapping concerns
**Filed:** 2026-03-21
**Where:** `canvas-store.ts`, `project-store.ts`
**What we did:** `canvas-store` owns the runtime model (scaffold, heatmaps, viewMode), while `project-store` owns persistence (CRUD, sharing) and now also UI hints (isCreatingProject, intakeTab). `viewMode` is in canvas-store but the Guide needs to read it — so UserGuidePanel imports both stores.
**What we should do:** Consider a unified `app-store` or at least a clear contract: canvas-store = model data, project-store = persistence, a new `ui-store` or `navigation-store` = app phase, view mode, UI signals. This aligns with R-001 (journey state machine).
**Payoff:** Cleaner separation of concerns, less cross-store coupling, easier to reason about state changes.

## R-010: Scaffold type is `any` / `Record<string, unknown>` throughout
**Filed:** 2026-03-21
**Where:** `NetworkView.tsx`, `network-derivation.ts`, `canvas-store.ts`
**What we did:** The scaffold is stored as `ScaffoldData` but many accessors cast to `Record<string, unknown>` because the type doesn't fully describe all fields (e.g. `layoutZone`, `layoutZones`, `zone`). The `_layeredLayout` function casts `scaffold as Record<string, unknown>` to access `layoutZones`.
**What we should do:** Define a comprehensive `ScaffoldModel` TypeScript interface that covers all fields including `layoutZones`, per-VS `layoutZone`, and any other metadata. Use it everywhere — no more casting.
**Payoff:** Type safety, IDE autocomplete, catch errors at compile time instead of runtime.

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

---

*This register is append-only. When we fix an item, mark it with a completion date rather than deleting it.*
