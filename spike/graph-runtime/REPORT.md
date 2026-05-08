# Spike Report — Graph Runtime / CAPSICUM JSON-LD

**Filed:** 2026-05-08
**Decision under test:** Should VCC adopt Option 2 (client-side RDF/SHACL/JSON-LD) as the canonical graph runtime, with the JSON bundle demoted to a serialisation format?
**Outcome:** All four success criteria PASS. Recommendation: proceed to red-team SPAR.

---

## What Was Built

A working, isolated spike of an embedded RDF runtime running entirely in Node (and trivially portable to the browser via the same `oxigraph` package's `web` bundle):

| File | Purpose |
|------|---------|
| `src/shape/capsicum.ttl` | Minimal CAPSICUM shape — six core classes, externalised Outcome, AgentCharter |
| `src/fixtures/claims-settlement.ttl` | Hand-built fixture: 1 VS, 7 stages, 12 capabilities (with PRD AES scores), 8 outcomes, 5 roles, 1 AgentCharter for FNOL |
| `src/00-smoke.ts` | Runtime smoke test |
| `src/10-hydrate.ts` | Loads shape + fixture, asserts cardinalities (SC #1) |
| `src/20-validate.ts` | Four SHACL-SPARQL constraints + bug injection (SC #2, SC #4) |
| `src/30-roundtrip.ts` | Dump → JSON-LD bundle → re-load → identity check (SC #3) |
| `src/run-all.ts` | Single-entry regression run |
| `claims-settlement.bundle.jsonld` | 20 KB published-shape bundle artefact |

Total spike size: ~666 lines across TS + TTL.

## Success Criteria — Results

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Hydrate one VS from RDF into oxigraph; cardinalities match the PRD claims-settlement model | **PASS** — 239 quads loaded, all 6 class counts match expected. |
| 2 | A SHACL-style constraint catches the dual-field capability bug | **PASS** — C1 detects missing canonical predicate; C2 detects v5 alias presence. Both fire when a v5-shape Stage is injected. |
| 3 | JSON-LD bundle round-trip: dump → reload → graph identity | **PASS** — 239 quads in, 239 quads out, AgentCharter scope intact, C1 still passes on restored store. |
| 4 | AgentCharter authority-scope shape validates the capability boundary | **PASS** — C4 fires when an unbounded AgentCharter (no `chartersAgentFor`) is injected. |

`npm run all` exits 0 — the spike is green.

## What This Demonstrates

1. **The runtime is real and embeddable.** `oxigraph-wasm` runs with no service dependencies. SPARQL 1.1 SELECT/ASK/UPDATE all work. Load/dump in Turtle, N-Quads, and (via `jsonld`) JSON-LD.
2. **The metamodel commitment is expressible.** The CAPSICUM shape captures externalised Outcome with `cap:stateOf` and `cap:triggers` — the BACM CAP-7/VS-3 gap closed at the schema level. AgentCharter binds to exactly one Capability via `cap:chartersAgentFor` — the PRD's "capability boundary IS authority boundary" principle made formal.
3. **The dual-field bug is preventable, not just patchable.** C1+C2 turn a class of recurring scaffold bugs (silent `?? fallback` reads) into validation-time errors. Once this is wired into pipeline output, the bug class is closed.
4. **The OSS contract has a publishable shape.** The 20 KB JSON-LD bundle has a stable `@context`, type aliases (`ValueStream`, `Capability`, `AgentCharter`), and is plugin-readable without our internals. This is what Layer 1 of the OSS strategy would publish at `https://capsicum.plausibleba.org/contexts/v0.json`.

## What's Deliberately Out of Scope (For the SPAR to Press On)

This is the 30% version. The full picture has at least these gaps:

1. **SHACL-SPARQL ≠ SHACL.** The four constraints are SPARQL queries, not formal SHACL shapes. Real SHACL gives shape composition, severity levels, message templates, and is what CAPSICUM specifies for Terms. For the spike, SPARQL ASK is the same compilation target SHACL-SPARQL uses internally — fair simplification, but a production runtime needs a SHACL engine layered on top of the SPARQL one. Candidates: integrate `rdf-validate-shacl` (rdf-ext stack — bridging cost), or build a thin SHACL→SPARQL translator that emits queries oxigraph can run natively.
2. **Entitlements as opaque blobs.** AgentCharter has `chartersAgentFor` (the boundary) but not the deontic norm tuples ⟨operator, source, applicability, provenance⟩ from the framework. The full GSM kernel (E function, ε₁..ε₄, V tri-valued function) is not modelled. The shape *can* host them — that's the point — but this spike doesn't.
3. **No scale test.** 239 quads is trivial. The Insurance Reference Model is ~1,679 capabilities × 24 VS × 112 stages — at minimum 100x bigger. Oxigraph is a Rust engine compiled to WASM; the public benchmarks suggest this should be fine, but it needs to be validated against a real reference model before locking the runtime decision.
4. **No browser-bundle measurement.** The `oxigraph` WASM blob is 3.4 MB uncompressed; `jsonld.js` is 200 KB minified. That's ~3.6 MB of new payload for the open-core. In a Vite SPA with code-splitting, this is fine for the workbench/edit modes but should be lazy-loaded — first page load shouldn't pay for it.
5. **No migration tooling.** The fixture was hand-built. The real path needs: (a) read existing v4/v5 scaffold JSON, (b) translate to CAPSICUM JSON-LD via a one-time migration, (c) keep both shapes loadable for a transition window. None of that exists in the spike.
6. **No Purpose Layer.** SP cells (Goal/Strategy/Policy → Objective/Tactic/Control → Capability/ValueStream/Constraint) are not represented beyond the two cells the spike needed. Per your ruling, Capability and ValueStream sit at REALISE — that's how the shape is written, but the rest of SP is empty.

## Recommended Next Move

Proceed to the red-team SPAR with this spike as the artefact. The challenge to pressure-test is the same one I flagged before:

> "Do you actually need RDF at v0.6, or can you ship typed property-graph now and migrate to RDF when the GSM kernel work starts?"

The spike strengthens the "RDF now" answer because: (a) the JSON-LD bundle is *already* the OSS contract — switching graph runtime later means re-publishing the contract, which is the worst kind of breaking change; (b) the SHACL-SPARQL constraints catch real current bugs *today* without the GSM kernel needing to exist yet; (c) the runtime cost (3.4 MB WASM, lazy-loaded) is bounded and measurable.

But that's exactly the kind of position that benefits from a sceptical voice. Recommend: bring this report + the green spike to a one-shot SPAR with a reviewer who has shipped a graph DB in production. Two specific open questions:

1. **Property graph vs. RDF.** Is there a Cypher/typed-edge equivalent that gets us 80% of the value at a lower runtime cost? Probably not, given SHACL specifies our Terms — but worth challenging.
2. **`oxigraph-wasm` vs. server-side oxigraph for Layer 3.** The Foundation's hosted platform license (Layer 3 of the OSS strategy) needs multi-user. Same engine, different deployment? Or different engines, same JSON-LD contract? The bundle portability principle says the latter should be possible.

If the SPAR endorses the direction, the path forward is:
- Lock the decision in `DEC-NNN` per SPAR protocol — explicitly amend DEC-108 (Supabase + JSONB).
- Stand up a `packages/graph/` workspace in the monorepo with the spike's runtime promoted from `spike/`.
- Build the v4/v5 → CAPSICUM JSON-LD migration tool against the IIBA reference model (real scale test).
- Sequence the wiring: scaffold-store reads switch to graph queries first; pipeline output stays in legacy shape during a transition window with one-shot import.

## Files in the Worktree

```
spike/graph-runtime/
├── package.json
├── tsconfig.json
├── REPORT.md                          ← you are here
├── claims-settlement.bundle.jsonld    ← 20 KB published-shape artefact
└── src/
    ├── shape/capsicum.ttl
    ├── fixtures/claims-settlement.ttl
    ├── 00-smoke.ts
    ├── 10-hydrate.ts
    ├── 20-validate.ts
    ├── 30-roundtrip.ts
    └── run-all.ts
```

Re-run with `cd spike/graph-runtime && npm run all`.
