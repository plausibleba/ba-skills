---
name: ba-capability-mapping
description: >
  Use this skill whenever a business analyst, architect, or project team needs to produce a
  Capability Map — even if they don't use that exact term. Trigger on phrases like: "map out
  what the business does", "identify our capabilities", "build a capability model", "what
  capabilities do we need for this initiative", "capability assessment", "business capability
  map", "organisational abilities", or when someone uploads a project charter, discovery
  transcript, existing Excel capability model, or industry reference model and asks for
  structured analysis. Also trigger when someone wants to prepare for a VCC (Value Cognition
  Canvas) session or asks what capabilities a value stream requires. The skill handles any
  input format — raw transcripts, structured documents, Excel files, or verbal descriptions.
---

# BA Capability Mapping Skill

> **Note:** This skill follows the [PlausibleBA Taxonomy Standard](../ba-taxonomy-standard/SKILL.md).
> Column order, numbering format, XLSX colours, MECE rules, and ID conventions are all
> defined there. Read that skill first if anything here is unclear.

## Purpose

Produce a rigorous, reusable Capability Map from any input — transcripts, charters, existing
spreadsheets, industry reference models, or a mix. Output is a downloadable XLSX with a
structured taxonomy, plus an inline preview for iteration.

Capabilities are the foundation of business architecture. Getting the hierarchy right before
mapping value streams, processes, or technology is what makes downstream work consistent and
investment-relevant.

---

## Definition

> **A Business Capability** is the stable ability of the organisation to perform a business
> function, grounded in a core business object, independent of organisational structure.

---

## Rules (apply at every level)

| Rule | Meaning |
|------|---------|
| **Object-grounded** | An explicit business object must be identifiable for each capability |
| **Enduring** | Not project-based; survives organisational restructures |
| **Not a process step** | Describes *what* the org can do, never *how* it does it |
| **Mutually exclusive** | No two capabilities at the same level overlap in scope |
| **Collectively exhaustive** | Together, siblings cover the full scope of their parent — no gaps |
| **Verb–Noun naming** | Preferred convention, e.g. "Manage Certification Portfolio" |

**Naming guidance:**
- ✅ "Manage Credit Portfolio", "Assess Counterparty Risk", "Deliver Field Service"
- ❌ "Assess Credit Applications" (activity), "Finance Department" (org unit), "Salesforce" (system)

---

## Hierarchy

```
L1  Business Area       Broad accountability domain (e.g. "Customer Management")
  L2  Business Domain     Logical grouping within the area (e.g. "Customer Acquisition")
    L3  Business Capability  Operational ability (e.g. "Manage Lead Qualification")
      L4  Sub-capability     Optional — used for VSS mapping in complex domains
```

**Sizing guidance:**
- L1: 5–8 Business Areas for a typical enterprise
- L2: 3–7 Business Domains per L1
- L3: 3–8 Business Capabilities per L2
- L4: only when a L3 capability requires decomposition for value stream mapping

**Important:** L1 and L2 are structural groupings — they organise and label. L3 is where the
actual capability lives. L4 is only added when value stream stage mapping requires it.

---

## Taxonomy Numbering

Every node in the hierarchy carries a positional number that encodes its place in the schema.
This is the primary sort key — sorting by `Number` reveals the full hierarchy at a glance
and is far easier to validate than grouping by level.

**Format:** `<L1>.<L2>.<L3>.<L4>` — dot-separated integers, one segment per level.

```
1           ← L1: First Business Area
1.1         ← L2: First Domain within Area 1
1.1.1       ← L3: First Capability within Domain 1.1
1.1.2       ← L3: Second Capability within Domain 1.1
1.2         ← L2: Second Domain within Area 1
1.2.1       ← L3: First Capability within Domain 1.2
2           ← L1: Second Business Area
2.1         ← L2: First Domain within Area 2
2.1.1       ← L3: First Capability within Domain 2.1
2.1.1.1     ← L4: First Sub-capability (only if needed)
```

**Rules:**
- Numbers are assigned sequentially within each parent, starting at 1
- Numbers are stable once assigned — insertions get the next available integer, not fractional numbers
- The Number column is always the first column in the XLSX and the default sort key
- Sorting by Number must reproduce the exact hierarchy — if it doesn't, the numbering is wrong

---

## Input Handling

This skill accepts inputs in any form or combination:

| Input Type | What to extract |
|---|---|
| Discovery transcript / interview notes | Business objects mentioned, pain points, decision points, handoffs |
| Project charter / scope document | Stated objectives, in-scope functions, stakeholder responsibilities |
| Existing Excel capability model | Current names — validate/reclassify against rules above |
| Industry reference model (BIAN, ACORD, eTOM, SCOR) | Adapt, do not copy wholesale |
| Verbal / ad-hoc description | Infer domain; ask one focused clarifying question if ambiguous |

If input is sparse, ask **one** clarifying question before proceeding. Never ask multiple
questions at once.

**Batching guidance:** For large or multi-domain inputs, process 5–8 L2 domains at a time
to maintain coherence and avoid drift. Run a consistency pass across the full set before
finalising.

---

## Elicitation Process

> ⚠️ **Always run this skill in a fresh Cowork task.** Prior conversation context will cause Claude to reference previous outputs rather than eliciting from the current input. Open a new task, paste the business description, then type the slash command.

### Step 1 — Establish Context
Identify from input (or ask):
- What **business domain** does this cover?
- Is this for a **specific value stream** or the **whole organisation / business unit**?
- Is there an **existing structure** to validate, or starting fresh?

### Step 2 — Identify Core Business Objects
Before naming capabilities, list the primary objects the organisation manages.
These ground the L3 capabilities and are the foundation of a future Concept Model.

Examples by sector:
- Financial services: Credit Application, Counterparty, Portfolio, Collateral
- Water treatment: Treatment Plant, Water Quality Sample, Dosing Schedule, Filter Asset
- Retail: Product, Order, Customer, Inventory
- Professional services: Engagement, Deliverable, Client, Resource

### Step 3 — Draft L1 and L2, then PAUSE for validation (Checkpoint 1)

Derive Business Areas (L1) and Business Domains (L2) first.

Present as a numbered table sorted by taxonomy number and ask:

> *"Here is a draft L1/L2 hierarchy of Business Areas and Domains. Does this look like
> something your business teams would recognise? Any areas missing, or any that feel like
> they belong inside another?"*

**Do not proceed to L3 until this is confirmed or adjusted.**

Assign stable taxonomy numbers before presenting. If the client reorganises L1/L2 at this
checkpoint, renumber sequentially before proceeding.

### Step 4 — Derive L3 Capabilities

For each confirmed L2 Business Domain, ask: *"What stable abilities does the organisation
need within this domain?"*

Apply MECE check before finalising:
- **Mutually exclusive**: do any two L3s overlap? Merge or redefine if so.
- **Collectively exhaustive**: is anything the business does in this domain unaccounted for?

Ground each L3 in a named business object from Step 2. If a capability candidate cannot be
grounded in a business object, it is likely a process step — reclassify or discard.

Include both:
- **Execution capabilities** — directly enabling value delivery
- **Governance capabilities** — oversight, compliance, risk management

Run a **uniqueness check** before presenting: scan all L3 names for semantic overlap across
domains. "Manage Customer Communication" appearing under both Acquisition and Retention is a
MECE failure — either merge them under a shared parent or redefine scope boundaries.

### Step 5 — Pause for validation (Checkpoint 2), then add L4 if needed

Present the full numbered map (sorted by Number) and ask:

> *"Here are the Business Capabilities within each domain. Do these reflect how your
> organisation thinks about its abilities? Any that feel like process steps rather than
> stable abilities, or any gaps you'd expect to see?"*

After Checkpoint 2 is confirmed, add L4 sub-capabilities only when:
- A L3 capability maps to multiple distinct value stream stages, or
- The business needs to assign investment or ownership at a finer grain

---

### Step 6 — Render the interactive treemap (PRIMARY deliverable)

Immediately after Checkpoint 2 is accepted, render an interactive treemap as a self-contained HTML artifact. Do NOT wait for the user to ask. Do NOT generate the XLSX first. The treemap IS the deliverable — XLSX is a download option offered beneath it.

**Visual design — match VCC exactly:**
- Page background: `#0f172a`; L1 body: `#111827`; L1 header exec: `rgba(59,130,246,0.08)`; gov: `rgba(99,102,241,0.08)`
- L1 border exec: `#1e3a5f`; gov: `#3730a3`; `border-radius:8px`
- L1 title: `font-size:9px`, `font-weight:700`, `color:#cbd5e1`, `text-transform:uppercase`, `letter-spacing:0.5px`
- L1 meta line: `font-size:8px`, `color:#94a3b8` — "N domains · N capabilities"
- L2 blocks: `background:rgba(255,255,255,0.05)`, `border:1px solid rgba(255,255,255,0.10)`, `border-radius:5px`
- L2 title: `font-size:9px`, `font-weight:600`, `color:#94a3b8`
- L3 tiles: `background:rgba(255,255,255,0.07)`, `border:0.5px solid rgba(255,255,255,0.12)`, `color:#94a3b8`, `font-size:8px`, `border-radius:3px`, `padding:2px 6px`
- L3 hover/selected exec: `background:rgba(59,130,246,0.15)`, `color:#93c5fd`, `border-color:rgba(59,130,246,0.3)`
- L3 hover/selected gov: `background:rgba(99,102,241,0.15)`, `color:#a5b4fc`, `border-color:rgba(99,102,241,0.3)`
- Font: `'DM Sans', system-ui, sans-serif`

**Inspector panel (opens on L3 click — matches VCC):**
- `background:#1e293b`, `border:1.5px solid #3b82f6` (exec) or `#6366f1` (gov), `border-radius:8px`
- Capability name: `font-size:14px`, `font-weight:700`, `color:#f1f5f9`
- Business object label: `font-size:9px`, `font-weight:700`, `text-transform:uppercase`, `color:#3b82f6` — "BUSINESS OBJECT: [name]"
- Description: `font-size:12px`, `color:#94a3b8`

**Legend row above grid:** "Click any L3 tile to inspect · Double-click to rename" hint in `color:#94a3b8`

Build the `data` array from capabilities confirmed at Checkpoint 2. Each L1 entry has name, L2 children, each L2 has name and L3 array. Each L3 has: name, business object reference, description. Detect Governance L1s by keywords: governance, compliance, risk, audit, regulatory, data, privacy. Do NOT use PortfolioProp example data.

Include header: eyebrow "CAPABILITY MAP", full title "[Client] — Operating Capabilities", subtitle "N business areas · N domains · N capabilities".

**Footer (required on every rendered artifact):**
Include a footer row at the bottom of the artifact, styled `font-size:10px; color:#94a3b8; padding:10px 0 2px; border-top:1px solid #2e3f5c; margin-top:12px`:
```
Generated by the PlausibleBA Skills Library | www.plausibleba.com
Turn this into an interactive workshopping canvas → plausibleba.com/canvas
```
First line in `color:#94a3b8`, second line in `color:#4a9eda` with the URL as a link.

After rendering, say:

> *"Here is your capability map. Hover any L3 tile to highlight it. Blue = Execution; purple = Governance. Would you like to download this as an XLSX, or export JSON for the VCC pipeline?"*

Then generate the XLSX only if the user asks for it.

---

## Staged Validation Checkpoints

**Checkpoint 1 — After L1/L2 draft**

Sorted by Number. The recognition question is critical — a wrong L1/L2 structure produces
a bad map regardless of L3 quality.

**Checkpoint 2 — After L3 draft**

Full map sorted by Number. Ask whether capabilities feel like stable abilities or process
steps, and whether anything is missing.

Post-processing pass before presenting: review all L3 names for consistency of register,
length, and naming pattern. Rewrite any that drift from the Verb–Noun convention or feel
formulaic.

The map typically stabilises in 2–3 iterations.

---

## Inline Preview Format

**Checkpoint 1 — L1/L2 preview (sorted by Number):**

| Number | Level | Name |
|--------|-------|------|
| 1 | L1 | Customer Management |
| 1.1 | L2 | Customer Acquisition |
| 1.2 | L2 | Customer Retention |
| 2 | L1 | Field Operations |
| 2.1 | L2 | Service Delivery |
| 2.2 | L2 | Service Scheduling |

**Checkpoint 2 — Full map preview (sorted by Number):**

| Number | Level | Name | Business Object | Type |
|--------|-------|------|-----------------|------|
| 1 | L1 | Customer Management | | |
| 1.1 | L2 | Customer Acquisition | | |
| 1.1.1 | L3 | Manage Lead Qualification | Lead | Execution |
| 1.1.2 | L3 | Manage Channel Partnership | Channel Partner | Execution |
| 1.2 | L2 | Customer Retention | | |
| 1.2.1 | L3 | Manage Contract Renewal | Contract | Execution |

---

## XLSX Output Structure

Four worksheets, in this order. The tab order is mandatory — Capability Summary always opens first.

---

**Sheet 1: Capability Summary** *(client-facing executive view)*

This is what the client sees on open. Structure:

- **Title block**: `[Organisation] — Capability Map` (bold, 14pt, dark blue)
- **Subtitle**: business domain and version e.g. `Rental Property Portfolio Management | v1.0`
- **Branding line**: `Generated by the PlausibleBA Skills Library | www.plausibleba.com` (italic, pale blue background — required on every output)
- **Totals band**: five tiles — Business Areas / Business Domains / Capabilities / Execution count / Governance count
- **Per-area table**: columns — Area №, Business Area, Domains, Capabilities, Execution, Governance — one row per L1, totals row at bottom
- **Notes**: key MECE decisions, any non-obvious placement rationale, confirmed scope
- **Next Steps**: Concept Model and Value Stream suggestions with one-line descriptions

---

**Sheet 2: Capability Register**

Branding line above the header row (same format as Summary tab). Pre-sorted by Number — hierarchy visible on open.

| # | Column | Description |
|---|--------|-------------|
| 1 | **Number** | Taxonomy position e.g. `1.2.3` — sheet is pre-sorted by this column |
| 2 | Level | L1 / L2 / L3 / L4 |
| 3 | **Name** | Capability name (Verb–Noun), indented by level |
| 4 | **Description** | "Ability to [verb] [object] [context]" — required for L3/L4 |
| 5 | **Business Object** | Core object grounding this capability (required for L3/L4) |
| 6 | Type | Execution / Governance |
| 7 | Parent № | Number of parent node (blank for L1) |
| 8 | Parent Name | Parent name (for readability) |
| 9 | ID | `cap_<snake_case_name>` |

---

**Sheet 3: Validation Summary**

| Check | Result | Notes |
|-------|--------|-------|
| All L3 names follow Verb–Noun | PASS/FAIL | |
| All L3 capabilities object-grounded | PASS/FAIL | |
| No process steps at L3 | PASS/FAIL | |
| MECE within each L2 domain (no overlaps) | PASS/FAIL | |
| MECE within each L2 domain (no gaps) | PASS/FAIL | |
| Execution + governance coverage | PASS/NOTE | |
| L1 count within 5–8 | PASS/NOTE | |
| L3 count per L2 within 3–8 | PASS/NOTE | |
| Numbers sort correctly to reproduce hierarchy | PASS/FAIL | |
| No duplicate semantics across domains | PASS/FAIL | |

Use NOTE (not FAIL) for acceptable edge cases with justification.

---

**Sheet 4: Legend**
Colour coding, numbering system, naming conventions, MECE definition, PlausibleBA standard version, website link.

---

## JSON Schema (for VCC pipeline integration)

Produce JSON alongside XLSX so output feeds directly into the VCC:

```json
{
  "cap_<snake_case_name>": {
    "id": "cap_<snake_case_name>",
    "elementType": "Capability",
    "name": "<Capability Name>",
    "number": "1.2.3",
    "level": "L1|L2|L3|L4",
    "parentId": "cap_<parent>|null",
    "parentNumber": "1.2|null",
    "businessObject": "<Core Object>",
    "description": "Ability to...",
    "type": "Execution|Governance"
  }
}
```

Required fields: `id`, `elementType`, `name`, `number`
`elementType` must be exactly: `"Capability"`

---

## Quality Bars

**Enterprise Capability Map:**
- 5–8 L1 Business Areas
- 3–7 L2 Domains per L1
- 3–8 L3 Capabilities per L2
- Every L3 traceable to a named business object
- MECE at every level — siblings don't overlap, no gaps within scope
- Numbers sort correctly to reproduce exact hierarchy
- Names pass the "fund it" test — could you write a business case for each one?
- Governance capabilities present in every major domain
- No two L3 names are semantically equivalent across domains

**Value-stream-scoped map:**
- Covers the L2 domain(s) relevant to the stream
- 3–8 L3 capabilities
- L4 added only where VSS mapping requires it

---

## Common Failure Modes

| Failure | Example | Fix |
|---------|---------|-----|
| Activity at L3 | "Assess Credit Applications" | → "Manage Credit Assessment" |
| System named as capability | "Salesforce CRM" | → "Manage Customer Relationships" |
| Org unit at L1 | "Finance Department" | → "Financial Management" |
| L3 too granular | "Email Customer Re: Status" | Roll up to "Manage Customer Communication" |
| L2 too abstract | "Business Operations" | Break down — what domain? what object? |
| Non-MECE: overlapping siblings | "Sales Management" + "New Customer Sales" at same level | Redefine scope boundaries |
| Non-MECE: exhaustiveness gap | Field service domain missing scheduling capability | Add "Manage Service Scheduling" |
| Duplicate semantics across domains | "Manage Customer Communication" in two L2s | Merge under shared parent or redefine scope |
| Numbering doesn't sort to hierarchy | 1.2 appearing before 1.1 | Reassign sequentially |
| L4 added prematurely | L4 added before L3 is confirmed | L4 only after Checkpoint 2 |

---

## Reference Models by Sector

Note which reference was used and where capabilities were adapted vs. adopted wholesale:

- **Financial services**: BIAN (Banking Industry Architecture Network)
- **Insurance**: ACORD
- **Telecoms**: eTOM / TM Forum
- **Retail / supply chain**: SCOR, VRM
- **Government / public sector**: TOGAF capability taxonomy patterns
- **Healthcare**: HL7 / FHIM reference capabilities

---

## Next Steps (offer after Checkpoint 2 is accepted)

Once the Capability Map is confirmed, offer the following as natural next steps:

> *"As a next step, we could generate:*
>
> - *A **Concept Model** containing a taxonomy of business objects in your domain. The
>   business objects we've already identified as grounding your capabilities give us a strong
>   starting point. A Concept Model also provides a good cross-validation of Capability Map
>   coverage — if there are business objects in the Concept Model with no corresponding
>   capability, that's a gap worth investigating.*
>
> - *One or more **Value Streams** for your project or domain that orchestrate these
>   capabilities into a sequence of stages, demonstrating how they are used to achieve a
>   specific business purpose. Value Streams also help validate coverage — any capabilities
>   that don't map to any value stream stage are candidates for review, and any stage that
>   can't be grounded in a capability is a red flag."*

---

## Export Options

Offered only when the user asks after seeing the treemap:
- XLSX (full 4-tab workbook)
- JSON (for VCC pipeline)
- Both
