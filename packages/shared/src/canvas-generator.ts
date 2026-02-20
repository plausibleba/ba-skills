import { createHash } from "node:crypto";
import { computeScaffoldHash } from "./validator.js";
import type { ScaffoldInput, BaseElement } from "./validator.js";

// --- Types ---

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
  derivedFrom: {
    outcomeIds: string[];
  };
  activityIds: string[];
  aggregates: ColumnAggregates;
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
  generatedAt: string;
  columns: CanvasColumn[];
  summary: CanvasSummary;
}

export type GroupingMode =
  | "OutcomeProgression"
  | "RoleOwnership"
  | "CapabilityDependency"
  | "SequentialChain";

// --- Generator ---

type NamedElement = BaseElement & { name?: string };

export function generateCanvasViewModel(
  scaffold: ScaffoldInput,
  valueStreamId: string,
  groupingMode: GroupingMode = "OutcomeProgression",
): CanvasViewModel {
  const vs = scaffold.elements.valueStreams[valueStreamId];
  if (!vs) {
    throw new Error(`ValueStream '${valueStreamId}' not found in scaffold`);
  }

  const elements = scaffold.elements;
  const vsActivityIds = new Set(vs.activityIds);

  // Walk the nextActivityId chain from the head to get ordering
  const chainOrder: string[] = [];
  const head = vs.activityIds[0];
  if (head) {
    let current: string | null = head;
    const visited = new Set<string>();
    while (current != null && current in elements.activities) {
      if (visited.has(current)) break;
      visited.add(current);
      if (vsActivityIds.has(current)) {
        chainOrder.push(current);
      }
      current = elements.activities[current].nextActivityId ?? null;
    }
  }

  // Group activities by preOutcomeId, preserving chain order within groups
  const outcomeToActivities = new Map<string, string[]>();
  for (const actId of chainOrder) {
    const preOutcome = elements.activities[actId].preOutcomeId;
    let group = outcomeToActivities.get(preOutcome);
    if (!group) {
      group = [];
      outcomeToActivities.set(preOutcome, group);
    }
    group.push(actId);
  }

  // Determine column order: first occurrence of each preOutcomeId in the chain
  const columnOutcomeOrder: string[] = [];
  const seenOutcomes = new Set<string>();
  for (const actId of chainOrder) {
    const preOutcome = elements.activities[actId].preOutcomeId;
    if (!seenOutcomes.has(preOutcome)) {
      seenOutcomes.add(preOutcome);
      columnOutcomeOrder.push(preOutcome);
    }
  }

  // Build columns with aggregates
  const allRoles = new Set<string>();
  const allCaps = new Set<string>();
  const allMetrics = new Set<string>();
  const allControls = new Set<string>();
  const allConstraints = new Set<string>();

  const columns: CanvasColumn[] = columnOutcomeOrder.map((outcomeId, idx) => {
    const actIds = outcomeToActivities.get(outcomeId)!;
    const outcome = elements.outcomes[outcomeId] as NamedElement | undefined;
    const label = outcome?.name ?? outcomeId;

    const colRoles = new Set<string>();
    const colCaps = new Set<string>();
    const colMetrics = new Set<string>();
    const colControls = new Set<string>();
    const colConstraints = new Set<string>();

    for (const actId of actIds) {
      const act = elements.activities[actId];
      for (const r of act.performedByRoleIds) {
        colRoles.add(r);
        allRoles.add(r);
      }
      for (const r of act.involvesRoleIds ?? []) {
        colRoles.add(r);
        allRoles.add(r);
      }
      for (const c of act.requiresCapabilityIds ?? []) {
        colCaps.add(c);
        allCaps.add(c);
      }
      for (const m of act.metricIds ?? []) {
        colMetrics.add(m);
        allMetrics.add(m);
      }
      for (const c of act.controlIds ?? []) {
        colControls.add(c);
        allControls.add(c);
      }
      for (const c of act.constraintIds ?? []) {
        colConstraints.add(c);
        allConstraints.add(c);
      }
    }

    return {
      columnId: `col_${idx}`,
      label,
      derivedFrom: { outcomeIds: [outcomeId] },
      activityIds: actIds,
      aggregates: {
        roleIds: [...colRoles].sort(),
        capabilityIds: [...colCaps].sort(),
        metricIds: [...colMetrics].sort(),
        controlIds: [...colControls].sort(),
        constraintIds: [...colConstraints].sort(),
      },
    };
  });

  // Deterministic viewId from scaffold + valueStream + mode
  const viewHash = createHash("sha256")
    .update(`${scaffold.scaffoldId}:${valueStreamId}:${groupingMode}`)
    .digest("hex")
    .slice(0, 16);

  return {
    schemaVersion: "1.0.0",
    viewId: `view_${viewHash}`,
    scaffoldId: scaffold.scaffoldId,
    scaffoldIntegrityHash: computeScaffoldHash(scaffold),
    valueStreamId,
    groupingMode,
    generatedAt: new Date().toISOString(),
    columns,
    summary: {
      totalActivities: chainOrder.length,
      totalRoles: allRoles.size,
      totalCapabilities: allCaps.size,
      totalMetrics: allMetrics.size,
      totalControls: allControls.size,
      totalConstraints: allConstraints.size,
    },
  };
}
