# Decision Log

| ID | Decision | Rationale | Date |
|----|----------|-----------|------|
| DEC-001 | TypeScript strict mode (no `any` types) | Type safety across the entire codebase; catches errors at compile time | 2026-02-20 |
| DEC-002 | AJV 8.x strict for schema validation | Contract-first design requires strict JSON Schema validation; `additionalProperties: false` everywhere | 2026-02-20 |
| DEC-003 | Vitest for testing | Fast, TypeScript-native test runner with good DX and ESM support | 2026-02-20 |
| DEC-004 | Monorepo structure (shared/backend/frontend) | Shared package holds schemas, types, and validators used by both backend and frontend | 2026-02-20 |
| DEC-005 | ValidationReport v3 as runtime contract | Standardized validation output format for all 14 rules; deterministic and serializable | 2026-02-20 |
| DEC-006 | React 18+ with Zustand and Tailwind | Lightweight state management (Zustand) and utility-first CSS (Tailwind) for the governance canvas UI | 2026-02-20 |
| DEC-007 | Express.js for backend API | Stateless REST API; simple, well-understood, sufficient for v1 scope | 2026-02-20 |
| DEC-008 | Phased validation execution (chain rules gated on ref/cycle integrity) | V-SCAFFOLD-07/08 only run when V-SCAFFOLD-01 (ref integrity) and V-SCAFFOLD-03 (no cycles) pass; prevents misleading errors from broken graphs | 2026-02-20 |
| DEC-009 | Schema validation gates semantic validation (Layer 1 blocks Layer 2) | AJV schema errors are returned immediately; semantic rules never run on structurally invalid input, avoiding null-ref crashes | 2026-02-20 |
| DEC-010 | `validateSemantic()` exported separately for direct testing | Existing unit tests use minimal synthetic objects that don't conform to full JSON Schema; `validateSemantic` bypasses schema layer for targeted rule testing | 2026-02-20 |
| DEC-011 | Export bundle uses SHA-256 per-artifact plus concatenated bundle hash | Per-artifact hashes detect individual tampering; bundleSha256 = SHA-256 of all artifact bytes in deterministic alphabetical path order (avoids chicken-and-egg: hash lives inside the ZIP manifest) | 2026-02-20 |
| DEC-012 | Frontend auto-detects scaffold vs heatmap by checking for `scaffoldId`/`heatmapId` | Single drop zone handles both file types; reduces user friction and eliminates need for separate upload workflows | 2026-02-20 |
| DEC-013 | Friction observations resolved to activities via reverse index | Non-Activity anchors (Metric, Role, Control, Capability, Constraint) mapped to activities through scaffold element references; enables observations anchored to any element type to appear on the canvas | 2026-02-20 |
| DEC-014 | Execution friction amber, governing friction red color coding | Execution (ProcessHandoff, TechnologyIntegration, DataSignal) in amber/orange; governing (DecisionAuthority, GovernanceRisk, IncentiveCapacity) in red; provides immediate visual distinction for board audiences | 2026-02-20 |

# VCC Decision Log

> Every technical decision recorded with rationale. Prevents relitigating. Shows evolution of thought.
> Spar sessions produce entries in the format defined in SPAR_PROTOCOL.md.

---

## Existing Decisions (DEC-001 through DEC-014)

> These were recorded during the build sessions. Preserve them as-is in the existing DECISIONS.md.
> The entries below show the NEW format for spar-driven decisions going forward.

---

### DEC-015: Prompt Pack Generation Sequence (2026-02-20)

**Context:** Original prompt pack ordered by schema dependency (what references what). Reviewer and architect identified this doesn't match how a business architect actually discovers and models an enterprise.

**Decided:**
- Sequence follows analytical discovery order: ValueStream → Stages → Roles → Capabilities → Outcomes → Activities
- Activities prompt (Step 06) triggers major validation gate before depth is added
- Phase 1 limitation: single sequential chain model (no branching)

**Deferred:**
- Parallel/conditional branching in FSM (trigger: when a real engagement requires it)
- Agent pipeline for automated scaffold generation (trigger: after 3+ manual engagements)

**Tensions:**
- Schema dependency order vs analytical discovery order
- Modelling completeness vs Phase 1 simplicity

**Rationale:** You can't formalise what you don't understand. Discovery must precede formalisation.

---

### DEC-016: Evidence Classification for Friction (2026-02-20)

**Context:** Reviewer identified that "cover all 6 categories" creates fabrication risk. Board credibility requires every observation to be defensible.

**Decided:**
- Every friction observation must declare evidenceBasis: EVIDENCED | INFERRED | ASSUMED
- EVIDENCED requires source references in evidence array
- INFERRED requires structuralPattern object with patternType and scaffoldIndicators
- ASSUMED intensity hard-capped at 5
- Categories not forced — gaps declared honestly in coverage report

**Deferred:**
- Schema evolution to add evidenceBasis/structuralPattern to FrictionHeatmap.schema.json (trigger: when CLI validates friction)
- Automated structural pattern detection from scaffold (trigger: vcc run implementation)

**Tensions:**
- Board optics (full category coverage) vs epistemic honesty (only report what's supported)
- Quantitative precision vs meaningful confidence

**Rationale:** Fabricated friction destroys credibility faster than missing friction.

---

### DEC-017: Structural Constraint Scoring (2026-02-20)

**Context:** Binding constraint was identified heuristically ("which element appears most"). Reviewer correctly identified this as correlation logic, not throughput logic.

**Decided:**
- 5-factor scoring rubric: observationFrequency, authorityCentralisation, downstreamDependency, controlLayering, capacityConstraint (0-3 each, 0-15 total)
- Downstream Dependency ≥ 2 required for eligibility
- Capacity Constraint score 3 requires EVIDENCED observation
- Confidence derived as totalScore / 15 (not decorative)
- 3-5 candidates scored comparatively, all shown in output

**Deferred:**
- Weighted factors (all equal weight for now; trigger: when scoring produces counterintuitive results)
- Factor calibration from engagement data (trigger: after 5+ engagements)

**Tensions:**
- Scoring simplicity vs throughput accuracy
- Derived confidence vs empirical validation

**Rationale:** Boards will interrogate constraint logic. "It scored highest on authority centralisation and downstream dependency" is defensible. "It felt like the biggest problem" is not.

---

### DEC-018: CLI Architecture — Compiler First (2026-02-20)

**Context:** External architecture document proposed full orchestration platform (LLM calls, repair loops, drift detection, ingestion pipeline). Current need is to stop pasting JSON into Excel.

**Decided:**
- Four commands: vcc init, vcc validate, vcc assemble, vcc bundle
- No LLM calls in CLI — pure validation and assembly
- Lives in existing repo as packages/cli/, imports from @vcc/shared
- Immutable run folders: runs/<engagement>/<runId>/
- Mapping files as separate patch instructions (JSON Patch-style)
- Fixed patch order: controls → metrics → conditions
- Canonical JSON output (sorted keys, 2-space indent)
- Assembly metadata records mapping hashes for lineage

**Deferred:**
- vcc run (LLM orchestration) — trigger: when generate→validate loop is stable
- vcc diff (run comparison) — trigger: when 3+ runs exist for same engagement
- vcc explain (finding traceability) — trigger: after friction validation in CLI
- Repair loops — trigger: when failure modes are well understood
- Ingestion pipeline — trigger: when inputs exceed manual paste volume

**Tensions:**
- Tool-first (deliver value now) vs platform-first (build for scale)
- Automated repair vs loud failure
- Enterprise architecture vs pragmatic tooling

**Rationale:** Option A (compiler CLI) wins for one-operator presales context. Step contract (fragments + validation gates) preserves the seam for vcc run later without requiring a rewrite.

---

### DEC-019: Sparring Protocol Formalised (2026-02-20)

**Context:** Three-way sparring (architect, implementer, challenger) proved high-leverage for design quality. Need to make it repeatable.

**Decided:**
- SPAR_PROTOCOL.md added to repo root
- Every spar produces a Decision Record with Decided/Deferred/Tensions
- Phase 1 (before building), Phase 2 (after first draft, diff-review), Phase 3 (stop when clear)
- Periodic red team sparring for robustness

**Deferred:**
- Formal spar scheduling (trigger: when team size > 1)

**Tensions:**
- Thoroughness vs velocity
- Design rigour vs over-sparring

**Rationale:** The sparring process is part of the product quality. Formalising it prevents ad-hoc design and ensures decisions are recorded.

