# Quick Validation Guide

## Using the API (if server is running)

### Validate scaffold only:
```bash
curl -s -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -d "{\"scaffold\": $(cat scaffold.json)}" | python3 -m json.tool
```

### Validate scaffold + heatmap:
```bash
curl -s -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -d "{\"scaffold\": $(cat scaffold.json), \"heatmap\": $(cat heatmap.json)}" | python3 -m json.tool
```

### Generate canvas and view:
```bash
# Start backend
cd ~/projects/vcc/packages/backend && npx tsx src/server.ts &

# Start frontend
cd ~/projects/vcc/packages/frontend && npx vite &

# Open browser to http://localhost:5173
# Drag scaffold.json into the canvas
# Click "Load Heatmap" and select heatmap.json
```

## Reading Validation Results

### Status Values
- **Valid** — Zero errors, zero warnings. Ready to render.
- **ValidWithWarnings** — Zero errors but has warnings (e.g., placeholder hash, orphan metrics). Safe to render.
- **Invalid** — Has errors. Fix before rendering.

### Common Findings
| Code | Rule | Meaning |
|------|------|---------|
| UNRESOLVED_REF | V-SCAFFOLD-01 | An ID references something that doesn't exist |
| NOOP_TRANSITION | V-SCAFFOLD-02 | Activity pre and post outcome are the same |
| CYCLE_DETECTED | V-SCAFFOLD-03 | nextActivityId chain has a loop |
| EMPTY_ACTIVITY_IDS | V-SCAFFOLD-04 | ValueStream has no activities |
| ORPHAN_METRIC | V-SCAFFOLD-06 | Metric not referenced by any activity or VS |
| UNREACHABLE_ACTIVITY | V-SCAFFOLD-07 | Activity not reachable via nextActivityId chain |
| OUTCOME_MISMATCH | V-SCAFFOLD-08 | Adjacent activities have mismatched outcomes |
| MISSING_MEASURE_TIMESTAMP | V-MEASURE-01 | Current measure missing measureAsOf |
| VALUE_TYPE_MISMATCH | V-MEASURE-02 | measureValue doesn't match measureDataType |
| ANCHOR_NOT_FOUND | V-FRICTION-01 | Anchor references non-existent scaffold element |
| BINDING_NOT_IN_OBSERVATIONS | V-FRICTION-02 | Binding anchor not in any observation |
| BINDING_NOT_IN_OBSERVATION | V-FRICTION-03 | Binding anchor not in referenced observation |
| VS_NOT_FOUND | V-FRICTION-04 | Heatmap valueStreamId not in scaffold |
| HASH_MISMATCH / HASH_PLACEHOLDER | V-FRICTION-05 | Scaffold integrity hash issue |
