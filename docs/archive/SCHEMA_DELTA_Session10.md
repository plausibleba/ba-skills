# Schema Delta — Session 10
**Date:** 6 March 2026  
**Status:** Specification — not yet implemented  
**Implements:** D-048 through D-055  
**Target files:** `packages/frontend/src/types.ts`, `schemas/ScaffoldModel.schema.json`, `schemas/FrictionHeatmap.schema.json`

---

## Overview

Three schema artefacts are affected:

1. **ScaffoldModel** — Activity gains three new fields; new RecordClass registry
2. **FrictionHeatmap** — Structural separation into three layers
3. **New derived artefacts** — TopologyView, CapabilityInstance (computed, not authored)

---

## 1. ScaffoldModel Changes

### 1.1 Activity — three new fields

**Current shape (abbreviated):**
```typescript
interface Activity {
  id: string
  name: string
  description?: string
  roleIds: string[]
  capabilityIds: string[]
  controlIds?: string[]
  preOutcome: string
  postOutcome: string
  nextActivityId?: string
  metrics?: Metric[]
  // ...ppit etc
}
```

**New shape:**
```typescript
interface Activity {
  id: string
  name: string
  description?: string
  roleIds: string[]
  capabilityIds: string[]
  controlIds?: string[]
  preOutcome: string
  postOutcome: string
  nextActivityId?: string
  metrics?: Metric[]

  // NEW — D-053
  primaryRecordClassId?: string        // RecordClass this Activity operates on
  applicationFunctionIds?: string[]    // ApplicationFunction substrate references
  compositeActivityId?: string         // Mereological parthood — ordered part of this composite (D-054)

  // ...ppit etc
}
```

**Notes:**
- All three new fields are optional in v1 to allow gradual adoption across existing fixtures
- `applicationFunctionIds` is plural — an Activity may draw on multiple Application Functions
- `compositeActivityId` is singular in v1 (strict parthood); evolves to `compositeMemberships[]` in v2

### 1.2 New top-level registry: RecordClass

**Add to ScaffoldModel:**
```typescript
interface RecordClass {
  id: string                    // e.g. "rc_order", "rc_application", "rc_customer"
  name: string                  // e.g. "Order", "Credit Application", "Customer Record"
  description?: string
  prefLabels?: Record<string, string>  // community vocabulary mapping (D-053 / prefLabel pattern)
}

// In ScaffoldData:
interface ScaffoldData {
  // ...existing fields
  recordClasses?: RecordClass[]   // NEW — registry of RecordClass types
}
```

### 1.3 New top-level registry: ApplicationFunction

**Add to ScaffoldModel:**
```typescript
interface ApplicationFunction {
  id: string                    // e.g. "appfn_workday_recruitment", "appfn_sap_payroll"
  name: string                  // e.g. "Workday Recruitment", "SAP Payroll"
  applicationId?: string        // e.g. "app_workday", "app_sap_hr"
  applicationName?: string      // e.g. "Workday HCM", "SAP HR"
  systemId?: string             // e.g. "sys_workday", "sys_sap"
  systemName?: string           // e.g. "Workday", "SAP"
  prefLabels?: Record<string, string>
}

// In ScaffoldData:
interface ScaffoldData {
  // ...existing fields
  applicationFunctions?: ApplicationFunction[]  // NEW
}
```

**Note:** ApplicationFunction must be a controlled identifier set. Free-text values in `applicationFunctionIds` on Activity are invalid.

### 1.4 Composite Activity validator rules (D-054)

Add to `packages/shared/src/validator.ts`:

```
RULE: If Activity.compositeActivityId is set:
  1. The referenced composite Activity must exist in the same ValueStream
  2. Activity.primaryRecordClassId must equal composite.primaryRecordClassId (if set)
  3. All parts of a composite must form a continuous FSM chain:
     - composite.preOutcome === firstPart.preOutcome
     - composite.postOutcome === lastPart.postOutcome
     - each part's postOutcome === next part's preOutcome
  4. No Activity may reference a compositeActivityId that itself has a compositeActivityId
     (no nested composites in v1)
```

---

## 2. FrictionHeatmap Changes

### 2.1 Structural separation into three layers (D-050)

**Current shape (abbreviated):**
```typescript
interface FrictionObservation {
  id: string
  anchorId: string
  anchorType: 'activity' | 'capability' | 'valueStream'
  category: FrictionCategory
  score: number
  rationale: string              // currently conflates observation + intent
  isBindingConstraint?: boolean
  vendorSolutions?: VendorSolution[]
  userStories?: TransformationUserStory[]
}
```

**New shape — separate the three layers:**
```typescript
// Layer 1: Diagnostic (D-050)
interface FrictionObservation {
  id: string
  anchorId: string
  anchorType: 'activity' | 'capability' | 'valueStream'
  category: FrictionCategory
  score: number
  rationale: string              // describes the friction — pure observation
  confidence?: 'low' | 'medium' | 'high'  // epistemic status of observation
}

// Layer 2: Interpretation (D-050)
interface FrictionInterpretation {
  observationId: string          // references FrictionObservation
  isBindingConstraint?: boolean
  executiveNarrative?: string    // human-committed interpretation
  committedBy?: string           // role that committed this interpretation
  committedAt?: string           // ISO timestamp
}

// Layer 3: Intervention (D-049, D-050)
interface FrictionIntervention {
  observationId: string          // references FrictionObservation
  upliftIntent?: string          // normative statement: what should change (the SBR)
  vendorSolutions?: VendorSolution[]
  userStories?: TransformationUserStory[]
}

// Updated HeatmapData:
interface HeatmapData {
  scaffoldId: string
  scaffoldHash: string
  createdAt: string
  observations: FrictionObservation[]      // Layer 1
  interpretations?: FrictionInterpretation[]  // Layer 2
  interventions?: FrictionIntervention[]   // Layer 3
  // bindingConstraint moved to interpretations layer
}
```

**Migration note:** Existing fixtures use the flat structure. The validator should accept both shapes during transition. The flat shape maps as: `rationale` → `FrictionObservation.rationale`, `isBindingConstraint` → `FrictionInterpretation`, `vendorSolutions`/`userStories` → `FrictionIntervention`.

---

## 3. New Derived Artefacts (not authored, computed)

### 3.1 CapabilityInstance (D-051)

```typescript
// Derived — never authored directly
interface CapabilityInstance {
  id: string                     // hash(capabilityId + valueStreamId + activityId)
  capabilityId: string
  valueStreamId: string
  activityId: string
  prefLabel: string              // human-readable: "Payments — Approve (Acquire)"
  // performance/friction assessment attached here, not to Capability
}
```

**Derivation:** Computed by iterating all Activities in all ValueStreams, emitting one CapabilityInstance per `(capabilityId, valueStreamId, activityId)` tuple.

### 3.2 TopologyView (D-052)

```typescript
// Derived — never authored directly
interface TopologyEdge {
  sourceActivityId: string
  targetActivityId: string
  couplingBasis: 'outcomeChain' | 'sharedRole' | 'sharedControl' |
                 'sharedApplicationFunction' | 'sharedRecordClass' | 'sharedCapability'
  strength?: number              // 0–1, optional
}

interface TopologyView {
  scaffoldId: string
  scaffoldHash: string           // hash of source scaffold
  rulesetVersion: string         // e.g. "topology-v1"
  derivedAt: string
  topologyHash: string           // hash of this derived artefact
  edges: TopologyEdge[]
  capabilityInstances: CapabilityInstance[]
}
```

**Derivation:** Pure function over sealed ScaffoldModel. Inputs: scaffold + ruleset version. Output: TopologyView with own hash. Comparable over time.

---

## 4. Implementation Sequence

Suggested order to avoid breaking existing fixtures:

1. **Add optional fields to Activity** (`primaryRecordClassId`, `applicationFunctionIds`, `compositeActivityId`) — backward compatible, existing fixtures unaffected
2. **Add RecordClass and ApplicationFunction registries to ScaffoldData** — optional, backward compatible
3. **Add composite Activity validator rules** — new validation only triggers if `compositeActivityId` is present
4. **Restructure FrictionHeatmap into three layers** — requires migration path for existing fixtures; implement as schema union (accept both flat and layered)
5. **Implement CapabilityInstance derivation** — new computed output, no schema change required
6. **Implement TopologyView derivation** — new computed output, extends Network View

---

## 5. Fixtures Requiring Update

After schema changes, the following fixtures should be updated to demonstrate the new fields:

| Fixture | Priority | Notes |
|---------|----------|-------|
| `fixtures/Enterprise Banking/scaffold.json` | High | Add `primaryRecordClassId` to key Activities as reference implementation |
| `fixtures/Ofluv Industrial Vehicles/ofluv-scaffold-enhanced.json` | High | SAP scenario — good candidate for `applicationFunctionIds` |
| `fixtures/Puretec/puretec_scaffold.json` | Medium | Presales demo — should demonstrate full field set |
| `fixtures/golden/scaffold.json` | High | Golden fixture must reflect new schema shape |

---

## 6. Open Questions for Next Session

1. Should `prefLabels` be a first-class field on all named schema objects (Activity, Capability, RecordClass, ValueStream), or is it a separate community vocabulary mapping layer?
2. Should the TopologyView be persisted in the ExportBundle, or always recomputed from the scaffold?
3. What is the controlled identifier set for ApplicationFunctions — is there a registry format, or is it fixture-managed?
4. Does the FrictionHeatmap migration need a `schemaVersion` field to distinguish flat vs layered format?
