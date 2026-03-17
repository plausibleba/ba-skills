---
name: ba-plausibleba
description: >
  Use this skill when someone wants to run a complete business architecture session —
  producing a Capability Map, Concept Model, and Value Stream in one guided flow.
  Trigger on phrases like: "run PlausibleBA", "build my business architecture",
  "I want a full BA model", "run all three", or when someone invokes /plausibleba.
  This skill orchestrates the three individual skills in sequence and packages the
  result into a single ba-skills-bundle.json for VCC import.
---

# PlausibleBA Orchestrator Skill

> **Note:** This skill coordinates ba-capability-mapping, ba-concept-model, and
> ba-value-streams. Read those skills if anything here is unclear about phase behaviour.

## Purpose

Run the complete PlausibleBA stack as a single guided session. The user provides one
business description; the skill produces three artefacts and one bundle, with minimal
interruption.

**Design principle:** The user should always know where they are and what's coming next.
Each phase begins with a progress header. Downloads are deferred until the bundle is
complete. Checkpoints are decisive — one per phase (except capability mapping which
needs two: L1/L2 before L3).

---

## Session Opening

After `/plausibleba` is invoked, state the plan clearly before asking anything:

> *"We'll build three artefacts in sequence:*
> *Phase 1 — Capability Map: what your organisation can do*
> *Phase 2 — Concept Model: what your organisation manages*
> *Phase 3 — Value Stream: how your organisation delivers value*
>
> *Each phase has one confirmation checkpoint. At the end I'll package everything into
> a bundle you can load directly into VCC. Total time: 20–30 minutes.*
>
> *Let's start. [If no description provided: In one or two sentences, what is this
> business or initiative?]*"

If a business description was provided inline, skip the opening question and state:

> *"Got it — [restate the business in one sentence]. Starting with capabilities."*

---

## Progress Header

Display at the start of each phase. Use plain text, not a code block:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PLAUSIBLEBA  ▸  Phase [N] of 3 — [Phase Name]
  [✓ Previous phase name (N capabilities/objects/stages)]
  [→ Current phase]  [○ Remaining phases]  [○ Bundle]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Examples:
- Start of Phase 1: `→ Capability Map  ○ Concept Model  ○ Value Stream  ○ Bundle`
- Start of Phase 2: `✓ Capability Map (42 capabilities)  → Concept Model  ○ Value Stream  ○ Bundle`
- Start of Phase 3: `✓ Capability Map (42 capabilities)  ✓ Concept Model (15 objects)  → Value Stream  ○ Bundle`

---

## Phase 1 — Capability Map

Follow the ba-capability-mapping SKILL.md elicitation process with these modifications:

**Checkpoints:** Two (1A for L1/L2, 1B for full L3 map) — same as standalone skill.
**Visualisation:** Render treemap after Checkpoint 1B is confirmed. Same spec as standalone.
**Handoff:** At phase end, extract and carry forward:
- The confirmed L3 capability list (id, name, businessObject)
- The full list of business objects identified in Step 2

Do NOT offer XLSX or JSON download. Say:

> *"Capability map complete — [N] capabilities across [N] domains. Moving to Phase 2."*

Then display the Phase 2 progress header immediately.

---

## Phase 2 — Concept Model

Follow the ba-concept-model SKILL.md elicitation process with these modifications:

**Seeding:** Pre-populate the object list from the business objects carried forward from
Phase 1. Present them to the user as a starting point rather than starting from scratch:

> *"From the capability map we already have [N] business objects identified: [list].
> I'll classify these and check for anything missing."*

**Checkpoint:** One — present the classified objects and relationships before rendering.
**Visualisation:** Render concept graph after Checkpoint 2 is confirmed.
**Cross-validation:** Run against Phase 1 capabilities automatically (no user prompt needed).
**Handoff:** Carry forward the typed object list (id, name, type: Party/Resource/Record).

Do NOT offer XLSX or JSON download. Say:

> *"Concept model complete — [N] objects ([N] Party, [N] Resource, [N] Record). Moving to Phase 3."*

Then display the Phase 3 progress header immediately.

---

## Phase 3 — Value Stream

Follow the ba-value-streams SKILL.md elicitation process with these modifications:

**Seeding:** Use Phase 1 capabilities and Phase 2 objects as the source for stage
capability mapping and value object identification. Do not re-elicit what is already known.

**Checkpoint:** One — present the stage draft with entry/exit states and mapped capabilities.
**Visualisation:** Render stage view after Checkpoint 3 is confirmed.
**Cross-validation:** Flag unused capabilities from Phase 1 automatically.

After Checkpoint 3 is confirmed and the stage view is rendered, say:

> *"Value stream complete — [N] stages. Ready to package the bundle."*

Then proceed directly to the Bundle step.

---

## Bundle Assembly

After Phase 3 is confirmed, assemble and offer the bundle without waiting to be asked.

Construct `[organisation]-ba-skills-bundle.json` following the ba-skills-bundle schema v1.0.0:

```json
{
  "meta": {
    "bundleVersion": "1.0.0",
    "scaffoldId": "[generated uuid]",
    "name": "[Organisation] — Business Architecture",
    "generatedAt": "[ISO timestamp]",
    "generatedBy": "PlausibleBA Skills Library v1.5.0"
  },
  "elements": {
    "capabilities": { ... },
    "concepts": { ... },
    "valueStreams": { ... },
    "valueStreamStages": { ... },
    "outcomes": { ... },
    "roles": { ... },
    "metrics": { ... },
    "informationObjects": { ... }
  }
}
```

Then say:

> *"Here is your complete PlausibleBA bundle. You can load this directly into VCC.*
>
> *What would you like to download?*
> *— Bundle JSON (for VCC import)*
> *— Capability Map XLSX*
> *— Concept Model XLSX*
> *— Value Stream XLSX*
> *— All of the above"*

---

## Error Handling

**User wants to skip a phase:** Allow it. Say "Skipping [phase] — you can run `/[command]`
later if needed" and proceed. The bundle will be partial; note which elements are missing.

**User wants to redo a phase:** Allow it. Re-run the phase from its progress header.
Previous phase outputs are preserved.

**Input is too sparse to start Phase 1:** Ask one question only — "What is this business
or initiative?" — before proceeding.

**Long or complex domains:** If a domain has >8 L1 areas, pause and suggest scoping:
"This looks like a large enterprise. Shall we scope to a specific business unit or
division, or continue with the full enterprise map?"

---

## What This Skill Does NOT Do

- Does not offer downloads mid-session (deferred to Bundle step)
- Does not re-elicit information already established in a previous phase
- Does not run the three skills as independent sessions — context carries through
- Does not produce partial bundles without noting which elements are missing
