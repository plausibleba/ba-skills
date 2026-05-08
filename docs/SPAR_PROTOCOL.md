# Design Sparring Protocol

_Last revised: 2026-05-08 (post DEC-122 four-reviewer round)_

## Purpose
This protocol governs how design decisions are made for the VCC project. It ensures architectural decisions are challenged before code fossilises them, and that the outcomes are recorded.

## When to Spar
- Before building any new package or major feature
- When external critique or competing designs are available
- When a design decision has long-term consequences (schema changes, API contracts, CLI interfaces, published OSS contracts)
- When the reviewer flags structural risks
- **When the decision crosses more than one axis** — technical *and* commercial, or technical *and* standards-conformance. Single-axis decisions need fewer reviewers; multi-axis decisions benefit from the four-reviewer pattern below.

## Participants
- **Terry (Architect)**: Domain authority, quality gate, final decision maker. Integrates opposing views and decides when to lock.
- **Claude (Implementer)**: Proposes designs, builds, tests. Brings implementation perspective — what's feasible, what's complex, what's fragile.
- **External Reviewers (Challengers)**: Push conceptual coherence and structural rigour. Identify failure modes, epistemic risks, and over-engineering. Choose by *axis* (see below), not by model brand.

## Sparring Phases

### Phase 1 — Before Building
Bring one of:
- A design draft
- Competing alternatives
- External critique
- A working spike that exercises the decision against real (or realistic) data

The spar produces a **Decision Record** (see format below) with:
- 🔒 **Decisions Locked** — what we commit to build
- ⏳ **Deferred** — what we know we'll revisit, with trigger conditions
- ⚡ **Tensions Identified** — named tradeoffs that shaped the decision

### Phase 2 — After First Draft
Review is focused, not exhaustive:
- Send only changed files or changed sections
- Review diff-style, not whole-document
- Reviewer's time is expensive — narrow the surface

### Phase 3 — When to Stop
Stop sparring when:
- The architecture is coherent
- The implementation path is clear
- Remaining discussion is edge cases or hypotheticals

At that point: **build**. Over-sparring is as dangerous as under-sparring.

---

## The Four-Reviewer Pattern (Multi-Axis Decisions)

For decisions that cross more than one axis (technical + commercial, technical + standards, etc.), assign reviewers by axis rather than by model brand. The DEC-122 spar (graph runtime / metamodel commitment) demonstrated the pattern; it's now the recommended default for major architectural decisions.

### Roles to Assign

For a v0.6-class decision the four roles are typically:

1. **Runtime / Implementation Veteran** — challenges the runtime choice, hidden operational costs, scalability, maintainability. *Priors needed:* shipping similar systems at production scale.
2. **Standards / Ontology Sceptic** — challenges whether the formal expression survives the ontology's real semantic load; coverage of constraint languages; durability of published contracts. *Priors needed:* W3C / OMG / ISO formal-spec experience.
3. **Pipeline / Producibility Reviewer** — challenges whether the proposal can actually be produced by the system's existing generation paths (LLM pipelines, build systems, etc). *Priors needed:* the codebase itself; this reviewer must read source.
4. **Commercial / OSS-Strategy Sceptic** — challenges whether the technical decision earns its keep against the platform strategy that justifies it. *Priors needed:* platform strategy, OSS business models, partner ecosystem design.

Other axes are possible (security, regulatory, accessibility) — the principle is *one reviewer per axis*, with axes chosen for the decision at hand.

### Choosing Models

Choose for diversity of priors, not for model-family completism:
- **Different model families** for technical reviewers (e.g., GPT for runtime, Gemini for standards) — exploits training-distribution differences.
- **Fresh Claude session with codebase access** for the pipeline/producibility reviewer — deep context-gathering pays for itself when the question requires reading source. *(DEC-122 R3 was the highest-information review of the four; this pattern is the default for any decision involving codebase architecture.)*
- **Same model family is fine for two reviewers if they take different sessions and different briefs** — diversity comes from independent challenge, not exclusively from model architecture.

### Two-Pass Review (Optional but Recommended)

Allow runtime/implementation reviewers to revise their position after seeing the full briefing. The DEC-122 R1 first-pass-without-briefing recommendation differed materially from second-pass-with-briefing recommendation, and the second pass was the more useful one. Build this into the role prompt explicitly: *"After your first read, request any briefing material you weren't initially sent and revise your position if context changes it."*

### Cross-Axis Convergence as Strongest Signal

Watch especially for the same conclusion arriving independently from reviewers on different axes. In DEC-122 the AgentCharter-is-Layer-4 conclusion arrived independently from the pipeline reviewer (R3 — the LLM can't produce decision surfaces without UI grounding) and the strategy reviewer (R4 — the proprietary moat needs the entitlements engine specifically). Cross-axis convergence is the strongest possible signal that the conclusion is structural rather than situational. Treat it as a must-resolve in the synthesis.

### Briefing Discipline

For multi-axis SPARs, prepare:
- A **shared briefing** that all reviewers read first, naming the decision under review, the architect's position, what's settled, what's up for grabs.
- **Per-axis role prompts** that scope each reviewer's challenges narrowly and direct them away from out-of-scope territory.
- **Cover notes in the architect's voice** for sending alongside the briefing.
- **A synthesis template** for combining responses into a Decision Record.

Templates in `spike/graph-runtime/spar/` (BRIEFING.md, REVIEWER-N-*.md, COVER-NOTES.md, SYNTHESIS-TEMPLATE.md, SYNTHESIS.md) are reusable scaffolds for future multi-axis SPARs.

---

## Decision Record Format

Every spar session ends with an entry in DECISIONS.md:

```
### DEC-NNN: <Topic> (<Date>)

**Status:** Locked / Partially locked (with conditions) / Pending second spike

**SPAR participants:** (if multi-reviewer)
- Reviewer 1 — <axis> — <model>
- Reviewer 2 — <axis> — <model>
- ...

**Context:** Why this decision was needed.

**Decided:**
- What we committed to
- Specific choices made

**Decided pending spike outcomes:** (if partial lock)
- Spike A — <name> — what it tests, success criterion
- Spike B — <name> — what it tests, success criterion

**Amends:** (if revising prior decisions)
- DEC-XXX — what changes about it

**Deferred:**
- What we intentionally postponed
- Trigger condition for revisiting

**Tensions identified by SPAR reviewers:** (multi-reviewer SPARs)
- Convergent must-resolve concerns and how they were resolved
- Divergent objections and how they were resolved (or which scenario was decided in)

**Rationale:** Why this decision, not the alternatives.

**SPAR materials:** (if applicable)
- Briefing, role prompts, reviewer responses, synthesis: <path>
- Reviewer responses verbatim: docs/spar-archive/dec-NNN/
```

## Partial Lock Pattern

A decision can be **partially locked** when:
- Reviewers agree on direction but disagree on a specific implementation choice that a small spike could resolve.
- The remaining question is *operational* (which engine? which sequencing?) not *strategic* (which architecture?).
- The cost of running the resolving spike is bounded (e.g., ≤1 week wallclock).

When partial-locking, the Decision Record explicitly names what's locked, what's pending which spike, and what triggers the second-pass entry to fully lock.

## Red Team Sparring (Periodic)

Occasionally run a red team spar:
- "How could this architecture fail in front of a hostile board?"
- "What would a sceptical enterprise architect say about this?"
- "Where does this look like demo theatre instead of real analysis?"

This sharpens robustness without bloating design.

## Anti-Patterns

- **Defending prematurely** — hear the critique fully before responding.
- **Over-engineering in the spar** — design the 30% version, not the 100% version.
- **Relitigating settled decisions** — check DECISIONS.md before raising a topic.
- **Sparring without building** — every spar must end with a clear "build this" output.
- **Mistaking unanimity for completeness** — four reviewers who all endorse-with-amendments is a more nuanced signal than four who endorse outright. Read the *amendments* as data, not just the headline position.
- **Lock-or-nothing thinking** — partial locks are a feature, not a compromise. They let principles ride forward while operational details are resolved by targeted spikes.
- **Skipping the synthesis** — the synthesis is the value-extraction step. Reviewer responses without synthesis become an archive nobody re-reads.

---

## Archival Discipline

Every multi-reviewer SPAR archives its materials under `docs/spar-archive/dec-NNN/`:
- The four (or N) reviewer responses verbatim.
- The synthesis document.
- Optionally, the shared briefing and role prompts for traceability.

The synthesis is duplicated to the archive *and* lives in the working area until the implementation completes; the working-area copy gets cleaned up on graduation, the archive copy is permanent.
