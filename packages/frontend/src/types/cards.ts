// ─────────────────────────────────────────────────────────────────────────────
// Concept Cards & Policy Cards — MVC Integration (Eric Broda / Agentic Mesh)
// ─────────────────────────────────────────────────────────────────────────────
//
// Concept Cards capture disambiguated meaning; Policy Cards capture decision
// boundaries. Together they form the Minimum Viable Context (MVC) that a
// context compiler loads into an agent's context window at each step.
//
// The VCC scaffold provides the orchestration backbone — its activity chain
// tells the compiler WHICH cards to load at WHICH step.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScaffoldData, ScaffoldActivity } from "../types.ts";

// ── Concept Card ─────────────────────────────────────────────────────────────

export interface ConceptSense {
  senseName: string;
  description: string;
  systemOfRecord?: string;
  disambiguationCues: string[];
}

export interface ConceptRelationship {
  type: "has-a" | "is-a" | "part-of" | "consumes" | "produces" | "governs" | "relates-to";
  targetCardId: string;
  label?: string;
}

export interface CardAnchors {
  capabilityIds?: string[];
  roleIds?: string[];
  activityIds?: string[];
  informationObjectIds?: string[];
  technologyAppIds?: string[];
  controlIds?: string[];
}

export interface ConceptCard {
  cardId: string;
  canonicalName: string;
  description: string;
  owner: string;
  senses: ConceptSense[];
  relationships: ConceptRelationship[];
  anchors: CardAnchors;
  provenance: string;
  dataAcquisitionPlan?: string;
  tokenBudget: number;
}

// ── Policy Card ──────────────────────────────────────────────────────────────

export type AuthorityTier = "policy" | "procedure" | "guidance" | "workaround";
export type ObligationType = "permit" | "obligate" | "prohibit";
export type FailureBehavior = "escalate" | "fallback" | "block" | "log";

export interface PolicyScope {
  lifecycleStages?: string[];   // activity IDs
  roles?: string[];             // role IDs
  channel?: string;
  jurisdiction?: string;
  product?: string;
}

export interface PolicyCondition {
  expression: string;
  referencedSenses?: string[];  // "cc_prospect:CRM Lead" format
}

export interface PolicyOutcome {
  obligationType: ObligationType;
  description: string;
}

export interface ActionBinding {
  system: string;
  action: string;
  parameters?: Record<string, string>;
  failureBehavior: FailureBehavior;
}

export interface PolicyCard {
  cardId: string;
  name: string;
  description: string;
  authorityTier: AuthorityTier;
  scope: PolicyScope;
  conditions: PolicyCondition[];
  outcomes: PolicyOutcome[];
  exceptions: string[];
  provenance: string;
  ownership: string;
  actionBindings: ActionBinding[];
  effectiveDates?: { from: string; until?: string };
  anchors: CardAnchors;
}

// ── Card Registry ────────────────────────────────────────────────────────────

export interface CardRegistry {
  conceptCards: Record<string, ConceptCard>;
  policyCards: Record<string, PolicyCard>;
}

// ── Card Query ───────────────────────────────────────────────────────────────

/** Given an activity, find all cards whose anchors intersect with its elements. */
export function getCardsForActivity(
  activityId: string,
  registry: CardRegistry,
  scaffold: ScaffoldData,
): { concepts: ConceptCard[]; policies: PolicyCard[] } {
  const activity = scaffold.elements.activities[activityId] as ScaffoldActivity | undefined;
  if (!activity) return { concepts: [], policies: [] };

  // Collect the element IDs reachable from this activity
  const capIds = new Set(
    (activity as unknown as Record<string, unknown>).enabledByCapabilityIds as string[] ??
    (activity as unknown as Record<string, unknown>).requiresCapabilityIds as string[] ?? []
  );
  const roleIds = new Set(activity.performedByRoleIds ?? []);
  const controlIds = new Set((activity as unknown as Record<string, unknown>).controlIds as string[] ?? []);

  // Also include info objects and tech apps from capabilityPPIT
  const ioIds = new Set<string>();
  const techIds = new Set<string>();
  const ppit = (activity as unknown as Record<string, unknown>).capabilityPPIT as Record<string, {
    informationObjectIds?: string[];
    technologyAppIds?: string[];
  }> | undefined;
  if (ppit) {
    for (const cp of Object.values(ppit)) {
      (cp.informationObjectIds ?? []).forEach((id) => ioIds.add(id));
      (cp.technologyAppIds ?? []).forEach((id) => techIds.add(id));
    }
  }

  function anchorsMatch(anchors: CardAnchors): boolean {
    if (anchors.activityIds?.includes(activityId)) return true;
    if (anchors.capabilityIds?.some((id) => capIds.has(id))) return true;
    if (anchors.roleIds?.some((id) => roleIds.has(id))) return true;
    if (anchors.controlIds?.some((id) => controlIds.has(id))) return true;
    if (anchors.informationObjectIds?.some((id) => ioIds.has(id))) return true;
    if (anchors.technologyAppIds?.some((id) => techIds.has(id))) return true;
    return false;
  }

  const concepts = Object.values(registry.conceptCards).filter((c) => anchorsMatch(c.anchors));
  const policies = Object.values(registry.policyCards).filter((p) => anchorsMatch(p.anchors));

  return { concepts, policies };
}
