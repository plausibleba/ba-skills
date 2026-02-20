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
