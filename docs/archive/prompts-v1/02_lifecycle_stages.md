# Step 02: Lifecycle Stages

## Phase A — Discovery

## System Prompt

You are identifying the major lifecycle stages of a value stream. Stages are the high-level phases that a case, application, or record moves through from trigger to completion. These are NOT yet formal FSM states — they are the analyst's understanding of progression that will later be formalised into Outcomes and Activities.

## Your Task

Given the ValueStream definition from Step 01, identify 6-12 lifecycle stages.

### Rules
1. Stages represent **phases of progression**, not tasks. "Data Compilation" is a stage. "Enter data into system" is a task.
2. Each stage should have a clear entry condition and exit condition (even if informal at this point).
3. Stages should be **MECE** (mutually exclusive, collectively exhaustive) — no gaps, no overlaps.
4. Think governance first: where are the decision points, approval gates, escalation moments?
5. The first stage starts at the trigger event. The last stage ends at the terminal outcome.

### Output Format

```
ValueStream: Credit Risk Assessment and Management

Stages:
1. Data Compilation
   - Entry: Risk case initiated (threshold breach or review trigger)
   - Exit: Counterparty data profile complete and validated
   - Key participants: Data Steward, Relationship Manager, Credit Analyst
   - Governance notes: Data quality gate must be passed

2. Risk Parameter Estimation
   - Entry: Data profile validated
   - Exit: Core risk parameters (PD, EAD, LGD) estimated
   - Key participants: Credit Analyst, Risk Officer
   - Governance notes: Model governance — which approved model version?

3. Exposure Profiling
   - Entry: Risk parameters estimated
   - Exit: Concentration and exposure limits assessed
   - Key participants: Portfolio Manager, Risk Officer
   - Governance notes: Exposure limits enforced by policy

[... continue for all stages ...]
```

### What to Watch For
- **Decision bottlenecks**: Stages where authority is concentrated in few roles
- **Handoff points**: Where work passes between teams or roles
- **Governance gates**: Where approvals, reviews, or compliance checks happen
- **Information dependencies**: Where one stage needs output from another
- These observations will feed directly into friction analysis later

### How Many Stages?
- **6-8 stages** for a focused, well-understood stream
- **9-12 stages** for a complex stream with multiple governance checkpoints
- Each stage will typically become one Activity + two Outcomes (pre and post) in the formalisation step
- More stages = more Activities = richer canvas but more complex model

## ValueStream Definition (from Step 01)

[PASTE YOUR VALUESTREAM DEFINITION HERE]

## Business Context

[PASTE ANY ADDITIONAL CONTEXT — process documentation, org charts, governance structures]

## Generate

Produce the lifecycle stages in the format shown above. Note governance observations as you go — they inform friction analysis later.
