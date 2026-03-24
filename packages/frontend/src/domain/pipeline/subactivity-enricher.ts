// ─── Sub-Activity Enricher — "Deepen Structure" enrichment pass ──────────────
// Generates sub-activity DAGs for each activity in the scaffold.
// Runs AFTER Pass B (lean scaffold generation) as an opt-in enrichment step.
//
// Sub-activity DAGs show the internal breakdown of each stage's work, including
// decision gates. This is the densest structural element — extracting it from
// Pass B reduces output by ~30% and makes scaffold generation much more reliable.
//
// DECISION LOG:
// - Session 26: Sub-activity DAGs added to Pass B (Capsicum alignment)
// - Session 28: Extracted to separate enrichment pass for reliability

import { callLLM } from "./llm-client";

export interface SubActivityResult {
  success: boolean;
  error?: string;
}

/**
 * Builds a compact context for sub-activity DAG generation.
 * Only includes what the LLM needs: activity names, roles, capabilities.
 */
function buildSubActivityContext(scaffold: any): {
  activities: any[];
  roles: Record<string, string>;
  capabilities: Record<string, string>;
} {
  const els = scaffold.elements ?? {};

  const activities = Object.entries(els.activities ?? {}).map(([id, act]: [string, any]) => ({
    id,
    name: act.name,
    performedByRoleIds: act.performedByRoleIds ?? [],
    requiresCapabilityIds: act.requiresCapabilityIds ?? [],
    preOutcomeId: act.preOutcomeId,
    postOutcomeId: act.postOutcomeId,
  }));

  const roles: Record<string, string> = {};
  for (const [id, r] of Object.entries(els.roles ?? {})) {
    roles[id] = (r as any).name ?? id;
  }

  const capabilities: Record<string, string> = {};
  for (const [id, cap] of Object.entries(els.capabilities ?? {})) {
    capabilities[id] = (cap as any).name ?? id;
  }

  return { activities, roles, capabilities };
}

function buildSubActivityPrompt(scaffold: any): string {
  const ctx = buildSubActivityContext(scaffold);

  return `You are a business architect enriching an operating model with sub-activity DAGs.

## Task
For each activity in the scaffold, generate a sub-activity DAG that shows the internal
breakdown of that stage's work. Each DAG should capture the key steps and decision points
within the activity.

## Output Format
Return a JSON object keyed by activity ID. Each value has a "nodes" array:

{
  "<act_id>": {
    "nodes": [
      { "id": "sa_<short>_step1", "label": "Step Name", "nodeType": "activity", "nextIds": ["sa_<short>_step2"], "roleId": "role_xxx", "outcome": "Step completed" },
      { "id": "sa_<short>_gate", "label": "Decision Gate", "nodeType": "gate", "nextIds": ["sa_<short>_yes", "sa_<short>_no"], "edgeLabels": { "sa_<short>_yes": "Approved", "sa_<short>_no": "Rejected" } }
    ]
  }
}

## Sub-Activity Node Rules
Each node has:
- id: "sa_<act_short>_<step_snake>" — unique within the DAG
- label: short verb phrase (2-5 words)
- nodeType: "activity" (work step) or "gate" (decision point)
- nextIds: array of next node IDs (empty for terminal nodes)
- edgeLabels: (gates only) object mapping nextId → transition label
- roleId: which role performs this step (use role IDs from reference data)
- outcome: short outcome description

## DAG Rules
- 3-6 nodes per activity
- Include at least one gate (decision point) per DAG where natural (qualification, approval, review, etc.)
- Gates have 2+ nextIds with edgeLabels explaining branching conditions
- Terminal nodes have empty nextIds
- All nodes must be reachable from the first node
- roleId should reference roles from the activity's performedByRoleIds
- Labels must be specific to the stage context — NOT generic

## Reference Data

### Activities (with their roles and capabilities):
${JSON.stringify(ctx.activities, null, 2)}

### Role names:
${JSON.stringify(ctx.roles, null, 2)}

### Capability names:
${JSON.stringify(ctx.capabilities, null, 2)}

Return ONLY valid JSON — no markdown fences, no commentary.`;
}

/**
 * Runs sub-activity enrichment: generates DAGs and merges into scaffold in-place.
 * Non-fatal — if generation fails, the scaffold still works (just without DAGs).
 */
export async function runSubActivityEnrichment(scaffold: any): Promise<SubActivityResult> {
  const activities = scaffold?.elements?.activities;
  if (!activities || Object.keys(activities).length === 0) {
    return { success: true };
  }

  const actCount = Object.keys(activities).length;
  // ~400 tokens per activity DAG (3-6 nodes) + overhead
  const maxTokens = Math.max(4000, Math.min(16000, actCount * 400 + 1000));
  console.log(`Sub-Activity Enrichment: ${actCount} activities → max_tokens=${maxTokens}`);

  const prompt = buildSubActivityPrompt(scaffold);

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    if (llmRes.stopReason === "max_tokens") {
      console.warn("Sub-Activity enrichment response truncated — DAGs may be incomplete");
    }

    const dagMap = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());

    // Merge DAGs into scaffold
    if (!scaffold.elements.subActivityGraphs) {
      scaffold.elements.subActivityGraphs = {};
    }
    let merged = 0;
    for (const [actId, dagData] of Object.entries(dagMap)) {
      if (activities[actId]) {
        scaffold.elements.subActivityGraphs[actId] = dagData;
        merged++;
      }
    }
    console.log(`Sub-Activity Enrichment: merged DAGs for ${merged}/${actCount} activities`);

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Sub-Activity Enrichment failed:", msg);
    return { success: false, error: msg };
  }
}
