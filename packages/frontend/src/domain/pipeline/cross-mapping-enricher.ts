// ─── Cross-Mapping Enricher ──────────────────────────────────────────────────
// Discovers typed relationship instances between scaffold elements using LLM analysis.
// Supports both simple (single relationship type) and compound (PPIT) mappings.
//
// This module unifies:
// - Simple cross-mappings (e.g., Capability → Stage)
// - PPIT enrichment (compound: Role/Info/Tech/Process → Activity × Capability)
//
// Results are written to scaffold.elements.crossMaps as CrossMapInstance records.
// PPIT results are ALSO written to the legacy capabilityPPIT structure for backward compat.

import { callLLM } from "./llm-client";
import { buildCrossMappingPrompt, buildPPITCrossMappingPrompt } from "./prompts/pass-e-cross-mapping";
import type { ScaffoldData, ScaffoldActivity, PPITEntry } from "../../types";
import { getRelationshipTypeById } from "../cross-mapping-metamodel";
import type { RelationshipType } from "../cross-mapping-metamodel";
import type { MappingPair } from "../../store/enrichment-store";

export interface CrossMappingResult {
  success: boolean;
  /** Number of cross-map instances discovered */
  instanceCount: number;
  error?: string;
}

/**
 * Resolve the effective level constraint for a mapping pair.
 * Priority: user override > metamodel default > none.
 */
function resolveLevelConstraint(
  pair: MappingPair,
  relType: RelationshipType,
): { appliesTo: "from" | "to"; allowedLevels: number[] } | undefined {
  if (pair.levelConstraintOverride) {
    // User override — use metamodel's appliesTo direction with user's levels
    const appliesTo = relType.defaultLevelConstraint?.appliesTo ?? "from";
    return { appliesTo, allowedLevels: pair.levelConstraintOverride };
  }
  if (relType.defaultLevelConstraint) {
    return {
      appliesTo: relType.defaultLevelConstraint.appliesTo,
      allowedLevels: relType.defaultLevelConstraint.allowedLevels,
    };
  }
  return undefined;
}

/**
 * Run cross-mapping for a single (non-compound) relationship type.
 * Discovers instances and writes to scaffold.elements.crossMaps.
 */
async function runSimpleCrossMapping(
  scaffold: ScaffoldData,
  pair: MappingPair,
  relType: RelationshipType,
): Promise<CrossMappingResult> {
  const levelConstraint = resolveLevelConstraint(pair, relType);

  const prompt = buildCrossMappingPrompt(scaffold, relType, levelConstraint);
  const estimatedPairs = 100; // rough estimate
  const maxTokens = Math.max(4000, Math.min(16000, estimatedPairs * 80));

  console.log(`[cross-mapping] Running "${relType.label}" (${relType.from} → ${relType.to}), max_tokens=${maxTokens}`);

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    if (llmRes.stopReason === "max_tokens") {
      console.warn("[cross-mapping] Response truncated — results may be incomplete");
    }

    const raw = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim()) as Array<{
      sourceId: string;
      targetId: string;
      confidence: number;
      evidence?: string;
    }>;

    // Initialize crossMaps if needed
    if (!scaffold.elements.crossMaps) {
      scaffold.elements.crossMaps = {};
    }

    let count = 0;
    for (const entry of raw) {
      if (entry.confidence < 0.5) continue;
      const key = `${relType.id}::${entry.sourceId}→${entry.targetId}`;
      scaffold.elements.crossMaps[key] = {
        relationshipTypeId: relType.id,
        sourceId: entry.sourceId,
        targetId: entry.targetId,
        confidence: entry.confidence,
        evidence: entry.evidence,
        levelConstraint: levelConstraint
          ? { appliesTo: levelConstraint.appliesTo, level: levelConstraint.allowedLevels[0] }
          : undefined,
      };
      count++;
    }

    // Also write inverse mappings
    for (const entry of raw) {
      if (entry.confidence < 0.5) continue;
      const invKey = `${relType.id}:inv::${entry.targetId}→${entry.sourceId}`;
      scaffold.elements.crossMaps[invKey] = {
        relationshipTypeId: relType.id + ":inverse",
        sourceId: entry.targetId,
        targetId: entry.sourceId,
        confidence: entry.confidence,
        evidence: entry.evidence ? `(inverse) ${entry.evidence}` : undefined,
        levelConstraint: levelConstraint
          ? { appliesTo: levelConstraint.appliesTo, level: levelConstraint.allowedLevels[0] }
          : undefined,
      };
    }

    console.log(`[cross-mapping] "${relType.label}": ${count} instances discovered (+ ${count} inverse)`);
    return { success: true, instanceCount: count };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[cross-mapping] "${relType.label}" failed:`, msg);
    return { success: false, instanceCount: 0, error: msg };
  }
}

/**
 * Run PPIT compound cross-mapping.
 * Decomposes CAPABILITIES into People, Process, Information, Technology.
 *
 * PPIT belongs to the Capability, not the VS Stage. The Stage provides context
 * for how a capability manifests, but the decomposition is capability-centric.
 *
 * Writes to:
 * - scaffold.elements.crossMaps (unified cross-mapping store)
 * - Legacy capabilityPPIT on VS Stage entries (backward compat for existing views)
 */
async function runPPITCrossMapping(
  scaffold: ScaffoldData,
  pair: MappingPair,
  relType: RelationshipType,
): Promise<CrossMappingResult> {
  const levelConstraint = resolveLevelConstraint(pair, relType);
  const prompt = buildPPITCrossMappingPrompt(
    scaffold,
    levelConstraint ? { allowedLevels: levelConstraint.allowedLevels } : undefined,
  );

  // Estimate tokens based on number of capabilities
  const caps = scaffold.elements?.capabilities ?? {};
  const capCount = Object.keys(caps).length;
  const maxTokens = Math.max(4000, Math.min(16000, capCount * 150 + 1000));

  console.log(`[cross-mapping] Running PPIT compound (${capCount} capabilities), max_tokens=${maxTokens}`);

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    if (llmRes.stopReason === "max_tokens") {
      console.warn("[cross-mapping] PPIT response truncated — results may be incomplete");
    }

    // New capability-centric output format
    const ppitMap = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim()) as Record<
      string,
      {
        roleIds?: string[];
        processSteps?: string[];
        informationIds?: string[];
        technologyIds?: string[];
        confidence?: number;
      }
    >;

    // Initialize crossMaps if needed
    if (!scaffold.elements.crossMaps) {
      scaffold.elements.crossMaps = {};
    }

    let instanceCount = 0;

    // Build reverse lookup: capId → stageIds (for legacy capabilityPPIT writing)
    const stages = scaffold.elements?.activities ?? {};
    const capToStages = new Map<string, string[]>();
    for (const [stageId, stage] of Object.entries(stages)) {
      const s = stage as unknown as ScaffoldActivity;
      for (const capId of (s.enabledByCapabilityIds ?? s.requiresCapabilityIds ?? [])) {
        if (!capToStages.has(capId)) capToStages.set(capId, []);
        capToStages.get(capId)!.push(stageId);
      }
    }

    for (const [capId, ppit] of Object.entries(ppitMap)) {
      const conf = ppit.confidence ?? 0.8;
      const capName = (caps[capId] as unknown as { name?: string })?.name ?? capId;

      // Write cross-map instances for sub-relationships (capability-centric)
      for (const roleId of ppit.roleIds ?? []) {
        const key = `role-performs-capability::${roleId}→${capId}`;
        scaffold.elements.crossMaps[key] = {
          relationshipTypeId: "role-performs-capability",
          sourceId: roleId,
          targetId: capId,
          confidence: conf,
          evidence: `PPIT: role performs ${capName}`,
        };
        instanceCount++;
      }
      for (const techId of ppit.technologyIds ?? []) {
        const key = `technology-supports-capability::${techId}→${capId}`;
        scaffold.elements.crossMaps[key] = {
          relationshipTypeId: "technology-supports-capability",
          sourceId: techId,
          targetId: capId,
          confidence: conf,
          evidence: `PPIT: technology supports ${capName}`,
        };
        instanceCount++;
      }

      // Write to legacy capabilityPPIT on each VS Stage that realises this capability
      const stageIds = capToStages.get(capId) ?? [];
      for (const stageId of stageIds) {
        const stage = stages[stageId] as ScaffoldActivity | undefined;
        if (!stage) continue;
        if (!stage.capabilityPPIT) {
          stage.capabilityPPIT = {} as Record<string, PPITEntry>;
        }
        stage.capabilityPPIT[capId] = {
          roleIds: ppit.roleIds ?? [],
          activities: ppit.processSteps ?? [],
          informationObjectIds: ppit.informationIds ?? [],
          technologyAppIds: ppit.technologyIds ?? [],
        } as unknown as PPITEntry;
      }
    }

    const capsMapped = Object.keys(ppitMap).length;
    console.log(`[cross-mapping] PPIT: decomposed ${capsMapped} capabilities, ${instanceCount} cross-map instances`);
    return { success: true, instanceCount };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cross-mapping] PPIT failed:", msg);
    return { success: false, instanceCount: 0, error: msg };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Run cross-mapping enrichment for one or more mapping pairs.
 * Each pair references a metamodel relationship type.
 * Results are written into scaffold.elements.crossMaps in-place.
 */
export async function runCrossMappingEnrichment(
  scaffold: ScaffoldData,
  pairs: MappingPair[],
  onProgress?: (message: string) => void,
): Promise<CrossMappingResult> {
  let totalInstances = 0;
  const errors: string[] = [];

  for (const pair of pairs) {
    const relType = getRelationshipTypeById(pair.relationshipTypeId);
    if (!relType) {
      errors.push(`Unknown relationship type: ${pair.relationshipTypeId}`);
      continue;
    }

    onProgress?.(`Mapping: ${relType.label} (${relType.from} → ${relType.to})`);

    let result: CrossMappingResult;
    if (relType.compound) {
      result = await runPPITCrossMapping(scaffold, pair, relType);
    } else {
      result = await runSimpleCrossMapping(scaffold, pair, relType);
    }

    totalInstances += result.instanceCount;
    if (!result.success && result.error) {
      errors.push(`${relType.label}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    instanceCount: totalInstances,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
