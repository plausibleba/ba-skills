# Product Strategy

*Last updated: 15 March 2026 | Author: Terry Roach*
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
- **Postgres-backed persistence** — replaces the client-side only (D-008) approach. Skills-as-entry-point has made low-friction onboarding a solved problem; durability, multi-user state, and saved workspaces now require a real persistence layer.
- **Skills handle intake** — Claude Skills (PlausibleBA, etc.) are the low-friction entry point. No login required to explore. Postgres-backed VCC is the paid layer where work is saved, shared, and analysed.
- **Bundle is the handoff format** — `ba-skills-bundle.json` (and equivalent vertical bundles) remain the interoperability contract between Skills and Core.

### Core feature primitives (known)
These are required by every vertical product and belong in Core:

| Primitive | Status | Notes |
|-----------|--------|-------|
| Navigation | Partial | Network → Stage → element drill-down. Needs to be complete and reliable. |
| Heatmaps | Partial | Friction overlay on canvas. Exists in some form. |
| Inspectors | Partial | Element-level detail panels. Click/right-click experience for any node. |
| Charts | Not built | Will be pulled in as verticals require |
| Tabular Views | Not built | Will be pulled in as verticals require |
| Form Views | Not built | Will be pulled in as verticals require |
| Tree Views | Not built | Will be pulled in as verticals require |
| Reports | Not built | Will be pulled in as verticals require |

Core feature surface is **emergent** — primitives are added as verticals pull on them, not designed upfront.

---

## 4. Product Inventory

### Tier 1 — Active (in-flight now)

#### PlausibleBA
- **Audience:** Business Analysts and Business Architects
- **Value proposition:** BIZBOK-grounded capability maps, concept models, and value streams from any business description. Just enough business architecture for every BA on every project.
- **Entry point:** Three Claude Skills (`/capability-map`, `/concept-model`, `/value-stream`) — free, no login
- **Paid layer:** VCC Core — saved workspaces, collaboration, workshop tools
- **Differentiating features:** Workshop tools, BIZBOK grounding, ba-skills-bundle VCC export
- **Status:** Skills live at v1.4.0. Website and Substack pending. **Guild Summit deadline: 23 March 2026.**
- **Relationship to VCC:** PlausibleBA is the front door. Skills produce a `ba-skills-bundle.json` that imports into VCC Core.

---

### Tier 2 — Active exploration (real stakeholders, prototype phase)

#### PlausibleAgents
- **Audience:** AI architects, platform engineering teams, agentic system designers
- **Value proposition:** Operating model governance for AI agent systems. Provides the authorised action space, escalation rules, and context engineering structure that agentic systems require.
- **Key stakeholder:** Eric Broda (Agentic Mesh). VCC sits at Layer 5 of his Trust Framework. MVC Concept/Policy Cards at Layers 3–4. Governance Kernel at Layers 2–3.
- **Differentiating features:** Governance framework overlay, MVC Concept/Policy Card integration, agent boundary definition
- **Status:** Exploratory. Eric evaluating. Prototype features needed to generate feedback and requirements.

#### PlausibleDiligence
- **Audience:** Private equity firms, tech due diligence teams
- **Key stakeholder:** Crosslake (PE DD firm). Their proprietary IP and assessment methodology will be incorporated.
- **Value proposition:** Structured operating model assessment of portfolio company candidates. Surfaces technical and operational risk in a governed, reproducible format.
- **Differentiating features:** DD-specific report templates, Crosslake IP integration, portfolio company assessment workflow
- **Status:** Exploratory. Crosslake evaluating. Likely a services engagement model, not pure SaaS.
- **Commercial model:** Probably project-based / licensed IP rather than subscription.

---

### Tier 3 — Parked ideas (named, not in-flight)

| Product | Audience | Differentiating layer |
|---------|----------|-----------------------|
| PlausibleSalesDiscovery | Sales / pre-sales reps | Frictions → solutions → customer stories. Salesforce integration. |
| PlausibleTransformations | Transformation programme leads | Strategic requirements, user stories, sprint scoping. Possibly an extension of PlausibleBA. |
| PlausibleStartups | Founders / early-stage investors | Business model evaluation, SWOT, investor reports |
| PlausibleBoard | Boards / governance committees | Board-level canvas, governance reporting |
| PlausibleEndeavour | Long-term flagship | Full CAPSICUM Framework — consolidation of all verticals |

These are named to reserve the positioning and avoid drift. They are not being built now.

---

## 5. GTM Sequencing

### Now (March 2026)
1. **PlausibleBA launch** — Guild Summit 23 March. Website live, Substack launched, skills confirmed at v1.4.0. This is the test case that creates the template for all subsequent product launches.
2. **PlausibleAgents prototype** — Advance Core (Postgres, Navigation, Inspectors, Heatmaps) to a level that lets Eric explore and provide requirements.
3. **PlausibleDiligence prototype** — Same Core advancement enables Crosslake exploration. DD-specific feature layer to be defined with them.

### Near term (April–May 2026)
- Iterate Core based on feedback from Eric and Crosslake
- IIBA BBC Event (mid-April) — PlausibleBA 2 skills live
- Australian BA Leadership Summit (12 May) — all 3 skills + full pipeline demo
- Begin PlausibleSalesDiscovery scoping if Salesforce pre-sales traction warrants it

### Later
- PlausibleBoard, PlausibleTransformations, PlausibleStartups as market pull emerges
- PlausibleEndeavour as long-term consolidation

---

## 6. Commercial Model (current thinking)

| Product | Model |
|---------|-------|
| PlausibleBA Skills | Free (Claude Skills, no login) |
| PlausibleBA Core (VCC) | Paid — workspace/collaboration tier |
| PlausibleAgents | Enterprise license / API |
| PlausibleDiligence | Services engagement + licensed IP |
| PlausibleSalesDiscovery | Per-seat or per-engagement (TBD) |
| Others | TBD — will follow pattern established by BA |

**Key principle:** Free tools build audiences and generate input artefacts. Paid Core captures value when users need persistence, collaboration, and analytical depth. Each vertical establishes its own commercial model appropriate to its buyer.

---

## 7. What This Is Not

- Not another company (post-Capsifi). The objective is a proof of concept compelling enough to open doors to collaboration or acquisition.
- Not an academic exercise. Though selective academic publishing may be valid for PlausibleAgents / PlausibleEndeavour.
- Not a conglomerate product. VCC is being pared back to a clean Core. Each vertical has only the features its audience needs.

---

## 8. Open Questions

- What is the minimum PlausibleCore feature set required before Crosslake and Eric can meaningfully evaluate?
- Is PlausibleDiligence a separate company (Crosslake JV) or a product within the Plausible family?
- What is the right pricing tier structure for PlausibleBA Core — individual BA, team, enterprise?
- When does PlausibleSalesDiscovery warrant its own website vs. being a page within PlausibleBA?
- At what point does "Plausible" need a parent brand website (plausible.com or similar)?

---

*Related documents: `ARCHITECTURE.md`, `CLAUDE.md`, `plausibleba-context.md`, `VCC_Context_Brief.docx`*
*Do not merge with VCC technical context. This is strategic layer only.*
