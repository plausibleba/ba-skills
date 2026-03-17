# Product Strategy

*Last updated: 17 March 2026 | Author: Terry Roach*
*Read this before making product, roadmap, or GTM decisions.*

---

## 1. The Strategic Arc

This project began as a board-level governance canvas (VCC), morphed through a sales discovery tool, explored transformation project support, and is now being evaluated as an agentic governance instrument and a PE due diligence platform. That breadth is not scope creep — it is evidence that the underlying framework (CAPSICUM) has genuine cross-domain applicability.

The strategic response is to stop treating VCC as a single product and instead build a **named product family** on a shared core engine. Each product addresses a distinct audience with a distinct value proposition, but all share the same ontological foundation and interoperable artefact format.

**The family brand is Plausible.**

The moat is not any single product. It is the CAPSICUM Framework instantiated as a software engine that no competitor has — because no competitor has the framework.

---

## 2. The Platform Model

```
PlausibleCore  (shared engine — CAPSICUM ontology, canvas, persistence)
      │
      ├── PlausibleBA              BA / BizArch practitioners
      ├── PlausibleSalesDiscovery  Sales / pre-sales teams
      ├── PlausibleTransformations Transformation leads
      ├── PlausibleAgents          AI architects / platform teams
      ├── PlausibleStartups        Founders / early-stage investors
      ├── PlausibleBoard           Boards / governance committees
      ├── PlausibleDiligence       PE firms / tech due diligence
      └── PlausibleEndeavour       Long-term flagship (full framework)
```

Each vertical product is:
- A named website with its own positioning and audience
- A pared-back Core plus vertical-specific feature extensions
- Independently licensed and distributed
- Producing artefacts that are interoperable across the family

---

## 3. PlausibleCore

The shared engine underpinning all products. Currently instantiated as the VCC codebase. The "VCC" label is retained internally as the working name for the codebase and canvas.

### Architecture direction
- **Postgres-backed persistence** — D-008 (client-side only) formally superseded. Schema, RLS, project store, auto-save, and optimistic locking implemented. TypeScript type errors being resolved.
- **Skills handle intake** — Claude Skills are the low-friction entry point. No login required to explore. Postgres-backed VCC is the paid layer.
- **Bundle is the handoff format** — `ba-skills-bundle.json` is the interoperability contract. Normalisation layer in VCC handles multiple input shapes.
- **Multi-user sharing** — implemented. ShareDialog, project_access table, RLS, "My Projects" / "Shared with me" UI.

### Core feature primitives
| Primitive | Status | Notes |
|-----------|--------|-------|
| Navigation | Partial | Network → Stage → element drill-down |
| Heatmaps | Partial | Friction overlay on canvas |
| Inspectors | Partial | Element-level detail panels |
| Concept/Policy Cards | ✅ Built | Pass D pipeline, CardRegistry, CardPanel, canvas rendering |
| Charts | Not built | Emergent — added as verticals require |
| Tabular Views | Not built | Emergent |
| Form Views | Not built | Emergent |
| Tree Views | Not built | Emergent |
| Reports | Not built | Emergent |

---

## 4. Product Inventory

### Tier 1 — Active

#### PlausibleBA
- **Audience:** Business Analysts and Business Architects
- **Value proposition:** BIZBOK-grounded capability maps, concept models, and value streams from any business description. Just enough business architecture for every BA on every project.
- **Entry point:** Four Claude Skills — `/plausibleba` (orchestrator), `/capability-map`, `/concept-model`, `/value-stream` — free, no login
- **Paid layer:** VCC Core — saved workspaces, collaboration, workshop tools
- **Status:** Skills live at v1.7.0. Website live at plausibleba.com. Canvas live at plausibleba.com/canvas. Substack pending. **Guild Summit: 23 March 2026.**
- **Install path:** Zip upload (primary, confirmed working). Anthropic marketplace submission pending review. GitHub install not supported for public repos by design.

---

### Tier 2 — Active exploration

#### PlausibleAgents
- **Key stakeholder:** Eric Broda (Agentic Mesh)
- **Differentiating features:** Concept/Policy Card generation and management, MVC integration, governance framework overlay
- **Status:** Card pipeline built. Multi-user sharing available. Prototype evaluation in progress.

#### PlausibleDiligence
- **Key stakeholder:** Francis / Crosslake (PE DD firm)
- **Status:** Multi-user sharing available. Awaiting Crosslake assessment IP. Services engagement model likely.

---

### Tier 3 — Parked

| Product | Audience | Differentiating layer |
|---------|----------|-----------------------|
| PlausibleSalesDiscovery | Sales / pre-sales | Frictions → solutions → customer stories |
| PlausibleTransformations | Transformation leads | Strategic requirements, user stories, sprint scoping |
| PlausibleStartups | Founders / investors | Business model evaluation, SWOT, reports |
| PlausibleBoard | Boards | Board-level canvas, governance reporting |
| PlausibleEndeavour | Flagship | Full CAPSICUM Framework consolidation |

---

## 5. The Full User Journey (confirmed working 17 March 2026)

```
Install PlausibleBA skills in Cowork (zip upload, ~2 min)
      ↓
Run /plausibleba [business description]
      ↓
Guided 3-phase session: Capability Map → Concept Model → Value Stream
      ↓
Download ba-skills-bundle.json
      ↓
Drop on plausibleba.com/canvas → instant free visualisation
      ↓
"Open in VCC" CTA → Postgres-backed platform
      ↓
Saved workspaces, friction analysis, multi-user sharing, Concept/Policy Cards
```

End-to-end tested with Dough-to-Door case study on 17 March 2026.
Bundle → VCC and bundle → canvas fixes applied same day by Opus.
Full pipeline pending re-test on 18 March 2026.

---

## 6. GTM Sequencing

### Now (March 2026)
1. **PlausibleBA launch** — Guild Summit 23 March. Full pipeline confirmed. Skills at v1.7.0.
2. **PlausibleAgents** — Eric Broda. Card pipeline built. Awaiting prototype feedback session.
3. **PlausibleDiligence** — Crosslake. Awaiting Francis's assessment IP.

### Near term (April–May 2026)
- Account creation, onboarding, billing (Stripe — not started, weeks of work)
- Visualisation harmonisation — align skill outputs and canvas with VCC design language
- IIBA BBC Event (mid-April)
- Australian BA Leadership Summit (12 May) — full pipeline demo

---

## 7. Commercial Model

| Product | Model |
|---------|-------|
| PlausibleBA Skills | Free (Claude Skills) |
| PlausibleBA Canvas | Free (plausibleba.com/canvas) |
| PlausibleBA Core (VCC) | Paid — workspace/collaboration |
| PlausibleAgents | Enterprise license / API |
| PlausibleDiligence | Services engagement + licensed IP |
| Others | TBD |

---

## 8. Anthropic Marketplace

- Submission: "Business Architecture" — submitted 16 March 2026, pending review
- GitHub marketplace install is for private repos only — public distribution requires official marketplace
- Bug report filed — clarified as by-design, not a bug
- Zip upload is confirmed interim install path until marketplace approval

---

## 9. Open Questions

- Minimum PlausibleCore feature set for Crosslake and Eric to meaningfully evaluate?
- Is PlausibleDiligence a Crosslake JV or a product within the Plausible family?
- Pricing tier structure for PlausibleBA Core?
- Account/billing infrastructure — not started
- Skill output bundle format should be fixed at source (not just normalised at import) — post-Summit

---

*Related: `ARCHITECTURE.md`, `CLAUDE.md`, `plausibleba-context.md`, `VCC_Context_Brief.docx`*
*Do not merge with VCC technical context.*
