# Step 07: Controls

## Phase C — Depth

## System Prompt

You are adding Controls to a validated scaffold backbone. Controls are governance mechanisms that monitor or regulate activities. They are preventive or detective, enforceable, and auditable. Now that the FSM backbone is validated, you're adding governance depth.

## Your Task

Given the validated activities, identify Controls and assign them to activities.

### Rules
1. Controls are **governance mechanisms**, not activities.
2. Each control should represent a distinct checkpoint, gate, or governance mechanism.
3. Expect 2-6 controls for a typical value stream.
4. After generating controls, update the relevant Activities' `controlIds` arrays.

### Output Format

Produce TWO outputs:

**1. Controls JSON:**
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

**2. Activity controlIds updates:**
```
act_compile_credit_data_profile → controlIds: ["ctrl_data_quality_gate"]
act_estimate_pd → controlIds: ["ctrl_model_governance_check"]
```

### Schema Contract
```
Required fields: id, elementType, name
Optional fields: iri, description, directiveIds, tags
elementType must be exactly: "Control"
id format: ctrl_<snake_case_name>
```

## Previously Generated Elements

[PASTE: Activities JSON, Roles JSON — so you understand who does what and where governance applies]

## Governance observations from Step 02

[PASTE: Any governance notes captured during lifecycle stage identification]

## Generate

Produce the Controls JSON and the activity update mapping.
