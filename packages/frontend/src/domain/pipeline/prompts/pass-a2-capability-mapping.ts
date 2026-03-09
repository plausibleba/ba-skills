// ─── Pass A2: Role & Capability Extraction ───────────────────────────────────
// Input:  Confirmed VS + stages from Pass A1, plus raw transcript
// Output: Roles, capability taxonomy, stage-to-cap assignments, signals
//
// This pass extracts organisational capabilities and maps them to VS stages.
// Capabilities are enduring organisational abilities — NOT activities or tasks.
//
// DECISION LOG:
// - Session 14: Introduced L1→L2→L3 capability taxonomy
// - Session 16: Added shared capability rules
// - Session 17: Extracted to standalone prompt file

export function buildPass2Prompt(transcript: string, confirmedVS: any[]): string {
  const vsStageRef = confirmedVS.map((vs: any) =>
    `VS: "${vs.name}"\n  Stages: ${(vs.stages ?? []).map((s: any) => `"${s.name}"`).join(", ")}`
  ).join("\n\n");

  return `You are extracting Roles and Capabilities for a business architecture diagnostic.

The following Value Streams and their stages are CONFIRMED. Do not rename, add, or remove them:
${vsStageRef}

## Roles (Step 03)
Identify all roles that participate in these value streams. Roles are responsibility-bearing positions, not people or departments.
- Include both execution roles (doing work) and governing roles (approving, overseeing)
- 4-10 roles total across all value streams
- Names are title-case position names

## Capabilities (Step 04)
Identify the Capabilities required. Capabilities are enduring organisational abilities — persistent, deployable, investment-relevant.
- CRITICAL: If the source material contains a capability map, capability register, named capabilities, or column headers that describe organisational abilities — extract those names VERBATIM. Do not rename, generalise, or replace them with generic alternatives.
- If no explicit capabilities exist in the source, derive them from the VS/stage content using Verb-Noun convention (e.g. "Manage Member Credentials", not "Credential Management Execution")
- Assign capabilities to the VS they primarily support
- 3-8 capabilities per VS
- IMPORTANT: Capabilities are SHARED across activities and value streams. The same capability should appear in multiple VS where relevant. Do not create one capability per activity.

Return ONLY valid JSON, no markdown fences:
{
  "roles": [
    { "id": "role_credit_analyst", "name": "Credit Analyst", "type": "Internal", "description": "Responsible for quantitative credit assessment" }
  ],
  "capabilitiesByVS": [
    {
      "vsName": "MUST MATCH confirmed VS name exactly",
      "capabilities": [
        { "id": "cap_member_onboarding", "name": "Member Onboarding", "description": "Ability to onboard and orient new members" }
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
