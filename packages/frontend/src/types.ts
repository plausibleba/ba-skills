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

export interface FrictionObservation {
  observationId: string;
  category: string;
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
  bindingConstraint: BindingConstraint;
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

// Minimal scaffold types for the data we need in the frontend
export interface ScaffoldActivity {
  id: string;
  elementType: string;
  name: string;
  performedByRoleIds: string[];
  preOutcomeId: string;
  postOutcomeId: string;
  requiresCapabilityIds?: string[];
  metricIds?: string[];
  controlIds?: string[];
  constraintIds?: string[];
  exitConditionIds?: string[];
  nextActivityId?: string | null;
  /** Identifies which metric drives throughput projection for this activity */
  throughputMetricId?: string;

  // D-053: Execution grammar fields (Session 11)
  /** ApplicationFunction IDs — controlled identifier set, never free-text.
   *  Hierarchy: System → Application → ApplicationFunction */
  applicationFunctionIds?: string[];
  /** The RecordClass this Activity transitions. v1: Record only (Party/Product implied).
   *  Execution grammar: Role performs Capability under Control using ApplicationFunction
   *  to transition RecordClass to achieve Outcome */
  primaryRecordClassId?: string;
  /** D-054: Mereological parthood — this Activity is an ordered part of the named
   *  composite transition. Not a parent/child tree relation. Not inheritance.
   *  v1: strict ordered parthood, single membership. */
  compositeActivityId?: string;
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
 *  v2 path: add PartyClass and ProductClass once Record foundation is established */
export interface RecordClass {
  id: string;
  prefLabel: string;
  description?: string;
}

export interface ScaffoldData {
  schemaVersion: string;
  scaffoldId: string;
  name: string;
  description?: string;
  elements: {
    valueStreams: Record<string, ScaffoldValueStream>;
    activities: Record<string, ScaffoldActivity>;
    outcomes: Record<string, ScaffoldElement>;
    roles: Record<string, ScaffoldElement>;
    capabilities: Record<string, ScaffoldElement>;
    controls: Record<string, ScaffoldElement>;
    constraints: Record<string, ScaffoldElement>;
    metrics: Record<string, ScaffoldMetric>;
    // D-053: New reference registries (Session 11)
    applicationFunctions?: Record<string, ApplicationFunction>;
    recordClasses?: Record<string, RecordClass>;
    [key: string]: Record<string, unknown>;
  };
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
  | 'sharedPrimaryRecord';

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


// D-050: Heatmap migration function (Session 11)
// Deterministic migration: legacy flat shape → three-layer HeatmapVNext

/** Migrate a legacy HeatmapData to the three-layer HeatmapVNext shape.
 *  Rules:
 *  - observations → diagnosticLayer.observations (mapped to DiagnosticObservation)
 *  - bindingConstraint → interpretiveLayer.bindingConstraint
 *  - solutions/stories on observations → interventionLayer.interventions
 *  IDs are preserved where possible. */
export function migrateHeatmap(legacy: HeatmapData): HeatmapVNext {
  // Map legacy observations to DiagnosticObservations
  const diagnosticObservations: DiagnosticObservation[] = legacy.observations.map(obs => ({
    id: obs.observationId,
    type: 'friction' as const,
    anchors: [obs.primaryAnchor.anchorId, ...(obs.contributingAnchors?.map(a => a.anchorId) ?? [])],
    contributingAnchors: obs.contributingAnchors?.map(a => a.anchorId),
    intensity: typeof obs.intensity.score === 'number' ? obs.intensity.score : undefined,
    rationale: obs.rationale,
    confidence: obs.confidence,
    category: obs.category,
  }));

  // Map solutions to interventions
  const interventions: Intervention[] = legacy.observations
    .filter(obs => obs.solutions && obs.solutions.length > 0)
    .flatMap(obs => (obs.solutions ?? []).map((sol, i) => ({
      id: `${obs.observationId}-sol-${i}`,
      sourceObservationId: obs.observationId,
      proposedSolution: sol.description,
      vendorMappings: sol.vendorFeatureRef
        ? [`${sol.vendorFeatureRef.vendorId}:${sol.vendorFeatureRef.featureId}`]
        : undefined,
    })));

  // Map binding constraint to interpretive layer
  const bindingConstraint: InterpretiveConclusion | undefined = legacy.bindingConstraint
    ? {
        sourceObservationId: legacy.bindingConstraint.bindingAnchorObservationId,
        justification: legacy.bindingConstraint.justification,
        confidence: legacy.bindingConstraint.confidence,
      }
    : undefined;

  return {
    schemaVersion: legacy.schemaVersion,
    heatmapId: legacy.heatmapId,
    scaffoldId: legacy.scaffoldId,
    scaffoldIntegrityHash: legacy.scaffoldIntegrityHash,
    valueStreamId: legacy.valueStreamId,
    createdAt: legacy.createdAt,
    diagnosticLayer: { observations: diagnosticObservations },
    interpretiveLayer: { bindingConstraint },
    interventionLayer: { interventions },
  };
}

// D-051/D-052: Deterministic derivation functions (Session 11)
// Pure functions — no hidden state, no mutation of inputs, identical inputs → identical outputs.

/** Derive a stable deterministic ID for a CapabilityInstance.
 *  Identity: capabilityId + valueStreamId + activityId (stage excluded). */
function deriveCapabilityInstanceId(
  capabilityId: string,
  valueStreamId: string,
  activityId: string
): string {
  // Simple deterministic concatenation — replace with SHA hash in production if needed
  return `ci_${capabilityId}__${valueStreamId}__${activityId}`;
}

/** Derive all CapabilityInstances from a sealed scaffold.
 *  One instance per (capabilityId, valueStreamId, activityId) tuple.
 *  Never stored in scaffold — computed on demand. */
export function deriveCapabilityInstances(
  scaffold: ScaffoldData,
  scaffoldIntegrityHash: string
): CapabilityInstanceView {
  const instances: CapabilityInstance[] = [];
  const activities = scaffold.elements.activities ?? {};
  const valueStreams = scaffold.elements.valueStreams ?? {};

  // For each activity, for each capability it requires
  for (const [activityId, activity] of Object.entries(activities)) {
    const capabilityIds = (activity as ScaffoldActivity).requiresCapabilityIds ?? [];
    // Find which VS this activity belongs to
    const vsId = Object.entries(valueStreams).find(
      ([, vs]) => (vs as ScaffoldValueStream).activityIds?.includes(activityId)
    )?.[0];

    if (!vsId) continue;

    const act = activity as ScaffoldActivity;
    for (const capabilityId of capabilityIds) {
      const id = deriveCapabilityInstanceId(capabilityId, vsId, activityId);
      const capability = scaffold.elements.capabilities?.[capabilityId] as ScaffoldElement | undefined;
      const vs = valueStreams[vsId] as ScaffoldValueStream;

      instances.push({
        id,
        capabilityId,
        valueStreamId: vsId,
        activityId,
        prefLabel: `${vs.name ?? vsId} — ${capability?.name ?? capabilityId}`,
        roleIds: act.performedByRoleIds ?? [],
        controlIds: act.controlIds ?? [],
        applicationFunctionIds: act.applicationFunctionIds ?? [],
        primaryRecordClassId: act.primaryRecordClassId ?? '',
        scaffoldIntegrityHash,
      });
    }
  }

  return {
    scaffoldId: scaffold.scaffoldId,
    scaffoldIntegrityHash,
    instances,
  };
}

/** Derive the topology view from a sealed scaffold + capability instances.
 *  Pure function — coupling edges based only on constitutionally asserted scaffold fields.
 *  Allowed coupling signals: outcomeAdjacency, sharedRole, sharedCapability,
 *  sharedControl, sharedApplicationFunction, sharedPrimaryRecord */
export function deriveTopologyView(
  scaffold: ScaffoldData,
  capabilityInstanceView: CapabilityInstanceView,
  scaffoldIntegrityHash: string,
  rulesetVersion: string = 'topology-v1'
): TopologyView {
  const activities = scaffold.elements.activities ?? {};
  const activityList = Object.entries(activities).map(([id, act]) => ({
    id,
    ...(act as ScaffoldActivity),
  }));

  const edgeMap = new Map<string, TopologyEdge>();

  const addEdge = (sourceId: string, targetId: string, basis: TopologyBasis) => {
    if (sourceId === targetId) return;
    const key = `${sourceId}→${targetId}`;
    if (edgeMap.has(key)) {
      const existing = edgeMap.get(key)!;
      if (!existing.basis.includes(basis)) existing.basis.push(basis);
    } else {
      edgeMap.set(key, { sourceActivityId: sourceId, targetActivityId: targetId, basis: [basis] });
    }
  };

  // 1. Outcome adjacency (within/across streams)
  for (const act of activityList) {
    if (act.nextActivityId) {
      addEdge(act.id, act.nextActivityId, 'outcomeAdjacency');
    }
  }

  // 2–6. Cross-activity coupling signals
  const fields: Array<{ key: keyof ScaffoldActivity; basis: TopologyBasis }> = [
    { key: 'performedByRoleIds', basis: 'sharedRole' },
    { key: 'controlIds', basis: 'sharedControl' },
    { key: 'applicationFunctionIds', basis: 'sharedApplicationFunction' },
  ];

  for (const { key, basis } of fields) {
    const index = new Map<string, string[]>();
    for (const act of activityList) {
      const ids = (act[key] as string[] | undefined) ?? [];
      for (const id of ids) {
        if (!index.has(id)) index.set(id, []);
        index.get(id)!.push(act.id);
      }
    }
    for (const actIds of index.values()) {
      for (let i = 0; i < actIds.length; i++) {
        for (let j = i + 1; j < actIds.length; j++) {
          addEdge(actIds[i], actIds[j], basis);
          addEdge(actIds[j], actIds[i], basis);
        }
      }
    }
  }

  // primaryRecordClassId coupling
  const recordIndex = new Map<string, string[]>();
  for (const act of activityList) {
    const rcId = act.primaryRecordClassId;
    if (!rcId) continue;
    if (!recordIndex.has(rcId)) recordIndex.set(rcId, []);
    recordIndex.get(rcId)!.push(act.id);
  }
  for (const actIds of recordIndex.values()) {
    for (let i = 0; i < actIds.length; i++) {
      for (let j = i + 1; j < actIds.length; j++) {
        addEdge(actIds[i], actIds[j], 'sharedPrimaryRecord');
        addEdge(actIds[j], actIds[i], 'sharedPrimaryRecord');
      }
    }
  }

  // Capability co-deployment via CapabilityInstances
  const capIndex = new Map<string, string[]>();
  for (const inst of capabilityInstanceView.instances) {
    if (!capIndex.has(inst.capabilityId)) capIndex.set(inst.capabilityId, []);
    capIndex.get(inst.capabilityId)!.push(inst.activityId);
  }
  for (const actIds of capIndex.values()) {
    const unique = [...new Set(actIds)];
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        addEdge(unique[i], unique[j], 'sharedCapability');
        addEdge(unique[j], unique[i], 'sharedCapability');
      }
    }
  }

  // Build nodes (all activities that appear in edges)
  const valueStreams = scaffold.elements.valueStreams ?? {};
  const activityVsMap = new Map<string, string>();
  for (const [vsId, vs] of Object.entries(valueStreams)) {
    for (const actId of (vs as ScaffoldValueStream).activityIds ?? []) {
      activityVsMap.set(actId, vsId);
    }
  }

  const nodeIds = new Set<string>();
  for (const edge of edgeMap.values()) {
    nodeIds.add(edge.sourceActivityId);
    nodeIds.add(edge.targetActivityId);
  }

  const nodes: TopologyNode[] = [...nodeIds].map(activityId => ({
    activityId,
    valueStreamId: activityVsMap.get(activityId) ?? '',
  }));

  // Simple hash for capability instance view (deterministic string)
  const ciHash = `ci-hash-${capabilityInstanceView.instances.length}-${capabilityInstanceView.scaffoldIntegrityHash}`;

  return {
    sourceScaffoldHash: scaffoldIntegrityHash,
    derivationRulesetVersion: rulesetVersion,
    capabilityInstanceHash: ciHash,
    derivedAt: new Date().toISOString(),
    nodes,
    edges: [...edgeMap.values()],
  };
}
