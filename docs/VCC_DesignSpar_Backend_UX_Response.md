# VCC Design Spar — UX Challenge Response

**Responding Agent:** UX Challenger
**Date:** 11 March 2026
**Context:** Backend architecture and multi-user evolution briefing
**Primary Users in Mind:** Salesforce pre-sales reps (non-technical, Slack-native, need speed and visual impact)

---

## Executive Position

VCC faces a critical architectural choice disguised as a technical question. The real issue is not whether to build a backend — it is whether you are building a **sales tool** or a **product platform**. These require fundamentally different UX architectures.

My position: **Build the minimum backend for the Puretec sales demo (R1 + essentials of R2), but design it API-first as a platform from day one.** Slack is your primary distribution channel for the next 18 months; the web canvas is a secondary consumption interface. This inverts the current UX hierarchy and changes what you optimize for.

I will challenge three assumptions that are constraining good UX:

1. **The web canvas is the primary interface.** It is not. Not for your actual users. Slack is.
2. **Modules should be a user-facing mode choice.** They should not. They should be invisible — inferred from context and workflow.
3. **Round-trip editing should be unified.** It should not. Structured edits and conversational revisions are cognitively different and should have different surfaces.

---

## Section 1: The Slack-First Reframing

### 1.1 What the Field Data Actually Shows

Daniel's field report is not subtle: the sales team operates in Slack. They do not context-switch to web applications for sales work. They push content into Slack and interact with results there. The Puretec customer wanted access immediately — to what? Not the web canvas. To an automated system that takes their discovery content and produces outputs within the Slack conversation where that discovery is happening.

**This is not a nice-to-have. This is the primary user workflow.**

The web canvas is a *secondary interface* — useful for board presentations, detailed review, and sharing outputs. But the core sales discovery loop is:

1. Discovery call ends
2. Transcript goes to Slack
3. VCC processes it and posts results in thread
4. Sales rep reviews in Slack, makes corrections conversationally
5. Optionally opens web canvas for detailed review or sharing

Currently, you have this inverted. You have designed a web-first product that happens to have a Slack attachment. The UX should be Slack-first with web as a secondary client.

### 1.2 Slack Integration: Staged Rollout

#### Level 0 (Minimum for Puretec Demo): Inbound + Status
- Sales rep pushes transcript to a `#vcc-discovery` channel
- Slack message handler extracts content, sends to VCC pipeline
- VCC processes and posts a formatted summary back to thread with a "View Full Canvas" link
- Does NOT require: conversational state, copilot, bot mentions

**What it looks like:**
```
Sales rep: [uploads transcript file]
@vcc-bot: Processing... (status update)
@vcc-bot: Found 4 Value Streams, 12 friction points.
[Formatted card showing top friction points]
[View Full Canvas] [Download Bundle]
```

#### Level 1 (Sales Team Adoption): Copilot + Revisions
- Slack bot becomes conversational. Reps mention `@vcc-bot` with commands or corrections
- Requires: conversational state tracking, Pass 5 (Revision), formatted output

**When to build this:** After Puretec demo, when you see the sales team actually using Level 0.

#### Level 2 (Downstream Automation): Feed Proposal Tools
- VCC output flows into existing Salesforce Slack apps
- Requires: structured webhook payloads, Slack workflow integration

**When to build this:** When downstream tools are ready and you understand their data formats.

### 1.3 The Web Canvas in a Slack-Primary World

If Slack is primary, the canvas is for:
- **Read-only consumption:** Share with customer for review
- **Detailed review:** Deep dive into relationships and diagnostics
- **Board presentation:** Export-quality output
- **Transformation handoff:** Augment with user stories, share with delivery team

The canvas is *not* the primary editing surface for sales reps.

**Implication:** The canvas does NOT need inline editing in the MVP. It can remain read-only or have edit capability tucked into a side panel. The primary edit surface is Slack.

---

## Section 2: Module Architecture — The UX Position

### 2.1 Why Explicit Modules Are Bad UX

Showing a "Choose Your Module" dialog at the start is asking the user to make a technical choice before they understand what modes exist or what their consequences are. This is bad UX.

### 2.2 Progressive Disclosure Instead

Infer the module from the user's actions, and progressively reveal capabilities based on what they ask for.

- **User uploads a transcript:** System assumes Sales Discovery context. Shows value streams, capabilities, activities, friction heatmap. Hides user stories, MVC cards, transformation artifacts.
- **User clicks "Generate User Stories":** System upgrades to Transformation context. Reveals TransformationPane.
- **User loads an existing model for review:** System defaults to Board Diagnostic context.

This is **capability disclosure**: show the user what they need for their current task, and gradually unfold more capabilities as they request them.

**Risk:** The system must correctly infer context. If it guesses wrong, the user experiences confusing capability gaps.

**Mitigation:** Provide an explicit "Switch Context" menu (not prominent, but available) for cases where automatic inference fails.

### 2.3 The Boundary Case: Transformation Handoff

**My position for MVP:** Export/import preserves the bundle portability principle and creates a clear hand-off boundary. Sales rep exports the VCC as a portable bundle. Transformation consultant imports it as a new project in Transformation context. Once you have multi-user backend with permissions, revisit shared-view-with-role-based-panels.

---

## Section 3: Round-Trip Editing — Two Different Things

### 3.1 Structured Editing (R2)

User wants to click on a value stream and rename it. This is **direct manipulation**.

**UX pattern: Inline editing in a dedicated edit mode**

- Canvas switches to "Edit Mode" (a toggle, not a separate view)
- Nodes become editable. Click a Value Stream, a text field appears
- Changes are applied immediately to the local store
- "Save" button commits changes to backend
- Validation runs per-field

Do NOT try to do this inline in presentation mode. You need a dedicated edit mode that simplifies the view, darkens non-editable content, and makes affordances obvious.

### 3.2 Conversational Editing (R5)

User wants to say: "we have a friction point about data migration latency in the Provisioning stage."

This is **ambiguous intent** — the LLM must interpret it and apply changes.

**UX pattern: Revision Request Dialog**

- User clicks "Request Changes" (or in Slack: mentions `@vcc-bot` with corrections)
- Dialog opens with a text area: "Describe what should change"
- System sends to Pass 5 (Revision)
- LLM returns a delta
- Dialog shows the changes: "I plan to: [add friction point], [update capability name]..."
- User approves or rejects
- Changes are applied

**Why this pattern:** Explicitly signals "This involves LLM interpretation." Approval step creates audit trail. In Slack, becomes thread-based conversation.

### 3.3 The Audit Implications

- **Structured edits:** User X edited field Y at timestamp Z. No ambiguity.
- **LLM revisions:** User X submitted correction, LLM interpreted as delta, User X approved. Full chain visible.

**Do not let these two edit modes create a provenance mess.**

---

## Section 4: The Discovery Content Ingest (R6)

### 4.1 The UX Anti-Pattern

Do NOT create a "multi-file uploader" where users drag-and-drop five different file types and hope the system figures them out. The files have different semantics.

### 4.2 The Right Pattern: Structured Intake Form

**Phase 1 (MVP for Puretec demo):** Accept transcript only. Do not add R6 yet.

**Phase 2 (Sales team rollout):** Add structured intake where each supporting material is explicitly classified by the user:

```
Discovery Intake Form
  1. Discovery Transcript [Upload or paste]
  2. Supporting Materials (optional)
     - [ ] Org Chart [Upload] [Format: XLSX/CSV/BPMN]
     - [ ] Process Catalogue [Upload] [Format: XLSX/CSV/BPMN]
     - [ ] Application Portfolio [Upload] [Format: XLSX/CSV/JSON]
     - [ ] Industry Reference [Upload] [Format: XLSX/CSV/PDF]
     - [ ] Other Documentation [Upload] [Brief description]
```

Each supporting material is explicitly classified. The user tells you what they are uploading.

---

## Section 5: The Sequencing Question

### 5.1 For the Puretec Demo (Next 4-5 Weeks)

**Build only:** R1 (multi-user backend) + essentials of R2 (load/save) + R4 Level 0 (Slack inbound)

**Sequence:**
1. **Week 1-2:** Backend scaffold. Supabase auth + bundle storage. API working.
2. **Week 2-3:** Slack webhook handler. POST transcript to Slack, get summary link.
3. **Week 3-4:** Canvas read-only mode + basic field editing.
4. **Week 4-5:** Polish. Slack message formatting. Demo preparation.

**What to NOT build yet:** R3 (modules), R5 (conversational editing), R6 (multi-content ingest).

**Demo flow:**
```
Sales rep uploads transcript to #vcc-discovery
-> Slack bot processes (30 seconds)
-> Summary posted to thread
-> Rep clicks "View Full Canvas"
-> Canvas loads with model
-> Rep can edit field values
-> Changes save to backend
-> Rep shares canvas link with customer
```

### 5.2 For the Sales Team Rollout (Weeks 5-12)

**Weeks 5-7:** Full round-trip editing (edit mode on canvas, edit panel)
**Weeks 7-9:** Slack copilot (R4 Level 1, bot responds to mentions, Pass 5 integration)
**Weeks 9-10:** Modular context (R3, progressive disclosure)
**Weeks 10-12:** Conversational editing full flow (R5, revision request dialog, audit trail)
**Later:** R6 multi-content ingest

---

## Section 6: The Minimum for Puretec Demo

### 6.1 The Demo Story

Current demo story:
```
"Let me show you the VCC tool. [loads web canvas]
You paste a transcript here."
```

Better demo story for sales audience:
```
"Here's how it works in your Slack.
You finish a discovery call, paste the transcript here.
Thirty seconds later, VCC has analysed your model.
You click through to the canvas to review the details.
You share the canvas with the customer.
Total time: 2 minutes from transcript to customer view."
```

### 6.2 The Visual Polish

Sales audience cares about visual impact:
- Slack output formatted with Block Kit cards, not plain text
- Friction heatmap with color (red high, yellow medium)
- Value streams visually distinct
- Friction points scannable (icon + short label, not paragraphs)

Spend 2-3 days on visual polish. It disproportionately affects "wow" factor.

---

## Section 7: The Web Canvas — What Changes

### 7.1 Canvas as Read-Only Output (MVP)

Default to read-only:
- Reduces cognitive load
- Makes structure clear without edit affordances cluttering the view
- Supports "share with customer for review" use case

### 7.2 Edit Mode on the Canvas

When user clicks "Edit Mode":
- Background dims slightly (non-edit areas fade)
- Nodes become clickable for inline editing
- "Save" and "Cancel" buttons appear
- Selected nodes expand to show editable fields

This is a different view, not the presentation view.

### 7.3 Module-Specific Feature Hiding

Use opacity and subtle gray-out, not sudden panel removal. The user should not experience panels appearing and disappearing.

---

## Section 8: Critical Assumptions to Challenge

### 8.1 The Web Canvas Is the Sales Tool
**Challenge:** The sales team uses Slack. Designing VCC as a web SPA with Slack as an attachment is backwards. Demo the Slack integration first.

### 8.2 Structured and LLM Editing Can Share a Surface
**Challenge:** They are cognitively different. Putting both behind a side panel creates confusion. Keep them separate until evidence says otherwise.

### 8.3 You Need All Six Requirements for the MVP
**Challenge:** You need R1, essentials of R2, and R4 Level 0. Including R3, R5, and R6 in MVP scope delays the demo.

---

## Section 9: Positions on the Six Tensions

### Tension 1: Speed to Market vs Architectural Integrity
Option C (Hybrid). Start with Supabase + Vercel Edge. Add capabilities incrementally.

### Tension 2: Bundle as File vs Bundle as Service
Bundle is the exchange and export format. Internally stored in Postgres JSONB. Preserves portability.

### Tension 3: Web App vs API-First
API-first backend design, but MVP frontend is still a React SPA. Slack bot consumes same API later.

### Tension 4: Module Granularity
Modules are context-inferred, not user-chosen. Progressive disclosure. "Switch Context" menu as fallback.

### Tension 5: LLM as Editor vs LLM as Generator
Different prompt patterns. Both supported, but separately. Generator (Passes 1-4) for MVP. Editor (Pass 5) for sales team rollout.

### Tension 6: Single-Tenant MVP vs Multi-Tenant
Single-tenant now. Multi-tenant when enterprise customer with multiple divisions requests it.

---

## Decision Record — What I'm Locking

### LOCKED: Slack Integration Level
Level 0 (Inbound) for Puretec demo. Level 1 (Copilot) for sales team rollout. Level 2 (Outbound) later.

### LOCKED: Modules
Invisible, context-inferred, not user-chosen. Progressive disclosure. "Switch Context" menu available but not prominent.

### LOCKED: Editing
Structured editing in canvas edit mode. Conversational editing NOT in MVP — add in sales team rollout with revision approval dialog.

### LOCKED: Canvas UX
Read-only by default. Edit mode toggle. No inline editing in presentation mode.

### LOCKED: Content Ingest
Transcript only for MVP. Structured intake form for multi-format in Phase 2.

### LOCKED: Demo Scope
R1 (multi-user) + R2 essentials (load/save + basic edit) + R4 Level 0 (Slack inbound). Everything else deferred.

---

## Final Provocations

### The Slack-Canvas Inversion
VCC's biggest competitive advantage is the ability to run automated discovery analysis inside the Slack conversation where that discovery is happening. Demo the Slack bot. Not the canvas.

### Modules Are Not a Feature
Modules should be invisible. The product should feel simple — you upload a transcript, you get a model, you see the features you need. That simplicity is the feature.

### Bundle Portability and Server Persistence Are Compatible
D-095 does not mean "no backend." It means the bundle remains the exchange format. Internally, the backend stores it in Postgres. On the boundary, it is JSON.

---

## The Three-Week Path to Puretec Demo

**Build:**
- Week 1-2: Supabase auth + bundle storage + API skeleton
- Week 2-3: Slack webhook handler + formatted output
- Week 3-4: Canvas read-only mode + basic field editing
- Week 4-5: Visual polish + demo preparation

**Do NOT build:** Modules as user choice, conversational editing, multi-format ingest, real-time co-editing, multi-tenant data model

**Demo story:** Sales rep posts transcript to Slack -> VCC processes -> summary in thread -> rep opens canvas to review and edit -> shares with customer. Total time: 2 minutes.
