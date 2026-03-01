# F-003: Discovery Intake — Dual-Mode Scaffold Generator

**Feature spec for VCC presales workflow**
**Date:** 2026-03-01
**Status:** Proposed
**Owner:** Terry + Claude
**Decision log:** D-033, D-034, D-035

---

## Problem

The Puretec proof-of-concept demonstrated that a scaffold + heatmap can be generated from a discovery call transcript in a single LLM pass. But the output quality is bounded by what the transcript contains. Transcripts have gaps — the prospect mentions NetSuite but not which modules; they describe a pain point but don't name the capability it belongs to; the roles are implied rather than stated.

The consultant currently has no tool to:
1. Capture discovery signals in a structured way during the call
2. Know what gaps exist in their notes before trying to generate a scaffold
3. Get a richness score on their intake before committing to generation

This feature solves all three.

---

## What We're Building

A **dual-mode discovery intake interface** that sits upstream of scaffold generation.

**Mode A — Freeform Drop**: Paste or upload any transcript, meeting notes, email thread, or voice memo. The LLM extracts what it can into the structured template, then surfaces what's missing as explicit prompts.

**Mode B — Structured Form**: Fill a templated discovery form directly, field by field. Each field maps to a specific scaffold element. Completion indicators show what the generator needs.

Both modes converge on the same output: a **Discovery IR** (intermediate representation) that feeds the scaffold generator pipeline.

The consultant can move freely between modes — drop a transcript, get a pre-filled form, fill the gaps, generate.

---

## User Journey

### Entry point
New route: `/intake` or modal launched from Network View ("New Scaffold from Discovery")

### Mode A: Freeform drop

```
┌─────────────────────────────────────────────────────────┐
│  DROP TRANSCRIPT OR PASTE NOTES                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Paste meeting notes, transcript, email...      │   │
│  │                                                 │   │
│  │  [Drop file or paste here]                      │   │
│  └─────────────────────────────────────────────────┘   │
│  [Extract →]                                            │
└─────────────────────────────────────────────────────────┘
         │
         ▼ LLM extraction pass
         │
┌─────────────────────────────────────────────────────────┐
│  EXTRACTED — review and fill gaps                       │
│  Confidence: ████████░░ 78%  (12 of 15 fields)        │
│                                                         │
│  ✓ Company name            ✓ Industry                  │
│  ✓ Value streams (3)       ✓ Pain points (4)           │
│  ✓ Roles (5)               ✓ Tech stack (3)            │
│  ⚠ Stage count per VS      ⚠ Metrics (0 found)        │
│  ✗ Org size                ✗ Current IT owner          │
│                                                         │
│  [Review extraction]  [Fill gaps now]  [Generate anyway]│
└─────────────────────────────────────────────────────────┘
```

### Mode B: Structured form

Direct entry into the form. Same fields, same schema, no extraction step.

### Convergence: The Discovery Form

Both modes land on the same structured form. Pre-filled from extraction in Mode A. Blank in Mode B. Either way the consultant reviews, edits, and enriches before generating.

---

## Discovery Form Schema

### Section 1 — Organisation Context
Maps to: `scaffold.name`, `scaffold.description`, `elements.roles` (senior roles)

| Field | Type | Maps to | Required |
|-------|------|---------|----------|
| Company name | text | `scaffold.name` | ✓ |
| Industry | select (enum) | heatmap metadata, story matching | ✓ |
| Company size | select (enum) | heatmap metadata | ✓ |
| Brief description | textarea | `scaffold.description` | ✓ |
| Primary contact / accountable stakeholder | text | VS `accountableStakeholder` | — |

**Industry enum:** Financial Services, Healthcare, Retail, Technology, Manufacturing, Education, Nonprofit, Travel, Communications, Energy, Consumer Goods, Professional Services, Public Sector, Transportation, Real Estate, Automotive, Media, Life Sciences, Hospitality

**Company size enum:** 0–500, 500–1k, 1k–5k, 5k–10k, 10k–50k, 50k–100k, 100k–200k, 200k+

---

### Section 2 — Value Streams
Maps to: `elements.valueStreams`, `elements.activities` (stages)

One card per value stream. Up to 8 VS.

| Field | Type | Maps to | Required |
|-------|------|---------|----------|
| Value stream name | text | `valueStream.name` | ✓ |
| Description | textarea | `valueStream.description` | — |
| Zone | select (Ecosystem / Knowledge) | `valueStream.layoutZone` | ✓ |
| Stage names | tag input (ordered list) | `activity.name[]` | ✓ |
| Accountable role | text | `valueStream.accountableStakeholder` | — |

**Zone guidance** (tooltip):
- **Ecosystem**: Externally-facing streams. Customer acquisition, sales, service, partner channels.
- **Knowledge**: Internally-facing streams. Risk, compliance, operations, reporting.

**Stage count guidance**: 3–6 stages per VS optimal. Fewer than 3 = too coarse. More than 7 = check for nested sub-processes.

---

### Section 3 — Roles
Maps to: `elements.roles`, `activity.performedByRoleIds`

| Field | Type | Maps to |
|-------|------|---------|
| Role name | text | `role.name` |
| Type | select (Internal / External / System) | role metadata |
| Associated VS | multi-select | role assignment hints |
| Notes | text | used in PPIT inference |

**Extraction note:** Role names from transcript are often informal ("the guy who approves" → Approval Manager). The extraction pass normalises these but keeps the original for consultant review.

---

### Section 4 — Technology Stack
Maps to: `elements.technologyApps`, `capabilityPPIT.technologyAppIds`

| Field | Type | Maps to |
|-------|------|---------|
| System name | text | `technologyApp.name` |
| Type | select (CRM / ERP / Comms / Analytics / Field / Custom / Other) | `technologyApp.type` |
| Pain point linked | checkbox | used in friction inference |
| Notes | text | used in PPIT inference |

**Special flag:** "Is this system a friction source?" checkbox. Checked systems become candidate binding constraint anchors in heatmap generation.

---

### Section 5 — Pain Points & Friction Signals
Maps to: `heatmap.observations[]`, `bindingConstraint`

This is the richest section. One card per pain point.

| Field | Type | Maps to |
|-------|------|---------|
| Description | textarea | `observation.rationale` |
| Category | select (enum) | `observation.category` |
| Intensity (1–10) | slider | `observation.intensity.score` |
| Affected stage | select (from VS stages above) | `observation.primaryAnchor` |
| Affected role | select (from roles above) | `observation.contributingAnchors` |
| Affected system | select (from tech stack above) | `observation.contributingAnchors` |
| Is this the biggest bottleneck? | toggle | `bindingConstraint` candidate |

**Category enum:**
- Data / Signal friction
- Process handoff friction
- Governance / risk friction
- Incentive / capacity friction
- Decision authority friction

**Extraction behaviour:** The LLM assigns a draft category and score. Consultant adjusts. If multiple pain points are flagged as "biggest bottleneck," the one with the highest score becomes the binding constraint.

---

### Section 6 — Metrics & Outcomes (optional but high-value)
Maps to: `elements.metrics`, `elements.outcomes`

| Field | Type | Maps to |
|-------|------|---------|
| Metric name | text | `metric.name` |
| Current value | text | used in heatmap throughput calc |
| Target value | text | used in heatmap throughput calc |
| Associated stage | select | `activity.metricIds` |

**Extraction note:** Metrics are rarely stated explicitly in transcripts. The LLM flags candidate metrics from phrases like "takes 3 days," "we lose 20% at this step," "costs us $10k per incident." These become draft metrics for consultant confirmation.

---

### Section 7 — Controls & Governance (optional)
Maps to: `elements.controls`, `activity.controlIds`

| Field | Type | Maps to |
|-------|------|---------|
| Control name | text | `control.name` |
| Type | select (Policy / Regulatory / Internal / SLA) | control metadata |
| Associated stage | select | `activity.controlIds` |

---

## Confidence Scoring

Each section has a completeness score. The overall **Readiness Score** gates generation.

| Score | State | Action |
|-------|-------|--------|
| 0–40% | Insufficient | Cannot generate. Missing critical structure (VS names, stages). |
| 41–60% | Draft | Can generate stub scaffold. Warns: output will need enrichment. |
| 61–80% | Viable | Good generation. Customer stories will match. Heatmap will be approximate. |
| 81–100% | Rich | Full generation. High-confidence heatmap. Binding constraint well-evidenced. |

**Scoring weights:**
- Company + Industry: 10%
- Value streams with stage names: 35%
- Roles (≥3): 10%
- Tech stack (≥2): 10%
- Pain points (≥2 with category + anchor): 25%
- Metrics (≥1): 10%

---

## Extraction Pass — LLM Behaviour

When a transcript is dropped, a single LLM call extracts into the IR. System prompt governs extraction rules:

```
You are extracting discovery signal from a sales or consulting call transcript.
Your output is a structured JSON object matching the Discovery IR schema.
Rules:
- Extract only what is stated or clearly implied. Do not invent.
- Mark each extracted field with confidence: "high" | "medium" | "low"
- For low-confidence extractions, add an extractionNote explaining the ambiguity
- Flag gaps explicitly: list missing fields that would improve scaffold quality
- Normalise role names (e.g. "the person who approves" → "Approval Manager")
- Treat any mention of wait times, error rates, cost-per-incident as candidate metrics
- If multiple pain points exist, rank by implied severity from transcript tone
- Assign frictionCategory using these rules:
  - Missing/wrong data → DataSignalFriction
  - Handoff delays between teams/systems → ProcessHandoffFriction
  - Compliance, audit, regulatory exposure → GovernanceRiskFriction
  - Headcount/budget constraints → IncentiveCapacityFriction
  - Unclear who decides → DecisionAuthorityFriction
```

**Gap prompts:** After extraction, the interface surfaces specific questions for unfilled required fields. These are generated from the schema, not hardcoded. Examples:

- *"We found 3 value streams but no stage breakdown for 'Order Fulfilment'. How many steps does that process have?"*
- *"You mentioned NetSuite but it wasn't linked to a specific pain point. Is it a friction source?"*
- *"No metrics were found. Do you track time-to-close, error rates, or cost-per-case for any of these stages?"*

---

## Discovery IR Schema

The canonical intermediate representation produced by the form. This is the handoff to the scaffold generator.

```json
{
  "discoveryId": "disc-puretec-20260301",
  "createdAt": "2026-03-01T09:00:00Z",
  "source": "freeform_extraction" | "structured_form" | "hybrid",
  "readinessScore": 78,

  "organisation": {
    "name": "Puretec Water Filtration",
    "industry": "Manufacturing",
    "companySize": "500-1k",
    "description": "Adelaide-based manufacturer and distributor of water filtration products...",
    "accountableStakeholder": "Head of Technology"
  },

  "valueStreams": [
    {
      "vsRef": "vs-channel-sales",
      "name": "Channel Sales",
      "description": "...",
      "zone": "ecosystem",
      "stages": [
        { "stageRef": "stage-pre-visit", "name": "Pre-Visit Intelligence", "confidence": "high" },
        { "stageRef": "stage-account-brief", "name": "Account Brief", "confidence": "medium" }
      ],
      "accountableStakeholder": "Field Sales Rep",
      "confidence": "high"
    }
  ],

  "roles": [
    {
      "roleRef": "role-field-sales-rep",
      "name": "Field Sales Rep",
      "type": "Internal",
      "associatedVsRefs": ["vs-channel-sales"],
      "confidence": "high",
      "extractionNote": null
    }
  ],

  "technologyApps": [
    {
      "techRef": "tech-salesforce",
      "name": "Salesforce",
      "type": "CRM",
      "isFrictionSource": false,
      "confidence": "high"
    },
    {
      "techRef": "tech-netsuite",
      "name": "NetSuite",
      "type": "ERP",
      "isFrictionSource": true,
      "confidence": "high",
      "extractionNote": "Integration failure with Salesforce mentioned as 9-month overrun"
    }
  ],

  "painPoints": [
    {
      "ppRef": "pp-pre-visit-no-brief",
      "description": "Field reps have no consolidated account brief before customer visits...",
      "frictionCategory": "DataSignalFriction",
      "intensityScore": 9.5,
      "affectedStageRef": "stage-pre-visit",
      "affectedRoleRefs": ["role-field-sales-rep"],
      "affectedTechRefs": ["tech-salesforce"],
      "isBindingCandidate": true,
      "confidence": "high"
    }
  ],

  "metrics": [
    {
      "metricRef": "metric-admin-time",
      "name": "Admin time per rep per week",
      "currentValue": "3 days",
      "targetValue": "< 1 day",
      "affectedStageRef": "stage-pre-visit",
      "confidence": "medium",
      "extractionNote": "Derived from '3 days/week lost to admin' — confirm unit"
    }
  ],

  "controls": [],

  "gaps": [
    {
      "field": "valueStreams[1].stages",
      "severity": "required",
      "prompt": "No stage breakdown found for 'Order Fulfilment'. How many steps does that process have?"
    },
    {
      "field": "metrics",
      "severity": "recommended",
      "prompt": "Only 1 metric found. Do you track error rates or cost-per-incident for any stages?"
    }
  ]
}
```

---

## UI Architecture

### New components

```
DiscoveryIntake.tsx              — root route, mode toggle, LLM call orchestration
  DiscoveryModeToggle.tsx        — Freeform / Structured tab selector
  TranscriptDropZone.tsx         — paste or file drop, triggers extraction
  ExtractionSummary.tsx          — confidence badge grid, gap count, readiness score
  DiscoveryForm.tsx              — the structured form (both modes)
    OrgSection.tsx               — Section 1
    ValueStreamSection.tsx       — Section 2 (repeating VS cards + stage tag input)
    RolesSection.tsx             — Section 3 (role cards)
    TechStackSection.tsx         — Section 4
    PainPointsSection.tsx        — Section 5 (pain point cards + binding toggle)
    MetricsSection.tsx           — Section 6
    ControlsSection.tsx          — Section 7
  ReadinessBar.tsx               — overall completeness indicator, gates Generate button
  GapPrompter.tsx                — surfaced gap questions with inline fill fields
  GenerateButton.tsx             — disabled until readiness ≥ 41%, triggers pipeline
```

### State

All discovery state lives in a `discovery-store.ts` (Zustand). Separate from canvas store. Fields update on keystroke. Readiness score recalculates reactively.

On Generate: store serialises to Discovery IR JSON, passes to scaffold generator (Python pipeline or client-side equivalent), navigates to Network View with new scaffold loaded.

---

## Extraction UX Detail

**During extraction** (LLM call in flight):
- Transcript zone shows a subtle pulse animation
- Section headers illuminate progressively as fields populate (not a spinner — feels like reading)
- Takes 5–15 seconds typically

**After extraction**:
- Fields pre-filled with extracted values
- Low-confidence fields marked with amber dot + tooltip showing extraction rationale
- High-confidence fields marked with green dot
- Missing required fields highlighted in red with gap prompt text below

**Gap prompts** appear inline, beneath the relevant section. Not a modal. Not a separate step. The consultant answers them in context, the field updates, the readiness score ticks up.

**Editing extracted values**:
- All fields editable
- If consultant changes an extracted value, the confidence indicator clears (becomes user-asserted, not LLM-extracted)

---

## Decisions

### D-033: Dual-mode intake as single convergent form
Both freeform and structured modes produce the same Discovery IR. The form IS the canonical representation. Extraction just pre-fills it.

**Rationale:** Avoids two separate data models. The consultant always ends up in the same place — reviewing a structured form — regardless of how they started.

### D-034: Readiness score gates generation, not blocks it
Generation is available at ≥41% readiness (stub scaffold territory). Blocking it entirely at low readiness would be paternalistic and counter to presales reality where sometimes you need to show something fast.

**Rationale:** The score is information, not enforcement. A consultant who knows what they're doing can generate a viable stub from limited intel and enrich it post-meeting.

### D-035: Gap prompts are schema-derived, not hardcoded
The set of gap questions is generated from which required/recommended fields are empty in the IR. This means they're always accurate and don't need maintenance as the schema evolves.

**Rationale:** Hardcoded gap questions rot. Schema-derived gaps scale automatically.

---

## Out of Scope (Phase 1)

- Voice input / real-time transcription during call
- Multi-file ingestion (multiple transcripts merged)
- Saving discovery sessions server-side (in-memory only, exportable as JSON)
- Template library (industry-specific starter forms)
- Direct CRM integration (pull account data from Salesforce)

These are all natural Phase 2 entries. The CRM integration in particular — pulling account context directly from Salesforce before the call — would make this genuinely transformative for the SDR workflow.

---

## Implementation Sequence

1. **Discovery IR schema** — finalise types, add to `types.ts`
2. **DiscoveryForm skeleton** — sections 1–3, no extraction yet
3. **ReadinessBar** — reactive scoring from form state
4. **TranscriptDropZone + LLM call** — Mode A extraction pass
5. **ExtractionSummary + confidence indicators** — review layer
6. **GapPrompter** — schema-derived gap questions
7. **Sections 4–7** — pain points, tech, metrics, controls
8. **GenerateButton → scaffold pipeline** — wire to generator
9. **End-to-end test** — Puretec transcript → form → scaffold → canvas

---

## The Demo Moment

The workflow Terry described:

> *Fill in a templated discovery sheet live with the customer and flip the screen around to talk them through the pitch*

In practice this looks like:

**Before call:** Open `/intake`, set industry + company context. Blank form ready.

**During call:** As prospect describes each problem, consultant clicks into the relevant pain point card, types the gist, adjusts the score. Takes 30 seconds per pain point.

**End of call:** Readiness bar is at 70–80%. Hit Generate. In 10–15 seconds: scaffold is live. Load the Puretec heatmap. Flip screen.

**What the prospect sees:**
- Their value streams laid out as a DAG — not a slide, a structural map of their operation
- Their binding constraint highlighted in red
- Their pain points ranked by severity
- Three customer stories from companies like theirs, with numbers

That's not a pitch deck. That's a mirror. The consultant isn't selling — they're showing the prospect what they already said, structured.

---

*Next: implementation begins with `types.ts` extension and `DiscoveryForm.tsx` skeleton.*
