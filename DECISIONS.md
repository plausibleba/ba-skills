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
