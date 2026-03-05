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
    [key: string]: Record<string, unknown>;
  };
}
