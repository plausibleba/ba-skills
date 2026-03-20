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

---

*This register is append-only. When we fix an item, mark it with a completion date rather than deleting it.*
