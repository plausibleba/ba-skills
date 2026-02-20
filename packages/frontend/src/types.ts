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
  nextActivityId?: string | null;
}

export interface ScaffoldElement {
  id: string;
  elementType: string;
  name?: string;
}

export interface ScaffoldData {
  schemaVersion: string;
  scaffoldId: string;
  name: string;
  description?: string;
  elements: {
    valueStreams: Record<string, ScaffoldElement & { activityIds: string[] }>;
    activities: Record<string, ScaffoldActivity>;
    outcomes: Record<string, ScaffoldElement>;
    roles: Record<string, ScaffoldElement>;
    capabilities: Record<string, ScaffoldElement>;
    controls: Record<string, ScaffoldElement>;
    constraints: Record<string, ScaffoldElement>;
    metrics: Record<string, ScaffoldElement>;
    [key: string]: Record<string, unknown>;
  };
}
