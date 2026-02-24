# Value Cognition Canvas (VCC)

Governance intelligence tool for boards to visualize governing friction in AI-accelerated enterprises. Built on the CAPSICUM Framework (Roach 2011).

## Project Structure

```
vcc/
├── CLAUDE.md              # AI assistant project context
├── DECISIONS.md           # Architecture decision log
├── README.md
├── .gitignore
├── schemas/               # Canonical JSON Schemas (contract-first)
├── specs/                 # Specification documents
├── fixtures/
│   ├── golden/            # Known-good test fixtures
│   ├── negative/          # Invalid fixtures for error-path testing
│   ├── paired-negative/   # Paired valid/invalid fixture sets
│   └── semantic-negative/ # Structurally valid but semantically invalid
└── packages/
    ├── shared/src/        # Schemas, types, validators (shared code)
    ├── backend/src/       # Express.js REST API
    └── frontend/src/      # React canvas UI
```
