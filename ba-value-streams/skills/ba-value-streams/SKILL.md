---
name: ba-value-streams
description: >
  Use this skill whenever a business analyst, architect, or project team needs to identify,
  map, or analyse value streams — even if they don't use that term. Trigger on phrases like:
  "map out how we deliver value", "end-to-end process", "customer journey from our side",
  "how does a booking become a completed stay", "what stages does X go through", "value stream
  map", "flow of value", "lifecycle stages", or when someone wants to understand how
  capabilities orchestrate to deliver an outcome. Also trigger when a Capability Map and
  Concept Model exist and the user wants to validate them by tracing a value stream through
  both. The skill handles any input — transcripts, charters, existing process maps, swim lane
  diagrams described in text, or verbal descriptions. Always load ba-taxonomy-standard
  alongside this skill.
---

# BA Value Streams Skill

## Purpose

Produce a rigorous Value Stream Map — a staged decomposition of how an organisation delivers
value to a recipient — from any input. The Value Stream is the third layer of the PlausibleBA
business architecture stack:

```
Capability Map    — what the organisation can do (stable abilities)
    ↓
Concept Model     — what the organisation manages (business objects)
    ↓
Value Stream      — how the organisation delivers value (staged flow)
```

A Value Stream orchestrates capabilities into stages. Each stage advances the primary business
object (the Value Object) from an initial state toward a completed outcome. The Value Stream
cross-validates both the Capability Map (surfacing unused or missing capabilities) and the
Concept Model (confirming objects flow correctly through stages).

---

## What a Value Stream Is (and Isn't)

| ✅ Value Stream | ❌ Not a Value Stream |
|---|---|
| Triggered by a stakeholder need | An internal process or procedure |
| Ends with a delivered outcome to a recipient | A capability or function |
| Decomposed into stages, not steps | A technology workflow |
| Each stage has entry/exit criteria | A swim lane diagram |
| References capabilities at each stage | A task list |

**Naming rule:** Value streams are named from the recipient's perspective, not the organisation's.
- ✅ "Short-Stay Guest Experience" (recipient = Guest)
- ✅ "Owner Portfolio Onboarding" (recipient = Owner)
- ❌ "Booking Management Process" (organisation-centric)
- ❌ "Operations Workflow" (internal, no recipient)

---

## Value Stream Anatomy

Every Value Stream has:

**Value Stream name** — recipient-centric, describes the outcome delivered

**Value Object** — the primary business object that flows through the stream and changes state
at each stage. Drawn from the Concept Model.

**Recipient** — who receives the value at the end (a Party from the Concept Model)

**Trigger** — what initiates the stream (an Event from the Concept Model, or an external signal)

**Outcome** — the completed state of the Value Object at stream end

**Stages** — 4–8 sequential stages, each with:
- A name (Verb–Noun, from the recipient's perspective where possible)
- Entry criteria (what must be true to enter this stage)
- Exit criteria (what must be true to leave this stage — the value created)
- Participating capabilities (L3 capability numbers from the Capability Map)
- Business objects in play (object names from the Concept Model)
- Enabling systems (optional — technology that supports this stage)

---

## Stage Naming Convention

Stage names follow Verb–Noun at the business activity level — but unlike capabilities, the
verb is active and describes what happens to the Value Object:

- ✅ "Booking Confirmed", "Property Prepared", "Guest Supported", "Stay Completed"
- ✅ "Enquiry Received", "Owner Onboarded", "Payment Settled"
- ❌ "Manage Booking" (capability language — too generic)
- ❌ "Send Confirmation Email" (process step — too granular)

Stage names describe the state the Value Object reaches, not the activities performed.

---

## Elicitation Process

### Step 1 — Establish Scope
Identify from input or by asking:
- What **value stream** are we mapping? (What outcome is being delivered, to whom?)
- Is there an existing **Capability Map** and **Concept Model** to cross-validate?
- What is the **trigger** that starts this stream?
- What is the **end state** — what does "done" look like for the recipient?

If multiple value streams are identified, list them and ask which to map first. Suggest
starting with the primary revenue-generating stream.

### Step 2 — Identify the Value Object and Recipient
From the Concept Model (or by inference):
- What is the primary object flowing through this stream? (e.g. Booking, Property, Tenancy)
- Who is the recipient? (e.g. Guest, Owner, Tenant)
- What states does the Value Object pass through? (initial → ... → final)

### Step 3 — Draft Stages
Decompose the stream into 4–8 stages. Each stage should:
- Represent a meaningful increment of value (not just an activity)
- Have clear entry and exit criteria
- Be recognisable to a business stakeholder

### Step 4 — Map Capabilities to Stages
For each stage, identify which L3 capabilities from the Capability Map participate.
- Each stage should have 2–5 participating capabilities
- Flag capabilities that participate in no stage (**unused capabilities**)
- Flag stages that have no corresponding capability (**capability gaps**)

### Step 5 — Map Objects to Stages
For each stage, identify which business objects are created, updated, or consumed.
- The Value Object must appear in every stage
- Supporting objects (e.g. Contractor, Maintenance Request) appear in relevant stages only

### Step 6 — Checkpoint: pause for validation
Present the stage list inline and ask:

> *"Here is a draft Value Stream for [name]. Does this reflect how your business delivers
> value to [recipient]? Any stages missing, or any that feel like they could be combined?"*

**Do not generate the XLSX until confirmed or adjusted.**

---

### Step 7 — Render the interactive stage view (PRIMARY deliverable)

Immediately after the stage list is validated, render an interactive value stream as a self-contained HTML artifact. Do NOT wait for the user to ask. Do NOT generate the XLSX first. The stage view IS the deliverable — XLSX is a download option offered beneath it.

**Visual design — match VCC exactly using this palette:**
```
navy:      #1a2236   (page background)
navyLight: #1e2d4a   (card header background)
navyMid:   #243352   (card body background)
border:    #2e3f5c   (all borders)
blue:      #4a9eda   (active/accent)
textDim:   #94a3b8   (labels, secondary)
textMed:   #cbd5e1   (body text)
white:     #ffffff   (headings)
```

**Stage card structure (dark navy, scrolls horizontally):**
Each card has:
1. **Card header** (`background:navyLight`, `border-bottom:1px solid border`):
   - Stage N of N label (`font-size:8px`, `color:textDim`, uppercase)
   - Stage name (`font-size:13px`, `font-weight:700`, `color:white`)
   - Entry/Exit state boxes side by side (dark boxes, `background:rgba(255,255,255,0.05)`, with labels ENTRY STATE / EXIT STATE)
   - Participating stakeholders section with coloured pills (blue tint for managers, teal for guests/customers, amber for others)
   - Metrics badges if present
2. **Capability list panel** (`background:rgba(255,255,255,0.03)`, below header, flex:1):
   - Each capability as a row with name + ⓘ icon
   - `+ Add Capability` dashed button at bottom
3. **PPIT dot row** at card bottom (`border-top:1px solid border`):
   - People=`#4a9eda`, Process=`#1D9E75`, Information=`#D4537E`, Technology=`#f59e0b`
   - Inactive dots: `rgba(255,255,255,0.1)`

**Arrow connectors between cards:** SVG chevron arrows (`stroke:#2e3f5c`)

**Value object state flow above cards:** pill row showing state transitions, terminal state highlighted (`background:rgba(74,158,218,0.15)`, `color:#4a9eda`, `border-color:#4a9eda`)

**Inspector panel (click-to-reveal, navy bordered):**
- `background:#243352`, `border:1.5px solid #4a9eda`, `border-radius:8px`
- Stage number circle (`background:#4a9eda`) + stage name heading
- 2-column grid: Entry criteria (left-border `#2e3f5c`) | Exit criteria (left-border `#4a9eda`)
- Participating capabilities list | Accountable stakeholders + metrics
- PPIT legend row at bottom
- Auto-opens on Stage 1

**Header block above everything:**
- Eyebrow: "VALUE STREAM" in small caps, `color:textDim`
- Stream name in white, bold
- Description line in textDim
- Meta row: VALUE OBJECT · RECIPIENT · STAGES · ZONE in uppercase labels with blue values
- ACCOUNTABLE STAKEHOLDER pill
- Trigger → Outcome line in textDim

Build all data from the value stream confirmed in this session — exact stage names, entry/exit outcomes, capabilities, stakeholders, metrics, PPIT assignments. Do NOT use PortfolioProp example data.

**Footer (required on every rendered artifact):**
Include a footer row at the bottom of the artifact, styled `font-size:10px; color:#94a3b8; padding:10px 0 2px; border-top:1px solid #2e3f5c; margin-top:12px`:
```
Generated by the PlausibleBA Skills Library | www.plausibleba.com
Turn this into an interactive workshopping canvas → plausibleba.com/canvas
```
First line in `color:#94a3b8`, second line in `color:#4a9eda` with the URL as a link.

After rendering, say:

> *"Here is your value stream. Click any stage card to open the inspector. Would you like to download this as an XLSX, or export JSON for the VCC pipeline?"*

Then generate the XLSX only if the user asks for it.

---

## Inline Preview Format

**Checkpoint — Stage preview:**

| № | Stage | Entry Criteria | Exit Criteria | Capabilities | Objects |
|---|-------|----------------|---------------|--------------|---------|
| 1 | Booking Confirmed | Guest submits booking request | Booking is confirmed and guest notified | 3.1.1, 3.1.2, 3.2.2 | Booking, Guest |
| 2 | Property Prepared | Booking confirmed | Property ready for guest arrival | 4.2.1, 4.2.2, 4.2.4 | Property, Booking |

---

## XLSX Output Structure

Four worksheets, following the PlausibleBA taxonomy standard tab order.

**Sheet 1: Value Stream Summary**
- Title block, subtitle, branding line
- Value Stream name, Value Object, Recipient, Trigger, Outcome
- Stage count, capability count, object count
- Cross-validation summary: capabilities used / unused / gaps
- Notes on key design decisions
- Next Steps

**Sheet 2: Stage Register**

Branding line above header. Pre-sorted by Stage Number.

| # | Column | Description |
|---|--------|-------------|
| 1 | **Stage №** | Sequential stage number — primary sort key |
| 2 | **Stage Name** | Verb–Noun stage label (state of Value Object) |
| 3 | **Entry Criteria** | What must be true to enter this stage |
| 4 | **Exit Criteria** | What value is created / what state is reached on exit |
| 5 | **Capabilities** | L3 capability numbers participating in this stage |
| 6 | **Value Object State** | State of the Value Object at stage exit |
| 7 | **Supporting Objects** | Other objects in play during this stage |
| 8 | **Enabling Systems** | Optional — key technology enablers |
| 9 | ID | `stg_<snake_case_name>` |

**Sheet 3: Validation Summary**

| Check | Result | Notes |
|-------|--------|-------|
| All stages have entry and exit criteria | PASS/FAIL | |
| All stages have at least 2 participating capabilities | PASS/NOTE | |
| Value Object present in every stage | PASS/FAIL | |
| No capability appears in zero stages (unused) | PASS/NOTE | List unused |
| No stage has zero capabilities (gap) | PASS/FAIL | |
| Stage count within 4–8 | PASS/NOTE | |
| Stage names describe state, not activity | PASS/FAIL | |
| Recipient and trigger defined | PASS/FAIL | |

**Sheet 4: Legend**
Stage naming conventions, value stream anatomy, relationship to Capability Map and Concept Model,
PlausibleBA standard version, website link.

---

## XLSX Colour Coding

| Fill | Hex | Usage |
|------|-----|-------|
| Dark blue `#1F3864` | Header rows | |
| Mid blue `#2E75B6` | Stage rows (primary) | |
| Pale blue `#DDEEFF` | Capability reference rows | |
| Yellow `#FFF2CC` | Unused capability warnings | |
| Red `#FCE4D6` | Capability gap warnings | |
| Green `#E2EFDA` | Validation PASS | |

---

## Cross-validation Output

After mapping capabilities to stages, produce a cross-reference matrix:

| Capability | Stage 1 | Stage 2 | Stage 3 | ... | Status |
|---|---|---|---|---|---|
| 3.1.1 Manage Booking Intake | ✓ | | | | Used |
| 4.2.1 Manage Turnover Scheduling | | ✓ | | | Used |
| 7.1.3 Manage Proposition Marketing | | | | | ⚠️ Unused |

Unused capabilities are not necessarily wrong — they may belong to a different value stream,
or may represent background governance activities. Note rather than flag as failures.

---

## JSON Schema (for VCC pipeline integration)

```json
{
  "vs_<snake_case_name>": {
    "id": "vs_<snake_case_name>",
    "elementType": "ValueStream",
    "name": "<Value Stream Name>",
    "valueObject": "obj_<snake_case>",
    "recipient": "obj_<party_snake_case>",
    "trigger": "Event or condition that initiates the stream",
    "outcome": "Final state of the Value Object",
    "stages": [
      {
        "id": "stg_<snake_case_name>",
        "number": 1,
        "name": "<Stage Name>",
        "entryCriteria": "...",
        "exitCriteria": "...",
        "valueObjectState": "...",
        "capabilities": ["cap_id_1", "cap_id_2"],
        "objects": ["obj_id_1", "obj_id_2"],
        "systems": ["System Name"]
      }
    ]
  }
}
```

---

## Quality Bars

A good Value Stream:
- 4–8 stages — fewer suggests conflation, more suggests process-level mapping
- Every stage has named entry and exit criteria
- The Value Object appears in every stage with a defined state transition
- At least 80% of L3 capabilities from the relevant domain are used across stages
- No stage is an orphan (zero capabilities)
- Recipient and outcome are explicitly named
- Stage names describe states, not activities

---

## Common Failure Modes

| Failure | Example | Fix |
|---------|---------|-----|
| Process steps as stages | "Send confirmation email" | → "Booking Confirmed" (the state reached) |
| Too many stages | 12+ stages | Group related activities — aim for 4–8 meaningful increments |
| Too few stages | 2–3 stages | Break down — each stage should represent a distinct value increment |
| Missing Value Object | No primary object defined | → Identify what flows through the stream |
| No capability mapping | Stages with no capabilities | → Return to Capability Map; add missing capabilities |
| Organisation-centric naming | "Process Guest Check-in" | → "Guest Arrived" or "Stay Commenced" |

---

## Multiple Value Streams

Most organisations have 3–8 primary value streams. For PortfolioProp, these include:
- Short-Stay Guest Experience (Value Object: Booking → Guest → Review)
- Owner Portfolio Onboarding (Value Object: Property → Portfolio)
- Long-Term Tenancy Lifecycle (Value Object: Tenancy)
- Property Maintenance Delivery (Value Object: Maintenance Request)

Map the primary revenue-generating stream first, then use the cross-validation to identify
which capabilities serve multiple streams (high-reuse capabilities are strategic assets).

---

## Next Steps (offer after the stage view is delivered)

After the Value Stream is accepted:
- **Additional value streams** — map remaining streams; identify shared capabilities
- **Capability heat map** — show which capabilities are used across multiple streams
- **VCC integration** — export JSON for full pipeline feed
- **Gap analysis report** — capabilities implied by the stream but missing from the map
