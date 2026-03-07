// ─── Scaffold Gates ──────────────────────────────────────────────────────────
// Gate 1: post-Activities (after B1). Enforces FSM chain integrity.
// Gate 2: post-Assembly (after B2). Full scaffold validation.
// Called between subpasses — not just at final render.

export interface GateResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// Gate 1: Minimum FSM chain integrity check
// Mirrors V-SCAFFOLD-01/02/03/07/08 from the prompt pack
export function runGate1(scaffold: any): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const activities = scaffold?.elements?.activities ?? {};
  const outcomes = scaffold?.elements?.outcomes ?? {};
  const valueStreams = scaffold?.elements?.valueStreams ?? {};

  if (Object.keys(activities).length === 0) {
    errors.push("No activities found in scaffold");
    return { passed: false, errors, warnings };
  }

  for (const [vsId, vs] of Object.entries(valueStreams) as [string, any][]) {
    const vsActIds: string[] = vs.activityIds ?? [];

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
    const head = vsActIds.find(
      (id) => !vsActIds.some((other) => activities[other]?.nextActivityId === id)
    );

    if (!head) {
      errors.push(`VS ${vsId}: cannot determine chain head — possible cycle`);
      continue;
    }

    const visited = new Set<string>();
    let current = head;
    while (current) {
      if (visited.has(current)) {
        errors.push(`VS ${vsId}: cycle detected at ${current}`);
        break;
      }
      visited.add(current);
      const act = activities[current];
      if (!act) break;

      // V-SCAFFOLD-02: no no-op transitions
      if (act.preOutcomeId && act.preOutcomeId === act.postOutcomeId) {
        errors.push(`Activity ${current}: preOutcomeId === postOutcomeId (no-op transition)`);
      }

      // V-SCAFFOLD-08: adjacent outcome consistency
      const next = act.nextActivityId;
      if (next && activities[next]) {
        if (act.postOutcomeId !== activities[next].preOutcomeId) {
          errors.push(
            `Chain break between ${current} and ${next}: ` +
            `postOutcome ${act.postOutcomeId} ≠ preOutcome ${activities[next].preOutcomeId}`
          );
        }
      }

      // Check outcome references exist
      if (act.preOutcomeId && act.preOutcomeId !== null && !outcomes[act.preOutcomeId]) {
        errors.push(`Activity ${current}: preOutcomeId ${act.preOutcomeId} not found in outcomes`);
      }
      if (act.postOutcomeId && !outcomes[act.postOutcomeId]) {
        errors.push(`Activity ${current}: postOutcomeId ${act.postOutcomeId} not found in outcomes`);
      }

      current = next;
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
export function runGate2(scaffold: any): GateResult {
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
  for (const [vsId, vs] of Object.entries(valueStreams) as [string, any][]) {
    if (!vs.activityIds?.length) {
      errors.push(`VS ${vsId}: has no activities`);
    }
  }

  // Referential integrity for activity fields
  for (const [actId, act] of Object.entries(activities) as [string, any][]) {
    for (const roleId of act.performedByRoleIds ?? []) {
      if (!roles[roleId]) warnings.push(`Activity ${actId}: role ${roleId} not in roles registry`);
    }
    for (const capId of act.requiresCapabilityIds ?? []) {
      if (!capabilities[capId]) warnings.push(`Activity ${actId}: capability ${capId} not in capabilities registry`);
    }
    for (const ctrlId of act.controlIds ?? []) {
      if (!controls[ctrlId]) warnings.push(`Activity ${actId}: control ${ctrlId} not in controls registry`);
    }
    for (const metricId of act.metricIds ?? []) {
      if (!metrics[metricId]) warnings.push(`Activity ${actId}: metric ${metricId} not in metrics registry`);
    }
  }

  // V-SCAFFOLD-06: orphan metrics (metrics not referenced by any activity)
  const referencedMetrics = new Set(
    Object.values(activities).flatMap((act: any) => act.metricIds ?? [])
  );
  for (const metricId of Object.keys(metrics)) {
    if (!referencedMetrics.has(metricId)) {
      warnings.push(`Metric ${metricId}: not referenced by any activity`);
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
