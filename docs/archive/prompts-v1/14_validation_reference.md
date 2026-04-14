# Validation Quick Reference

## Using the API

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

### Render in canvas:
```bash
cd ~/projects/vcc/packages/backend && npx tsx src/server.ts &
cd ~/projects/vcc/packages/frontend && npx vite &
# Open http://localhost:5173, drag scaffold.json, then load heatmap
```

## Status Values
- **Valid** — Zero errors, zero warnings. Ready to render.
- **ValidWithWarnings** — Zero errors, has warnings. Safe to render.
- **Invalid** — Has errors. Fix before proceeding.

## Error Code Reference

| Code | Rule | Severity | Meaning |
|------|------|----------|---------|
| UNRESOLVED_REF | V-SCAFFOLD-01 | Error | ID references non-existent element |
| NOOP_TRANSITION | V-SCAFFOLD-02 | Error | pre and post outcome identical |
| CYCLE_DETECTED | V-SCAFFOLD-03 | Error | nextActivityId chain has a loop |
| EMPTY_ACTIVITY_IDS | V-SCAFFOLD-04 | Error | ValueStream has no activities |
| ORPHAN_METRIC | V-SCAFFOLD-06 | Warning | Metric unreferenced |
| UNREACHABLE_ACTIVITY | V-SCAFFOLD-07 | Error | Activity not in nextActivityId chain |
| OUTCOME_MISMATCH | V-SCAFFOLD-08 | Error | Adjacent activities have mismatched outcomes |
| MISSING_MEASURE_TIMESTAMP | V-MEASURE-01 | Warning | Current measure missing measureAsOf |
| VALUE_TYPE_MISMATCH | V-MEASURE-02 | Warning | measureValue doesn't match measureDataType |
| ANCHOR_NOT_FOUND | V-FRICTION-01 | Error | Anchor references non-existent element |
| BINDING_NOT_IN_OBSERVATIONS | V-FRICTION-02 | Error | Binding anchor not in any observation |
| BINDING_NOT_IN_OBSERVATION | V-FRICTION-03 | Error | Binding anchor not in referenced observation |
| VS_NOT_FOUND | V-FRICTION-04 | Error | valueStreamId not in scaffold |
| HASH_MISMATCH | V-FRICTION-05 | Error | Integrity hash doesn't match |
| HASH_PLACEHOLDER | V-FRICTION-05 | Warning | Placeholder hash (all zeros) |
