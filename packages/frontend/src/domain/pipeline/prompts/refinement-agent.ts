// ─── Refinement Agent Prompt ──────────────────────────────────────────────────
// Input:  Current catalog state + conversation history + architect's latest message
// Output: Structured diff operations + natural language explanation
//
// The refinement agent is the AI assistant inside the Op Model Workbench.
// It proposes structural changes to operating model catalogs based on
// the architect's natural language feedback.
//
// DECISION LOG:
// - Session 26: Initial creation (Phase 2)
// - Output is JSON inside <diff> tags + explanation outside them
// - Agent sees only the active catalog, not the whole scaffold
// - Supports: add, modify, delete, merge, split, move operations

import type { CatalogType } from "../../../store/workbench-store";

const CATALOG_DESCRIPTIONS: Record<CatalogType, string> = {
  capabilities: `Capabilities are what the organisation CAN DO, independent of how or who.
Hierarchy: L1 (Business Area) → L2 (Domain) → L3 (Capability Group) → L4 (Capability).
Each has: id, name, level (1-4), parentId, description, tags[].
Common agent tasks: merge duplicates, split overly broad capabilities, reparent to correct L1/L2, rename to org terminology, suggest missing L4 children, flag orphans.`,

  valueStreams: `Value Streams are end-to-end flows that deliver measurable stakeholder value.
Each has: id, name, description, trigger, terminalOutcome, stages[].
Each stage has: name, capabilityRefs[], entryCriteria, exitCriteria.
Common agent tasks: resequence stages, suggest missing stages, merge thin stages, flag disconnected flows, reassign capabilities to correct stages.`,

  activities: `Activities are the work performed within value stream stages.
Each has: id, name, description, performedByRoleIds[], requiresCapabilityIds[], inputs[], outputs[].
Common agent tasks: reassign capabilities, update role references, flag stages with no capabilities.`,

  concepts: `Concepts are the ontological classes the organisation manages (Party, Record, Resource).
Each has: id, name, type (Party/Record/Resource), definition, relationships[], anchorCapabilityIds[], properties[].
Common agent tasks: reclassify triad type, merge duplicates, add relationships, flag concepts not linked to any capability.`,

  informationObjects: `Information Objects are the data artefacts and records managed across value streams.
Each has: id, name, description, lifecycleStates[].
Common agent tasks: flag unlinked objects, add lifecycle states, merge duplicates, link to activities.`,

  technologyApps: `Technology Applications (Systems) are the software systems that enable capabilities.
Each has: id, name, vendor, category, description.
Common agent tasks: categorise by vendor and function, flag systems with no capability linkage, add missing systems.`,

  roles: `Roles are the people or organisational units that perform activities.
Each has: id, name, description, responsibilities[].
Common agent tasks: merge duplicate roles (common AI error: "Analyst" vs "Risk Analyst" vs "Senior Analyst"), suggest RACI separation.`,

  metrics: `Metrics measure the performance of capabilities and value streams.
Each has: id, name, description, type (leading/lagging), targetValue, unit, capabilityRef.
Common agent tasks: suggest missing metrics, reclassify leading/lagging, update targets, retarget broken refs.`,
};

export function buildRefinementAgentPrompt(
  catalog: CatalogType,
  catalogElements: Record<string, any>,
  conversationHistory: { role: string; content: string }[],
  latestMessage: string,
): { role: string; content: string }[] {
  const elementList = Object.values(catalogElements);
  const elementSummary = elementList
    .map((el: any) => {
      const parts = [`id: ${el.id}`, `name: ${el.name || "?"}`];
      if (el.level) parts.push(`level: L${el.level}`);
      if (el.parentId) parts.push(`parentId: ${el.parentId}`);
      if (el.classification) parts.push(`classification: ${el.classification}`);
      if (el.description) parts.push(`description: ${el.description.slice(0, 120)}`);
      return `{ ${parts.join(", ")} }`;
    })
    .join("\n");

  const systemPrompt = `You are a Business Architecture refinement agent inside the Op Model Workbench.
Your role is to help the architect improve their operating model by proposing structural changes.

## Current Catalog: ${catalog}
${CATALOG_DESCRIPTIONS[catalog]}

## Rules
1. ALWAYS propose changes as structured diff operations inside <diff> tags.
2. Outside the <diff> tags, explain your reasoning in plain language — briefly.
3. Every proposal is a suggestion. The architect decides whether to accept, modify, or reject.
4. Maintain referential integrity — if you delete or merge elements, include cascadeUpdates for cross-references.
5. When merging, keep the better name and combine descriptions. The targetId should be the surviving element.
6. For new elements, generate IDs like: ${catalog.slice(0, 3)}_new_[descriptive_slug] (e.g., cap_new_customer_analytics).
7. Be concise. Don't over-explain unless the architect asks for detail.
8. If the request is ambiguous, ask a clarifying question instead of guessing.

## Diff Format
The <diff> block must contain a valid JSON array of operations:

\`\`\`
[
  { "action": "modify", "catalog": "${catalog}", "elementId": "xxx", "field": "name", "before": "Old Name", "after": "New Name" },
  { "action": "delete", "catalog": "${catalog}", "elementId": "xxx", "cascadeUpdates": [...] },
  { "action": "add", "catalog": "${catalog}", "elementId": "new_id", "element": { "id": "new_id", "name": "...", ... } },
  { "action": "merge", "catalog": "${catalog}", "sourceIds": ["a", "b"], "targetId": "a", "mergedElement": {...}, "cascadeUpdates": [...] },
  { "action": "split", "catalog": "${catalog}", "sourceId": "xxx", "newElements": [{...}, {...}], "cascadeUpdates": [...] },
  { "action": "move", "catalog": "${catalog}", "elementId": "xxx", "field": "parentId", "before": "old_parent", "after": "new_parent" }
]
\`\`\`

If you have no changes to propose (e.g., the architect asked a question), omit the <diff> block entirely.

## Current Catalog State (${elementList.length} elements)
${elementSummary}`;

  const messages: { role: string; content: string }[] = [
    { role: "user", content: systemPrompt },
    { role: "assistant", content: "Understood. I'm ready to help you refine this catalog. What would you like to change?" },
  ];

  // Add conversation history (skip the initial system exchange)
  for (const msg of conversationHistory) {
    messages.push(msg);
  }

  // Add the latest message
  messages.push({ role: "user", content: latestMessage });

  return messages;
}

/**
 * Parse the agent response to extract diff operations and explanation text.
 */
export function parseAgentResponse(response: string): {
  explanation: string;
  diffs: any[];
} {
  const diffMatch = response.match(/<diff>([\s\S]*?)<\/diff>/);
  let diffs: any[] = [];
  let explanation = response;

  if (diffMatch) {
    try {
      // Extract the JSON — handle both raw JSON and markdown-fenced JSON
      let jsonStr = diffMatch[1].trim();
      // Strip markdown code fences if present
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      diffs = JSON.parse(jsonStr);
      if (!Array.isArray(diffs)) diffs = [diffs];
    } catch (e) {
      console.warn("Failed to parse agent diff JSON:", e);
      diffs = [];
    }
    // Remove the diff block from the explanation
    explanation = response.replace(/<diff>[\s\S]*?<\/diff>/, "").trim();
  }

  return { explanation, diffs };
}
