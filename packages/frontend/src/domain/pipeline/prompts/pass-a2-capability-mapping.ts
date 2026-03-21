// ─── Pass A2: Role & Capability Extraction ───────────────────────────────────
// Input:  Confirmed VS + stages from Pass A1, plus raw transcript
// Output: Roles, L1/L2/L3/L4 capability taxonomy, stage-to-cap assignments, signals
//
// This pass extracts organisational capabilities in a structured hierarchy
// and maps them to VS stages. Capabilities are enduring organisational
// abilities — NOT activities or tasks.
//
// DECISION LOG:
// - Session 14: Introduced L1→L2→L3 capability taxonomy
// - Session 16: Added shared capability rules
// - Session 17: Extracted to standalone prompt file
// - Session 25: Aligned with BA Capability Mapping Skill — full L1/L2/L3
//   hierarchy with numbering, business object grounding, Execution/Governance
//   type, and explicit stage assignments per VS.
// - Session 26: Extended to L4 Capsicum hierarchy — L1=Business Area,
//   L2=Domain, L3=Capability Group, L4=Capability (operational, maps to stages)

export function buildPass2Prompt(transcript: string, confirmedVS: any[]): string {
  const vsStageRef = confirmedVS.map((vs: any) =>
    `VS: "${vs.name}"\n  Stages: ${(vs.stages ?? []).map((s: any) => `"${typeof s === "string" ? s : s.name}"`).join(", ")}`
  ).join("\n\n");

  return `You are extracting Roles and Capabilities for a business architecture diagnostic.

The following Value Streams and their stages are CONFIRMED. Do not rename, add, or remove them:
${vsStageRef}

## Roles (Step 03)
Identify all roles that participate in these value streams. Roles are responsibility-bearing positions, not people or departments.
- Include both execution roles (doing work) and governing roles (approving, overseeing)
- 4-10 roles total across all value streams
- Names are title-case position names

## Capability Map (Step 04)
Produce a structured L1 → L2 → L3 → L4 capability hierarchy covering the business domain.

### Hierarchy (Capsicum Framework)
- L1 = Business Area: broad accountability domain (5-8 for an enterprise)
- L2 = Domain: logical grouping within an area (3-7 per L1)
- L3 = Capability Group: cluster of related operational capabilities (2-5 per L2)
- L4 = Capability: the operational ability that maps to value stream stages (2-5 per L3)

### Rules
- A Business Capability is the stable ability of the organisation to perform a business function, grounded in a core business object, independent of organisational structure.
- CRITICAL: If the source material contains a capability map, capability register, named capabilities, or column headers that describe organisational abilities — extract those names VERBATIM. Do not rename, generalise, or replace them with generic alternatives. Place verbatim names at the appropriate level (usually L4).
- If no explicit capabilities exist in the source, derive them using Verb-Noun convention (e.g. "Manage Member Credentials", not "Credential Management Execution")
- Every L4 must be grounded in a named business object (the thing it manages)
- L3 Capability Groups should name the cluster (e.g. "Lead Management", "Order Processing")
- Classify each L1 as "Execution" (directly enabling value delivery) or "Governance" (oversight, compliance, risk)
- MECE: siblings must not overlap and must collectively cover the parent's scope
- Number each node positionally: L1=1, L2=1.1, L3=1.1.1, L4=1.1.1.1 — dot-separated integers
- IMPORTANT: L4 Capabilities are SHARED across activities and value streams. The same L4 capability should appear in multiple VS where relevant. Do not create one capability per activity.

## Stage-Capability Assignments
For each VS, map which L4 capabilities participate in each stage.
- Each stage should have 2-5 participating L4 capabilities
- Use the L4 capability names exactly as defined in the map
- Flag any stage with zero capabilities (gap) or any L4 that participates in no stage (unused)

Return ONLY valid JSON, no markdown fences:
{
  "roles": [
    { "id": "role_credit_analyst", "name": "Credit Analyst", "type": "Internal", "description": "Responsible for quantitative credit assessment" }
  ],
  "capabilityMap": {
    "l1Areas": [
      {
        "name": "Customer Management",
        "number": "1",
        "type": "Execution",
        "domains": [
          {
            "name": "Customer Acquisition",
            "number": "1.1",
            "capabilityGroups": [
              {
                "name": "Lead Management",
                "number": "1.1.1",
                "capabilities": [
                  {
                    "name": "Manage Lead Qualification",
                    "number": "1.1.1.1",
                    "businessObject": "Lead",
                    "description": "Ability to assess and qualify inbound leads for sales readiness"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "stageCapabilities": [
    {
      "vsName": "MUST MATCH confirmed VS name exactly",
      "stages": [
        {
          "stageName": "MUST MATCH confirmed stage name exactly",
          "capabilityNames": ["Manage Lead Qualification", "Manage Pipeline Tracking"]
        }
      ]
    }
  ],
  "tech": [
    { "id": 1, "name": "", "type": "CRM|ERP|Comms|Analytics|Custom|Other", "friction": true, "notes": "" }
  ],
  "painPoints": [
    {
      "id": 1,
      "description": "",
      "category": "DataSignalFriction|ProcessHandoffFriction|GovernanceRiskFriction|IncentiveCapacityFriction|TechnologyIntegrationFriction",
      "intensity": 7,
      "affectedVsName": "MUST be one of the confirmed VS names above",
      "affectedStage": "Stage name only",
      "binding": false,
      "confidence": "high|medium|low"
    }
  ],
  "metrics": [
    { "id": 1, "name": "", "current": "", "target": "", "affectedVsName": "confirmed VS name", "stage": "stage name only" }
  ],
  "gaps": [
    { "severity": "required|recommended", "prompt": "Specific question to fill this gap" }
  ]
}

Source material:
${transcript}`;
}
