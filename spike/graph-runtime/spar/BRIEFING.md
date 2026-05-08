# SPAR Briefing — Graph Runtime & Metamodel Commitment

**Filed:** 2026-05-08
**Architect:** Dr Terry Roach (UTS Research Fellow, IIBA Chairperson, CAPSICUM author)
**Decision under review:** Should VCC adopt a client-side embedded RDF/SHACL/JSON-LD runtime (specifically `oxigraph-wasm`) as the canonical graph layer, with the current flat scaffold JSON demoted to a serialisation format and the JSON-LD bundle promoted to the published open-core contract?

This is a Phase-1 SPAR (per `docs/SPAR_PROTOCOL.md`): the architect brings a position; reviewers challenge before code fossilises it. Output is a Decision Record amending DEC-108 (Supabase + JSONB) and locking the runtime choice.

---

## 1. The Project in One Page

**Value Cognition Canvas (VCC)** is a working instantiation of the **CAPSICUM ontology** — Terry Roach's PhD framework (UNSW 2011, evolved through 15 years of commercial deployment at Capsifi, formalised in the Feb 2026 arXiv paper *A Logical Model of Endeavour*). CAPSICUM is an ontology of purposeful action under authority: a 3×3 Execution Layer matrix (People/Process/Information × Domain/Behaviour/Governance), a vertically-aligned 3×3 Purpose Layer (Set/Plan/Realise × Ends/Means/Intent), and a typed nine-tuple Governed State Machine (GSM) ⟨S, Σ, map, δ, u, s₀, F, E, T, ε⟩ that maps every formal element to a named cell.

**Current state.** v0.4.0 in production. Monorepo with React/Vite SPA + TypeScript multi-pass LLM pipeline (A1→A2→B→C/D/E) + Python reference pipeline + Supabase auth + Vercel edge functions. The frontend uses a flat JSON scaffold as canonical, with denormalised FK arrays. v0.5.0 in progress (Canvas→VCC handoff, commercial tier system, Stripe).

**Strategic vision.** VCC is shifting from "board-level governance instrument for value-stream analysis" to **the design surface and living specification for the agentic enterprise** — the PRD-equivalent for agent-deployed operating models. The principle: the capability boundary IS the agent's authority boundary. Enrichment-before-scoring methodology; eight-dimension Agentic Enablement Score (AES); five classifications from Fully-Autonomous (AFK) to Human-Primary. Will be open-sourced under the **PlausibleBA Foundation** with a four-layer stack (Layer 1 open core, Layer 2 association content, Layer 3 hosted platform license, Layer 4 commercial plugin ecosystem). Anthropic Partner Network outreach in progress.

**The pain.** The flat scaffold has reached its expressiveness ceiling. Symptoms: dual field names (`requiresCapabilityIds` v4 vs `enabledByCapabilityIds` v5), PPIT stored as a compound blob on Activity (should be typed relationships on Capability), reader-side fallback patterns (`getCapabilityIds(act)`, `zone ?? layoutZone`), write-through hacks where typed cross-mapping results have to be denormalised back into FK arrays. The graph that the views need is being rebuilt on every load (`graph-index.ts`) — effectively admitting the persistent shape isn't queryable.

## 2. The Architect's Position

Move the runtime to an **embedded RDF/SHACL/JSON-LD layer** running client-side via `oxigraph-wasm`. JSON-LD bundle becomes the canonical exchange format and the published open-core contract for the OSS strategy. JSON scaffold becomes a legacy import shape during a transition window.

**Three deliberate constraints to keep it solo-dev-friendly:**
1. *Narrow runtime, not a triplestore product.* Embedded only — no exposed SPARQL endpoint. SPARQL used internally for query patterns we actually need (capability traversal, outcome-state reachability, charter scope).
2. *JSON-LD bundle preserves portability.* The D-095 architectural invariant survives — bundle saved today loads in any future version. The bundle's semantic status changes (was canonical, now a serialisation of the canonical graph) but its file-level portability does not.
3. *Deferred GSM kernel, scaffolded by ontology.* Full deontic evaluation, ε₁..ε₄ escalation, tri-valued V function are not v0.6 work — but the metamodel must be *able to host them* without restructuring. So Outcome is externalised now (BACM CAP-7 / VS-3) even if state-based VS navigation comes later, and Entitlements are modelled with placeholder structure even if not evaluated yet.

**Why CAPSICUM, not BACM.** BACM v1.0 is a downstream conformance target. CAPSICUM is the source ontology, broader (it has the Purpose Layer that BACM lacks), and richer (constitutive governance, GSM with deontic operators, four escalation triggers, Translation Integrity pipeline). The SP-cell positioning was ruled by the architect: Capability and ValueStream sit at REALISE row, not at PLAN — superseding the 2017 Capsifi TTLs which placed them as Objective and Tactic respectively.

## 3. The Working Artefact

A green spike under `spike/graph-runtime/`. ~666 lines, three runtime dependencies (`oxigraph` 3.4 MB WASM, `jsonld` 200 KB minified, `n3` thin). All four success criteria pass:

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Hydrate the Claims Settlement value stream from RDF; cardinalities match the PRD | PASS — 239 quads, all 6 class counts correct |
| 2 | A constraint catches the dual-field capability bug | PASS — both alias variants detected at validation time |
| 3 | JSON-LD bundle round-trip with `@context` | PASS — graph identity preserved, AgentCharter scope intact |
| 4 | AgentCharter authority-scope shape validates the capability boundary | PASS — unbounded charter rejected |

Constraints expressed as **SPARQL-ASK** queries (the same compilation target as SHACL-SPARQL constraints) rather than full SHACL shapes — fair simplification for the spike, but a production runtime needs SHACL proper layered on top.

## 4. What's Out of Scope (For You to Press On)

The spike deliberately doesn't address:
1. Real SHACL — full shape composition, severity levels, message templates
2. Entitlements as deontic norm tuples ⟨operator, source, applicability, provenance⟩ or the GSM kernel itself
3. Scale — the spike runs against ~239 quads; the IIBA Insurance reference model is ~1,679 capabilities × 24 VS × 112 stages
4. Browser-bundle measurement at production scale (oxigraph WASM is 3.4 MB uncompressed)
5. Migration tooling from current v4/v5 scaffold JSON to JSON-LD bundles
6. The full Purpose Layer beyond the Capability/ValueStream cells

## 5. Files to Read

| File | Purpose | Required? |
|------|---------|-----------|
| `spike/graph-runtime/REPORT.md` | Spike report with full result narrative | **Yes** |
| `spike/graph-runtime/src/shape/capsicum.ttl` | The minimal CAPSICUM shape (six core classes) | **Yes** |
| `spike/graph-runtime/src/fixtures/claims-settlement.ttl` | The hand-built fixture | Recommended |
| `spike/graph-runtime/src/20-validate.ts` | The four constraints, with bug-injection test phases | **Yes** |
| `spike/graph-runtime/claims-settlement.bundle.jsonld` | The 20 KB published-shape artefact | **Yes** |
| `docs/CLAUDE.md` | Project conventions and current architecture | Recommended |
| `docs/SPAR-BRIEFING-graph-backend.md` | The original briefing (Session 34) | Optional |
| `docs/BACM-v1.0-vs-VCC-Metamodel-Comparison.md` | Where BACM landed as a conformance target | Optional |
| Relevant uploaded sources: `A_Logical_Model_of_Endeavour_arXiv_Feb_2026_v2_7.pdf`, `CAPSICUM Framework Reference.pdf`, `PRD - Agentic_Enterprise_Framework v0.1.docx`, `PlausibleBA_Open_Source_Strategy v2.0.docx` | Foundational context | Optional |

## 6. Prior Decisions to Treat as Settled (Don't Relitigate)

Per the SPAR protocol's anti-pattern *"Relitigating settled decisions"*:

- **Graph IS canonical, scaffold serialises it.** Locked by the architect in this conversation. Do not re-argue Option 1 (typed in-memory adjacency over the existing scaffold).
- **CAPSICUM is the metamodel target.** BACM is a conformance check, not the schema source. Do not propose abandoning the CAPSICUM grounding.
- **Capability/ValueStream sit at REALISE row in the SP layer.** Architect ruling, not negotiable.
- **Bundle portability is invariant (D-095).** Any proposal must preserve "a bundle saved today loads in every future version."
- **Solo-dev operability is a constraint.** Proposals that require operating a server-side graph DB at v0.6 are out of scope (multi-user is the upgrade trigger, not v0.6).

## 7. What's Up For Grabs

- The runtime choice itself: oxigraph-wasm vs alternatives (rdflib.js + shacl-engine, Comunica, custom typed-quad store, server-side oxigraph for Layer 3)
- The SHACL implementation strategy: bridge `rdf-validate-shacl` (with rdf-ext interop cost) vs custom SHACL→SPARQL translator vs SPARQL-ASK as production pattern
- The migration sequencing: scaffold-store reads first, pipeline output last vs the inverse vs both at once
- The OSS-contract `@context` durability: is the spike's `@context` shape publishable as v0 of the open-core, or does it need work first
- Whether/how the architect's three constraints (narrow runtime, bundle preserved, deferred GSM) survive the challenge

## 8. Output Format

Each reviewer responds with the structure given in their role prompt. The architect synthesises into a Decision Record per `SYNTHESIS-TEMPLATE.md`.

Three explicit asks for every reviewer:
1. Identify the **single biggest hidden risk** in the proposal that you'd flag.
2. Give a **specific, named alternative** to oxigraph-wasm-with-three-constraints, with the trade-off analysis.
3. Identify **one concrete thing to spike before locking** that would change your assessment.

Time-box: ~60–90 min reading + ~30–45 min writing. This is a Phase-1 challenge, not a 100-page review.
