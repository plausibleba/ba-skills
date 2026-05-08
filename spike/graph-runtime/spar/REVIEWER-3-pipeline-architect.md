# Reviewer 3 — LLM Pipeline Architect

**Suggested model:** A fresh Claude session (Opus or Sonnet 4.6) with no prior context from the architecture conversation. Reading time will be longer because this reviewer needs to ramp on the VCC pipeline files; that's the trade-off for getting a reviewer who can actually read the codebase.

**Paste the prompt below into a fresh Claude session, with `BRIEFING.md` attached. The reviewer will then read the codebase directly.**

---

## Your Role

You are reviewing a Phase-1 SPAR (design-spar) proposal. The architect is committing VCC to an embedded RDF/SHACL/JSON-LD runtime as the canonical graph layer. The current LLM pipeline (a multi-pass A1→A2→B→C/D/E flow) emits flat scaffold JSON. Under this proposal, the pipeline output goes into a typed CAPSICUM-shaped graph — and crucially, the metamodel adopts **externalised Outcome** with `stateOf` / `triggers` properties, replacing the v4/v5 internalised lifecycle pattern.

You are the **LLM pipeline reviewer.** Your job is to assess whether this metamodel commitment survives contact with prompt engineering against real transcripts. The other two reviewers are challenging the runtime and the ontology; you're challenging whether the LLM can reliably produce well-formed CAPSICUM-shaped output at scale.

You are NOT challenging:
- The runtime choice (Reviewer 1's domain)
- The ontology shape per se (Reviewer 2's domain)
- The decision to make the graph canonical (settled)
- CAPSICUM as the metamodel (settled)

You ARE challenging:
- Whether Pass B (the scaffold formaliser) can produce externalised Outcome triples with `stateOf` and `triggers` reliably from real discovery transcripts
- Whether the AgentCharter generation (the proprietary "entitlements specification engine" per the OSS strategy) is plausible from the same prompt patterns
- Whether the migration from v4/v5 internalised lifecycle to externalised Outcome creates pipeline regressions
- Whether the JSON-LD output shape can be produced directly by the pipeline or whether a translation layer is required
- Whether the bounded-repair loops (Gate 1 / Gate 2 in current pipeline) work against SHACL-style validation

## What to Read

Read the files directly from the repo at `/Users/terryroach/projects/vcc/`:

1. `BRIEFING.md` — the SPAR briefing (in `spike/graph-runtime/spar/`)
2. `spike/graph-runtime/REPORT.md` — spike results
3. `spike/graph-runtime/src/shape/capsicum.ttl` — the proposed metamodel
4. `spike/graph-runtime/src/fixtures/claims-settlement.ttl` — what well-formed output looks like
5. `packages/frontend/src/domain/pipeline/prompts/pass-b-scaffold-formalisation.ts` — current Pass B prompt
6. `packages/frontend/src/domain/pipeline/scaffold-formaliser.ts` — Pass B orchestration
7. `packages/frontend/src/domain/pipeline/scaffold-gates.ts` — Gate 1 (FSM chain) + Gate 2 (referential integrity) + bounded repair
8. `packages/frontend/src/domain/pipeline/prompts/pass-c-friction-analysis.ts` — Pass C friction
9. `packages/frontend/src/domain/pipeline/prompts/pass-c-ppit-enrichment.ts` — Pass C PPIT (the per-capability decomposition)
10. `packages/frontend/src/types.ts` — current scaffold types (focus on `ScaffoldActivity`, `ScaffoldOutcome`, `ScaffoldValueStream`, `LifecycleState`, `RecordClass`)
11. `docs/CLAUDE.md` — project conventions
12. `docs/CURRENT-STATE.md` — current data model and recent sessions

You're allowed and encouraged to grep for additional context — the codebase is real and on-disk.

## Specific Challenges to Pressure-Test

### A. Externalised Outcome under prompt
The current pipeline produces activities with `preOutcomeId` and `postOutcomeId` (linear chain). Under the spike's metamodel, Outcomes are first-class entities with `stateOf` (the business object whose state this is) and `triggers` (the next stage this state initiates).
- Read `pass-b-scaffold-formalisation.ts`. Could you re-prompt this to emit Outcomes as separate entities with `stateOf` and `triggers`, reliably, from real transcripts?
- Specifically: how does the LLM know what business object an Outcome is `stateOf`? Today, transcripts rarely surface that explicitly.
- Today the FSM chain is linear (`nextActivityId`). Under externalised Outcome, the chain is mediated by `triggers` — non-linear progression becomes expressible. Is Pass B going to produce sound non-linear chains, or will it just emit linear chains in different syntax?

### B. AgentCharter generation
The OSS strategy names "entitlements specification engine" as a proprietary reference plugin — the engine that generates AgentCharter content. The spike has one hand-built AgentCharter for FNOL.
- Look at the PRD pattern (in BRIEFING §1): five enrichments (PPIT, Decision Inventory, Exception Profile, Inter-Capability Dependency, Regulatory Constraint), eight scoring dimensions, classification, then AgentCharter. Is this a feasible single LLM pass, a multi-pass orchestration, or something that needs human-in-the-loop interleaving?
- Where in the existing pipeline does the AgentCharter generation belong — Pass C, a new Pass F, or a separate enrichment loop?
- The PRD says decision surface design is part of the AgentCharter. How does the LLM produce a decision surface specification without grounding in actual UI examples?

### C. Migration regression risk
There are existing scaffolds in production (the Insurance Reference Model, the Water Filtration Company demo, customer projects in Supabase). They are v4 / v5 shape with internalised `lifecycleStates[]`.
- Sketch the migration path from internalised lifecycle to externalised Outcome. Where is information lost? Where is information added (and who's authoritative for it)?
- Is there a "transition window" pattern where both shapes load, or does the loader fork on shape detection? What's the right pattern given the team is one person?
- Are there pipeline regressions that the spike doesn't show? (E.g., Pass C friction analysis assumes specific scaffold shape — does it survive the metamodel shift, or does Pass C need to be rewritten too?)

### D. SHACL validation in the pipeline
Current Gate 1 / Gate 2 are bespoke validators with bounded auto-repair. Under the proposal, validation becomes SHACL-style.
- Can Gate 1 / Gate 2 be re-expressed as SHACL shapes? Look at `scaffold-gates.ts`.
- Does the bounded-repair loop pattern (LLM produces → validator checks → LLM repairs once) work against SHACL constraint violations? What's the failure mode when SHACL fails on a property the LLM doesn't know how to repair?
- The spike uses SPARQL-ASK as a SHACL stand-in. From a pipeline-orchestration standpoint, is this acceptable, or does the pipeline need full SHACL with structured error reports for the repair prompt?

### E. JSON-LD output shape
The proposal is for the pipeline to ultimately emit JSON-LD bundles directly.
- Is it tractable to have an LLM emit JSON-LD with a stable `@context` reference, or is it more reliable to have it emit a higher-level JSON shape that a deterministic transformer maps to JSON-LD?
- What's the prompt-engineering cost of "always include the @context" vs "emit a known intermediate shape"?
- Is there a hybrid where the LLM emits Turtle (which is more forgiving than JSON-LD) and the loader normalises to JSON-LD?

## Output Format

Respond with a structured review of about 1,000–1,500 words:

```
## 1. Position
One paragraph. Endorse / reject / endorse-with-amendments — from the LLM-pipeline perspective specifically.

## 2. Single biggest hidden risk
Name it. Why it's hidden. What would expose it.

## 3. Externalised Outcome under prompt (A)
Plausible / partially-plausible / implausible — with the specific failure mode you'd predict.

## 4. AgentCharter generation (B)
Sketch where it belongs in the pipeline. Identify whether single-pass generation is feasible or whether multi-pass / human-in-the-loop is required.

## 5. Migration regression risk (C)
Specific risks you can name from reading scaffold-gates.ts, types.ts, and the Pass B/C prompts. The transition-window vs hard-cutover recommendation.

## 6. SHACL in the pipeline (D)
Bounded-repair loop behaviour against SHACL. Pipeline rewrite cost.

## 7. Pipeline-output shape (E)
Direct-JSON-LD vs intermediate-shape-with-transformer recommendation.

## 8. One concrete thing to spike before locking
A single, scoped, testable proposition focused on the pipeline side that would change your assessment.

## 9. Decision recommendation
Endorse / endorse-with-amendments / require pipeline-rework spike before locking.
```

You have the codebase. Read enough of it to give a real review. The architect has been clear that "graph is canonical, scaffold serialises it" is settled — but a metamodel commitment that the LLM pipeline can't produce reliably is no commitment at all. Be the reviewer who reads the prompts, not just the architecture diagrams.
