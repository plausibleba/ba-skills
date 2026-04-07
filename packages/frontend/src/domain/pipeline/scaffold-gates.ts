// ─── Scaffold Gates ──────────────────────────────────────────────────────────
// Gate 1: post-Activities (after B1). Enforces FSM chain integrity.
// Gate 2: post-Assembly (after B2). Full scaffold validation.
// Called between subpasses — not just at final render.

import { ScaffoldData, ScaffoldValueStream, ScaffoldActivity } from "../../types";

export interface GateResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// Gate 1: Minimum FSM chain integrity check
// Mirrors V-SCAFFOLD-01/02/03/07/08 from the prompt pack
export function runGate1(scaffold: ScaffoldData): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const activities = scaffold?.elements?.activities ?? {};
  const outcomes = scaffold?.elements?.outcomes ?? {};
  const valueStreams = scaffold?.elements?.valueStreams ?? {};

  if (Object.keys(activities).length === 0) {
    errors.push("No activities found in scaffold");
    return { passed: false, errors, warnings };
  }

  for (const [vsId, vs] of Object.entries(valueStreams)) {
    const vsData = vs as unknown as ScaffoldValueStream;
    const vsActIds: string[] = vsData.activityIds ?? [];

    if (vsActIds.length === 0) {
      errors.push(`VS ${vsId}: no activityIds declared`);
      continue;
    }

    // Check all declared activity IDs exist
    for (const actId of vsActIds) {
      if (!activities[actId]) {
        errors.push(`VS ${vsId}: activityId ${actId} not found in activities`);
      }
    }

    // Follow the chain from head
    let head: string | undefined;
    for (const id of vsActIds) {
      let isHead = true;
      for (const other of vsActIds) {
        const otherAct = activities[other] as unknown as ScaffoldActivity;
        if (otherAct?.nextActivityId === id) {
          isHead = false;
          break;
        }
      }
      if (isHead) {
        head = id;
        break;
      }
    }

    if (!head) {
      errors.push(`VS ${vsId}: cannot determine chain head — possible cycle`);
      continue;
    }

    const visited = new Set<string>();
    let current: string | undefined = head;
    while (current) {
      if (visited.has(current)) {
        errors.push(`VS ${vsId}: cycle detected at ${current}`);
        break;
      }
      visited.add(current);
      const actData = activities[current] as unknown as ScaffoldActivity;
      if (!actData) break;

      // V-SCAFFOLD-02: no no-op transitions
      if (actData.preOutcomeId && actData.preOutcomeId === actData.postOutcomeId) {
        errors.push(`Activity ${current}: preOutcomeId === postOutcomeId (no-op transition)`);
      }

      // V-SCAFFOLD-08: adjacent outcome consistency
      const next = actData.nextActivityId;
      if (next && typeof next === "string" && activities[next]) {
        const nextAct = activities[next] as unknown as ScaffoldActivity;
        if (actData.postOutcomeId !== nextAct.preOutcomeId) {
          errors.push(
            `Chain break between ${current} and ${next}: ` +
            `postOutcome ${actData.postOutcomeId} ≠ preOutcome ${nextAct.preOutcomeId}`
          );
        }
      }

      // Check outcome references exist
      if (actData.preOutcomeId && actData.preOutcomeId !== null && !outcomes[actData.preOutcomeId]) {
        errors.push(`Activity ${current}: preOutcomeId ${actData.preOutcomeId} not found in outcomes`);
      }
      if (actData.postOutcomeId && !outcomes[actData.postOutcomeId]) {
        errors.push(`Activity ${current}: postOutcomeId ${actData.postOutcomeId} not found in outcomes`);
      }

      current = (next && typeof next === "string") ? next : undefined;
    }

    // V-SCAFFOLD-07: all activities reachable
    const unreachable = vsActIds.filter((id) => !visited.has(id));
    if (unreachable.length > 0) {
      errors.push(`VS ${vsId}: unreachable activities: ${unreachable.join(", ")}`);
    }
  }

  return { passed: errors.length === 0, errors, warnings };
}

// Gate 2: Full scaffold validation — referential integrity check
export function runGate2(scaffold: ScaffoldData): GateResult {
  const gate1 = runGate1(scaffold);
  const errors = [...gate1.errors];
  const warnings = [...gate1.warnings];

  const elements = scaffold?.elements ?? {};
  const activities = elements.activities ?? {};
  const roles = elements.roles ?? {};
  const capabilities = elements.capabilities ?? {};
  const controls = elements.controls ?? {};
  const metrics = elements.metrics ?? {};
  const valueStreams = elements.valueStreams ?? {};

  // V-SCAFFOLD-04: each VS has activities
  for (const [vsId, vs] of Object.entries(valueStreams)) {
    const vsData = vs as unknown as ScaffoldValueStream;
    if (!vsData.activityIds?.length) {
      errors.push(`VS ${vsId}: has no activities`);
    }
  }

  // Referential integrity for activity fields — missing registries are errors, not warnings
  for (const [actId, act] of Object.entries(activities)) {
    const actData = act as unknown as ScaffoldActivity;
    for (const roleId of actData.performedByRoleIds ?? []) {
      if (!roles[roleId]) errors.push(`Activity ${actId}: role ${roleId} not in roles registry`);
    }
    for (const capId of (actData.requiresCapabilityIds ?? []) as string[]) {
      if (!capabilities[capId]) errors.push(`Activity ${actId}: capability ${capId} not in capabilities registry`);
    }
    for (const ctrlId of actData.controlIds ?? []) {
      if (!controls[ctrlId]) errors.push(`Activity ${actId}: control ${ctrlId} not in controls registry`);
    }
    for (const metricId of actData.metricIds ?? []) {
      if (!metrics[metricId]) warnings.push(`Activity ${actId}: metric ${metricId} not in metrics registry`);
    }
  }

  // V-SCAFFOLD-06: orphan metrics (metrics not referenced by any activity)
  const referencedMetrics = new Set(
    Object.values(activities).flatMap((act) => (act as unknown as ScaffoldActivity).metricIds ?? [])
  );
  for (const metricId of Object.keys(metrics)) {
    if (!referencedMetrics.has(metricId)) {
      warnings.push(`Metric ${metricId}: not referenced by any activity`);
    }
  }

  // V-SCAFFOLD-09: lifecycle states on information objects
  const informationObjects = elements.informationObjects ?? {};
  for (const [ioId, io] of Object.entries(informationObjects)) {
    const ioData = io as unknown as { lifecycleStates?: Array<{ position: string }> };
    const states = ioData.lifecycleStates ?? [];
    if (states.length === 0) {
      warnings.push(`InfoObject ${ioId}: no lifecycleStates defined`);
    } else {
      const hasInitial = states.some((s) => s.position === "initial");
      const hasTerminal = states.some((s) => s.position === "terminal");
      if (!hasInitial) warnings.push(`InfoObject ${ioId}: no initial lifecycle state`);
      if (!hasTerminal) warnings.push(`InfoObject ${ioId}: no terminal lifecycle state`);
    }
  }

  // V-SCAFFOLD-10: sub-activity graphs exist for activities (optional — added by enrichment)
  const subActivityGraphs = elements.subActivityGraphs ?? {};
  const hasAnyDAGs = Object.keys(subActivityGraphs).length > 0;
  // Only warn about missing DAGs if some DAGs exist (partial enrichment) — not for lean scaffolds
  if (hasAnyDAGs) {
    for (const actId of Object.keys(activities)) {
      if (!subActivityGraphs[actId]) {
        warnings.push(`Activity ${actId}: no sub-activity graph in subActivityGraphs`);
      }
    }
  }
  // Validate sub-activity DAG structure
  for (const [actId, dag] of Object.entries(subActivityGraphs)) {
    const dagData = dag as unknown as { nodes?: Array<{ id: string; nodeType: string; nextIds?: string[] }> };
    const nodes = dagData?.nodes ?? [];
    if (nodes.length === 0) {
      warnings.push(`SubActivityGraph ${actId}: empty nodes array`);
      continue;
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const node of nodes) {
      for (const nextId of node.nextIds ?? []) {
        if (!nodeIds.has(nextId)) {
          warnings.push(`SubActivityGraph ${actId}: node ${node.id} references unknown nextId ${nextId}`);
        }
      }
      if (node.nodeType === "gate" && (!node.nextIds || node.nextIds.length < 2)) {
        warnings.push(`SubActivityGraph ${actId}: gate node ${node.id} has fewer than 2 nextIds`);
      }
    }
  }

  return { passed: errors.length === 0, errors, warnings };
}

// Format gate result for display in UI
export function formatGateResult(result: GateResult, gateName: string): string {
  if (result.passed) return `${gateName}: PASSED`;
  const lines = [`${gateName}: FAILED (${result.errors.length} error(s))`];
  result.errors.forEach((e) => lines.push(`  ✗ ${e}`));
  result.warnings.forEach((w) => lines.push(`  ⚠ ${w}`));
  return lines.join("\n");
}
