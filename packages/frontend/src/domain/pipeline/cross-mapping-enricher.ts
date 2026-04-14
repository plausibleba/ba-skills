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

import { callLLM, DEFAULT_MODEL } from "./llm-client";
import { buildCrossMappingPrompt, buildPPITCrossMappingPrompt } from "./prompts/pass-e-cross-mapping";
import type { ScaffoldData, ScaffoldActivity, ScaffoldCapability, PPITEntry } from "../../types";
import { getRelationshipTypeById } from "../cross-mapping-metamodel";
import type { RelationshipType } from "../cross-mapping-metamodel";
import type { MappingPair } from "../../store/enrichment-store";

export interface CrossMappingResult {
  success: boolean;
  /** Number of cross-map instances discovered */
  instanceCount: number;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Count elements of a given entity type in the scaffold, respecting level constraints.
 */
function countElements(
  scaffold: ScaffoldData,
  entityType: string,
  levelConstraint?: { allowedLevels: number[] },
): number {
  const els = scaffold.elements ?? {};
  switch (entityType) {
    case "capabilities": {
      const caps = Object.entries(els.capabilities ?? {});
      if (levelConstraint) {
        return caps.filter(([, c]) => {
          const cap = c as unknown as ScaffoldCapability;
          return cap.level != null && levelConstraint.allowedLevels.includes(cap.level);
        }).length;
      }
      return caps.length;
    }
    case "activities":
    case "stages":
      return Object.keys(els.activities ?? {}).length;
    case "roles":
      return Object.keys(els.roles ?? {}).length;
    case "information":
      return Object.keys(els.informationObjects ?? {}).length;
    case "technology": {
      let n = 0;
      for (const key of ["technologyApplications", "technologyApps"]) {
        n += Object.keys((els as Record<string, Record<string, unknown>>)[key] ?? {}).length;
      }
      return n;
    }
    case "processes":
      return Object.keys((els as Record<string, Record<string, unknown>>).processes ?? {}).length;
    case "valueStreams":
      return Object.keys(els.valueStreams ?? {}).length;
    default:
      return 0;
  }
}

/**
 * Estimate max_tokens for a cross-mapping LLM call.
 * Each mapping instance needs ~80 tokens of JSON output.
 * We estimate a plausible hit rate rather than assuming all pairs map.
 */
function estimateMaxTokens(fromCount: number, toCount: number): number {
  // Not every pair will map — assume ~20% hit rate for large sets, higher for small
  const totalPairs = fromCount * toCount;
  const estimatedHits = totalPairs <= 50
    ? totalPairs  // small sets: assume most will map
    : Math.ceil(totalPairs * 0.2);  // large sets: ~20% hit rate
  const tokensPerHit = 80;
  return Math.max(4000, Math.min(64000, estimatedHits * tokensPerHit + 500));
}

/**
 * Attempt to recover a valid JSON array from a truncated LLM response.
 * Finds the last complete array entry and closes the array.
 * Returns null if recovery is not possible.
 */
function recoverTruncatedJsonArray(text: string): unknown[] | null {
  const trimmed = text.replace(/`{3}json|`{3}/g, "").trim();
  // Must start with [
  if (!trimmed.startsWith("[")) return null;

  // Try to find the last complete object by looking for },
  // then close the array after it
  const lastCompleteEntry = trimmed.lastIndexOf("},");
  if (lastCompleteEntry === -1) {
    // Try just a single complete object: [{ ... }
    const lastBrace = trimmed.lastIndexOf("}");
    if (lastBrace > 0) {
      const attempt = trimmed.slice(0, lastBrace + 1) + "]";
      try {
        return JSON.parse(attempt) as unknown[];
      } catch {
        return null;
      }
    }
    return null;
  }

  // Slice up to and including the last complete }, then close
  const attempt = trimmed.slice(0, lastCompleteEntry + 1) + "]";
  try {
    return JSON.parse(attempt) as unknown[];
  } catch {
    return null;
  }
}

/**
 * Attempt to recover a valid JSON object from a truncated LLM response.
 * For PPIT output which is `{ "capId": { ... }, "capId2": { ... }, ... }`.
 * Finds the last complete top-level value entry and closes the object.
 */
function recoverTruncatedJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.replace(/`{3}json|`{3}/g, "").trim();
  if (!trimmed.startsWith("{")) return null;

  // Find the last pattern of `}, "` or `},\n  "` which marks the boundary
  // between complete top-level entries. We look for the last `},` followed
  // eventually by a quote (next key) — the `},` marks a complete entry.
  // Strategy: find last `},"` or `},\n` and close after it.

  // Look for last occurrence of a closing brace followed by comma
  // that represents a complete top-level entry
  const regex = /\},\s*"/g;
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(trimmed)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch) {
    // Try single entry: { "key": { ... }
    const lastBrace = trimmed.lastIndexOf("}");
    if (lastBrace > 0) {
      const attempt = trimmed.slice(0, lastBrace + 1) + "}";
      try {
        return JSON.parse(attempt) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }

  // Close after the }, (include the closing brace of the last complete entry)
  const attempt = trimmed.slice(0, lastMatch.index + 1) + "}";
  try {
    return JSON.parse(attempt) as Record<string, unknown>;
  } catch {
    return null;
  }
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

  const fromConstraint = levelConstraint?.appliesTo === "from" ? { allowedLevels: levelConstraint.allowedLevels } : undefined;
  const toConstraint = levelConstraint?.appliesTo === "to" ? { allowedLevels: levelConstraint.allowedLevels } : undefined;
  const fromCount = countElements(scaffold, relType.from, fromConstraint);
  const toCount = countElements(scaffold, relType.to, toConstraint);

  // Guard: nothing to map if either side is empty
  if (fromCount === 0 || toCount === 0) {
    const detail = fromCount === 0
      ? `no ${relType.from} elements found${fromConstraint ? ` at level(s) ${fromConstraint.allowedLevels.join(",")}` : ""}`
      : `no ${relType.to} elements found${toConstraint ? ` at level(s) ${toConstraint.allowedLevels.join(",")}` : ""}`;
    console.warn(`[cross-mapping] Skipped "${relType.label}": ${detail}`);
    return { success: false, instanceCount: 0, error: `Skipped — ${detail}` };
  }

  const prompt = buildCrossMappingPrompt(scaffold, relType, levelConstraint);
  const maxTokens = estimateMaxTokens(fromCount, toCount);

  console.log(`[cross-mapping] Running "${relType.label}" (${relType.from}[${fromCount}] → ${relType.to}[${toCount}]), max_tokens=${maxTokens}`);

  try {
    const llmRes = await callLLM({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const truncated = llmRes.stopReason === "max_tokens";
    if (truncated) {
      console.warn("[cross-mapping] Response truncated — will attempt to recover partial results");
    }

    let raw: Array<{
      sourceId: string;
      targetId: string;
      confidence: number;
      evidence?: string;
    }>;

    try {
      raw = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());
    } catch (parseError) {
      if (truncated) {
        const recovered = recoverTruncatedJsonArray(llmRes.text);
        if (recovered) {
          console.warn(`[cross-mapping] Recovered ${recovered.length} entries from truncated response`);
          raw = recovered as typeof raw;
        } else {
          throw new Error(`JSON parse failed and recovery unsuccessful: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      } else {
        throw parseError;
      }
    }

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

  // Estimate tokens: each capability PPIT entry needs ~150 tokens of JSON output
  const caps = scaffold.elements?.capabilities ?? {};
  const lcFilter = levelConstraint ? { allowedLevels: levelConstraint.allowedLevels } : undefined;
  const capCount = countElements(scaffold, "capabilities", lcFilter);

  // Guard: nothing to decompose if no capabilities found
  if (capCount === 0) {
    const detail = `no capabilities found${lcFilter ? ` at level(s) ${lcFilter.allowedLevels.join(",")}` : ""}`;
    console.warn(`[cross-mapping] Skipped PPIT: ${detail}`);
    return { success: false, instanceCount: 0, error: `Skipped — ${detail}` };
  }

  const maxTokens = Math.max(4000, Math.min(64000, capCount * 150 + 1000));

  console.log(`[cross-mapping] Running PPIT compound (${capCount} capabilities), max_tokens=${maxTokens}`);

  try {
    const llmRes = await callLLM({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const truncated = llmRes.stopReason === "max_tokens";
    if (truncated) {
      console.warn("[cross-mapping] PPIT response truncated — will attempt to recover partial results");
    }

    // New capability-centric output format
    type PPITMapEntry = {
      roleIds?: string[];
      processSteps?: string[];
      informationIds?: string[];
      technologyIds?: string[];
      confidence?: number;
    };
    let ppitMap: Record<string, PPITMapEntry>;

    try {
      ppitMap = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());
    } catch (parseError) {
      if (truncated) {
        const recovered = recoverTruncatedJsonObject(llmRes.text);
        if (recovered) {
          const entryCount = Object.keys(recovered).length;
          console.warn(`[cross-mapping] PPIT: recovered ${entryCount} capability entries from truncated response`);
          ppitMap = recovered as Record<string, PPITMapEntry>;
        } else {
          throw new Error(`PPIT JSON parse failed and recovery unsuccessful: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      } else {
        throw parseError;
      }
    }

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
