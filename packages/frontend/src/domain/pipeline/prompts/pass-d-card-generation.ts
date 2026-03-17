/**
 * Pass D — Concept Card & Policy Card Generation
 *
 * Takes a formalised scaffold and generates:
 *  - Concept Cards from information objects, record classes, and key business entities
 *  - Policy Cards from governance capabilities and controls
 *
 * Cards are anchored to scaffold elements so the MVC compiler can load
 * the right cards into an agent's context window at each activity step.
 */

import type { ScaffoldData } from "../../../types.ts";

/**
 * Build the prompt for Pass D card generation.
 * Input is the formalised scaffold JSON (after Pass B).
 */
export function buildCardGenerationPrompt(scaffold: ScaffoldData): string {
  const el = scaffold.elements;

  // Extract key scaffold elements for context
  const capabilities = Object.values(el.capabilities ?? {}).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const roles = Object.values(el.roles ?? {}).map((r) => ({
    id: r.id,
    name: r.name,
  }));

  const controls = Object.values(el.controls ?? {}).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const activities = Object.values(el.activities ?? {}).map((a: any) => ({
    id: a.id,
    name: a.name,
    requiresCapabilityIds: a.requiresCapabilityIds ?? a.enabledByCapabilityIds ?? [],
    performedByRoleIds: a.performedByRoleIds ?? [],
    controlIds: a.controlIds ?? [],
  }));

  const informationObjects = Object.values(el.applicationFunctions ?? {}).map((io: any) => ({
    id: io.id,
    name: io.prefLabel ?? io.name,
  }));

  const recordClasses = Object.values(el.recordClasses ?? {}).map((rc: any) => ({
    id: rc.id,
    name: rc.prefLabel ?? rc.name,
    description: rc.description ?? "",
  }));

  const valueStreams = Object.values(el.valueStreams ?? {}).map((vs: any) => ({
    id: vs.id,
    name: vs.name,
    activityIds: vs.activityIds ?? [],
  }));

  return `You are a business architecture assistant specialising in MVC (Minimum Viable Context) card generation for agentic workflows.

Given the scaffold below, generate a CardRegistry JSON containing:

1. **Concept Cards** — one for each significant business entity (record class, information object, or implicit domain concept). Each concept card captures:
   - Multiple **senses** (different interpretations of the same term across the business)
   - **Relationships** to other concept cards
   - **Anchors** to scaffold elements (capabilities, roles, activities) where this concept is relevant

2. **Policy Cards** — one for each governance rule, compliance requirement, or decision boundary implied by the scaffold's controls and governance capabilities. Each policy card captures:
   - **Authority tier** (policy/procedure/guidance/workaround)
   - **Conditions** that trigger the policy
   - **Outcomes** with obligation types (permit/obligate/prohibit)
   - **Scope** (which activities, roles, channels it applies to)
   - **Anchors** to scaffold elements

## Scaffold Context

### Capabilities (${capabilities.length})
${JSON.stringify(capabilities, null, 2)}

### Roles (${roles.length})
${JSON.stringify(roles, null, 2)}

### Activities (${activities.length})
${JSON.stringify(activities, null, 2)}

### Controls (${controls.length})
${JSON.stringify(controls, null, 2)}

### Information Objects (${informationObjects.length})
${JSON.stringify(informationObjects, null, 2)}

### Record Classes (${recordClasses.length})
${JSON.stringify(recordClasses, null, 2)}

### Value Streams (${valueStreams.length})
${JSON.stringify(valueStreams, null, 2)}

## Card Generation Rules

### Concept Cards
- Generate **one concept card per significant business entity** (record classes, key information objects, and any implicit entities referenced by capabilities)
- Each card ID: \`cc_<snake_case_name>\`
- **senses**: At minimum 1 sense, typically 2-3 (e.g. "Prospect" might have senses "CRM Lead", "Marketing Qualified Lead", "Inbound Enquiry")
- **relationships**: Use types: "has-a", "is-a", "part-of", "consumes", "produces", "governs", "relates-to"
- **anchors**: Include capabilityIds and roleIds where this concept is actively used. Use activityIds ONLY for very specific concepts that only apply to one or two activities.
- **tokenBudget**: Estimate based on complexity: 200-500 tokens. Simple entities ~200, complex multi-sense entities ~400-500.
- **owner**: Derive from the most relevant role
- **provenance**: "Generated from VCC scaffold"
- Do NOT generate concept cards for generic infrastructure concepts (e.g. "Database", "API"). Focus on **domain-specific business entities**.

### Policy Cards
- Generate **one policy card per governance rule** implied by controls and governance capabilities
- Each card ID: \`pc_<snake_case_name>\`
- **authorityTier**: "policy" for strategic mandates, "procedure" for operational requirements, "guidance" for recommendations
- **scope.lifecycleStages**: Activity IDs where this policy applies
- **scope.roles**: Role IDs bound by this policy
- **conditions**: Express as boolean expressions referencing concept card senses where applicable (format: "cc_cardId:SenseName")
- **outcomes**: At least 1 obligation per policy. Use "obligate" for requirements, "prohibit" for restrictions, "permit" for explicit permissions
- **anchors**: Include controlIds, capabilityIds, and roleIds
- **ownership**: Derive from governance roles
- **provenance**: "Generated from VCC scaffold"
- Generate 3-8 policy cards. Focus on policies implied by controls and governance capabilities.
- If there are no controls or governance capabilities, generate 1-2 generic data governance / compliance policies.

### Quality Rules
- Every concept card must anchor to at least 2 capabilities
- Every policy card must have at least 1 condition and 1 outcome
- All referenced IDs (capabilities, roles, activities, controls) MUST exist in the scaffold context above
- Cross-reference concept cards in policy conditions where applicable
- Token budgets should total 3000-6000 tokens across all concept cards

## Output Format

Return ONLY valid JSON matching this schema:

\`\`\`json
{
  "conceptCards": {
    "cc_example": {
      "cardId": "cc_example",
      "canonicalName": "Example",
      "description": "...",
      "owner": "role_xxx",
      "senses": [
        {
          "senseName": "Sense A",
          "description": "...",
          "systemOfRecord": "System Name",
          "disambiguationCues": ["keyword1", "keyword2"]
        }
      ],
      "relationships": [
        { "type": "has-a", "targetCardId": "cc_other", "label": "..." }
      ],
      "anchors": {
        "capabilityIds": ["cap_xxx"],
        "roleIds": ["role_xxx"]
      },
      "provenance": "Generated from VCC scaffold",
      "dataAcquisitionPlan": "Query system X for ...",
      "tokenBudget": 300
    }
  },
  "policyCards": {
    "pc_example": {
      "cardId": "pc_example",
      "name": "Example Policy",
      "description": "...",
      "authorityTier": "procedure",
      "scope": {
        "lifecycleStages": ["act_xxx"],
        "roles": ["role_xxx"]
      },
      "conditions": [
        { "expression": "cc_example:Sense A is active", "referencedSenses": ["cc_example:Sense A"] }
      ],
      "outcomes": [
        { "obligationType": "obligate", "description": "Must verify X before proceeding" }
      ],
      "exceptions": [],
      "provenance": "Generated from VCC scaffold",
      "ownership": "role_xxx",
      "actionBindings": [],
      "anchors": {
        "capabilityIds": ["cap_xxx"],
        "controlIds": ["ctrl_xxx"],
        "roleIds": ["role_xxx"]
      }
    }
  }
}
\`\`\`

Generate the card registry now. Return ONLY the JSON — no explanations, no markdown fences.`;
}
