/**
 * AES scoring engine — pure functions, no I/O.
 *
 * Algorithm:
 *   1. Resolve numeric weight per dimension (profile override > weightClass default).
 *   2. Compute weighted average of per-dimension scores.
 *   3. Classify by composite against profile thresholds (or defaults).
 *   4. Apply hard-floor rules: if any dimension's score is at or below its
 *      hard-floor trigger, cap the classification at the rule's capClassification.
 *   5. Return the breakdown, classification, and any hard-floor trigger.
 */

import {
  CLASSIFICATION_ORDER,
  CLASSIFICATION_LABELS,
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHT_VALUES,
  type AESScore,
  type AgenticClassification,
  type ClassificationThresholds,
  type DimensionScoreBreakdown,
  type EnrichmentInputs,
  type HardFloorTrigger,
  type ScoreValue,
  type ScoringDimension,
  type ScoringProfile,
} from "./types";

// ── Helpers ────────────────────────────────────────────────────────────

/** Resolve numeric weight for a dimension under a given profile. */
export function resolveWeight(
  dimension: ScoringDimension,
  profile: ScoringProfile,
): number {
  if (typeof dimension.weightOverride === "number") {
    return dimension.weightOverride;
  }
  const profileValues = profile.weightValues ?? {};
  const fromProfile = profileValues[dimension.weightClass];
  if (typeof fromProfile === "number") {
    return fromProfile;
  }
  return DEFAULT_WEIGHT_VALUES[dimension.weightClass];
}

/** Resolve thresholds: profile override merged on top of defaults. */
export function resolveThresholds(profile: ScoringProfile): ClassificationThresholds {
  return { ...DEFAULT_THRESHOLDS, ...(profile.classificationThresholds ?? {}) };
}

/** Map a composite score (1.0–5.0) to a classification using thresholds. */
export function classifyComposite(
  composite: number,
  thresholds: ClassificationThresholds,
): AgenticClassification {
  if (composite >= thresholds.fully_autonomous_afk) return "fully_autonomous_afk";
  if (composite >= thresholds.supervised_autonomous) return "supervised_autonomous";
  if (composite >= thresholds.hitl_assisted) return "hitl_assisted";
  if (composite >= thresholds.human_primary_agent_supported) return "human_primary_agent_supported";
  return "not_yet_viable";
}

/**
 * Cap a classification: returns whichever of `current` and `cap` is *less*
 * autonomous (closer to the human end of CLASSIFICATION_ORDER).
 */
export function capClassification(
  current: AgenticClassification,
  cap: AgenticClassification,
): AgenticClassification {
  const currentIdx = CLASSIFICATION_ORDER.indexOf(current);
  const capIdx = CLASSIFICATION_ORDER.indexOf(cap);
  return currentIdx > capIdx ? current : cap;
}

/** Round to one decimal place for stable display. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Main scoring function ──────────────────────────────────────────────

export function computeAES(
  inputs: EnrichmentInputs,
  profile: ScoringProfile,
): AESScore {
  if (inputs.profileId !== profile.id) {
    throw new Error(
      `Profile mismatch: inputs reference profile "${inputs.profileId}" but received profile "${profile.id}".`,
    );
  }

  const thresholds = resolveThresholds(profile);

  // 1. Resolve weights and per-dimension scores.
  const breakdowns: DimensionScoreBreakdown[] = [];
  const missingDimensions: string[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const dimension of profile.dimensions) {
    const weight = resolveWeight(dimension, profile);
    const provided = inputs.scores[dimension.id];

    if (typeof provided === "undefined") {
      missingDimensions.push(dimension.id);
      // Treat missing as neutral 3 to avoid blowing up the demo, but
      // surface it in the output so callers can react.
      const neutralScore: ScoreValue = 3;
      breakdowns.push({
        dimensionId: dimension.id,
        label: dimension.label,
        score: neutralScore,
        weight,
        weightClass: dimension.weightClass,
        weightedContribution: neutralScore * weight,
      });
      weightedSum += neutralScore * weight;
      totalWeight += weight;
      continue;
    }

    breakdowns.push({
      dimensionId: dimension.id,
      label: dimension.label,
      score: provided,
      weight,
      weightClass: dimension.weightClass,
      weightedContribution: provided * weight,
      evidenceNote: inputs.evidenceNotes?.[dimension.id],
    });
    weightedSum += provided * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    throw new Error(
      `Profile "${profile.id}" has zero total weight — no dimensions to score against.`,
    );
  }

  const composite = round1(weightedSum / totalWeight);

  // 2. Classify by composite.
  const compositeClassification = classifyComposite(composite, thresholds);

  // 3. Apply hard-floor rules. Walk dimensions and check each rule;
  //    accumulate the most-restrictive cap.
  let cappedClassification = compositeClassification;
  let triggeringRule: HardFloorTrigger | undefined;

  for (const dimension of profile.dimensions) {
    const score = inputs.scores[dimension.id];
    if (typeof score === "undefined") continue;
    const rules = dimension.specialRules ?? [];
    for (const rule of rules) {
      if (rule.type !== "hardFloor") continue;
      if (score > rule.triggerScore) continue;
      // Rule fires.
      const newCapped = capClassification(cappedClassification, rule.capClassification);
      if (newCapped !== cappedClassification) {
        // This rule is more restrictive than what we had — record it.
        triggeringRule = {
          dimensionId: dimension.id,
          dimensionLabel: dimension.label,
          triggerScore: rule.triggerScore,
          actualScore: score,
          capClassification: rule.capClassification,
          reason: rule.reason,
          classificationBeforeFloor: compositeClassification,
        };
        cappedClassification = newCapped;
      }
    }
  }

  return {
    capabilityId: inputs.capabilityId,
    profileId: inputs.profileId,
    composite,
    classification: cappedClassification,
    perDimensionScores: breakdowns,
    hardFloorTriggered: triggeringRule,
    missingDimensions: missingDimensions.length > 0 ? missingDimensions : undefined,
  };
}

// ── Bulk convenience ───────────────────────────────────────────────────

/** Score a list of capabilities against a single profile. */
export function computeAESBatch(
  inputsList: EnrichmentInputs[],
  profile: ScoringProfile,
): AESScore[] {
  return inputsList.map((inputs) => computeAES(inputs, profile));
}

/**
 * Aggregate classification distribution across a batch — useful for the
 * heatmap header ("12 capabilities: 5 AFK, 4 Supervised, 2 HiTL, 1 Human-Primary").
 */
export function classificationDistribution(
  scores: AESScore[],
): Record<AgenticClassification, number> {
  const dist: Record<AgenticClassification, number> = {
    fully_autonomous_afk: 0,
    supervised_autonomous: 0,
    hitl_assisted: 0,
    human_primary_agent_supported: 0,
    not_yet_viable: 0,
  };
  for (const s of scores) dist[s.classification]++;
  return dist;
}

/** Ordered list for display: AFK → Supervised → HiTL → Human-Primary → Not Yet Viable. */
export function distributionEntries(
  scores: AESScore[],
): { classification: AgenticClassification; label: string; count: number }[] {
  const dist = classificationDistribution(scores);
  return CLASSIFICATION_ORDER.map((c) => ({
    classification: c,
    label: CLASSIFICATION_LABELS[c],
    count: dist[c],
  }));
}
