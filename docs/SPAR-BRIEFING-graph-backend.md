# SPAR Briefing: Graph-Based Backend for VCC

**Filed:** 2026-04-15 (Session 34)
**Scheduled:** Post-BBC Toronto (late April 2026)
**Context:** The flat JSON scaffold with denormalised FK arrays has reached its expressiveness ceiling. This session should evaluate whether and how to transition to a graph-based backend.

---

## Why Now

Session 34 surfaced multiple symptoms that the current data model is fighting us:

1. **Dual field names** — `requiresCapabilityIds` (v4, canonical) vs `enabledByCapabilityIds` (v5 alias) on ScaffoldActivity. Caused cross-mapping results to be invisible in the Workbench Graph Explorer because the write-through used the wrong field. Fixed, but the root cause (no schema enforcement on field naming) remains.

2. **capabilityPPIT as compound blob** — PPIT is stored as a denormalised `Record<capId, PPITEntry>` on the Activity record. This is wrong on two counts: (a) it's on the Stage, not the Capability; (b) it bundles four relationship types into one blob instead of representing them as direct typed relationships (Cap→Role, Cap→Tech, etc.). The relationships already exist in the scaffold — they just need to be traversed from the Capability.

3. **graph-index.ts rebuilds a graph on every load** — effectively admitting the flat model isn't queryable. The graph index is the actual working data structure; the JSON scaffold is just a serialisation format that happens to also be the query target.

4. **Cross-mapping write-through hacks** — the enricher discovers typed relationships (`CrossMapInstance` in `crossMaps`), then has to manually push capability IDs into FK arrays on stage records so existing views can see them. Two separate data paths for the same semantic relationship.

5. **Reader-side fallback patterns everywhere** — `getCapabilityIds()`, `zone ?? layoutZone`, `enabledByCapabilityIds ?? requiresCapabilityIds` — all papering over inconsistencies that a schema-enforced graph would prevent.

6. **Insurance Reference Model stress test** — 1,600+ capabilities, 24 value streams, 112 stages. Required VS-scoped chunking, matching-capability filtering, and token estimation tuning. A graph backend with proper indexing would make these queries trivial.

---

## What the PDS Already Planned

The ProductDesignSpec v0.6 anticipated this transition:

- Ontology designed from the start to be **RDF-compatible** (ontology-schema.ttl, ontology-constraints.ttl, example-data.ttl)
- **SHACL constraints** specified for ontological validation
- **Turtle export** as a first-class output format
- Graph storage explicitly positioned as a **future-stage evolution**

DEC-097 (Data Architecture Trajectory) defined three steps:
1. Client-side graph index ← **DONE** (graph-index.ts)
2. Ontology-as-Schema validation ← **NOT DONE**
3. Client-side graph visualisation ← **PARTIALLY DONE** (StructuredGraphExplorer)

DEC-108 locked **Supabase + JSONB** as the backend, with the trigger for graph migration defined as "when you write three slow cross-project queries." The actual trigger has turned out to be **metamodel complexity**, not performance.

---

## Three Options to Evaluate

### Option 1: In-Memory Graph Layer (Lightest)

Replace `graph-index.ts` with a proper typed graph that becomes the **single query surface** for all views.

- JSON scaffold remains the persistence format (JSONB in Supabase)
- All reads go through the graph; the scaffold becomes a serialisation format
- Mutations go through the graph, which serialises back to JSON for persistence
- No infrastructure changes

**Pros:** Fixes the query problem immediately. No backend migration. Incremental — can evolve to Option 2/3 later.
**Cons:** Still a document store underneath. No cross-project queries. No server-side graph reasoning.

### Option 2: Client-Side Triplestore (Medium)

Introduce a lightweight embedded RDF-like store in TypeScript (e.g., Graphy.js, or a custom typed adjacency list with RDF semantics).

- Scaffold JSON becomes an import/export format
- Working model is graph-native with typed edges and SHACL-like validation
- Aligns with the PDS ontology-first philosophy
- CAPSICUM GSM maps naturally to RDF triples

**Pros:** Graph-native query semantics. Schema validation built in. CAPSICUM alignment. Still client-side — no infrastructure.
**Cons:** More complex migration than Option 1. Need to rewrite all scaffold reads. Performance on large models (1,600 caps) needs benchmarking.

### Option 3: Server-Side Graph DB (Fullest)

Neo4j, or a SPARQL endpoint behind the Supabase auth layer.

- Proper persistence with ACID transactions
- Powerful query languages (Cypher or SPARQL)
- Cross-project queries become trivial
- Natural home for CAPSICUM ontology
- Could serve as the foundation for the marketplace / reference model library

**Pros:** Most capable. Solves cross-project queries. Natural CAPSICUM alignment. Scales.
**Cons:** Significant infrastructure. Migration tooling needed. Reworked data flow for entire frontend. Operational complexity for a one-person team.

---

## Recommended Evaluation Approach

1. **Start from the metamodel audit** — `docs/VCC-Metamodel-Audit-v0.4.0.docx` documents every class, relationship, and known inconsistency. Use this as the source of truth for what needs to be represented.

2. **Prototype Option 1 first** — if an in-memory graph layer resolves the immediate pain (consistent reads, no write-throughs, PPIT as traversal), it may be sufficient for the v0.5 timeframe. This also serves as a proving ground for Option 2/3.

3. **Test against the Insurance Reference Model** — 1,679 capabilities, 24 value streams, 112 stages. If the graph layer handles this fluently, we're good. If it struggles, that's evidence for a server-side solution.

4. **Evaluate CAPSICUM GSM alignment** — the 9-tuple GSM (S, Σ, map, δ, u, s₀, F, E, T, ε) is inherently graph-structured. How naturally does each option represent it?

---

## Prior Architecture Decisions to Revisit

| Decision | Original Rationale | What Changed |
|----------|-------------------|--------------|
| DEC-108: Supabase + JSONB | Speed to multi-user; solo dev can operate | Metamodel complexity exceeds document model |
| DEC-110: Bundle as canonical | Same schema for storage, API, export | Graph backend would need import/export serialisation |
| DEC-097: Graph as future | No performance trigger yet | Trigger is now complexity, not performance |
| D-095: Ontology without repository | Deliberate separation | Repository may now be needed for ontology enforcement |

---

## Key Questions for the SPAR

1. Can we preserve bundle portability (JSON export/import) while moving to a graph backend?
2. What's the migration path for existing projects stored as JSONB in Supabase?
3. Does the CAPSICUM GSM formalism constrain which graph model we use (property graph vs RDF)?
4. Is there a hybrid where Supabase remains the auth/project layer and a graph DB handles the model data?
5. What's the minimum viable graph that resolves the current pain without over-engineering?

---

## Files to Read Before the Session

- `docs/VCC-Metamodel-Audit-v0.4.0.docx` — complete class/relationship/attribute reference
- `docs/ProductDesignSpec_EVSIP_v0_6.docx` — original ontology and architecture vision
- `docs/VCC_DesignSpar_Backend_Architecture.md` — prior backend SPAR briefing
- `docs/VCC_DesignSpar_Backend_Decisions.md` — DEC-108 through DEC-114
- `docs/ARCHITECTURE.md` — current architecture overview
- `types/capsicum.ts` — CAPSICUM framework types (the target ontology)
- `store/graph-index.ts` — current in-memory graph implementation
- `domain/cross-mapping-metamodel.ts` — typed relationship definitions
