# Spike B — Pass B Externalised-Outcome Producibility

**Filed:** 2026-05-08 (Session 37)
**Source:** DEC-122 partial-lock condition. Reviewer 3's prescription (the highest-information review of the four).
**Goal:** Determine whether the LLM pipeline can reliably produce a well-formed CAPSICUM-shaped graph — specifically externalised Outcomes with `stateOf` and `triggers` — from a real discovery transcript.
**Time-box:** 1–2 days of focused work. Solo dev.

---

## What This Spike Tests

The DEC-122 lock leaves two operational questions open. This spike answers the **pipeline migration sequencing** question, but it also tests something more foundational: whether the metamodel commitment is actually producible by the system that has to populate it.

Reviewer 3's framing:

> A metamodel commitment that the LLM pipeline can't produce reliably is no commitment at all — just a deferred problem.

If Spike B fails, the migration to externalised Outcome must phase: stateOf-only first, triggers second, AgentCharter (Layer 4) third. If Spike B passes, hard-cutover-with-dual-shape-loader is viable.

## The Workload

**Input:** Water Filtration Co. discovery transcript (`runs/...` or whichever existing fixture is freshest). One real, non-trivial transcript that has been run through Pass A1+A2 already so we have known-good DiscoveryIR output.

**Modification to Pass B:**
1. Add to the prompt: emit `outcomes[]` with `stateOf` (referencing a `recordClasses[*].id`) and `triggers` (referencing the next stage's id where applicable, null for terminal outcomes).
2. Add to the prompt: emit `recordClasses[]` registry (one or more business-object classes per VS, with stable IDs).
3. Add to the prompt: emit `activities[*].primaryRecordClassId` linking each stage to the business object whose state it transitions.
4. Keep all existing Pass B output (FSM chain, capabilityPPIT, etc.) — externalised Outcome is *additive* in this spike, not replacing the v4/v5 shape yet.

**Validation expansion:** Extend Gate 2 (referential integrity) with three SHACL-style checks expressed as SPARQL-ASK over the loaded graph:
- C-A: every `outcomes[*].stateOf` points at an existing `recordClasses[*].id`
- C-B: the `triggers` chain reaches every non-initial stage (transitive closure from initial outcomes)
- C-C: `recordClasses` labels are unique within VS scope

## Test Procedure

Three runs at temperature 0:
1. Run Pass B on the Water Filtration transcript.
2. Run the expanded validation against the output.
3. If validation fails, run **at most one** bounded-repair iteration (Gate's existing pattern).
4. Record: which constraints fired, which were repaired, which remained violated.

## Pass Criterion

**≥ 2 of 3 runs pass all three constraints with at most one repair iteration.**

## Failure Modes Reviewer 3 Predicted

Watch for these specifically — they're the diagnostic signal of *what* failed, not just *that* it failed:

1. **`stateOf` hallucination.** LLM invents business-object names per outcome rather than referencing the recordClasses registry. Same business object surfaces under different labels across stages of the same VS ("Claim", "Insurance Claim", "Submitted Claim"). C-A catches the IRI mismatch but the deeper failure is no shared identity.
2. **`triggers` collapsing to linear.** LLM has been instructed for thirty-six sessions to produce a single linear chain. Asked to produce non-linear `triggers`, it will likely produce the linear chain in different syntax — passing C-B technically but providing none of the value the externalisation was meant to unlock.
3. **Outcomes that are not states.** LLM produces Outcome names like "Customer Engagement Improved" (a *change*, not a state). Constraints don't catch this because the cardinality is right and the IRI is well-formed; the failure is semantic.

If any of these surface, that's evidence for *phased* pipeline migration rather than direct cutover. Phase 1 = `stateOf` only (with manual recordClasses curation); Phase 2 = `triggers` graph after upstream Discovery IR redesign; Phase 3 = AgentCharter (Layer 4 commercial).

## What Locks After This Spike

The pipeline migration sequencing for v0.6:
- *Pass:* Hard cutover internal + dual-shape loader external. Scaffold-store reads switch to graph queries; pipeline emits intermediate JSON shape that a deterministic transformer maps to JSON-LD with the published `@context`.
- *Fail (one or two failure modes):* Phased migration. `stateOf` only in v0.6, with manual recordClasses curation. `triggers` and AgentCharter deferred to subsequent versions.
- *Catastrophic fail (all three modes):* Re-examine whether Pass B can carry this metamodel at all without splitting (Pass B → Pass B1 + Pass B2). May force a metamodel-restructuring rather than producibility-fix conversation, and that has to come back to the architect.

## What Stays Open

- Runtime engine selection — that's Spike A.
- GSM kernel evaluation — Phase 2 work, post-lock.
- The full Purpose Layer beyond Capability/ValueStream — out of scope for v0.6.

## Implementation Notes

- Worktree under `spike/graph-runtime/`. Create `pipeline-spike/` subdirectory.
- Reuse the existing pipeline orchestrator and Pass B harness — modify only the prompt + the validation step.
- Capture all three run outputs (LLM raw, Gate-2 violations, after-repair output) for forensic review.
- Final results document at `spike/graph-runtime/SPIKE-B-RESULTS.md` with the diagnostic-mode breakdown.

## Exit Criteria

- Three runs completed at temperature 0.
- Results document filed with the diagnostic breakdown (which failure mode? if any?).
- Recommendation surfaced for architect lock-in via DEC-122 amendment.

The cost of this spike is low (~1 day) and the information value is high. Run before, in parallel with, or shortly after Spike A — they don't depend on each other, but Spike B's outcome is more decision-shaping.
