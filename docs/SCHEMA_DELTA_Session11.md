# SCHEMA DELTA — SESSION 11

**File location:** `docs/SCHEMA_DELTA_Session11.md`  
**Audience:** Claude  
**Purpose:** Concrete schema and validator delta for Session 11 implementation  
**Source:** GPT (Solution Architect) — Session 10 design spar, 6 March 2026

---

## 1. Scope of this Delta

This schema delta implements four agreed architecture changes:

1. Extend Activity to encode the v1 execution grammar
2. Add ApplicationFunction and RecordClass reference collections
3. Introduce compositeActivityId for ordered mereological composition
4. Restructure the current heatmap into diagnostic / interpretive / intervention layers

This delta does not introduce:
- Party/Product modelling
- multi-record activities
- sharable parthood
- runtime execution semantics
- external inference-based topology

---

## 2. ScaffoldModel Delta

### 2.1 Add new reference collections

The scaffold root must now include:

```typescript
applicationFunctions: ApplicationFunction[]
recordClasses: RecordClass[]
```

**ApplicationFunction**

```typescript
type ApplicationFunction = {
  id: string
  prefLabel: string
  applicationId?: string
}
```

**RecordClass**

```typescript
type RecordClass = {
  id: string
  prefLabel: string
  description?: string
}
```

### 2.2 Activity contract delta

**Previous minimum fields** (already present):
- `id`, `valueStreamId`, `preOutcomeId`, `postOutcomeId`
- `roleIds`, `capabilityIds`, `controlIds`

**New required fields:**

```typescript
applicationFunctionIds: string[]   // NEW
primaryRecordClassId: string       // NEW
compositeActivityId?: string       // NEW
```

**Updated Activity shape:**

```typescript
type Activity = {
  id: string
  valueStreamId: string
  preOutcomeId: string
  postOutcomeId: string
  roleIds: string[]
  capabilityIds: string[]
  controlIds: string[]
  applicationFunctionIds: string[]   // NEW
  primaryRecordClassId: string       // NEW
  compositeActivityId?: string       // NEW
}
```

---

## 3. JSON Schema Patch — ScaffoldModel

Pseudo-schema — adapt to repo's current schema conventions in `schemas/ScaffoldModel.schema.json`.

### 3.1 Add root properties

```json
{
  "properties": {
    "applicationFunctions": {
      "type": "array",
      "items": { "$ref": "#/$defs/ApplicationFunction" },
      "default": []
    },
    "recordClasses": {
      "type": "array",
      "items": { "$ref": "#/$defs/RecordClass" },
      "default": []
    }
  }
}
```

### 3.2 Add $defs

```json
{
  "$defs": {
    "ApplicationFunction": {
      "type": "object",
      "required": ["id", "prefLabel"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "prefLabel": { "type": "string", "minLength": 1 },
        "applicationId": { "type": "string" }
      },
      "additionalProperties": false
    },
    "RecordClass": {
      "type": "object",
      "required": ["id", "prefLabel"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "prefLabel": { "type": "string", "minLength": 1 },
        "description": { "type": "string" }
      },
      "additionalProperties": false
    }
  }
}
```

### 3.3 Patch Activity definition

```json
{
  "$defs": {
    "Activity": {
      "type": "object",
      "required": [
        "id",
        "valueStreamId",
        "preOutcomeId",
        "postOutcomeId",
        "roleIds",
        "capabilityIds",
        "controlIds",
        "applicationFunctionIds",
        "primaryRecordClassId"
      ],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "valueStreamId": { "type": "string", "minLength": 1 },
        "preOutcomeId": { "type": "string", "minLength": 1 },
        "postOutcomeId": { "type": "string", "minLength": 1 },
        "roleIds": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "minItems": 1,
          "uniqueItems": true
        },
        "capabilityIds": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "minItems": 1,
          "uniqueItems": true
        },
        "controlIds": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "uniqueItems": true
        },
        "applicationFunctionIds": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "minItems": 1,
          "uniqueItems": true
        },
        "primaryRecordClassId": {
          "type": "string",
          "minLength": 1
        },
        "compositeActivityId": {
          "type": "string",
          "minLength": 1
        }
      },
      "additionalProperties": false
    }
  }
}
```

---

## 4. Semantic Validator Delta — ScaffoldModel

Schema validation is not enough. Add semantic validator rules to `packages/shared/src/validator.ts`.

### 4.1 Execution grammar reference integrity

```
V-ACTIVITY-01  roleIds must resolve → Role
V-ACTIVITY-02  capabilityIds must resolve → Capability
V-ACTIVITY-03  controlIds must resolve → Control
V-ACTIVITY-04  applicationFunctionIds must resolve → ApplicationFunction
V-ACTIVITY-05  primaryRecordClassId must resolve → RecordClass
V-ACTIVITY-06  compositeActivityId must resolve → Activity (if present)
```

### 4.2 Execution grammar minimum cardinality

```
V-ACTIVITY-07  activity must reference at least one role
V-ACTIVITY-08  activity must reference at least one capability
V-ACTIVITY-09  activity must reference at least one application function
V-ACTIVITY-10  activity must reference one primary record class
```

`controlIds` may be empty if business rules permit.

### 4.3 Composite activity semantics

**v1 constraints:**

```
V-COMPOSITE-01  compositeActivityId must resolve to existing Activity
V-COMPOSITE-02  part.primaryRecordClassId == composite.primaryRecordClassId
V-COMPOSITE-03  firstPart.preOutcomeId == composite.preOutcomeId
V-COMPOSITE-04  lastPart.postOutcomeId == composite.postOutcomeId
V-COMPOSITE-05  parts form continuous chain: part[i].postOutcome == part[i+1].preOutcome
V-COMPOSITE-06  composite chain must not branch
```

**Ordering:** Derive from transition continuity. If ambiguity remains, validator must fail rather than guess.

---

## 5. Derived Artefact Schema

These artefacts remain outside the scaffold. Never stored in ScaffoldModel.

### 5.1 CapabilityInstanceView

```typescript
type CapabilityInstance = {
  id: string                        // hash(capabilityId + valueStreamId + activityId)
  capabilityId: string
  valueStreamId: string
  activityId: string
  roleIds: string[]
  controlIds: string[]
  applicationFunctionIds: string[]
  primaryRecordClassId: string
  scaffoldIntegrityHash: string
}
```

**Derivation function:**
```typescript
deriveCapabilityInstances(scaffold: ScaffoldModel): CapabilityInstance[]
```

```
V-CI-01  capability instance id must be deterministic from tuple
V-CI-02  capability instance must inherit scaffoldIntegrityHash
V-CI-03  capability instance fields must match source activity/scaffold references
```

### 5.2 TopologyView

```typescript
type TopologyView = {
  sourceScaffoldHash: string
  derivationRulesetVersion: string
  capabilityInstanceHash: string
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}

type TopologyNode = {
  activityId: string
  valueStreamId: string
}

type TopologyEdge = {
  sourceActivityId: string
  targetActivityId: string
  basis: TopologyBasis[]
}

type TopologyBasis =
  | "outcomeAdjacency"
  | "sharedRole"
  | "sharedCapability"
  | "sharedControl"
  | "sharedApplicationFunction"
  | "sharedPrimaryRecord"
```

**Derivation function:**
```typescript
deriveTopologyView(
  scaffold: ScaffoldModel,
  capabilityInstances: CapabilityInstance[]
): TopologyView
```

```
V-TOPO-01  topology provenance fields required
V-TOPO-02  topology edges may only use allowed basis values
V-TOPO-03  topology edges must reference valid scaffold activities
V-TOPO-04  identical scaffold + ruleset must produce identical topology
```

---

## 6. Heatmap Schema Delta

### 6.1 New target shape

```typescript
type HeatmapVNext = {
  diagnosticLayer: DiagnosticLayer
  interpretiveLayer: InterpretiveLayer
  interventionLayer: InterventionLayer
}
```

### 6.2 Diagnostic layer

```typescript
type DiagnosticLayer = {
  observations: DiagnosticObservation[]
}

type DiagnosticObservation = {
  id: string
  type: "friction" | "opportunity"
  anchors: string[]
  contributingAnchors?: string[]
  intensity?: number
  evidence?: string[]
  rationale?: string
  confidence?: number
  category?: string
}
```

### 6.3 Interpretive layer

```typescript
type InterpretiveLayer = {
  bindingConstraint?: InterpretiveConclusion
}

type InterpretiveConclusion = {
  sourceObservationId: string
  justification?: string
  confidence?: number
  provenance?: string
}
```

### 6.4 Intervention layer

```typescript
type InterventionLayer = {
  interventions: Intervention[]
}

type Intervention = {
  id: string
  sourceObservationId: string
  proposedSolution?: string
  linkedStoryIds?: string[]
  vendorMappings?: string[]
}
```

### 6.5 Migration function

```typescript
migrateHeatmap(oldHeatmap: LegacyHeatmap): HeatmapVNext
```

**Mapping rules:**
- friction observations → `diagnosticLayer.observations`
- opportunity observations → `diagnosticLayer.observations`
- binding constraint → `interpretiveLayer.bindingConstraint`
- solution/story/vendor fields → `interventionLayer.interventions`

Preserve IDs where possible. Do not require manual rewrite of historical artefacts.

```
V-HEATMAP-01  diagnostic layer may not declare binding constraint
V-HEATMAP-02  interpretive binding constraint must reference valid observation
V-HEATMAP-03  at most one binding constraint allowed
V-HEATMAP-04  intervention entries must reference diagnostic observation
```

---

## 7. Migration / Backward Compatibility

### Scaffold migration

If older scaffolds lack `applicationFunctionIds` or `primaryRecordClassId`:

- **Generated legacy scaffold:** warning + block topology derivation
- **Authored scaffold intended for Session 11+:** hard validation error

Schema adapter may inject empty arrays/null markers only if required for shape normalisation.

### Heatmap migration

Older heatmaps must continue to load through `migrateHeatmap()`. Do not require manual rewrite of historical artefacts.

---

## 8. Canonical Derivation Contracts

All pure functions. No mutation of input. Deterministic output. Hash-linked provenance where applicable.

```typescript
validateScaffold(scaffold: ScaffoldModel): ValidationReport
deriveCapabilityInstances(scaffold: ScaffoldModel): CapabilityInstance[]
deriveTopologyView(scaffold: ScaffoldModel, capabilityInstances: CapabilityInstance[]): TopologyView
migrateHeatmap(oldHeatmap: LegacyHeatmap): HeatmapVNext
```

---

## 9. Session 11 Exact Deliverables

Claude should produce:

1. Updated `schemas/ScaffoldModel.schema.json`
2. Updated `schemas/FrictionHeatmap.schema.json` (or successor)
3. Updated `packages/frontend/src/types.ts`
4. Semantic validator rule additions in `packages/shared/src/validator.ts`
5. `deriveCapabilityInstances()` in `packages/frontend/src/store/network-derivation.ts`
6. `deriveTopologyView()` in `packages/frontend/src/store/network-derivation.ts`
7. `migrateHeatmap()` for legacy artefacts
8. Unit tests covering all acceptance criteria

---

## 10. Acceptance Checks

Implementation complete when all pass:

- [ ] Activity validates as: Role + Capability + Control + ApplicationFunction + RecordClass
- [ ] Composite activity continuity enforced
- [ ] CapabilityInstances derive deterministically from scaffold
- [ ] TopologyView derives only from allowed coupling signals
- [ ] Legacy heatmaps migrate cleanly without data loss
- [ ] No derived artefacts written back into scaffold
