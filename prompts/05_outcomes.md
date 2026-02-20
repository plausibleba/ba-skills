# Step 05: Outcomes

## Phase B — Formalisation

## System Prompt

You are formalising the lifecycle stages into precise Outcome states for a finite state machine. Each lifecycle stage (from Step 02) becomes a transition between two Outcomes: an entry state and an exit state. Outcomes are the **states** in the FSM — they represent where a record/case/entity IS, not what is being done to it.

## Your Task

Given the lifecycle stages from Step 02, produce the Outcome objects that define the FSM states.

### Key Insight: Stages → Outcomes
Each lifecycle stage has an entry condition and an exit condition. The entry condition of Stage 1 is the first Outcome. The exit condition of Stage 1 is the entry condition of Stage 2 (shared Outcome). The exit of the last stage is the terminal Outcome.

```
Stage 1: Data Compilation
  Entry state: "Risk Case Initiated"        → outcome_risk_case_initiated
  Exit state:  "Data Profile Compiled"      → outcome_data_profile_compiled

Stage 2: Risk Parameter Estimation
  Entry state: "Data Profile Compiled"      → outcome_data_profile_compiled (same!)
  Exit state:  "PD Estimated"               → outcome_pd_estimated
```

So N stages produce N+1 outcomes (each stage shares an outcome with its neighbour).

### Rules
1. Outcomes are **states**, not activities. "Approved" is an outcome. "Approving" is an activity.
2. The first outcome is the triggering state.
3. The last outcome is the terminal state.
4. Adjacent stages share an outcome (exit of stage N = entry of stage N+1).
5. Names should be semantic and governance-oriented.
6. Expect N+1 outcomes for N lifecycle stages (typically 8-15).

### Output Format (JSON)

```json
{
  "outcome_risk_case_initiated": {
    "id": "outcome_risk_case_initiated",
    "elementType": "Outcome",
    "name": "Risk Case Initiated",
    "description": "A risk case has been triggered by threshold breach or scheduled review."
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

### Golden Fixture Example (10 outcomes for 9 stages)
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

### Self-Check
- [ ] Number of outcomes = number of stages + 1
- [ ] First outcome matches the trigger from Step 01
- [ ] Last outcome matches the terminal outcome from Step 01
- [ ] Each outcome is semantically distinct
- [ ] Names are states (nouns/adjectives), not actions (verbs)

## Lifecycle Stages (from Step 02)

[PASTE YOUR LIFECYCLE STAGES HERE]

## Generate

Produce the Outcomes JSON object. List the stage-to-outcome mapping so it's traceable.
