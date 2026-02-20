# Value Cognition Canvas (VCC)

## Project Overview
Governance intelligence tool for boards to visualize governing friction in AI-accelerated enterprises. Built on CAPSICUM Framework (Roach 2011) — treats enterprise as finite state machine where stakeholder value interactions evolve through bounded states.

## Tech Stack
- **Runtime**: Node.js 22+ / TypeScript strict mode
- **Validation**: AJV 8.x strict
- **Backend**: Express.js (stateless REST API)
- **Frontend**: React 18+ / Zustand / Tailwind CSS
- **Testing**: Vitest
- **Build**: Monorepo (packages/backend, packages/frontend, packages/shared)

## Core Principles
1. **Contract-first**: JSON Schemas are canonical. Never invent fields not in schema. additionalProperties: false everywhere.
2. **Deterministic**: Same inputs must produce byte-identical outputs and hashes.
3. **No mutation**: All validators and generators are pure functions. Never mutate input objects.
4. **Referential integrity**: All ID references must resolve within the appropriate element map.
5. **FSM semantics**: Activities must have distinct pre/post outcomes (no no-ops). No cycles in nextActivityId chain.

## Validation Rules (14 rules)
### Scaffold (V-SCAFFOLD-01..08)
- 01: Referential integrity (all IDs resolve)
- 02: No no-op transitions (pre != post outcome)
- 03: No cycles in nextActivityId chain
- 04: ValueStream must have activities
- 06: No orphan metrics
- 07: Chain reachability (all VS activityIds reachable via nextActivityId)
- 08: Outcome chain consistency (adjacent activity outcomes match)

### Measure (V-MEASURE-01..02)
- 01: Current measures require measureAsOf timestamp
- 02: measureValue must parse according to measureDataType

### Friction (V-FRICTION-01..05)
- 01: Anchor referential integrity (anchorId in correct element map for anchorType)
- 02: Binding anchor must appear in at least one observation
- 03: Binding anchor must appear in the specific referenced observation
- 04: valueStreamId must exist in scaffold
- 05: scaffoldIntegrityHash must match computed scaffold SHA-256

## Scope Boundaries (v1)
**In scope**: Scaffold validation, canvas rendering, friction overlay, binding constraint, export/import integrity
**Explicitly deferred**: Runtime workflow execution, telemetry ingestion, automated metric calculation, simulation engine, multi-tenant SaaS, automatic inference, agents 10-12 (intervention/scenario)
