# VCC Scaffold Generation — Prompt Pack

## Purpose
This prompt pack generates a valid ScaffoldModel.json and FrictionHeatmap.json from unstructured business inputs. Each prompt produces one element type in the exact JSON structure required by the VCC validation engine.

## Generation Sequence (order matters)

```
Step 1: Outcomes        → outcome_*.json fragment
Step 2: Roles           → role_*.json fragment
Step 3: Capabilities    → cap_*.json fragment
Step 4: Controls        → ctrl_*.json fragment
Step 5: Activities      → act_*.json fragment (references Outcomes, Roles, Capabilities, Controls)
Step 6: Metrics         → metric_*.json + measures fragment
Step 7: Conditions      → cond_*.json fragment (optional)
Step 8: ValueStream     → vs_*.json fragment (references Activities, Capabilities, Metrics)
Step 9: Assembler       → ScaffoldModel.json (combines all fragments, validates)
Step 10: Friction       → FrictionObservation[] (references scaffold elements)
Step 11: Binding        → BindingConstraintFinding (references friction observations)
Step 12: Heatmap Assembly → FrictionHeatmap.json (combines friction + binding, validates)
```

## Why This Order
- Activities reference Outcomes, Roles, Capabilities, Controls → those must exist first
- Metrics reference Activities (via targets) → Activities must exist first
- ValueStream references Activities, Capabilities, Metrics → all must exist first
- Friction references scaffold elements → scaffold must be complete first
- Binding references friction observations → friction must exist first

## Input Sources
Each engagement typically draws from:
- Public disclosures (annual reports, investor presentations)
- Operating model descriptions
- Risk statements and governance structures
- Organisational role definitions
- Strategic priorities
- Available performance indicators

## ID Convention
All IDs use snake_case with a type prefix:
- `outcome_` for Outcomes
- `role_` for Roles
- `cap_` for Capabilities
- `ctrl_` for Controls
- `act_` for Activities
- `metric_` for Metrics
- `ms_` for Measures
- `cond_` for Conditions
- `vs_` for ValueStreams

## Validation
After assembly, run the scaffold through the VCC validator:
```bash
curl -X POST http://localhost:3000/v1/validate \
  -H "Content-Type: application/json" \
  -d "{\"scaffold\": $(cat scaffold.json)}"
```
Status must be "Valid" or "ValidWithWarnings" before proceeding to friction generation.

## Tips
- Generate 8-12 activities per ValueStream (enough to show structure, not so many it overwhelms)
- Every activity MUST have distinct pre/post outcomes (no no-ops)
- Chain activities via nextActivityId — every activity reachable from the first
- Adjacent activities must have matching outcomes (activity[i].postOutcomeId === activity[i+1].preOutcomeId)
- Use 10-20 friction observations spanning all 6 categories
- One binding constraint per heatmap
