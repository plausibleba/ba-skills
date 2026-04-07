// Types mirroring the CanvasViewModel schema and ValidationReport.
// Kept local to avoid coupling frontend build to @vcc/shared (which uses Node APIs).

export interface ColumnAggregates {
  roleIds: string[];
  capabilityIds: string[];
  metricIds: string[];
  controlIds: string[];
  constraintIds: string[];
}

export interface CanvasColumn {
  columnId: string;
  label: string;
  description?: string;
  derivedFrom?: {
    outcomeIds?: string[];
    roleIds?: string[];
    capabilityIds?: string[];
  };
  activityIds: string[];
  aggregates?: ColumnAggregates;
}

export interface CanvasSummary {
  totalActivities: number;
  totalRoles: number;
  totalCapabilities: number;
  totalMetrics: number;
  totalControls: number;
  totalConstraints: number;
}

export interface CanvasViewModel {
  schemaVersion: string;
  viewId: string;
  scaffoldId: string;
  scaffoldIntegrityHash: string;
  valueStreamId: string;
  groupingMode: string;
  generatedAt?: string;
  columns: CanvasColumn[];
  summary?: CanvasSummary;
}

export interface Finding {
  severity: "Error" | "Warning";
  ruleId: string;
  code: string;
  message: string;
  path?: string;
}

export interface ValidationReport {
  reportId: string;
  schemaVersion: string;
  createdAt: string;
  status: "Valid" | "ValidWithWarnings" | "Invalid";
  summary: {
    errorCount: number;
    warningCount: number;
  };
  findings: Finding[];
}

// --- Heatmap types ---

export interface AnchorRef {
  anchorType: string;
  anchorId: string;
}

export interface Intensity {
  scale: "0-10" | "ordinal";
  score?: number;
  severity?: "Low" | "Medium" | "High" | "Critical";
}

// --- F-002: Solutions layer ---

export type SolutionType = "People" | "Process" | "Information" | "Technology";

export interface VendorFeatureRef {
  vendorId: string;       // e.g. "salesforce"
  vendorName: string;     // e.g. "Salesforce"
  featureId: string;      // e.g. "af-skill-account-mgmt"
  featureName: string;    // e.g. "Agentforce Skill: Account Management"
  categoryName: string;   // e.g. "Sales AI"
  rationale: string;      // consultant-authored, 1-2 sentences
}

export interface Solution {
  solutionId: string;
  type: SolutionType;
  description: string;
  vendorFeatureRef?: VendorFeatureRef;  // Technology solutions only
  freeTextFeature?: string;             // fallback when feature not in library
}

// --- Vendor Feature Library ---

export interface VendorFeature {
  featureId: string;
  name: string;
  description: string;
}

export interface VendorCategory {
  categoryId: string;
  categoryName: string;
  features: VendorFeature[];
}

export interface VendorFeatureLibrary {
  vendorId: string;
  vendorName: string;
  categories: VendorCategory[];
}

// ---

/**
 * Observation taxonomy — the broad type of operational finding.
 * Each type carries different analytical weight and response patterns:
 * - painPoint: A subjective experience of difficulty reported by stakeholders
 * - friction: A structural impediment measurable through process analysis
 * - risk: A potential future failure mode that hasn't yet materialised
 * - control: A governance mechanism that may be over- or under-applied
 * - constraint: A hard boundary (regulatory, contractual, physical) that limits options
 */
export type ObservationType = "painPoint" | "friction" | "risk" | "control" | "constraint";

/**
 * Observation lifecycle status — tracks the consensus journey.
 * - suggested: Initial state — AI-intuited or human-proposed, not yet reviewed
 * - agreed: Stakeholders have reviewed and confirmed this observation is valid
 * - discarded: Reviewed and determined to be invalid, duplicate, or out of scope
 * - resolved: The underlying issue has been addressed (keeps audit trail)
 */
export type ObservationStatus = "suggested" | "agreed" | "discarded" | "resolved";

/**
 * Provenance — how this observation came into existence.
 * This is a READ-ONLY field; it cannot be changed after creation.
 * - provided: Explicitly supplied by a human stakeholder (interview, workshop, import)
 * - intuited: Inferred by AI analysis of structural patterns in the scaffold
 */
export type ObservationProvenance = "provided" | "intuited";

export interface FrictionObservation {
  observationId: string;
  category: string;
  /** Broad observation type — defaults to "friction" for backward compatibility */
  observationType?: ObservationType;
  /** Lifecycle status — defaults to "suggested" */
  status?: ObservationStatus;
  /** How this observation was created — read-only after creation */
  provenance?: ObservationProvenance;
  primaryAnchor: AnchorRef;
  contributingAnchors?: AnchorRef[];
  intensity: Intensity;
  confidence?: number;
  rationale: string;
  observedAt?: string;
  solutions?: Solution[];   // F-002: optional solutions array
}

export interface BindingConstraint {
  findingId: string;
  bindingAnchor: AnchorRef;
  bindingAnchorObservationId: string;
  justification: string;
  confidence?: number;
}

export interface HeatmapData {
  schemaVersion: string;
  heatmapId: string;
  scaffoldId: string;
  scaffoldIntegrityHash?: string;
  valueStreamId: string;
  createdAt: string;
  observations: FrictionObservation[];
  bindingConstraint: BindingConstraint | null;
}


// D-050: Three-layer heatmap structure (Session 11)
// The current HeatmapData above is the legacy shape — preserved for migration.
// New target shape separates diagnostic, interpretive, and intervention concerns.

/** Diagnostic layer — pure analysis only. No interpretation here. */
export interface DiagnosticObservation {
  id: string;
  type: 'friction' | 'opportunity';
  anchors: string[];
  contributingAnchors?: string[];
  intensity?: number;
  evidence?: string[];
  rationale?: string;
  confidence?: number;
  category?: string;
}

export interface DiagnosticLayer {
  observations: DiagnosticObservation[];
}

/** Interpretive layer — human judgement formally committed.
 *  Zero or one binding constraint. Must reference a diagnostic observation. */
export interface InterpretiveConclusion {
  sourceObservationId: string;
  justification?: string;
  confidence?: number;
  provenance?: string;  // who committed this interpretation
}

export interface InterpretiveLayer {
  bindingConstraint?: InterpretiveConclusion;
}

/** Intervention layer — action-oriented artefacts derived from interpretation.
 *  May remain sparse in v1 — schema boundary exists to prevent leakage into diagnostic layer. */
export interface Intervention {
  id: string;
  sourceObservationId: string;
  proposedSolution?: string;
  linkedStoryIds?: string[];
  vendorMappings?: string[];
}

export interface InterventionLayer {
  interventions: Intervention[];
}

/** HeatmapVNext — three-layer target shape.
 *  Migration: migrateHeatmap(LegacyHeatmap) → HeatmapVNext */
export interface HeatmapVNext {
  schemaVersion: string;
  heatmapId: string;
  scaffoldId: string;
  scaffoldIntegrityHash?: string;
  valueStreamId: string;
  createdAt: string;
  diagnosticLayer: DiagnosticLayer;
  interpretiveLayer: InterpretiveLayer;
  interventionLayer: InterventionLayer;
}

// --- Transformation layer ---

export interface TransformationUserStory {
  /** Unique ID, e.g. "US-fr_001-abc123" */
  storyId: string;
  /** The friction observation (SBR) this story addresses */
  observationId: string;
  /** The activity this story is scoped to */
  activityId?: string;
  /** The capability this SBR is anchored to — resolved at generation time.
   *  Populated from observation.primaryAnchor when anchorType === "Capability",
   *  or from the activity's requiresCapabilityIds[0] when anchorType === "Activity". */
  capabilityId?: string;
  /** Human-readable capability name — denormalised for export convenience */
  capabilityName?: string;
  // Story body
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  // Planning metadata
  storyPoints?: number;
  priority?: "critical" | "high" | "medium" | "low";
  epicId?: string;
  // Lifecycle: draft → ready → sprint → done
  status: "draft" | "ready" | "sprint" | "done";
  createdAt: string;
  updatedAt?: string;
}

/** Convert a story to a Jira CSV import row */
export function toJiraExport(story: TransformationUserStory) {
  const priority = story.priority
    ? story.priority.charAt(0).toUpperCase() + story.priority.slice(1)
    : undefined;

  const description = [
    `As a ${story.asA}, I want to ${story.iWant}, so that ${story.soThat}`,
    ``,
    `Acceptance Criteria:`,
    ...story.acceptanceCriteria.map((ac) => `- ${ac}`),
    ``,
    `SBR: ${story.observationId}`,
    story.capabilityName ? `Capability: ${story.capabilityName}` : null,
  ].filter(Boolean).join("\n");

  return {
    "Story ID":    story.storyId,
    "Summary":     `As a ${story.asA}, I want to ${story.iWant}`,
    "Description": description,
    "SBR ID":      story.observationId,
    "Capability":  story.capabilityName ?? story.capabilityId ?? "",
    "Story Points": story.storyPoints,
    "Priority":    priority,
    "Epic Link":   story.epicId,
    "Labels":      ["VCC", story.observationId].join(","),
    "Issue Type":  "Story",
  };
}

// --- Scaffold types ---
// R-010: Strict scaffold interface — Session 29 (7 April 2026)
// All element types fully typed to eliminate `as any` casts across the codebase.
// Field names follow Pass B (pipeline source of truth): requiresCapabilityIds is canonical.

/**
 * PPIT decomposition entry — generated by Pass C (Map PPIT enrichment).
 * One entry per capability mapped to an activity, containing the fine-grained
 * Process, Practice, Information, Technology breakdown.
 */
export interface PPITEntry {
  roleIds: string[];
  /** Sub-activity descriptions (free text, not IDs) */
  activities: string[];
  informationObjectIds?: string[];
  technologyAppIds?: string[];
}

export interface ScaffoldActivity {
  id: string;
  elementType: string;
  name: string;
  description?: string;
  performedByRoleIds: string[];
  preOutcomeId: string;
  postOutcomeId: string;
  /** Canonical capability reference (Pass B field name). */
  requiresCapabilityIds?: string[];
  /** V5 alias — runtime scaffolds may use this instead of requiresCapabilityIds.
   *  Consumers should read: `act.enabledByCapabilityIds ?? act.requiresCapabilityIds` */
  enabledByCapabilityIds?: string[];
  informationObjectIds?: string[];
  metricIds?: string[];
  controlIds?: string[];
  constraintIds?: string[];
  exitConditionIds?: string[];
  nextActivityId?: string | null;
  /** Reverse lookup: which value stream this activity belongs to */
  valueStreamId?: string;
  /** Ordering hint for display */
  stageNumber?: number;
  /** Identifies which metric drives throughput projection for this activity */
  throughputMetricId?: string;
  /** PPIT decomposition per capability — generated by Pass C enrichment */
  capabilityPPIT?: Record<string, PPITEntry>;

  // D-053: Execution grammar fields (Session 11)
  /** ApplicationFunction IDs — controlled identifier set, never free-text.
   *  Hierarchy: System → Application → ApplicationFunction */
  applicationFunctionIds?: string[];
  /** The RecordClass this Activity transitions. v1: Record only (Party/Product implied).
   *  Execution grammar: Role performs Capability under Control using ApplicationFunction
   *  to transition RecordClass to achieve Outcome */
  primaryRecordClassId?: string;
  /** R-013 Phase 2: The lifecycle state this activity transitions the record TO.
   *  Derived from postOutcomeId → LifecycleState mapping. */
  lifecycleStateId?: string;
  /** D-054: Mereological parthood — this Activity is an ordered part of the named
   *  composite transition. Not a parent/child tree relation. Not inheritance.
   *  v1: strict ordered parthood, single membership. */
  compositeActivityId?: string;
}

/**
 * Helper: get the capability IDs from an activity regardless of field name variant.
 * Handles both v4 (requiresCapabilityIds) and v5 (enabledByCapabilityIds).
 */
export function getCapabilityIds(act: ScaffoldActivity): string[] {
  return act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? [];
}

export interface ScaffoldValueStream {
  id: string;
  elementType: string;
  name?: string;
  description?: string;
  activityIds: string[];
  capabilityIds?: string[];
  metricIds?: string[];
  /** Secondary outcomes that can trigger this value stream (e.g. governance recalibration) */
  secondaryTriggerOutcomeIds?: string[];
  /** Layout zone for canvas positioning (v4 field name) */
  layoutZone?: string;
  /** Layout zone (v5 field name) — consumers should read: `vs.layoutZone ?? vs.zone` */
  zone?: string;
  /** Accountable stakeholder role ID */
  accountableStakeholder?: string;
  /** V5 chain head — alternative to activityIds for chain-walk resolution */
  activityChainHead?: string;
}

/** Role element — extends ScaffoldElement with optional description */
export interface ScaffoldRole extends ScaffoldElement {
  description?: string;
}

/** Outcome element — extends ScaffoldElement with optional description */
export interface ScaffoldOutcome extends ScaffoldElement {
  description?: string;
}

/** Technology Application — referenced by PPIT technologyAppIds */
export interface ScaffoldTechnologyApp extends ScaffoldElement {
  description?: string;
  vendor?: string;
  category?: string;
}

/** Business Concept — generated by concept model skill, imported from PlausibleBA or reference model */
export interface ScaffoldConcept extends ScaffoldElement {
  description?: string;
  /** Alias for description (reference model import uses this field name) */
  definition?: string;
  /** Capsicum Triad classification */
  triadRole?: "record" | "party" | "product";
  /** Concept type from reference model import (e.g. "Record", "Party", "Product") */
  type?: string;
  /** Lifecycle states (inherited from linked InformationObject) */
  lifecycleStates?: LifecycleState[];
  /** Related concept entries */
  relationships?: Array<{ targetId?: string; type?: string; label?: string }>;
  /** Arbitrary properties bag */
  properties?: Record<string, unknown>;
  /** Related concept IDs */
  relatedConceptIds?: string[];
  /** Capability IDs that govern this concept */
  anchorCapabilityIds?: string[];
  /** Activity IDs where this concept is primary */
  anchorActivityIds?: string[];
}

// --- Network View types ---

export interface NetworkNode {
  vsId: string;
  name: string;
  description?: string;
  stageCount: number;
  frictionCount: number;
  hasBindingConstraint: boolean;
  bindingStageName?: string;
  confidence?: number;
  layer: number;      // DAG layer (0 = leftmost)
  row: number;        // vertical position within layer
}

export interface NetworkEdge {
  sourceVsId: string;
  targetVsId: string;
  outcomeId: string;
  outcomeName: string;
  isFeedback: boolean; // back-edge in DAG
}

export interface ScaffoldElement {
  id: string;
  elementType: string;
  name?: string;
}

/**
 * Capability hierarchy — all levels share one type with a level discriminator.
 * Level 1 = Business Area, Level 2 = Domain, Level 3 = Capability Group,
 * Level 4 = Capability (operational, mapped to stages).
 * UI labels are derived from level; persistence is polymorphic.
 */
export interface ScaffoldCapability extends ScaffoldElement {
  level?: 1 | 2 | 3 | 4;
  parentId?: string | null;
  description?: string;
  /** Business object / record class this capability governs (level 4 only) */
  businessObject?: string;
}

export const CAPABILITY_LEVEL_LABELS: Record<number, string> = {
  1: "Business Area",
  2: "Domain",
  3: "Capability Group",
  4: "Capability",
};

/**
 * Information Object with optional lifecycle states for state-diagram rendering.
 * States represent the governed lifecycle of the record (e.g. Lead: New → Qualified → Converted).
 */
export interface ScaffoldInfoObject extends ScaffoldElement {
  description?: string;
  /** Ordered lifecycle states for this information object */
  lifecycleStates?: LifecycleState[];
}

/** LifecycleState — a named state in a record/IO lifecycle progression.
 *  Used by both ScaffoldInfoObject (IO lifecycle diagrams) and RecordClass
 *  (R-013 record lifecycle coupling). The ordinal defines adjacency for
 *  coupling derivation; position classifies the state semantically. */
export interface LifecycleState {
  id: string;
  label: string;
  /** Position in lifecycle: initial, terminal, intermediate, or decision */
  position: "initial" | "intermediate" | "terminal" | "decision";
  /** 0-based ordinal in the lifecycle sequence (R-013 Phase 2) */
  ordinal?: number;
  /** IDs of states this state can transition to */
  transitionsTo?: string[];
  /** Activity that triggers this transition */
  triggerActivityId?: string;
  /** The outcome ID that represents this lifecycle transition (R-013 Phase 2) */
  outcomeId?: string;
}

/**
 * Sub-activity within a stage, with DAG edges for sequencing.
 * Used for the activity flow graph in the Stage Inspector.
 */
export interface SubActivity {
  id: string;
  label: string;
  /** "activity" = work step, "gate" = decision point */
  nodeType: "activity" | "gate";
  /** IDs of sub-activities this flows into */
  nextIds?: string[];
  /** For gates: condition labels for each outgoing edge */
  edgeLabels?: Record<string, string>;
  /** Associated role ID (Responsibility) */
  roleId?: string;
  /** Associated outcome description */
  outcome?: string;
}

/** Extended metric element with measure data for throughput calculations */
export interface ScaffoldMetric extends ScaffoldElement {
  unit?: string;
  direction?: "Decrease" | "Increase" | "Attain" | "Maintain";
  currentMeasure?: number;
  targetMeasure?: number;
  baselineMeasure?: number;
}

/** Engagement parameters for throughput impact calculation (UI-only state) */
export interface EngagementParams {
  entityVolume: number;
  assessmentFrequency: number;
  fteCapacityDays: number;
  fteCost?: number | null;
}


// D-053: New reference registries (Session 11)

/** ApplicationFunction — specific feature set supporting a Capability.
 *  Must be a controlled identifier set, never free-text tags.
 *  Example IDs: "appfn_workday_recruitment", "appfn_sap_payroll"
 *  Example prefLabels: "Workday Recruitment", "SAP Payroll" */
export interface ApplicationFunction {
  id: string;
  prefLabel: string;
  applicationId?: string;   // e.g. "app_workday", "app_sap_hr"
  applicationName?: string; // e.g. "Workday HCM", "SAP HR"
}

/** RecordClass — the governed interaction record whose lifecycle the value stream defines.
 *  v1: Record only. Party (subject) and Product (object) are implied by the Record.
 *  Example: CustomerRecord (not "Customer" — the record is distinct from the person)
 *  v2 path: add PartyClass and ProductClass once Record foundation is established.
 *
 *  R-013 Phase 2: lifecycleStates encodes the record's ordered state progression.
 *  Lifecycle adjacency between activities is derived from these states — the
 *  relationship IS the semantics (no flags). */
export interface RecordClass {
  id: string;
  prefLabel: string;
  description?: string;
  /** Ordered lifecycle states for this record. Derived from outcome chain. */
  lifecycleStates?: LifecycleState[];
}

export interface ScaffoldElements {
  valueStreams: Record<string, ScaffoldValueStream>;
  activities: Record<string, ScaffoldActivity>;
  outcomes: Record<string, ScaffoldOutcome>;
  roles: Record<string, ScaffoldRole>;
  capabilities: Record<string, ScaffoldCapability>;
  controls: Record<string, ScaffoldElement>;
  constraints: Record<string, ScaffoldElement>;
  metrics: Record<string, ScaffoldMetric>;
  measures?: Record<string, Record<string, unknown>>;
  /** Information objects with optional lifecycle states */
  informationObjects?: Record<string, ScaffoldInfoObject>;
  /** Technology applications referenced by PPIT entries */
  technologyApps?: Record<string, ScaffoldTechnologyApp>;
  /** Business concepts (from concept model skill / PlausibleBA import) */
  concepts?: Record<string, ScaffoldConcept>;
  // D-053: New reference registries (Session 11)
  applicationFunctions?: Record<string, ApplicationFunction>;
  recordClasses?: Record<string, RecordClass>;
  /** Sub-activity DAGs per stage (keyed by activity/stage ID) */
  subActivityGraphs?: Record<string, { nodes: SubActivity[] }>;
  /** Cross-mapping results (VS↔Capability) */
  crossMaps?: Record<string, unknown>;
  /** Catch-all for forward-compatibility with new element types.
   *  New element types should be added as explicit fields above. */
  [key: string]: Record<string, unknown> | undefined;
}

export interface ScaffoldData {
  schemaVersion: string;
  scaffoldId: string;
  name: string;
  description?: string;
  elements: ScaffoldElements;
  /** Layout zones for Network View positioning */
  layoutZones?: Array<{ id: string; label: string; row: number }>;
}

// D-051/D-052: Derived artefact types (Session 11)
// These are NEVER stored in the scaffold. Computed from sealed scaffold + ruleset.

/** CapabilityInstance — capability-in-context. Derived, never authored.
 *  Identity: hash(capabilityId + valueStreamId + activityId)
 *  Stage is presentation only — not part of identity. */
export interface CapabilityInstance {
  id: string;                        // deterministic hash of (capabilityId, valueStreamId, activityId)
  capabilityId: string;
  valueStreamId: string;
  activityId: string;
  prefLabel: string;                 // human-readable: "Payments — Approve (Acquire)"
  roleIds: string[];
  controlIds: string[];
  applicationFunctionIds: string[];
  primaryRecordClassId: string;
  scaffoldIntegrityHash: string;     // inherited from source scaffold
}

export interface CapabilityInstanceView {
  scaffoldId: string;
  scaffoldIntegrityHash: string;
  instances: CapabilityInstance[];
}

/** TopologyBasis — explicit coupling signal. No heuristic or external inference. */
export type TopologyBasis =
  | 'outcomeAdjacency'
  | 'sharedRole'
  | 'sharedCapability'
  | 'sharedControl'
  | 'sharedApplicationFunction'
  | 'sharedPrimaryRecord'
  | 'lifecycleAdjacency';

export interface TopologyNode {
  activityId: string;
  valueStreamId: string;
}

/** Each edge carries explicit basis — every coupling is explainable. */
export interface TopologyEdge {
  sourceActivityId: string;
  targetActivityId: string;
  basis: TopologyBasis[];  // may carry multiple bases
}

/** TopologyView — derived deterministic interference mesh.
 *  Pure function: deriveTopologyView(scaffold, capabilityInstances) → TopologyView
 *  Carries hash-linked provenance for comparison across scaffold revisions. */
export interface TopologyView {
  sourceScaffoldHash: string;
  derivationRulesetVersion: string;  // e.g. "topology-v1"
  capabilityInstanceHash: string;
  derivedAt: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// ── Derivation functions moved to network-derivation.ts (Session 11 refactor) ──
// migrateHeatmap()          → store/network-derivation.ts
// deriveCapabilityInstances() → store/network-derivation.ts
// deriveTopologyView()       → store/network-derivation.ts
