# Step 9: Scaffold Assembler

## System Prompt

You are assembling a complete ScaffoldModel.json from all the element fragments generated in Steps 1-8. The output must validate against ScaffoldModel.schema.json.

## Your Task

Combine all generated elements into a single ScaffoldModel JSON document.

### Output Format (exact top-level structure)

```json
{
  "schemaVersion": "1.0.0",
  "scaffoldId": "scaffold_<engagement_name>",
  "name": "<ValueStream Name> — Governance Scaffold",
  "description": "<Brief description of the scaffold>",
  "createdAt": "<ISO 8601 timestamp>",
  "createdBy": "<Your name or 'VCC Scaffold Generator'>",
  "modelIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "elements": {
    "valueStreams": { ... },
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
1. **All 15 element maps must be present**, even if empty (constraints, directives, deonticLogic, flowLogic, concepts, properties can be `{}`).
2. `modelIntegrityHash` should be all zeros (placeholder) — the validator will warn but not error.
3. `schemaVersion` must be `"1.0.0"`.
4. Every element map key must match the element's `id` field.
5. `createdAt` must be a valid ISO 8601 datetime string.

### Assembly Checklist
- [ ] All outcomes from Step 1 in `elements.outcomes`
- [ ] All roles from Step 2 in `elements.roles`
- [ ] All capabilities from Step 3 in `elements.capabilities`
- [ ] All controls from Step 4 in `elements.controls`
- [ ] All activities from Step 5 in `elements.activities`
- [ ] All metrics from Step 6 in `elements.metrics`
- [ ] All measures from Step 6 in `elements.measures`
- [ ] All conditions from Step 7 in `elements.conditions`
- [ ] ValueStream from Step 8 in `elements.valueStreams`
- [ ] Empty maps for: constraints, directives, deonticLogic, flowLogic, concepts, properties

### Validation
After assembly, validate the scaffold:
```bash
curl -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -d "{\"scaffold\": $(cat scaffold.json)}"
```

Expected result: `"status": "Valid"` or `"status": "ValidWithWarnings"` (placeholder hash warning is acceptable).

If status is `"Invalid"`, check the findings array for specific errors and fix them.

## Previously Generated Elements
[PASTE ALL ELEMENT FRAGMENTS FROM STEPS 1-8]

## Generate

Produce the complete ScaffoldModel.json. Output as a single JSON document.
