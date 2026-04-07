// ─── Sub-Activity Enricher — "Derive Activity Flows" enrichment pass ─────────
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
 * Builds a compact context for activity flow DAG generation.
 * Includes: activity names, roles, capabilities, and — critically — any
 * PPIT-generated activities that were produced by the Map PPIT enrichment.
 * When PPIT data is present, the activity flows should incorporate those
 * fine-grained process activities rather than inventing from scratch.
 */
function buildSubActivityContext(scaffold: any): {
  activities: any[];
  roles: Record<string, string>;
  capabilities: Record<string, string>;
  hasPPIT: boolean;
} {
  const els = scaffold.elements ?? {};

  const activities = Object.entries(els.activities ?? {}).map(([id, act]: [string, any]) => {
    const base: any = {
      id,
      name: act.name,
      performedByRoleIds: act.performedByRoleIds ?? [],
      requiresCapabilityIds: act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? [],
      preOutcomeId: act.preOutcomeId,
      postOutcomeId: act.postOutcomeId,
    };

    // Include PPIT-derived activities if present (from Map PPIT enrichment).
    // These are the fine-grained process activities per capability that should
    // be woven into the activity flow DAG.
    const ppit = act.capabilityPPIT;
    if (ppit && typeof ppit === "object") {
      const ppitActivities: string[] = [];
      const ppitRoles: string[] = [];
      for (const [, decomp] of Object.entries(ppit)) {
        const d = decomp as any;
        for (const sub of d.activities ?? []) {
          if (sub && !ppitActivities.includes(sub)) ppitActivities.push(sub);
        }
        for (const rId of d.roleIds ?? []) {
          if (rId && !ppitRoles.includes(rId)) ppitRoles.push(rId);
        }
      }
      if (ppitActivities.length > 0) base.ppitActivities = ppitActivities;
      if (ppitRoles.length > 0) base.ppitRoleIds = ppitRoles;
    }

    return base;
  });

  const hasPPIT = activities.some((a) => a.ppitActivities?.length > 0);

  const roles: Record<string, string> = {};
  for (const [id, r] of Object.entries(els.roles ?? {})) {
    roles[id] = (r as any).name ?? id;
  }

  const capabilities: Record<string, string> = {};
  for (const [id, cap] of Object.entries(els.capabilities ?? {})) {
    capabilities[id] = (cap as any).name ?? id;
  }

  return { activities, roles, capabilities, hasPPIT };
}

function buildSubActivityPrompt(scaffold: any): string {
  const ctx = buildSubActivityContext(scaffold);

  const ppitGuidance = ctx.hasPPIT
    ? `
## PPIT Activities (IMPORTANT)
Several activities include a "ppitActivities" array — these are the fine-grained process
activities identified during PPIT Mapping for that stage. You MUST use these as the basis
for the activity flow DAG nodes. Incorporate every ppitActivity as a node (or combine very
closely related ones), then add decision gates where natural. The ppitRoleIds show which
roles were identified per-capability — prefer these when assigning roleId to nodes.

Do NOT invent new steps that contradict or ignore the ppitActivities. The DAG should be a
faithful sequencing and gating of the PPIT-identified work, not a replacement.
`
    : `
## Note
No PPIT mapping data is available yet. Generate activity flows based on the stage names,
roles, and capabilities provided. These flows may be re-derived once PPIT Mapping is run.
`;

  return `You are a business architect deriving activity flows for an operating model.

## Task
For each activity in the scaffold, generate an activity flow DAG that shows the internal
breakdown of that stage's work. Each DAG MUST capture the key steps, decision points,
handoffs, and checkpoints within the activity. Every DAG MUST contain real branching —
NOT just a linear sequence of steps.
${ppitGuidance}
## Output Format
Return a JSON object keyed by activity ID. Each value has a "nodes" array:

{
  "<act_id>": {
    "nodes": [
      { "id": "sa_<short>_step1", "label": "Receive Request", "nodeType": "activity", "nextIds": ["sa_<short>_gate1"], "roleId": "role_xxx", "outcome": "Request logged" },
      { "id": "sa_<short>_gate1", "label": "Meets Criteria?", "nodeType": "gate", "nextIds": ["sa_<short>_approve", "sa_<short>_reject"], "edgeLabels": { "sa_<short>_approve": "Yes — criteria met", "sa_<short>_reject": "No — incomplete" } },
      { "id": "sa_<short>_approve", "label": "Process Approval", "nodeType": "activity", "nextIds": ["sa_<short>_done"], "roleId": "role_yyy", "outcome": "Approved" },
      { "id": "sa_<short>_reject", "label": "Return for Rework", "nodeType": "activity", "nextIds": [], "roleId": "role_xxx", "outcome": "Sent back" },
      { "id": "sa_<short>_done", "label": "Finalise Output", "nodeType": "activity", "nextIds": [], "roleId": "role_yyy", "outcome": "Complete" }
    ]
  }
}

Note how the gate above has TWO outgoing paths (approve and reject) that lead to DIFFERENT nodes.
This is MANDATORY — every DAG must have at least one gate with 2+ diverging paths.

## Sub-Activity Node Rules
Each node has:
- id: "sa_<act_short>_<step_snake>" — unique within the DAG
- label: short verb phrase (2-5 words)
- nodeType: "activity" (work step) or "gate" (decision point)
- nextIds: array of next node IDs (empty for terminal nodes)
- edgeLabels: (gates only) object mapping nextId → transition label
- roleId: which role performs this step (use role IDs from reference data)
- outcome: short outcome description

## DAG Rules — CRITICAL
- 4-8 nodes per activity (more if ppitActivities warrant it)
- EVERY DAG MUST contain at least one gate with EXACTLY 2 or more nextIds pointing to DIFFERENT nodes
- A gate with only 1 nextId is INVALID — that is just a sequential step, not a real decision
- Think about what decisions, approvals, validations, or quality checks happen within each activity
- Common gate patterns: approval/rejection, pass/fail, complete/incomplete, standard/exception, automated/manual
- Gates MUST have edgeLabels explaining each branch condition
- Terminal nodes have empty nextIds []
- All nodes must be reachable from the first node
- roleId should reference roles from the activity's performedByRoleIds or ppitRoleIds
- Labels must be specific to the stage context — NOT generic

## ANTI-PATTERN — DO NOT DO THIS:
A purely sequential chain like step1 → step2 → step3 → step4 is WRONG.
Every real business process has decisions. Find them and model them as gates with diverging paths.

## Reference Data

### Activities (with their roles, capabilities, and PPIT activities where available):
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
  // ~500 tokens per activity DAG (3-8 nodes when PPIT activities are present) + overhead
  const maxTokens = Math.max(4000, Math.min(20000, actCount * 500 + 1000));
  console.log(`Derive Activity Flows: ${actCount} activities → max_tokens=${maxTokens}`);

  const prompt = buildSubActivityPrompt(scaffold);

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    if (llmRes.stopReason === "max_tokens") {
      console.warn("Activity Flow derivation response truncated — DAGs may be incomplete");
    }

    const dagMap = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());

    // ── Post-processing: validate and fix linear DAGs ──
    // Sonnet sometimes produces purely sequential flows despite strong prompting.
    // Detect DAGs with no gates and flag them for the user.
    let gateCount = 0;
    let linearCount = 0;
    for (const [actId, dagData] of Object.entries(dagMap)) {
      const nodes = (dagData as any)?.nodes;
      if (!Array.isArray(nodes)) continue;
      const hasGate = nodes.some((n: any) => n.nodeType === "gate");
      if (hasGate) {
        gateCount++;
      } else {
        linearCount++;
        // Inject a synthetic validation gate at the midpoint to ensure branching
        // This is a structural improvement — every real process has at least one check point
        const mid = Math.floor(nodes.length / 2);
        if (nodes.length >= 3 && mid > 0 && mid < nodes.length - 1) {
          const beforeNode = nodes[mid - 1];
          const afterNode = nodes[mid];
          const gateId = `sa_${actId.replace(/[^a-z0-9]/gi, "_").slice(0, 12)}_gate`;
          const rejectId = `sa_${actId.replace(/[^a-z0-9]/gi, "_").slice(0, 12)}_exception`;

          // Create gate node
          const gateNode = {
            id: gateId,
            label: "Quality Check",
            nodeType: "gate",
            nextIds: [afterNode.id, rejectId],
            edgeLabels: { [afterNode.id]: "Pass", [rejectId]: "Exception" },
          };
          // Create exception branch terminal
          const exceptionNode = {
            id: rejectId,
            label: "Handle Exception",
            nodeType: "activity" as const,
            nextIds: [] as string[],
            roleId: beforeNode.roleId ?? nodes[0]?.roleId,
            outcome: "Exception routed for resolution",
          };

          // Wire: beforeNode → gate → (afterNode | exception)
          beforeNode.nextIds = [gateId];
          nodes.splice(mid, 0, gateNode);
          nodes.push(exceptionNode);
        }
      }
    }
    if (linearCount > 0) {
      console.warn(`Derive Activity Flows: ${linearCount}/${gateCount + linearCount} DAGs had no decision gates — injected quality check gates`);
    }

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
    console.log(`Derive Activity Flows: merged DAGs for ${merged}/${actCount} activities (${gateCount} with natural gates, ${linearCount} with injected gates)`);

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Derive Activity Flows failed:", msg);
    return { success: false, error: msg };
  }
}
