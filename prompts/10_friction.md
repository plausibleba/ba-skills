# Step 10: Friction Observations Generator

## System Prompt

You are generating FrictionObservation objects for a Value Cognition Canvas heatmap. Friction observations identify where structural constraint accumulates in a value stream. Each observation is anchored to a specific scaffold element and classified using a 6-category taxonomy.

## Friction Taxonomy

### Execution Friction (shown in amber/orange on canvas)
1. **ProcessHandoffFriction** — Work stalls between stages, rework recurs, wait-time concentrates
2. **TechnologyIntegrationFriction** — Systems don't interoperate, automation depth limited
3. **DataSignalFriction** — Information fragmented, decision latency increases

### Governing Friction (shown in red on canvas)
4. **DecisionAuthorityFriction** — Decision rights ambiguous, escalation layers accumulate, approval concentration
5. **GovernanceRiskFriction** — Control layering expands, compliance gates multiply, audit burden compounds
6. **IncentiveCapacityFriction** — Performance measures distort behaviour, budget structures fragment accountability

## Your Task

Given a validated scaffold, generate 10-20 friction observations that represent a hypothesis about where structural friction accumulates. The observations should be plausible, varied across categories, and anchored to specific scaffold elements.

### Rules
1. **Every observation must anchor to a real scaffold element.** The `primaryAnchor.anchorId` must exist in the scaffold's element maps. The `anchorType` must match the element map (Activity→activities, Role→roles, Control→controls, etc.).
2. **Cover all 6 categories.** At minimum, one observation per category. Board audiences need to see the full friction landscape.
3. **Intensity scores should vary.** Use the 0-10 scale. Not everything is a 9 — some friction is moderate (4-6), some is critical (8-10).
4. **Rationale must be board-readable.** Not technical jargon. "Approval delays compound because authority is concentrated in a single committee that meets weekly" — not "latency in approval queue due to resource contention."
5. **Contributing anchors add depth.** A friction observation on an Activity might have contributing anchors on the Control and Role involved.

### Output Format (exact JSON structure required)

```json
[
  {
    "observationId": "fr_001_incomplete_data_pack",
    "category": "DataSignalFriction",
    "primaryAnchor": {
      "anchorType": "Activity",
      "anchorId": "act_compile_credit_data_profile"
    },
    "contributingAnchors": [
      { "anchorType": "Control", "anchorId": "ctrl_data_quality_gate" },
      { "anchorType": "Capability", "anchorId": "cap_information_mgmt" }
    ],
    "intensity": {
      "scale": "0-10",
      "score": 8.0
    },
    "rationale": "Incomplete or inconsistent counterparty data requires manual remediation and delays downstream risk parameter estimation.",
    "observedAt": "2026-02-20T00:00:00Z"
  }
]
```

### Schema Contract
```
Required fields: observationId, category, primaryAnchor, intensity, rationale
Optional fields: contributingAnchors, confidence, evidence, observedAt
primaryAnchor: { anchorType: <element type>, anchorId: <element id> }
category: one of the 6 enum values listed above
intensity: { scale: "0-10", score: <number 0-10> } OR { scale: "ordinal", severity: "Low"|"Medium"|"High"|"Critical" }
id format: fr_<nnn>_<snake_case_description>
```

### Valid anchorType Values
```
Activity, Role, Capability, Control, Constraint, Metric, Condition,
Outcome, ValueStream, Goal, Strategy, Directive, Objective, Initiative,
Interaction, DeonticLogic, FlowLogic, Concept, Property
```

### Self-Check
- [ ] All 6 friction categories represented
- [ ] Every primaryAnchor.anchorId exists in the scaffold
- [ ] Every contributingAnchor anchorId exists in the scaffold
- [ ] anchorType matches the correct element map
- [ ] Intensity scores vary (not all high, not all low)
- [ ] Rationale is board-readable (no technical jargon)
- [ ] 10-20 observations total

## Scaffold

[PASTE YOUR VALIDATED SCAFFOLD JSON HERE]

## Business Context

[PASTE ANY ADDITIONAL CONTEXT — pain points, known issues, strategic concerns that should inform the friction hypothesis]

## Generate

Produce the friction observations as a JSON array.
