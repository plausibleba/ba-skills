/**
 * Agentic Enablement Score (AES) — type definitions.
 *
 * Per VCC PRD "Designing the Agentic Enterprise" (v0.2, May 2026) and
 * DEC-122 (graph runtime / metamodel commitment, May 2026).
 *
 * The framework scores Capabilities for agentic enablement across a
 * configurable set of weighted dimensions, returning a 1.0–5.0 composite
 * and one of five classifications. Profiles are data-driven so different
 * industries can use different dimension sets, weights, and hard-floor
 * rules — the methodology calibration that distinguishes the entitlements
 * specification engine.
 *
 * This module is the open-core scoring engine (DEC-122 Layer 1 OSS scope).
 * The proprietary entitlements specification engine that generates
 * AgentCharter content sits separately (Layer 4 commercial).
 */

// ── Classification ─────────────────────────────────────────────────────

export type AgenticClassification =
  | "fully_autonomous_afk"
  | "supervised_autonomous"
  | "hitl_assisted"
  | "human_primary_agent_supported"
  | "not_yet_viable";

export const CLASSIFICATION_LABELS: Record<AgenticClassification, string> = {
  fully_autonomous_afk: "Fully Autonomous (AFK)",
  supervised_autonomous: "Supervised Autonomous",
  hitl_assisted: "Human-in-the-Loop Assisted",
  human_primary_agent_supported: "Human-Primary, Agent-Supported",
  not_yet_viable: "Not Yet Viable",
};

/** Ordering from most-autonomous to most-human (used for hard-floor capping). */
export const CLASSIFICATION_ORDER: AgenticClassification[] = [
  "fully_autonomous_afk",
  "supervised_autonomous",
  "hitl_assisted",
  "human_primary_agent_supported",
  "not_yet_viable",
];

// ── Weight class ───────────────────────────────────────────────────────

export type WeightClass = "high" | "medium" | "low";

export const DEFAULT_WEIGHT_VALUES: Record<WeightClass, number> = {
  high: 2,
  medium: 1,
  low: 0.5,
};

// ── Dimension and rule definitions ─────────────────────────────────────

export type ScoreValue = 1 | 2 | 3 | 4 | 5;

/**
 * Hard-floor rule — when a dimension's score is at or below `triggerScore`,
 * the capability's classification is capped at (no more autonomous than)
 * `capClassification`, regardless of composite score.
 *
 * Example: Regulatory Constraint Level = 1 ("legally mandated human
 * accountability") caps classification at hitl_assisted regardless of how
 * high the composite is. This is the legal-defensibility principle.
 */
export interface HardFloorRule {
  type: "hardFloor";
  triggerScore: ScoreValue;
  capClassification: AgenticClassification;
  reason: string;
}

export interface ScoringDimension {
  /** Stable identifier — used as the key in EnrichmentInputs.scores. */
  id: string;
  /** Display label for UI. */
  label: string;
  /** One-line explanation of what the dimension measures. */
  description: string;
  /** Weight class (resolved to a numeric weight via the profile or DEFAULT_WEIGHT_VALUES). */
  weightClass: WeightClass;
  /** Optional override of the resolved numeric weight. */
  weightOverride?: number;
  /** Scoring guidance shown to evaluators: what does 1 mean, what does 5 mean. */
  scoringGuidance: { 1: string; 5: string };
  /**
   * Special rules attached to this dimension. Currently only hardFloor.
   * Multiple rules can apply to one dimension (e.g., score=1 caps at HiTL,
   * score=2 caps at Supervised — though this would be unusual).
   */
  specialRules?: HardFloorRule[];
}

// ── Classification thresholds ──────────────────────────────────────────

/**
 * Composite-score thresholds for each classification (inclusive lower bound).
 * Default per the PRD; profiles may override.
 */
export interface ClassificationThresholds {
  fully_autonomous_afk: number;
  supervised_autonomous: number;
  hitl_assisted: number;
  human_primary_agent_supported: number;
  // not_yet_viable is the catch-all below human_primary_agent_supported.
}

export const DEFAULT_THRESHOLDS: ClassificationThresholds = {
  fully_autonomous_afk: 4.0,
  supervised_autonomous: 3.0,
  hitl_assisted: 2.0,
  human_primary_agent_supported: 1.0,
};

// ── Profile (the unit of industry calibration) ─────────────────────────

export interface ScoringProfile {
  /** Stable identifier, e.g. "financial-services". */
  id: string;
  /** Display label, e.g. "Financial Services". */
  label: string;
  /** Brief description of when this profile applies. */
  description: string;
  /** The dimensions for this profile — order is for display only. */
  dimensions: ScoringDimension[];
  /** Optional per-profile threshold overrides. */
  classificationThresholds?: Partial<ClassificationThresholds>;
  /**
   * Optional per-profile weight-value overrides. If a profile wants to use
   * High=3, Medium=1, Low=0.25 instead of the defaults, it sets these here.
   */
  weightValues?: Partial<Record<WeightClass, number>>;
}

// ── Enrichment input ───────────────────────────────────────────────────

export interface EnrichmentInputs {
  /** Capability being scored. */
  capabilityId: string;
  /** Profile used (must exist in the profile registry at score time). */
  profileId: string;
  /**
   * Dimension scores keyed by ScoringDimension.id.
   * Missing dimensions are treated as score=3 (neutral) at compute time
   * with a warning surfaced in the AESScore output.
   */
  scores: Record<string, ScoreValue>;
  /** Optional per-dimension provenance — where did this score come from? */
  evidenceNotes?: Record<string, string>;
}

// ── Output ─────────────────────────────────────────────────────────────

export interface DimensionScoreBreakdown {
  dimensionId: string;
  label: string;
  score: ScoreValue;
  weight: number;
  weightClass: WeightClass;
  weightedContribution: number; // score × weight
  evidenceNote?: string;
}

export interface HardFloorTrigger {
  dimensionId: string;
  dimensionLabel: string;
  triggerScore: ScoreValue;
  actualScore: ScoreValue;
  capClassification: AgenticClassification;
  reason: string;
  /** What the classification would have been without the hard floor. */
  classificationBeforeFloor: AgenticClassification;
}

export interface AESScore {
  capabilityId: string;
  profileId: string;
  /** Composite score on 1.0–5.0 scale (rounded to 1 decimal place for display). */
  composite: number;
  classification: AgenticClassification;
  perDimensionScores: DimensionScoreBreakdown[];
  /**
   * If a hard-floor rule fired, this records which one and what the
   * classification would have been without it. Useful for the demo:
   * "this would have been AFK by composite, but Regulatory = 1 caps it at HiTL."
   */
  hardFloorTriggered?: HardFloorTrigger;
  /** Dimensions in the profile that were missing from the inputs. */
  missingDimensions?: string[];
}
