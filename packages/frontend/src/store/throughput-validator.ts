/**
 * throughput-validator.ts
 *
 * Semantic validation rules for throughput projection integrity.
 * These are cross-field / cross-element rules that JSON Schema cannot enforce.
 *
 * Rule IDs follow the convention: V-SCAFFOLD-{DOMAIN}-{DETAIL}-{SEQ}
 * Severity and Finding shape match the existing ValidationReport contract.
 *
 * Rules implemented:
 *   V-SCAFFOLD-ACT-MET-THR-01  Throughput metric must exist and be declared
 *   V-SCAFFOLD-ACT-MET-THR-02  Secondary metric IDs must exist and be declared
 *   V-SCAFFOLD-MET-MEAS-01     Throughput metric must have current+target measure IDs
 *   V-SCAFFOLD-MET-MEAS-02     Measure IDs must resolve to Measure elements
 *   V-SCAFFOLD-MEAS-VALUE-01   Current/target measure values must be numeric
 *   V-SCAFFOLD-MEAS-UNIT-01    Unit-of-measure should be present
 *   V-SCAFFOLD-MET-DIR-01      Throughput metric direction should be present
 *   V-SCAFFOLD-ACT-MET-THR-03  Throughput metric should target the activity (optional)
 */

import type { Finding } from "../types.ts";

/** Minimal canonical shapes — just enough to validate */
interface RawActivity {
  id: string;
  metricIds?: string[];
  throughputMetricId?: string;
  secondaryMetricIds?: string[];
  [key: string]: unknown;
}

interface RawMetricMeasures {
  targets?: Array<{ targetType: string; targetId: string }>;
  currentMeasureId?: string;
  targetMeasureId?: string;
  baselineMeasureId?: string;
}

interface RawMetric {
  id: string;
  metricDirection?: string;
  measures?: RawMetricMeasures;
  [key: string]: unknown;
}

interface RawMeasure {
  id: string;
  measureValue?: number | string | boolean;
  unitOfMeasure?: string;
  [key: string]: unknown;
}

interface RawScaffoldElements {
  activities?: Record<string, RawActivity>;
  metrics?: Record<string, RawMetric>;
  measures?: Record<string, RawMeasure>;
  [key: string]: unknown;
}

/**
 * Run all throughput-related semantic validation rules.
 * Returns an array of Finding objects (empty = all rules pass).
 */
export function validateThroughputRules(elements: RawScaffoldElements): Finding[] {
  const findings: Finding[] = [];
  const activities = elements.activities ?? {};
  const metrics = elements.metrics ?? {};
  const measures = elements.measures ?? {};

  // Collect all metric IDs referenced as throughput or secondary
  // (used to scope measure-level checks)
  const projectionMetricIds = new Set<string>();

  for (const [actId, activity] of Object.entries(activities)) {
    const actPath = `$.elements.activities[${actId}]`;

    // ─── V-SCAFFOLD-ACT-MET-THR-01 ────────────────────────────
    if (activity.throughputMetricId) {
      const tId = activity.throughputMetricId;
      projectionMetricIds.add(tId);

      if (!metrics[tId]) {
        findings.push({
          severity: "Error",
          ruleId: "V-SCAFFOLD-ACT-MET-THR-01",
          code: "SCAFFOLD.ACT.THROUGHPUT_METRIC.INVALID_REF",
          message: `Activity '${actId}' throughputMetricId '${tId}' not found in elements.metrics.`,
          path: `${actPath}.throughputMetricId`,
        });
      } else if (!activity.metricIds || !activity.metricIds.includes(tId)) {
        findings.push({
          severity: "Error",
          ruleId: "V-SCAFFOLD-ACT-MET-THR-01",
          code: "SCAFFOLD.ACT.THROUGHPUT_METRIC.INVALID_REF",
          message: `Activity '${actId}' throughputMetricId '${tId}' must be included in activity.metricIds.`,
          path: `${actPath}.metricIds`,
        });
      }
    }

    // ─── V-SCAFFOLD-ACT-MET-THR-02 ────────────────────────────
    if (activity.secondaryMetricIds && activity.secondaryMetricIds.length > 0) {
      for (let i = 0; i < activity.secondaryMetricIds.length; i++) {
        const sid = activity.secondaryMetricIds[i];
        projectionMetricIds.add(sid);

        if (!metrics[sid]) {
          findings.push({
            severity: "Error",
            ruleId: "V-SCAFFOLD-ACT-MET-THR-02",
            code: "SCAFFOLD.ACT.SECONDARY_METRICS.INVALID_REF",
            message: `Activity '${actId}' secondaryMetricId '${sid}' not found in elements.metrics.`,
            path: `${actPath}.secondaryMetricIds[${i}]`,
          });
        } else if (!activity.metricIds || !activity.metricIds.includes(sid)) {
          findings.push({
            severity: "Error",
            ruleId: "V-SCAFFOLD-ACT-MET-THR-02",
            code: "SCAFFOLD.ACT.SECONDARY_METRICS.INVALID_REF",
            message: `Activity '${actId}' secondaryMetricId '${sid}' must be included in activity.metricIds.`,
            path: `${actPath}.metricIds`,
          });
        }
      }
    }

    // ─── V-SCAFFOLD-ACT-MET-THR-03 (optional — target mismatch) ──
    if (activity.throughputMetricId && metrics[activity.throughputMetricId]) {
      const metric = metrics[activity.throughputMetricId];
      const targets = metric.measures?.targets;
      if (targets && targets.length > 0) {
        const targetsThisActivity = targets.some(
          (t) => t.targetType === "Activity" && t.targetId === actId,
        );
        if (!targetsThisActivity) {
          findings.push({
            severity: "Warning",
            ruleId: "V-SCAFFOLD-ACT-MET-THR-03",
            code: "SCAFFOLD.ACT.THROUGHPUT_METRIC.TARGET_MISMATCH",
            message: `Activity '${actId}' throughputMetricId '${activity.throughputMetricId}' does not target this activity in metric.measures.targets.`,
            path: `$.elements.metrics[${activity.throughputMetricId}].measures.targets`,
          });
        }
      }
    }
  }

  // ─── Metric-level rules (scoped to projection metrics) ────────
  for (const metricId of projectionMetricIds) {
    const metric = metrics[metricId];
    if (!metric) continue; // already flagged by THR-01/02

    const metPath = `$.elements.metrics[${metricId}]`;

    // ─── V-SCAFFOLD-MET-MEAS-01 ─────────────────────────────
    const hasCurrent = !!metric.measures?.currentMeasureId;
    const hasTarget = !!metric.measures?.targetMeasureId;

    if (!hasCurrent || !hasTarget) {
      const missing = [];
      if (!hasCurrent) missing.push("currentMeasureId");
      if (!hasTarget) missing.push("targetMeasureId");
      findings.push({
        severity: "Warning",
        ruleId: "V-SCAFFOLD-MET-MEAS-01",
        code: "SCAFFOLD.MET.MEASURES.MISSING_IDS",
        message: `Metric '${metricId}' used as throughput/secondary metric is missing measures.${missing.join(" and measures.")}. Projection unavailable.`,
        path: `${metPath}.measures`,
      });
    }

    // ─── V-SCAFFOLD-MET-MEAS-02 ─────────────────────────────
    const measureFields = ["baselineMeasureId", "targetMeasureId", "currentMeasureId"] as const;
    for (const field of measureFields) {
      const measureId = metric.measures?.[field];
      if (measureId && !measures[measureId]) {
        findings.push({
          severity: "Error",
          ruleId: "V-SCAFFOLD-MET-MEAS-02",
          code: "SCAFFOLD.MET.MEASURES.UNRESOLVED_REF",
          message: `Metric '${metricId}' references missing Measure '${measureId}' in measures.${field}.`,
          path: `${metPath}.measures.${field}`,
        });
      }
    }

    // ─── V-SCAFFOLD-MET-DIR-01 ──────────────────────────────
    const validDirections = ["Increase", "Decrease", "Attain"];
    if (!metric.metricDirection || !validDirections.includes(metric.metricDirection)) {
      findings.push({
        severity: "Warning",
        ruleId: "V-SCAFFOLD-MET-DIR-01",
        code: "SCAFFOLD.MET.DIRECTION.MISSING_OR_INVALID",
        message: `Metric '${metricId}' has missing/invalid metricDirection; projection will still run but directionality cues may be incorrect.`,
        path: `${metPath}.metricDirection`,
      });
    }
  }

  // ─── Measure-level rules (scoped to measures referenced by projection metrics)
  const projectionMeasureIds = new Set<string>();
  for (const metricId of projectionMetricIds) {
    const metric = metrics[metricId];
    if (!metric?.measures) continue;
    for (const field of ["currentMeasureId", "targetMeasureId", "baselineMeasureId"] as const) {
      const mid = metric.measures[field];
      if (mid) projectionMeasureIds.add(mid);
    }
  }

  for (const measureId of projectionMeasureIds) {
    const measure = measures[measureId];
    if (!measure) continue; // already flagged by MET-MEAS-02

    const measPath = `$.elements.measures[${measureId}]`;

    // ─── V-SCAFFOLD-MEAS-VALUE-01 ───────────────────────────
    if (measure.measureValue != null) {
      const val = measure.measureValue;
      const isNumeric =
        typeof val === "number" ||
        (typeof val === "string" && !isNaN(parseFloat(val)) && isFinite(parseFloat(val)));

      if (!isNumeric) {
        findings.push({
          severity: "Warning",
          ruleId: "V-SCAFFOLD-MEAS-VALUE-01",
          code: "SCAFFOLD.MEAS.VALUE.NOT_NUMERIC",
          message: `Measure '${measureId}' measureValue '${String(val)}' is not numeric; projection will be unavailable.`,
          path: `${measPath}.measureValue`,
        });
      }
    }

    // ─── V-SCAFFOLD-MEAS-UNIT-01 ────────────────────────────
    if (!measure.unitOfMeasure || measure.unitOfMeasure.trim() === "") {
      findings.push({
        severity: "Warning",
        ruleId: "V-SCAFFOLD-MEAS-UNIT-01",
        code: "SCAFFOLD.MEAS.UNIT.MISSING",
        message: `Measure '${measureId}' has no unitOfMeasure; UI will fall back to metric/unit defaults.`,
        path: `${measPath}.unitOfMeasure`,
      });
    }
  }

  return findings;
}
