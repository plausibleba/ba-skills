# Step 06: Activities

## Phase B — Formalisation

## System Prompt

You are generating Activity objects that form the FSM backbone of a Value Cognition Canvas scaffold. Activities are state-transition operations — each one takes an entity from a pre-Outcome state to a post-Outcome state. This is the most critical generation step. Every Activity corresponds to a lifecycle stage from Step 02, and each one transitions between the Outcomes from Step 05.

**Determinism requirement:** This is a structural pack. Given the same inputs (outcomes, roles, capabilities, stages), you must produce the same output. No creative variation. IDs are derived mechanically from element names. Field population follows fixed rules. Treat this as a pure function.

**Phase 1 limitation: single sequential chain.** This version models a single linear activity chain per value stream. Parallel branches, conditional branches, and loopbacks are not supported. Each activity has exactly one nextActivityId (or null for the terminal activity). This is an intentional simplification — some value streams legitimately require branching. Document this limitation per engagement.

## Your Task

Given the Outcomes, Roles, and Capabilities already generated, produce Activities that form a single connected chain.

### CRITICAL CONSTRAINTS (violations will fail validation)

1. **Every Activity must have distinct pre/post outcomes.** `preOutcomeId !== postOutcomeId`. No no-ops.
2. **Activities must form a single chain via nextActivityId.** First activity has no predecessor. Last has `nextActivityId: null`.
3. **All Activities must be reachable.** Following nextActivityId from the first must visit every activity.
4. **Adjacent activities must have matching outcomes.** `activity[i].postOutcomeId === activity[i+1].preOutcomeId`.
5. **Every referenced ID must exist.** All roleIds, capabilityIds must come from Steps 03-04.
6. **One activity per lifecycle stage.** Each stage maps to exactly one Activity. The chain length equals the number of stages.

### ID Derivation Rules (deterministic, not creative)

Activity IDs are derived from the activity name:
1. Take the activity name (e.g., "Compile Credit Data Profile")
2. Convert to snake_case lowercase (e.g., "compile_credit_data_profile")
3. Prefix with `act_` (e.g., "act_compile_credit_data_profile")

Do NOT:
- Invent short-form IDs (act_01, act_compile)
- Use abbreviations not in the name
- Add qualifiers not derived from the name
- Rename elements between steps

### The Stage → Activity Mapping

Each lifecycle stage becomes exactly one Activity:
```
Stage: "Data Compilation"
  → Activity name: "Compile Credit Data Profile"
  → Activity ID: act_compile_credit_data_profile
    preOutcomeId:  outcome_risk_case_initiated
    postOutcomeId: outcome_data_profile_compiled
    performedByRoleIds: [from Stage's key participants]
    requiresCapabilityIds: [relevant capabilities]
    nextActivityId: <next activity in chain>
```

### Output Format (JSON)

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
    "controlIds": [],
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
id format: act_<snake_case_of_name>
performedByRoleIds: at least one role required
```

### Chain Visualisation

```
[Outcome A] ──act_1──▶ [Outcome B] ──act_2──▶ [Outcome C] ──act_3──▶ [Outcome D]

act_1: pre=A, post=B, next=act_2
act_2: pre=B, post=C, next=act_3
act_3: pre=C, post=D, next=null
```

### Fixed Field Rules
- `controlIds`: empty array `[]` (populated in Step 07)
- `constraintIds`: empty array `[]`
- `metricIds`: empty array `[]` (populated in Step 08)
- `exitConditionIds`: empty array `[]` (populated in Step 09)
- `entryConditionIds`: empty array `[]` (populated in Step 09)
- `requiresCapabilityIds`: populated from stage-capability mapping
- `performedByRoleIds`: populated from stage-participant mapping

### Self-Check (MANDATORY before outputting)

- [ ] Every activity has pre !== post outcome
- [ ] nextActivityId chain: no breaks, no cycles
- [ ] activity[i].postOutcomeId === activity[i+1].preOutcomeId for ALL adjacent pairs
- [ ] All performedByRoleIds reference roles from Step 03
- [ ] All requiresCapabilityIds reference capabilities from Step 04
- [ ] First activity: preOutcomeId = first outcome in lifecycle
- [ ] Last activity: nextActivityId = null, postOutcomeId = terminal outcome
- [ ] Number of activities = number of outcomes - 1
- [ ] All IDs derived mechanically from names (no creative invention)
- [ ] Single linear chain — no branches, no parallel paths

### ⚑ This output triggers the MAJOR VALIDATION GATE

After generating Activities, the validator will enforce:
- V-SCAFFOLD-01: All ID references resolve
- V-SCAFFOLD-02: No no-op transitions
- V-SCAFFOLD-03: No cycles
- V-SCAFFOLD-07: All activities reachable
- V-SCAFFOLD-08: Outcome chain consistency

If validation fails, fix before proceeding to Phase C.

## Previously Generated Elements

[PASTE: Outcomes JSON from Step 05, Roles JSON from Step 03, Capabilities JSON from Step 04]

## Lifecycle Stages (from Step 02)

[PASTE: for reference — each stage maps to one Activity]

## Generate

Produce the Activities JSON object. Include empty arrays for controlIds, constraintIds, metricIds, exitConditionIds — these will be populated in Phase C.
