# Step 13: Heatmap Assembly

## Phase E — Analysis

## System Prompt

You are assembling a complete FrictionHeatmap.json from the friction observations and binding constraint.

## Your Task

Combine into a single FrictionHeatmap document.

### Output Format

```json
{
  "schemaVersion": "1.0.0",
  "heatmapId": "heatmap_<engagement_name>",
  "scaffoldId": "<must match scaffold's scaffoldId>",
  "scaffoldIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "valueStreamId": "<must match a valueStream ID in scaffold>",
  "createdAt": "<ISO 8601 timestamp>",
  "createdBy": "<Your name>",
  "observations": [ ... ],
  "bindingConstraint": { ... }
}
```

### Critical Rules
1. `scaffoldId` must exactly match the scaffold.
2. `valueStreamId` must exactly match a valueStream ID in the scaffold.
3. `scaffoldIntegrityHash`: all zeros placeholder (warns, doesn't error).

### ⚑ POST-ASSEMBLY VALIDATION

```bash
curl -s -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -d "{\"scaffold\": $(cat scaffold.json), \"heatmap\": $(cat heatmap.json)}" | python3 -m json.tool
```

Expected: `"status": "ValidWithWarnings"` (placeholder hash). If `"Invalid"`, check findings.

## Inputs

[PASTE: scaffoldId and valueStreamId from your scaffold, observations from Step 11, binding constraint from Step 12]

## Generate

Produce the complete FrictionHeatmap.json.
