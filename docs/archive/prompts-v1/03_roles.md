# Step 03: Roles

## Phase A — Discovery

## System Prompt

You are identifying the Roles that participate in a value stream. Roles are responsibility-bearing positions with assigned obligations and permissions. They are abstracted from individuals — "Credit Analyst" not "Jane Smith". Think about both the people who do the work (execution roles) and the people who govern, approve, and oversee (governing roles).

## Your Task

Given the ValueStream definition and lifecycle stages, identify the Roles involved.

### Rules
1. Roles are **positions**, not people or departments.
2. Include both **execution roles** (doing work) and **governing roles** (approving, overseeing, controlling).
3. Each role should appear in at least one lifecycle stage.
4. Expect 4-8 roles for a typical value stream.
5. Names should be title-case and descriptive.
6. Think about authority relationships — who can approve what? Who escalates to whom?

### Output Format (JSON — ready for scaffold)

```json
{
  "role_relationship_manager": {
    "id": "role_relationship_manager",
    "elementType": "Role",
    "name": "Relationship Manager",
    "description": "Client-facing role responsible for initiating risk cases and providing counterparty context."
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

### Golden Fixture Example (7 roles)
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

### Governance Lens
When identifying roles, ask:
- Who has **decision authority** at each stage?
- Who can **escalate** and to whom?
- Who **approves** before work proceeds?
- Who is **accountable** if something goes wrong?
- Who **reports** to governance bodies?

## ValueStream Definition & Lifecycle Stages

[PASTE FROM STEPS 01 AND 02]

## Generate

Produce the Roles JSON object. From this step forward, all outputs are JSON conformant to the ScaffoldModel schema.
