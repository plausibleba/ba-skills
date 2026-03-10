// ─────────────────────────────────────────────────────────────────────────────
// CAPSICUM Framework Type System
// ─────────────────────────────────────────────────────────────────────────────
//
// The CAPSICUM Framework (Roach 2011, 2026) is organised through two
// orthogonal meta-layers (Purpose, Execution) and three orthogonal column
// dimensions (Domain, Behaviour, Governance).
//
// This module defines the ontological types for both layers. Each cell in the
// 3×3 matrix is a root interface. Domain-specific subclasses inherit from
// these roots. Meta-relationships between cells are expressed as typed ID
// references, following the relationship labels from the CAPSICUM meta-model.
//
// The type hierarchy is:
//   FrameworkElement (abstract root)
//     ├── PurposeLayerElement
//     │   ├── Set row:     Goal, Strategy, Directive
//     │   ├── Plan row:    Objective, Tactic, Control
//     │   └── Realise row: Component, Orchestration, Function_
//     └── ExecutionLayerElement
//         ├── People row:      Role, Interaction, Entitlement
//         ├── Process row:     Outcome, Activity, Condition
//         └── Information row: Concept, Context_, Term
//
// The GSM tuple (gsm.ts) references Execution Layer types exclusively.
// Purpose Layer types provide the strategic context that the Execution Layer
// operationalises.
//
// Naming note: TypeScript reserves "Function" and "Context", so we use
// "Function_" and "Context_" as interface names. The `cellLabel` field
// carries the canonical CAPSICUM label.
// ─────────────────────────────────────────────────────────────────────────────

// ── Matrix Position ─────────────────────────────────────────────────────────

export type MetaLayer = "purpose" | "execution";

export type ColumnDimension = "domain" | "behaviour" | "governance";

export type PurposeRow = "set" | "plan" | "realise";

export type ExecutionRow = "people" | "process" | "information";

/** Every element in the framework occupies a unique cell in the matrix. */
export interface CellPosition {
  layer: MetaLayer;
  column: ColumnDimension;
  row: PurposeRow | ExecutionRow;
}

// ── Abstract Roots ──────────────────────────────────────────────────────────

/** Base interface for all CAPSICUM framework elements. */
export interface FrameworkElement {
  /** Unique identifier within the scaffold. */
  id: string;
  /** Human-readable label. */
  name: string;
  /** Optional extended description. */
  description?: string;
  /** Position in the CAPSICUM 3×3 matrix. */
  cell: CellPosition;
  /** The canonical CAPSICUM cell label (e.g. "Roles", "Activities"). */
  cellLabel: string;
}

export interface PurposeLayerElement extends FrameworkElement {
  cell: CellPosition & { layer: "purpose"; row: PurposeRow };
}

export interface ExecutionLayerElement extends FrameworkElement {
  cell: CellPosition & { layer: "execution"; row: ExecutionRow };
}

// ═════════════════════════════════════════════════════════════════════════════
// PURPOSE LAYER — Strategic Intent
// ═════════════════════════════════════════════════════════════════════════════
//
// Set row:    Goals / Strategies / Directives
// Plan row:   Objectives / Tactics / Controls
// Realise row: Components / Orchestration / Function
//
// Meta-relationships (from CAPSICUM Framework Reference diagrams):
//   Goals ──sustainedBy──▶ Strategies ──governedBy──▶ Policies (Directives)
//   Goals ──measuredBy───▶ Objectives
//   Strategies ──implementedBy──▶ Tactics
//   Directives ──elaboratedBy──▶ Controls
//
// Cross-layer vertical alignment:
//   Goals ──enabledBy──▶ Roles
//   Objectives ──delegatedTo──▶ Roles
//   Objectives ──measuredBy──▶ Outcomes
//   Strategies ──executedBy──▶ Activities (via Tactics)
//   Tactics ──expressedBy──▶ Activities / ──situatedBy──▶ Context
//   Policies ──declaredAs──▶ Entitlements
//   Controls ──formulatedAs──▶ Conditions

// ── Set Row ─────────────────────────────────────────────────────────────────

export interface Goal extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "set"; column: "domain" };
  cellLabel: "Goals";
  /** Goals → sustainedBy → Strategies */
  sustainedByStrategyIds: string[];
  /** Goals → measuredBy → Objectives */
  measuredByObjectiveIds: string[];
  /** Goals → enabledBy → Roles (cross-layer) */
  enabledByRoleIds?: string[];
}

export interface Strategy extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "set"; column: "behaviour" };
  cellLabel: "Strategies";
  /** Strategies → governedBy → Directives */
  governedByDirectiveIds: string[];
  /** Strategies → implementedBy → Tactics */
  implementedByTacticIds: string[];
  /** Strategies → executedBy → (cross-layer, via tactics) */
  executedByActivityIds?: string[];
}

export interface Directive extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "set"; column: "governance" };
  cellLabel: "Directives";
  /** Directives → elaboratedBy → Controls */
  elaboratedByControlIds: string[];
  /** Directives → declaredAs → Entitlements (cross-layer) */
  declaredAsEntitlementIds?: string[];
}

// ── Plan Row ────────────────────────────────────────────────────────────────

export interface Objective extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "plan"; column: "domain" };
  cellLabel: "Objectives";
  /** Objectives → supportedBy → Tactics */
  supportedByTacticIds: string[];
  /** Objectives → delegatedTo → Roles (cross-layer) */
  delegatedToRoleIds?: string[];
  /** Objectives → measuredBy → Outcomes (cross-layer) */
  measuredByOutcomeIds?: string[];
  /** Quantitative target, if applicable */
  targetMeasure?: string;
}

export interface Tactic extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "plan"; column: "behaviour" };
  cellLabel: "Tactics";
  /** Tactics → enforcedBy → Controls */
  enforcedByControlIds: string[];
  /** Tactics → expressedBy → Activities (cross-layer) */
  expressedByActivityIds?: string[];
  /** Tactics → situatedBy → Context (cross-layer) */
  situatedByContextIds?: string[];
}

export interface Control extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "plan"; column: "governance" };
  cellLabel: "Controls";
  /** Controls → formulatedAs → Conditions (cross-layer) */
  formulatedAsConditionIds?: string[];
  /** Controls → formulatedAs → Entitlements (cross-layer) */
  formulatedAsEntitlementIds?: string[];
  /** Control type classification */
  controlType?: "preventive" | "detective" | "corrective";
  /** Authority source document */
  authoritySource?: string;
}

// ── Realise Row ─────────────────────────────────────────────────────────────
// V2 extension — Components / Orchestration / Function
// These map to VCC's existing Capabilities / Value Streams / Constraints

export interface Component extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "realise"; column: "domain" };
  cellLabel: "Components";
  /** The designed unit of capability. VCC Capability maps here. */
  capabilityId?: string;
}

export interface Orchestration_ extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "realise"; column: "behaviour" };
  cellLabel: "Orchestration";
  /** How components engage with each other. VCC Value Stream maps here. */
  valueStreamId?: string;
  componentIds: string[];
}

export interface Function_ extends PurposeLayerElement {
  cell: CellPosition & { layer: "purpose"; row: "realise"; column: "governance" };
  cellLabel: "Function";
  /** The purposive logic of each component. VCC Constraint maps here. */
  componentId: string;
  legitimateUse: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// EXECUTION LAYER — Operational Reality
// ═════════════════════════════════════════════════════════════════════════════
//
// People row:      Roles / Interactions / Entitlements
// Process row:     Outcomes / Activities / Conditions
// Information row: Concepts / Context / Terms
//
// Meta-relationships (from CAPSICUM Business Enablement diagram):
//
// People row:
//   Roles ──proposedBy──▶ Interactions (Intent)
//   Roles ──proposedTo──▶ Interactions (receiving role)
//   Roles ──permittedBy──▶ Entitlements
//   Interactions ──verifiedBy──▶ Entitlements
//
// People → Process (cross-row):
//   Roles ──committedBy──▶ Outcomes
//   Interactions ──invokedBy──▶ Activities
//
// Process row:
//   Outcomes ──achievedBy──▶ Activities
//   Activities ──gatedBy──▶ Conditions
//
// Process → Information (cross-row):
//   Outcomes ──vettedBy──▶ Terms (via Conditions)
//   Entitlements ──arbitratedBy──▶ Conditions
//   Entitlements ──definedBy──▶ Conditions
//
// Information row:
//   Concepts ──instantiatedBy──▶ Context
//   Context ──validatedBy──▶ Terms
//   Concepts ──constrainedBy──▶ Terms
//
// Information → People/Process (cross-row):
//   Concepts ──capacitatedBy──▶ Roles (via Resources)
//   Concepts ──evolvedBy──▶ (change tracking)
//   Context ──triggeredBy──▶ Activities
//   Conditions ──formulatedOn──▶ Terms

// ── People Row ──────────────────────────────────────────────────────────────

/**
 * Role (People × Domain)
 *
 * Responsibility-bearing positions with assigned obligations and permissions.
 * Abstracted from individuals, deontically governed. In RDF terms: Classes.
 */
export interface Role extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "people"; column: "domain" };
  cellLabel: "Roles";
  /** Roles ──permittedBy──▶ Entitlements */
  permittedByEntitlementIds: string[];
  /** Roles ──committedBy──▶ Outcomes (what this role is accountable for) */
  committedByOutcomeIds?: string[];
  /** Roles ──proposedBy──▶ Interactions (interactions this role initiates) */
  proposedByInteractionIds?: string[];
  /** Roles ──proposedTo──▶ Interactions (interactions directed at this role) */
  proposedToInteractionIds?: string[];
  /** Cross-layer: enabled by Goal */
  enabledByGoalIds?: string[];
  /** Cross-layer: delegated from Objective */
  delegatedFromObjectiveIds?: string[];
}

/**
 * Interaction (People × Behaviour)
 *
 * Observable exchanges between Roles. Proposals for state change initiated
 * by entitled Roles. Directional, event-based, state-impacting.
 * In RDF terms: Instances (individuals engaging in the endeavour).
 *
 * In the GSM, the Interaction is the locus of deliberation — where agency
 * meets the model. The agent proposes; the Activity evaluates.
 */
export interface Interaction extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "people"; column: "behaviour" };
  cellLabel: "Interactions";
  /** The Role initiating this interaction */
  proposingRoleId: string;
  /** The Role receiving this interaction (if applicable) */
  receivingRoleId?: string;
  /** Interactions ──verifiedBy──▶ Entitlements */
  verifiedByEntitlementIds: string[];
  /** Interactions ──invokedBy──▶ Activities (the Activity this interaction triggers) */
  invokedByActivityId: string;
  /** The proposed state transition: (currentState, proposedActivity, context) */
  proposedTransition?: {
    currentOutcomeId: string;
    proposedActivityId: string;
    contextSnapshot?: string;
  };
}

/**
 * Entitlement (People × Governance)
 *
 * Permissions, Obligations and Prohibitions governing Role participation.
 * Deontic logic: May, Must, MustNot.
 *
 * Each entitlement is a structured authorisation with two evaluation moments:
 * - At granting time: static authorisation (is this Role eligible?)
 * - At execution time: situational authorisation (may this Role act now?)
 *
 * The norm set N is the formal representation: each norm n is a 4-tuple
 * ⟨operator, source, applicability, provenance⟩
 */
export type DeonticOperator = "May" | "Must" | "MustNot";

export type ApplicabilityResult = "True" | "False" | "Unknown";

export interface Norm {
  /** May (Permission), Must (Obligation), or MustNot (Prohibition) */
  operator: DeonticOperator;
  /** The authority Role that issued this norm */
  sourceRoleId: string;
  /** Source document or policy reference */
  sourceDocument?: string;
  /**
   * Applicability predicate: κ → {True, False, Unknown}
   * Evaluated against current context at execution time.
   * If Unknown, the norm is excluded from Eff() and propagates to ε₄.
   */
  applicabilityExpression: string;
  /** Reference to the source document and clause */
  provenance: string;
}

export interface Entitlement extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "people"; column: "governance" };
  cellLabel: "Entitlements";
  /** The Role this entitlement is granted to */
  grantedToRoleId: string;
  /** The Activity this entitlement governs */
  governsActivityId: string;
  /** The full norm set N for this role-activity pair */
  norms: Norm[];
  /** Entitlements ──arbitratedBy──▶ Conditions */
  arbitratedByConditionIds?: string[];
  /** Entitlements ──definedBy──▶ Conditions */
  definedByConditionIds?: string[];
  /** Cross-layer: declared from Directive/Policy */
  declaredFromDirectiveIds?: string[];
  /** Granting-time qualification conditions */
  grantingConditions?: string[];
  /** Execution-time dynamic conditions (evaluated against κ) */
  executionConditions?: string[];
}

// ── Process Row ─────────────────────────────────────────────────────────────

/**
 * Outcome (Process × Domain)
 *
 * Named, verifiable states of business objects/records. Finite, explicitly
 * modelled, FSM-aligned. Pre and Post states of every transition.
 * In RDF terms: Classes (the forms things can take).
 */
export interface Outcome extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "process"; column: "domain" };
  cellLabel: "Outcomes";
  /** Outcomes ──achievedBy──▶ Activities */
  achievedByActivityIds: string[];
  /** Outcomes ──committedBy──▶ Roles (which roles are accountable) */
  committedByRoleIds?: string[];
  /** Whether this is an initial state, terminal state, or intermediate */
  lifecyclePosition?: "initial" | "terminal" | "intermediate" | "decision_gate";
  /** Property pattern: what makes this a valid instance of this Outcome */
  definingProperties?: Record<string, unknown>;
}

/**
 * Activity (Process × Behaviour)
 *
 * The evaluation engine: validates Conditions, executes logic, confirms
 * state transitions. State-transition operations moving entities between
 * Outcomes. In RDF terms: Instances.
 *
 * In the GSM, Activities are deterministic. They do not deliberate. Given
 * inputs, they evaluate and either Fire, Reject, or Escalate.
 */
export interface Activity extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "process"; column: "behaviour" };
  cellLabel: "Activities";
  /** Activity ──gatedBy──▶ Conditions (pre and post) */
  gatedByConditionIds: string[];
  /** The Outcome state this activity transitions FROM */
  preOutcomeId: string;
  /** The Outcome state this activity transitions TO */
  postOutcomeId: string;
  /** Interactions that can invoke this Activity */
  invokedByInteractionIds?: string[];
  /** Context that triggers this Activity */
  triggeredByContextIds?: string[];
  /** Next Activity in the chain (for VCC activity chains) */
  nextActivityId?: string | null;
  /** Capabilities required to perform this Activity */
  enabledByCapabilityIds?: string[];
  /** Roles that perform this Activity */
  performedByRoleIds: string[];
}

/**
 * Condition (Process × Governance)
 *
 * Pre- and post-condition logic gating state transitions. Logical gates
 * that must be satisfied for an Activity to fire.
 */
export type ConditionTiming = "precondition" | "postcondition" | "invariant";

export interface Condition extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "process"; column: "governance" };
  cellLabel: "Conditions";
  /** When this condition is evaluated */
  timing: ConditionTiming;
  /** The logical expression (evaluated against context κ and Terms T) */
  expression: string;
  /** Conditions ──formulatedOn──▶ Terms (semantic precision) */
  formulatedOnTermIds: string[];
  /** The Activities this condition gates */
  gatesActivityIds: string[];
  /** Entitlements that reference this condition */
  arbitratesEntitlementIds?: string[];
  /** Cross-layer: formulated from Control */
  formulatedFromControlIds?: string[];
}

// ── Information Row ─────────────────────────────────────────────────────────

/**
 * Concept (Information × Domain)
 *
 * Abstract semantic definitions of enterprise information. Domain classes:
 * the forms things can take. Schema-level, shared vocabulary.
 *
 * The Concept class has three fundamental subclasses:
 * - PartyClass: subjects (Customer, Supplier, Employee, System)
 * - ProductClass: objects (Loan, Policy, Contract, Report)
 * - RecordClass: interaction records with state lifecycles (Order, Claim)
 */
export type ConceptSubclass = "PartyClass" | "ProductClass" | "RecordClass" | "General";

export interface Concept extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "information"; column: "domain" };
  cellLabel: "Concepts";
  /** Fundamental subclass */
  subclass: ConceptSubclass;
  /** Concepts ──instantiatedBy──▶ Context */
  instantiatedByContextIds?: string[];
  /** Concepts ──constrainedBy──▶ Terms */
  constrainedByTermIds: string[];
  /** Concepts ──capacitatedBy──▶ Roles (who can work with this concept) */
  capacitatedByRoleIds?: string[];
  /** Concepts ──evolvedBy──▶ (change tracking) */
  evolvedByActivityIds?: string[];
  /** Properties defined for this concept (schema-level) */
  properties?: Record<string, PropertyDefinition>;
}

export interface PropertyDefinition {
  name: string;
  dataType: string;
  description?: string;
  required?: boolean;
  constrainedByTermIds?: string[];
}

/**
 * Context_ (Information × Behaviour)
 *
 * Live and versioned instance population: present state and history. The
 * actual current state of the world. In RDF terms: Instances.
 *
 * In the GSM formal definition, context κ is a structured object with:
 * - state: current property values of all Concept instances
 * - history: ordered, append-only log of prior (s, σ, timestamp) triples
 * - resources: countable consumable quantities
 * - time: current timestamp enabling temporal constraint evaluation
 *
 * Named Context_ to avoid collision with TypeScript's built-in Context.
 */
export interface Context_ extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "information"; column: "behaviour" };
  cellLabel: "Context";
  /** The Concept this context instantiates */
  instantiatesConceptId: string;
  /** Context ──validatedBy──▶ Terms */
  validatedByTermIds: string[];
  /** Context ──triggeredBy──▶ Activities (activities that read/update this context) */
  triggeredByActivityIds?: string[];
  /** Current state: property values of the Concept instance */
  state: Record<string, unknown>;
  /** Append-only history of prior transitions */
  history: TransitionRecord[];
  /** Countable consumable quantities (broadcast counts, resource limits) */
  resources?: Record<string, number>;
  /** Current timestamp for temporal constraint evaluation */
  timestamp?: string;
}

export interface TransitionRecord {
  fromOutcomeId: string;
  toOutcomeId: string;
  activityId: string;
  roleId: string;
  timestamp: string;
  contextSnapshot?: Record<string, unknown>;
}

/**
 * Term (Information × Governance)
 *
 * Definitions, property constraints and semantic precision. SHACL constraints
 * over the JSON-LD state graph. Terms make the difference between a claim
 * being labelled "Approved" and actually satisfying the conditions that
 * "Approved" requires.
 *
 * Terms T constitute the typing and constraint system for Concepts.
 */
export type TermValidationResult = "conforms" | "violation" | "unknown";

export interface Term extends ExecutionLayerElement {
  cell: CellPosition & { layer: "execution"; row: "information"; column: "governance" };
  cellLabel: "Terms";
  /** The Concept(s) this Term constrains */
  constrainsConceptIds: string[];
  /** Conditions that reference this Term for semantic precision */
  formulatesConditionIds?: string[];
  /** Property constraints (future: SHACL shapes; current: TypeScript predicates) */
  constraints: TermConstraint[];
  /** Context instances validated by this Term */
  validatesContextIds?: string[];
}

export interface TermConstraint {
  /** The property path being constrained */
  propertyPath: string;
  /** Constraint type */
  constraintType: "datatype" | "minCount" | "maxCount" | "pattern" | "minInclusive" |
    "maxInclusive" | "in" | "hasValue" | "class" | "custom";
  /** The constraint value (type depends on constraintType) */
  value: unknown;
  /** Human-readable description of what this constraint enforces */
  description?: string;
  /**
   * Evaluate this constraint against a context value.
   * Returns conforms/violation/unknown.
   * Current implementation: TypeScript predicate.
   * Future (D-097 Step 2): SHACL shape evaluation.
   */
  // Note: actual evaluation logic lives in gsm.ts evaluateTerms()
}

// ═════════════════════════════════════════════════════════════════════════════
// FRAMEWORK REGISTRIES
// ═════════════════════════════════════════════════════════════════════════════

/** Complete Purpose Layer — all three rows × three columns */
export interface PurposeLayer {
  // Set row
  goals: Record<string, Goal>;
  strategies: Record<string, Strategy>;
  directives: Record<string, Directive>;
  // Plan row
  objectives: Record<string, Objective>;
  tactics: Record<string, Tactic>;
  controls: Record<string, Control>;
  // Realise row
  components: Record<string, Component>;
  orchestrations: Record<string, Orchestration_>;
  functions: Record<string, Function_>;
}

/** Complete Execution Layer — all three rows × three columns */
export interface ExecutionLayer {
  // People row
  roles: Record<string, Role>;
  interactions: Record<string, Interaction>;
  entitlements: Record<string, Entitlement>;
  // Process row
  outcomes: Record<string, Outcome>;
  activities: Record<string, Activity>;
  conditions: Record<string, Condition>;
  // Information row
  concepts: Record<string, Concept>;
  contexts: Record<string, Context_>;
  terms: Record<string, Term>;
}

/**
 * The complete CAPSICUM Framework instance for a domain.
 * Both layers, all cells, all meta-relationships.
 */
export interface CapsicumFramework {
  frameworkId: string;
  name: string;
  description?: string;
  purposeLayer: PurposeLayer;
  executionLayer: ExecutionLayer;
}
