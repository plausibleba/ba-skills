# BACM v1.0 vs VCC Metamodel — Class-by-Class Comparison

**Filed:** 2026-04-17 (Session 35)
**Sources:** OMG BACM v1.0 Formal Specification (formal-24-03-01), BACM.ttl ontology file, VCC Metamodel Audit v0.4.0
**Purpose:** Map every BACM class to its VCC equivalent (or absence), identify structural gaps, and surface alignment opportunities — with the goal of ensuring VCC's metamodel can round-trip with the OMG standard.

**Context:** Terry was on the BACM design team (Capsifi is listed as contributor). CAPSICUM's GSM formalism anticipated much of the BACM structure. This comparison assesses how far the VCC scaffold implementation has come toward the formal standard, and what remains.

---

## 1. Infrastructure & Root Classes

### 1.1 BACM_Model (Container)

| Aspect | BACM | VCC |
|---|---|---|
| Class | `BACM_Model` — top-level container, owns all `BACMElement` instances, optional `SmmModel` and `StrategyChoices` | `Scaffold` — top-level container with `scaffold.elements.*` registries |
| Containment | Single `bacm_element [0..*]` association to `BACMElement` | Typed registries: `activities`, `capabilities`, `roles`, `outcomes`, etc. |
| Measurement | `smm_model [0..1]` → `SmmModel` | Metrics exist as `ScaffoldMetric` but no measurement model container |
| Strategy | `strategy_choices [0..1]` → `StrategyChoices` | ❌ Not modeled |

**Assessment:** Structurally equivalent as containers. VCC uses typed registries (more implementation-friendly) where BACM uses a single heterogeneous collection (more ontology-friendly). No functional gap for core BA modeling.

### 1.2 BACMElement / BACMEntity / BACMPlainEntity / BACMRelation

| Aspect | BACM | VCC |
|---|---|---|
| Base class | `BACMElement` (name, description) → `BACMEntity` → {`BACMPlainEntity`, `BACMRelation`} | `ScaffoldElement` (id, elementType, name) |
| Entity vs Relation | Formal distinction: `BACMPlainEntity` for things, `BACMRelation` (and `BACMBinDirRelation`) for reified relationships | No formal distinction — relationships are FK arrays on entities, or `CrossMapInstance` records |
| Reification | Relationships like `Role`, `Responsible`, `ContractRelation`, `OutcomeRelation` are first-class entities | Only `CrossMapInstance` reifies relationships (sourceId, targetId, relationshipTypeId, confidence, evidence) |

**Assessment:** BACM's entity-vs-relation distinction (rooted in SMOF, not MOF) is an ontological commitment VCC doesn't make. VCC's FK-array approach is simpler but loses the ability to annotate relationships with attributes. The `CrossMapInstance` pattern is a partial bridge — it reifies cross-mapping relationships with confidence and evidence — but doesn't extend to all relationship types. This matters for capability-to-role associations (where BACM's `Role` entity carries `ofCapability` and `ofProcess` context).

### 1.3 BusinessElement

| Aspect | BACM | VCC |
|---|---|---|
| Class | `BusinessElement` extends `BACMPlainEntity` — adds `abstract` (Boolean), self-associations (`owns`, `aggregates`, `generalizes`), `Responsible` for OrgUnit accountability, `Annotation` for extensibility | No direct equivalent — each class defines its own hierarchy (e.g., `parentId` on Capability) |
| Abstract flag | `abstract: Boolean` — distinguishes canonical from concrete | ❌ Not modeled |
| Self-associations | `owns`, `aggregates`, `generalizes` — uniform containment/composition/inheritance across all BusinessElements | Per-class: `parentId` on Capability, `activityIds` on ValueStream, `relatedConceptIds` on Concept — no uniform pattern |
| Annotation | Tag/value extensibility on any BusinessElement | ❌ Not modeled |

**Assessment:** BACM's `BusinessElement` provides a uniform structural backbone. VCC implements these patterns ad hoc per class. For a graph backend migration, adopting a common base with standard `owns`/`aggregates`/`generalizes` would simplify traversal and query patterns significantly.

### 1.4 Abstract Classifiers (Disjointness)

| Aspect | BACM | VCC |
|---|---|---|
| Pattern | Three disjoint abstract classifiers: `AbstractAction` (processes, behaviors, journeys, value streams), `AbstractResult` (outcomes, value propositions, customer segments), `AbstractThing` (business objects, customers, resources, performers) + `Capability` as fourth disjoint class | No disjointness constraints |
| Purpose | Ontological partitioning — ensures a thing cannot simultaneously be an action and a result. Prevents metamodel abuse | ❌ Not enforced — VCC relies on `elementType` string discrimination |

**Assessment:** This is a metamodel hygiene feature. Not critical for current VCC operations but important for formal validation and Guild-endorsed tooling. The CAPSICUM triad (record/party/product) on `ScaffoldConcept` is a related but narrower classification — it partitions business objects only, not all elements.

---

## 2. Capability Package

### 2.1 AbstractCapability → ScaffoldCapability

| Aspect | BACM | VCC |
|---|---|---|
| Class | `AbstractCapability` (abstract) → concrete subclasses: `Capability`, `CapabilityBehavior` | `ScaffoldCapability` — single concrete class |
| Hierarchy | Via `BusinessElement.owns` and `BusinessElement.aggregates` self-associations | `parentId` → `ScaffoldCapability`, `level` (1–4) |
| Business object grounding | `scopes` shortcut: `AbstractCapability` ↔ `AbstractBusinessObject` (bidirectional, derived from capability name containing object name) | `businessObject` field (string, name-matched to `ScaffoldConcept`) |
| Outcomes | `needs` and `produces` associations to `Outcome` | ❌ No direct capability→outcome association (outcomes live on Activities/Stages) |
| Information | `informs` association to `InformationItem` | ❌ Not modeled at capability level (only at stage level via `informationObjectIds`) |
| Abstract flag | Inherited from `BusinessElement.abstract` | ❌ Not modeled |

**Gap: CAP-1 — Capability does not directly produce/need Outcomes.** In BACM, capabilities have their own outcome associations independent of value stream stages. VCC only links outcomes to stages, not capabilities. This means VCC cannot express "Capability X produces Outcome Y" without going through a stage context.

**Gap: CAP-2 — No abstract flag on capabilities.** BACM distinguishes abstract (canonical) capabilities from concrete ones. Relevant for reference model work where L1/L2 are abstract and L3/L4 are concrete.

### 2.2 CapabilityBehavior — ❌ Not in VCC

| Aspect | BACM | VCC |
|---|---|---|
| Class | `CapabilityBehavior` — concrete subclass of `AbstractCapability`, non-decomposable, `delivers` a `Capability` | ❌ Not modeled |
| Semantics | Characterizes HOW a capability conducts itself. Cannot own/aggregate/generalize other capabilities. | PPIT on `capabilityPPIT` partially overlaps but is a compound attribute, not a first-class entity |
| Relationship | `delivers [0..1]` → `Capability` | — |

**Gap: CAP-3 — CapabilityBehavior not modeled.** This aligns with BIZBOK GAP-CM-1. The PPIT decomposition touches on similar ground but conflates it into a compound attribute rather than a separate navigable entity.

### 2.3 CapabilityImplementation — ❌ Not in VCC

| Aspect | BACM | VCC |
|---|---|---|
| Class | `CapabilityImplementation` — bundles `Performer` and `Resource` allocations to realize an `AbstractCapability` | ❌ Not modeled as a class |
| Relationships | `implements [0..1]` → `AbstractCapability`, aggregates Performers and Resources | PPIT's People and Technology fields on `capabilityPPIT` loosely correspond |
| Strategy link | `Initiative` → `implements` → `CapabilityImplementation` | ❌ No strategy model |

**Gap: CAP-4 — No formal implementation bundle.** VCC's PPIT captures people and technology per-capability-per-stage, but as a flat record, not a reified entity. Cannot link an implementation to strategy initiatives. Important for investment planning and portfolio management.

### 2.4 AbstractBusinessObject / BusinessObject → ScaffoldConcept

| Aspect | BACM | VCC |
|---|---|---|
| Class | `AbstractBusinessObject` (abstract) → `BusinessObject` (concrete). Contains `System` (via `contains`). Realized by `InformationItem` (via `realize`). | `ScaffoldConcept` with `triadRole` (record/party/product) |
| State | Externalized: `Outcome` → `stateOf` → `AbstractBusinessObject`. States live on Outcome, not on the object itself. | `lifecycleStates` array on Concept (internalized) |
| Relationships | `ObjectRelation` reifies inter-object associations | `relationships` array with `{targetId, type, label}` — lightweight, not reified |
| System containment | `BusinessObject` → `contains` → `System` | ❌ Not modeled — `ScaffoldTechnologyApp` is separate, not contained by Concept |
| Information realization | `BusinessObject` → `realize` → `InformationItem` | Concept↔InfoObject inferred by name matching in graph index |
| Classification | Via `AbstractThing` disjointness | `triadRole` (record/party/product) — CAPSICUM classification |

**Gap: CAP-5 — Externalized vs. internalized state.** BACM externalizes state: `Outcome` is a separate entity with `stateOf` pointing back to the business object. VCC internalizes state as `lifecycleStates[]` on the Concept. The BACM approach enables many-to-many state-capability mappings and is the foundation for object-state-based value stream navigation (BIZBOK GAP-VS-4). This is architecturally significant.

**Gap: CAP-6 — System containment.** BACM says a System is contained by a BusinessObject (e.g., "CRM System" is contained by "Customer" business object). VCC models technology separately without this semantic link.

### 2.5 InformationItem → ScaffoldInfoObject

| Aspect | BACM | VCC |
|---|---|---|
| Class | `InformationItem` extends `AbstractBusinessObject` — realizes a `BusinessObject`, can be `isAbout` a `BusinessObject` | `ScaffoldInfoObject` with `lifecycleStates` |
| Dual association | `realize` (structural realization) + `isAbout` (topical reference) | Inferred by name matching only |
| Lifecycle | Via externalized `Outcome.stateOf` | `lifecycleStates[]` on InfoObject directly |
| Capability link | Via `informs` on `AbstractCapability` | Via `informationObjectIds` on Activity (stage-level only) |

**Assessment:** Reasonable alignment. The `realize` / `isAbout` distinction is more precise than VCC's name-matching, but not a critical gap for current operations.

### 2.6 Outcome → ScaffoldOutcome

| Aspect | BACM | VCC |
|---|---|---|
| Class | `Outcome` extends `AbstractResult` — externalized state of a business object | `ScaffoldOutcome` — pre/post pairs on stages |
| State link | `stateOf` → `AbstractBusinessObject`, `recordedAs` → `AbstractBusinessObject` | ❌ No formal link to business objects — outcomes are named states without object binding |
| Trigger | `triggers` shortcut → `ValueStreamStage` (state-based VS navigation) | `nextActivityId` (linear chain sequencing) |
| Capability link | `needs` / `produces` on `AbstractCapability` | ❌ Only linked to stages, not capabilities |
| Reification | `OutcomeRelation` reifies inter-outcome relationships | ❌ Not modeled |
| Value chain | `values` → `ValueItem` (outcome valued as value item) | ❌ No formal link to value items |

**Gap: CAP-7 — Outcome is the single biggest structural divergence.** In BACM, Outcome is a rich, interconnected entity: it represents a state of a business object, it triggers value stream stages, it connects capabilities to value items, and it can have reified inter-outcome relationships. In VCC, Outcome is a lightweight named state on stages with no object binding, no trigger semantics, and no value chain connection. This gap cascades:
- Without `stateOf`: no object-state-based VS navigation
- Without `triggers`: no non-linear VS progression
- Without `values`: no capability→outcome→value item chain
- Without `OutcomeRelation`: no formalized outcome dependencies

This aligns with BIZBOK GAP-VS-4 (object-state-based navigation) and is the same "single biggest methodological gap" identified there.

### 2.7 Role → ScaffoldRole

| Aspect | BACM | VCC |
|---|---|---|
| Class | `Role` extends `BACMRelation` — an n-ary association linking Performer/Resource to Capability/Process. Subclasses: `PerformerRole`, `ResourceRole` | `ScaffoldRole` — a named entity referenced by FK arrays |
| Structure | Ternary: `ofCapability [0..1]`, `ofProcess [0..1]` + `assignTo` Performer or Resource | Binary: `performedByRoleIds` on Activity, `role-performs-capability` cross-map |
| Performer/Resource | `PerformerRole` → `assignTo` → `Performer`; `ResourceRole` → `assignTo` → `Resource` | No Performer/Resource distinction — roles are undifferentiated |
| Reification | Role IS a relation (extends `BACMRelation`) — carries context | Role is a plain entity — no association context |

**Gap: CAP-8 — Role is not a reified association.** BACM's Role is fundamentally different from VCC's Role. In BACM, a Role is a ternary relationship: "Performer X plays Role R in the context of Capability Y." In VCC, a Role is just a named entity that stages reference. VCC cannot express "this role applies specifically to this capability" without the cross-mapping layer, and even then it's a binary relationship without the ternary context.

---

## 3. Customer Package — Largely ❌ Not in VCC

### 3.1 Customer — ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `Customer` extends `AbstractThing` — takes CustomerJourneys, target of ValuePropositions, described by CustomerSegments | ❌ Stakeholders modeled as Roles, not as a distinct Customer class |
| Relationships | `takes` → CustomerJourney, `target` ← ValueProposition, `describes` ← CustomerSegment | — |

### 3.2 CustomerJourney / CustomerJourneyStage / Touchpoint — ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Classes | `CustomerJourney` (reusable tree), `CustomerJourneyStage` (significant stage, owns Touchpoints), `Touchpoint` (business-customer interaction) | ❌ Not modeled — VCC focuses on business-side value streams, not customer-side journeys |
| Union type | `JSTP` (union of CustomerJourneyStage and Touchpoint) for segment characterization | — |

### 3.3 CustomerSegment — ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `CustomerSegment` extends `AbstractResult` — characterizes JSTP interactions, describes Customer | ❌ Not modeled |

### 3.4 ValueCharacteristic — ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `ValueCharacteristic` — n-ary association assessing fit between ValueProposition, Customer, CustomerSegment, and ValueItem | ❌ Not modeled |

**Assessment — Customer Package:** The entire Customer package is absent from VCC. This is a scope choice, not a gap — VCC focuses on the business architecture (capabilities, value streams, concepts) rather than customer experience mapping. However, for full BACM compliance and Guild-endorsed agents, the Customer-side model would need to be addressed. The `ValueCharacteristic` pattern (fit assessment) is particularly interesting for investment analysis.

### 3.5 ValueStream → ScaffoldValueStream

| Aspect | BACM | VCC |
|---|---|---|
| Class | `ValueStream` extends `AbstractAction` — ordered stages, produces ValueProposition (shortcut) | `ScaffoldValueStream` — ordered stages |
| Stages | `owns` → `ValueStreamStage` [0..*] | `activityIds` → `ScaffoldActivity` (ordered array) |
| Value Proposition | `produces` shortcut → `ValueProposition` | ❌ No formal value proposition — terminal outcome serves as proxy |
| Non-decomposition | Cannot own/aggregate/generalize other ValueStreams (BACM constraint) | Implied by model structure |
| Triggering | Stages triggered by `Outcome` (state-based) | `nextActivityId` (linear chain) |
| Stakeholder | Performers `participate` in stages (shortcut) | `accountableStakeholder` on VS, `performedByRoleIds` on stages |
| Cross-VS | `vs-triggers-vs` cross-mapping relationship | `vs-triggers-vs` cross-map type ✅ |

**Gap: VS-1 — No ValueProposition.** Aligns with BIZBOK GAP-VS-1.

### 3.6 ValueStreamStage → ScaffoldActivity (VS Stage)

| Aspect | BACM | VCC |
|---|---|---|
| Class | `ValueStreamStage` extends `AbstractAction` — significant value creation points | `ScaffoldActivity` (named "activity" but semantically a VS Stage) |
| Capabilities | `supports` shortcut ← `Capability` | `requiresCapabilityIds` FK array |
| Value Items | `produces` shortcut → `ValueItem` | ❌ No formal value item per stage |
| Entrance/Exit | `Outcome` triggers stage entry (via `triggers`); stage produces outcomes | `preOutcomeId` / `postOutcomeId` — close but not state-based triggers |
| Participation | `participate` shortcut ← `Performer` | `performedByRoleIds` FK array |
| Process link | `AbstractProcess` → `implements` → `VSVSS` (union of VS and VSS) | ❌ No formal process model |

**Gap: VS-2 — No ValueItem per stage.** Aligns with BIZBOK GAP-VS-3. Stages don't produce incremental value items.

**Gap: VS-3 — Trigger vs. chain.** BACM uses outcome-triggered stage entry; VCC uses sequential chaining. Same as BIZBOK GAP-VS-4.

### 3.7 ValueProposition — ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `ValueProposition` extends `AbstractResult` — aggregates ValueItems, targets Customer, offered through ProductOffering | ❌ Terminal outcome serves as proxy |
| Relationships | `aggregates` → ValueItem, `target` → Customer, `of` → ProductOffering | — |

### 3.8 ValueItem — ❌ Not formally modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `ValueItem` extends `AbstractResult` — stakeholder belief about valued Outcomes | Value items mentioned in pipeline prompts but not a scaffold class |
| Relationship | `values` → Outcome (what the stakeholder values about this outcome) | — |

---

## 4. Organization Package — Partially Modeled

### 4.1 Performer → (ScaffoldRole, partially)

| Aspect | BACM | VCC |
|---|---|---|
| Class | `Performer` (abstract) → `OrgUnit`, `System`. Participates in ValueStreamStages (shortcut). `belongs_to` theBusiness. | No Performer class — `ScaffoldRole` is the nearest equivalent but models roles, not performers |
| Subclasses | `OrgUnit` (human organizational unit), `System` (non-human, contained by BusinessObject) | `ScaffoldRole` (undifferentiated), `ScaffoldTechnologyApp` (loosely maps to System) |
| Participation | `participate` shortcut → `ValueStreamStage` | `performedByRoleIds` on stages + `role-participates-in-stage` cross-map |

**Gap: ORG-1 — No Performer/OrgUnit distinction.** VCC conflates organizational actors into Roles. Cannot express "Department X (OrgUnit) assigns Person Y (Performer) to Role Z in the context of Capability W." For Guild-endorsed agents and organizational mapping, this distinction is needed.

### 4.2 OrgUnit → ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `OrgUnit` extends `Performer` — organizational unit, can have `Responsible` accountability to other OrgUnits | ❌ Not modeled — no organizational hierarchy |
| LegalEntity | `LegalEntity` extends `OrgUnit` — for contract and jurisdiction | ❌ Not modeled |
| theBusiness | Singleton `LegalEntity` individual representing the enterprise itself | ❌ Not modeled |

### 4.3 Resource → ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `Resource` extends `AbstractThing` — passive participant (NOT a Performer), assigned via `ResourceRole` | ❌ Not modeled — technology is modeled separately as `ScaffoldTechnologyApp` |

### 4.4 Responsible → ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `Responsible` — reified accountability relationship between OrgUnits, with `nature` (BusinessElement characterizing the type of responsibility) | ❌ Not modeled |

### 4.5 Jurisdiction → ❌ Not modeled

| Aspect | BACM | VCC |
|---|---|---|
| Class | `Jurisdiction` — legal jurisdiction linked to LegalEntity | ❌ Not modeled |

**Assessment — Organization Package:** VCC has minimal organizational modeling. `ScaffoldRole` covers participation but lacks the organizational hierarchy (OrgUnit), accountability chain (Responsible), performer-vs-resource distinction, and legal entity model. For core capability/value-stream work this is acceptable. For organizational mapping (BIZBOK Section 2.3) and capability instance per-business-unit analysis, this becomes a gap.

---

## 5. Process Package — Partially Modeled

### 5.1 AbstractProcess / Process / Activity

| Aspect | BACM | VCC |
|---|---|---|
| Class | `AbstractProcess` (abstract) → `Process` (aggregates sub-processes), `Activity` (atomic, non-decomposable) | ❌ No formal process model — `ScaffoldActivity` is a VS Stage, not a Process Activity |
| Capability link | `AbstractProcess` → `implements` → `AbstractCapability` | Cross-map: `process-operationalises-cap` exists but no Process entity to anchor it |
| VS link | `AbstractProcess` → `implements` → `VSVSS` (union of VS/VSS) | ❌ No process-to-VS implementation link |
| Input/Output | `input` / `output` → `Outcome` | Pre/post outcomes on stages (similar semantics, different scope) |

**Gap: PROC-1 — No process model.** VCC's Metamodel Audit explicitly notes: "Process Activities (distinct from VS Stages) would be a separate class if introduced. Currently not present in scaffold." The `process-operationalises-cap` cross-map type exists in the cross-mapping metamodel but has no source entity. This is a known architectural debt.

---

## 6. Product Package — ❌ Not in VCC

### 6.1 Offering / ProductOffering / Specialized Offerings

| Aspect | BACM | VCC |
|---|---|---|
| Classes | Offering hierarchy: `Offering` → `ProductOffering` → {`ServiceOffering`, `MerchandiseOffering`, `OutsourcedServiceOffering`, `ProcurementOffering`}. Each has specialized Outcome types. | ❌ Not modeled |
| Value link | `ValueProposition` → `of` → `ProductOffering` | — |
| Contract | `ContractRelation` reifies offering-to-offering relationships | — |
| Legal | `LegalEntity` → `provides`/`accepts` → `Offering` | — |

**Assessment — Product Package:** Entirely absent from VCC. This is scope-appropriate for current VCC (focused on capability/VS modeling). For full BACM compliance, the Product package would need to be addressed, particularly the ValueProposition→ProductOffering link.

---

## 7. Strategy Package — ❌ Not in VCC

### 7.1 StrategyModel / Means / Ends / Initiative / Change

| Aspect | BACM | VCC |
|---|---|---|
| Classes | `StrategyChoices` contains `StrategyModel`(s), each with `Means` and `Ends`. `Initiative` implements Means via CapabilityImplementation. `Change` implements Ends with specific objectives. | ❌ Not modeled |
| Operating/Value partition | `AbstractOperatingModel` (capabilities, processes, resources — things you change), `AbstractValueModel` (value propositions, customers — things you baseline) | ❌ Not modeled |
| Impact chain | Means/Initiative → `impacts` → AbstractOperatingModel; Ends/Change → `baseline` → AbstractOperatingModel + AbstractValueModel | — |

**Assessment — Strategy Package:** Entirely absent from VCC. This is the "why" layer — connecting strategic intent to capability investment. For Guild-endorsed agents doing capability-based planning, this would be the bridge between "what we can do" and "what we should invest in." Aligns with the Guild's investment analysis use cases.

---

## 8. Measurement (SMM Integration) — Partially Modeled

| Aspect | BACM | VCC |
|---|---|---|
| Classes | `SmmModel`, `MeasureLibrary`, `Measurement` (element → BusinessElement), `Scope` (class → BusinessElement) | `ScaffoldMetric` on stages and value streams — simpler, no measurement library or scope model |
| Integration | Formal OMG SMM (Structured Metrics Metamodel) alignment | Ad hoc metrics without formal measurement framework |

---

## 9. Shortcut Associations — The BACM Derivation Pattern

BACM defines ~15 shortcut associations (`BACMShortcut` class with `constr` string). These are derived/computed relationships that must be derivable from base associations. Key shortcuts:

| Shortcut | From → To | VCC Equivalent |
|---|---|---|
| `scopes` | AbstractCapability ↔ AbstractBusinessObject | `businessObject` field (name-matched) |
| `triggers` | Outcome → ValueStreamStage | ❌ Not modeled (linear chain instead) |
| `supports` | Capability → ValueStreamStage | `requiresCapabilityIds` / cross-map |
| `produces_1` | ValueStream → ValueProposition | ❌ Not modeled |
| `produces_2` | ValueStreamStage → ValueItem | ❌ Not modeled |
| `participate` | Performer → ValueStreamStage | `performedByRoleIds` (roles, not performers) |
| `target` | ValueProposition → Customer | ❌ Not modeled |
| `of` | ValueProposition → ProductOffering | ❌ Not modeled |
| `implements_0` | AbstractProcess → AbstractCapability | `process-operationalises-cap` cross-map |
| `implements_5` | CapabilityImplementation → AbstractCapability | ❌ Not modeled |
| `object_0` | AbstractBusinessObject → MerchandiseOffering | ❌ Not modeled |
| `object_1` | AbstractBusinessObject → ProcurementOffering | ❌ Not modeled |
| `object_2` | AbstractCapability → ServiceOffering | ❌ Not modeled |
| `assignTo_3` | CapabilityImplementation → Role | ❌ Not modeled |

**Assessment:** VCC covers 3 of 14 shortcuts. The `triggers` shortcut is the most architecturally significant gap (enables state-based VS navigation). The `scopes` shortcut is covered but via name-matching rather than formal association. The Product/Offering-related shortcuts are out of current scope.

---

## 10. Cross-Cutting Patterns

### 10.1 Union Types (Abstract Groupings)

| BACM Union | Members | VCC Equivalent |
|---|---|---|
| `VSVSS` | ValueStream, ValueStreamStage | No union — VS and Stage are distinct |
| `JSTP` | CustomerJourneyStage, Touchpoint | ❌ Not modeled |
| `APCICB` | AbstractProcess, CapabilityImplementation, CapabilityBehavior | ❌ Not modeled |
| `AbstractOperatingModel` | Groups changeable operating model elements | ❌ Not modeled |
| `AbstractValueModel` | Groups changeable value model elements | ❌ Not modeled |

### 10.2 Externalized State Pattern

This is perhaps the most significant architectural difference between BACM and VCC:

| Approach | BACM | VCC |
|---|---|---|
| Where state lives | `Outcome` entity with `stateOf` → `AbstractBusinessObject` | `lifecycleStates[]` array on Concept/InfoObject |
| Implications | States are navigable entities, can trigger VS stages, can be produced/needed by capabilities, can be valued as value items | States are data attributes, limited to display and lifecycle ordering |
| Graph traversal | Outcome is a hub connecting capabilities, stages, value items, and business objects | No hub — state information is terminal |

**This is the single most important structural divergence.** It is the same issue identified in BIZBOK GAP-VS-4 but now visible at the formal metamodel level. The BACM TTL confirms this with the `cap:stateOf` and `cap:triggers` properties carrying formal domain/range constraints.

### 10.3 Reified vs. FK Relationships

| Pattern | BACM | VCC |
|---|---|---|
| Role | Reified ternary (Role entity with ofCapability + ofProcess + assignTo) | FK array (`performedByRoleIds` on stage) |
| Outcome relation | Reified (`OutcomeRelation` entity) | ❌ Not modeled |
| Object relation | Reified (`ObjectRelation` entity) | `relationships[]` array on Concept (lightweight) |
| Cross-mapping | N/A in BACM (not an implementation concern) | Reified (`CrossMapInstance` with confidence, evidence) ✅ |

---

## 11. Consolidated Gap Summary

### Tier 1: Core Alignment (High Impact, Enables Guild Compliance)

| ID | Gap | BACM Class/Pattern | Impact |
|---|---|---|---|
| CAP-7 | Outcome not linked to business objects via stateOf | `Outcome.stateOf` → `AbstractBusinessObject` | Blocks state-based VS navigation, capability→outcome→value chain |
| VS-3 | Linear chain vs. outcome-triggered stage entry | `Outcome.triggers` → `ValueStreamStage` | Blocks non-linear VS patterns (iteration, parallel) |
| VS-1 | No ValueProposition | `ValueProposition` | Missing stakeholder-facing value construct |
| VS-2 | No ValueItem per stage | `ValueItem` + `produces` shortcut | Missing incremental value delivery |
| CAP-1 | Capabilities don't produce/need outcomes | `AbstractCapability.needs/produces` → `Outcome` | Missing capability-outcome chain |
| CAP-8 | Role is not a reified ternary association | `Role.ofCapability` + `Role.ofProcess` + `assignTo` | Missing contextual role assignments |

### Tier 2: Structural Enrichment (Medium Impact, Strengthens Model)

| ID | Gap | BACM Class/Pattern | Impact |
|---|---|---|---|
| CAP-3 | No CapabilityBehavior | `CapabilityBehavior.delivers` → `Capability` | Missing "how" characterization |
| CAP-4 | No CapabilityImplementation | `CapabilityImplementation` bundles Performer + Resource | Missing implementation bundle for investment planning |
| CAP-5 | Internalized vs. externalized state | `Outcome.stateOf` pattern | Architectural debt — states as attributes vs. entities |
| ORG-1 | No Performer/OrgUnit hierarchy | `Performer` → `OrgUnit` → `LegalEntity` | Missing organizational mapping foundation |
| PROC-1 | No process model | `Process` / `Activity` with implements links | Missing process-to-capability formalization |
| CAP-6 | No System containment by BusinessObject | `BusinessObject.contains` → `System` | Missing technology-to-concept semantic link |
| CAP-2 | No abstract flag on capabilities | `BusinessElement.abstract` | Missing reference model canonical/concrete distinction |

### Tier 3: Extended Scope (Lower Priority for Current VCC)

| ID | Gap | BACM Package | Impact |
|---|---|---|---|
| — | Customer package entirely absent | Customer (6 classes) | No customer journey, segment, touchpoint modeling |
| — | Product package entirely absent | Product (9 classes) | No offering, contract, service modeling |
| — | Strategy package entirely absent | Strategy (8 classes) | No strategic planning, initiative, means/ends |
| — | Measurement model is ad hoc | SMM integration (4 classes) | No formal measurement framework |
| — | No Annotation extensibility | `Annotation` on BusinessElement | No tag/value extensibility |
| — | No Jurisdiction/Legal model | Organization (Jurisdiction, LegalEntity) | No legal/regulatory modeling |

---

## 12. Terminology Cross-Reference

| BACM Term | VCC Term | Alignment |
|---|---|---|
| AbstractCapability | ScaffoldCapability | ✅ Close (missing subclasses) |
| Capability | ScaffoldCapability | ✅ Same |
| CapabilityBehavior | capabilityPPIT (partial) | ⚠️ Different concept |
| CapabilityImplementation | capabilityPPIT (partial) | ⚠️ Different concept |
| AbstractBusinessObject | ScaffoldConcept | ✅ Close (different state model) |
| BusinessObject | ScaffoldConcept | ✅ Same scope |
| InformationItem | ScaffoldInfoObject | ✅ Close |
| Outcome | ScaffoldOutcome | ⚠️ Same name, very different structure |
| Role | ScaffoldRole | ⚠️ Same name, different nature (reified vs. entity) |
| Performer | — | ❌ Not modeled |
| OrgUnit | — | ❌ Not modeled |
| Resource | — | ❌ Not modeled |
| System | ScaffoldTechnologyApp | ⚠️ Loosely equivalent |
| ValueStream | ScaffoldValueStream | ✅ Close |
| ValueStreamStage | ScaffoldActivity | ⚠️ Same concept, misleading VCC name |
| ValueProposition | — | ❌ Not modeled |
| ValueItem | — | ❌ Not formally modeled |
| Customer | — | ❌ Not modeled |
| CustomerJourney | — | ❌ Not modeled |
| Offering / ProductOffering | — | ❌ Not modeled |
| StrategyModel | — | ❌ Not modeled |
| Initiative | — | ❌ Not modeled |
| Means / Ends | — | ❌ Not modeled |
| Process / Activity | — | ❌ Not modeled (VCC "Activity" is a VS Stage) |
| Responsible | — | ❌ Not modeled |
| Annotation | — | ❌ Not modeled |
| scopes (shortcut) | businessObject field | ⚠️ Name-matched, not formally derived |
| triggers (shortcut) | nextActivityId | ❌ Different mechanism (linear vs. state-based) |
| supports (shortcut) | requiresCapabilityIds | ✅ Close |
| participate (shortcut) | performedByRoleIds | ⚠️ Roles vs. Performers |

---

## 13. Strategic Assessment

### What VCC Already Does Well

VCC's core strength is its pragmatic, LLM-friendly scaffold that makes capability mapping and value stream modeling accessible to AI-driven discovery. The flat registry with FK arrays is efficient for serialization and prompt engineering. The cross-mapping layer with confidence scores and evidence is an innovation not present in BACM (which doesn't address implementation concerns). The CAPSICUM triad classification on concepts and the topology view for coupling analysis are differentiators.

### The Critical Path

The Outcome externalization pattern (CAP-5/CAP-7/VS-3) is the single highest-leverage change. It is:
- The foundation for BIZBOK GAP-VS-4 (state-based navigation)
- The structural prerequisite for the capability→outcome→value item chain
- The connection point for cross-VS coupling via shared object states
- Already anticipated by the R-013 lifecycle state work (Sessions 32-33)
- Naturally suited to the graph backend direction (SPAR briefing)

If VCC externalizes Outcome as a first-class entity with `stateOf` and `triggers` associations, it unlocks Tier 1 gaps VS-1 through VS-3 and CAP-1 as downstream improvements.

### CAPSICUM Already Anticipated This

The CAPSICUM GSM formalism, with its 9-tuple canonical form, already encodes much of what BACM formalizes. The VCC scaffold is an implementation simplification of CAPSICUM for LLM consumption. The path forward is not to abandon the scaffold model but to progressively enrich it toward the formal standard — starting with Outcome externalization, then Role reification, then organizational modeling — using the graph backend as the enabling infrastructure.

### Relationship to BIZBOK Analysis

This comparison reinforces and extends the BIZBOK gap analysis:

| BIZBOK Gap | Corresponding BACM Gap | Reinforced? |
|---|---|---|
| GAP-VS-4 (state-based navigation) | CAP-7 + VS-3 (Outcome externalization + triggers) | ✅ Confirmed at metamodel level |
| GAP-VS-1 (ValueProposition) | VS-1 | ✅ Now formally specified |
| GAP-VS-3 (ValueItem per stage) | VS-2 | ✅ Now formally specified |
| GAP-CM-1 (CapabilityBehavior) | CAP-3 | ✅ Now with formal delivers relationship |
| GAP-CM-2 (CapabilityInstance) | CAP-4 (CapabilityImplementation) | ⚠️ Different concept — BACM has Implementation, BIZBOK has Instance. Both absent from VCC |
| GAP-VS-2 (stakeholder distinctions) | ORG-1 + CAP-8 | ✅ Now with formal Performer/Role model |
| GAP-VS-5 (binding object) | CAP-5 (externalized state) | ✅ stateOf/recordedAs provides the mechanism |
| GAP-CM-7 (knowledgebase relationships) | Full BACM association set | ✅ BACM IS the formal specification of those relationships |

---

*This comparison is based on OMG BACM v1.0 (formal-24-03-01), BACM.ttl ontology, and VCC Metamodel Audit v0.4.0. The BACM Customer, Product, and Strategy packages are assessed for completeness but are lower priority for current VCC scope.*
