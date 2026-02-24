# IIBA Source Material Assessment

## What We Have

### 1. Value Streams Spreadsheet (`IIBA_Value_Streams_.xlsx`)
**Quality: Strong structural foundation**

6 value streams, each on its own sheet with consistent layout:
- VS name and purpose statement
- 4-6 stages per VS (29 stages total)
- Entry/exit criteria per stage
- Value items (outcomes) per stage
- Participating stakeholders per stage (multiple per stage)
- Metrics per stage (multiple per stage)
- Capabilities mapped to stages (multiple per stage)
- Empty fields for: Maturity, Painpoint, Risk, Ideas, Requirement, User Story

| Value Stream | Stages | Capabilities | Metrics |
|-------------|--------|-------------|---------|
| 1. Member Engagement & Retention | 5 | 15 | 11 |
| 2. Certification & Credential Lifecycle | 6 | 8 | 12 |
| 3. Knowledge & Standards Curation | 4 | 11 | 8 |
| 4. Community & Volunteer Engagement | 5 | 8 | 10 |
| 5. Partner & Institutional Engagement | 5 | 12 | 5 |
| 6. Thought Leadership & Advocacy | 4 | 11 | 4 |
| **Totals** | **29** | **~65 mapped** | **~50** |

### 2. Capability Map (`IIBA_Capability_Map.xlsx`)
**Quality: Comprehensive 3-level hierarchy**

- 6 Level 1 Areas
- 24 Level 2 Domains  
- 95 Level 3 Capabilities
- Each capability has a Core Object and Description

L1 Areas: Member & Community Services, Credentialing & Professional Development,
Knowledge & Standards, Partner & Institutional Relations, Thought Leadership & Advocacy,
Enterprise Governance & Operations

### 3. Friction Lens Document (`IIBA_Value_Streams_-_Decision_Friction_Lens.docx`)
**Quality: Rich analytical content — indicative, not canonical**

~63K chars of decision-oriented friction analysis across all 6 value streams.
Contains qualitative friction observations, decision classification, governance
patterns, and structural recommendations.

Per your note: treat as indicative. Will redo friction analysis with additional
documentation and questionnaire responses.

---

## Assessment for Track A Ingest

### What Maps Cleanly to Scaffold Schema

| Scaffold Element | Source | Confidence |
|-----------------|--------|------------|
| Value Streams (names, descriptions) | VS spreadsheet | High |
| Activities (stages as activities) | VS spreadsheet | High |
| Outcomes (value items per stage) | VS spreadsheet | Medium-High |
| Entry/Exit criteria (pre/post outcomes) | VS spreadsheet | Medium-High |
| Capabilities (mapped per stage) | VS spreadsheet + Cap Map | High |
| Roles (participating stakeholders) | VS spreadsheet | Medium |
| Metrics (per stage) | VS spreadsheet | Medium |

### What Needs Interpretation

1. **Stage names** — The spreadsheet has stage descriptions (narrative sentences)
   but not short stage names. We'll need to derive concise names from the descriptions.

2. **Capability identity resolution** — The VS spreadsheet has capability names that
   are close but not identical to the capability map entries. E.g. "Social Media &
   Marketing" vs "Social Media & Marketing" (with inconsistent spacing/newlines).
   Need normalisation and matching.

3. **Outcome semantics** — The "Value Item (Outcome)" field has outcomes like
   "Active membership; Welcome kit" which are value-oriented but not outcome-identity
   statements. For edge derivation between VS, we'll need to assess whether terminal
   outcomes of one VS match entry criteria of another.

4. **Stakeholder → Role mapping** — The spreadsheet lists stakeholder names
   (e.g. "Marketing Team", "Chapters", "Prospects") which are a mix of
   organisational units, roles, and external parties. Need classification.

5. **Controls** — Not present in the spreadsheet. Will need to be derived from
   governance/friction analysis or discovery questionnaire.

6. **Metrics → Measures** — Metric names exist but no baseline/target/current
   values. Discovery questionnaire Section 4 (Cycle Times & SLAs) may provide these.

### What's Missing for Full Scaffold

- Controls and governance gates (Section 1 of questionnaire)
- Measure values for metrics (Section 4)
- Volume/throughput indicators (Section 5)
- System/technology mapping (Section 6)
- Inter-VS dependencies (need outcome identity alignment)

### Recommended Approach

1. **Parse spreadsheet → IR** (Track A, no LLM)
   - Extract VS names, purposes, stages, outcomes, stakeholders, metrics, capabilities
   - Normalise capability names against capability map
   - Flag identity conflicts for reconciliation

2. **Generate scaffold from IR** (deterministic)
   - Derive stage names from descriptions
   - Chain outcomes (entry → exit per stage)
   - Map capabilities from normalised cap map
   - Assign roles from stakeholder lists

3. **Load into VCC** — Network View should work immediately
   (6 VS, derived edges from outcome matching)

4. **Friction analysis later** — when questionnaire + additional docs available,
   use Friction Signal Agent against canonical scaffold
