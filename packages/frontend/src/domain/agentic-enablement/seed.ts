/**
 * Deterministic seed for AES inputs.
 *
 * Generates plausible per-dimension scores for any capability in a scaffold
 * so the heatmap has something to render against existing dev fixtures
 * (Claims Settlement, IIBA reference, Water Filtration, etc.) without
 * requiring hand-built scoring data per scenario.
 *
 * Seed strategy:
 *  - Hash the capability ID + name → integer
 *  - Use the hash to select a "shape" (likely-AFK, supervised-likely,
 *    HiTL-likely, human-primary-likely) and to vary per-dimension scores
 *  - Capability metadata (number of linked roles, tech apps, info objects)
 *    nudges scores toward plausible values: more tech → higher automation
 *    maturity, more roles → higher human-judgment dependency
 *
 * For the Tier-1 demo proper, Phase 3 builds a hand-curated Finance BPO
 * scenario that overrides this heuristic with bespoke AES inputs.
 */

import type { ScaffoldData } from "../../types";
import type { EnrichmentInputs, ScoreValue } from "./types";
import { FINANCIAL_SERVICES_PROFILE } from "./profiles";

/** djb2 hash → uint32. Stable across runs. */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Pick from list using hash seed (deterministic). */
function pick<T>(seed: number, choices: T[]): T {
  return choices[seed % choices.length];
}

type ShapeName = "afk_likely" | "supervised_likely" | "hitl_likely" | "human_primary_likely" | "regulatory_floor" | "error_floor";

/** Score shapes — bias the per-dimension score generator toward different classifications. */
const SHAPES: Record<ShapeName, Partial<Record<string, ScoreValue>>> = {
  afk_likely: {
    rule_codifiability: 5, data_readiness: 5, automation_maturity: 4,
    human_judgment_dependency: 5, exception_tolerance: 4,
    error_consequence_severity: 4, regulatory_constraint_level: 4,
    inter_capability_dependency_complexity: 4,
  },
  supervised_likely: {
    rule_codifiability: 4, data_readiness: 4, automation_maturity: 4,
    human_judgment_dependency: 4, exception_tolerance: 3,
    error_consequence_severity: 3, regulatory_constraint_level: 4,
    inter_capability_dependency_complexity: 3,
  },
  hitl_likely: {
    rule_codifiability: 2, data_readiness: 3, automation_maturity: 3,
    human_judgment_dependency: 2, exception_tolerance: 3,
    error_consequence_severity: 3, regulatory_constraint_level: 3,
    inter_capability_dependency_complexity: 2,
  },
  human_primary_likely: {
    rule_codifiability: 1, data_readiness: 2, automation_maturity: 2,
    human_judgment_dependency: 1, exception_tolerance: 2,
    error_consequence_severity: 2, regulatory_constraint_level: 2,
    inter_capability_dependency_complexity: 2,
  },
  regulatory_floor: {
    rule_codifiability: 5, data_readiness: 4, automation_maturity: 4,
    human_judgment_dependency: 4, exception_tolerance: 4,
    error_consequence_severity: 4, regulatory_constraint_level: 1, // hard floor
    inter_capability_dependency_complexity: 3,
  },
  error_floor: {
    rule_codifiability: 4, data_readiness: 5, automation_maturity: 5,
    human_judgment_dependency: 5, exception_tolerance: 4,
    error_consequence_severity: 1, // hard floor
    regulatory_constraint_level: 4,
    inter_capability_dependency_complexity: 4,
  },
};

const SHAPE_CHOICES: ShapeName[] = [
  "afk_likely",
  "afk_likely",
  "supervised_likely",
  "supervised_likely",
  "hitl_likely",
  "hitl_likely",
  "human_primary_likely",
  "regulatory_floor",
  "error_floor",
];

/** Bound a score to 1..5. */
function bound(n: number): ScoreValue {
  if (n < 1) return 1;
  if (n > 5) return 5;
  return Math.round(n) as ScoreValue;
}

/**
 * Seed AES inputs for one capability.
 * Uses deterministic hash + capability metadata to produce plausible scores.
 */
export function seedInputsForCapability(
  capabilityId: string,
  capabilityName: string,
  metadata?: {
    roleCount?: number;
    techAppCount?: number;
    infoObjectCount?: number;
  },
): EnrichmentInputs {
  const seed = hash(capabilityId + ":" + capabilityName);
  const shape = pick(seed, SHAPE_CHOICES);
  const baseScores = SHAPES[shape];

  // Nudge by metadata when available (small adjustments only).
  const techCount = metadata?.techAppCount ?? 0;
  const roleCount = metadata?.roleCount ?? 0;

  const scores: Record<string, ScoreValue> = {};
  for (const dim of FINANCIAL_SERVICES_PROFILE.dimensions) {
    const baseScore = baseScores[dim.id] ?? 3;
    let adjusted: number = baseScore;
    if (dim.id === "automation_maturity" && techCount > 2) adjusted += 1;
    if (dim.id === "human_judgment_dependency" && roleCount > 3) adjusted -= 1;
    scores[dim.id] = bound(adjusted);
  }

  return {
    capabilityId,
    profileId: FINANCIAL_SERVICES_PROFILE.id,
    scores,
  };
}

/**
 * Seed AES inputs for every capability in a scaffold.
 * Returns a map keyed by capability ID.
 */
export function seedInputsForScaffold(
  scaffold: ScaffoldData,
): Record<string, EnrichmentInputs> {
  const out: Record<string, EnrichmentInputs> = {};
  const capabilities = scaffold.elements?.capabilities ?? {};

  // Collect rough metadata per capability by walking activities.
  const metaByCap: Record<string, { roles: Set<string>; techs: Set<string>; ios: Set<string> }> = {};
  const activities = (scaffold.elements as Record<string, unknown>)?.activities as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (activities) {
    for (const act of Object.values(activities)) {
      const ppit = (act as Record<string, unknown>).capabilityPPIT as
        | Record<string, { roleIds?: string[]; technologyAppIds?: string[]; informationObjectIds?: string[] }>
        | undefined;
      if (!ppit) continue;
      for (const [capId, entry] of Object.entries(ppit)) {
        if (!metaByCap[capId]) metaByCap[capId] = { roles: new Set(), techs: new Set(), ios: new Set() };
        (entry.roleIds ?? []).forEach((r) => metaByCap[capId].roles.add(r));
        (entry.technologyAppIds ?? []).forEach((t) => metaByCap[capId].techs.add(t));
        (entry.informationObjectIds ?? []).forEach((i) => metaByCap[capId].ios.add(i));
      }
    }
  }

  for (const [capId, capRec] of Object.entries(capabilities)) {
    const cap = capRec as { name?: string };
    const meta = metaByCap[capId];
    out[capId] = seedInputsForCapability(capId, cap.name ?? capId, {
      roleCount: meta?.roles.size,
      techAppCount: meta?.techs.size,
      infoObjectCount: meta?.ios.size,
    });
  }

  return out;
}
