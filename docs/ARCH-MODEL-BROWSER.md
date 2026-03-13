# Architectural Analysis: Model Browser & Single-Repository Direction

**Date:** 2026-03-13
**Status:** Under discussion — not yet approved
**Triggered by:** D-116 conversation (Session 25)

---

## 1. The Problem We're Solving

Users need **editable access to definitive datasets** — friction points, solutions, roles, capabilities, metrics — without having to re-run AI generation passes each time. The current architecture makes this harder than it should be because:

1. **The Discovery form owns its own state.** `DiscoveryIntake` uses React `useState(EMPTY_FORM)` — a private copy of org, value streams, roles, tech, pain points, and metrics. This data is only connected to the scaffold at generation time (form → pipeline → scaffold). After that, the two diverge.

2. **Heatmap data (friction, solutions) lives outside the scaffold.** Friction observations and solutions are in `HeatmapData`, stored per-VS in `canvas-store.heatmapsByVs`. They reference scaffold element IDs but aren't part of the scaffold itself. There's no way to edit them.

3. **User stories live in a third location.** `userStoriesByActivity` is a flat record in canvas-store, keyed by activity ID.

4. **Canvas edits mutate the scaffold but nothing else knows.** Renaming an activity on the canvas updates `scaffoldData` but the discovery form still shows the old name. Friction observations still reference the old activity. There's no propagation.

The net effect: each view sees a slightly different version of reality.

---

## 2. What Terry Is Proposing

Not "get back to the form" but rather: **a Model Browser** that gives direct access to every data class in the operating model. The vision:

- **Tree nav on the left** — showing a taxonomy of classes: Value Streams, Activities, Capabilities, Roles, Friction Points, Solutions, Metrics, Controls, Tech Apps, Information Objects, User Stories, etc.
- **Contextual panels on the right** (tabbed):
  - **Form** — editable fields for the selected instance
  - **Inspector** — read-only property inspector (the "inspector idea")
  - **Relationship graph** — shows connections to other instances
  - **Children table** — tabular view of child instances
  - Potentially more panels over time
- **AI invoked at specific moments** — "assess friction for these stages using this new input" writes results into the model's friction repository. Not a page you navigate to.

---

## 3. Current Data Architecture (As-Is)

```
┌─────────────────────────────────────────────────────────────────┐
│  DiscoveryIntake (React useState)                               │
│  ├── org: { name, industry, size, description, stakeholder }    │
│  ├── valueStreams: VS[] (with stages, confidence, zone)         │
│  ├── roles: Role[] (with vsRefs, type)                          │
│  ├── tech: Tech[] (with friction flag, type)                    │
│  ├── painPoints: PainPoint[] (with intensity, category, binding)│
│  ├── metrics: Metric[] (with current, target, stage)            │
│  ├── gaps: Gap[]                                                │
│  ├── transcript (raw text)                                      │
│  └── extractionMeta: { extractedAt, passes }                    │
│                                                                 │
│  ONE-WAY: form → pipeline → scaffold                            │
│           (no reverse mapping)                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ generates
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  canvas-store (Zustand)                                         │
│  ├── scaffoldData: ScaffoldData                                 │
│  │   └── elements: {                                            │
│  │       valueStreams, activities, outcomes, roles,              │
│  │       capabilities, controls, constraints, metrics,          │
│  │       applicationFunctions, recordClasses                    │
│  │     }                                                        │
│  ├── heatmapsByVs: Map<vsId, HeatmapData>                      │
│  │   └── observations: FrictionObservation[]                    │
│  │       └── solutions: Solution[]                              │
│  ├── userStoriesByActivity: Record<actId, UserStory[]>          │
│  ├── cardRegistry: CardRegistry | null                          │
│  ├── canvasViewModel: CanvasViewModel (derived, per-VS)         │
│  ├── networkNodes/Edges (derived)                               │
│  └── topologyView, capabilityInstanceView (derived)             │
│                                                                 │
│  Views: NetworkView, CanvasView, FrictionPanel, CardPanel       │
│  Editable: names, structure (D-092/093/094)                     │
│  NOT editable: friction observations, solutions, metrics values │
└─────────────────────────────────────────────────────────────────┘
```

**Key observations:**
- The scaffold has a **flat, normalised structure** — elements keyed by ID, cross-referenced by ID arrays. This is good. It's essentially a document database.
- Heatmaps are **separate documents** with referential integrity to scaffold element IDs.
- The CanvasViewModel is **derived** (computed from scaffold) — already the right pattern.
- The pipeline's `DiscoveryIR` is an intermediate artefact that bridges form → scaffold.

---

## 4. Proposed Target Architecture (To-Be)

### Option A: Scaffold-as-Repository (Evolutionary)

Extend the existing `ScaffoldData.elements` to be the single source of truth for ALL content. Move heatmap observations, solutions, and user stories INTO the scaffold's elements registry.

```
┌─────────────────────────────────────────────────────────────────┐
│  model-store (Zustand) — single repository                      │
│  ├── scaffold: ScaffoldData (extended)                          │
│  │   └── elements: {                                            │
│  │       valueStreams, activities, outcomes, roles,              │
│  │       capabilities, controls, constraints, metrics,          │
│  │       applicationFunctions, recordClasses,                   │
│  │       frictionObservations,     ← moved from HeatmapData    │
│  │       solutions,                ← moved from nested in obs   │
│  │       userStories,              ← moved from separate record │
│  │       conceptCards, policyCards ← from CardRegistry          │
│  │     }                                                        │
│  ├── discoveryContext: {           ← moved from DiscoveryIntake │
│  │     transcript, extractionMeta, gaps,                        │
│  │     painPoints (pre-generation notes, not friction obs)      │
│  │   }                                                          │
│  ├── dirty: boolean                                             │
│  └── (derived views computed on demand, not stored)             │
│                                                                 │
│  Views: NetworkView, CanvasView, ModelBrowser, FrictionPanel    │
│  ALL read from scaffold. ALL mutations go through store actions. │
│  AI operations: write results into scaffold elements.            │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Minimal conceptual leap from current architecture — scaffold already has the right shape
- JSON export continues to work (single document)
- Supabase persistence continues to work (single `bundle` column)
- Every element has an ID, so the Model Browser tree is trivial to build
- AI operations just call store actions like any other mutation
- The `elements` pattern (keyed registries) scales to any number of classes

**Cons:**
- `ScaffoldData` becomes larger and more complex over time
- The `ScaffoldData` TypeScript type needs ongoing extension
- Heatmap observations currently have their own schema version — merging requires migration
- Some data (transcript text, extraction confidence) doesn't naturally fit the `elements` pattern
- Undo/redo becomes harder with one big state tree (but it's already hard)

**Migration cost: LOW-MEDIUM.** Most changes are additive. Friction observations get new element entries; solutions get promoted from nested arrays to their own registry. The scaffold schema gets a minor version bump.

### Option B: Normalised Client-Side Store (Relational)

Replace the nested scaffold JSON with a normalised entity store — essentially a client-side database with tables for each element type, foreign keys, and query helpers.

```
┌─────────────────────────────────────────────────────────────────┐
│  entity-store (Zustand + normalised tables)                     │
│  ├── tables: {                                                  │
│  │     valueStreams: Map<id, VS>                                │
│  │     activities: Map<id, Activity>                            │
│  │     capabilities: Map<id, Capability>                        │
│  │     roles: Map<id, Role>                                     │
│  │     frictionObservations: Map<id, FrictionObs>               │
│  │     solutions: Map<id, Solution>                             │
│  │     userStories: Map<id, UserStory>                          │
│  │     ... etc                                                  │
│  │   }                                                          │
│  ├── indices: {                                                 │
│  │     activitiesByVs: Map<vsId, actId[]>                       │
│  │     frictionByActivity: Map<actId, obsId[]>                  │
│  │     ... etc                                                  │
│  │   }                                                          │
│  └── query: (tableName, filter) => Entity[]                     │
│                                                                 │
│  Serialise/deserialise: entity-store ↔ ScaffoldData JSON        │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Clean separation of concerns — each entity type has its own table
- Query patterns are natural (get all friction for this activity)
- Indices make relationship traversal fast
- Easier to implement fine-grained subscriptions (only re-render when this entity changes)
- Natural path to real-time collaboration (each entity mutation = a CRDT operation)

**Cons:**
- **Significant refactor** — every component that reads `scaffoldData.elements.activities[id]` needs to change
- We're reinventing a client-side ORM (or need to adopt one)
- Serialisation to/from the existing JSON bundle format adds a translation layer
- The scaffold JSON format is our exchange format (Eric Broda, JSON bundles) — diverging from it internally creates impedance mismatch
- All existing pipeline code, validators, and derivation functions assume the current shape
- Higher risk of bugs during migration

**Migration cost: HIGH.** Touching every file that reads scaffold data. 50+ callsites.

### Option C: Keep Scaffold Shape, Add Accessor Layer (Pragmatic Middle)

Keep `ScaffoldData` as the canonical format, but wrap it in a typed accessor/mutator layer that:
- Provides clean read methods: `getActivitiesForVs(vsId)`, `getFrictionForActivity(actId)`
- Provides clean write methods: `updateFriction(obsId, patch)`, `addSolution(obsId, solution)`
- Manages derived views (CanvasViewModel, NetworkNodes) via computed selectors
- Emits granular change events for efficient re-rendering

```typescript
// Accessor pattern — wraps ScaffoldData without changing its shape
const model = useModel();

// Read
const activities = model.getActivitiesForVs(vsId);
const friction = model.getFrictionForActivity(activityId);
const solutions = model.getSolutionsForObservation(obsId);

// Write — mutates scaffold in place, triggers re-derivation
model.updateActivity(actId, { name: "New Name" });
model.addFrictionObservation(vsId, { ... });
model.updateSolution(solutionId, { description: "..." });

// AI operation — writes results via the same accessor
await runFrictionAssessment(vsId, newInputs);
// internally calls model.addFrictionObservation() for each result
```

**Pros:**
- Scaffold JSON format unchanged — zero migration for existing code, pipelines, or bundles
- Accessor layer can be adopted incrementally (components switch one at a time)
- Provides the clean API the Model Browser needs without rewriting the data layer
- AI operations use the same accessor as manual edits — single write path
- Easy to add new element types without schema redesign

**Cons:**
- Accessor layer needs maintaining alongside the raw types
- Doesn't solve the fine-grained subscription problem (Zustand selectors help but aren't granular per-entity)
- Still storing heatmap data outside the scaffold (unless we also fold it in)

**Migration cost: LOW.** Additive layer. Existing code continues to work. New code uses the accessor.

---

## 5. Recommendation

**Option A (Scaffold-as-Repository) for the data model + Option C (Accessor Layer) for the API.**

Rationale:
1. Fold friction observations, solutions, user stories, and cards INTO `ScaffoldData.elements`. This makes the scaffold genuinely self-contained — the "repository" Terry described. The JSON bundle becomes a single-document database.
2. Keep the flat `Record<string, T>` keyed-by-ID pattern that scaffold already uses. It's the right shape.
3. Build a `useModel()` accessor hook that wraps `canvas-store` (or a new `model-store`) with typed read/write methods. The Model Browser and all future views use this API.
4. Separate `discoveryContext` (transcript, extraction metadata, pre-generation notes) from the model. This is input provenance, not model content.
5. AI operations (friction assessment, solution enrichment, etc.) become store actions that write to the same element registries as manual edits.

**What NOT to do:**
- Don't normalise into a relational client-side store (Option B). The scaffold's document shape IS the exchange format. Diverging internally creates unnecessary translation.
- Don't try to reverse-map scaffold → form. The form was an input tool; the Model Browser replaces its "edit" role. The Discovery tab can become read-only provenance ("here's the transcript and extraction that generated this model").

---

## 6. Data Model Changes Required

### 6a. New element registries to add to ScaffoldData.elements:

```typescript
// Friction observations — currently in HeatmapData.observations
frictionObservations?: Record<string, FrictionObservation>;

// Solutions — currently nested inside FrictionObservation.solutions[]
solutions?: Record<string, Solution & { observationId: string }>;

// User stories — currently in canvas-store.userStoriesByActivity
userStories?: Record<string, TransformationUserStory>;

// Concept/Policy cards — currently in CardRegistry
conceptCards?: Record<string, ConceptCard>;
policyCards?: Record<string, PolicyCard>;
```

### 6b. New top-level field on ScaffoldData:

```typescript
// Discovery provenance — NOT in elements (it's metadata, not model content)
discoveryContext?: {
  transcript?: string;
  extractedAt?: string;
  passes?: number;
  orgMetadata?: { industry?: string; size?: string; description?: string };
  preGenerationNotes?: DiscoveryPainPoint[];  // raw form pain points
};
```

### 6c. HeatmapData migration:

Current `HeatmapData` contains `observations[]` and `bindingConstraint`. Migration:
- Each `FrictionObservation` → entry in `elements.frictionObservations`
- Each `Solution` inside an observation → entry in `elements.solutions` with `observationId` backref
- `bindingConstraint` → becomes a property on the relevant friction observation or a separate interpretive element
- `heatmapsByVs` in canvas-store → removed (data now lives in scaffold)

### 6d. Bundle version bump:

```typescript
bundleVersion: "3.0"  // indicates consolidated element registries
```

With a migration function: `migrateBundleV2ToV3(bundle)` that moves heatmap data into elements.

---

## 7. Model Browser — Incremental Build Plan

The Model Browser is a significant UI feature. Here's how to build it incrementally without blocking other work:

### Phase 1: Accessor Layer + Data Consolidation (1-2 sessions)
- Create `useModel()` hook wrapping scaffold read/write
- Fold friction observations + solutions into scaffold elements
- Fold user stories into scaffold elements
- Bundle migration V2 → V3
- Existing views continue working (they still read `scaffoldData.elements`)

### Phase 2: Model Browser — Tree + Form Panel (1-2 sessions)
- New view mode: "model" (alongside network, stage, intake)
- Left panel: collapsible tree of element classes
  - Value Streams → Activities → Capabilities (hierarchical)
  - Roles (flat list)
  - Friction Observations → Solutions (hierarchical)
  - Metrics (flat list)
  - User Stories (flat list, grouped by activity)
- Right panel: editable form for selected element
- This alone gives Terry what he asked for: "editable access to the definitive datasets"

### Phase 3: Inspector + Relationship Graph (1 session)
- Inspector tab: read-only property dump with cross-references
- Relationship graph tab: mini force-directed graph of connected elements

### Phase 4: Children Table + Bulk Operations (1 session)
- Tabular view of children for a selected parent node
- Inline editing in table rows
- Bulk selection and operations (delete, re-categorise)

### Phase 5: AI Operations Panel (1+ sessions)
- "Run friction assessment" button that takes optional new inputs
- "Enrich solutions" for selected friction points
- Results write to model via accessor — same as manual edits
- Progress indicator during AI operations

---

## 8. Implications for Tech Stack

### Zustand
No change needed. Zustand handles the consolidated store fine. If performance becomes an issue with large models (500+ elements), we can add `shallow` equality checks or split into slices. Not a concern at current scale.

### TypeScript
`ScaffoldData` type needs extending. This is additive — new optional fields on `elements`. No breaking changes to existing code.

### Supabase
No change. The `bundle` column stores JSON. Larger JSON (friction, solutions included) is fine — Supabase/Postgres handles JSONB up to 1GB. The optimistic locking and auto-save work the same way.

### Pipeline
The pipeline currently outputs `ScaffoldData` + `HeatmapData` as separate artefacts. Post-consolidation, it would write everything into `ScaffoldData.elements`. The pipeline orchestrator needs a small update to write friction/solution results into the scaffold's element registries instead of a separate heatmap object. **This is a localised change in 1-2 files.**

### JSON Bundle Format
The bundle becomes richer (includes friction, solutions, stories). This is a **feature, not a problem** — Eric Broda's bundles would carry their full analytical state, not just the structural scaffold.

### React Components
Existing components (`FrictionPanel`, `CanvasView`, `NetworkView`) currently read from `heatmapData` and `scaffoldData` separately. With the accessor layer, they'd read from `model.getFrictionForActivity(id)`. This can be migrated incrementally — both paths can coexist during transition.

---

## 9. Implications for Roadmap

### What this ENABLES:
- Direct friction editing (Terry's immediate need)
- Solution editing without regeneration
- User story editing without the Jira export being the only touchpoint
- Card editing (Concept/Policy cards) in the Model Browser
- AI operations as tools, not pages
- Richer JSON bundles for partners (Eric Broda)
- Foundation for real-time collaboration (single mutation path → easier to intercept for sync)

### What this DEFERS or CHANGES:
- **Round-trip form editing** — becomes unnecessary. The Discovery tab becomes provenance view. Editing happens in the Model Browser.
- **D-116 as originally written** — superseded by this analysis. We don't need scaffold→form hydration.
- **Module-specific panel visibility** (Phase 2 item) — the Model Browser tree could be the natural home for this (different modules show different element classes)
- **Project sharing** — unchanged, proceed as planned
- **Vercel deployment** — unchanged, proceed as planned

### What this RISKS:
- **Scope creep.** The Model Browser is a rich UI feature. The tree + form alone is manageable, but the inspector, relationship graph, and children table add up. We need to be disciplined about phasing.
- **Bundle format change.** V2 → V3 migration needs to be handled gracefully for existing saved projects and JSON files. A migration function at load time handles this.
- **Discovery form disposition.** If the form becomes read-only provenance, users who prefer form-based input lose their editing path until the Model Browser is built. We should keep the form editable for new discoveries but disable "regenerate" when canvas edits exist.

---

## 10. Decision Needed

1. **Do we agree on Option A+C?** (Fold data into scaffold + accessor layer, keep scaffold JSON shape)
2. **Do we start with Phase 1** (accessor + data consolidation) before building Model Browser UI?
3. **What happens to the Discovery tab?** Read-only provenance, or keep editable for new discoveries only?
4. **Priority vs other Phase 2 items?** This is foundational work that enables the rest. Does it jump the queue ahead of project sharing and Vercel deployment?
