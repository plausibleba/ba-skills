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

## 9. What Doesn't Belong (Yet)

The Transformation pane is reserved for **future transformation artefacts**:
- Painpoints
- Ideas
- Requirements
- Acceptance criteria
- Epics
- Initiatives

These are not yet modelled. When they are, they will anchor to activities (not capabilities), because activities are where friction lives.
