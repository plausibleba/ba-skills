/**
 * Built-in scoring profiles.
 *
 * Each profile defines its own dimension set, weights, hard-floor rules,
 * and (optionally) classification thresholds. Industry calibration is the
 * methodology asset — different industries care about different things.
 *
 * Currently shipping: financial-services (PRD's eight dimensions).
 * Roadmap: healthcare, public-sector, manufacturing.
 */

import type { ScoringProfile } from "./types";

// ── financial-services ─────────────────────────────────────────────────

/**
 * Financial Services profile — the PRD's eight scoring dimensions, with
 * hard-floor rules on Regulatory Constraint Level and Error Consequence
 * Severity that reflect the legal-defensibility and asymmetric-risk
 * principles surfaced in the PRD's Claims Settlement worked example.
 */
export const FINANCIAL_SERVICES_PROFILE: ScoringProfile = {
  id: "financial-services",
  label: "Financial Services",
  description:
    "Calibrated for financial-services capabilities. Heavier weight on regulatory and error-consequence dimensions; hard floors on legally-mandated human accountability and catastrophic error consequence.",
  dimensions: [
    {
      id: "rule_codifiability",
      label: "Rule Codifiability",
      description:
        "How completely can the capability's logic be reduced to deterministic rules?",
      weightClass: "high",
      scoringGuidance: {
        1: "Highly judgment-dependent; rules cannot capture the work meaningfully.",
        5: "Fully rule-codifiable with minimal exceptions.",
      },
    },
    {
      id: "data_readiness",
      label: "Data Readiness",
      description:
        "Is the data the capability consumes and produces structured, accessible, and current?",
      weightClass: "high",
      scoringGuidance: {
        1: "Data unstructured, locked in legacy systems, or not available in real time.",
        5: "Data structured, machine-readable, accessible in real time.",
      },
    },
    {
      id: "automation_maturity",
      label: "Automation Maturity",
      description:
        "How automated is the capability today? Higher current automation makes agentic transition easier.",
      weightClass: "medium",
      scoringGuidance: {
        1: "Manual, paper-based, or heavily user-mediated.",
        5: "Already substantially automated with digital workflows.",
      },
    },
    {
      id: "human_judgment_dependency",
      label: "Human Judgment Dependency",
      description:
        "How much of the capability's work requires contextual or experiential human judgment?",
      weightClass: "high",
      scoringGuidance: {
        1: "Critical human judgment throughout — irreplaceable contextual interpretation.",
        5: "Human judgment rarely required; outcomes are determined by inputs and rules.",
      },
    },
    {
      id: "exception_tolerance",
      label: "Exception Tolerance",
      description:
        "How frequent and complex are the cases that deviate from the standard path?",
      weightClass: "medium",
      scoringGuidance: {
        1: "High exception rate, complex resolution, broad consequence.",
        5: "Low exception rate, simple resolution, contained consequence.",
      },
    },
    {
      id: "error_consequence_severity",
      label: "Error Consequence Severity",
      description:
        "If the capability produces a wrong outcome, how serious is the harm?",
      weightClass: "high",
      scoringGuidance: {
        1: "Errors cause catastrophic or irreversible harm (financial, legal, reputational).",
        5: "Errors are low-impact and recoverable.",
      },
      specialRules: [
        {
          type: "hardFloor",
          triggerScore: 1,
          capClassification: "supervised_autonomous",
          reason:
            "Catastrophic / irreversible error consequence — agent operation requires structured human oversight regardless of composite score (asymmetric-risk principle).",
        },
      ],
    },
    {
      id: "regulatory_constraint_level",
      label: "Regulatory Constraint Level",
      description:
        "How strongly does external regulation constrain who or what is permitted to make decisions in this capability?",
      weightClass: "high",
      scoringGuidance: {
        1: "Legally mandated human accountability — a human must make the decision.",
        5: "No regulatory constraint on automation.",
      },
      specialRules: [
        {
          type: "hardFloor",
          triggerScore: 1,
          capClassification: "hitl_assisted",
          reason:
            "Legal mandate for human accountability — agent may surface evidence and recommend, but the decision itself remains with a qualified human (legal-defensibility principle).",
        },
      ],
    },
    {
      id: "inter_capability_dependency_complexity",
      label: "Inter-Capability Dependency Complexity",
      description:
        "How tightly is this capability coupled to upstream and downstream capabilities, and how complex are the handoffs?",
      weightClass: "medium",
      scoringGuidance: {
        1: "Highly interdependent, complex interfaces, fragile handoffs.",
        5: "Low dependency, clean boundaries, well-defined interfaces.",
      },
    },
  ],
};

// ── Profile registry ───────────────────────────────────────────────────

export const BUILT_IN_PROFILES: ScoringProfile[] = [FINANCIAL_SERVICES_PROFILE];

export function getProfileById(id: string): ScoringProfile | undefined {
  return BUILT_IN_PROFILES.find((p) => p.id === id);
}

export function listProfiles(): { id: string; label: string }[] {
  return BUILT_IN_PROFILES.map((p) => ({ id: p.id, label: p.label }));
}
