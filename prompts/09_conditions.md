# Step 09: Conditions (Optional)

## Phase C — Depth

## System Prompt

You are adding Conditions to a scaffold — formal expressions that define entry or exit criteria for Activities. Conditions are optional but add governance precision.

## Your Task

Given the activities, produce Conditions for activities that have meaningful governance gates.

### Rules
1. Not every activity needs conditions — only where governance gates genuinely apply.
2. Express as semi-formal expressions (readable but structured).
3. Expect 0-5 conditions for a typical value stream.
4. After generating, specify which Activities' entryConditionIds or exitConditionIds to update.

### Output Format (JSON)

```json
{
  "cond_data_minimum_complete": {
    "id": "cond_data_minimum_complete",
    "elementType": "Condition",
    "conditionExpression": "exists(counterpartyData) AND completenessScore >= 0.95",
    "references": []
  }
}
```

### Schema Contract
```
Required: id, elementType, conditionExpression
Optional: iri, references (array of strings)
elementType: "Condition" | id format: cond_<snake_case_name>
```

### Also produce: Activity condition updates
```
act_compile_credit_data_profile → exitConditionIds: ["cond_data_minimum_complete"]
act_approve_mitigation_action → entryConditionIds: ["cond_committee_quorum_met"]
```

## Previously Generated Elements

[PASTE: Activities JSON]

## Generate

Produce the Conditions JSON and activity update mapping. If no conditions are needed, output an empty object `{}` and skip updates.
