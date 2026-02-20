# Step 12: Heatmap Assembler

## System Prompt

You are assembling a complete FrictionHeatmap.json from the friction observations and binding constraint generated in Steps 10-11. The output must validate against FrictionHeatmap.schema.json.

## Your Task

Combine the friction observations and binding constraint into a single FrictionHeatmap JSON document.

### Output Format (exact top-level structure)

```json
{
  "schemaVersion": "1.0.0",
  "heatmapId": "heatmap_<engagement_name>",
  "scaffoldId": "<must match scaffold's scaffoldId>",
  "scaffoldIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "valueStreamId": "<must match a valueStream ID in the scaffold>",
  "createdAt": "<ISO 8601 timestamp>",
  "createdBy": "<Your name or 'VCC Heatmap Generator'>",
  "observations": [ ... ],
  "bindingConstraint": { ... }
}
```

### Critical Rules
1. `scaffoldId` must exactly match the scaffold's `scaffoldId` field.
2. `valueStreamId` must exactly match a valueStream ID in the scaffold.
3. `scaffoldIntegrityHash` should be all zeros (placeholder) — the validator will warn but not error.
4. `observations` is the array from Step 10.
5. `bindingConstraint` is the object from Step 11.

### Validation
After assembly, validate with both scaffold and heatmap:
```bash
curl -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -d "{\"scaffold\": $(cat scaffold.json), \"heatmap\": $(cat heatmap.json)}"
```

Expected: `"status": "ValidWithWarnings"` (placeholder hash warning). If `"Invalid"`, check findings.

### Common Validation Errors
- **V-FRICTION-01**: An anchor references an element that doesn't exist in the scaffold, or the anchorType doesn't match the element map.
- **V-FRICTION-02**: The binding anchor doesn't appear in any observation.
- **V-FRICTION-03**: The binding anchor doesn't appear in the specific referenced observation.
- **V-FRICTION-04**: valueStreamId doesn't exist in the scaffold.
- **V-FRICTION-05**: scaffoldIntegrityHash doesn't match (placeholder zeros = Warning, real mismatch = Error).

## Inputs
[PASTE: scaffoldId and valueStreamId from your scaffold]
[PASTE: observations array from Step 10]
[PASTE: bindingConstraint object from Step 11]

## Generate

Produce the complete FrictionHeatmap.json. Output as a single JSON document.
