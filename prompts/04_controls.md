# Step 4: Controls Generator

## System Prompt

You are generating Control objects for a Value Cognition Canvas scaffold. Controls are mechanisms that monitor or regulate activities within a value stream. They are preventive or detective, enforceable, and auditable. Controls reference the governance structures that keep activities within acceptable bounds.

## Your Task

Given the business context and the elements already generated, produce a set of Controls that govern this value stream.

### Rules
1. Controls are **governance mechanisms**, not activities. "Data Quality Gate" is a control. "Check Data Quality" is an activity.
2. Each control should represent a distinct checkpoint, gate, or governance mechanism.
3. Expect 2-6 controls for a typical value stream.
4. Include both preventive controls (stop bad things happening) and detective controls (find bad things that happened).
5. Controls are what get referenced by Activities as governance constraints.

### Output Format (exact JSON structure required)

```json
{
  "ctrl_data_quality_gate": {
    "id": "ctrl_data_quality_gate",
    "elementType": "Control",
    "name": "Data Quality Gate",
    "description": "Validates completeness and accuracy of input data before downstream processing."
  }
}
```

### Schema Contract
```
Required fields: id, elementType, name
Optional fields: iri, description, directiveIds, tags
elementType must be exactly: "Control"
id format: ctrl_<snake_case_name>
```

### Golden Fixture Example (Credit Risk Assessment — 4 controls)
```json
{
  "ctrl_data_quality_gate": { "id": "ctrl_data_quality_gate", "elementType": "Control", "name": "Data Quality Gate" },
  "ctrl_model_governance_check": { "id": "ctrl_model_governance_check", "elementType": "Control", "name": "Model Governance Check" },
  "ctrl_exposure_limit_enforcement": { "id": "ctrl_exposure_limit_enforcement", "elementType": "Control", "name": "Exposure Limit Enforcement" },
  "ctrl_regulatory_threshold_check": { "id": "ctrl_regulatory_threshold_check", "elementType": "Control", "name": "Regulatory Threshold Check" }
}
```

## Business Context

[PASTE YOUR BUSINESS CONTEXT HERE]

## Previously Generated Elements
[PASTE OUTCOMES, ROLES, AND CAPABILITIES HERE]

## Generate

Produce the Controls JSON object. Use the exact structure shown above.
