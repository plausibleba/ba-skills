// ─── Scaffold Formaliser — Pass B ───────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for scaffold generation prompt.
// B1+B2 combined: one LLM call → Gate 1 → one bounded repair retry → Gate 2
// temperature: 0 enforced — proxy enforcement is a separate task (D-069)

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

function buildTechContext(ir: DiscoveryIR) {
  return ir.tech.filter((t) => t.name).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
  }));
}

function buildScaffoldPrompt(ir: DiscoveryIR): string {
  const vsContext = buildVsContext(ir);
  const roleContext = buildRoleContext(ir);
  const metricContext = buildMetricContext(ir);
  const techContext = buildTechContext(ir);

  return `You are a business architect formalising a value stream model into a VCC ScaffoldModel.

## Determinism Requirement
This is a structural formalisation step — a pure function. Given these inputs, produce the same output every time. IDs are derived mechanically from element names (snake_case with type prefix). No creative variation.

## ID Convention
- vs_<snake_case_name>     e.g. vs_lead_to_customer
- outcome_<snake_case>     e.g. outcome_lead_qualified
- act_<snake_case_name>    e.g. act_qualify_lead  (SHORT — 2-4 words max)
- cap_<snake_case_name>    e.g. cap_lead_qualification
- role_<snake_case_name>   e.g. role_credit_analyst
- metric_<snake_case_name>
- io_<snake_case_name>     e.g. io_customer_order

## Naming Rules (CRITICAL)
- Activity names: SHORT verb phrases, 2-5 words max. E.g. "Qualify lead", "Conduct discovery call", "Prepare proposal". Do NOT repeat the full stage description. Activity names must be DIFFERENT from capability names — activities are actions, capabilities are abilities.
- VS names: Use EXACTLY the names provided in the inputs. Do not embellish or reword them.
- Outcome names: Short noun phrases derived from stage entry/exit criteria. E.g. "Lead Qualified", "Requirements Understood".

## FSM Chain Rules (CRITICAL — violations fail validation)
Each Value Stream is a single linear activity chain:
1. Each activity has preOutcomeId !== postOutcomeId (no no-ops)
2. activity[i].postOutcomeId === activity[i+1].preOutcomeId (adjacent consistency)
3. nextActivityId chain has no breaks, no cycles — last activity has nextActivityId: null
4. All activities reachable from chain head
5. One activity per stage. Chain length = number of stages.
6. performedByRoleIds: at least one role per activity

## Registry Population (CRITICAL — empty registries fail validation)
You MUST populate the elements registries for EVERY ID referenced in activities:
- For each unique role ID in any activity's performedByRoleIds → create an entry in elements.roles with { name, description, elementType: "Role" }
- For each unique capability ID in any activity's requiresCapabilityIds → create an entry in elements.capabilities with { name, description, elementType: "Capability" }
- For each unique control ID in any activity's controlIds → create an entry in elements.controls with { name, description, elementType: "Control" }
- For each metric → create an entry in elements.metrics with { name, elementType: "Metric" }
- For each outcome → create an entry in elements.outcomes with { name, elementType: "Outcome" }
- For each information object → create an entry in elements.informationObjects with { name, elementType: "InformationObject" }
DO NOT leave capabilities, roles, or controls as empty objects. Every referenced ID must have a registry entry.

## Value Stream Fields (CRITICAL)
Each VS must include: name, description, activityIds, layoutZone (use the zone from inputs), accountableStakeholder (from inputs).

## Capability Assignment (CRITICAL — capabilities must be SHARED across activities)
Each activity MUST have 2-4 capabilities in requiresCapabilityIds. Capabilities are business abilities
(e.g. "Customer Relationship Management", "Order Fulfilment", "Data Management") that are SHARED across
multiple activities and value streams. Do NOT create 1:1 capability-to-activity mappings.
Use the provided capabilities as a starting point. If fewer than 2 caps are available per activity,
derive additional shared capabilities from the domain context (e.g. "Data Management", "Compliance Management",
"Stakeholder Communication", "Performance Monitoring").
Capabilities that appear in multiple activities create structural coupling — this is essential for the model.

## Information Objects (CRITICAL)
For each activity, create 2-3 informationObjects (business documents, data records, reports) that the
activity produces or consumes. E.g. "Customer Order", "Installation Record", "Service Schedule",
"Territory Plan", "Sales Report". Put entries in elements.informationObjects with { name, elementType: "InformationObject" }.
Reference them in the activity via informationObjectIds: [...].

## Metrics (CRITICAL — wire to activities)
Each activity should reference 0-2 relevant metricIds. Metrics from the discovery inputs MUST appear
in elements.metrics AND be referenced by at least one activity's metricIds array.

## Your Task
Given the confirmed VS definitions, stages, roles, and capabilities below, produce a complete ScaffoldModel.json.

For each VS:
- Create one Outcome per stage boundary (n stages → n+1 outcomes)
- Create one Activity per stage with pre/post outcomes, 2-4 capabilities, 1-2 roles, 2-3 information objects
- Ensure capabilities are SHARED — the same capability should appear in multiple activities across VS
- Distribute roles across activities sensibly based on stage content
- Wire metrics to the activities they measure

Confirmed inputs:
${JSON.stringify({ valueStreams: vsContext, roles: roleContext, tech: techContext, metrics: metricContext }, null, 2)}

Return ONLY valid JSON — the complete ScaffoldModel — no markdown fences:
{
  "schemaVersion": "1.0.0",
  "scaffoldId": "scaffold_<org_name_snake>",
  "name": "<Org Name> — Operating Model",
  "description": "<brief>",
  "createdAt": "<ISO timestamp>",
  "modelIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "elements": {
    "valueStreams": { "<vs_id>": { "name": "...", "description": "...", "activityIds": [], "layoutZone": "ecosystem|knowledge", "accountableStakeholder": "role_...", "elementType": "ValueStream" } },
    "activities": { "<act_id>": { "name": "...", "preOutcomeId": "...", "postOutcomeId": "...", "nextActivityId": "...|null", "requiresCapabilityIds": ["cap_a", "cap_b"], "performedByRoleIds": ["role_x"], "informationObjectIds": ["io_a", "io_b"], "metricIds": [], "controlIds": [], "elementType": "Activity" } },
    "outcomes": { "<outcome_id>": { "name": "...", "elementType": "Outcome" } },
    "roles": { "<role_id>": { "name": "...", "description": "...", "elementType": "Role" } },
    "capabilities": { "<cap_id>": { "name": "...", "description": "...", "elementType": "Capability" } },
    "informationObjects": { "<io_id>": { "name": "...", "elementType": "InformationObject" } },
    "controls": {},
    "constraints": {},
    "directives": {},
    "deonticLogic": {},
    "flowLogic": {},
    "concepts": {},
    "properties": {},
    "metrics": {},
    "measures": {},
    "conditions": {}
  }
}

CRITICAL: All element maps must be present, even if empty. Every ID referenced in activities MUST have a corresponding registry entry.`;
}

function buildRepairPrompt(originalPrompt: string, _scaffoldJson: string, gateErrors: string[]): string {
  return `${originalPrompt}

## REPAIR REQUIRED
The scaffold you produced failed Gate 1 validation with these errors:
${gateErrors.map((e) => `- ${e}`).join("\n")}

Fix the errors and return the corrected complete ScaffoldModel JSON. No markdown fences.`;
}

export async function runPassB(
  ir: DiscoveryIR,
): Promise<FormaliseResult> {
  const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";
  const scaffoldPrompt = buildScaffoldPrompt(ir);

  let scaffold: any = null;
  let repairAttempted = false;

  // First attempt
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        temperature: 0,
        messages: [{ role: "user", content: scaffoldPrompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
    scaffold = JSON.parse(text.replace(/`{3}json|`{3}/g, "").trim());
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
          max_tokens: 16000,
          temperature: 0,
          messages: [{ role: "user", content: repairPrompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
      scaffold = JSON.parse(text.replace(/`{3}json|`{3}/g, "").trim());
      gate1 = runGate1(scaffold);
    } catch (e) {
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
