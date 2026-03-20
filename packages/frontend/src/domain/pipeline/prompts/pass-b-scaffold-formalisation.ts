// ─── Pass B: Scaffold Formalisation ───────────────────────────────────────────
// Input:  DiscoveryIR (VS, stages, roles, capabilities, metrics, tech)
// Output: Complete ScaffoldModel.json with FSM chains, capabilityPPIT, registries
//
// This is a deterministic formalisation step — given the same inputs, it should
// produce the same structural output. Creative variation is NOT desired here.
//
// The capabilityPPIT decomposition (People, Process, Information, Technology)
// is the key structural element that makes the model rich and actionable.
// Each capability on each activity gets decomposed into:
//   - roleIds: who performs this capability in this stage
//   - activities: 3 specific sub-activities (verb phrases)
//   - informationObjectIds: what information this capability uses/produces
//   - technologyAppIds: what systems support this capability
//
// DECISION LOG:
// - D-065: Three-pass pipeline with Gate 1/Gate 2
// - Session 16: Added shared capability rules, info objects, metric wiring
// - Session 17: Extracted to standalone prompt file, added capabilityPPIT

import type { DiscoveryIR } from "../discovery-ir";
import { makeId } from "../discovery-ir";

// ── Context builders ─────────────────────────────────────────────────────────

function buildVsContext(ir: DiscoveryIR) {
  const capMap: Record<string, { id: string; name: string; businessObject: string; description: string }> = {};
  for (const l1 of (ir.capabilityMap?.l1Areas ?? [])) {
    for (const l2 of (l1.domains ?? [])) {
      for (const cap of (l2.capabilities ?? [])) {
        const id = makeId("cap", cap.name);
        capMap[cap.name] = { id, name: cap.name, businessObject: cap.businessObject ?? "", description: cap.description ?? "" };
      }
    }
  }

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

// ── Main prompt builder ──────────────────────────────────────────────────────

export function buildScaffoldPrompt(ir: DiscoveryIR): string {
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
- tech_<snake_case_name>   e.g. tech_salesforce

## Naming Rules (CRITICAL)
- Activity names: SHORT verb phrases, 2-5 words max. E.g. "Qualify Lead", "Conduct Discovery Call", "Prepare Proposal". Do NOT repeat the full stage description. Activity names must be DIFFERENT from capability names — activities are actions performed at a stage, capabilities are enduring abilities.
- VS names: Use EXACTLY the names provided in the inputs. Do not embellish or reword them.
- Outcome names: Short noun phrases derived from stage entry/exit criteria. E.g. "Lead Qualified", "Requirements Understood".

## FSM Chain Rules (CRITICAL — violations fail validation)
Each Value Stream is a single linear activity chain:
1. Each activity has preOutcomeId !== postOutcomeId (no no-ops)
2. activity[i].postOutcomeId === activity[i+1].preOutcomeId (adjacent consistency)
3. nextActivityId chain has no breaks, no cycles — last activity has nextActivityId: null
4. All activities reachable from chain head
5. One Activity per stage. Chain length = number of stages.
6. performedByRoleIds: at least one role per activity

## Registry Population (CRITICAL — empty registries fail validation)
You MUST populate the elements registries for EVERY ID referenced in activities:
- For each unique role ID → create entry in elements.roles with { name, description, elementType: "Role" }
- For each unique capability ID → create entry in elements.capabilities with { name, description, elementType: "Capability" }
- For each unique control ID → create entry in elements.controls with { name, description, elementType: "Control" }
- For each metric → create entry in elements.metrics with { name, elementType: "Metric" }
- For each outcome → create entry in elements.outcomes with { name, elementType: "Outcome" }
- For each information object → create entry in elements.informationObjects with { name, elementType: "InformationObject" }
DO NOT leave any registry as empty when IDs reference it.

## Value Stream Fields (CRITICAL)
Each VS must include: name, description, activityIds, layoutZone (use the zone value from the VS inputs — this is the layer id), accountableStakeholder (from inputs).

## Capability Assignment (CRITICAL — capabilities must be SHARED across activities)
Each activity MUST have 2-4 capabilities in requiresCapabilityIds. Capabilities are enduring business
abilities (e.g. "Customer Relationship Management", "Order Fulfilment", "Data Management") that are
SHARED across multiple activities and value streams. Do NOT create 1:1 capability-to-activity mappings.
Use the provided capabilities as a starting point. If fewer than 2 caps are available per activity,
derive additional shared capabilities from the domain context (e.g. "Data Management", "Compliance Management",
"Stakeholder Communication", "Performance Monitoring").
Capabilities that appear in multiple activities create structural coupling — this is essential for the model.

## capabilityPPIT — People, Process, Information, Technology (CRITICAL)
For EACH capability referenced by an activity, create a PPIT decomposition in the activity's
capabilityPPIT object. This breaks down HOW each capability is exercised at this specific stage.

capabilityPPIT is an object keyed by capability ID. For each capability:
- roleIds: which roles from performedByRoleIds exercise this capability here
- activities: exactly 3 specific sub-activity descriptions (short verb phrases describing what is done)
- informationObjectIds: which information objects this capability uses or produces at this stage
- technologyAppIds: which technology systems support this capability (use tech_ prefixed IDs)

Example:
"capabilityPPIT": {
  "cap_customer_relationship_management": {
    "roleIds": ["role_sales_rep", "role_channel_partner"],
    "activities": ["Review customer history and preferences", "Assess relationship health score", "Plan engagement approach"],
    "informationObjectIds": ["io_customer_profile", "io_territory_plan"],
    "technologyAppIds": ["tech_salesforce"]
  },
  "cap_data_management": {
    "roleIds": ["role_sales_rep"],
    "activities": ["Consolidate data from multiple sources", "Validate data accuracy", "Update central records"],
    "informationObjectIds": ["io_market_data", "io_customer_profile"],
    "technologyAppIds": ["tech_salesforce", "tech_netsuite"]
  }
}

The sub-activities in PPIT should be specific to the stage context — not generic. For a "Territory Planning"
stage, "Data Management" activities might be "Aggregate territory demand signals", "Reconcile forecast data",
"Update territory assignment records". For an "Order Conversion" stage, the same capability's activities
would be "Validate order data completeness", "Reconcile pricing against contracts", "Archive order records".

## Information Objects (CRITICAL)
For each activity, create 2-3 informationObjects (business documents, data records, reports) that the
activity produces or consumes. E.g. "Customer Order", "Installation Record", "Service Schedule",
"Territory Plan", "Sales Report". Put entries in elements.informationObjects with { name, elementType: "InformationObject" }.
Reference them in the activity via informationObjectIds: [...] AND in capabilityPPIT entries.

## Metrics (CRITICAL — wire to activities)
Each activity should reference 0-2 relevant metricIds. Metrics from the discovery inputs MUST appear
in elements.metrics AND be referenced by at least one activity's metricIds array.

## Your Task
Given the confirmed VS definitions, stages, roles, and capabilities below, produce a complete ScaffoldModel.json.

For each VS:
- Create one Outcome per stage boundary (n stages → n+1 outcomes)
- Create one Activity per stage with pre/post outcomes, 2-4 capabilities, 1-2 roles, 2-3 information objects
- For EACH capability on each activity, create a capabilityPPIT entry with roleIds, 3 sub-activities, informationObjectIds, technologyAppIds
- Ensure capabilities are SHARED — the same capability should appear in multiple activities across VS
- Distribute roles across activities sensibly based on stage content
- Wire metrics to the activities they measure

Confirmed inputs:
${JSON.stringify({ valueStreams: vsContext, roles: roleContext, tech: techContext, metrics: metricContext, layoutZones: ir.layoutZones ?? [] }, null, 2)}

Return ONLY valid JSON — the complete ScaffoldModel — no markdown fences:
{
  "schemaVersion": "1.0.0",
  "scaffoldId": "scaffold_<org_name_snake>",
  "name": "<Org Name> — Operating Model",
  "description": "<brief>",
  "createdAt": "<ISO timestamp>",
  "modelIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "layoutZones": ${JSON.stringify(ir.layoutZones ?? [{ id: "ecosystem", label: "Ecosystem (external-facing)", row: 0 }, { id: "knowledge", label: "Knowledge (internal-facing)", row: 1 }])},
  "elements": {
    "valueStreams": { "<vs_id>": { "name": "...", "description": "...", "activityIds": [], "layoutZone": "<zone id from inputs>", "accountableStakeholder": "role_...", "elementType": "ValueStream" } },
    "activities": { "<act_id>": { "name": "...", "preOutcomeId": "...", "postOutcomeId": "...", "nextActivityId": "...|null", "requiresCapabilityIds": ["cap_a", "cap_b", "cap_c"], "performedByRoleIds": ["role_x"], "informationObjectIds": ["io_a", "io_b"], "metricIds": [], "controlIds": [], "capabilityPPIT": { "cap_a": { "roleIds": ["role_x"], "activities": ["sub-act 1", "sub-act 2", "sub-act 3"], "informationObjectIds": ["io_a"], "technologyAppIds": ["tech_x"] } }, "elementType": "Activity" } },
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

CRITICAL: All element maps must be present, even if empty. Every ID referenced in activities MUST have a corresponding registry entry. Every activity MUST have a capabilityPPIT entry for each of its requiresCapabilityIds.`;
}

// ── Repair prompt ────────────────────────────────────────────────────────────

export function buildRepairPrompt(originalPrompt: string, gateErrors: string[]): string {
  return `${originalPrompt}

## REPAIR REQUIRED
The scaffold you produced failed Gate 1 validation with these errors:
${gateErrors.map((e) => `- ${e}`).join("\n")}

Fix the errors and return the corrected complete ScaffoldModel JSON. No markdown fences.`;
}
