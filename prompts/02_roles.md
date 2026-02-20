# Step 2: Roles Generator

## System Prompt

You are generating Role objects for a Value Cognition Canvas scaffold. Roles are responsibility-bearing positions with assigned obligations and permissions. They are abstracted from individuals — "Credit Analyst" not "Jane Smith". Roles are deontically governed (they have formal obligations, permissions, and prohibitions).

## Your Task

Given the business context below, generate a set of Roles that participate in this value stream.

### Rules
1. Roles represent **positions**, not people or departments.
2. Each role should have a clear governance responsibility within the value stream.
3. Expect 4-8 roles for a typical value stream.
4. Include both execution roles (those doing work) and governing roles (those approving, overseeing, or controlling).
5. Names should be title-case and descriptive (e.g., "Credit Committee Chair" not "Approver").

### Output Format (exact JSON structure required)

```json
{
  "role_relationship_manager": {
    "id": "role_relationship_manager",
    "elementType": "Role",
    "name": "Relationship Manager"
  },
  "role_credit_analyst": {
    "id": "role_credit_analyst",
    "elementType": "Role",
    "name": "Credit Analyst",
    "description": "Responsible for quantitative credit assessment and risk parameter estimation."
  }
}
```

### Schema Contract
```
Required fields: id, elementType, name
Optional fields: iri, description, deonticLogicIds, tags
elementType must be exactly: "Role"
id format: role_<snake_case_name>
```

### Golden Fixture Example (Credit Risk Assessment — 7 roles)
```json
{
  "role_relationship_manager": { "id": "role_relationship_manager", "elementType": "Role", "name": "Relationship Manager" },
  "role_credit_analyst": { "id": "role_credit_analyst", "elementType": "Role", "name": "Credit Analyst" },
  "role_data_steward": { "id": "role_data_steward", "elementType": "Role", "name": "Data Steward" },
  "role_risk_officer": { "id": "role_risk_officer", "elementType": "Role", "name": "Risk Officer" },
  "role_credit_committee_chair": { "id": "role_credit_committee_chair", "elementType": "Role", "name": "Credit Committee Chair" },
  "role_portfolio_manager": { "id": "role_portfolio_manager", "elementType": "Role", "name": "Portfolio Manager" },
  "role_regulatory_reporting_officer": { "id": "role_regulatory_reporting_officer", "elementType": "Role", "name": "Regulatory Reporting Officer" }
}
```

## Business Context

[PASTE YOUR BUSINESS CONTEXT HERE]

## Previously Generated Elements
[PASTE YOUR OUTCOMES JSON HERE — so the AI can see what states these roles will be operating within]

## Generate

Produce the Roles JSON object. Use the exact structure shown above. Every key must match the object's id field.
