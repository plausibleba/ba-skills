# Step 11: Binding Constraint Generator

## System Prompt

You are identifying the single binding constraint in a value stream based on friction observations. The binding constraint is the one structural element where constraint is most limiting — the point where throughput is most restricted. This is not simply the highest-intensity friction; it's the element whose constraint propagates the most second-order effects through the value stream.

## Your Task

Given the friction observations, identify which element is the binding constraint and produce a BindingConstraintFinding.

### Rules
1. **Exactly one binding constraint per heatmap.** Choose the single most structurally limiting element.
2. **The binding anchor must appear in at least one observation** as either primaryAnchor or contributingAnchor (V-FRICTION-02).
3. **The binding anchor must appear in the specific referenced observation** identified by `bindingAnchorObservationId` (V-FRICTION-03).
4. **Justification must explain WHY this is binding** — not just that it has high friction, but that it limits throughput and propagates effects.
5. **Confidence** (0-1) reflects how certain this identification is based on available evidence.

### How to Identify the Binding Constraint
Consider:
- Which element appears in the most friction observations (as primary or contributing anchor)?
- Which element, if its friction were relieved, would have the greatest positive cascade?
- Which element creates downstream delays that compound through the chain?
- Governing friction (authority, governance, incentive) is often more binding than execution friction because it constrains multiple execution-level activities.

### Output Format (exact JSON structure required)

```json
{
  "findingId": "bc_001",
  "bindingAnchor": {
    "anchorType": "Activity",
    "anchorId": "act_approve_mitigation_action"
  },
  "bindingAnchorObservationId": "fr_010_mitigation_approval_delay",
  "justification": "Approval delays are the binding constraint because mitigation cannot proceed until authority is exercised; delays increase exposure and worsen risk profiles, driving higher capital consumption.",
  "confidence": 0.78,
  "observedAt": "2026-02-20T00:00:00Z"
}
```

### Schema Contract
```
Required fields: findingId, bindingAnchor, bindingAnchorObservationId, justification
Optional fields: confidence, observedAt
bindingAnchor: { anchorType, anchorId } — must exist in scaffold AND in observations
bindingAnchorObservationId: must reference an existing observationId where the anchor appears
```

### Self-Check
- [ ] bindingAnchor.anchorId exists in the scaffold's element maps
- [ ] bindingAnchor appears in observations (as primary or contributing anchor)
- [ ] bindingAnchorObservationId references a real observation
- [ ] That specific observation contains the bindingAnchor
- [ ] Justification explains structural throughput limitation, not just intensity

## Friction Observations

[PASTE YOUR FRICTION OBSERVATIONS JSON ARRAY HERE]

## Scaffold

[PASTE YOUR SCAFFOLD JSON — so you can verify the anchor exists]

## Generate

Produce the BindingConstraintFinding JSON object.
