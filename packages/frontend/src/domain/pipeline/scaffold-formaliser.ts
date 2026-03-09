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
  // Build flat L3 capability lookup from capability map
  const capMap: Record<string, { id: string; name: string; businessObject: string; description: string }> = {};
  for (const l1 of (ir.capabilityMap?.l1Areas ?? [])) {
    for (const l2 of (l1.domains ?? [])) {
      for (const cap of (l2.capabilities ?? [])) {
        const id = makeId("cap", cap.name);
        capMap[cap.name] = { id, name: cap.name, businessObject: cap.businessObject ?? "", description: cap.description ?? "" };
      }
    }
  }

  // Build stage-to-capability lookup
  const stageCaps: Record<string, Record<string, string[]>> = {};
  for (const sc of (ir.stageCapabilities ?? [])) {
    stageCaps[sc.vsName] = {};
    for (const s of (sc.stages ?? [])) {
      stageCaps[sc.vsName][s.stageName] = s.capabilityNames ?? [];
    }
  }

  return ir.valueStreams.filter((vs) => vs.name).map((vs) => ({
    vsName: vs.name,
    vsId: vs.vsId,
    description: vs.description,
    zone: vs.zone,
    trigger: vs.trigger ?? "",
    terminalOutcome: vs.terminalOutcome ?? "",
    stakeholder: vs.stakeholder ?? ir.org.stakeholder ?? "",
    stages: vs.stages.map((s: any) => {
      const capNames = stageCaps[vs.name]?.[s.name] ?? [];
      const caps = capNames.map((n) => capMap[n]).filter(Boolean);
      return {
        name: s.name,
        entryCriteria: s.entryCriteria ?? `${s.name} initiated`,
        exitCriteria: s.exitCriteria ?? `${s.name} complete`,
        stakeholders: s.stakeholders ?? [],
        valueItem: s.valueItem ?? "",
        stageMetrics: s.metrics ?? [],
        capabilities: caps,
      };
    }),
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
Pure function — same inputs, same output every time. IDs derived mechanically from element names
(snake_case with type prefix). No creative variation. No invented elements.

## ID Convention
vs_<snake>  outcome_<snake>  act_<snake>  cap_<snake>  role_<snake>  ctrl_<snake>  metric_<snake>

## FSM Chain Rules (CRITICAL — violations fail Gate 1)
1. preOutcomeId !== postOutcomeId on every Activity (no no-ops)
2. activity[i].postOutcomeId === activity[i+1].preOutcomeId (adjacent consistency)
3. nextActivityId chain: no breaks, no cycles, last activity has nextActivityId: null
4. All activities reachable from chain head
5. One Activity per stage — chain length equals number of stages
6. performedByRoleIds: at least one role per activity

## Outcome Naming — USE THE PROVIDED ENTRY/EXIT CRITERIA
Each stage has entryCriteria and exitCriteria. Use these to name Outcomes precisely:
  - preOutcome of stage 1 = trigger state (from VS trigger field)
  - postOutcome of stage N = derived from exitCriteria of stage N
  - preOutcome of stage N+1 = SAME outcome as postOutcome of stage N (shared boundary)
  - postOutcome of final stage = VS terminalOutcome
This produces semantically meaningful Outcome names rather than generic placeholders.

## Naming Rules (CRITICAL)
- Activity names: SHORT verb phrases, 2-5 words max. E.g. "Qualify lead", "Conduct discovery call".
- VS names: Use EXACTLY the names provided in the inputs. Do not embellish or reword them.
- Outcome names: Short noun phrases. E.g. "Lead Qualified", "Requirements Understood".

## Capability Assignment — USE PROVIDED CAPABILITIES ONLY
Each stage specifies which L3 capabilities it requires. Use exactly these in requiresCapabilityIds.
Do not invent new capabilities.
For capabilityPPIT: for each requiresCapabilityId include
  { roleIds: [...], activities: ["brief description"], informationObjectIds: [], technologyAppIds: [] }

## Registry Population (CRITICAL — empty registries fail Gate 2)
You MUST populate the elements registries for EVERY ID referenced in activities:
- For each role ID in performedByRoleIds → create entry in elements.roles with { name, description, elementType: "Role" }
- For each capability ID in requiresCapabilityIds → create entry in elements.capabilities with { name, description, elementType: "Capability" }
- For each control ID in controlIds → create entry in elements.controls with { name, description, elementType: "Control" }
DO NOT leave capabilities, roles, or controls as empty objects.

## Controls
Add controls where approval gates or governance checkpoints are evident from stage stakeholder lists.
If a stage has an approval role, create a corresponding control linked to that activity.

## Inputs
\${JSON.stringify({ valueStreams: vsContext, roles: roleContext, metrics: metricContext }, null, 2)}

## Output — return ONLY valid JSON, no markdown fences:
{
  "schemaVersion": "1.0",
  "scaffoldId": "scaffold_<org_name_snake>",
  "name": "<Org Name>",
  "description": "<brief>",
  "createdAt": "<ISO timestamp>",
  "crossStreamOutcomes": [],
  "scaffoldIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "elements": {
    "valueStreams": { "<vs_id>": { "name": "...", "description": "...", "activityIds": [], "layoutZone": "ecosystem|knowledge", "accountableStakeholder": "role_...", "elementType": "ValueStream" } },
    "activities": {},
    "outcomes": { "<outcome_id>": { "name": "...", "elementType": "Outcome" } },
    "roles": { "<role_id>": { "name": "...", "description": "...", "elementType": "Role" } },
    "capabilities": { "<cap_id>": { "name": "...", "description": "...", "elementType": "Capability" } },
    "controls": {},
    "metrics": {}
  }
}

CRITICAL field names on activities:
  name, preOutcomeId, postOutcomeId, requiresCapabilityIds, performedByRoleIds,
  metricIds, controlIds, capabilityPPIT, nextActivityId
CRITICAL field names on valueStreams:
  name, description, activityIds, layoutZone, accountableStakeholder
CRITICAL: Every ID referenced in activities MUST have a corresponding registry entry.`;
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
