/**
 * scaffold-resolver.ts
 *
 * Resolves the canonical ScaffoldModel (which uses measure IDs)
 * into a ScaffoldDataResolved view suitable for frontend consumption
 * (where metrics have inline currentMeasure/targetMeasure/baselineMeasure).
 *
 * This keeps the canonical schema contract clean:
 *   - Backend/scaffold JSON uses measureId references
 *   - Frontend consumes resolved inline values
 *   - No schema fork, no denormalization in canonical artefacts
 *
 * Usage:
 *   const raw = JSON.parse(scaffoldJson);
 *   const resolved = resolveScaffoldMeasures(raw);
 *   // resolved.elements.metrics["met-xyz"].currentMeasure === 12
 */

import type { ScaffoldData, ScaffoldMetric } from "../types.ts";

/**
 * Shape of a canonical scaffold metric element (with measure ID references).
 * This mirrors the backend ScaffoldModel.schema.json structure.
 */
interface CanonicalMetric {
  id: string;
  elementType: string;
  name?: string;
  description?: string;
  /** Canonical schema uses unitOfMeasure on Measure, but metric may carry unit too */
  unitOfMeasure?: string;
  /** Canonical field name */
  metricDirection?: "Decrease" | "Increase" | "Attain";
  metricType?: "Lagging" | "Leading" | "Qualitative";
  metricPeriod?: string;
  baselineDate?: string;
  targetDate?: string;
  measures?: {
    targets?: unknown[];
    currentMeasureId?: string;
    targetMeasureId?: string;
    baselineMeasureId?: string;
  };
  tags?: string[];
  // Frontend-resolved inline values (may already be present)
  currentMeasure?: number;
  targetMeasure?: number;
  baselineMeasure?: number;
  /** Frontend normalised name — may not exist on canonical */
  unit?: string;
  direction?: "Decrease" | "Increase" | "Attain" | "Maintain";
  [key: string]: unknown;
}

/**
 * Shape of a canonical measure element.
 */
interface CanonicalMeasure {
  id: string;
  elementType: string;
  measureValue?: number | string;
  unitOfMeasure?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Resolve measure ID references on metrics into inline numeric values.
 *
 * If a metric already has inline values (currentMeasure etc.),
 * they are preserved as-is (idempotent).
 *
 * If the scaffold has no elements.measures collection, returns
 * the scaffold unchanged (backwards-compatible).
 */
export function resolveScaffoldMeasures(raw: ScaffoldData): ScaffoldData {
  const measures = (raw.elements as Record<string, Record<string, unknown>>)
    .measures as Record<string, CanonicalMeasure> | undefined;

  // If no measures collection exists, scaffold may already be resolved
  // or may not have measures at all — return as-is
  if (!measures || Object.keys(measures).length === 0) {
    return raw;
  }

  // Deep-clone metrics to avoid mutating the original
  const resolvedMetrics: Record<string, ScaffoldMetric> = {};

  for (const [metricId, rawMetric] of Object.entries(raw.elements.metrics)) {
    const canonical = rawMetric as unknown as CanonicalMetric;

    // Start from the full original object to preserve all fields (tags, description, etc.)
    const resolved: ScaffoldMetric = {
      ...(rawMetric as ScaffoldMetric),
      id: canonical.id,
      elementType: canonical.elementType,
      name: canonical.name,
    };

    // Normalise canonical field names to frontend conventions
    // metricDirection → direction
    if (!resolved.direction && canonical.metricDirection) {
      resolved.direction = canonical.metricDirection;
    }
    // unitOfMeasure → unit (metric-level fallback)
    if (!resolved.unit && canonical.unitOfMeasure) {
      resolved.unit = canonical.unitOfMeasure;
    }

    // Preserve existing inline values if present
    if (canonical.currentMeasure != null) resolved.currentMeasure = canonical.currentMeasure;
    if (canonical.targetMeasure != null) resolved.targetMeasure = canonical.targetMeasure;
    if (canonical.baselineMeasure != null) resolved.baselineMeasure = canonical.baselineMeasure;

    // Resolve from measure IDs if inline values are still missing
    if (canonical.measures) {
      if (resolved.currentMeasure == null && canonical.measures.currentMeasureId) {
        const m = measures[canonical.measures.currentMeasureId];
        if (m?.measureValue != null) {
          resolved.currentMeasure = typeof m.measureValue === "number" ? m.measureValue : parseFloat(String(m.measureValue));
          // Pick up unit from the measure element if metric doesn't have one
          if (!resolved.unit && m.unitOfMeasure) resolved.unit = m.unitOfMeasure;
        }
      }
      if (resolved.targetMeasure == null && canonical.measures.targetMeasureId) {
        const m = measures[canonical.measures.targetMeasureId];
        if (m?.measureValue != null) {
          resolved.targetMeasure = typeof m.measureValue === "number" ? m.measureValue : parseFloat(String(m.measureValue));
        }
      }
      if (resolved.baselineMeasure == null && canonical.measures.baselineMeasureId) {
        const m = measures[canonical.measures.baselineMeasureId];
        if (m?.measureValue != null) {
          resolved.baselineMeasure = typeof m.measureValue === "number" ? m.measureValue : parseFloat(String(m.measureValue));
        }
      }
    }

    resolvedMetrics[metricId] = resolved;
  }

  // Return a new ScaffoldData with resolved metrics
  console.log("RESOLVER:", Object.keys(resolvedMetrics), resolvedMetrics["metric_approval_cycle_time"]?.currentMeasure, resolvedMetrics["metric_approval_cycle_time"]?.targetMeasure); return {
    ...raw,
    elements: {
      ...raw.elements,
      metrics: resolvedMetrics,
    },
  };
}
