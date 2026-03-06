# SESSION 11 IMPLEMENTATION BRIEF

**File location:** `docs/SESSION11_BRIEF.md`  
**Audience:** Claude (implementation)  
**Status:** Architectural directive  
**Scope:** Schema evolution, validator rules, deterministic derivation chain, heatmap restructuring  
**Source:** GPT (Solution Architect) — Session 10 design spar, 6 March 2026

---

## 1. Architectural Principles (Now Permanent)

The following invariants must be preserved across the system.

### 1. Constitutional Scaffold

The ScaffoldModel is constitutional.

It may contain only asserted structure originating from:
- imported structured content
- human authored modelling
- reviewed generated scaffolds

Derived artefacts must never be written back into the scaffold.

Examples of derived artefacts:
- CapabilityInstance
- TopologyView
- Friction analysis
- Binding constraint selection

### 2. Layer Separation

The reasoning system now has three layers:

```
Structural Layer    →  ScaffoldModel
Diagnostic Layer    →  Friction observations
Interpretive Layer  →  Binding constraint and executive interpretation
```

Intervention planning sits downstream.

No diagnostic or interpretive artefact may mutate the structural layer.

### 3. Deterministic Derivation Chain

All derived artefacts must be pure functions.

```
ScaffoldModel
    ↓
CapabilityInstanceView
    ↓
TopologyView
    ↓
Friction Analysis
    ↓
Binding Constraint Selection
```

Rules:
- no hidden state
- no UI inference
- identical inputs must produce identical outputs

Derived artefacts must carry hash-linked provenance.

### 4. Activity Grain Independence

Composite and lower-grain activities are both Activities.

Composition represents mereological parthood, not inheritance.

Zoom levels reflect reasoning grain only.

---

## 2. Execution Grammar for Activity

Every Activity must satisfy the execution grammar:

```
Role performs Capability
    under Control
    using ApplicationFunction
    to transition RecordClass
```

This is the minimal constitutional representation of operational execution.

---

## 3. Activity Schema Contract

The Activity contract must now include the following fields:

```typescript
Activity {
  id: string
  valueStreamId: string
  preOutcomeId: string
  postOutcomeId: string
  roleIds: string[]
  capabilityIds: string[]
  controlIds: string[]
  applicationFunctionIds: string[]   // NEW
  primaryRecordClassId: string       // NEW
  compositeActivityId?: string       // NEW (mereological composition)
}
```

---

## 4. New Reference Collections

Two new reference collections must be added to the scaffold.

### Application Functions

Represents specific functional capability of an application.

```typescript
ApplicationFunction {
  id: string
  prefLabel: string
  applicationId?: string
}
```

Examples: `Workday.Recruitment`, `SAP.PayrollProcessing`, `Salesforce.OpportunityManagement`

These represent interference points in topology derivation. Must be a controlled identifier set — never free-text tags.

### Record Classes

Represents the record artefact whose lifecycle is governed.

```typescript
RecordClass {
  id: string
  prefLabel: string
  description?: string
}
```

Examples: `CustomerRecord`, `OrderRecord`, `ApplicationRecord`, `EmployeeRecord`

For v1: Only RecordClass is modelled. Party/Product remain implicit.

---

## 5. Validator Rules

### 5.1 Reference Integrity

All Activity references must resolve:

```
V-ACTIVITY-01  roleIds → Role
V-ACTIVITY-02  capabilityIds → Capability
V-ACTIVITY-03  controlIds → Control
V-ACTIVITY-04  applicationFunctionIds → ApplicationFunction
V-ACTIVITY-05  primaryRecordClassId → RecordClass
V-ACTIVITY-06  compositeActivityId → Activity (if present)
```

### 5.2 Minimum Execution Grammar

```
V-ACTIVITY-07  roleIds.length >= 1
V-ACTIVITY-08  capabilityIds.length >= 1
V-ACTIVITY-09  applicationFunctionIds.length >= 1
V-ACTIVITY-10  primaryRecordClassId required
```

`controlIds` may be empty if governance rules permit.

### 5.3 Record Transition Rule

Each Activity transitions exactly one primary RecordClass. Multi-record transitions are out of scope for v1.

---

## 6. Composite Activity Semantics

### 6.1 Composition Field

`compositeActivityId` means:

> "This Activity is an ordered part of the referenced composite transition."

It does not mean parent-child hierarchy.

### 6.2 v1 Composition Model

v1 supports:
- strict parthood
- ordered parthood
- single composite membership
- same RecordClass across composite and parts

Sharable parthood is a v2 concern. Schema must not accidentally prevent it.

### 6.3 Composite Validation Rules

```
V-COMPOSITE-01  compositeActivityId must resolve to existing Activity
V-COMPOSITE-02  part.primaryRecordClassId == composite.primaryRecordClassId
V-COMPOSITE-03  firstPart.preOutcomeId == composite.preOutcomeId
V-COMPOSITE-04  lastPart.postOutcomeId == composite.postOutcomeId
V-COMPOSITE-05  parts must form continuous ordered chain: part[i].postOutcome == part[i+1].preOutcome
V-COMPOSITE-06  composite chain must not branch
```

If any rule fails → validation error.

**Ordering:** Use transition continuity as primary semantic ordering. If ambiguity remains, validator must fail rather than guess.

**Grain rule:** Do not encode metaphysical "atomicity." Lower-grain activities are Activities at a finer modelling grain. Today's part may become tomorrow's composite.

---

## 7. Heatmap Restructure (Three Layers)

Current heatmap mixes concerns. It must be separated into three layers.

### 7.1 Diagnostic Layer — pure analysis

```typescript
DiagnosticObservation {
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

No interpretation allowed here.

### 7.2 Interpretive Layer — human commitment

```typescript
InterpretiveConclusion {
  sourceObservationId: string
  justification?: string
  confidence?: number
  provenance?: string
}
```

Rules:
- zero or one binding constraint
- must reference a valid diagnostic observation

### 7.3 Intervention Layer — action-oriented

```typescript
Intervention {
  id: string
  sourceObservationId: string
  proposedSolution?: string
  linkedStoryIds?: string[]
  vendorMappings?: string[]
}
```

May remain sparse in v1. Schema boundary must exist now.

### 7.4 Migration Strategy

Provide deterministic migration function:

```typescript
migrateHeatmap(oldHeatmap: LegacyHeatmap): HeatmapVNext
```

Mapping rules:
- friction observations → `diagnosticLayer.observations`
- binding constraint → `interpretiveLayer.bindingConstraint`
- solution/vendor/story fields → `interventionLayer.interventions`

Preserve IDs where possible.

```
V-HEATMAP-01  diagnostic layer may not declare binding constraint
V-HEATMAP-02  interpretive binding constraint must reference valid observation
V-HEATMAP-03  at most one binding constraint allowed
V-HEATMAP-04  intervention entries must reference diagnostic observation
```

---

## 8. Deterministic Derivation Chain

### Step 1 — CapabilityInstance Derivation

```typescript
deriveCapabilityInstances(scaffold: ScaffoldModel): CapabilityInstance[]
```

**Identity rule:** `capabilityInstanceId = capabilityId + valueStreamId + activityId`

Stage must not participate in identity.

```typescript
CapabilityInstance {
  id: string
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

```
V-CI-01  capability instance id must be deterministic from tuple
V-CI-02  capability instance must inherit scaffoldIntegrityHash
V-CI-03  capability instance fields must match source activity/scaffold references
```

### Step 2 — TopologyView Derivation

```typescript
deriveTopologyView(
  scaffold: ScaffoldModel,
  capabilityInstances: CapabilityInstance[]
): TopologyView
```

```typescript
TopologyView {
  sourceScaffoldHash: string
  derivationRulesetVersion: string
  capabilityInstanceHash: string
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}

TopologyEdge {
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

Edges may carry multiple bases. No external or heuristic coupling permitted.

```
V-TOPO-01  topology provenance fields required
V-TOPO-02  topology edges may only use allowed basis values
V-TOPO-03  topology edges must reference valid scaffold activities
V-TOPO-04  identical scaffold + ruleset must produce identical topology
```

---

## 9. Implementation Order

Implement in this exact sequence:

1. Update scaffold schema — add `applicationFunctions[]` and `recordClasses[]` to ScaffoldData
2. Extend Activity contract — add `applicationFunctionIds`, `primaryRecordClassId`, `compositeActivityId?`
3. Implement validator rules — reference integrity (V-ACTIVITY-01–06), minimum grammar (V-ACTIVITY-07–10), composite semantics (V-COMPOSITE-01–06)
4. Refactor heatmap schema — three-layer structure with migration function for legacy artefacts
5. Implement `deriveCapabilityInstances(scaffold)` — pure function, deterministic IDs
6. Implement `deriveTopologyView(scaffold, capabilityInstances)` — pure function, allowed bases only
7. Add provenance + hash linking to derived artefacts
8. Unit tests — see acceptance criteria

---

## 10. Non-Goals for Session 11

Do not implement:
- Party/Product modelling
- multi-record activity transitions
- sharable composite parthood
- runtime workflow execution
- external inference topology
- free-text application function tagging

---

## 11. Acceptance Criteria

Session 11 is complete when:

1. Activity validates as: Role + Capability + Control + ApplicationFunction + RecordClass
2. Legacy heatmaps migrate to three-layer structure without data loss
3. CapabilityInstance derives deterministically from `(capabilityId, valueStreamId, activityId)`
4. TopologyView derives only from allowed coupling signals with explainable edge bases
5. Composite activities validate as ordered mereological compositions with boundary continuity
6. No derived constructs are written back into the scaffold
7. Unit tests pass covering: valid execution grammar, missing reference failures, composite continuity, deterministic capability instance IDs, deterministic topology edges, heatmap migration integrity

---

## 12. Canonical Derivation Contracts

These functions are architecture-level contracts. All pure, no mutation of input, deterministic output:

```typescript
validateScaffold(scaffold: ScaffoldModel): ValidationReport
deriveCapabilityInstances(scaffold: ScaffoldModel): CapabilityInstance[]
deriveTopologyView(scaffold: ScaffoldModel, capabilityInstances: CapabilityInstance[]): TopologyView
migrateHeatmap(oldHeatmap: LegacyHeatmap): HeatmapVNext
```

---

## 13. Final Directive

The scaffold must be treated as a **constitutional execution model**, not a convenience DTO.

The key Session 11 additions are:

```
Activity.applicationFunctionIds
Activity.primaryRecordClassId
Activity.compositeActivityId
Scaffold.applicationFunctions[]
Scaffold.recordClasses[]
```

Everything downstream remains derived.
