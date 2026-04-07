// ─── Pass C: PPIT Enrichment ──────────────────────────────────────────────────
// Input:  Scaffold (from Pass B) — activities, capabilities, roles, IOs, tech
// Output: capabilityPPIT mapping for every activity × capability pair
//
// This pass runs AFTER scaffold generation (Pass B) and enriches each activity
// with People, Process, Information, Technology decompositions per capability.
// Separating PPIT from scaffold generation cuts Pass B output by ~40% and makes
// the overall pipeline faster and more resilient.
//
// DECISION LOG:
// - Session 27: Split from Pass B to reduce output size and improve reliability

import { ScaffoldData, ScaffoldActivity, ScaffoldElements, getCapabilityIds } from "../../../types";

/**
 * Builds a compact context from the scaffold for PPIT generation.
 * Only includes what the LLM needs: activity–capability–role–IO–tech mappings.
 */
function buildPPITContext(scaffold: ScaffoldData): {
  activities: Record<string, unknown>[];
  capabilities: Record<string, string>;
  roles: Record<string, string>;
  informationObjects: Record<string, string>;
  tech: Record<string, string>;
} {
  const els = scaffold.elements ?? {} as ScaffoldElements;

  // Activity summaries (just what PPIT needs)
  // Handle both v4 (requiresCapabilityIds) and v5 (enabledByCapabilityIds) field names
  const activities = Object.entries(els.activities ?? {}).map(([id, act]) => {
    const activity = act as unknown as ScaffoldActivity;
    return {
      id,
      name: activity.name,
      requiresCapabilityIds: getCapabilityIds(activity),
      performedByRoleIds: activity.performedByRoleIds ?? [],
      informationObjectIds: activity.informationObjectIds ?? [],
    };
  });

  // Name lookups
  const capabilities: Record<string, string> = {};
  for (const [id, cap] of Object.entries(els.capabilities ?? {})) {
    capabilities[id] = (cap as unknown as { name?: string }).name ?? id;
  }

  const roles: Record<string, string> = {};
  for (const [id, r] of Object.entries(els.roles ?? {})) {
    roles[id] = (r as unknown as { name?: string }).name ?? id;
  }

  const informationObjects: Record<string, string> = {};
  for (const [id, io] of Object.entries(els.informationObjects ?? {})) {
    informationObjects[id] = (io as unknown as { name?: string }).name ?? id;
  }

  // Tech: check multiple possible registry names
  const tech: Record<string, string> = {};
  for (const key of ["technologyApplications", "technologyApps"]) {
    for (const [id, t] of Object.entries((els as Record<string, Record<string, unknown>>)[key] ?? {})) {
      tech[id] = (t as unknown as { name?: string }).name ?? id;
    }
  }

  return { activities, capabilities, roles, informationObjects, tech };
}

export function buildPPITPrompt(scaffold: ScaffoldData): string {
  const ctx = buildPPITContext(scaffold);

  return `You are a business architect enriching an operating model with PPIT (People, Process, Information, Technology) decompositions.

## Task
For each activity in the scaffold, and for each capability that activity requires, generate a PPIT decomposition describing HOW that capability is exercised at that specific stage.

## Output Format
Return a JSON object keyed by activity ID. Each value is an object keyed by capability ID:

{
  "<act_id>": {
    "<cap_id>": {
      "roleIds": ["role_x", "role_y"],
      "activities": ["Sub-activity 1", "Sub-activity 2", "Sub-activity 3"],
      "informationObjectIds": ["io_a", "io_b"],
      "technologyAppIds": ["tech_x"]
    }
  }
}

## PPIT Rules
For each capability on each activity:
- **roleIds**: 1-2 roles that SPECIFICALLY exercise THIS capability at this stage. Select from the full roles registry (not limited to the activity's performedByRoleIds). Different capabilities at the same stage should generally involve different roles — e.g. "Data Management" might be performed by a Data Analyst while "Customer Relationship Management" at the same stage is performed by a Sales Representative. Avoid assigning the same role to every capability unless the stage genuinely has only one participant.
- **activities**: exactly 3 short verb-phrase sub-activities describing specific work done (context-sensitive to the stage — NOT generic)
- **informationObjectIds**: 1-3 IOs from the activity's informationObjectIds that this capability uses/produces
- **technologyAppIds**: 0-2 technology IDs that support this capability (use tech_ prefixed IDs from the reference below; if none fit, use empty array)

## Context Sensitivity (CRITICAL)
Sub-activities must be specific to the stage context. For example, "Data Management" capability:
- At "Territory Planning" stage: "Aggregate territory demand signals", "Reconcile forecast data", "Update territory assignment records"
- At "Order Conversion" stage: "Validate order data completeness", "Reconcile pricing against contracts", "Archive order records"
Do NOT use generic descriptions like "Manage data" or "Process information".

## Reference Data

### Activities (with their capabilities, roles, and information objects):
${JSON.stringify(ctx.activities, null, 2)}

### Capability names:
${JSON.stringify(ctx.capabilities, null, 2)}

### Role names:
${JSON.stringify(ctx.roles, null, 2)}

### Information Object names:
${JSON.stringify(ctx.informationObjects, null, 2)}

### Technology names:
${JSON.stringify(ctx.tech, null, 2)}

Return ONLY valid JSON — no markdown fences, no commentary. The top-level keys must be activity IDs, each containing capability ID keys with PPIT objects.`;
}
