# BIZBOK v15 Analysis: PlausibleBA & VCC Alignment Assessment

**Filed:** 2026-04-17 (Session 35)
**Source:** BIZBOK Guide v15, Sections 2.2 (Capability Mapping) and 2.4 (Value Mapping)
**Purpose:** Identify where our PlausibleBA skills and VCC discovery pipeline align with, diverge from, or could be improved by BIZBOK v15 methodology — with the goal of producing "Guild-endorsed" agents.

---

## 1. Capability Mapping — Alignment & Gaps

### What We Already Do Well (Aligned with BIZBOK)

| BIZBOK Principle | Our Implementation | Status |
|---|---|---|
| Capability = "what" not "how/where/why" | Embedded in all prompts and skill instructions | ✅ Aligned |
| Business-object grounding | Every L4 must reference a named business object | ✅ Aligned |
| MECE discipline (mutually exclusive, collectively exhaustive) | Core rule in capability mapping skill | ✅ Aligned |
| Verb–Noun naming convention | Required in skill and pipeline prompts | ✅ Aligned |
| Heat mapping concept | VCC supports heat mapping via capability attributes | ✅ Aligned |
| Single canonical map per enterprise | Implied by our single-project model | ✅ Aligned |
| Decomposition levels (L1–L4) | Four-level hierarchy in both skill and pipeline | ✅ Aligned |
| Capability is stable / enduring | "Not a process step" rule in skill | ✅ Aligned |

### Gaps and Divergences

#### GAP-CM-1: Missing "Capability Behavior" Concept
**BIZBOK:** Defines "capability behavior" as characterizing how a capability conducts itself — separate from the capability itself. Behaviors characterize both capabilities and capability instances.
**Our approach:** We don't model capability behavior as a separate construct. Our PPIT enricher touches on this but conflates it.
**Recommendation:** Consider adding capability behavior as a first-class attribute in the metamodel. This supports the BIZBOK knowledgebase relationship: "Capability Behavior characterizes a Capability."

#### GAP-CM-2: Missing "Capability Instance" Concept
**BIZBOK:** Distinguishes between a canonical capability (abstract) and a capability instance (concrete realization within a business unit). Business units implement capability instances, not capabilities directly. This is critical for heat mapping — the same capability can be rated differently per instance.
**Our approach:** We model capabilities as singular. No instance concept.
**Recommendation:** For Guild-endorsed agents, this is important. Capability instances enable per-business-unit heat mapping and organizational cross-mapping. Consider adding an instance layer, particularly for the Organization Mapping cross-reference.

#### GAP-CM-3: Matching Capabilities — Controversial but Defined
**BIZBOK:** Formally defines "matching capabilities" as object-to-object relationship establishment (e.g., "Customer/Agreement Matching"). Uses "/" notation. Distinguishes controlling vs. receiving objects. Details a formal methodology for when matching capabilities apply.
**Our approach:** We explicitly filter out matching capabilities from cross-mapping (by Terry's design decision).
**Recommendation:** For Guild-endorsed agents, we need to support matching capabilities even if we personally disagree. The skill should include them with the BIZBOK "/" notation and controlling/receiving object semantics. Our PlausibleBA skill can offer a toggle: "Include matching capabilities (BIZBOK standard)" vs "Exclude matching capabilities (simplified)".

#### GAP-CM-4: Capability Definition Writing Guidelines
**BIZBOK:** Provides very specific definition writing rules:
- One sentence, end with period
- Use "/" for matching capabilities with no spaces
- No "e.g." or "i.e." — use "for example" or "such as"
- No "and/or" — use one or the other with specific rules
- No parentheses in definitions
**Our approach:** We require definitions but don't enforce these stylistic rules.
**Recommendation:** Add these as formatting rules in the capability mapping prompt. Easy win for Guild alignment.

#### GAP-CM-5: Aggregating vs. Disaggregating Business Objects
**BIZBOK:** Distinguishes between "real" business objects that are actively managed (agreement, customer, claim) and "aggregating" business objects created for convenience of grouping (finance, work). Aggregating objects don't require matching capabilities.
**Our approach:** Our Concept Model skill doesn't make this distinction.
**Recommendation:** Add this as a classification attribute on business objects. Relevant for both the Concept Model and the matching capability logic.

#### GAP-CM-6: Three-Tier Map Structure
**BIZBOK:** Explicitly organizes L1 capabilities into three tiers: customer-facing, strategic/supporting, and common/shared. The customer-facing tier varies by industry while strategic/supporting tends to be stable across industries.
**Our approach:** We use layer schemes (Ecosystem/Knowledge, Front/Back, Strategic/Core/Enabling, Wardley) but these are layout concepts, not semantic tiers of the capability map itself.
**Recommendation:** For Guild-endorsed agents, adopt the BIZBOK three-tier classification as a semantic attribute on L1 capabilities. This aligns with reference model structure.

#### GAP-CM-7: Capability Knowledgebase Relationships (Fig 2.2.19)
**BIZBOK:** Defines formal knowledgebase relationships:
1. Capability is based on a Business Object
2. Capability decomposes into Capability
3. Capability Achieves and Needs outcomes
4. Capability Instance realizes a Capability
5. Capability Behavior characterizes a Capability
6. Capability Behavior characterizes a Capability Instance
7. Business Unit implements a Capability Instance
8. Business Unit influences Capability Behavior
**Our approach:** We model relationships 1-3 but not 4-8.
**Recommendation:** The full set should be the target metamodel for Guild-endorsed agents. Aligns with our graph backend direction (SPAR briefing).

---

## 2. Value Stream Mapping — Alignment & Gaps

### What We Already Do Well (Aligned with BIZBOK)

| BIZBOK Principle | Our Implementation | Status |
|---|---|---|
| End-to-end stakeholder value delivery | Core principle in VS skill | ✅ Aligned |
| 4-8 stages per value stream | Quality bar in skill | ✅ Aligned |
| Stages are not process steps | Explicitly stated in prompts | ✅ Aligned |
| Value streams don't decompose into value streams | Implied by our model | ✅ Aligned |
| Entrance/exit criteria | Modeled in scaffold (pre/post outcomes) | ✅ Aligned |
| Participating stakeholders per stage | Modeled via roles | ✅ Aligned |
| Outcome-oriented naming | "Booking Confirmed" style in pipeline | ✅ Aligned |
| VS are self-contained (no dependencies except through shared business objects) | Structural in our model | ✅ Aligned |

### Gaps and Divergences

#### GAP-VS-1: Value Proposition as Formal Construct
**BIZBOK:** The value proposition is a formal, named construct that maps to the value stream. It is the aggregated value of all value items. Defined as: "An innovation, service, or feature intended to make a company or product attractive to customers."
**Our approach:** We capture a terminal outcome but don't formally name or define a value proposition as a separate construct. Our VS "outcome" is close but not the same thing — it's the terminal state of the value object, not the stakeholder-perceived value proposition.
**Recommendation:** Add `valueProposition` as a formal attribute on the value stream, distinct from the terminal outcome. The VP is stakeholder-facing ("Reliable access to insured protection"); the outcome is object-state-based ("Agreement Activated").

#### GAP-VS-2: Triggering Stakeholder vs. Participating Stakeholder
**BIZBOK:** Makes a very clear distinction:
- **Triggering stakeholder:** Primary beneficiary of the value proposition. The VS exists to deliver value to this stakeholder.
- **Participating stakeholder:** Has a defined role or responsibility within a stage. Contributes to outcomes.
- **Proxy stakeholder:** Acts on behalf of the triggering stakeholder (e.g., agent for a customer).
**Our approach:** We model "recipients" and "roles" but don't formally distinguish triggering from participating stakeholders, and we don't model proxy relationships.
**Recommendation:** Add triggeringStakeholder, participatingStakeholders[], and optional proxyStakeholder to the value stream metamodel. This is particularly important for the Guild's stakeholder mapping cross-reference.

#### GAP-VS-3: Value Items per Stage (Incremental Value Delivery)
**BIZBOK:** Each stage produces specific value items that incrementally accrue toward the overall value proposition. The triggering stakeholder receives a tangible value item at each stage — not just at the end.
**Our approach:** We model value items in the pipeline but they're not well-structured as incremental accruals. Our "value items" in the VS skill are more like descriptions.
**Recommendation:** Strengthen value items as formal named constructs with a clear accumulation model: Stage 1 produces Value Item A → Stage 2 produces Value Item B → ... → aggregate = Value Proposition.

#### GAP-VS-4: Business Object State-Based Navigation (Critical)
**BIZBOK:** Value stream navigation is NOT flow-based — it is object state-based. Entry/exit criteria are defined by business object state transitions. The "binding object" (often an agreement) drives navigation. Multiple hierarchical finite object states control stage transitions. This enables:
- Iteration (trip segments in Take a Trip)
- Parallel VS impacts (loan defaulting while restructuring)
- Cross-VS coupling via shared object state changes
**Our approach:** We model pre/post outcomes as a linear FSM chain. Our outcomes are named but not formally linked to business object states. Our R-013 lifecycle state work (Session 32-33) started moving in this direction but only for record classes.
**Recommendation:** This is the single biggest methodological gap. For Guild-endorsed agents, entrance/exit criteria must be formally linked to information concept (business object) states. This connects directly to our graph backend direction — state-based navigation is inherently graph-structured. The R-013 lifecycle adjacency work is a foundation to build on.

#### GAP-VS-5: Binding Object Concept
**BIZBOK:** The "binding object" is the central business object that binds relevant parties, products, assets, and financial accounts. Often serves as the controlling object in matching capabilities. Should be established as early as possible in the value stream (typically via a "Definition" capability like "Agreement Definition").
**Our approach:** We have the "value object" concept which is close but not identical. We don't model binding semantics or the early-establishment pattern.
**Recommendation:** Rename or augment our "value object" to formally identify the binding object. Add a rule that the binding object should be established in the first 1-2 stages.

#### GAP-VS-6: Value Stream Mapping Template (Fig 2.4.10)
**BIZBOK:** Provides a formal template with columns for: VS Name, Stage Name, Stage Definition, Entrance Criteria, Exit Criteria, Value Items, Participating Stakeholders, Enabling Capabilities — all in a structured tabular format.
**Our approach:** We capture most of these elements but our template format (JSON scaffold) doesn't mirror the BIZBOK template structure.
**Recommendation:** For Guild-endorsed agents, output should include a BIZBOK-format template view (both the high-level mapping template and the detailed stage articulation template from Fig 2.4.12).

#### GAP-VS-7: Value Stream Stage Articulation Template (Fig 2.4.12)
**BIZBOK:** A more detailed per-stage template capturing: general activities (descriptive, informal), enabling capabilities (formal), entrance/exit criteria (object-state-based), value items, and stakeholder roles. Note: BIZBOK explicitly states that general activities "lack the rigor that would allow them to be captured as a formal aspect of business architecture" — they are note-taking, not formal.
**Our approach:** Our "activities" in the scaffold are treated as formal constructs. This is actually more rigorous than BIZBOK requires, but it's a divergence in terminology.
**Recommendation:** Consider the naming: what we call "Activity" the BIZBOK calls informal descriptive notes. What we model as formal is the Stage + Enabling Capabilities + Entrance/Exit Criteria.

---

## 3. Capability/Value Stream Cross-Mapping — Alignment & Gaps

### What We Already Do Well

| BIZBOK Principle | Our Implementation | Status |
|---|---|---|
| Capabilities enable VS stages | Core cross-mapping relationship | ✅ Aligned |
| Cross-mapping is many-to-many | Supported in scaffold | ✅ Aligned |
| Cross-mapping supports planning and investment analysis | VCC visualization supports this | ✅ Aligned |

### Gaps and Divergences

#### GAP-XM-1: "Map Highest Level Possible" Rule (Critical for Our LLM Approach)
**BIZBOK:** Cross-mapping rule: "Map the highest-level capability possible where each of the next-level child capabilities may be required by that stage. All child capabilities of a cross-mapped parent capability are automatically cross-mapped to that stage by virtue of the parent's mapping."
**Our approach:** Our cross-mapping enricher maps at whatever level the LLM finds relationships, often at L3 or L4. We don't apply the implicit child inheritance rule.
**Recommendation:** This is a significant methodological difference. The BIZBOK approach produces cleaner, less cluttered maps. It also explains why our cross-mappings appear "overly prolific" (Terry's observation in Session 34). We should:
1. Add a post-processing step that promotes child mappings to parent level where all siblings are mapped
2. Apply the inheritance rule in visualization (don't show L3 mappings if L1 or L2 parent is already mapped)
3. Give the LLM explicit guidance to prefer higher-level mappings

#### GAP-XM-2: Cross-Mapping Pattern Sequence
**BIZBOK (p.183):** Recommends a consistent cross-mapping pattern within each stage:
1. Management capabilities first (Customer Mgmt, Agreement Mgmt)
2. Operational/transactional capabilities next
3. Supporting capabilities last
This creates a readable, predictable pattern across all value streams.
**Our approach:** No ordering convention — capabilities are listed in whatever order the LLM returns them.
**Recommendation:** Add a sorting/grouping convention to cross-mapping output. This would dramatically improve readability, especially for reference models.

#### GAP-XM-3: Capability Outcomes Drive Value Items
**BIZBOK:** Capability outcomes are explicitly linked to value items. "Validate that capabilities are cross-mapped to deliver capability outcomes for a given stage as required to contribute to the value item(s) produced by that stage."
**Our approach:** We model capability outcomes (via the FSM chain) but don't formally link them to value items.
**Recommendation:** Add a formal `outcomeContributesToValueItem` relationship. This completes the chain: Capability → Outcome → Value Item → Value Proposition.

#### GAP-XM-4: Cross-VS Capability Reuse Highlighting
**BIZBOK:** Explicitly calls out that capabilities appearing across multiple VS stages highlight coupling, shared investment opportunities, and consolidation targets.
**Our approach:** Our topology view shows coupling but we don't surface cross-VS capability reuse as a first-class insight.
**Recommendation:** Add a "Capability Reuse" analysis view that shows which capabilities span the most VS stages and therefore represent the highest-leverage investment targets.

---

## 4. Terminology Mapping

| BIZBOK Term | VCC/PlausibleBA Term | Notes |
|---|---|---|
| Value Stream | Value Stream | ✅ Same |
| Value Stream Stage | Stage (Activity in scaffold) | ⚠️ We use "Activity" internally which BIZBOK considers informal |
| Capability | Capability | ✅ Same |
| Business Object | Concept / Business Object | ✅ Same |
| Capability Instance | — | ❌ Not modeled |
| Capability Behavior | — | ❌ Not modeled |
| Triggering Stakeholder | Recipient | ⚠️ Close but not identical |
| Participating Stakeholder | Role | ⚠️ Different concept |
| Proxy Stakeholder | — | ❌ Not modeled |
| Value Proposition | Terminal Outcome | ⚠️ Different concept |
| Value Item | Value Item | ⚠️ Named same but less structured |
| Binding Object | Value Object | ⚠️ Close but missing binding semantics |
| Matching Capability | Excluded by design | ⚠️ Excluded — needs toggle for Guild mode |
| Entrance/Exit Criteria | Pre/Post Outcomes | ⚠️ Close but not object-state-based |
| Heat Map | Supported | ✅ Same concept |
| Blueprint | — | BIZBOK term for cross-mapping visualizations |

---

## 5. Prioritized Recommendations for Guild-Endorsed Agents

### Tier 1: High Impact, Relatively Easy
1. **GAP-CM-4:** Add BIZBOK definition writing guidelines to prompts
2. **GAP-XM-1:** Implement "map highest level possible" rule + child inheritance
3. **GAP-XM-2:** Add consistent cross-mapping ordering pattern
4. **GAP-VS-1:** Add formal value proposition construct
5. **GAP-VS-2:** Add triggering/participating/proxy stakeholder distinction
6. **GAP-CM-3:** Add matching capability toggle for Guild mode

### Tier 2: Medium Impact, Moderate Effort
7. **GAP-VS-3:** Strengthen value items as formal incremental accruals
8. **GAP-CM-6:** Add three-tier classification to L1 capabilities
9. **GAP-XM-3:** Link capability outcomes to value items formally
10. **GAP-VS-6/7:** Add BIZBOK template format outputs
11. **GAP-XM-4:** Add capability reuse analysis view

### Tier 3: Architectural (Graph Backend Prerequisite)
12. **GAP-VS-4:** Object state-based navigation (biggest methodological gap)
13. **GAP-CM-2:** Capability instance concept
14. **GAP-CM-1:** Capability behavior concept
15. **GAP-CM-7:** Full knowledgebase relationship set
16. **GAP-VS-5:** Binding object with early-establishment pattern

### Strategic Direction
For the **Guild engagement**, the Tier 1 items would be sufficient to demonstrate alignment. The Tier 2 items would make a strong case for "Guild-endorsed" status. The Tier 3 items align with our graph backend migration (SPAR briefing) and represent the full BIZBOK metamodel — which is essentially what CAPSICUM already anticipated.

The most impactful single change for immediate model quality improvement is **GAP-XM-1 (map highest level possible)**. This would directly address the "overly prolific" cross-mapping issue Terry observed in Session 34, and it's the BIZBOK-endorsed approach.

---

*This analysis is based on BIZBOK Guide v15, Sections 2.2 and 2.4. Additional sections (2.3 Organization Mapping, 2.5 Information Mapping) may surface further alignment opportunities.*
