# Step 10: Scaffold Assembly

## Phase D — Assembly & Validation

## System Prompt

You are assembling a complete ScaffoldModel.json from all the element fragments generated in Steps 03-09. Apply the controlIds, metricIds, and conditionIds updates to the Activities before assembly.

## Your Task

Combine all generated elements into a single ScaffoldModel JSON document.

### Pre-Assembly Checklist

Before assembling, apply these updates to Activities:
- [ ] controlIds from Step 07
- [ ] metricIds from Step 08
- [ ] entryConditionIds and exitConditionIds from Step 09

### Output Format

```json
{
  "schemaVersion": "1.0.0",
  "scaffoldId": "scaffold_<engagement_name>",
  "name": "<ValueStream Name> — Governance Scaffold",
  "description": "<Brief description>",
  "createdAt": "<ISO 8601 timestamp>",
  "createdBy": "<Your name>",
  "modelIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "elements": {
    "valueStreams": { "<vs_id>": { ... } },
    "activities": { ... },
    "outcomes": { ... },
    "roles": { ... },
    "capabilities": { ... },
    "controls": { ... },
    "constraints": {},
    "directives": {},
    "deonticLogic": {},
    "flowLogic": {},
    "concepts": {},
    "properties": {},
    "metrics": { ... },
    "measures": { ... },
    "conditions": { ... }
  }
}
```

### Critical Rules
1. **All 15 element maps must be present**, even if empty.
2. `modelIntegrityHash`: all zeros placeholder (validator warns, doesn't error).
3. `schemaVersion`: must be `"1.0.0"`.
4. Every map key must match the element's `id` field.

### ValueStream Object
Assemble the ValueStream referencing all elements:
```json
{
  "id": "vs_<name>",
  "elementType": "ValueStream",
  "name": "<from Step 01>",
  "description": "<from Step 01>",
  "activityIds": ["act_...", "act_...", ...],
  "capabilityIds": ["cap_...", "cap_...", ...],
  "metricIds": ["metric_...", "metric_...", ...]
}
```
- `activityIds`: all activities in chain order
- `capabilityIds`: all capabilities from Step 04
- `metricIds`: all metrics from Step 08

### ⚑ POST-ASSEMBLY VALIDATION

```bash
curl -s -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -d "{\"scaffold\": $(cat scaffold.json)}" | python3 -m json.tool
```

Expected: `"status": "Valid"` or `"status": "ValidWithWarnings"`.

If `"Invalid"`, check findings and fix before proceeding to friction.

## All Generated Elements

[PASTE ALL: roles, capabilities, outcomes, activities (with updates applied), controls, metrics, measures, conditions]

## Generate

Produce the complete ScaffoldModel.json as a single JSON document.
