# Step 5: Activities Generator

## System Prompt

You are generating Activity objects for a Value Cognition Canvas scaffold. Activities are state-transition operations that move entities between Outcomes. This is a **finite state machine** — every Activity takes an entity from a pre-Outcome state to a post-Outcome state. This is the most critical generation step because Activities encode the FSM semantics that the entire system depends on.

## Your Task

Given the Outcomes, Roles, Capabilities, and Controls already generated, produce a set of Activities that form a single connected chain through the Outcome states.

### CRITICAL CONSTRAINTS (violations will fail validation)

1. **Every Activity must have distinct pre/post outcomes.** `preOutcomeId !== postOutcomeId`. No no-ops.
2. **Activities must form a single chain via nextActivityId.** The first activity has no predecessor. The last activity has `nextActivityId: null`. Every other activity points to exactly one next activity.
3. **All Activities must be reachable.** Starting from the first activity and following nextActivityId, every activity in the chain must be visited.
4. **Adjacent activities must have matching outcomes.** `activity[i].postOutcomeId === activity[i+1].preOutcomeId`. The FSM is continuous — no state gaps.
5. **Every referenced ID must exist.** All roleIds, capabilityIds, controlIds must come from the previously generated elements.

### Output Format (exact JSON structure required)

```json
{
  "act_compile_credit_data_profile": {
    "id": "act_compile_credit_data_profile",
    "elementType": "Activity",
    "name": "Compile Credit Data Profile",
    "performedByRoleIds": ["role_data_steward", "role_relationship_manager", "role_credit_analyst"],
    "preOutcomeId": "outcome_risk_case_initiated",
    "postOutcomeId": "outcome_data_profile_compiled",
    "requiresCapabilityIds": ["cap_creditworthiness_assurance", "cap_information_mgmt"],
    "controlIds": ["ctrl_data_quality_gate"],
    "constraintIds": [],
    "metricIds": [],
    "nextActivityId": "act_estimate_pd",
    "exitConditionIds": []
  }
}
```

### Schema Contract
```
Required fields: id, elementType, name, performedByRoleIds, preOutcomeId, postOutcomeId
Optional fields: iri, description, involvesRoleIds, entryConditionIds, exitConditionIds,
                 flowLogicIds, requiresCapabilityIds, controlIds, constraintIds,
                 metricIds, nextActivityId, tags
elementType must be exactly: "Activity"
id format: act_<snake_case_name>
performedByRoleIds: at least one role required
```

### Chain Visualisation (what a valid chain looks like)

```
[Outcome A] --act_1--> [Outcome B] --act_2--> [Outcome C] --act_3--> [Outcome D]

act_1: pre=A, post=B, next=act_2
act_2: pre=B, post=C, next=act_3
act_3: pre=C, post=D, next=null
```

### Golden Fixture Example (Credit Risk Assessment — 9 activities, 10 outcomes)

```
outcome_risk_case_initiated
  → act_compile_credit_data_profile →
outcome_data_profile_compiled
  → act_estimate_pd →
outcome_pd_estimated
  → act_profile_exposure_concentration →
outcome_exposure_profiled
  → act_estimate_lgd_rwa →
outcome_lgd_rwa_quantified
  → act_monitor_risk_signals →
outcome_risk_signals_monitored
  → act_approve_mitigation_action →
outcome_mitigation_approved
  → act_execute_mitigation_actions →
outcome_mitigation_executed
  → act_produce_risk_reports →
outcome_risk_reported
  → act_review_thresholds_models →
outcome_thresholds_recalibrated
```

### Self-Check (do this before outputting)

Before producing output, verify:
- [ ] Every activity has pre !== post outcome
- [ ] nextActivityId chain has no breaks and no cycles
- [ ] activity[i].postOutcomeId === activity[i+1].preOutcomeId for all adjacent pairs
- [ ] All roleIds, capabilityIds, controlIds reference previously generated elements
- [ ] First activity: preOutcomeId = first outcome in the lifecycle
- [ ] Last activity: nextActivityId = null, postOutcomeId = terminal outcome
- [ ] Number of activities = number of outcomes - 1 (each activity bridges two outcomes)

## Business Context

[PASTE YOUR BUSINESS CONTEXT HERE]

## Previously Generated Elements
[PASTE ALL PREVIOUSLY GENERATED JSON: outcomes, roles, capabilities, controls]

## Generate

Produce the Activities JSON object. Use the exact structure shown above. This is the FSM backbone — get the chain right.
