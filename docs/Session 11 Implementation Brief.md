Below is the repo-ready markdown version you asked for.
It is written so Claude can implement directly without interpretation drift.

⸻

SESSION 11 IMPLEMENTATION BRIEF

File location: docs/SESSION11_BRIEF.md
Audience: Claude (implementation)
Status: Architectural directive
Scope: Schema evolution, validator rules, deterministic derivation chain, heatmap restructuring

⸻

1. Architectural Principles (Now Permanent)

The following invariants must be preserved across the system.

1. Constitutional Scaffold

The ScaffoldModel is constitutional.

It may contain only asserted structure originating from:
	•	imported structured content
	•	human authored modelling
	•	reviewed generated scaffolds

Derived artefacts must never be written back into the scaffold.

Examples of derived artefacts:
	•	CapabilityInstance
	•	TopologyView
	•	Friction analysis
	•	Binding constraint selection

⸻

2. Layer Separation

The reasoning system now has three layers:

Structural Layer
    ScaffoldModel

Diagnostic Layer
    Friction observations

Interpretive Layer
    Binding constraint and executive interpretation

Intervention planning sits downstream.

No diagnostic or interpretive artefact may mutate the structural layer.

⸻

3. Deterministic Derivation Chain

All derived artefacts must be pure functions.

ScaffoldModel
    ↓
CapabilityInstanceView
    ↓
TopologyView
    ↓
Friction Analysis
    ↓
Binding Constraint Selection

Rules:
	•	no hidden state
	•	no UI inference
	•	identical inputs must produce identical outputs

Derived artefacts must carry hash-linked provenance.

⸻

4. Activity Grain Independence

Composite and lower-grain activities are both Activities.

Composition represents mereological parthood, not inheritance.

Zoom levels reflect reasoning grain only.

⸻

2. Execution Grammar for Activity

Every Activity must satisfy the execution grammar:

Role performs Capability
    under Control
    using ApplicationFunction
    to transition RecordClass

This is the minimal constitutional representation of operational execution.

⸻

3. Activity Schema Contract

The Activity contract must now include the following fields.

Activity {
  id: string

  valueStreamId: string

  preOutcomeId: string
  postOutcomeId: string

  roleIds: string[]
  capabilityIds: string[]
  controlIds: string[]

  applicationFunctionIds: string[]     // NEW
  primaryRecordClassId: string         // NEW

  compositeActivityId?: string         // NEW (mereological composition)
}


⸻

4. New Reference Collections

Two new reference collections must be added to the scaffold.

Application Functions

Represents specific functional capability of an application.

ApplicationFunction {
  id: string
  prefLabel: string
  applicationId?: string
}

Example:

Workday.Recruitment
SAP.PayrollProcessing
Salesforce.OpportunityManagement

These represent interference points in topology derivation.

⸻

Record Classes

Represents the record artefact whose lifecycle is governed.

RecordClass {
  id: string
  prefLabel: string
  description?: string
}

Examples:

CustomerRecord
OrderRecord
ApplicationRecord
EmployeeRecord

For v1:
	•	Only RecordClass is modeled.
	•	Party/Product remain implicit.

⸻

5. Validator Rules

The validator must enforce the following.

⸻

5.1 Reference Integrity

All Activity references must resolve.

roleIds -> Role
capabilityIds -> Capability
controlIds -> Control
applicationFunctionIds -> ApplicationFunction
primaryRecordClassId -> RecordClass
compositeActivityId -> Activity


⸻

5.2 Minimum Execution Grammar

Each Activity must include:

roleIds.length >= 1
capabilityIds.length >= 1
applicationFunctionIds.length >= 1
primaryRecordClassId required

controlIds may be empty if governance rules allow.

⸻

5.3 Record Transition Rule

Each Activity transitions exactly one primary RecordClass.

Multi-record transitions are out of scope for v1.

⸻

6. Composite Activity Semantics

Composite Activities represent ordered mereological composition.

They are not hierarchy.

⸻

6.1 Composition Field

compositeActivityId

Meaning:

This Activity is an ordered part of the referenced composite transition.

⸻

6.2 v1 Composition Model

v1 supports:
	•	strict parthood
	•	ordered parthood
	•	single composite membership
	•	same RecordClass across composite and parts

Sharable parthood is a v2 concern.

⸻

6.3 Composite Validation Rules

Validator must enforce:

1. compositeActivityId must resolve to existing Activity

2. part.primaryRecordClassId == composite.primaryRecordClassId

3. firstPart.preOutcome == composite.preOutcome

4. lastPart.postOutcome == composite.postOutcome

5. parts form continuous chain:
   part[i].postOutcome == part[i+1].preOutcome

6. no branching

If any rule fails → validation error.

⸻

7. Heatmap Restructure (Three Layers)

Current heatmap mixes concerns.

It must be separated into three layers.

⸻

7.1 Diagnostic Layer

Pure analysis.

DiagnosticObservation {
  id
  type
  anchors[]
  contributingAnchors[]
  intensity
  evidence
  rationale
  confidence
}

Contains:
	•	friction observations
	•	opportunity observations

No interpretation allowed here.

⸻

7.2 Interpretive Layer

Represents human commitment to interpretation.

InterpretiveConclusion {
  bindingConstraintId
  justification
  confidence
  provenance
}

Rules:
	•	zero or one binding constraint
	•	must reference diagnostic observation

⸻

7.3 Intervention Layer

Action-oriented artefacts.

Intervention {
  id
  sourceObservationId
  proposedSolution?
  linkedStories[]
  vendorMappings[]
}

May remain minimal in v1.

⸻

7.4 Migration Strategy

Provide deterministic migration function.

migrateHeatmap(oldHeatmap) -> newHeatmap

Rules:

friction observations -> diagnosticLayer
bindingConstraint -> interpretiveLayer
solution/vendor/story -> interventionLayer

Preserve identifiers where possible.

⸻

8. Deterministic Derivation Chain

Derived artefacts must follow a strict chain.

⸻

Step 1 — Capability Instance Derivation

deriveCapabilityInstances(scaffold)

Identity rule:

capabilityInstanceId =
    capabilityId + valueStreamId + activityId

Stage does not participate in identity.

⸻

CapabilityInstance structure

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

Derived only. Never stored in scaffold.

⸻

Step 2 — TopologyView Derivation

deriveTopologyView(scaffold, capabilityInstances)

Produces interference mesh.

⸻

TopologyEdge

TopologyEdge {
  sourceActivityId
  targetActivityId
  basis: TopologyBasis[]
}


⸻

Allowed coupling bases

outcomeAdjacency
sharedRole
sharedCapability
sharedControl
sharedApplicationFunction
sharedPrimaryRecord

Edges may carry multiple bases.

⸻

Provenance

Topology artefact must include:

sourceScaffoldHash
derivationRulesetVersion
capabilityInstanceHash

Ensures reproducibility.

⸻

9. Implementation Order

Claude should implement in this order.
	1.	Update scaffold schema
	2.	Add ApplicationFunction and RecordClass collections
	3.	Extend Activity contract
	4.	Implement validator rules
	5.	Implement heatmap migration + restructuring
	6.	Implement deriveCapabilityInstances()
	7.	Implement deriveTopologyView()
	8.	Add provenance + hash linking

⸻

10. Non-Goals for Session 11

Do not implement:
	•	Party/Product modelling
	•	multi-record transitions
	•	sharable composite parthood
	•	runtime workflow execution
	•	external inference topology
	•	free-text application functions

⸻

11. Acceptance Criteria

Session 11 is complete when:
	1.	Activity schema supports execution grammar
	2.	Heatmap migrated to three-layer structure
	3.	CapabilityInstance derived deterministically
	4.	TopologyView derivable with explainable coupling bases
	5.	Composite activities validated as ordered parthood
	6.	Scaffold remains purely constitutional

⸻

12. Directive Summary

Claude should treat the scaffold as a constitutional execution model.

Topology, capability instances, and friction analysis must remain derived artefacts.

Activities must now explicitly encode:

Role
Capability
Control
ApplicationFunction
RecordClass

Composite Activities represent ordered parthood of transitions, not hierarchy.

⸻

If you’d like, in the next step I can also produce a SCHEMA_DELTA_Session11.md companion that shows the exact JSON schema patch Claude should apply. That usually accelerates implementation by another 30–40%.