# PlausibleBA — BA Skills for Claude

**Just enough business architecture. For every BA, on every project.**

PlausibleBA gives business analysts the business architecture techniques they need
to ground their work — capability mapping, concept modelling, value stream design —
without requiring a business architecture practice or a BIZBOK certification.

Each skill encodes a proven methodology, walks you through it step by step, and
produces a professional artefact your stakeholders will recognise. The result is
architecture-quality thinking delivered at BA speed.

---

## Why business architecture for BAs?

Business architects have a toolkit that BAs have largely left on the table:
capability maps that ground requirements in what the organisation actually does,
concept models that eliminate ambiguity about what terms mean, value streams that
show how capabilities orchestrate to deliver outcomes.

These aren't enterprise architecture exercises. Used at project scope, they make
every other BA technique more rigorous — stakeholder analysis, requirements
elicitation, gap analysis, solution design. PlausibleBA makes them accessible.

---

## Installation

### Claude Cowork (recommended)

1. Open Cowork → Plugins → Browse → Personal → **+**
2. Select **Add marketplace from GitHub**
3. Enter: `plausibleba/ba-skills`
4. Install the plugins you need

### Claude Code (CLI)

```bash
claude plugin marketplace add plausibleba/ba-skills
claude plugin install ba-capability-mapping@ba-skills
claude plugin install ba-concept-model@ba-skills
claude plugin install ba-value-streams@ba-skills
```

### Other AI assistants

The `skills/*/SKILL.md` files follow the universal skill format and work with any
tool that supports skill files. The `/slash-commands` are Claude-specific.

---

## Available skills

### `ba-capability-mapping` — v1.0.0 ✅

Map what the business can do. Produce a MECE, investment-relevant capability map
from any input — transcripts, charters, existing spreadsheets, or industry reference
models. Grounded in BIZBOK principles and validated against BABOK technique standards.

**Command:** `/capability-map`

**What you get:**
- Two-checkpoint elicitation: L1/L2 confirmed before L3 derivation
- MECE validation at every level with Execution/Governance split
- Hierarchical numbering (`1.2.3`) — sort column A to see the full structure
- 4-tab XLSX: Summary, Capability Register, Validation, Legend
- JSON for VCC pipeline integration

**Example output:** [`examples/portfolioprop_capability_map_v2.xlsx`](examples/portfolioprop_capability_map_v2.xlsx)

---

### `ba-concept-model` — v1.0.0 ✅

Name and define the things the business manages. Produce a typed taxonomy of core
business objects — cross-validated against the Capability Map to confirm every
capability is grounded and every object is covered.

Uses the **Capsicum Triad** (Party / Record / Resource) — a principled three-type
classification consistent with REA (McCarthy 1982) and Bunge's ontology for
information systems. A custom hierarchy option is also offered.

**Command:** `/concept-model`

**What you get:**
- Classification Checkpoint: choose Capsicum Triad or custom hierarchy
- Object Register with type, definition, lifecycle states, and related capabilities
- Cross-validation: object ↔ capability coverage confirmed both directions
- 4-tab XLSX: Summary, Object Register, Validation, Legend
- JSON for VCC pipeline integration

**Example output:** [`examples/portfolioprop_concept_model_v1.xlsx`](examples/portfolioprop_concept_model_v1.xlsx)

---

### `ba-value-streams` — v1.0.0 ✅

Map how the business delivers value. Decompose a value stream into 4–8 stages,
each with entry/exit criteria, participating capabilities, and business objects in
play. Cross-validates both the Capability Map and Concept Model.

**Command:** `/value-stream`

**What you get:**
- Recipient-centric stage naming (state reached, not activity performed)
- Entry/exit criteria at every stage
- Capability cross-reference: unused capabilities flagged, gaps identified
- Layout zone assignment for VCC network view (auto-inferred from Recipient type)
- 4-tab XLSX: Summary, Stage Register, Validation, Legend
- `ba-skills-bundle.json` for VCC import

**Example output:** [`examples/portfolioprop_value_stream_v1.xlsx`](examples/portfolioprop_value_stream_v1.xlsx)

---

## The full pipeline

Run all three skills in sequence on the same engagement and you get a complete,
cross-validated operating model slice:

```
/capability-map    What the organisation can do
      ↓
/concept-model     What the organisation manages
      ↓
/value-stream      How the organisation delivers value
      ↓
ba-skills-bundle.json   →   VCC session
```

The `ba-skills-bundle.json` is the handoff to the
[Value Cognition Canvas](https://www.plausibleba.com/vcc) — a facilitated session
tool for operating model assessment, friction identification, and investment
prioritisation.

**Example bundle:** [`examples/portfolioprop_ba-skills-bundle_v1.json`](examples/portfolioprop_ba-skills-bundle_v1.json)

---

## The PlausibleBA Taxonomy Standard

All skills share a common standard ensuring artefacts from the same engagement
fit together:

- **Numbering:** `1.2.3` positional format; sort by Number to see the hierarchy
- **Column order:** consistent across all XLSX outputs
- **MECE:** mutually exclusive and collectively exhaustive at every level
- **Cross-taxonomy traceability:** Business Objects as the shared thread
- **Branding:** consistent PlausibleBA header on all XLSX outputs

See [`ba-capability-mapping/skills/ba-taxonomy-standard/SKILL.md`](ba-capability-mapping/skills/ba-taxonomy-standard/SKILL.md)

---

## Coming next

| Skill | What it answers | Status |
|-------|----------------|--------|
| `ba-ppit-mapping` | How well do we do it? (People/Process/Information/Technology) | In development |
| `ba-requirements` | What do we need to change? | Planned |
| `ba-stakeholder-analysis` | Who is affected and how? | Planned |

---

## About

PlausibleBA is built on the [Capsicum Framework](https://www.plausibleba.com) —
a formal approach to business architecture grounded in real delivery experience.
The skills encode practitioner judgment: not just what to produce, but how to
think through it.

The name is intentional. *Plausible BA* — the business analyst who does just enough
architecture to make the work rigorous. *Plausible Business Architecture* — formal
enough to be defensible, accessible enough to be used on any project.

Questions, issues, contributions: [open an issue](https://github.com/plausibleba/ba-skills/issues).

---

*Generated by the PlausibleBA Skills Library | [www.plausibleba.com](https://www.plausibleba.com)*
