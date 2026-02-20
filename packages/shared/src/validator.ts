import { randomUUID } from "node:crypto";

// --- Types ---

export interface AnchorRef {
  anchorType: string;
  anchorId: string;
}

export interface Finding {
  severity: "Error" | "Warning";
  ruleId: string;
  code: string;
  message: string;
  path?: string;
  anchor?: AnchorRef;
  relatedAnchors?: AnchorRef[];
  remediationHint?: string;
}

export interface ValidationReport {
  reportId: string;
  schemaVersion: string;
  createdAt: string;
  status: "Valid" | "ValidWithWarnings" | "Invalid";
  summary: {
    errorCount: number;
    warningCount: number;
    ruleCounts: {
      errorsByRule: Record<string, number>;
      warningsByRule: Record<string, number>;
    };
  };
  artifacts: {
    scaffold: {
      scaffoldId: string;
      modelIntegrityHash: string;
    };
  };
  findings: Finding[];
}

export interface BaseElement {
  id: string;
}

export interface ValueStreamElement extends BaseElement {
  activityIds: string[];
  capabilityIds?: string[];
  metricIds?: string[];
}

export interface ActivityElement extends BaseElement {
  preOutcomeId: string;
  postOutcomeId: string;
  performedByRoleIds: string[];
  involvesRoleIds?: string[];
  requiresCapabilityIds?: string[];
  controlIds?: string[];
  constraintIds?: string[];
  metricIds?: string[];
  nextActivityId?: string | null;
  entryConditionIds?: string[];
  exitConditionIds?: string[];
  flowLogicIds?: string[];
}

export interface MetricElement extends BaseElement {
  measures: {
    targets: Array<{ targetType: string; targetId: string }>;
    baselineMeasureId?: string;
    currentMeasureId?: string;
    targetMeasureId?: string;
  };
}

export interface ScaffoldElements {
  valueStreams: Record<string, ValueStreamElement>;
  activities: Record<string, ActivityElement>;
  outcomes: Record<string, BaseElement>;
  roles: Record<string, BaseElement>;
  capabilities: Record<string, BaseElement>;
  controls: Record<string, BaseElement>;
  constraints: Record<string, BaseElement>;
  directives: Record<string, BaseElement>;
  deonticLogic: Record<string, BaseElement>;
  flowLogic: Record<string, BaseElement>;
  concepts: Record<string, BaseElement>;
  properties: Record<string, BaseElement>;
  metrics: Record<string, MetricElement>;
  measures: Record<string, BaseElement>;
  conditions: Record<string, BaseElement>;
}

export interface ScaffoldInput {
  scaffoldId: string;
  name: string;
  schemaVersion: string;
  modelIntegrityHash?: string;
  elements: ScaffoldElements;
}

// --- Helpers ---

const PLACEHOLDER_HASH = "0".repeat(64);

function refError(
  refId: string,
  targetMapName: string,
  path: string,
  anchor: AnchorRef,
): Finding {
  return {
    severity: "Error",
    ruleId: "V-SCAFFOLD-01",
    code: "UNRESOLVED_REF",
    message: `Reference '${refId}' not found in elements.${targetMapName}`,
    path,
    anchor,
    remediationHint: `Add '${refId}' to elements.${targetMapName} or correct the reference.`,
  };
}

function checkSingleRef(
  refId: string,
  targetMap: Record<string, unknown>,
  targetMapName: string,
  path: string,
  anchor: AnchorRef,
  findings: Finding[],
): void {
  if (!(refId in targetMap)) {
    findings.push(refError(refId, targetMapName, path, anchor));
  }
}

function checkArrayRefs(
  ids: string[] | undefined,
  targetMap: Record<string, unknown>,
  targetMapName: string,
  basePath: string,
  fieldName: string,
  anchor: AnchorRef,
  findings: Finding[],
): void {
  if (!ids) return;
  for (let i = 0; i < ids.length; i++) {
    if (!(ids[i] in targetMap)) {
      findings.push(
        refError(ids[i], targetMapName, `${basePath}/${fieldName}/${i}`, anchor),
      );
    }
  }
}

// --- Rule Functions (pure) ---

export function checkReferentialIntegrity(
  elements: ScaffoldElements,
): Finding[] {
  const findings: Finding[] = [];

  for (const [actId, act] of Object.entries(elements.activities)) {
    const base = `/elements/activities/${actId}`;
    const anchor: AnchorRef = { anchorType: "Activity", anchorId: actId };

    checkSingleRef(act.preOutcomeId, elements.outcomes, "outcomes", `${base}/preOutcomeId`, anchor, findings);
    checkSingleRef(act.postOutcomeId, elements.outcomes, "outcomes", `${base}/postOutcomeId`, anchor, findings);

    if (act.nextActivityId != null) {
      checkSingleRef(act.nextActivityId, elements.activities, "activities", `${base}/nextActivityId`, anchor, findings);
    }

    checkArrayRefs(act.performedByRoleIds, elements.roles, "roles", base, "performedByRoleIds", anchor, findings);
    checkArrayRefs(act.involvesRoleIds, elements.roles, "roles", base, "involvesRoleIds", anchor, findings);
    checkArrayRefs(act.requiresCapabilityIds, elements.capabilities, "capabilities", base, "requiresCapabilityIds", anchor, findings);
    checkArrayRefs(act.controlIds, elements.controls, "controls", base, "controlIds", anchor, findings);
    checkArrayRefs(act.constraintIds, elements.constraints, "constraints", base, "constraintIds", anchor, findings);
    checkArrayRefs(act.metricIds, elements.metrics, "metrics", base, "metricIds", anchor, findings);
    checkArrayRefs(act.entryConditionIds, elements.conditions, "conditions", base, "entryConditionIds", anchor, findings);
    checkArrayRefs(act.exitConditionIds, elements.conditions, "conditions", base, "exitConditionIds", anchor, findings);
    checkArrayRefs(act.flowLogicIds, elements.flowLogic, "flowLogic", base, "flowLogicIds", anchor, findings);
  }

  for (const [vsId, vs] of Object.entries(elements.valueStreams)) {
    const base = `/elements/valueStreams/${vsId}`;
    const anchor: AnchorRef = { anchorType: "ValueStream", anchorId: vsId };

    checkArrayRefs(vs.activityIds, elements.activities, "activities", base, "activityIds", anchor, findings);
    checkArrayRefs(vs.capabilityIds, elements.capabilities, "capabilities", base, "capabilityIds", anchor, findings);
    checkArrayRefs(vs.metricIds, elements.metrics, "metrics", base, "metricIds", anchor, findings);
  }

  for (const [metricId, metric] of Object.entries(elements.metrics)) {
    const base = `/elements/metrics/${metricId}/measures`;
    const anchor: AnchorRef = { anchorType: "Metric", anchorId: metricId };

    if (metric.measures.baselineMeasureId != null) {
      checkSingleRef(metric.measures.baselineMeasureId, elements.measures, "measures", `${base}/baselineMeasureId`, anchor, findings);
    }
    if (metric.measures.currentMeasureId != null) {
      checkSingleRef(metric.measures.currentMeasureId, elements.measures, "measures", `${base}/currentMeasureId`, anchor, findings);
    }
    if (metric.measures.targetMeasureId != null) {
      checkSingleRef(metric.measures.targetMeasureId, elements.measures, "measures", `${base}/targetMeasureId`, anchor, findings);
    }
  }

  return findings;
}

export function checkNoNoOpTransitions(
  elements: ScaffoldElements,
): Finding[] {
  const findings: Finding[] = [];

  for (const [actId, act] of Object.entries(elements.activities)) {
    if (act.preOutcomeId === act.postOutcomeId) {
      findings.push({
        severity: "Error",
        ruleId: "V-SCAFFOLD-02",
        code: "NOOP_TRANSITION",
        message: `Activity '${actId}' has identical pre and post outcome '${act.preOutcomeId}'`,
        path: `/elements/activities/${actId}`,
        anchor: { anchorType: "Activity", anchorId: actId },
        remediationHint:
          "Ensure the activity transitions to a different outcome state.",
      });
    }
  }

  return findings;
}

export function checkNoCycles(elements: ScaffoldElements): Finding[] {
  const findings: Finding[] = [];
  const globalVisited = new Set<string>();

  for (const startId of Object.keys(elements.activities)) {
    if (globalVisited.has(startId)) continue;

    const pathSet = new Set<string>();
    let prev: string | null = null;
    let current: string | null = startId;

    while (current != null) {
      if (!(current in elements.activities)) break;
      if (globalVisited.has(current)) break;

      if (pathSet.has(current)) {
        findings.push({
          severity: "Error",
          ruleId: "V-SCAFFOLD-03",
          code: "CYCLE_DETECTED",
          message: `Cycle detected: activity '${prev!}' points to '${current}' which is already in the chain`,
          path: `/elements/activities/${prev!}/nextActivityId`,
          anchor: { anchorType: "Activity", anchorId: prev! },
          remediationHint:
            "Break the cycle by setting one activity's nextActivityId to null or a different activity.",
        });
        break;
      }

      pathSet.add(current);
      prev = current;
      current = elements.activities[current].nextActivityId ?? null;
    }

    for (const id of pathSet) {
      globalVisited.add(id);
    }
  }

  return findings;
}

export function checkValueStreamHasActivities(
  elements: ScaffoldElements,
): Finding[] {
  const findings: Finding[] = [];

  for (const [vsId, vs] of Object.entries(elements.valueStreams)) {
    if (vs.activityIds.length === 0) {
      findings.push({
        severity: "Error",
        ruleId: "V-SCAFFOLD-04",
        code: "EMPTY_VALUE_STREAM",
        message: `ValueStream '${vsId}' has no activities`,
        path: `/elements/valueStreams/${vsId}/activityIds`,
        anchor: { anchorType: "ValueStream", anchorId: vsId },
        remediationHint: "Add at least one activity to the value stream.",
      });
    }
  }

  return findings;
}

// --- Orchestrator ---

export function validate(scaffold: ScaffoldInput): ValidationReport {
  const findings: Finding[] = [
    ...checkReferentialIntegrity(scaffold.elements),
    ...checkNoNoOpTransitions(scaffold.elements),
    ...checkNoCycles(scaffold.elements),
    ...checkValueStreamHasActivities(scaffold.elements),
  ];

  let errorCount = 0;
  let warningCount = 0;
  const errorsByRule: Record<string, number> = {};
  const warningsByRule: Record<string, number> = {};

  for (const f of findings) {
    if (f.severity === "Error") {
      errorCount++;
      errorsByRule[f.ruleId] = (errorsByRule[f.ruleId] ?? 0) + 1;
    } else {
      warningCount++;
      warningsByRule[f.ruleId] = (warningsByRule[f.ruleId] ?? 0) + 1;
    }
  }

  const status: ValidationReport["status"] =
    errorCount > 0
      ? "Invalid"
      : warningCount > 0
        ? "ValidWithWarnings"
        : "Valid";

  return {
    reportId: randomUUID(),
    schemaVersion: "3.0.0",
    createdAt: new Date().toISOString(),
    status,
    summary: {
      errorCount,
      warningCount,
      ruleCounts: { errorsByRule, warningsByRule },
    },
    artifacts: {
      scaffold: {
        scaffoldId: scaffold.scaffoldId,
        modelIntegrityHash: scaffold.modelIntegrityHash ?? PLACEHOLDER_HASH,
      },
    },
    findings,
  };
}
