import { randomUUID, createHash } from "node:crypto";
import {
  validateScaffoldSchema,
  validateHeatmapSchema,
} from "./schema-validator.js";

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
    heatmap?: {
      heatmapId: string;
      scaffoldIntegrityHash: string;
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

export interface MeasureElement extends BaseElement {
  measureDataType: string;
  measureValue?: string | number | boolean;
  measureAsOf?: string;
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
  measures: Record<string, MeasureElement>;
  conditions: Record<string, BaseElement>;
}

export interface ScaffoldInput {
  scaffoldId: string;
  name: string;
  schemaVersion: string;
  modelIntegrityHash?: string;
  elements: ScaffoldElements;
}

export interface FrictionObservation {
  observationId: string;
  primaryAnchor: AnchorRef;
  contributingAnchors?: AnchorRef[];
}

export interface BindingConstraint {
  findingId: string;
  bindingAnchor: AnchorRef;
  bindingAnchorObservationId: string;
  justification: string;
}

export interface HeatmapInput {
  heatmapId: string;
  scaffoldId: string;
  scaffoldIntegrityHash?: string;
  valueStreamId: string;
  observations: FrictionObservation[];
  bindingConstraint: BindingConstraint;
}

// --- Helpers ---

const PLACEHOLDER_HASH = "0".repeat(64);

const ANCHOR_TYPE_TO_MAP: Record<string, keyof ScaffoldElements> = {
  Activity: "activities",
  Role: "roles",
  Metric: "metrics",
  Control: "controls",
  Capability: "capabilities",
  ValueStream: "valueStreams",
  Constraint: "constraints",
  Outcome: "outcomes",
  Directive: "directives",
  DeonticLogic: "deonticLogic",
  FlowLogic: "flowLogic",
  Concept: "concepts",
  Property: "properties",
  Condition: "conditions",
  Measure: "measures",
};

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}

export function computeScaffoldHash(scaffold: ScaffoldInput): string {
  const { modelIntegrityHash: _, ...rest } = scaffold;
  const canonical = canonicalize(rest);
  return createHash("sha256").update(canonical).digest("hex");
}

function anchorMatchesRef(a: AnchorRef, b: AnchorRef): boolean {
  return a.anchorType === b.anchorType && a.anchorId === b.anchorId;
}

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

export function checkNoOrphanMetrics(
  elements: ScaffoldElements,
): Finding[] {
  const findings: Finding[] = [];
  const referenced = new Set<string>();

  for (const act of Object.values(elements.activities)) {
    if (act.metricIds) {
      for (const id of act.metricIds) referenced.add(id);
    }
  }

  for (const vs of Object.values(elements.valueStreams)) {
    if (vs.metricIds) {
      for (const id of vs.metricIds) referenced.add(id);
    }
  }

  for (const metricId of Object.keys(elements.metrics)) {
    if (!referenced.has(metricId)) {
      findings.push({
        severity: "Warning",
        ruleId: "V-SCAFFOLD-06",
        code: "ORPHAN_METRIC",
        message: `Metric '${metricId}' is not referenced by any activity or value stream`,
        path: `/elements/metrics/${metricId}`,
        anchor: { anchorType: "Metric", anchorId: metricId },
        remediationHint:
          "Add this metric to an activity's metricIds or a value stream's metricIds, or remove it.",
      });
    }
  }

  return findings;
}

export function checkChainReachability(
  elements: ScaffoldElements,
): Finding[] {
  const findings: Finding[] = [];

  for (const [vsId, vs] of Object.entries(elements.valueStreams)) {
    if (vs.activityIds.length === 0) continue;

    const head = vs.activityIds[0];
    const reachable = new Set<string>();
    let current: string | null = head;

    while (current != null && current in elements.activities) {
      if (reachable.has(current)) break;
      reachable.add(current);
      current = elements.activities[current].nextActivityId ?? null;
    }

    for (let i = 0; i < vs.activityIds.length; i++) {
      const actId = vs.activityIds[i];
      if (!reachable.has(actId)) {
        findings.push({
          severity: "Error",
          ruleId: "V-SCAFFOLD-07",
          code: "UNREACHABLE_ACTIVITY",
          message: `Activity '${actId}' in ValueStream '${vsId}' is not reachable via nextActivityId from chain head '${head}'`,
          path: `/elements/valueStreams/${vsId}/activityIds/${i}`,
          anchor: { anchorType: "Activity", anchorId: actId },
          relatedAnchors: [{ anchorType: "ValueStream", anchorId: vsId }],
          remediationHint:
            "Link this activity into the nextActivityId chain or remove it from the value stream.",
        });
      }
    }
  }

  return findings;
}

export function checkOutcomeChainConsistency(
  elements: ScaffoldElements,
): Finding[] {
  const findings: Finding[] = [];
  const checked = new Set<string>();

  for (const vs of Object.values(elements.valueStreams)) {
    if (vs.activityIds.length === 0) continue;

    const head = vs.activityIds[0];
    if (checked.has(head)) continue;

    let current: string | null = head;
    while (current != null && current in elements.activities) {
      if (checked.has(current)) break;
      checked.add(current);

      const act = elements.activities[current];
      const nextId = act.nextActivityId ?? null;

      if (nextId != null && nextId in elements.activities) {
        const nextAct = elements.activities[nextId];
        if (act.postOutcomeId !== nextAct.preOutcomeId) {
          findings.push({
            severity: "Error",
            ruleId: "V-SCAFFOLD-08",
            code: "OUTCOME_MISMATCH",
            message: `Outcome chain break between '${current}' (postOutcomeId '${act.postOutcomeId}') and '${nextId}' (preOutcomeId '${nextAct.preOutcomeId}')`,
            path: `/elements/activities/${nextId}/preOutcomeId`,
            anchor: { anchorType: "Activity", anchorId: nextId },
            relatedAnchors: [{ anchorType: "Activity", anchorId: current }],
            remediationHint:
              "Ensure adjacent activities have matching outcome transitions.",
          });
        }
      }

      current = nextId;
    }
  }

  return findings;
}

// --- Measure Rules ---

export function checkCurrentMeasuresHaveTimestamp(
  elements: ScaffoldElements,
): Finding[] {
  const findings: Finding[] = [];

  for (const [metricId, metric] of Object.entries(elements.metrics)) {
    const currentId = metric.measures.currentMeasureId;
    if (currentId == null) continue;

    const measure = elements.measures[currentId];
    if (!measure) continue; // unresolved ref caught by V-SCAFFOLD-01

    if (!measure.measureAsOf) {
      findings.push({
        severity: "Warning",
        ruleId: "V-MEASURE-01",
        code: "MISSING_MEASURE_TIMESTAMP",
        message: `Current measure '${currentId}' for metric '${metricId}' is missing measureAsOf timestamp`,
        path: `/elements/measures/${currentId}/measureAsOf`,
        anchor: { anchorType: "Metric", anchorId: metricId },
        remediationHint:
          "Add a measureAsOf timestamp to the current measure.",
      });
    }
  }

  return findings;
}

export function checkMeasureValueTypes(
  elements: ScaffoldElements,
): Finding[] {
  const findings: Finding[] = [];

  for (const [measureId, measure] of Object.entries(elements.measures)) {
    if (measure.measureValue == null) continue;

    const { measureDataType, measureValue } = measure;
    let valid = true;

    switch (measureDataType) {
      case "number": {
        const num =
          typeof measureValue === "number"
            ? measureValue
            : Number(measureValue);
        valid = !isNaN(num);
        break;
      }
      case "integer": {
        const num =
          typeof measureValue === "number"
            ? measureValue
            : Number(measureValue);
        valid = !isNaN(num) && Number.isInteger(num);
        break;
      }
      case "boolean": {
        if (typeof measureValue === "boolean") {
          valid = true;
        } else if (typeof measureValue === "string") {
          valid = measureValue === "true" || measureValue === "false";
        } else {
          valid = false;
        }
        break;
      }
      // string and other types: always valid
    }

    if (!valid) {
      findings.push({
        severity: "Warning",
        ruleId: "V-MEASURE-02",
        code: "MEASURE_TYPE_MISMATCH",
        message: `Measure '${measureId}' value '${String(measureValue)}' does not match declared type '${measureDataType}'`,
        path: `/elements/measures/${measureId}/measureValue`,
        anchor: { anchorType: "Measure", anchorId: measureId },
        remediationHint: `Ensure measureValue is a valid ${measureDataType}.`,
      });
    }
  }

  return findings;
}

// --- Friction Rules ---

export function checkAnchorReferentialIntegrity(
  elements: ScaffoldElements,
  heatmap: HeatmapInput,
): Finding[] {
  const findings: Finding[] = [];

  function checkAnchor(
    anchor: AnchorRef,
    observationId: string,
    anchorRole: string,
    index?: number,
  ): void {
    const mapName = ANCHOR_TYPE_TO_MAP[anchor.anchorType];
    if (!mapName) {
      findings.push({
        severity: "Error",
        ruleId: "V-FRICTION-01",
        code: "UNKNOWN_ANCHOR_TYPE",
        message: `Observation '${observationId}' ${anchorRole} has unknown anchorType '${anchor.anchorType}'`,
        path: `/observations/${observationId}/${anchorRole}`,
        anchor: { anchorType: anchor.anchorType, anchorId: anchor.anchorId },
      });
      return;
    }
    const elementMap = elements[mapName];
    if (!(anchor.anchorId in elementMap)) {
      const pathSuffix =
        index != null
          ? `/contributingAnchors/${index}`
          : `/${anchorRole}`;
      findings.push({
        severity: "Error",
        ruleId: "V-FRICTION-01",
        code: "UNRESOLVED_ANCHOR",
        message: `Observation '${observationId}' references '${anchor.anchorId}' as ${anchor.anchorType} but it does not exist in elements.${mapName}`,
        path: `/observations/${observationId}${pathSuffix}`,
        anchor: { anchorType: anchor.anchorType, anchorId: anchor.anchorId },
      });
    }
  }

  for (const obs of heatmap.observations) {
    checkAnchor(obs.primaryAnchor, obs.observationId, "primaryAnchor");
    if (obs.contributingAnchors) {
      for (let i = 0; i < obs.contributingAnchors.length; i++) {
        checkAnchor(
          obs.contributingAnchors[i],
          obs.observationId,
          "contributingAnchors",
          i,
        );
      }
    }
  }

  return findings;
}

export function checkBindingAnchorInObservations(
  heatmap: HeatmapInput,
): Finding[] {
  const findings: Finding[] = [];
  const ba = heatmap.bindingConstraint.bindingAnchor;

  const found = heatmap.observations.some((obs) => {
    if (anchorMatchesRef(obs.primaryAnchor, ba)) return true;
    if (obs.contributingAnchors) {
      return obs.contributingAnchors.some((ca) => anchorMatchesRef(ca, ba));
    }
    return false;
  });

  if (!found) {
    findings.push({
      severity: "Error",
      ruleId: "V-FRICTION-02",
      code: "BINDING_ANCHOR_NOT_OBSERVED",
      message: `Binding anchor '${ba.anchorId}' (${ba.anchorType}) does not appear in any observation`,
      path: "/bindingConstraint/bindingAnchor",
      anchor: ba,
      remediationHint:
        "Ensure the binding anchor appears as primaryAnchor or contributingAnchor in at least one observation.",
    });
  }

  return findings;
}

export function checkBindingAnchorSpecificity(
  heatmap: HeatmapInput,
): Finding[] {
  const findings: Finding[] = [];
  const bc = heatmap.bindingConstraint;
  const ba = bc.bindingAnchor;

  const targetObs = heatmap.observations.find(
    (obs) => obs.observationId === bc.bindingAnchorObservationId,
  );

  if (!targetObs) {
    findings.push({
      severity: "Error",
      ruleId: "V-FRICTION-03",
      code: "BINDING_OBSERVATION_NOT_FOUND",
      message: `bindingAnchorObservationId '${bc.bindingAnchorObservationId}' does not match any observation`,
      path: "/bindingConstraint/bindingAnchorObservationId",
      anchor: ba,
      remediationHint:
        "Ensure bindingAnchorObservationId references a valid observationId.",
    });
    return findings;
  }

  const inObs =
    anchorMatchesRef(targetObs.primaryAnchor, ba) ||
    (targetObs.contributingAnchors?.some((ca) =>
      anchorMatchesRef(ca, ba),
    ) ??
      false);

  if (!inObs) {
    findings.push({
      severity: "Error",
      ruleId: "V-FRICTION-03",
      code: "BINDING_ANCHOR_NOT_IN_OBSERVATION",
      message: `Binding anchor '${ba.anchorId}' (${ba.anchorType}) does not appear in observation '${bc.bindingAnchorObservationId}'`,
      path: "/bindingConstraint/bindingAnchor",
      anchor: ba,
      remediationHint:
        "Ensure the binding anchor appears in the referenced observation as primaryAnchor or contributingAnchor.",
    });
  }

  return findings;
}

export function checkValueStreamIdExists(
  elements: ScaffoldElements,
  heatmap: HeatmapInput,
): Finding[] {
  const findings: Finding[] = [];

  if (!(heatmap.valueStreamId in elements.valueStreams)) {
    findings.push({
      severity: "Error",
      ruleId: "V-FRICTION-04",
      code: "INVALID_VALUE_STREAM_REF",
      message: `Heatmap valueStreamId '${heatmap.valueStreamId}' not found in scaffold valueStreams`,
      path: "/valueStreamId",
      anchor: {
        anchorType: "ValueStream",
        anchorId: heatmap.valueStreamId,
      },
      remediationHint:
        "Ensure valueStreamId references a value stream defined in the scaffold.",
    });
  }

  return findings;
}

export function checkScaffoldIntegrityHash(
  scaffold: ScaffoldInput,
  heatmap: HeatmapInput,
): Finding[] {
  const findings: Finding[] = [];

  if (!heatmap.scaffoldIntegrityHash) return findings;

  if (heatmap.scaffoldIntegrityHash === PLACEHOLDER_HASH) {
    findings.push({
      severity: "Warning",
      ruleId: "V-FRICTION-05",
      code: "PLACEHOLDER_HASH",
      message:
        "Heatmap scaffoldIntegrityHash is a placeholder (all zeros); integrity not verified",
      path: "/scaffoldIntegrityHash",
      remediationHint:
        "Compute and set the real scaffold integrity hash for production use.",
    });
    return findings;
  }

  const computed = computeScaffoldHash(scaffold);
  if (heatmap.scaffoldIntegrityHash !== computed) {
    findings.push({
      severity: "Error",
      ruleId: "V-FRICTION-05",
      code: "HASH_MISMATCH",
      message: `Heatmap scaffoldIntegrityHash '${heatmap.scaffoldIntegrityHash}' does not match computed scaffold hash '${computed}'`,
      path: "/scaffoldIntegrityHash",
      remediationHint:
        "Recompute the scaffold integrity hash or verify the scaffold has not changed.",
    });
  }

  return findings;
}

// --- Orchestrator ---

export function validateSemantic(
  scaffold: ScaffoldInput,
  heatmap?: HeatmapInput,
): ValidationReport {
  // Phase 1: independent scaffold rules
  const refFindings = checkReferentialIntegrity(scaffold.elements);
  const noopFindings = checkNoNoOpTransitions(scaffold.elements);
  const cycleFindings = checkNoCycles(scaffold.elements);
  const vsActFindings = checkValueStreamHasActivities(scaffold.elements);
  const orphanFindings = checkNoOrphanMetrics(scaffold.elements);

  const findings: Finding[] = [
    ...refFindings,
    ...noopFindings,
    ...cycleFindings,
    ...vsActFindings,
    ...orphanFindings,
  ];

  // Phase 2: chain-dependent rules (require clean refs and no cycles)
  if (refFindings.length === 0 && cycleFindings.length === 0) {
    findings.push(
      ...checkChainReachability(scaffold.elements),
      ...checkOutcomeChainConsistency(scaffold.elements),
    );
  }

  // Phase 3: measure rules
  findings.push(
    ...checkCurrentMeasuresHaveTimestamp(scaffold.elements),
    ...checkMeasureValueTypes(scaffold.elements),
  );

  // Phase 4: friction rules (require heatmap)
  if (heatmap) {
    findings.push(
      ...checkAnchorReferentialIntegrity(scaffold.elements, heatmap),
      ...checkBindingAnchorInObservations(heatmap),
      ...checkBindingAnchorSpecificity(heatmap),
      ...checkValueStreamIdExists(scaffold.elements, heatmap),
      ...checkScaffoldIntegrityHash(scaffold, heatmap),
    );
  }

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
      ...(heatmap
        ? {
            heatmap: {
              heatmapId: heatmap.heatmapId,
              scaffoldIntegrityHash:
                heatmap.scaffoldIntegrityHash ?? PLACEHOLDER_HASH,
            },
          }
        : {}),
    },
    findings,
  };
}

// --- Full pipeline: schema (Layer 1) + semantic (Layer 2) ---

function buildSchemaErrorReport(
  scaffoldData: unknown,
  heatmapData: unknown | undefined,
  findings: Finding[],
): ValidationReport {
  const sObj =
    typeof scaffoldData === "object" && scaffoldData !== null
      ? (scaffoldData as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const hObj =
    typeof heatmapData === "object" && heatmapData !== null
      ? (heatmapData as Record<string, unknown>)
      : undefined;

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
        scaffoldId:
          typeof sObj.scaffoldId === "string" ? sObj.scaffoldId : "unknown",
        modelIntegrityHash:
          typeof sObj.modelIntegrityHash === "string"
            ? sObj.modelIntegrityHash
            : PLACEHOLDER_HASH,
      },
      ...(hObj != null
        ? {
            heatmap: {
              heatmapId:
                typeof hObj.heatmapId === "string" ? hObj.heatmapId : "unknown",
              scaffoldIntegrityHash:
                typeof hObj.scaffoldIntegrityHash === "string"
                  ? hObj.scaffoldIntegrityHash
                  : PLACEHOLDER_HASH,
            },
          }
        : {}),
    },
    findings,
  };
}

export function validate(
  scaffoldData: unknown,
  heatmapData?: unknown,
): ValidationReport {
  // Layer 1: Schema validation
  const schemaFindings: Finding[] = [...validateScaffoldSchema(scaffoldData)];
  if (heatmapData !== undefined) {
    schemaFindings.push(...validateHeatmapSchema(heatmapData));
  }

  if (schemaFindings.length > 0) {
    return buildSchemaErrorReport(scaffoldData, heatmapData, schemaFindings);
  }

  // Layer 2: Semantic validation (schema passed, safe to cast)
  return validateSemantic(
    scaffoldData as ScaffoldInput,
    heatmapData as HeatmapInput | undefined,
  );
}
