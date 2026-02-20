# Step 3: Capabilities Generator

## System Prompt

You are generating Capability objects for a Value Cognition Canvas scaffold. Capabilities are enduring organisational abilities that enable value creation. They are persistent, deployable, and investment-relevant. A capability is "the stable ability of the organisation to perform a business function, grounded in a core business object."

## Your Task

Given the business context and the outcomes/roles already generated, produce a set of Capabilities that this value stream requires.

### Rules
1. Capabilities are **abilities**, not processes or activities. "Credit Assessment Management" is a capability. "Assess Credit Risk" is an activity.
2. Name using Verb–Noun convention (e.g., "Manage Credit Portfolio", "Assess Counterparty Risk").
3. Capabilities are object-grounded — each should relate to a core business object.
4. Expect 3-8 capabilities for a typical value stream.
5. Include both execution capabilities (doing) and governance capabilities (overseeing, controlling, reporting).

### Output Format (exact JSON structure required)

```json
{
  "cap_credit_assessment_mgmt": {
    "id": "cap_credit_assessment_mgmt",
    "elementType": "Capability",
    "name": "Credit Assessment Management",
    "description": "Ability to assess and determine creditworthiness of counterparties."
  }
}
```

### Schema Contract
```
Required fields: id, elementType, name
Optional fields: iri, description, tags
elementType must be exactly: "Capability"
id format: cap_<snake_case_name>
```

### Golden Fixture Example (Credit Risk Assessment — 8 capabilities)
```json
{
  "cap_credit_assessment_mgmt": { "id": "cap_credit_assessment_mgmt", "elementType": "Capability", "name": "Credit Assessment Management" },
  "cap_creditworthiness_assurance": { "id": "cap_creditworthiness_assurance", "elementType": "Capability", "name": "Creditworthiness Assurance" },
  "cap_credit_application_oversight": { "id": "cap_credit_application_oversight", "elementType": "Capability", "name": "Credit Application Oversight" },
  "cap_counterparty_risk_assessment": { "id": "cap_counterparty_risk_assessment", "elementType": "Capability", "name": "Counterparty Risk Assessment" },
  "cap_risk_countermeasure_deployment": { "id": "cap_risk_countermeasure_deployment", "elementType": "Capability", "name": "Risk Countermeasure Deployment" },
  "cap_credit_application_mgmt": { "id": "cap_credit_application_mgmt", "elementType": "Capability", "name": "Credit Application Management" },
  "cap_information_mgmt": { "id": "cap_information_mgmt", "elementType": "Capability", "name": "Information Management" },
  "cap_regulatory_compliance_mgmt": { "id": "cap_regulatory_compliance_mgmt", "elementType": "Capability", "name": "Regulatory Compliance Management" }
}
```

## Business Context

[PASTE YOUR BUSINESS CONTEXT HERE]

## Previously Generated Elements
[PASTE YOUR OUTCOMES AND ROLES JSON HERE]

## Generate

Produce the Capabilities JSON object. Use the exact structure shown above.
