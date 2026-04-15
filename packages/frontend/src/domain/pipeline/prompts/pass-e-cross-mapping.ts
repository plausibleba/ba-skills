// ─── Pass E: Cross-Mapping Enrichment ─────────────────────────────────────────
// Input:  Scaffold + selected relationship types from metamodel + level constraints
// Output: CrossMapInstance[] — discovered relationship instances between elements
//
// This pass discovers typed relationships between scaffold elements using the
// metamodel's relationship type definitions. The LLM analyses element names,
// descriptions, and context to find plausible mappings.
//
// For PPIT (compound) mappings, this replaces the standalone Pass C enricher.
// The compound prompt asks the LLM to discover all four PPIT sub-relationships
// simultaneously per activity × capability pair.

import type { ScaffoldData, ScaffoldElements, ScaffoldCapability, ScaffoldActivity } from "../../../types";
import { getCapabilityIds } from "../../../types";
import type { RelationshipType } from "../../cross-mapping-metamodel";

// ─── Context extraction ───────────────────────────────────────────────────

interface ElementSummary {
  id: string;
  name: string;
  description?: string;
  level?: number;
  parentId?: string | null;
  valueStreamId?: string;
  valueStreamName?: string;
}

/**
 * Detect "matching" capabilities — a Guild reference model pattern where
 * capabilities represent the ability to cross-reference two business objects.
 * These are meta-capabilities (e.g., "Brand/Strategy Matching") that don't
 * belong in value streams and should be excluded from cross-mapping.
 *
 * Detection: name ends with "Matching" AND description contains "associate".
 * Both conditions required to avoid false positives on legitimate capabilities
 * that happen to use the word "matching" in a different sense.
 */
function isMatchingCapability(name: string, description?: string): boolean {
  if (!name.endsWith("Matching")) return false;
  if (description && description.toLowerCase().includes("associate")) return true;
  // Name-only fallback: "X/Y Matching" pattern (slash separating two objects)
  return /\w+\s*\/\s*\w+.*Matching$/.test(name);
}

export function extractElements(
  scaffold: ScaffoldData,
  entityType: string,
  levelConstraint?: { allowedLevels: number[] },
): ElementSummary[] {
  const els = scaffold.elements ?? {} as ScaffoldElements;
  const vsNames = new Map<string, string>();
  for (const [id, vs] of Object.entries(els.valueStreams ?? {})) {
    vsNames.set(id, (vs as unknown as { name?: string }).name ?? id);
  }

  switch (entityType) {
    case "capabilities": {
      let caps = Object.entries(els.capabilities ?? {}).map(([id, cap]) => {
        const c = cap as unknown as ScaffoldCapability;
        return { id, name: c.name ?? id, description: c.description, level: c.level, parentId: c.parentId };
      });
      // Filter out "matching" meta-capabilities (Guild reference model pattern)
      const beforeCount = caps.length;
      caps = caps.filter((c) => !isMatchingCapability(c.name, c.description));
      if (caps.length < beforeCount) {
        console.log(`[cross-mapping] Excluded ${beforeCount - caps.length} matching meta-capabilities (${caps.length} remaining)`);
      }
      if (levelConstraint) {
        return caps.filter((c) => c.level != null && levelConstraint.allowedLevels.includes(c.level));
      }
      return caps;
    }
    case "activities":
    case "stages": {
      return Object.entries(els.activities ?? {}).map(([id, act]) => {
        const a = act as unknown as ScaffoldActivity;
        return {
          id,
          name: a.name ?? id,
          description: a.description,
          valueStreamId: a.valueStreamId,
          valueStreamName: a.valueStreamId ? vsNames.get(a.valueStreamId) : undefined,
        };
      });
    }
    case "roles": {
      return Object.entries(els.roles ?? {}).map(([id, r]) => ({
        id,
        name: (r as unknown as { name?: string }).name ?? id,
        description: (r as unknown as { description?: string }).description,
      }));
    }
    case "information": {
      return Object.entries(els.informationObjects ?? {}).map(([id, io]) => ({
        id,
        name: (io as unknown as { name?: string }).name ?? id,
        description: (io as unknown as { description?: string }).description,
      }));
    }
    case "technology": {
      const result: ElementSummary[] = [];
      for (const key of ["technologyApplications", "technologyApps"]) {
        for (const [id, t] of Object.entries((els as Record<string, Record<string, unknown>>)[key] ?? {})) {
          result.push({
            id,
            name: (t as unknown as { name?: string }).name ?? id,
            description: (t as unknown as { description?: string }).description,
          });
        }
      }
      return result;
    }
    case "processes": {
      return Object.entries((els as Record<string, Record<string, unknown>>).processes ?? {}).map(([id, p]) => ({
        id,
        name: (p as unknown as { name?: string }).name ?? id,
        description: (p as unknown as { description?: string }).description,
      }));
    }
    case "valueStreams": {
      return Object.entries(els.valueStreams ?? {}).map(([id, vs]) => ({
        id,
        name: (vs as unknown as { name?: string }).name ?? id,
        description: (vs as unknown as { description?: string }).description,
      }));
    }
    default:
      return [];
  }
}

// ─── Simple (non-compound) cross-mapping prompt ───────────────────────────

export function buildCrossMappingPrompt(
  scaffold: ScaffoldData,
  relType: RelationshipType,
  levelConstraint?: { appliesTo: "from" | "to"; allowedLevels: number[] },
): string {
  const fromConstraint = levelConstraint?.appliesTo === "from" ? levelConstraint : undefined;
  const toConstraint = levelConstraint?.appliesTo === "to" ? levelConstraint : undefined;

  const fromElements = extractElements(scaffold, relType.from, fromConstraint ? { allowedLevels: fromConstraint.allowedLevels } : undefined);
  const toElements = extractElements(scaffold, relType.to, toConstraint ? { allowedLevels: toConstraint.allowedLevels } : undefined);

  const constraintNote = levelConstraint
    ? `\n\nLEVEL CONSTRAINT: Only map ${levelConstraint.appliesTo === "from" ? "source" : "target"} elements at level(s): ${levelConstraint.allowedLevels.join(", ")}. The element list below has already been filtered.`
    : "";

  return `You are a business architect performing cross-mapping analysis on an operating model.

## Task
Discover all plausible instances of the "${relType.label}" relationship between the source and target elements listed below.

## Relationship Definition
- **Type**: ${relType.from} ${relType.label} ${relType.to}
- **Inverse**: ${relType.to} ${relType.inverseLabel} ${relType.from}
- **Description**: ${relType.description}
- **Cardinality**: ${relType.semantics.cardinality}${constraintNote}

## Output Format
Return a JSON array of mapping objects. Each mapping has:
- "sourceId": ID of the source element
- "targetId": ID of the target element
- "confidence": number 0.0-1.0 (how confident you are in this mapping)
- "evidence": brief phrase explaining why this mapping exists (max 20 words)

Only include mappings with confidence >= 0.5. Aim for precision over recall — it's better to miss a weak mapping than to include a spurious one.

Example:
[
  { "sourceId": "cap_001", "targetId": "act_002", "confidence": 0.9, "evidence": "CRM capability directly exercised in customer qualification stage" },
  { "sourceId": "cap_003", "targetId": "act_002", "confidence": 0.7, "evidence": "Data management supports lead record validation" }
]

## Source Elements (${relType.from})
${JSON.stringify(fromElements.map((e) => ({ id: e.id, name: e.name, ...(e.description ? { desc: e.description } : {}), ...(e.level != null ? { level: e.level } : {}), ...(e.valueStreamName ? { vs: e.valueStreamName } : {}) })), null, 2)}

## Target Elements (${relType.to})
${JSON.stringify(toElements.map((e) => ({ id: e.id, name: e.name, ...(e.description ? { desc: e.description } : {}), ...(e.level != null ? { level: e.level } : {}), ...(e.valueStreamName ? { vs: e.valueStreamName } : {}) })), null, 2)}

Return ONLY valid JSON — no markdown fences, no commentary. Return an empty array [] if no plausible mappings exist.`;
}

/**
 * Build a cross-mapping prompt scoped to a single Value Stream.
 * All capabilities are sent as source elements, but only the stages belonging
 * to this VS are included as targets. The VS name and description provide
 * context for better mapping quality.
 */
export function buildVSScopedCrossMappingPrompt(
  fromElements: ElementSummary[],
  vsStages: ElementSummary[],
  relType: RelationshipType,
  vsName: string,
  vsDescription: string | undefined,
  vsIndex: number,
  totalVS: number,
): string {
  const vsContext = vsDescription
    ? `\n\n## Value Stream Context\n**${vsName}** (${vsIndex + 1} of ${totalVS})\n${vsDescription}`
    : `\n\n## Value Stream Context\n**${vsName}** (${vsIndex + 1} of ${totalVS})`;

  return `You are a business architect performing cross-mapping analysis on an operating model.

## Task
Discover which capabilities are "${relType.label}" the stages of the value stream "${vsName}".

For each stage below, identify which capabilities from the source list are exercised, delivered, or realised during that stage. A capability may map to multiple stages, and a stage may require multiple capabilities.${vsContext}

## Relationship Definition
- **Type**: ${relType.from} ${relType.label} ${relType.to}
- **Description**: ${relType.description}
- **Cardinality**: ${relType.semantics.cardinality}

## Output Format
Return a JSON array of mapping objects. Each mapping has:
- "sourceId": ID of the capability
- "targetId": ID of the stage
- "confidence": number 0.0-1.0 (how confident you are in this mapping)
- "evidence": brief phrase explaining why this mapping exists (max 20 words)

Only include mappings with confidence >= 0.5. Aim for precision over recall — it's better to miss a weak mapping than to include a spurious one.

Example:
[
  { "sourceId": "cap_001", "targetId": "act_002", "confidence": 0.9, "evidence": "CRM capability directly exercised in customer qualification stage" }
]

## Capabilities (${fromElements.length} items)
${JSON.stringify(fromElements.map((e) => ({ id: e.id, name: e.name, ...(e.description ? { desc: e.description } : {}), ...(e.level != null ? { level: e.level } : {}) })), null, 2)}

## Stages in "${vsName}" (${vsStages.length} items)
${JSON.stringify(vsStages.map((e) => ({ id: e.id, name: e.name, ...(e.description ? { desc: e.description } : {}) })), null, 2)}

Return ONLY valid JSON — no markdown fences, no commentary. Return an empty array [] if no plausible mappings exist.`;
}

// ─── PPIT compound cross-mapping prompt ───────────────────────────────────
//
// PPIT decomposes CAPABILITIES (not Stages). The primary entity is the Capability.
// VS Stages provide context for how a capability manifests at a given point in
// the value stream, but the decomposition belongs to the Capability.
//
// Output is keyed by capability ID, with VS Stage context nested within.

export function buildPPITCrossMappingPrompt(
  scaffold: ScaffoldData,
  levelConstraint?: { allowedLevels: number[] },
): string {
  const els = scaffold.elements ?? {} as ScaffoldElements;

  // Capabilities (primary entity — respecting level constraint)
  const capabilities = extractElements(scaffold, "capabilities", levelConstraint);
  const capIds = new Set(capabilities.map((c) => c.id));

  const roles = extractElements(scaffold, "roles");
  const information = extractElements(scaffold, "information");
  const technology = extractElements(scaffold, "technology");

  // Build capability → VS Stage context map
  // (which stages is each capability realised in?)
  // Note: scaffold `elements.activities` contains VS Stages (legacy naming)
  const capStageContext = new Map<string, { stageId: string; stageName: string; vsName?: string }[]>();
  for (const [stageId, act] of Object.entries(els.activities ?? {})) {
    const a = act as unknown as ScaffoldActivity;
    const stageCaps = getCapabilityIds(a).filter((cid) => capIds.has(cid));
    const vsName = a.valueStreamId
      ? (els.valueStreams?.[a.valueStreamId] as unknown as { name?: string })?.name
      : undefined;
    for (const capId of stageCaps) {
      if (!capStageContext.has(capId)) capStageContext.set(capId, []);
      capStageContext.get(capId)!.push({ stageId, stageName: a.name, vsName });
    }
  }

  // Build capability-centric view for the prompt
  const capEntries = capabilities
    .filter((c) => capStageContext.has(c.id))
    .map((c) => ({
      capId: c.id,
      capName: c.name,
      level: c.level,
      description: c.description,
      realisedInStages: capStageContext.get(c.id) ?? [],
    }));

  return `You are a business architect enriching an operating model with PPIT (People, Process, Information, Technology) decompositions.

## Task
For each Capability listed below, determine the People (Roles), Process activities, Information assets, and Technology systems that together constitute that capability. The VS Stage context is provided to show WHERE each capability is realised — use this context to make the decomposition specific, but remember: PPIT belongs to the Capability, not the Stage.

## Output Format
Return a JSON object keyed by capability ID. Each capability entry contains its PPIT decomposition:

{
  "<cap_id>": {
    "roleIds": ["role_x", "role_y"],
    "processSteps": ["Verb-phrase step 1", "Verb-phrase step 2", "Verb-phrase step 3"],
    "informationIds": ["io_a", "io_b"],
    "technologyIds": ["tech_x"],
    "confidence": 0.85
  }
}

## PPIT Rules
For each capability:
- **roleIds**: 1-3 roles from the registry that perform this capability. Different capabilities should generally involve different roles.
- **processSteps**: exactly 3 short verb-phrase steps describing the process activities that operationalise this capability. Use the VS Stage context to make these specific — NOT generic descriptions.
- **informationIds**: 1-3 information assets that this capability consumes or produces.
- **technologyIds**: 0-2 technology IDs that support this capability (empty array if none fit).
- **confidence**: 0.0-1.0 — how confident you are in this decomposition.

## Context Sensitivity (CRITICAL)
Process steps must reflect what the capability actually does in the operating model. Use the "Realised in" VS Stage context below to make decompositions concrete. For example, "Data Management" capability:
- If realised in "Territory Planning" stage: "Aggregate territory demand signals", "Reconcile forecast data", "Update territory assignment records"
- If realised in "Order Conversion" stage: "Validate order data completeness", "Reconcile pricing against contracts", "Archive order records"
Do NOT use generic descriptions like "Manage data" or "Process information".
${levelConstraint ? `\nLEVEL CONSTRAINT: Capabilities filtered to level(s): ${levelConstraint.allowedLevels.join(", ")}.` : ""}

## Capabilities (with VS Stage context)
${JSON.stringify(capEntries.map((ce) => ({
  capId: ce.capId,
  capName: ce.capName,
  ...(ce.level != null ? { level: ce.level } : {}),
  ...(ce.description ? { desc: ce.description } : {}),
  realisedIn: ce.realisedInStages.map((s) => ({
    stageId: s.stageId,
    stage: s.stageName,
    ...(s.vsName ? { vs: s.vsName } : {}),
  })),
})), null, 2)}

## Available Roles
${JSON.stringify(roles.map((r) => ({ id: r.id, name: r.name })), null, 2)}

## Available Information Assets
${JSON.stringify(information.map((io) => ({ id: io.id, name: io.name })), null, 2)}

## Available Technology
${JSON.stringify(technology.map((t) => ({ id: t.id, name: t.name })), null, 2)}

Return ONLY valid JSON — no markdown fences, no commentary. Top-level keys are capability IDs.`;
}
