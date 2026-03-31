/**
 * nba-engine.ts — D-118 Phase 1: Next-Best-Action Engine
 *
 * Continuously evaluates the model's current state and recommends
 * which operation the user should run next. Considers:
 *   - Which operations have been completed
 *   - Current readiness state
 *   - Which dependencies are satisfied
 *   - Which operations are implemented
 *
 * Scoring heuristic (from D-118):
 *   1. Operations whose required dependencies are all met score highest
 *   2. Among those, operations that unlock the most downstream operations preferred
 *   3. Among ties, enrichments preferred over diagnostics (build before assess)
 *
 * @see docs/DECISIONS.md D-118
 */

import type {
  OperationDefinition,
  ReadinessState,
  DependencyType,
  DiagnosticArtefactStore,
  ExternalInputStore,
} from "./enrichment-taxonomy";
import {
  OPERATION_REGISTRY,
  OPERATIONS_BY_ID,
} from "./enrichment-taxonomy";
import { computeReadiness, meetsReadiness, nextReadinessHint } from "./readiness-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DependencyCheckResult {
  /** The dependency declaration */
  operationId: string;
  type: DependencyType;
  reason: string;
  /** Whether this dependency is satisfied */
  satisfied: boolean;
}

export type OperationAvailability =
  | "available"      // All required deps met, readiness met, can run
  | "recommended"    // Available but has unmet recommended deps
  | "blocked"        // Required dep not met (soft block)
  | "not-ready"      // Readiness gate not met
  | "completed"      // Already done this session
  | "not-implemented"; // Planned but not yet built

export interface OperationStatus {
  operation: OperationDefinition;
  availability: OperationAvailability;
  /** Dependency check results (only for available/blocked/recommended) */
  dependencyChecks: DependencyCheckResult[];
  /** NBA score — higher = recommended sooner. 0 if not available. */
  score: number;
  /** Human-readable reason for the recommendation or block */
  reason: string;
  /** External inputs that would improve this operation's output, if provided */
  availableExternalInputs: string[];
  /** Whether external inputs for this operation are present in the project */
  hasExternalInputs: boolean;
}

export interface NBARecommendation {
  /** The recommended next operation, or null if nothing is actionable */
  recommended: OperationStatus | null;
  /** All operations with their current status, sorted by score descending */
  allOperations: OperationStatus[];
  /** Current model readiness */
  readiness: ReadinessState | null;
  /** Hint for reaching the next readiness level */
  readinessHint: string | null;
}

// ─── Dependency Checking ─────────────────────────────────────────────────────

/**
 * Check whether a specific operation's dependencies are satisfied.
 */
function checkDependencies(
  operation: OperationDefinition,
  completedIds: Set<string>,
  scaffold: any,
  diagnostics: DiagnosticArtefactStore | null
): DependencyCheckResult[] {
  return operation.dependencies.map((dep) => {
    // A dependency is satisfied if the operation has been completed this session
    // OR if the scaffold/diagnostics already contain its output
    const completedThisSession = completedIds.has(dep.operationId);
    const hasOutput = checkOperationOutput(dep.operationId, scaffold, diagnostics);

    return {
      operationId: dep.operationId,
      type: dep.type,
      reason: dep.reason,
      satisfied: completedThisSession || hasOutput,
    };
  });
}

/**
 * Check if an operation's output already exists in the model
 * (from a previous session or bundle load).
 */
function checkOperationOutput(
  operationId: string,
  scaffold: any,
  diagnostics: DiagnosticArtefactStore | null
): boolean {
  if (!scaffold?.elements) return false;

  switch (operationId) {
    case "ppit":
      return Object.values(scaffold.elements.activities || {}).some(
        (a: any) => a.capabilityPPIT && Object.keys(a.capabilityPPIT).length > 0
      );
    case "subactivities":
      return !!(
        scaffold.elements.subActivityGraphs &&
        Object.keys(scaffold.elements.subActivityGraphs).length > 0
      );
    case "cards":
      // Cards live in cardRegistry, not scaffold — check separately
      return false; // Caller should check cardRegistry
    case "cross-mapping":
      return !!(
        scaffold.elements.crossMaps &&
        Object.keys(scaffold.elements.crossMaps).length > 0
      );
    case "metrics":
      return !!(
        scaffold.elements.metrics &&
        Object.keys(scaffold.elements.metrics).length > 0
      );
    case "friction":
      return !!(diagnostics?.friction && !diagnostics.friction.stale);
    case "maturity":
      return !!(diagnostics?.maturity && !diagnostics.maturity.stale);
    case "dependencies":
      return !!(diagnostics?.dependencies && !diagnostics.dependencies.stale);
    case "gap-analysis":
      return !!(diagnostics?.["gap-analysis"] && !diagnostics["gap-analysis"].stale);
    case "risk":
      return !!(diagnostics?.risk && !diagnostics.risk.stale);
    default:
      return false;
  }
}

// ─── Downstream Count ────────────────────────────────────────────────────────

/**
 * Count how many operations this one unlocks (directly or transitively).
 * Used as a tiebreaker in NBA scoring.
 */
function countDownstream(operationId: string): number {
  let count = 0;
  for (const op of OPERATION_REGISTRY) {
    if (op.dependencies.some((d) => d.operationId === operationId)) {
      count++;
    }
  }
  return count;
}

// ─── NBA Scoring ─────────────────────────────────────────────────────────────

/**
 * Score an operation for NBA ranking.
 *
 * Score components:
 *   100: base score for available operations
 *    +N: downstream unlock count (0–10)
 *   +10: enrichment bonus (build before assess)
 *   -50: has unmet recommended deps (still available, lower priority)
 *     0: blocked, not-ready, completed, or not-implemented
 */
function scoreOperation(
  operation: OperationDefinition,
  availability: OperationAvailability,
  dependencyChecks: DependencyCheckResult[]
): number {
  if (
    availability === "blocked" ||
    availability === "not-ready" ||
    availability === "completed" ||
    availability === "not-implemented"
  ) {
    return 0;
  }

  let score = 100;

  // Enrichments preferred over diagnostics
  if (operation.operationType === "enrichment") {
    score += 10;
  }

  // Operations that unlock more downstream ops are preferred
  score += countDownstream(operation.id);

  // Unmet recommended deps reduce priority
  if (availability === "recommended") {
    const unmetRecommended = dependencyChecks.filter(
      (d) => d.type === "recommended" && !d.satisfied
    );
    score -= unmetRecommended.length * 15;
  }

  return Math.max(score, 1); // Never return 0 for available ops
}

// ─── Main NBA Computation ────────────────────────────────────────────────────

/**
 * Compute the Next-Best-Action recommendation given the current model state.
 *
 * @param scaffold - Current scaffold data (may be null)
 * @param completedIds - Set of operation IDs completed this session
 * @param diagnostics - Current diagnostic artefact store
 * @param cardRegistry - Current card registry (for cards completion check)
 * @param externalInputs - External input artefacts provided by the user
 */
export function computeNBA(
  scaffold: any,
  completedIds: Set<string>,
  diagnostics: DiagnosticArtefactStore | null = null,
  cardRegistry: any = null,
  externalInputs: ExternalInputStore | null = null
): NBARecommendation {
  const readiness = computeReadiness(scaffold, diagnostics);
  const readinessHint = nextReadinessHint(readiness);

  const allOperations: OperationStatus[] = OPERATION_REGISTRY.map((op) => {
    // Compute external input availability for this operation
    const wantedInputs = op.externalInputs ?? [];
    const providedInputTypes = externalInputs
      ? new Set(Object.values(externalInputs).map((ei) => ei.type))
      : new Set<string>();
    const hasExtInputs = wantedInputs.some((t) => providedInputTypes.has(t));

    // Not implemented yet
    if (!op.implemented) {
      return {
        operation: op,
        availability: "not-implemented" as OperationAvailability,
        dependencyChecks: [],
        score: 0,
        reason: "This operation is planned but not yet implemented.",
        availableExternalInputs: wantedInputs,
        hasExternalInputs: hasExtInputs,
      };
    }

    // Already completed this session
    const alreadyDone = completedIds.has(op.id) || checkOperationOutput(op.id, scaffold, diagnostics);
    // Special case: cards check against cardRegistry
    const cardsDone =
      op.id === "cards" &&
      cardRegistry &&
      (Object.keys(cardRegistry.conceptCards || {}).length > 0 ||
        Object.keys(cardRegistry.policyCards || {}).length > 0);

    if (completedIds.has(op.id) || (alreadyDone && op.id !== "friction") || cardsDone) {
      return {
        operation: op,
        availability: "completed" as OperationAvailability,
        dependencyChecks: [],
        score: 0,
        reason: "Already completed.",
        availableExternalInputs: wantedInputs,
        hasExternalInputs: hasExtInputs,
      };
    }

    // Readiness gate check
    if (readiness && !meetsReadiness(readiness, op.readinessGate)) {
      return {
        operation: op,
        availability: "not-ready" as OperationAvailability,
        dependencyChecks: [],
        score: 0,
        reason: `Requires model readiness: ${op.readinessGate}. Current: ${readiness}.`,
        availableExternalInputs: wantedInputs,
        hasExternalInputs: hasExtInputs,
      };
    }

    // Dependency checks
    const depChecks = checkDependencies(op, completedIds, scaffold, diagnostics);
    const unmetRequired = depChecks.filter(
      (d) => d.type === "required" && !d.satisfied
    );
    const unmetRecommended = depChecks.filter(
      (d) => d.type === "recommended" && !d.satisfied
    );

    if (unmetRequired.length > 0) {
      const names = unmetRequired
        .map((d) => OPERATIONS_BY_ID[d.operationId]?.label ?? d.operationId)
        .join(", ");
      return {
        operation: op,
        availability: "blocked" as OperationAvailability,
        dependencyChecks: depChecks,
        score: 0,
        reason: `Requires: ${names}. You can override this if you have a reason to proceed.`,
        availableExternalInputs: wantedInputs,
        hasExternalInputs: hasExtInputs,
      };
    }

    const availability: OperationAvailability =
      unmetRecommended.length > 0 ? "recommended" : "available";

    let reason: string;
    if (availability === "recommended") {
      const names = unmetRecommended
        .map((d) => OPERATIONS_BY_ID[d.operationId]?.label ?? d.operationId)
        .join(", ");
      reason = `Available. Recommended to run ${names} first for better results.`;
    } else {
      reason = "Ready to run.";
    }

    let score = scoreOperation(op, availability, depChecks);

    // Bonus for operations that have external inputs available —
    // the user has invested in providing context, reward operations that use it.
    // Provided inputs are worth more than generated ones (real evidence > inferred).
    if (hasExtInputs && externalInputs) {
      const matchingInputs = Object.values(externalInputs).filter(
        (ei) => wantedInputs.includes(ei.type)
      );
      const hasProvided = matchingInputs.some((ei) => ei.provenance === "provided");
      score += hasProvided ? 5 : 3; // Provided +5, Generated-only +3
    }

    return {
      operation: op,
      availability,
      dependencyChecks: depChecks,
      score,
      reason,
      availableExternalInputs: wantedInputs,
      hasExternalInputs: hasExtInputs,
    };
  });

  // Sort by score descending
  allOperations.sort((a, b) => b.score - a.score);

  // Top-scoring available operation is the recommendation
  const recommended =
    allOperations.find(
      (s) => s.availability === "available" || s.availability === "recommended"
    ) ?? null;

  return {
    recommended,
    allOperations,
    readiness,
    readinessHint,
  };
}
