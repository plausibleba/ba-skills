// ─── Scaffold Graph Index — D-097 Step 1 ─────────────────────────────────────
// In-memory adjacency map computed on scaffold load.
// Materialises cross-references between ALL element types so any view can do
// O(1) lookups like "which activities reference this concept?" or "which
// capabilities does this role participate in?".
//
// Pure function: buildGraphIndex(scaffold) → ScaffoldGraphIndex
// Never mutates the scaffold. Recomputed on every loadScaffold().
//
// DECISION LOG:
// - Session 29: D-097 Step 1 — initial implementation

import type {
  ScaffoldData,
  ScaffoldActivity,
  ScaffoldValueStream,
  ScaffoldCapability,
  ScaffoldConcept,
  ScaffoldInfoObject,
  PPITEntry,
} from "../types";
import { getCapabilityIds } from "../types";

// ── Types ──

/** A single cross-reference edge in the graph */
export interface GraphEdge {
  /** Source element ID */
  sourceId: string;
  /** Source element type (e.g. "Activity", "Capability", "Role") */
  sourceType: string;
  /** Target element ID */
  targetId: string;
  /** Target element type */
  targetType: string;
  /** Relationship label (e.g. "performedBy", "requiresCapability", "referencedIn") */
  relation: string;
}

/** Adjacency map: elementId → all edges involving that element */
export interface ScaffoldGraphIndex {
  /** Forward edges: sourceId → edges[] */
  forward: Map<string, GraphEdge[]>;
  /** Reverse edges: targetId → edges[] */
  reverse: Map<string, GraphEdge[]>;
  /** All edges (flat) */
  edges: GraphEdge[];
  /** Quick lookup: get all edges for an element (both directions) */
  edgesFor: (elementId: string) => GraphEdge[];
  /** Get all related element IDs for an element, optionally filtered by relation or target type */
  relatedIds: (elementId: string, opts?: { relation?: string; targetType?: string }) => string[];
  /** Get all elements of a given type that reference the given element */
  referencedBy: (elementId: string, sourceType: string) => string[];
}

// ── Builder ──

function addEdge(
  forward: Map<string, GraphEdge[]>,
  reverse: Map<string, GraphEdge[]>,
  edges: GraphEdge[],
  edge: GraphEdge,
): void {
  edges.push(edge);
  if (!forward.has(edge.sourceId)) forward.set(edge.sourceId, []);
  forward.get(edge.sourceId)!.push(edge);
  if (!reverse.has(edge.targetId)) reverse.set(edge.targetId, []);
  reverse.get(edge.targetId)!.push(edge);
}

/**
 * Build the graph index from a scaffold.
 * Extracts ALL cross-references between element types:
 *
 * Activity → Role           (performedBy)
 * Activity → Capability     (requiresCapability)
 * Activity → Outcome        (preOutcome, postOutcome)
 * Activity → InformationObj (usesInformationObject)
 * Activity → Control        (governedByControl)
 * Activity → Constraint     (boundByConstraint)
 * Activity → Metric         (measuredBy)
 * Activity → TechnologyApp  (via PPIT)
 * Activity → RecordClass    (transitionsRecord)
 * Activity → AppFunction    (usesAppFunction)
 * ValueStream → Activity    (containsActivity)
 * ValueStream → Role        (accountableStakeholder)
 * Capability → Concept      (governsConcept via businessObject)
 * Concept → Concept         (relatedConcept)
 * Concept → Capability      (anchoredToCapability)
 * Concept → Activity        (anchoredToActivity)
 * InformationObject → Activity (referenced by activity)
 */
export function buildGraphIndex(scaffold: ScaffoldData): ScaffoldGraphIndex {
  const forward = new Map<string, GraphEdge[]>();
  const reverse = new Map<string, GraphEdge[]>();
  const edges: GraphEdge[] = [];

  const els = scaffold.elements;
  if (!els) return emptyIndex();

  const add = (
    sourceId: string,
    sourceType: string,
    targetId: string,
    targetType: string,
    relation: string,
  ) => {
    if (!sourceId || !targetId) return;
    addEdge(forward, reverse, edges, { sourceId, sourceType, targetId, targetType, relation });
  };

  // ── Activity cross-references ──
  for (const [actId, act] of Object.entries(els.activities ?? {})) {
    const a = act as ScaffoldActivity;

    // Activity → Role (performedBy)
    for (const roleId of a.performedByRoleIds ?? []) {
      add(actId, "Activity", roleId, "Role", "performedBy");
    }

    // Activity → Capability (requiresCapability)
    for (const capId of getCapabilityIds(a)) {
      add(actId, "Activity", capId, "Capability", "requiresCapability");
    }

    // Activity → Outcome (preOutcome / postOutcome)
    if (a.preOutcomeId) add(actId, "Activity", a.preOutcomeId, "Outcome", "preOutcome");
    if (a.postOutcomeId) add(actId, "Activity", a.postOutcomeId, "Outcome", "postOutcome");

    // Activity → InformationObject
    for (const ioId of a.informationObjectIds ?? []) {
      add(actId, "Activity", ioId, "InformationObject", "usesInformationObject");
    }

    // Activity → Control
    for (const ctrlId of a.controlIds ?? []) {
      add(actId, "Activity", ctrlId, "Control", "governedByControl");
    }

    // Activity → Constraint
    for (const cId of a.constraintIds ?? []) {
      add(actId, "Activity", cId, "Constraint", "boundByConstraint");
    }

    // Activity → Metric
    for (const mId of a.metricIds ?? []) {
      add(actId, "Activity", mId, "Metric", "measuredBy");
    }

    // Activity → RecordClass (D-053)
    if (a.primaryRecordClassId) {
      add(actId, "Activity", a.primaryRecordClassId, "RecordClass", "transitionsRecord");
    }

    // Activity → ApplicationFunction (D-053)
    for (const afId of a.applicationFunctionIds ?? []) {
      add(actId, "Activity", afId, "ApplicationFunction", "usesAppFunction");
    }

    // Activity → TechnologyApp (via PPIT decomposition)
    if (a.capabilityPPIT) {
      for (const decomp of Object.values(a.capabilityPPIT)) {
        const d = decomp as PPITEntry;
        for (const techId of d.technologyAppIds ?? []) {
          add(actId, "Activity", techId, "TechnologyApp", "usesTechnology");
        }
        // PPIT also references info objects
        for (const ioId of d.informationObjectIds ?? []) {
          add(actId, "Activity", ioId, "InformationObject", "ppitInfoObject");
        }
      }
    }
  }

  // ── ValueStream cross-references ──
  for (const [vsId, vs] of Object.entries(els.valueStreams ?? {})) {
    const v = vs as ScaffoldValueStream;

    // ValueStream → Activity (containsActivity)
    for (const actId of v.activityIds ?? []) {
      add(vsId, "ValueStream", actId, "Activity", "containsActivity");
    }

    // ValueStream → Role (accountableStakeholder)
    if (v.accountableStakeholder) {
      add(vsId, "ValueStream", v.accountableStakeholder, "Role", "accountableStakeholder");
    }
  }

  // ── Capability cross-references ──
  // Build a name→id index for concepts to match businessObject references
  const conceptNameIndex = new Map<string, string>();
  for (const [cId, c] of Object.entries(els.concepts ?? {})) {
    const name = (c as ScaffoldConcept).name?.toLowerCase();
    if (name) conceptNameIndex.set(name, cId);
  }
  // Also index information objects
  for (const [ioId, io] of Object.entries(els.informationObjects ?? {})) {
    const name = (io as ScaffoldInfoObject).name?.toLowerCase();
    if (name) conceptNameIndex.set(name, ioId);
  }

  for (const [capId, cap] of Object.entries(els.capabilities ?? {})) {
    const c = cap as ScaffoldCapability;

    // Capability → parent (hierarchy)
    if (c.parentId) {
      add(capId, "Capability", c.parentId, "Capability", "childOf");
    }

    // Capability → Concept (via businessObject name match)
    if (c.businessObject) {
      const boLower = c.businessObject.toLowerCase();
      const matchedId = conceptNameIndex.get(boLower);
      if (matchedId) {
        add(capId, "Capability", matchedId, "Concept", "governsConcept");
      }
    }
  }

  // ── Concept cross-references ──
  for (const [cId, concept] of Object.entries(els.concepts ?? {})) {
    const c = concept as ScaffoldConcept;

    // Concept → Concept (explicit relationships)
    for (const rel of c.relationships ?? []) {
      if (rel.targetId) {
        add(cId, "Concept", rel.targetId, "Concept", rel.type ?? "relatedTo");
      }
    }

    // Concept → Concept (relatedConceptIds)
    for (const relId of c.relatedConceptIds ?? []) {
      add(cId, "Concept", relId, "Concept", "relatedTo");
    }

    // Concept → Capability (anchorCapabilityIds)
    for (const capId of c.anchorCapabilityIds ?? []) {
      add(cId, "Concept", capId, "Capability", "anchoredToCapability");
    }

    // Concept → Activity (anchorActivityIds)
    for (const actId of c.anchorActivityIds ?? []) {
      add(cId, "Concept", actId, "Activity", "anchoredToActivity");
    }
  }

  // ── Inferred cross-references ──
  // InformationObject ↔ Concept: match by name (many IOs have corresponding concepts)
  for (const [ioId, io] of Object.entries(els.informationObjects ?? {})) {
    const ioName = (io as ScaffoldInfoObject).name?.toLowerCase();
    if (!ioName) continue;
    for (const [cId, concept] of Object.entries(els.concepts ?? {})) {
      const cName = (concept as ScaffoldConcept).name?.toLowerCase();
      if (cName && cName === ioName) {
        add(ioId, "InformationObject", cId, "Concept", "instanceOf");
      }
    }
  }

  // ── Build lookup functions ──
  const edgesFor = (elementId: string): GraphEdge[] => {
    const fwd = forward.get(elementId) ?? [];
    const rev = reverse.get(elementId) ?? [];
    return [...fwd, ...rev];
  };

  const relatedIds = (
    elementId: string,
    opts?: { relation?: string; targetType?: string },
  ): string[] => {
    const all = edgesFor(elementId);
    const ids = new Set<string>();
    for (const e of all) {
      const otherId = e.sourceId === elementId ? e.targetId : e.sourceId;
      const otherType = e.sourceId === elementId ? e.targetType : e.sourceType;
      if (opts?.relation && e.relation !== opts.relation) continue;
      if (opts?.targetType && otherType !== opts.targetType) continue;
      ids.add(otherId);
    }
    return [...ids];
  };

  const referencedBy = (elementId: string, sourceType: string): string[] => {
    const rev = reverse.get(elementId) ?? [];
    const ids = new Set<string>();
    for (const e of rev) {
      if (e.sourceType === sourceType) ids.add(e.sourceId);
    }
    // Also check forward edges where this element is the source
    const fwd = forward.get(elementId) ?? [];
    for (const e of fwd) {
      if (e.targetType === sourceType) ids.add(e.targetId);
    }
    return [...ids];
  };

  console.log(`Graph index: ${edges.length} edges across ${forward.size + reverse.size} element slots`);

  return { forward, reverse, edges, edgesFor, relatedIds, referencedBy };
}

function emptyIndex(): ScaffoldGraphIndex {
  return {
    forward: new Map(),
    reverse: new Map(),
    edges: [],
    edgesFor: () => [],
    relatedIds: () => [],
    referencedBy: () => [],
  };
}
