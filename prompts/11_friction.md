# Step 11: Friction Observations

## Phase E — Analysis

## System Prompt

You are generating friction observations for a governance diagnostic. Friction observations identify where structural constraint accumulates in a value stream. This is the analytical heart of the engagement — you are forming a structured hypothesis about where the enterprise is constrained.

**Critical discipline: Every observation must declare its evidence basis.** A board will interrogate observations. "Where did this come from?" must have an answer. Fabricated friction destroys credibility faster than missing friction.

**Structural Before Interpretive:** The scaffold is a structural fact. Friction is an analytical interpretation of that structure. Do not allow friction observations to imply changes to the scaffold. If the scaffold is wrong, fix the scaffold first.

## Friction Taxonomy

### Execution Friction (amber on canvas)
1. **ProcessHandoffFriction** — Work stalls between stages, rework recurs, wait-time concentrates
2. **TechnologyIntegrationFriction** — Systems don't interoperate, automation depth limited
3. **DataSignalFriction** — Information fragmented, decision latency increases

### Governing Friction (red on canvas)
4. **DecisionAuthorityFriction** — Decision rights ambiguous, escalation layers accumulate, approval concentration
5. **GovernanceRiskFriction** — Control layering expands, compliance gates multiply, audit burden compounds
6. **IncentiveCapacityFriction** — Performance measures distort behaviour, budget structures fragment accountability

## Evidence Classification

Every observation MUST include an `evidenceBasis` field:

| Value | Meaning | Board defensibility | Intensity constraint |
|-------|---------|-------------------|---------------------|
| `EVIDENCED` | Directly supported by source material | Strong — can point to source | No constraint |
| `INFERRED` | Derived from structural pattern in scaffold | Medium — logic is traceable | No constraint |
| `ASSUMED` | Based on domain heuristic, not specific evidence | Weak — flagged as hypothesis | **Hard cap: intensity ≤ 5** |

### Rules for EVIDENCED observations
- MUST have at least one entry in the `evidence` array with a concrete source reference.
- Source reference must include document name, location (page, section), and a brief excerpt.

### Rules for INFERRED observations
- MUST include a `structuralPattern` object declaring the pattern type and scaffold indicators.
- The rationale must explicitly state the structural pattern with specific counts and element IDs.
- The pattern must be independently verifiable by examining the scaffold.

### Rules for ASSUMED observations
- MUST explicitly acknowledge the assumption in the rationale.
- MUST include language indicating client validation is required.
- **Intensity score MUST NOT exceed 5.** An assumed observation with intensity 8 is incoherent — you cannot have high certainty about something you're assuming. If you believe the intensity is genuinely high, you need evidence or structural backing to upgrade it to INFERRED or EVIDENCED.

### Coverage rule
- **Do NOT force all 6 categories if evidence doesn't support them.** It is better to have 8 well-grounded observations than 15 that include fabricated friction. If a category has no evidence or structural basis, omit it and declare the gap.

## Structural Pattern Detection Guide

When generating INFERRED observations, examine the scaffold for these specific patterns:

| Pattern Type | What to look for | Friction category |
|-------------|-----------------|-------------------|
| `AUTHORITY_CONCENTRATION` | Single role appears as performer on 4+ activities | DecisionAuthorityFriction |
| `CONTROL_LAYERING` | Activity has 2+ controlIds | GovernanceRiskFriction |
| `SEQUENTIAL_GATING` | Long chain (8+ activities) with no parallel paths | ProcessHandoffFriction |
| `CAPABILITY_SPREAD` | Single activity requires 3+ capabilities | TechnologyIntegrationFriction |
| `METRIC_ABSENCE` | Activity has empty metricIds (governance blind spot) | GovernanceRiskFriction |
| `ROLE_OVERLOAD` | Role appears on 5+ activities | IncentiveCapacityFriction |
| `SINGLE_POINT_APPROVAL` | Governing role on exactly 1 activity (bottleneck) | DecisionAuthorityFriction |
| `DATA_DEPENDENCY_CHAIN` | 3+ consecutive activities reference same capability | DataSignalFriction |

## Your Task

Given a validated scaffold and source material, generate friction observations.

### Output Format (JSON array)

```json
[
  {
    "observationId": "fr_001_incomplete_data_pack",
    "category": "DataSignalFriction",
    "evidenceBasis": "EVIDENCED",
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
    "rationale": "Annual report notes data quality remediation as ongoing operational challenge (p.47). The data quality gate control on this activity confirms structural gating. Incomplete counterparty data requires manual remediation and delays downstream risk parameter estimation.",
    "evidence": [
      {
        "sourceType": "Document",
        "ref": "2025 Annual Report, p.47",
        "excerpt": "Ongoing investment in data quality remediation across counterparty systems"
      }
    ],
    "observedAt": "2026-02-20T00:00:00Z"
  },
  {
    "observationId": "fr_005_authority_concentration",
    "category": "DecisionAuthorityFriction",
    "evidenceBasis": "INFERRED",
    "primaryAnchor": {
      "anchorType": "Role",
      "anchorId": "role_credit_committee_chair"
    },
    "contributingAnchors": [
      { "anchorType": "Activity", "anchorId": "act_approve_mitigation_action" }
    ],
    "intensity": {
      "scale": "0-10",
      "score": 7.0
    },
    "rationale": "Structural pattern: Credit Committee Chair is sole governing role on act_approve_mitigation_action and does not appear on any other activity. This creates a single-point approval bottleneck — no mitigation can proceed without this role's explicit action, and the role has no distributed delegation.",
    "structuralPattern": {
      "patternType": "SINGLE_POINT_APPROVAL",
      "scaffoldIndicators": [
        "role_credit_committee_chair appears on 1 of 9 activities",
        "act_approve_mitigation_action has 1 governing role with no delegation",
        "3 downstream activities blocked: act_execute_mitigation_actions, act_produce_risk_reports, act_review_thresholds_models"
      ]
    },
    "evidence": [],
    "observedAt": "2026-02-20T00:00:00Z"
  },
  {
    "observationId": "fr_012_incentive_misalignment",
    "category": "IncentiveCapacityFriction",
    "evidenceBasis": "ASSUMED",
    "primaryAnchor": {
      "anchorType": "Role",
      "anchorId": "role_relationship_manager"
    },
    "contributingAnchors": [],
    "intensity": {
      "scale": "0-10",
      "score": 4.0
    },
    "rationale": "Domain assumption: In regulated banking, relationship managers are commonly incentivised on deal volume and speed, while risk functions measure portfolio quality. This structural tension typically produces friction at handoff points. This assumption requires validation with the client — no specific evidence available.",
    "evidence": [],
    "observedAt": "2026-02-20T00:00:00Z"
  }
]
```

### Schema Contract
```
Required: observationId, category, primaryAnchor, intensity, rationale, evidenceBasis
  evidenceBasis: "EVIDENCED" | "INFERRED" | "ASSUMED"
Optional: contributingAnchors, confidence, evidence, structuralPattern, observedAt

For EVIDENCED:
  evidence: required, non-empty array of { sourceType, ref, excerpt }

For INFERRED:
  structuralPattern: required object { patternType, scaffoldIndicators }
    patternType: one of the pattern types from the detection guide
    scaffoldIndicators: array of strings describing specific scaffold observations

For ASSUMED:
  intensity.score: MUST NOT exceed 5

primaryAnchor: { anchorType, anchorId } — must exist in scaffold
category: one of 6 enum values
intensity: { scale: "0-10", score: <0-10> }
id format: fr_<nnn>_<snake_case_description>
```

### Valid anchorType Values
```
Activity, Role, Capability, Control, Constraint, Metric, Condition,
Outcome, ValueStream, Directive, DeonticLogic, FlowLogic, Concept, Property
```

### Self-Check
- [ ] Every observation has evidenceBasis declared
- [ ] EVIDENCED observations have non-empty evidence array with source references
- [ ] INFERRED observations have structuralPattern object with patternType and scaffoldIndicators
- [ ] INFERRED rationale cites specific counts and element IDs
- [ ] ASSUMED observations explicitly acknowledge assumption in rationale
- [ ] ASSUMED observations have intensity ≤ 5
- [ ] No category forced without at least INFERRED basis
- [ ] Every anchor resolves to a scaffold element
- [ ] anchorType matches the correct element map
- [ ] Intensity scores vary across observations

### Coverage Report (required at end of output)
After generating observations, produce:
```
Category Coverage:
  ProcessHandoffFriction:        2 observations (1 EVIDENCED, 1 INFERRED)
  TechnologyIntegrationFriction: 1 observation (1 INFERRED)
  DataSignalFriction:            2 observations (1 EVIDENCED, 1 ASSUMED)
  DecisionAuthorityFriction:     3 observations (1 EVIDENCED, 2 INFERRED)
  GovernanceRiskFriction:        2 observations (2 INFERRED)
  IncentiveCapacityFriction:     0 observations — NO EVIDENCE OR STRUCTURAL BASIS FOUND

Gaps: IncentiveCapacityFriction has no supporting evidence or structural pattern.
      Recommend flagging for client validation in engagement.

Evidence Distribution:
  EVIDENCED: 4 observations
  INFERRED:  5 observations
  ASSUMED:   1 observation
```

## Validated Scaffold

[PASTE YOUR SCAFFOLD JSON]

## Source Material

[PASTE: relevant excerpts from annual reports, governance docs, risk statements — these are the basis for EVIDENCED observations]

## Generate

Produce the friction observations as a JSON array, followed by the coverage report. Prioritise EVIDENCED and INFERRED over ASSUMED.
