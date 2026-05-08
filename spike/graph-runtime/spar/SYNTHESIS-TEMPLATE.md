# SPAR Synthesis Template

Use this when you have all three reviewer responses in hand. The output of the synthesis is a Decision Record that gets appended to `docs/DECISIONS.md`.

---

## Step 1 — Score each reviewer's central recommendation

| Reviewer | Position | Single biggest risk they named | Confidence I should have in their judgement |
|----------|----------|--------------------------------|----------------------------------------------|
| 1 — Graph-DB Veteran |  |  |  |
| 2 — Standards Sceptic |  |  |  |
| 3 — Pipeline Architect |  |  |  |
| 4 — OSS-Strategy Sceptic |  |  |  |

For each: do they Endorse / Endorse-with-amendments / Reject / Require-second-spike?

Note: Reviewers 1–3 are on the technical axis (runtime, ontology, pipeline); Reviewer 4 is on the strategy axis (commercial / OSS / partner ecosystem). When tallying, weight technical and strategy concerns separately — a unanimous technical endorsement with a strong strategy objection is a different shape than three technical objections plus a strategy endorsement, and the response should differ accordingly.

## Step 2 — Identify convergent objections

If two or more reviewers raise the same concern, it's not anecdotal — it's structural. List them:

1. ___
2. ___
3. ___

If three or four raise the same concern, treat it as a **must-resolve** before locking. If two raise it, treat as a **should-resolve.** If one raises it, treat as a **flag** to revisit at next decision point.

Be alert to convergence *across* the technical/strategy axis — e.g., if Reviewer 2 (standards) flags `@context` durability concerns AND Reviewer 4 (strategy) flags JSON-LD plugin-author ergonomics, those may be the same underlying issue surfacing from different angles.

## Step 3 — Identify divergent objections

Where reviewers disagree, the divergence itself is information. Either:
- Reviewer A is using assumptions that don't apply (rule out their objection with reasoning)
- Reviewer B is using assumptions that don't apply (rule out theirs)
- Both are right under different scenarios (decide which scenario the project is actually in)
- The disagreement reveals a real open question (escalate to a follow-up spike)

For each divergence:
| What | Reviewer A says | Reviewer B says | My read |
|------|-----------------|-----------------|---------|

## Step 4 — Aggregate the "spike before locking" suggestions

Each reviewer was asked to name one spike that would change their assessment. List them, then decide:
- Run all three? (Probably too much)
- Run the union of must-resolve concerns? (Recommended)
- Run the highest-leverage one and lock with the others as caveats? (Pragmatic)

## Step 5 — Decide

Choose one outcome:

**A. Lock the decision as-is.** Reviewers raised no must-resolve concerns. Proceed to implementation per the Architect's position.

**B. Lock with amendments.** Reviewers identified must-resolve concerns that can be addressed by modifying the Architect's three constraints (or adding a fourth). The amendments are: ___

**C. Run a second spike.** A specific must-resolve concern can only be answered by code. The second spike is: ___

**D. Defer the decision.** A reviewer surfaced something fundamental that means the decision should not be made now. Reason: ___

## Step 6 — Write the Decision Record

Append to `docs/DECISIONS.md`:

```markdown
## DEC-NNN: Graph Runtime / Metamodel Commitment (2026-05-08)

**Context:** [paragraph: why this decision was needed; restate the symptoms]

**Decided:**
- [the runtime choice with constraints]
- [the metamodel commitment]
- [the migration approach and sequencing]

**Amends:**
- DEC-108 (Supabase + JSONB) — the persistent layer's role changes from "canonical" to "blob-store for serialised JSON-LD bundles + auth/projects metadata"

**Deferred:**
- [things intentionally postponed]
- [trigger conditions for revisiting]

**Tensions identified by SPAR reviewers:**
- [convergent objections that the decision integrates]
- [divergent objections and how they were resolved]

**Rationale:** [why this, not the alternatives]

**SPAR materials:** spike/graph-runtime/spar/ + the three reviewer responses (linked / archived in docs/spar-archive/dec-NNN/)
```

## Step 7 — Archive the SPAR

Save the three reviewer responses verbatim under `docs/spar-archive/dec-NNN/`. Future architects (including future-you) need to be able to reconstruct *why* the decision was made, not just *what* was decided.

## Step 8 — Plan the implementation sequencing

Once the decision is locked, the actual build needs:
1. Promote `spike/graph-runtime/` to `packages/graph/` with proper monorepo wiring
2. Migration tool: v4/v5 scaffold JSON → CAPSICUM JSON-LD bundle
3. Scaffold-store reads switch to graph queries (transition window: both loadable)
4. Pipeline output: stays in legacy shape during transition, with a one-shot import; full JSON-LD-direct emission deferred to v0.7
5. SHACL adoption: SPARQL-ASK production pattern → real SHACL when one of (rdf-validate-shacl bridge / custom SHACL→SPARQL translator) is decided
6. v4/v5 scaffold reader marked deprecated; removal target three minor versions out
7. The `@context` published at a stable URL with versioning (`v0.json` immutable; future versions get new URLs)

The implementation sequencing is *not* part of the SPAR — that's project planning. But sketching it after the SPAR helps validate that the decision is actually executable.
