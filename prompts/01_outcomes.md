# Step 1: Outcomes Generator

## System Prompt

You are generating Outcome objects for a Value Cognition Canvas scaffold. Outcomes represent predefined valid states of business objects or records — they are the states in a finite state machine. Each Activity transitions an entity from one Outcome (pre) to another (post).

## Your Task

Given the business context below, generate a set of Outcomes that represent the distinct governance states a record/case/application transitions through in this value stream.

### Rules
1. Outcomes are **states**, not activities. "Approved" is an outcome. "Approving" is an activity.
2. The first outcome is the triggering state (e.g., "Case Initiated", "Application Received").
3. The last outcome is the terminal state (e.g., "Case Closed", "Loan Disbursed").
4. Each outcome must be semantically distinct — no synonyms or overlapping states.
5. Expect 8-15 outcomes for a typical value stream.
6. Names should be semantic and governance-oriented (e.g., "Risk Assessment Complete" not "Step 4 Done").

### Output Format (exact JSON structure required)

```json
{
  "outcome_risk_case_initiated": {
    "id": "outcome_risk_case_initiated",
    "elementType": "Outcome",
    "name": "Risk Case Initiated"
  },
  "outcome_data_profile_compiled": {
    "id": "outcome_data_profile_compiled",
    "elementType": "Outcome",
    "name": "Data Profile Compiled"
  }
}
```

### Schema Contract
```
Required fields: id, elementType, name
Optional fields: iri, description, tags
elementType must be exactly: "Outcome"
id format: outcome_<snake_case_name>
```

### Golden Fixture Example (Credit Risk Assessment — 10 outcomes)
```json
{
  "outcome_risk_case_initiated": { "id": "outcome_risk_case_initiated", "elementType": "Outcome", "name": "Risk Case Initiated" },
  "outcome_data_profile_compiled": { "id": "outcome_data_profile_compiled", "elementType": "Outcome", "name": "Data Profile Compiled" },
  "outcome_pd_estimated": { "id": "outcome_pd_estimated", "elementType": "Outcome", "name": "PD Estimated" },
  "outcome_exposure_profiled": { "id": "outcome_exposure_profiled", "elementType": "Outcome", "name": "Exposure Profiled" },
  "outcome_lgd_rwa_quantified": { "id": "outcome_lgd_rwa_quantified", "elementType": "Outcome", "name": "LGD/RWA Quantified" },
  "outcome_risk_signals_monitored": { "id": "outcome_risk_signals_monitored", "elementType": "Outcome", "name": "Risk Signals Monitored" },
  "outcome_mitigation_approved": { "id": "outcome_mitigation_approved", "elementType": "Outcome", "name": "Mitigation Approved" },
  "outcome_mitigation_executed": { "id": "outcome_mitigation_executed", "elementType": "Outcome", "name": "Mitigation Executed" },
  "outcome_risk_reported": { "id": "outcome_risk_reported", "elementType": "Outcome", "name": "Risk Reported" },
  "outcome_thresholds_recalibrated": { "id": "outcome_thresholds_recalibrated", "elementType": "Outcome", "name": "Thresholds Recalibrated" }
}
```

## Business Context

[PASTE YOUR BUSINESS CONTEXT HERE — value stream description, stages, stakeholders, or any source material]

## Generate

Produce the Outcomes JSON object. Use the exact structure shown above. Every key must match the object's id field. Include a brief description for each outcome if the context supports it.
