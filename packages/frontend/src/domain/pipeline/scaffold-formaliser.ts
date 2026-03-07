// ─── Scaffold Formaliser — Pass B ───────────────────────────────────────────
// B1: Outcomes + Activities (Steps 05-06) → Gate 1 → one bounded repair retry
// B2: Controls + Metrics + Conditions + Assembly (Steps 07-10) → Gate 2
// temperature: 0 enforced in prompt — proxy enforcement is a separate task (D-069)

import type { DiscoveryIR } from "./discovery-ir";
import { makeId } from "./discovery-ir";
import { runGate1, runGate2 } from "./scaffold-gates";
import type { GateResult } from "./scaffold-gates";

export interface FormaliseResult {
  scaffold: any;
  gate1: GateResult;
  gate2: GateResult;
  repairAttempted: boolean;
  error?: string;
}

function buildVsContext(ir: DiscoveryIR) {
  return ir.valueStreams.filter((vs) => vs.name).map((vs) => ({
    vsName: vs.name,
    vsId: vs.vsId,
    description: vs.description,
    zone: vs.zone,
    trigger: vs.trigger ?? "",
    terminalOutcome: vs.terminalOutcome ?? "",
    stakeholder: vs.stakeholder ?? ir.org.stakeholder ?? "",
    stages: vs.stages,
    capabilities: vs.extractedCapabilities,
  }));
}

function buildRoleContext(ir: DiscoveryIR) {
  return ir.roles.filter((r) => r.name).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
  }));
}

function buildMetricContext(ir: DiscoveryIR) {
  return ir.metrics.filter((m) => m.name).map((m) => ({
    id: m.id,
    name: m.name,
    current: m.current,
    target: m.target,
  }));
}

function buildScaffoldPrompt(ir: DiscoveryIR): string {
  const vsContext = buildVsContext(ir);
  const roleContext = buildRoleContext(ir);
  const metricContext = buildMetricContext(ir);

  return `You are a business architect formalising a value stream model into a VCC ScaffoldModel.

## Determinism Requirement
This is a structural formalisation step — a pure function. Given these inputs, produce the same output every time. IDs are derived mechanically from element names (snake_case with type prefix). No creative variation.

## ID Convention
- vs_<snake_case_name>     e.g. vs_member_certification_lifecycle
- outcome_<snake_case>     e.g. outcome_application_received
- act_<snake_case_name>    e.g. act_process_certification_application
- cap_<snake_case_name>    e.g. cap_member_onboarding
- role_<snake_case_name>   e.g. role_credit_analyst
- ctrl_<snake_case_name>   e.g. ctrl_data_quality_gate
- metric_<snake_case_name>

## FSM Chain Rules (CRITICAL — violations fail validation)
Each Value Stream is a single linear activity chain:
1. Each activity has preOutcomeId !== postOutcomeId (no no-ops)
2. activity[i].postOutcomeId === activity[i+1].preOutcomeId (adjacent consistency)
3. nextActivityId chain has no breaks, no cycles — last activity has nextActivityId: null
4. All activities reachable from chain head
5. One activity per stage. Chain length = number of stages.
6. performedByRoleIds: at least one role per activity

## Your Task
Given the confirmed VS definitions, stages, roles, and capabilities below, produce a complete ScaffoldModel.json.

For each VS:
- Create one Outcome per stage boundary (n stages → n+1 outcomes)
- Create one Activity per stage (pre/post outcomes, roles, capabilities from the lists provided)
- Assign capabilities to activities based on stage semantics — use the provided capabilities, do not invent new ones
- Distribute roles across activities sensibly based on stage content
- Add controls where governance gates are evident from stage names or domain context
- capabilityPPIT: for each requiresCapabilityId, include { roleIds, activities: [brief description], informationObjectIds: [], technologyAppIds: [] }

Confirmed inputs:
${JSON.stringify({ valueStreams: vsContext, roles: roleContext }, null, 2)}

Metrics to include:
${JSON.stringify(metricContext, null, 2)}

Return ONLY valid JSON — the complete ScaffoldModel — no markdown fences:
{
  "schemaVersion": "1.0",
  "scaffoldId": "scaffold_<org_name_snake>",
  "name": "<Org Name>",
  "description": "<brief>",
  "createdAt": "<ISO timestamp>",
  "crossStreamOutcomes": [],
  "scaffoldIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "elements": {
    "valueStreams": {},
    "activities": {},
    "outcomes": {},
    "roles": {},
    "capabilities": {},
    "controls": {},
    "metrics": {}
  }
}

CRITICAL: activities must use field names: name, preOutcomeId, postOutcomeId, requiresCapabilityIds, performedByRoleIds, metricIds, controlIds, capabilityPPIT, nextActivityId.
valueStreams must use field names: name, description, activityIds, layoutZone, accountableStakeholder.`;
}

function buildRepairPrompt(originalPrompt: string, scaffoldJson: string, gateErrors: string[]): string {
  return `${originalPrompt}

## REPAIR REQUIRED
The scaffold you produced failed Gate 1 validation with these errors:
${gateErrors.map((e) => `- ${e}`).join("\n")}

Fix the errors and return the corrected complete ScaffoldModel JSON. No markdown fences.`;
}

export async function runPassB(
  ir: DiscoveryIR,
  apiUrl: string
): Promise<FormaliseResult> {
  const now = new Date().toISOString();
  const scaffoldPrompt = buildScaffoldPrompt(ir);

  // ── B1+B2 combined call ──────────────────────────────────────────────────
  // We use one LLM call for the full scaffold (B1+B2 combined is still faster
  // and cheaper than two calls at this stage). Gate 1 is enforced on the result.
  // If Gate 1 fails, one bounded repair attempt is made.

  let scaffold: any = null;
  let repairAttempted = false;

  // First attempt
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        temperature: 0,
        messages: [{ role: "user", content: scaffoldPrompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
    scaffold = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    return {
      scaffold: null,
      gate1: { passed: false, errors: ["Pass B LLM call failed"], warnings: [] },
      gate2: { passed: false, errors: ["Pass B LLM call failed"], warnings: [] },
      repairAttempted: false,
      error: String(e),
    };
  }

  // Gate 1 check
  let gate1 = runGate1(scaffold);

  // One bounded repair attempt if Gate 1 fails
  if (!gate1.passed) {
    repairAttempted = true;
    const repairPrompt = buildRepairPrompt(
      scaffoldPrompt,
      JSON.stringify(scaffold, null, 2),
      gate1.errors
    );
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          temperature: 0,
          messages: [{ role: "user", content: repairPrompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
      scaffold = JSON.parse(text.replace(/```json|```/g, "").trim());
      gate1 = runGate1(scaffold);
    } catch (e) {
      // Repair call failed — return with original scaffold and failed gate
      return {
        scaffold,
        gate1,
        gate2: { passed: false, errors: ["Repair attempt failed"], warnings: [] },
        repairAttempted: true,
        error: `Repair call failed: ${String(e)}`,
      };
    }
  }

  // Gate 2 (only if Gate 1 passed)
  const gate2 = gate1.passed ? runGate2(scaffold) : { passed: false, errors: ["Gate 1 failed — Gate 2 not run"], warnings: [] };

  return { scaffold, gate1, gate2, repairAttempted };
}
