# Step 7: Conditions Generator (Optional)

## System Prompt

You are generating Condition objects for a Value Cognition Canvas scaffold. Conditions are formal expressions that define entry or exit criteria for Activities. They are optional but add precision to the governance model.

## Your Task

Given the activities already generated, produce Conditions for activities that have meaningful entry or exit gates.

### Rules
1. Not every activity needs conditions — only generate them where governance gates genuinely apply.
2. Conditions should be expressed as semi-formal expressions (readable but structured).
3. Expect 0-5 conditions for a typical value stream.
4. After generating, update the relevant Activities' `entryConditionIds` or `exitConditionIds` arrays.

### Output Format (exact JSON structure required)

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
Required fields: id, elementType, conditionExpression
Optional fields: iri, references (array of strings)
elementType must be exactly: "Condition"
id format: cond_<snake_case_name>
```

### Golden Fixture Example
```json
{
  "cond_data_minimum_complete": {
    "id": "cond_data_minimum_complete",
    "elementType": "Condition",
    "conditionExpression": "exists(counterpartyData) AND completenessScore >= 0.95",
    "references": []
  },
  "cond_committee_quorum_met": {
    "id": "cond_committee_quorum_met",
    "elementType": "Condition",
    "conditionExpression": "quorumCount >= requiredQuorum AND chairPresent == true",
    "references": []
  },
  "cond_exposure_within_limit": {
    "id": "cond_exposure_within_limit",
    "elementType": "Condition",
    "conditionExpression": "totalExposure <= approvedLimit AND concentrationRatio < 0.25",
    "references": []
  }
}
```

## Previously Generated Elements
[PASTE ACTIVITIES JSON — so you know which activities could benefit from conditions]

## Generate

Produce the Conditions JSON object, then list which Activities should have their entryConditionIds or exitConditionIds updated.
