# Design Sparring Protocol

## Purpose
This protocol governs how design decisions are made for the VCC project. It ensures architectural decisions are challenged before code fossilises them, and that the outcomes are recorded.

## When to Spar
- Before building any new package or major feature
- When external critique or competing designs are available
- When a design decision has long-term consequences (schema changes, API contracts, CLI interfaces)
- When the reviewer flags structural risks

## Participants
- **Terry (Architect)**: Domain authority, quality gate, final decision maker. Integrates opposing views and decides when to lock.
- **Claude (Implementer)**: Proposes designs, builds, tests. Brings implementation perspective — what's feasible, what's complex, what's fragile.
- **External Reviewer (Challenger)**: Pushes conceptual coherence and structural rigour. Identifies failure modes, epistemic risks, and over-engineering.

## Sparring Phases

### Phase 1 — Before Building
Bring one of:
- A design draft
- Competing alternatives
- External critique

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

## Decision Record Format

Every spar session ends with an entry in DECISIONS.md:

```
### DEC-NNN: <Topic> (<Date>)

**Context:** Why this decision was needed.

**Decided:**
- What we committed to
- Specific choices made

**Deferred:**
- What we intentionally postponed
- Trigger condition for revisiting

**Tensions:**
- Named tradeoffs (e.g., rigour vs speed, determinism vs flexibility)

**Rationale:** Why this decision, not the alternatives.
```

## Red Team Sparring (Periodic)

Occasionally run a red team spar:
- "How could this architecture fail in front of a hostile board?"
- "What would a sceptical enterprise architect say about this?"
- "Where does this look like demo theatre instead of real analysis?"

This sharpens robustness without bloating design.

## Anti-Patterns
- **Defending prematurely** — hear the critique fully before responding
- **Over-engineering in the spar** — design the 30% version, not the 100% version
- **Relitigating settled decisions** — check DECISIONS.md before raising a topic
- **Sparring without building** — every spar must end with a clear "build this" output
