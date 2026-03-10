// ─────────────────────────────────────────────────────────────────────────────
// Governed State Machine (GSM) — Formal Type System
// ─────────────────────────────────────────────────────────────────────────────
//
// The GSM is a typed nine-tuple formal object that encodes the Execution Layer
// of the CAPSICUM Framework as a computationally precise state machine.
//
// GSM = ⟨S, Σ, map, δ, u, s₀, F, E, T, ε⟩
//
// Every component of the tuple maps to a named cell in the 3×3 Execution
// Layer matrix. The kernel is not an addition to the framework; it is the
// framework expressed as a computationally precise formal object.
//
// Reference: "A Logical Model of Endeavour" (Roach, 2026)
//            "The CAPSICUM Framework: Structure and Semantics" (Roach, 2026)
//
// This module is isomorphic to the formal definition. When D-097 Step 2
// delivers SHACL-based Terms validation, the TermsEvaluator interface can be
// swapped from TypeScript predicates to declarative shape evaluation without
// changing the kernel's public interface.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  DeonticOperator,
  Norm,
  ApplicabilityResult,
  TermValidationResult,
  TransitionRecord,
} from "./capsicum.ts";

// ═════════════════════════════════════════════════════════════════════════════
// THE NINE-TUPLE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * The Governed State Machine — a typed nine-tuple.
 *
 * Each field maps to a specific cell (or combination of cells) in the
 * CAPSICUM 3×3 Execution Layer matrix:
 *
 * | Component | Cell in 3×3                      | Description                                    |
 * |-----------|----------------------------------|------------------------------------------------|
 * | S         | Process × Domain (Outcomes)      | Set of reachable states in the lifecycle        |
 * | Σ         | Process × Behaviour (Activities) | Activity types that can trigger transitions     |
 * | map       | Process × Behaviour              | Classifier: proposal → Activity type in Σ       |
 * | δ         | Process × Behaviour              | Transition function: S × Σ × κ → (S × κ) ∪ {⊥} |
 * | u         | Information × Behaviour (Context)| Context update function                         |
 * | s₀        | Process × Domain                 | Initial Outcome state                           |
 * | F         | Process × Domain                 | Set of terminal Outcome states                  |
 * | E         | People × Governance (Entitlements)| Entitlement function: Role × Activity × κ → P(N)|
 * | T         | Information × Governance (Terms)  | Typing and constraint system for Concepts       |
 * | ε         | (escalation predicate)           | Halt condition when evaluation is indeterminate |
 */
export interface GovernedStateMachine {
  /** S — Set of Outcome types: the reachable states of the lifecycle */
  outcomeStates: OutcomeState[];

  /** Σ — Set of Activity types that can trigger transitions (the alphabet) */
  activityAlphabet: ActivityType[];

  /**
   * map — Classifier function.
   * Maps an agent's proposed action to an Activity type in Σ,
   * or returns Ambiguous/Unknown.
   * This is ε₁ grounded formally: classification failure occurs here.
   */
  classifier: ActivityClassifier;

  /**
   * δ — Transition function.
   * S × Σ × κ → (S × κ) ∪ {⊥}
   * Maps current state, proposed activity, and current context to a
   * next state and updated context, or to ⊥ (invalid).
   */
  transitionRules: TransitionRule[];

  /** s₀ — Initial Outcome state */
  initialState: string; // outcomeId

  /** F — Set of terminal Outcome states */
  terminalStates: string[]; // outcomeIds

  /**
   * E — Entitlement function.
   * E : Role × Activity × κ → P(N)
   * Returns the full norm set for a role-activity pair in current context.
   */
  entitlementRegistry: EntitlementRegistryEntry[];

  /**
   * T — Terms: typing and constraint system for Concepts.
   * SHACL shapes over JSON-LD state graph (future).
   * TypeScript predicates (current implementation per D-102).
   */
  termsRegistry: TermsRegistryEntry[];

  /**
   * ε — Escalation predicate.
   * The condition under which the system cannot determine validity and must halt.
   * Four named triggers: ε₁ (semantic subsumption), ε₂ (deontic conflict),
   * ε₃ (missing entitlement), ε₄ (state stochasticity / evaluator fault).
   */
  escalationPolicy: EscalationPolicy;
}

// ═════════════════════════════════════════════════════════════════════════════
// TUPLE COMPONENT TYPES
// ═════════════════════════════════════════════════════════════════════════════

// ── S: Outcome States ───────────────────────────────────────────────────────

export interface OutcomeState {
  outcomeId: string;
  name: string;
  /** Whether this is initial, terminal, intermediate, or a decision gate */
  position: "initial" | "terminal" | "intermediate" | "decision_gate";
  /** Property pattern that defines a valid instance of this state */
  definingProperties?: Record<string, unknown>;
}

// ── Σ: Activity Alphabet ────────────────────────────────────────────────────

export interface ActivityType {
  activityId: string;
  name: string;
  /** The Outcome states from which this Activity can be invoked */
  validFromStates: string[]; // outcomeIds
  /** The Outcome state this Activity transitions to (if successful) */
  targetState: string; // outcomeId
  /** Pre-condition IDs that must be satisfied */
  preconditionIds: string[];
  /** Post-condition IDs that must be satisfied on the resulting state */
  postconditionIds: string[];
  /** Terms that must validate for pre/post evaluation */
  termIds: string[];
}

// ── map: Activity Classifier ────────────────────────────────────────────────

export type ClassificationResult =
  | { status: "mapped"; activityId: string }
  | { status: "ambiguous"; candidates: string[] }  // → ε₁
  | { status: "unknown" };                          // → ε₁

export interface ActivityClassifier {
  /**
   * Maps an agent's proposed action (free text or structured) to a formal
   * Activity type in Σ. Returns mapped, ambiguous, or unknown.
   *
   * If ambiguous or unknown, ε₁ (semantic subsumption failure) fires.
   */
  classify(proposal: string, alphabet: ActivityType[]): ClassificationResult;
}

// ── δ: Transition Rules ─────────────────────────────────────────────────────

export interface TransitionRule {
  /** The Activity type this rule applies to */
  activityId: string;
  /** Source Outcome state */
  fromOutcomeId: string;
  /** Target Outcome state (if transition fires) */
  toOutcomeId: string;
  /** Pre-condition expressions to evaluate against κ */
  preconditions: ConditionExpression[];
  /** Post-condition expressions to validate on resulting state */
  postconditions: ConditionExpression[];
}

export interface ConditionExpression {
  conditionId: string;
  expression: string;
  /** Term IDs providing semantic precision for this condition */
  termIds: string[];
}

// ── u: Context Update Function ──────────────────────────────────────────────

/**
 * The context κ is a structured object carrying the live state of the world.
 *
 * Components:
 * - state: current property values of all Concept instances
 * - history: ordered, append-only log of prior transitions
 * - resources: countable consumable quantities
 * - time: current timestamp
 *
 * The update function u(s, σ, κ, s') → κ' advances state, appends history,
 * decrements consumed resources, and advances the timestamp.
 */
export interface KernelContext {
  /** Current property values of all Concept instances */
  state: Record<string, Record<string, unknown>>;
  /** Ordered, append-only log of prior transitions */
  history: TransitionRecord[];
  /** Countable consumable quantities (broadcast counts, resource limits) */
  resources: Record<string, number>;
  /** Current timestamp */
  time: string;
}

// ── E: Entitlement Registry ─────────────────────────────────────────────────

export interface EntitlementRegistryEntry {
  /** The Role this entitlement set applies to */
  roleId: string;
  /** The Activity this entitlement set governs */
  activityId: string;
  /** The full norm set N: all norms ever defined for this role-activity pair */
  norms: Norm[];
}

/**
 * Eff(E(ρ, σ, κ)) — the effective operator function.
 *
 * E() returns every norm ever defined for this role-activity pair.
 * Eff() reduces to the set of operators whose applicability predicate
 * is satisfied in the current context. If any applicability returns Unknown,
 * that norm is excluded and the Unknown propagates to ε₄.
 */
export interface EffectiveNormSet {
  /** Active norms with applicability = True in current context */
  activeNorms: Norm[];
  /** Effective operators extracted from active norms */
  operators: Set<DeonticOperator>;
  /** Whether any norm's applicability returned Unknown (propagates to ε₄) */
  hasUnknown: boolean;
  /** The norms whose applicability could not be evaluated */
  unknownNorms: Norm[];
}

// ── T: Terms Registry ───────────────────────────────────────────────────────

export interface TermsRegistryEntry {
  termId: string;
  name: string;
  /** The Concept(s) this Term constrains */
  constrainsConceptIds: string[];
  /** Property constraints */
  constraints: TermConstraintEntry[];
}

export interface TermConstraintEntry {
  propertyPath: string;
  constraintType: "datatype" | "minCount" | "maxCount" | "pattern" |
    "minInclusive" | "maxInclusive" | "in" | "hasValue" | "class" | "custom";
  value: unknown;
  description?: string;
}

// ── ε: Escalation ───────────────────────────────────────────────────────────

/**
 * The four named escalation triggers.
 *
 * All four have identical consequence: halt, do not act, report the specific
 * trigger, escalate to the authority that can resolve it.
 */
export type EscalationTrigger =
  | "epsilon_1"  // Semantic Subsumption Failure: σ cannot be mapped to Σ
  | "epsilon_2"  // Deontic Conflict: May/Must and MustNot both applicable
  | "epsilon_3"  // Missing Entitlement Mapping: no norms for this role-activity pair
  | "epsilon_4"; // State Stochasticity / Evaluator Fault: Unknown or Fault

export interface EscalationEvent {
  trigger: EscalationTrigger;
  /** Human-readable name of the trigger */
  triggerName: string;
  /** Description of why escalation occurred */
  reason: string;
  /** The role attempting the transition */
  roleId: string;
  /** The activity being attempted */
  activityId: string;
  /** The current state at time of escalation */
  currentOutcomeId: string;
  /** Context snapshot at time of escalation */
  contextSnapshot?: Partial<KernelContext>;
  /** Timestamp of escalation */
  timestamp: string;
}

export interface EscalationPolicy {
  /** Default escalation authority (roleId) */
  defaultAuthorityRoleId: string;
  /** Per-trigger authority overrides */
  triggerAuthorities?: Partial<Record<EscalationTrigger, string>>;
}

// ═════════════════════════════════════════════════════════════════════════════
// THE VALIDITY FUNCTION V
// ═════════════════════════════════════════════════════════════════════════════

/**
 * V(ρ, σ, s, κ, T) → {Fire, Reject, Escalate(εᵢ)}
 *
 * The tri-valued validity function. Takes a role, a proposed action, a
 * current state, and a context, and returns one of three outcomes.
 *
 * Evaluation is procedural and ordered:
 *   1. Entitlement check (is ρ permitted/obligated for σ?)
 *   2. Conflict detection (do active norms contradict?)
 *   3. Reachability (is s in the domain of δ for σ?)
 *   4. Preconditions (does PRE(σ, κ) hold?)
 *   5. Terms constraints (are Terms T satisfied?)
 *   6. Postcondition achievability (will POST hold on resulting state?)
 *
 * The first condition that fails determines the outcome. The kernel does
 * not continue evaluating after a failure is found.
 */
export type ValidityVerdict =
  | { outcome: "Fire"; nextState: string; updatedContext: KernelContext; auditRecord: AuditRecord }
  | { outcome: "Reject"; reason: string; failedAt: EvaluationStep; auditRecord: AuditRecord }
  | { outcome: "Escalate"; event: EscalationEvent; auditRecord: AuditRecord };

export type EvaluationStep =
  | "entitlement_check"
  | "conflict_detection"
  | "reachability"
  | "preconditions"
  | "terms_constraints"
  | "postcondition_achievability";

// ═════════════════════════════════════════════════════════════════════════════
// THE DECISION TABLE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * The Governance Decision Table.
 *
 * Every Activity type in Σ has an associated decision table with a fixed
 * column structure and as many rows as required to cover the governance
 * condition space. Rows are evaluated top-to-bottom; the first matching
 * row determines the outcome.
 *
 * The decision table is the most important single artefact in the formal
 * specification: it makes V total, every possible input has a defined output,
 * and no transition can fall through without a governance decision.
 *
 * Every row is a test case for an implementation.
 * Every row is an audit trail entry.
 */
export type EngineStatus = "OK" | "Fault";
export type ConflictStatus = "No" | "Yes";
export type ReachabilityStatus = "Yes" | "No";
export type ConditionStatus = "True" | "False" | "Unknown";
export type TermsStatus = "Valid" | "Invalid" | "Unknown";

export interface DecisionTableRow {
  /** Row number (for audit trail reference) */
  rowNumber: number;
  /** Engine status: OK or Fault (ε₄ short-circuit) */
  engineStatus: EngineStatus;
  /** Effective operator set from Eff(E(ρ,σ,κ)) */
  effectiveOperators: DeonticOperator[] | "empty" | "any";
  /** Whether deontic conflict detected */
  conflict: ConflictStatus | "any";
  /** Whether σ is reachable from current state s */
  reachable: ReachabilityStatus | "any";
  /** Whether PRE(σ, κ) holds */
  preconditions: ConditionStatus | "any";
  /** Whether Terms T are satisfied */
  terms: TermsStatus | "any";
  /** Whether POST will hold on resulting state */
  postconditions: ConditionStatus | "any";
  /** The verdict for this row */
  verdict: "Fire" | "Reject" | "Escalate(ε₁)" | "Escalate(ε₂)" | "Escalate(ε₃)" | "Escalate(ε₄)";
}

export interface DecisionTable {
  /** The Activity type this table governs */
  activityId: string;
  activityName: string;
  /** Ordered rows — evaluated top to bottom, first match wins */
  rows: DecisionTableRow[];
}

/**
 * The canonical decision table structure.
 * Rows 1-14 + default deny (*), as specified in the paper §6.0.1.
 */
export const CANONICAL_DECISION_TABLE: Omit<DecisionTableRow, "rowNumber">[] = [
  // Row 1: Permission, all conditions satisfied → Fire
  { engineStatus: "OK", effectiveOperators: ["May"],  conflict: "No",  reachable: "Yes", preconditions: "True",    terms: "Valid",   postconditions: "True",    verdict: "Fire" },
  // Row 2: Obligation, all conditions satisfied → Fire
  { engineStatus: "OK", effectiveOperators: ["Must"], conflict: "No",  reachable: "Yes", preconditions: "True",    terms: "Valid",   postconditions: "True",    verdict: "Fire" },
  // Row 3: Prohibition → Reject
  { engineStatus: "OK", effectiveOperators: ["MustNot"], conflict: "No", reachable: "any", preconditions: "any",   terms: "any",     postconditions: "any",     verdict: "Reject" },
  // Row 4: May + MustNot conflict → Escalate(ε₂)
  { engineStatus: "OK", effectiveOperators: ["May", "MustNot"], conflict: "Yes", reachable: "any", preconditions: "any", terms: "any", postconditions: "any", verdict: "Escalate(ε₂)" },
  // Row 5: Must + MustNot conflict → Escalate(ε₂)
  { engineStatus: "OK", effectiveOperators: ["Must", "MustNot"], conflict: "Yes", reachable: "any", preconditions: "any", terms: "any", postconditions: "any", verdict: "Escalate(ε₂)" },
  // Row 6: Empty norm set, no conflict → Escalate(ε₃) (missing entitlement)
  { engineStatus: "OK", effectiveOperators: "empty", conflict: "No", reachable: "any", preconditions: "any", terms: "any", postconditions: "any", verdict: "Escalate(ε₃)" },
  // Row 7: Permission but not reachable → Reject
  { engineStatus: "OK", effectiveOperators: ["May"],  conflict: "No",  reachable: "No",  preconditions: "any",    terms: "any",     postconditions: "any",     verdict: "Reject" },
  // Row 8: Permission, reachable, preconditions fail → Reject
  { engineStatus: "OK", effectiveOperators: ["May"],  conflict: "No",  reachable: "Yes", preconditions: "False",  terms: "any",     postconditions: "any",     verdict: "Reject" },
  // Row 9: Permission, reachable, preconditions unknown → Escalate(ε₄)
  { engineStatus: "OK", effectiveOperators: ["May"],  conflict: "No",  reachable: "Yes", preconditions: "Unknown", terms: "any",    postconditions: "any",     verdict: "Escalate(ε₄)" },
  // Row 10: Permission, preconditions pass, terms invalid → Reject
  { engineStatus: "OK", effectiveOperators: ["May"],  conflict: "No",  reachable: "Yes", preconditions: "True",   terms: "Invalid", postconditions: "any",     verdict: "Reject" },
  // Row 11: Permission, preconditions pass, terms unknown → Escalate(ε₄)
  { engineStatus: "OK", effectiveOperators: ["May"],  conflict: "No",  reachable: "Yes", preconditions: "True",   terms: "Unknown", postconditions: "any",     verdict: "Escalate(ε₄)" },
  // Row 12: Permission, terms valid, postconditions fail → Reject
  { engineStatus: "OK", effectiveOperators: ["May"],  conflict: "No",  reachable: "Yes", preconditions: "True",   terms: "Valid",   postconditions: "False",   verdict: "Reject" },
  // Row 13: Permission, terms valid, postconditions unknown → Escalate(ε₄)
  { engineStatus: "OK", effectiveOperators: ["May"],  conflict: "No",  reachable: "Yes", preconditions: "True",   terms: "Valid",   postconditions: "Unknown", verdict: "Escalate(ε₄)" },
  // Row 14: Engine fault → Escalate(ε₄)
  { engineStatus: "Fault", effectiveOperators: "any", conflict: "any", reachable: "any", preconditions: "any", terms: "any", postconditions: "any", verdict: "Escalate(ε₄)" },
  // Row *: Default Deny — catch-all
  // Any combination not matched above → Reject
];

// ═════════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Every kernel evaluation produces a complete audit record.
 * The record traces from verdict → decision table row → norm tuple → source document.
 */
export interface AuditRecord {
  /** Unique ID for this evaluation */
  evaluationId: string;
  /** Timestamp of evaluation */
  timestamp: string;

  // Inputs
  roleId: string;
  activityId: string;
  currentOutcomeId: string;
  contextSnapshot: Partial<KernelContext>;

  // Evaluation trace
  classificationResult: ClassificationResult;
  effectiveNormSet: EffectiveNormSet;
  conflictDetected: boolean;
  reachable: boolean;
  preconditionResults: Record<string, ConditionStatus>;
  termsResults: Record<string, TermsStatus>;
  postconditionResults: Record<string, ConditionStatus>;

  // Decision
  matchedRow: number;
  verdict: "Fire" | "Reject" | "Escalate";
  escalationTrigger?: EscalationTrigger;
  reason: string;

  // Outcome (if Fire)
  nextOutcomeId?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// KERNEL STATUS (for UI rendering)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Runtime kernel status — the information displayed in the Kernel Status
 * panel during simulation. Maps to the kernel-poc's status display.
 */
export interface KernelStatus {
  /** Current Role (ρ) */
  roleId: string;
  roleName: string;
  /** Current Activity (σ) */
  activityId: string;
  activityName: string;
  /** Current Entitlement summary */
  entitlementSummary: string;
  /** Conflict status */
  conflict: "None" | "Detected" | "N/A";
  /** Conditions status */
  conditionsStatus: string;
  /** Current verdict */
  verdict: "Fire" | "Reject" | "Escalate" | "Pending";
  /** Escalation trigger (if applicable) */
  escalationTrigger?: EscalationTrigger;
}

// ═════════════════════════════════════════════════════════════════════════════
// SCENARIO (for simulation)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * A simulation scenario — a structured what-if question posed to the kernel.
 *
 * "What happens when Role ρ attempts Activity σ in state s with context κ?"
 */
export interface SimulationScenario {
  scenarioId: string;
  name: string;
  description?: string;
  /** The Role attempting the action */
  roleId: string;
  /** The proposed Activity */
  activityId: string;
  /** The current Outcome state */
  currentOutcomeId: string;
  /** Context overrides for this scenario */
  contextOverrides?: Partial<KernelContext>;
  /** Expected verdict (for testing / validation) */
  expectedVerdict?: "Fire" | "Reject" | "Escalate";
  expectedEscalationTrigger?: EscalationTrigger;
  /** Step-by-step narrative for UI walkthrough */
  narrativeSteps?: NarrativeStep[];
}

export interface NarrativeStep {
  stepNumber: number;
  /** Which cells in the 3×3 grid are highlighted at this step */
  highlightedCells: Array<{ row: "people" | "process" | "information"; column: "domain" | "behaviour" | "governance" }>;
  /** Narrative text explaining what's happening */
  narrative: string;
  /** The evaluation step being performed */
  evaluationStep?: EvaluationStep;
  /** Arrow connections between cells (for animation) */
  arrows?: Array<{
    from: { row: string; column: string };
    to: { row: string; column: string };
    label?: string;
  }>;
}
