# Spike A — Three-Way Runtime Comparison

**Filed:** 2026-05-08 (Session 37)
**Source:** DEC-122 partial-lock condition. Reviewer 1's prescription, refined after the briefing.
**Goal:** Decide between three candidate runtimes for the v0.6 graph layer at Insurance-reference-model scale.
**Time-box:** 3–5 days of focused work. Solo dev.

---

## What This Spike Tests

The DEC-122 lock leaves two operational questions open. This spike answers the **runtime engine selection** question.

The decision criterion is *not* "which is theoretically more correct" — it's:

> Which path gives VCC the cleanest contract, least semantic duplication, acceptable browser performance, and lowest solo-dev maintenance burden?

(Quoted from R1's revised recommendation.)

## The Three Paths

### Path 1 — `oxigraph-wasm` + bridged SHACL engine

- Same runtime the original spike used, scaled up.
- For SHACL, bridge `rdf-validate-shacl` over an oxigraph-extracted RDF/JS dataset, *or* implement a deliberately small SHACL→SPARQL translator (the second is higher long-term cost; the first is the recommended start).
- Strength: Rust-compiled, fast SPARQL, mature engine.
- Weakness: bus-factor (one main maintainer), 3.4 MB WASM payload, RDF/JS interop friction with the SHACL bridge.

### Path 2 — RDF/JS-native runtime (`rdf-ext` / `rdf-store-stream`) + `shacl-engine`

- All-RDF/JS stack: native interop with the SHACL engine, no bridging.
- Cypher-style or SPARQL-style query patterns via the RDF/JS query interface.
- Strength: native SHACL, broad maintainership across the RDF/JS ecosystem, cleaner internals.
- Weakness: slower than oxigraph on large graphs; the RDF/JS query story is less mature than oxigraph's SPARQL.

### Path 3 — Minimal typed-quad store + JSON-LD export + predefined traversals only

- A custom typed adjacency store (TypeScript classes, Map-of-Map indexes), no SPARQL exposed at all.
- JSON-LD export is the only contract; queries are predefined traversal functions written by hand.
- Strength: smallest payload, lowest operational complexity, no external runtime dependency.
- Weakness: every new query becomes hand-written code; no SHACL substrate; SHACL must be re-implemented as bespoke validation; doesn't preserve the GSM-hostability claim cleanly.

## Workload (Same For All Three Paths)

Build a fixture at **Insurance Reference Model scale**:
- 1,679 capabilities × 24 value streams × 112 stages
- Roles, Outcomes (externalised, with `stateOf` / `triggers`), Information Objects, Technology Apps, Cross-Stream Outcomes
- Generate using existing `domain/pipeline/cross-mapping-enricher.ts` test fixtures or hand-build the structural shape (capabilities and stages are the heavy nodes; full PPIT detail not required for runtime comparison)

Then run three workloads against each runtime path:

### W1 — Full graph hydration + JSON-LD round-trip
- Load shape + fixture into the runtime
- Dump as JSON-LD with the v0 `@context`
- Re-load the JSON-LD and verify graph identity (size, sample-triple equality, key SHACL constraints)
- Measure: load time, JSON-LD expansion/compaction time, peak memory

### W2 — Scoped validation
- Run SHACL constraints over (a) one value stream, (b) one capability family (parent capability + descendants), (c) the full model
- Measure: validation time, peak memory, SHACL report quality (does it identify focus nodes / paths / messages clearly?)

### W3 — Plugin-style traversal queries
- Three queries representative of real plugin workloads:
  1. *Board canvas view*: list all VS with stage counts and binding-constraint flags
  2. *Stage drilldown*: for one stage, return all required capabilities, performing roles, technology apps, pre/post outcomes
  3. *Authority-boundary inspection*: for one AgentCharter, list all transitively-enabled capabilities (the boundary's expansion)
- Measure: query latency, memory, query-expression complexity (how hard is each query to write?)

## Pass Criteria (per path)

| Criterion | Threshold |
|-----------|-----------|
| W1 load time, browser | < 5s acceptable; > 15s disqualifying |
| W1 peak memory, browser | < 500 MB acceptable; > 1 GB disqualifying |
| W1 JSON-LD round-trip identity | No semantic loss (size + spot checks must match) |
| W2 full-model SHACL | < 30s acceptable; > 2 min disqualifying |
| W2 SHACL report quality | Structured report with focus/path/severity (Path 3 will fail this — that's expected, will inform decision) |
| W3 query latency | < 200 ms for board-view; < 500 ms for stage-drilldown; < 1s for authority-boundary expansion |
| Browser non-freezing | UI thread must not block for > 100 ms during any of W1–W3 (lazy loading + workers acceptable) |
| Server-side path identical results | Same workload run server-side (Node) with same engine must produce identical query results |

## What Locks After This Spike

The runtime engine selection. If only one path passes, that's the runtime. If multiple pass, decide on:
1. *Maintainability / bus-factor* (RDF/JS-native is broader)
2. *SHACL fidelity* (Path 3 is disqualified)
3. *Solo-dev cost over the next 12 months* (custom code in Path 3 is high; Path 1 has moderate bridging cost; Path 2 is lowest)

## What Stays Open

- Pipeline migration sequencing — that's Spike B.
- GSM kernel evaluation — Phase 2 work, post-lock.
- Layer-2 authoring pathway — strategy spike, not architectural.

## Implementation Notes

- Worktree under `spike/graph-runtime/` (extend the existing spike rather than creating a parallel one). Add three sub-directories: `runtime-paths/oxigraph/`, `runtime-paths/rdfjs/`, `runtime-paths/typed-quad/`.
- Share the fixture across paths — generate once, load three times.
- Use Vitest for the workload runs so timings are reproducible.
- Capture results in `spike/graph-runtime/SPIKE-A-RESULTS.md` with a small comparison table.

## Exit Criteria

- All three paths attempted at the workload (or reasonable evidence one path is structurally disqualified).
- At least one path passes all criteria.
- Results document filed; recommendation surfaced for architect lock-in via DEC-122 amendment.

If two or more paths pass: the architect chooses based on the maintainability / fidelity / cost factors above. If none pass: re-scope (smaller workload? different runtime?) and re-spike.
