/**
 * readiness-engine.ts — D-118 Phase 1: Readiness Computation
 *
 * Derives the model's readiness state from actual scaffold content.
 * Readiness is NEVER stored — it is always computed on demand.
 *
 * Readiness states (progressive):
 *   skeleton  → Stages, capabilities, roles exist as IDs/names
 *   grounded  → PPIT decompositions present on activities
 *   detailed  → Sub-activity DAGs + cross-maps + metrics populated
 *   assessed  → Diagnostic artefacts exist (friction, maturity)
 *   governed  → Gap register + risk register complete
 *
 * @see docs/DECISIONS.md D-118
 */

import type { ReadinessState, DiagnosticArtefactStore } from "./enrichment-taxonomy";
import { READINESS_ORDER } from "./enrichment-taxonomy";

// ─── Readiness Checks ────────────────────────────────────────────────────────

/**
 * Check if the scaffold has basic structural elements (Pass A+B complete).
 */
function hasSkeleton(scaffold: any): boolean {
  if (!scaffold?.elements) return false;
  const el = scaffold.elements;

  const hasVS =
    el.valueStreams && Object.keys(el.valueStreams).length > 0;
  const hasActivities =
    el.activities && Object.keys(el.activities).length > 0;
  const hasCapabilities =
    el.capabilities && Object.keys(el.capabilities).length > 0;

  return !!(hasVS && hasActivities && hasCapabilities);
}

/**
 * Check if PPIT decompositions are present on activities.
 * Requires at least one activity with a non-empty capabilityPPIT.
 */
function hasGrounding(scaffold: any): boolean {
  if (!scaffold?.elements?.activities) return false;
  return Object.values(scaffold.elements.activities).some(
    (act: any) => act.capabilityPPIT && Object.keys(act.capabilityPPIT).length > 0
  );
}

/**
 * Check for detailed structural depth: sub-activity DAGs.
 */
function hasDetail(scaffold: any): boolean {
  if (!scaffold?.elements?.subActivityGraphs) return false;
  const graphs = scaffold.elements.subActivityGraphs;
  return (
    Object.keys(graphs).length > 0 &&
    Object.values(graphs).some((g: any) => g?.nodes?.length > 0)
  );
}

/**
 * Check if diagnostic artefacts exist (at least one non-stale diagnostic).
 */
function hasAssessments(diagnostics: DiagnosticArtefactStore | null): boolean {
  if (!diagnostics) return false;
  return Object.values(diagnostics).some((d) => !d.stale);
}

/**
 * Check if governance diagnostics are complete (gap + risk registers).
 */
function hasGovernance(diagnostics: DiagnosticArtefactStore | null): boolean {
  if (!diagnostics) return false;
  return !!(diagnostics["gap-analysis"] && diagnostics["risk"]);
}

// ─── Main Computation ────────────────────────────────────────────────────────

/**
 * Compute the current model readiness state from scaffold content
 * and diagnostic artefacts.
 *
 * Returns the highest readiness state whose conditions are met.
 * If the scaffold is null or has no elements, returns null (no model loaded).
 */
export function computeReadiness(
  scaffold: any,
  diagnostics: DiagnosticArtefactStore | null = null
): ReadinessState | null {
  if (!scaffold) return null;
  if (!hasSkeleton(scaffold)) return null;

  // Walk up from the highest state; return the first that passes.
  // Since states are progressive, we check from highest to lowest.
  if (hasGovernance(diagnostics)) return "governed";
  if (hasAssessments(diagnostics)) return "assessed";
  if (hasDetail(scaffold)) return "detailed";
  if (hasGrounding(scaffold)) return "grounded";
  return "skeleton";
}

/**
 * Compare two readiness states. Returns:
 *   -1 if a < b
 *    0 if a === b
 *    1 if a > b
 */
export function compareReadiness(
  a: ReadinessState,
  b: ReadinessState
): -1 | 0 | 1 {
  const ai = READINESS_ORDER.indexOf(a);
  const bi = READINESS_ORDER.indexOf(b);
  if (ai < bi) return -1;
  if (ai > bi) return 1;
  return 0;
}

/**
 * Check if the model meets or exceeds a given readiness state.
 */
export function meetsReadiness(
  current: ReadinessState | null,
  required: ReadinessState
): boolean {
  if (!current) return false;
  return compareReadiness(current, required) >= 0;
}

/**
 * Get a human-readable summary of what's needed to reach the next state.
 */
export function nextReadinessHint(
  current: ReadinessState | null
): string | null {
  if (!current) return "Load or generate a scaffold to begin.";

  const idx = READINESS_ORDER.indexOf(current);
  if (idx >= READINESS_ORDER.length - 1) return null; // already at max

  const next = READINESS_ORDER[idx + 1];
  switch (next) {
    case "grounded":
      return "Run Map PPIT to add People, Process, Information & Technology decompositions to your activities.";
    case "detailed":
      return "Run Derive Activity Flows to generate sub-activity DAGs for each stage.";
    case "assessed":
      return "Run a diagnostic (Friction Assessment, Maturity Assessment) to begin analytical assessment.";
    case "governed":
      return "Complete Gap Analysis and Risk Assessment to reach full governance coverage.";
    default:
      return null;
  }
}
