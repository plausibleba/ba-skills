# SPAR Synthesis — Graph Runtime / Metamodel Commitment

**Filed:** 2026-05-08
**Architect:** Dr Terry Roach
**Author of synthesis:** Claude (instance: Cowork architectural session)
**Status:** Draft Decision Record for architect review.

---

## Step 1 — Reviewer Scorecard

| Reviewer | Position | Single biggest risk they named | Confidence in their judgement |
|----------|----------|--------------------------------|-------------------------------|
| 1 — Graph-DB Veteran (GPT) | Endorse-with-amendments; **don't lock oxigraph-wasm yet** | "VCC accidentally creates two metamodels: CAPSICUM in RDF/SHACL on paper, hand-coded SPARQL/TypeScript validator in practice." (Refined from "semantic validation debt" after seeing the briefing.) | High. Specific, technically grounded, refined position after additional context. |
| 2 — Standards Sceptic (Gemini) | Endorse-with-amendments | "Namespace Fragility Trap" — flat unversioned namespace will break v1.0 within 12 months as governance failure allowing semantic drift. | High on the formal-ontology specifics; medium on scope-bounding (occasionally over-reaches into governance-kernel readiness). |
| 3 — Pipeline Architect (fresh Claude) | Endorse-with-amendments contingent on pipeline-side spike before lock | "The `stateOf` predicate has no source signal in the pipeline today" — pipeline doesn't populate RecordClass; reliance on hallucination or omission. | Highest. Reviewer actually read the pipeline source, traced the data flow, surfaced concrete file:line evidence. |
| 4 — OSS-Strategy Sceptic (GPT) | Endorse with amendments — "but not as currently framed" | "Standard-as-product confusion" — Apptio analogy treats CAPSICUM/JSON-LD/SHACL like a vocabulary when it's a formal metamodel; activation threshold mismatch. | High on commercial reasoning; minor factual correction received and integrated (Apptio→Vista 2018, IBM 2023). |

**No reviewer endorsed locking the decision as currently framed. All four converge on endorse-with-amendments.**

The technical axis (R1, R2, R3) and the strategy axis (R4) reinforce each other rather than diverge — both detected forms of the same underlying issue: the proposal is *technically directionally correct* but *operationally and ergonomically under-specified*.

---

## Step 2 — Convergent Objections

### Must-resolve (raised by 3 or 4 reviewers)

**MR-1. SPARQL-ASK as the canonical validation pattern is a trap.**
Surfaced by R1 ("two metamodels — CAPSICUM in RDF/SHACL on paper, hand-coded SPARQL/TypeScript validator in practice"), R2 ("uneven SHACL coverage"), and R3 ("SPARQL-ASK in-pipeline; full SHACL at bundle-publish boundary"). All three agree the spike pattern doesn't generalise to production. R1 is sharpest: every new semantic rule becomes a custom query, every query needs a custom error message, every migration version needs branching logic, and the validator becomes an ungoverned second metamodel.

**MR-2. Another spike is required before lock.**
All four reviewers explicitly require a follow-on spike. They each pick a different one — see Step 4 — but the unanimous "not yet ready to lock" signal is structural.

**MR-3. The decision needs to be re-framed, not just amended.**
R1 shifts emphasis after seeing the briefing: "constitutional platform decision," not just runtime choice. R2 frames it as a "governance failure" risk, not just versioning hygiene. R3 reframes the lock as "runtime + ontology shape locked, pipeline migration phased." R4 explicitly says "endorse, but not as currently framed." The original framing as a binary lock-or-don't-lock decision was too coarse.

### Should-resolve (raised by 2 reviewers)

**SR-1. Namespace and `@context` versioning must be addressed in v0, not deferred.**
R1 requires "explicit context versioning" to replace the architect's "bundle preserves portability" constraint. R2 makes this their biggest hidden risk. Underlying issue: the spike's flat `https://capsicum.plausibleba.org/ns/core#` namespace has no `/v0/` discipline, and the `@context` doesn't separate domain terminology from governance machinery via scoped contexts.

**SR-2. Deontic-operator vocabulary placeholders are needed in v0, not deferred.**
R1 says "add placeholder vocabulary for Entitlement, Term, Condition, Provenance, AuthoritySource, EvaluationScope earlier than you think." R2 calls deontic operators a "fidelity broken" gap — the spike collapses Permit/Prohibit/Obligation into a flat `classification` string. Underlying issue: deferring the GSM kernel evaluation is fine; deferring the *vocabulary the kernel will need* forces a future structural restructure.

**SR-3. AgentCharter generation belongs at Layer 4 (commercial), not Layer 1 (OSS pipeline).**
R3 surfaces this from the pipeline angle: "decision surface specification cannot be produced without grounding in actual UI examples and authority deontics, neither of which exist in any current pipeline output." R4 surfaces it independently from the strategy angle: the proprietary moat must be the entitlements specification engine + methodology + reference datasets, not just shape generation. Cross-axis convergence — exactly the kind of insight the four-reviewer structure was designed to surface.

**SR-4. The proprietary moat needs reframing.**
R4 directly: "best LLM-driven generator of a public spec is not by itself durable enough — LLM generation will commoditise." R1 implicit: RDF as bet on the future, not just response to current pressure. The strategic implication is that the durable moat is methodology + benchmark evidence + content partnerships + certification, with the entitlements specification engine (closer to research IP) more defensible than the scaffold engine.

### Flags (raised by 1 reviewer)

**F-1. Foundation governance casting-vote concern.** R4 only. The casting vote over licensing creates a perceived control concern that may surface in IIBA/Guild/Anthropic conversations. Out of scope for this SPAR but flagged for the Foundation-governance work that runs in parallel.

**F-2. Vertical-alignment derivation rules.** R2 only. CAPSICUM's framework reference itself flags this gap; R2 sketches a SPARQL Construct path. Strategic-implication concern, not a v0 blocker.

**F-3. ε₂ deontic-conflict validation as readiness gate.** R2 only. R2's "Conflict Trigger" spike is a strong test of governance-kernel readiness, but the architect explicitly deferred GSM-kernel evaluation. Move to phase 2 of the post-lock work.

---

## Step 3 — Divergent Objections

### Genuine divergence

**D-1. Which spike to run before locking?**

| What | R1 says | R3 says | My read |
|------|---------|---------|---------|
| The next spike | Three-way runtime comparison at Insurance reference scale (oxigraph-wasm vs RDF/JS-native + shacl-engine vs minimal typed-quad store) | Pass B against Water Filtration Co. transcript with modified prompt emitting `stateOf`, `triggers`, `primaryRecordClassId` | Both are right. They're testing different things. R3's spike answers "can the pipeline produce the metamodel?" — foundational. R1's spike answers "is oxigraph the right runtime?" — instrumental. They can run in parallel. **Resolution: do both.** |

**D-2. Property-graph alternative.**
R1's first pass suggested Memgraph/Neo4j-style property graph. After reading the briefing, R1 retracted this and recommended RDF/JS-native instead. So the property-graph alternative is *self-resolved* — even the reviewer who proposed it concluded it doesn't carry CAPSICUM's commitments cleanly enough. Do not pursue.

**D-3. JSON-LD as the open-core contract: machine vs human-facing.**
R4 says JSON-LD is the canonical *machine* contract but *not* the human-facing authoring contract; SDKs/OpenAPI/spreadsheet importers needed for content authors. R1, R2, R3 don't address this directly — but none of them contradict it. **My read: not a divergence so much as R4 surfacing a layer the technical reviewers didn't reach. Adopt R4's framing.**

### Apparent divergence that resolves

**AD-1. R1 suggests RDF/JS-native + `rdf-validate-shacl`; R3 says use SPARQL-ASK in-pipeline + full SHACL at bundle-publish.**
On first read these look contradictory. They're not. R1 is talking about the *runtime* validation layer (used at canvas/edit/inspection time). R3 is talking about *pipeline-time* validation feeding back into LLM repair loops. Two different points of validation with different requirements. Both can be true: pipeline gates use SPARQL-ASK with structured natural-language errors that the LLM can repair; runtime/publish gates use full SHACL via `rdf-validate-shacl` bridge.

---

## Step 4 — "Spike Before Locking" Aggregation

| # | Source | Spike | Tests | Effort | Recommendation |
|---|--------|-------|-------|--------|----------------|
| S-A | R1 | Three-way runtime comparison at Insurance reference-model scale (oxigraph-wasm / RDF/JS-native+shacl-engine / minimal typed-quad+JSON-LD-export) | Runtime selection + scale + memory + browser behaviour | ~3–5 days | **Run** in parallel with S-B |
| S-B | R3 | Pass B emits externalised Outcome from real transcript (Water Filtration Co.); ≥2/3 runs at temp 0 pass all constraints with ≤1 repair iteration | Pipeline producibility of metamodel | ~1–2 days | **Run** in parallel with S-A |
| S-C | R2 | Deontic conflict (ε₂) fixture with two overlapping AgentCharters; validator must flag conflict | Governance-kernel readiness | ~1 day | Defer to post-lock Phase 2 (GSM kernel ramp) |
| S-D | R4 | Layer-2 content authoring pathway: Excel/Word template → JSON-LD bundle + validation report | Adoption / authoring ergonomics | ~3–4 days | Defer to post-lock; this is strategy execution, not architectural validation |

**Decision:** Run S-A and S-B in parallel before locking the runtime. S-A is the runtime selection question; S-B is the foundational producibility question. S-C and S-D are part of the post-lock work plan, scheduled but not gating.

---

## Step 5 — Decision

**Outcome C: Run a second spike** — specifically two parallel spikes (S-A and S-B from Step 4).

But this is C-with-a-shape: large parts of the decision *can* be locked now without running the spikes, because all four reviewers agree on those parts. The spike pair is targeted at the residual questions.

### Lock now (no spike needed)

- **Graph is canonical, scaffold serialises it.** Unanimous endorsement.
- **CAPSICUM is the metamodel target** (not BACM). Settled by architect ruling, all reviewers respect it.
- **JSON-LD is the canonical machine contract.** Unanimous endorsement.
- **JSON-LD is *not* the practitioner-facing authoring contract** — SDKs, import templates, validation reports, visual authoring tools are part of Layer 1/2 commitment (R4 amendment, no contradiction from others).
- **SP-cell positioning:** Capability and ValueStream sit at REALISE row. (Architect ruling.)
- **AgentCharter generation is Layer 4 (commercial), not Layer 1 (OSS).** Convergent across R3 (pipeline can't produce) and R4 (moat needs proprietary depth).
- **DEC-108 (Supabase + JSONB) amended:** persistent layer's role demoted to blob store for serialised JSON-LD bundles plus auth/projects metadata.

### Lock now with required v0 additions

- **Versioned namespace strategy.** Adopt `/ns/core/v0/` discipline immediately. (R1 + R2.)
- **Scoped `@context`s** that separate domain terminology (`sp:`, `bv:`) from governance machinery (`gov:` for Entitlements/Terms/Conditions/Provenance). (R2.)
- **Deontic-operator vocabulary placeholders** in v0 shape: `Entitlement`, `Permit`, `Prohibit`, `Obligation`, `Term`, `Condition`, `Provenance`, `AuthoritySource`, `EvaluationScope`. Classes only — no evaluation logic. (R1 + R2.)
- **AgentCharter shape revised:** replace the flat `classification` string with explicit deontic-operator properties on the charter. (R2 amendment.)

### Lock pending spike outcomes

- **Runtime: oxigraph-wasm vs RDF/JS-native + shacl-engine.** S-A decides. Default toward RDF/JS-native if the perf gap is within acceptable bounds at Insurance-scale, because it lowers the bus-factor and the bridging cost for SHACL.
- **Pipeline migration sequencing:** S-B determines whether `stateOf` can be reliably populated from real transcripts. If yes, hard-cutover internal + dual-shape loader external. If no, phase the externalisation: stateOf-only first, triggers second, AgentCharter (Layer 4) third.

### Defer with explicit phasing

- **Real SHACL engine** (vs SPARQL-ASK): bridge `rdf-validate-shacl` for runtime/publish-time validation; SPARQL-ASK retained as pipeline-gate pattern (R3's resolution of R1's concern).
- **GSM kernel evaluation** (ε₁..ε₄, V tri-valued function): Phase 2 work, after v0 lock. R2's ε₂ conflict spike runs at start of Phase 2.
- **Vertical-alignment derivation rules** (R2's strategic concern): Phase 3, longer horizon. The vocabulary placeholders ensure the metamodel can host this without restructure.
- **Foundation governance casting-vote** (R4): out of scope for this SPAR; flag for the Foundation-governance work that runs in parallel and must precede formal IIBA/Guild/Anthropic conversations.

---

## Step 6 — Draft Decision Record (for `docs/DECISIONS.md`)

```markdown
## DEC-122: Graph Runtime / Metamodel Commitment (2026-05-08)

**Context:** The flat JSON scaffold reached its expressiveness ceiling. Symptoms documented in
Session 34's metamodel audit: dual capability-field names, PPIT as compound blob, write-through
hacks for cross-mapping, reader-side fallbacks. The agentic-enablement strategic vision (Session 37)
makes this decision higher-stakes: VCC's design surface is being repositioned as the published
specification layer for an open-source platform under the PlausibleBA Foundation, with JSON-LD
becoming the open-core contract and the entitlements specification engine becoming a proprietary
reference plugin grounded in CAPSICUM's GSM formalism.

**Decided:**
- Graph is canonical; scaffold (and JSON-LD bundle) serialises it.
- CAPSICUM is the metamodel target. BACM v1.0 and BIZBOK are downstream conformance check
  targets, not schema sources.
- JSON-LD bundle with a published `@context` is the canonical machine contract for the open core.
- Practitioner-facing surfaces (SDK, OpenAPI façade, Excel/Word import templates, visual authoring,
  validation reports in plain language) are committed Layer 1/2 deliverables, not optional polish.
- Capability and ValueStream sit at the REALISE row of the SP layer. (Restatement of D-121.)
- AgentCharter generation is Layer 4 commercial scope. Layer 1 OSS pipeline produces
  "Capability has AES score and classification" only.
- v0 namespace adopts `/ns/core/v0/` discipline; scoped `@context`s separate domain terminology
  from governance machinery; old `@context` URLs remain dereferenceable forever.
- Deontic-operator vocabulary placeholders included in v0 shape:
  Entitlement / Permit / Prohibit / Obligation / Term / Condition / Provenance / AuthoritySource
  / EvaluationScope. Classes only; no evaluation logic.
- AgentCharter shape replaces flat `classification` string with explicit deontic-operator properties.
- Validation strategy: SPARQL-ASK as in-pipeline gate (with structured natural-language errors for
  LLM repair loops); full SHACL via `rdf-validate-shacl` (or equivalent) at runtime/publish boundary.

**Decided pending spike outcomes (S-A, S-B):**
- Runtime engine: `oxigraph-wasm` or RDF/JS-native + `shacl-engine`. S-A decides at
  Insurance-reference-model scale.
- Pipeline migration sequencing: hard-cutover-with-dual-shape-loader vs phased externalisation
  (stateOf → triggers → AgentCharter). S-B decides.

**Amends:**
- DEC-108 (Supabase + JSONB): persistent layer's role demoted from "canonical model store" to
  "blob store for serialised JSON-LD bundles + auth/projects/metadata." JSONB ceases to be the
  semantic substrate.

**Deferred:**
- Real SHACL engine for runtime validation: bridge `rdf-validate-shacl` (preferred) once S-A
  resolves. Trigger: S-A complete + first user-facing validation report needed.
- GSM kernel evaluation (ε₁..ε₄, V tri-valued, deontic conflict detection): Phase 2 post-lock.
  Trigger: AgentCharter Layer-4 plugin work begins.
- Vertical-alignment derivation rules (Goals → Capabilities formal inference): Phase 3.
  Trigger: research programme stage 2 outputs.
- Layer-2 content-authoring pathway (R4 spike S-D): post-lock, gated by SDK/OpenAPI work.

**Tensions identified by SPAR reviewers:**

Convergent (must-resolve):
- SPARQL-ASK as production validation pattern would create a hand-coded second metamodel
  (R1, R2, R3). Resolved by validation-strategy split: SPARQL-ASK in-pipeline only, full SHACL
  at bundle boundary.
- AgentCharter generation cannot be Layer-1 pipeline output (R3 pipeline angle, R4 strategy
  angle, cross-axis convergence). Resolved by scope clarification.
- Namespace/context versioning is v0-load-bearing, not v1 polish (R1, R2). Resolved by
  /ns/core/v0/ discipline + scoped contexts adopted now.
- Deontic vocabulary placeholders are v0-load-bearing (R1, R2). Resolved by adding classes now
  with no evaluation logic.

Divergent:
- Which spike to run before lock (R1 runtime vs R3 pipeline). Resolved: both run in parallel.
- Property-graph alternative (R1 first pass). Self-resolved by R1's revised position after
  reading the briefing.

**Rationale:**
Four-reviewer SPAR (technical: runtime / standards / pipeline; strategy: commercial-OSS) all
endorsed the direction with amendments. The unanimity on direction (graph canonical, CAPSICUM
target, JSON-LD contract) is strong evidence the proposal is right at the level of strategic
intent. The unanimity on "not yet locked as framed" is strong evidence the proposal was
under-specified at the level of operational and ergonomic implementation. The synthesis splits
the lock: principles and shape decisions lock now (with R1+R2's v0 additions); runtime selection
and pipeline migration sequencing lock after S-A and S-B.

**SPAR materials:**
- Briefing, role prompts, reviewer responses: `spike/graph-runtime/spar/`
- Synthesis (this document): `spike/graph-runtime/spar/SYNTHESIS.md`
- Reviewer responses archived in: `docs/spar-archive/dec-122/`
```

---

## Step 7 — Archive (operational)

Action items:
1. Create `docs/spar-archive/dec-122/` and copy the four reviewer responses verbatim.
2. Append DEC-122 (text from Step 6 above) to `docs/DECISIONS.md`.
3. Cross-reference DEC-122 from `docs/CURRENT-STATE.md` (architecture section).
4. Update `docs/CHANGELOG.md` for v0.6 with the SPAR outcome and the two pending spikes.

---

## Step 8 — Implementation Sequencing (post-lock plan)

**Phase 0 — Pre-lock spikes (parallel, ~1 week wallclock)**
- S-A: Three-way runtime comparison (R1's spike).
- S-B: Pass B externalised-Outcome producibility (R3's spike).

**Phase 1 — v0.6 lock and shape publication (~2-3 weeks)**
- Promote `spike/graph-runtime/` → `packages/graph/` with proper monorepo wiring.
- v0 shape publication: namespace `/v0/` URLs, scoped `@context`s, deontic vocabulary placeholders, revised AgentCharter shape.
- v4/v5 → CAPSICUM JSON-LD migration tool against IIBA reference model (validates scale claim).
- Scaffold-store reads switch to graph queries with transition window (dual-shape loader).
- Pipeline outputs intermediate JSON shape; deterministic transformer maps to JSON-LD (R3's recommendation).
- SPARQL-ASK validation gates wired in pipeline; SHACL-via-`rdf-validate-shacl` at bundle-publish boundary.

**Phase 2 — GSM kernel ramp (post-v0.6, timing depends on Anthropic partnership)**
- S-C: deontic conflict (ε₂) fixture and validator readiness.
- AgentCharter Layer-4 plugin: deontic norm tuples ⟨operator, source, applicability, provenance⟩, decision surface specification grounded in real customer assets.
- Translation Integrity pipeline first implementation.

**Phase 3 — Strategy execution (parallel with Phase 1-2)**
- S-D: Layer-2 authoring pathway (R4's spike). Excel/Word template → JSON-LD bundle + plain-language validation report.
- SDK + OpenAPI façade for plugin developers.
- Foundation governance refinement: cleaner casting-vote separation (R4 amendment) before formal IIBA/Guild/Anthropic conversations.
- Moat repositioning: methodology + reference datasets + benchmark evidence + certification regime documented.

**Phase 4 — Vertical-alignment formalisation (longer horizon, research-driven)**
- SPARQL Construct rules deriving operational Capabilities from strategic Means (R2's path).
- Coordination with the research programme outputs.
