# VCC Scaffold Generation — Prompt Pack v3.1

## Purpose
This prompt pack generates a valid ScaffoldModel.json and FrictionHeatmap.json from unstructured business inputs. The sequence follows how a business architect discovers and models an enterprise — big picture first, formalisation second, depth third, analysis last.

## Generation Sequence

```
PHASE A — DISCOVERY (understand the business)
  Step 01: ValueStream Definition     → what the business does, for whom, what value
  Step 02: Lifecycle Stages           → major phases the value stream moves through
  Step 03: Roles                      → who participates across stages
  Step 04: Capabilities               → what organisational abilities are required

PHASE B — FORMALISATION (translate into FSM semantics)
  Step 05: Outcomes                   → formalise stages into precise FSM states
  Step 06: Activities                 → formalise transitions (pre→post, chain, roles, capabilities)
  ════════════════════════════════════
  ⚑ MAJOR VALIDATION GATE            → chain integrity, referential integrity, outcome consistency
  ════════════════════════════════════

PHASE C — DEPTH (add governance detail)
  Step 07: Controls                   → governance mechanisms
  Step 08: Metrics & Measures         → performance indicators with baseline/current/target
  Step 09: Conditions                 → entry/exit criteria (optional)

PHASE D — ASSEMBLY & VALIDATION
  Step 10: Scaffold Assembly          → combine all elements into ScaffoldModel.json
  ⚑ FULL VALIDATION                  → run through VCC validator

PHASE E — ANALYSIS (identify friction)
  Step 11: Friction Observations      → evidence-classified structural friction
  Step 12: Binding Constraint         → scored constraint identification with derived confidence
  Step 13: Heatmap Assembly           → combine into FrictionHeatmap.json
  ⚑ FULL VALIDATION                  → validate scaffold + heatmap together
```

## Key Design Principles

### 1. Structural Before Interpretive
Phases A–D (structural modelling) must never depend on Phase E (friction analysis) outputs. The scaffold is a structural fact. Friction is an analytical interpretation of that structure. If friction observations were to influence scaffold construction, circular reasoning would contaminate the model. The scaffold must be complete and validated before any friction analysis begins. This boundary is non-negotiable.

### 2. Evidence Over Coverage
Friction observations must declare their evidence basis: EVIDENCED (from source material), INFERRED (from structural pattern), or ASSUMED (from domain heuristic). Do NOT fabricate friction to fill categories. Eight well-evidenced observations beat fifteen padded ones. Boards will interrogate. Have an answer.

### 3. Structural Constraint Scoring
The binding constraint is identified through a multi-factor scoring rubric — not narrative convenience. Observation frequency, authority centralisation, downstream dependency, control layering, and capacity constraint each contribute to a scored assessment. Confidence is derived from the scoring, not invented. Confidence reflects strength of structural scoring signals, not empirical performance validation. A confidence of 0.87 means the scoring factors are strong — it does not mean there is an 87% probability the identification is correct.

### 4. Determinism Within a Run
Structural packs (Steps 05-10) must be treated as pure functions: given the same inputs, they produce the same outputs. This means:
- Stable ID naming conventions (prefix_snake_case, derived from element name)
- No creative renaming between steps
- No optional additions that vary between runs
- Schema coercion: if a field is required, it is present; if not in schema, it is absent

Discovery packs (Steps 01-04) are inherently generative — they produce content from unstructured inputs. Determinism is not expected here. But once you commit to a discovery output, the formalisation must be deterministic from that point forward.

### 5. Traceability
When orchestrated by the CLI tool, each assembled scaffold carries generation metadata: prompt pack version, model, temperature, run ID, source artifacts. Manual generation should note these in a companion log.

## Known Phase 1 Limitations

**Single sequential chain model.** The FSM backbone (Step 06) supports only a single linear activity chain per value stream. Parallel branches, conditional branches, and loopbacks are not modelled. This is an intentional Phase 1 constraint that simplifies validation and rendering. Some value streams legitimately require branching — this limitation should be disclosed to boards and documented per engagement.

## Validation Gates

### Gate 1: Post-Activities (after Step 06)
Enforces programmatically:
- V-SCAFFOLD-01: All ID references resolve
- V-SCAFFOLD-02: No no-op transitions (pre ≠ post)
- V-SCAFFOLD-03: No cycles in nextActivityId chain
- V-SCAFFOLD-07: All activities reachable from chain head
- V-SCAFFOLD-08: Adjacent outcome consistency

**If this gate fails, STOP. Fix before proceeding to Phase C.**

### Gate 2: Post-Assembly (after Step 10)
Full VCC validator. Additionally catches:
- V-SCAFFOLD-04: ValueStream has activities
- V-SCAFFOLD-06: Orphan metrics
- V-MEASURE-01: Current measure timestamps
- V-MEASURE-02: Measure value type integrity

### Gate 3: Post-Heatmap (after Step 13)
Full VCC validator with scaffold + heatmap. Additionally validates:
- V-FRICTION-01: All anchors resolve to scaffold elements
- V-FRICTION-02: Binding anchor in observations
- V-FRICTION-03: Binding anchor in referenced observation
- V-FRICTION-04: ValueStreamId exists
- V-FRICTION-05: Scaffold integrity hash

## ID Convention
All IDs use snake_case with a type prefix. IDs are derived deterministically from the element name — not invented creatively.

| Prefix | Element Type | Example |
|--------|-------------|---------|
| `vs_` | ValueStream | `vs_credit_risk_assessment_mgmt` |
| `outcome_` | Outcome | `outcome_risk_case_initiated` |
| `role_` | Role | `role_credit_analyst` |
| `cap_` | Capability | `cap_credit_assessment_mgmt` |
| `act_` | Activity | `act_compile_credit_data_profile` |
| `ctrl_` | Control | `ctrl_data_quality_gate` |
| `metric_` | Metric | `metric_pd` |
| `ms_` | Measure | `ms_metric_pd_baseline` |
| `cond_` | Condition | `cond_data_minimum_complete` |
| `fr_` | Friction observation | `fr_001_incomplete_data_pack` |
| `bc_` | Binding constraint | `bc_001` |

## Evidence Basis Classification (Phase E)

| Value | Meaning | Board Defensibility |
|-------|---------|-------------------|
| `EVIDENCED` | Directly supported by source material | Strong — can point to source |
| `INFERRED` | Derived from structural pattern in scaffold | Medium — logic is traceable |
| `ASSUMED` | Based on domain knowledge or industry heuristic | Weak — flagged as hypothesis |

## Constraint Scoring Rubric (Step 12)

| Factor | Range | What It Measures |
|--------|-------|-----------------|
| observationFrequency | 0-3 | How often the element appears across observations |
| authorityCentralisation | 0-3 | Whether decision authority concentrates at this point |
| downstreamDependency | 0-3 | How many downstream activities are blocked if this stalls |
| controlLayering | 0-3 | How many controls gate this element |
| capacityConstraint | 0-3 | Whether capacity limits throughput here |
| **totalScore** | **0-15** | Sum of all factors |

**Eligibility rule:** Downstream Dependency must score ≥ 2 for a candidate to be eligible as binding constraint. High observation frequency without structural blocking power is noise, not constraint.

**Capacity scoring rule:** Capacity Constraint cannot score 3 unless at least one supporting observation has `evidenceBasis: "EVIDENCED"`. This prevents ASSUMED capacity signals from inflating the score.

**Confidence derivation:** `confidence = totalScore / 15` (rounded to 2 decimal places). Confidence reflects strength of structural scoring signals, not empirical performance validation.

## Input Sources
- Public disclosures (annual reports, investor presentations)
- Operating model descriptions
- Risk statements and governance structures
- Organisational role definitions
- Strategic priorities
- Available performance indicators
