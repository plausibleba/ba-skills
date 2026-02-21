# How the Value Cognition Canvas is Generated

## A Board-Level Explanation of Methodology

---

## The Short Answer

The Value Cognition Canvas takes the way your organisation actually operates — its activities, roles, controls, and governance structures — and makes the friction between execution and oversight visible, measurable, and traceable. Every observation on the canvas is grounded in structural evidence from your operating model, not opinion.

---

## The Generation Process: Five Phases

### Phase A: Domain Discovery
**What happens:** We identify the value stream to be analysed and map its lifecycle from trigger to terminal outcome.

**Method:** Working from source material — organisational documents, process descriptions, governance frameworks, regulatory publications — we identify the sequential stages that work passes through. For the Prudential Supervision example, we drew on published supervisory frameworks from four regulators (APRA, NY Fed, OSFI, MAS) to identify the common structural patterns in how banking supervisors assess and respond to institutional risk.

**Output:** A defined value stream with named stages, clear entry/exit signals, and scope boundaries (what's in, what's out).

**Why it matters to the board:** This ensures we're analysing the right process at the right level of granularity. Getting the scope wrong means the analysis is either too shallow to be useful or too broad to be actionable.

---

### Phase B: Structural Modelling
**What happens:** We decompose the value stream into its constituent elements — the roles who perform work, the capabilities required, the outcomes that mark state transitions, and the activities that transform one state into another.

**Method:** Each activity is modelled as a state transition: it has a pre-condition (the state before), a post-condition (the state after), one or more performing roles, and required capabilities. Activities are linked into a chain where the output state of one activity is the input state of the next. This creates a finite state machine — a formal, verifiable model of how work flows through the value stream.

**Validation gate:** Before proceeding, we verify that:
- Every role referenced by an activity exists
- Every capability referenced exists
- Every outcome (state) is used — no orphaned states
- The activity chain is continuous with a single entry point and single exit point
- The post-outcome of each activity matches the pre-outcome of the next

**Output:** A validated scaffold of 6 roles, 8 capabilities, 9 outcomes, and 8 activities in a verified chain.

**Why it matters to the board:** The finite state machine model ensures the analysis is structurally sound before any interpretive work begins. You can't have friction analysis on a broken model.

---

### Phase C: Governance & Measurement Layer
**What happens:** We add the controls (governance rules), metrics (what's measured), measures (actual values), and conditions (gates that must be satisfied) to each activity.

**Method:** Controls are identified from the source material — delegation authority requirements, quality checks, escalation rules, compliance obligations. Each control is assigned to the specific activities it governs. Metrics are defined with baseline, target, and current measures to make performance visible. Conditions specify what must be true before an activity can start (entry conditions) or before it can be considered complete (exit conditions).

**Key design principle:** Controls, metrics, and conditions are modelled as separate elements with explicit mappings to activities. This means we can see exactly which activities carry the heaviest governance burden, which have the widest gap between current and target performance, and where conditions create sequential dependencies.

**Validation gate:** All references verified — every control assigned to an activity exists, every metric's measure references resolve, every condition references real elements.

**Output:** 10 controls, 7 metrics (with 21 measures), and 9 conditions mapped to the activity chain via explicit patch instructions.

**Why it matters to the board:** This is where the analytical power comes from. The governance layer makes visible what is usually implicit — the cumulative weight of controls on each activity, the gaps between measured performance and targets, and the conditions that create bottlenecks.

---

### Phase D: Friction Analysis
**What happens:** We analyse the assembled model to identify where execution friction and governance friction exist, classify each observation by type, and determine the binding constraint — the single element that most limits overall throughput.

**Method:** Friction is detected through structural analysis of the model itself:

- **Control density analysis:** Which activities carry the most governance controls? High density indicates governance-heavy gates that may slow throughput.
- **Role concentration analysis:** Which roles appear across the most activities? High concentration indicates single-point dependencies where one role's capacity limits the whole chain.
- **Condition dependency analysis:** Which activities have the most entry/exit conditions? Complex condition chains create sequential dependencies.
- **Metric gap analysis:** Where is the widest gap between current performance and target? Large gaps indicate known, measured friction.
- **Authority centralisation analysis:** Which activities require approval from a small pool of senior authorities? Serial dependencies on named individuals create structural bottlenecks.

Each friction observation is classified into one of six categories:
1. **Process Handoff Friction** — delays at transition points between activities or between value streams
2. **Technology Integration Friction** — friction from system boundaries or data format mismatches
3. **Data Signal Friction** — incomplete, delayed, or poor-quality information
4. **Decision Authority Friction** — bottlenecks where approval authority is concentrated
5. **Governance Risk Friction** — cumulative burden of overlapping controls and escalation requirements
6. **Incentive/Capacity Friction** — resource constraints or misaligned incentives

**Evidence classification:** Every observation is classified by the strength of its evidence:
- **Evidenced** — supported by specific data from source material (metric values, documented controls, published frameworks)
- **Inferred** — derived from structural patterns in the model (role concentration counts, control density ratios)
- **Assumed** — based on domain knowledge without direct structural evidence (capped at lower intensity)

**Output:** 8 friction observations (4 evidenced, 3 inferred, 1 assumed) across 5 of the 6 friction categories.

**Why it matters to the board:** This is not a subjective assessment. Every friction observation traces back to specific elements in the model. When challenged on "where did this come from?", the answer is always a specific control, metric, role assignment, or condition — not a consultant's intuition.

---

### Phase E: Binding Constraint Identification
**What happens:** We identify the single element in the value stream that most constrains overall throughput — the binding constraint.

**Method:** Candidate elements are scored across five factors:

| Factor | What it measures |
|--------|-----------------|
| Observation Frequency | How often does this element appear across friction observations? |
| Authority Centralisation | How concentrated is decision-making authority at this point? |
| Downstream Dependency | How many subsequent activities are blocked until this one completes? |
| Control Layering | How many governance controls are stacked on this element? |
| Capacity Constraint | Is there evidence of capacity pressure at this point? |

Each factor is scored 0–3. The binding constraint is the element with the highest total score, subject to eligibility rules (downstream dependency must be ≥ 2 to qualify — an element that doesn't block others can't be the system bottleneck).

**For the Prudential Supervision example:**
The binding constraint is **Review & Approve Ratings and Plan** (score 13/15, confidence 0.87). It scored highest on authority centralisation (approval concentrated in Chief Supervisor with escalation to Executive Leadership), downstream dependency (two activities plus all downstream value stream triggers blocked), and observation frequency (referenced in 3 of 8 friction observations).

**Output:** Named binding constraint with scored justification and ranked alternatives.

**Why it matters to the board:** This answers the most important strategic question: "If we could fix one thing, what would have the greatest impact on throughput?" The scoring rubric makes the answer defensible and the reasoning transparent.

---

## What Makes This Different

**Structural, not narrative.** Traditional consulting produces reports with opinions. The VCC produces a formal model with verifiable references. Every claim traces to a specific element.

**Validated, not assumed.** The model passes automated validation gates before any interpretive analysis begins. Broken models don't get friction analysis.

**Measured, not estimated.** Where metrics exist, friction observations reference actual measured gaps (e.g., "approval cycle time: current 12 days vs target 7 days"), not estimated impact.

**Transparent, not black-box.** The binding constraint is selected via a scored rubric, not narrative convenience. The scoring is visible, the alternatives are ranked, and the confidence is derived from the score — not invented.

**Cross-jurisdictional, not parochial.** For the Prudential Supervision example, the model draws on structural patterns common to APRA (Australia), NY Fed (United States), OSFI (Canada), and MAS (Singapore). The friction observations reflect patterns that appear across regulatory frameworks, not idiosyncrasies of one organisation.

---

## Source Material Used

For the Prudential Supervision — Risk Assessment & Response analysis:

- APRA Supervisory Review Project (SRP) Overview — six core supervisory processes
- APRA Probability and Impact Rating System (PAIRS) Guide — risk category definitions and scoring methodology
- APRA Supervisory Oversight and Response System (SOARS) Guide — graduated response framework
- APRA Risk Assessment and Response resource definitions
- NY Fed Supervision Group published frameworks — risk-focused supervisory approach, LISCC governance
- NY Fed value stream stages, capability hierarchy, process catalog, stakeholder value map
- OSFI Business Architecture Framework — supervisory process design
- Federal Reserve Board supervision and regulation published guidance
- GAO Report on Large Bank Supervision — LISCC program structure and governance
