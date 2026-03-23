# VCC Refinement Loop — Design Document

## Core Concept

Users generate an initial operating model via PlausibleBA (Canvas or Skills).
They import it into VCC, review it with domain expertise, and make corrections.
They then export the refined bundle back into a PlausibleBA session that
**preserves their edits and rebuilds the rest of the model around them**.

The key insight: different refinement types have different regeneration impacts
and different quality contributions.

---

## Refinement Types

### 1. Capability Map Refinement
**What the user edits:** L1/L2/L3 names, hierarchy structure, Execution/Governance classification, add/remove capabilities

**Quality contribution:** **Foundational** — capabilities are the backbone of the entire model. Every other artefact references them. Correcting capability names to match the organisation's actual language is the single highest-impact refinement a domain expert can make.

**What gets regenerated:**
- Concept Model: re-ground business objects against corrected capabilities
- Value Stream Stages: re-map `requiresCapabilityIds` to match corrected cap IDs
- PPIT: rebuild Process/People/Information/Technology decomposition per corrected capability
- Metrics: realign KPIs to corrected capability boundaries

**Prompt strategy:** "Here is a refined capability map. The user has corrected the hierarchy and naming to match their organisation. Treat these capabilities as ground truth. Rebuild the concept model, value stream stage mappings, and PPIT to align with these capabilities. Do not rename, add, or remove any capabilities."

---

### 2. Concept Model Refinement
**What the user edits:** Business object names, Party/Record/Resource classification, lifecycle states, relationships between objects

**Quality contribution:** **Ontological** — fixes what the organisation *manages*. Correcting object classification (e.g., moving something from Resource to Record) ripples through capability grounding and value stream stage objects.

**What gets regenerated:**
- Capability Map: re-check `businessObject` references on each capability
- Value Stream Stages: update `objects` arrays on each stage to match corrected object IDs
- Relationships: rebuild concept graph edges

**Prompt strategy:** "Here is a refined concept model. The user has corrected business object classification, names, and lifecycle states. Treat these objects as ground truth. Re-ground capabilities to these objects and update value stream stage object references. Do not rename, add, or remove any business objects."

---

### 3. Value Stream Refinement (stages + sequencing)
**What the user edits:** Stage names, stage ordering, add/remove stages, entry/exit criteria, value object states

**Quality contribution:** **Delivery narrative** — fixes *how* the organisation delivers value. Correcting stage sequencing and naming ensures the transformation roadmap is grounded in reality.

**What gets regenerated:**
- Stage-to-Capability mapping: re-assign capabilities to corrected stages
- PPIT: rebuild per corrected stage structure
- Outcomes: regenerate outcome chain from corrected exit criteria
- Friction assessment: invalidate previous results (stages changed)

**Prompt strategy:** "Here is a refined value stream with corrected stages. The user has fixed the delivery sequence, stage names, and entry/exit criteria. Treat these stages as ground truth. Re-map capabilities to the corrected stages and rebuild PPIT decomposition. Do not change stage names, ordering, or criteria."

---

### 4. Stage-to-Capability Mapping Refinement
**What the user edits:** Which capabilities appear in which stages (the `requiresCapabilityIds` arrays)

**Quality contribution:** **Cross-reference accuracy** — the most common error in AI-generated models is placing capabilities in the wrong stage. Domain experts instinctively know "no, we don't do backup scheduling in the onboarding stage." This refinement fixes the linkage without changing either artefact independently.

**What gets regenerated:**
- PPIT: rebuild per corrected mapping
- Friction assessment: more accurate friction scores with correct stage/capability alignment
- Throughput model: corrected dependency chain

**Prompt strategy:** "Here is a refined stage-to-capability mapping. The user has corrected which capabilities are required at each value stream stage. Treat this mapping as ground truth. Rebuild PPIT decomposition to match. Do not change capabilities or stage structure."

---

### 5. Full Model Review (all artefacts refined)
**What the user edits:** Everything — capabilities, concepts, stages, mappings

**Quality contribution:** **Comprehensive** — the user has reviewed and corrected the entire model. This is the highest-quality input possible.

**What gets regenerated:**
- Cross-validation: re-check MECE on capabilities, grounding on concepts, coverage on stages
- PPIT: full rebuild
- Metrics: realign to corrected model
- Bundle metadata: update version, regeneration timestamp

**Prompt strategy:** "Here is a fully reviewed operating model. The user has corrected all artefacts — capabilities, concepts, value stream stages, and mappings. Treat the entire model as ground truth. Run full cross-validation (every capability should be referenced by at least one stage, every business object should ground at least one capability, every stage should have at least one capability). Report any gaps but do not change the user's model — only add missing linkages where obvious."

---

## UX Flow

### In VCC:
1. User makes edits to their model (rename caps, move stages, etc.)
2. User clicks **"Refine & Regenerate"** button (in toolbar or menu)
3. Modal presents checkboxes: "What did you refine?"
   - [ ] Capability Map
   - [ ] Concept Model
   - [ ] Value Stream & Stages
   - [ ] Stage-to-Capability Mapping
   - [ ] Full Model Review
4. User selects their refinement type(s)
5. VCC generates:
   - The edited bundle JSON (exported as file)
   - A tailored prompt (copied to clipboard) that instructs PlausibleBA to rebuild around the edits
6. User opens a new Cowork task, pastes the prompt, attaches the JSON

### The prompt includes:
- What was refined (so the AI knows what to preserve)
- What to rebuild (so the AI knows what to regenerate)
- The quality contribution (so the AI understands *why* the edits matter)
- Explicit "do not change" instructions for the refined artefacts

---

## Implementation

### Phase 1 (MVP — today):
- Add "Refine & Regenerate" button to VCC toolbar
- Modal with refinement type selection
- Export bundle JSON + copy prompt to clipboard
- Prompt templates for each refinement type

### Phase 2 (future):
- Track which elements the user actually edited (diff detection)
- Auto-suggest refinement type based on what changed
- Inline regeneration via API call (no Cowork round-trip)
- Version history: v1 (generated) → v2 (refined) → v3 (regenerated)
