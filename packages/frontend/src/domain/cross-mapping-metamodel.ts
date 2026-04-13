/**
 * cross-mapping-metamodel.ts — Formal relationship type definitions for cross-mapping.
 *
 * Defines the valid relationship types between element classes in the CAPSICUM ontology.
 * Semantics (symmetry, functional, transitive, cardinality) are fixed per relationship type —
 * they are properties of the metamodel, not user-configurable per instance.
 *
 * CRITICAL ONTOLOGICAL DISTINCTION:
 *   - Value Stream Stage ("stages") — a sequential step in a value stream flow.
 *     The current scaffold stores these in `elements.activities` (legacy naming).
 *   - Activity ("activities") — a step in a Process that operationalises a Capability.
 *     Not yet represented as a separate scaffold element.
 *   These are DIFFERENT element classes. Never conflate them.
 *
 * PPIT is a decomposition of CAPABILITIES (not Stages). The VS Stage provides context
 * for how a capability manifests, but PPIT belongs to the Capability.
 *
 * Level constraints allow users to restrict mappings to a specific hierarchy depth
 * (e.g., "map stages to L3 capabilities only").
 *
 * @see ARCHITECTURE.md — "Ontology Without Repository"
 * @see DECISIONS.md — D-095, D-097, D-101
 */

import type { MappableEntity, MappingSemantics } from "../store/enrichment-store.ts";

// ─── Relationship Type ─────────────────────────────────────────────────────

export interface LevelConstraint {
  /** Which entity class the constraint applies to ("from" or "to") */
  appliesTo: "from" | "to";
  /** Allowed levels (e.g. [3] = L3 only, [3,4] = L3 or L4) */
  allowedLevels: number[];
  /** Human-readable label for UI */
  label: string;
}

export interface RelationshipType {
  /** Unique ID for this relationship type */
  id: string;
  /** Source element class */
  from: MappableEntity;
  /** Target element class */
  to: MappableEntity;
  /** Forward label: "Capabilities [realised in] Stages" */
  label: string;
  /** Inverse label: "Stages [realise] Capabilities" */
  inverseLabel: string;
  /** Short description of what this relationship means */
  description: string;
  /** Fixed semantic properties — not user-editable */
  semantics: MappingSemantics;
  /**
   * Default level constraint for hierarchical entities (capabilities, etc.).
   * Users can override the allowed levels, but the appliesTo direction is fixed.
   * If undefined, no level constraint applies.
   */
  defaultLevelConstraint?: LevelConstraint;
  /**
   * If true, this is a compound relationship type (like PPIT) that bundles
   * multiple sub-relationships into a single enrichment run.
   * Compound types have `subRelationshipIds` listing their constituent types.
   */
  compound?: boolean;
  /** IDs of constituent relationship types (only for compound types) */
  subRelationshipIds?: string[];
}

// ─── The Metamodel ─────────────────────────────────────────────────────────

/**
 * CROSS_MAPPING_METAMODEL — The canonical set of valid cross-mapping relationships.
 *
 * ┌─────────────────────┬─────────────────────────┬───────────────────────────────┐
 * │  Source              │  Relationship           │  Target                       │
 * ├─────────────────────┼─────────────────────────┼───────────────────────────────┤
 * │  Capability          │  realised in            │  VS Stage                     │
 * │  Capability          │  enables                │  Activity (process step)      │
 * │  Capability          │  depends on             │  Capability                   │
 * │  Role                │  performs               │  Capability                   │
 * │  Role                │  participates in        │  VS Stage                     │
 * │  Technology          │  supports               │  Capability                   │
 * │  Technology          │  used in                │  VS Stage                     │
 * │  Information         │  consumed at            │  VS Stage                     │
 * │  Information         │  produced at            │  VS Stage                     │
 * │  Process             │  operationalises        │  Capability                   │
 * │  Value Stream        │  triggers               │  Value Stream                 │
 * │  [PPIT compound]     │  decomposes             │  Capability                   │
 * └─────────────────────┴─────────────────────────┴───────────────────────────────┘
 *
 * Note: "stages" in the metamodel maps to `scaffold.elements.activities`
 * (legacy naming in the data model — these ARE value stream stages).
 */
export const CROSS_MAPPING_METAMODEL: readonly RelationshipType[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // Capability → VS Stage (primary use case for imported reference models)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "capability-realised-in-stage",
    from: "capabilities",
    to: "stages",
    label: "realised in",
    inverseLabel: "realises",
    description:
      "A capability is exercised within a value stream stage. " +
      "This is the primary cross-mapping for imported reference models — mapping which capabilities " +
      "are exercised at each value stream stage. Multiple capabilities may be realised in the same stage; " +
      "one capability may appear across stages in different value streams.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
    defaultLevelConstraint: {
      appliesTo: "from",
      allowedLevels: [3, 4],
      label: "Capability Level",
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Capability → Activity (process step — not yet in scaffold as separate class)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "capability-enables-activity",
    from: "capabilities",
    to: "activities",
    label: "enables",
    inverseLabel: "enabled by",
    description:
      "A capability provides the organisational ability that a process activity exercises. " +
      "Activities are steps in a Process — distinct from value stream stages. " +
      "One capability may enable many activities; one activity may require multiple capabilities.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
    defaultLevelConstraint: {
      appliesTo: "from",
      allowedLevels: [3, 4],
      label: "Capability Level",
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Capability self-reference
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "capability-depends-on-capability",
    from: "capabilities",
    to: "capabilities",
    label: "depends on",
    inverseLabel: "depended on by",
    description:
      "A structural dependency between capabilities — one capability requires another to function. " +
      "Transitive: if A depends on B and B depends on C, then A transitively depends on C.",
    semantics: { symmetrical: false, functional: false, transitive: true, cardinality: "many-to-many" },
    defaultLevelConstraint: {
      appliesTo: "from",
      allowedLevels: [3, 4],
      label: "Capability Level",
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Role relationships
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "role-performs-capability",
    from: "roles",
    to: "capabilities",
    label: "performs",
    inverseLabel: "performed by",
    description:
      "A role is accountable for performing a capability. " +
      "Multiple roles may share a capability; one role may perform several capabilities.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
    defaultLevelConstraint: {
      appliesTo: "to",
      allowedLevels: [3, 4],
      label: "Capability Level",
    },
  },
  {
    id: "role-participates-in-stage",
    from: "roles",
    to: "stages",
    label: "participates in",
    inverseLabel: "has participant",
    description:
      "A role actively participates in a value stream stage. " +
      "This captures which stakeholders are involved at each stage of the value stream.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Technology relationships
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "technology-supports-capability",
    from: "technology",
    to: "capabilities",
    label: "supports",
    inverseLabel: "supported by",
    description:
      "A technology system provides tooling that supports a capability. " +
      "One system may support many capabilities; one capability may require multiple systems.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
    defaultLevelConstraint: {
      appliesTo: "to",
      allowedLevels: [3, 4],
      label: "Capability Level",
    },
  },
  {
    id: "technology-used-in-stage",
    from: "technology",
    to: "stages",
    label: "used in",
    inverseLabel: "uses",
    description:
      "A technology system is used at a value stream stage. " +
      "Distinct from 'supports capability' — this is at the value stream flow level.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Information relationships
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "information-consumed-at-stage",
    from: "information",
    to: "stages",
    label: "consumed at",
    inverseLabel: "consumes",
    description:
      "An information asset is read or used as input at a value stream stage. " +
      "One asset may be consumed at many stages; one stage may consume many assets.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
  },
  {
    id: "information-produced-at-stage",
    from: "information",
    to: "stages",
    label: "produced at",
    inverseLabel: "produces",
    description:
      "An information asset is created or updated at a value stream stage. " +
      "One stage may produce many assets; one asset may be produced at multiple stages.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Process relationships
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "process-operationalises-capability",
    from: "processes",
    to: "capabilities",
    label: "operationalises",
    inverseLabel: "operationalised by",
    description:
      "A defined process provides the procedural 'how' for a capability. " +
      "Multiple processes may operationalise different aspects of the same capability.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
    defaultLevelConstraint: {
      appliesTo: "to",
      allowedLevels: [3, 4],
      label: "Capability Level",
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Value Stream relationships
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "value-stream-triggers-value-stream",
    from: "valueStreams",
    to: "valueStreams",
    label: "triggers",
    inverseLabel: "triggered by",
    description:
      "Completion of one value stream triggers the initiation of another. " +
      "Captures cross-VS coupling at the flow level.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PPIT (compound cross-mapping) — decomposes CAPABILITIES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "ppit-decomposition",
    from: "capabilities",
    to: "capabilities",
    label: "PPIT decomposes",
    inverseLabel: "PPIT decomposed into",
    description:
      "Compound mapping: for each Capability, discover the People (roles), " +
      "Process, Information, and Technology that together constitute that capability. " +
      "When a capability is realised in a VS Stage, the PPIT decomposition is contextualised " +
      "by that stage — but PPIT belongs to the Capability, not the Stage.",
    semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "one-to-many" },
    defaultLevelConstraint: {
      appliesTo: "from",
      allowedLevels: [3, 4],
      label: "Capability Level",
    },
    compound: true,
    subRelationshipIds: [
      "role-performs-capability",
      "process-operationalises-capability",
      "technology-supports-capability",
    ],
  },
] as const;

// ─── Lookup helpers ────────────────────────────────────────────────────────

/** Get all non-compound relationship types (individual mappings only) */
export function getSimpleRelationshipTypes(): RelationshipType[] {
  return CROSS_MAPPING_METAMODEL.filter((r) => !r.compound);
}

/** Get all relationship types available for a given source entity */
export function getRelationshipTypesFrom(from: MappableEntity): RelationshipType[] {
  return CROSS_MAPPING_METAMODEL.filter((r) => r.from === from);
}

/** Get all relationship types between a specific source and target entity pair */
export function getRelationshipTypes(from: MappableEntity, to: MappableEntity): RelationshipType[] {
  return CROSS_MAPPING_METAMODEL.filter((r) => r.from === from && r.to === to);
}

/** Find a relationship type by ID */
export function getRelationshipTypeById(id: string): RelationshipType | undefined {
  return CROSS_MAPPING_METAMODEL.find((r) => r.id === id);
}

/**
 * Get all valid target entity types for a given source entity.
 * Returns only those targets where at least one relationship type exists.
 */
export function getValidTargets(from: MappableEntity): MappableEntity[] {
  const targets = new Set<MappableEntity>();
  for (const r of CROSS_MAPPING_METAMODEL) {
    if (r.from === from) targets.add(r.to);
  }
  return [...targets];
}

/**
 * Get all unique (from, to) pairs that have defined relationship types.
 * Useful for populating dropdowns that only show valid combinations.
 */
export function getValidEntityPairs(): { from: MappableEntity; to: MappableEntity }[] {
  const seen = new Set<string>();
  const pairs: { from: MappableEntity; to: MappableEntity }[] = [];
  for (const r of CROSS_MAPPING_METAMODEL) {
    const key = `${r.from}→${r.to}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ from: r.from, to: r.to });
    }
  }
  return pairs;
}
