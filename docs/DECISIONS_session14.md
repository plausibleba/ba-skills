# Decisions Log — Session 14 (2026-03-08)

Add these entries to the existing DECISIONS.md.

---

## D-035 — v5 scaffold chain walk in `generateCanvasForVs`

**Context:** v5 bundles removed `activityIds[]` from value stream objects, replacing with `activityChainHead` on the VS and `nextActivityId` on each activity. `generateCanvasForVs` crashed with `TypeError: Cannot read properties of undefined (reading 'map')`.

**Decision:** Added `resolveOrderedActivityIds()` helper inside `generateCanvasForVs` that detects format by presence of `activityIds` array (v4) or falls back to walking the `activityChainHead` → `nextActivityId` chain (v5). Both paths produce an identical ordered array; all downstream column-building logic unchanged.

**Alternative considered:** Normalise to v4 format at load time (FileLoader). Rejected — would require schema migration at ingestion and lose provenance of the original bundle format.

---

## D-036 — Dual capability field read (`enabledByCapabilityIds ?? requiresCapabilityIds`)

**Context:** v5 activities use `enabledByCapabilityIds`; v4 used `requiresCapabilityIds`. Three locations read this field: `canvas-store.ts` (column aggregates), `StageCard.tsx` (capability block rendering), `CapabilityBlock.tsx` (PPIT layer resolution).

**Decision:** All three locations now read `enabledByCapabilityIds ?? requiresCapabilityIds ?? []`. Applied with `(activity as any)` cast since `ScaffoldActivity` type only declares the v4 field name.

**Note:** Type definition in `types.ts` should eventually be updated to declare both field names as optional, with a migration note.

---

## D-037 — `CapabilityBlock` v5 PPIT fallback

**Context:** v4 bundles store per-capability PPIT as `activity.capabilityPPIT[capabilityId]` — a nested map giving roles, activities, informationObjects, and technologyApps per capability per stage. v5 bundles have no `capabilityPPIT`; only flat `performedByRoleIds` and `enabledByCapabilityIds` on the activity.

**Decision:** When `capabilityPPIT` is absent (v5), PPIT layers fall back to:
- **Roles** → `activity.performedByRoleIds` resolved against `scaffold.elements.roles`
- **Activities** → `[activity.name]` (the activity itself is the unit of work)
- **Info / Tech** → `activity.informationObjectIds` / `activity.technologyAppIds` if present (empty in current v5 fixtures — correct behaviour)

v4 path unchanged. The fallback is purely additive.

**Implication:** v5 bundles cannot show per-capability role/activity breakdowns — only activity-level. This is a data gap in the v5 generation pipeline, not a frontend deficiency. When the two-pass extraction rewrite lands (D-035 follow-on), the pipeline should produce `capabilityPPIT` or an equivalent per-capability PPIT structure.

---

## D-038 — `CanvasView` bindingAnchor guard

**Context:** `CanvasView.tsx` accessed `heatmapData.bindingConstraint.bindingAnchor` directly. v5 heatmaps where `bindingConstraint` is present but `bindingAnchor` is undefined caused a React render crash producing a blank white screen.

**Decision:** Changed to optional chaining `heatmapData.bindingConstraint?.bindingAnchor` in both the `bindingActivityName` derivation and the `onBindingClick` handler. Returns `null` gracefully if absent.

---

## D-039 — `StageCard` ↔ Concept Card alignment (noted, deferred)

**Context:** Eric Broda's Governance Kernel / MVC work uses a "Concept Card" as a governed capability unit. `StageCard` renders a single activity with its capability, roles, controls, and outcomes in a contained card.

**Decision:** Noted structural alignment. No action. When Step 4 (MVC demo for Eric) begins, `StageCard` is the candidate host for Governance Kernel overlay — trust anchors, policy bindings, and agent accountabilities would slot into the existing `ppitToggles` layer system.
