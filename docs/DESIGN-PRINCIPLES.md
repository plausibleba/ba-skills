# Design Principles

Distilled from Reviewer feedback across sessions 22–24 Feb 2026.

---

## 1. Ontological Separation

**Capability** = Stable organisational ability ("what the organisation must be able to do")
**Activity** = Observable unit of work ("what actually happens") — Verb + Object, atomic
**Role** = Agent performing the work
**Information** = Artefacts used or produced
**Technology** = Systems supporting the activity

These are distinct ontological layers. Never conflate them. A capability description should never restate its activities. An activity should never describe the capability.

### Activity Statement Rules
- Verb + Object format (6–12 words max)
- No conjunctions ("and"), no composite logic
- No "including" clauses, no embedded lists
- Each activity creates or transforms state
- Each activity can fail — that's where friction anchors
- 3–6 activities per capability

**Bad:** "Execute renewal campaign and process retention interventions"
**Good:** "Trigger renewal reminder sequence" / "Segment at-risk members" / "Send retention offer"

---

## 2. Visual Hierarchy

### Network View
Priority order: Position → Title → Edge direction → Binding border → Friction tint → Heat badge

If friction becomes visually louder than structure, the strategic view is broken.

### Stage View
- Capability = **container** (visual boundary)
- Activities = **primary content** inside container
- Roles/Info/Tech = **secondary chips** below activities

When everything has equal density, nothing has hierarchy.

---

## 3. Edge Encoding Discipline

- **Uniform stroke width** across all edges — no thickness variation
- **Solid** = forward flow (backbone or branch)
- **Dashed** = feedback loop
- Classification is binary (solid/dashed), not graduated
- No colour differentiation on edges — structure over aesthetics

---

## 4. Progressive Disclosure

The canvas must never overwhelm. Every layer of detail is gated:

| Layer | Gate |
|-------|------|
| Entry/Exit states, Metrics | Structure pane toggle |
| Friction observations | Transformation pane toggle |
| Roles | PPIT layer toggle |
| Activities | PPIT layer toggle |
| Information objects | PPIT layer toggle |
| Technology | PPIT layer toggle |
| Stage description | Info icon hover |
| Capability description | Info icon hover |

Default state: Structure pane open, Transformation pane open, all PPIT layers off.

---

## 5. Board-Appropriate Presentation

- No visual clutter. Padding and whitespace are governance tools.
- Colours must be functional, not decorative. Every colour carries meaning.
- Typography: small but legible. 10–11px for metadata, 15px for stage names.
- Entry/exit states: 2-line clamp (3 lines caused overflow, 1 line lost meaning)
- Metrics: wrapped badge row with consistent min-height across columns

---

## 6. Colour Semantics

| Colour | Semantic |
|--------|----------|
| Blue | People / Roles |
| Violet | Activities / Process |
| Amber | Information |
| Emerald | Technology |
| Red | Binding constraint / Critical |
| Slate-blue (vcc-700) | Primary brand / Headers |
| Gray | Neutral / Disabled |

These assignments are global. A blue chip always means a role. An amber chip always means information. No exceptions.

---

## 7. Tooltip Behaviour

- Tooltips use `bg-blue-50 text-blue-800 ring-1 ring-blue-200` (pale blue, consistent with scheme)
- Stage tooltips: centred below info icon, `w-72`
- Capability tooltips: `inset-x-0` relative to card (spans card width), direction-aware (down for first cap, up for others)
- No carets/arrows (they clip content)
- Hover-only, CSS `group-hover`, no JavaScript state

---

## 8. Information Density Management

When the user has toggled all PPIT layers ON, each capability shows:
- Name + info icon + badge counts
- 3–6 stacked activities (violet)
- 2–3 role chips (blue)
- 3–4 info chips (amber)
- 2–3 tech chips (emerald)

This is acceptable because:
1. Each item is short (badge or 6–12 word statement)
2. Visual colour-coding makes scanning fast
3. The user chose to open these layers — they want the detail
4. Columns are height-equalised so nothing collapses

When all layers are OFF, each capability shows only:
- Name + info icon + `R2 A5 I3 T3` badge counts

This is the default. Compact. Scannable. Board-safe.

---

## 9. Transformation Artefacts

The Transformation pane anchors delivery artefacts to friction observations (SBRs):
- **User Stories** — As a / I want / So that / Acceptance Criteria — generated from SBR rationale and role context
- Epics, Initiatives — future grouping layer
- Stories export to Jira via CSV (storyId, summary, description, AC, points, priority, epic link)

Artefacts anchor to **activities** (not capabilities), because activities are where friction lives and where delivery accountability is assigned.

---

## 10. Plausible Over Perfect

*Captured from project insight, 5 Mar 2026.*

**The central failure mode of Business Architecture is the pursuit of the correct model.**

The architecture community has historically treated value stream and capability models as taxonomic truth — something to be discovered, validated, and defended. This produces models that take months to build, are owned by specialists, and arrive too late to influence the decisions they were meant to inform.

**There is no correct model. Models are perspectives. Points of view.**

A value stream model is not a map of reality. It is a shared lens that a team agrees to look through together. Its value is not in being right — it is in being *useful enough to drive a conversation and fast enough to be relevant to the decision at hand.*

### Implications for VCC

**Generation target:** A plausible scaffold generated from a 60-minute discovery conversation is more valuable than a perfect scaffold delivered in six months. The model is a conversation starter, not a deliverable.

**Validation threshold:** The VCC validator enforces structural integrity (no broken references, valid schema, consistent anchor IDs). It does not enforce semantic correctness. Semantic correctness is the user's judgment call — not the tool's.

**Iteration over perfection:** A BA should be able to load a scaffold, identify where it is wrong, and fix it in minutes. The model should be cheap to challenge and cheap to change. Friction that is wrongly classified at `DataSignalFriction` instead of `ProcessHandoffFriction` is not a crisis — it is a discussion prompt.

**Democratisation:** The technique must not remain in the custody of architects. Business Analysts, product owners, and delivery leads can generate a plausible model from a discovery session, derive user stories from it, and take those stories into sprint planning — without waiting for architectural sign-off. This is the workflow VCC is designed to enable.

### The Principle in Practice

| Old model | VCC model |
|-----------|-----------|
| Months to produce | Hours to generate |
| Owned by architects | Used by BAs and delivery teams |
| Validated before use | Used before validated |
| Correct or wrong | Plausible or implausible |
| Document | Instrument |
| Describes the enterprise | Drives the conversation |

**"Good enough to be useful. Fast enough to be relevant."**

---

## 11. Four Architectural Invariants

*Derived from Session 10 design spar, 6 March 2026. These invariants are the fast audit test for any implementation decision. If a proposed change violates any of them, stop and reconsider.*

---

### Invariant 1: Constitutional Scaffold Discipline

The scaffold must contain only **asserted structure** — never derived structure.

Activities assert roles, capabilities, controls, application functions, and record classes. Topology, capability instances, and interference meshes are derived artefacts computed from the scaffold. They must never be authored directly into the scaffold.

If derived constructs leak into the scaffold layer, the model becomes self-referential and the reasoning layer produces circular explanations.

**Test:** Can this field be computed deterministically from other scaffold content? If yes, it does not belong in the scaffold.

---

### Invariant 2: Layer Separation in Reasoning

The architecture has three reasoning layers that must remain distinct:

| Layer | Content | May mutate? |
|-------|---------|-------------|
| Structural | The scaffold | Only via explicit human authoring or reviewed generation |
| Diagnostic | Friction observations | Yes — analytical assertions about scaffold elements |
| Interpretive | Binding constraint, executive conclusions | Yes — human judgement formally committed |

The structural layer must never mutate because of diagnostic findings. Diagnostic and interpretive artefacts reference the scaffold hash — they do not rewrite the scaffold.

**Test:** Does this change write back into the scaffold as a result of friction analysis or constraint selection? If yes, it violates layer separation.

---

### Invariant 3: Deterministic Derivation Chain

Everything downstream of the scaffold is a **pure function** of the sealed scaffold plus a versioned ruleset. The chain is:

```
Scaffold (sealed, hashed)
  → CapabilityInstance derivation
  → TopologyView / NetworkView
  → Friction analysis
  → Binding constraint selection
  → Intervention derivation (solutions, user stories)
```

Each step takes immutable inputs and produces a deterministic output. No step depends on manual modelling outside this chain.

**Test:** If we re-run this derivation step from the same sealed scaffold and ruleset version, do we get the same output? If not, the step is non-deterministic and must be corrected.

---

### Invariant 4: Grain Independence of Activities

Every Activity is a legitimate state transition regardless of grain. Composite and part Activities are the same ontological type — they differ only in the parthood relationship between them.

Composition via `compositeActivityId` changes parthood semantics and boundary continuity constraints. It does not change the type of the Activity or the rules that govern it.

**Test:** Does this Activity — composite or part — have a valid preOutcome, postOutcome, primaryRecordClassId, and entitled Role? If all four are present, it is a valid Activity regardless of grain.

---

*These invariants were first articulated by the Solution Architect (GPT) during the Session 10 design spar and accepted as permanent architecture constraints by the Product Owner.*
