import type {
  ScaffoldData,
  ScaffoldActivity,
  ScaffoldValueStream,
  ScaffoldElement,
  ScaffoldConcept,
  ScaffoldInfoObject,
  RecordClass,
  LifecycleState,
  HeatmapData,
  HeatmapVNext,
  NetworkNode,
  NetworkEdge,
  CapabilityInstance,
  CapabilityInstanceView,
  TopologyBasis,
  TopologyNode,
  TopologyEdge,
  TopologyView,
  DiagnosticObservation,
  InterpretiveConclusion,
  Intervention,
} from "../types.ts";
import { getCapabilityIds } from "../types.ts";

function resolveActivityIds(
  vs: ScaffoldValueStream,
  acts: Record<string, ScaffoldActivity>,
): string[] {
  if (Array.isArray(vs.activityIds)) {
    return vs.activityIds;
  }
  const head = vs.activityChainHead;
  if (!head) return [];
  const chain: string[] = [];
  const seen = new Set<string>();
  let current: string | null = head;
  while (current && !seen.has(current) && acts[current]) {
    seen.add(current);
    chain.push(current);
    current = acts[current].nextActivityId ?? null;
  }
  return chain;
}

/* ── Edge Derivation ──────────────────────────────────────────────── */

/**
 * Derive directed edges between value streams by matching
 * terminal outcomes of one VS to entry outcomes of another.
 * Supports secondaryTriggerOutcomeIds at VS level for feedback loops.
 */

export function deriveNetworkEdges(scaffold: ScaffoldData): {
  forwardEdges: NetworkEdge[];
  feedbackEdges: NetworkEdge[];
} {
  const vs = scaffold.elements.valueStreams;
  const acts = scaffold.elements.activities;
  const outcomes = scaffold.elements.outcomes;

  // Map: outcome_id → VS ids that use it as entry
  const entryMap = new Map<string, string[]>();
  // Map: VS id → terminal outcome_id
  const terminalMap = new Map<string, string>();
  // Map: outcome_id → VS ids that produce it (any stage, not just terminal)
  const allPostOutcomes = new Map<string, string[]>();

  for (const [vsId, v] of Object.entries(vs)) {
    const vsTyped = v as ScaffoldValueStream;
    const actIds = resolveActivityIds(vsTyped, acts);
    if (actIds.length === 0) continue;

    const firstAct = acts[actIds[0]] as ScaffoldActivity;
    const lastAct = acts[actIds[actIds.length - 1]] as ScaffoldActivity;

    // Primary entry (from first activity's preOutcome)
    const entries = entryMap.get(firstAct.preOutcomeId) ?? [];
    entries.push(vsId);
    entryMap.set(firstAct.preOutcomeId, entries);

    // Secondary triggers (VS-level governance/feedback triggers)
    for (const altId of vsTyped.secondaryTriggerOutcomeIds ?? []) {
      const altEntries = entryMap.get(altId) ?? [];
      altEntries.push(vsId);
      entryMap.set(altId, altEntries);
    }

    terminalMap.set(vsId, lastAct.postOutcomeId);

    // Also map ALL intermediate post-outcomes for cross-stream matching
    // A VS can produce outputs at any stage that other VS consume
    for (const aid of actIds) {
      const act = acts[aid] as ScaffoldActivity;
      if (act.postOutcomeId) {
        const existing = allPostOutcomes.get(act.postOutcomeId) ?? [];
        existing.push(vsId);
        allPostOutcomes.set(act.postOutcomeId, existing);
      }
    }
  }

  const allEdges: NetworkEdge[] = [];
  const seenEdges = new Set<string>();

  // Match: any VS post-outcome → any VS entry (via entryMap)
  for (const [outcomeId, producerVsIds] of allPostOutcomes) {
    const consumerVsIds = entryMap.get(outcomeId) ?? [];
    for (const srcVsId of producerVsIds) {
      for (const tgtVsId of consumerVsIds) {
        if (srcVsId !== tgtVsId) {
          const edgeKey = `${srcVsId}→${tgtVsId}`;
          if (!seenEdges.has(edgeKey)) {
            seenEdges.add(edgeKey);
            const outcome = outcomes[outcomeId];
            allEdges.push({
              sourceVsId: srcVsId,
              targetVsId: tgtVsId,
              outcomeId: outcomeId,
              outcomeName: (outcome as { name?: string })?.name ?? outcomeId,
              isFeedback: false,
            });
          }
        }
      }
    }
  }

  // In two-layer mode, all edges are semantically justified —
  // skip cycle detection, treat all as forward
  const hasTwoLayers = Object.values(vs).some(
    (v) => v.layoutZone ?? v.zone,
  );
  if (hasTwoLayers) {
    return {
      forwardEdges: allEdges.map((e) => ({ ...e, isFeedback: false })),
      feedbackEdges: [],
    };
  }

  return classifyEdges(allEdges, Object.keys(vs));
}

/* ── Cycle Detection via DFS ──────────────────────────────────────── */

/**
 * Find back-edges using DFS. A back-edge is one where the target
 * is an ancestor of the source in the DFS tree. These are the
 * minimal set of edges to remove to make the graph acyclic.
 */
function findBackEdges(
  nodeIds: string[],
  edges: NetworkEdge[],
): Set<string> {
  const adj = new Map<string, NetworkEdge[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.sourceVsId)!.push(e);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of nodeIds) color.set(id, WHITE);

  const backEdgeKeys = new Set<string>();

  function dfs(u: string) {
    color.set(u, GRAY);
    for (const edge of adj.get(u) ?? []) {
      const v = edge.targetVsId;
      const vColor = color.get(v) ?? WHITE;
      if (vColor === GRAY) {
        // Back-edge: target is ancestor (still being processed)
        backEdgeKeys.add(`${edge.sourceVsId}->${edge.targetVsId}`);
      } else if (vColor === WHITE) {
        dfs(v);
      }
    }
    color.set(u, BLACK);
  }

  // Start DFS from all unvisited nodes
  for (const id of nodeIds) {
    if (color.get(id) === WHITE) {
      dfs(id);
    }
  }

  return backEdgeKeys;
}

/**
 * Classify edges as forward or feedback (back-edges that create cycles).
 */
function classifyEdges(
  edges: NetworkEdge[],
  nodeIds: string[],
): { forwardEdges: NetworkEdge[]; feedbackEdges: NetworkEdge[] } {
  const backEdgeKeys = findBackEdges(nodeIds, edges);

  const forwardEdges: NetworkEdge[] = [];
  const feedbackEdges: NetworkEdge[] = [];

  for (const e of edges) {
    const key = `${e.sourceVsId}->${e.targetVsId}`;
    if (backEdgeKeys.has(key)) {
      feedbackEdges.push({ ...e, isFeedback: true });
    } else {
      forwardEdges.push({ ...e, isFeedback: false });
    }
  }

  return { forwardEdges, feedbackEdges };
}

/* ── Layer & Row Computation ──────────────────────────────────────── */

/**
 * Compute DAG layer (x-position) and row (y-position) for each VS node.
 * Uses longest-path-from-source for layer assignment.
 * Only forward edges are used (feedback edges are excluded).
 */
export function computeNodePositions(
  nodeIds: string[],
  forwardEdges: NetworkEdge[],
  scaffold?: ScaffoldData,
): Map<string, { layer: number; row: number }> {
  // Check if scaffold has layoutZone metadata for layered mode
  const hasLayerMeta = scaffold && Object.values(scaffold.elements.valueStreams).some(
    (vs) => vs.layoutZone ?? vs.zone,
  );

  if (hasLayerMeta && scaffold) {
    return _layeredLayout(nodeIds, forwardEdges, scaffold);
  }

  // Fallback: DAG-depth layout (original algorithm)
  return _dagDepthLayout(nodeIds, forwardEdges);
}

/**
 * Compute a topological ordering index for VS nodes based on forward edges.
 * Uses Kahn's algorithm (BFS). VS with no incoming edges come first (journey start).
 * Returns a Map<vsId, orderIndex> where lower index = earlier in the journey.
 */
function _topologicalOrder(
  nodeIds: string[],
  forwardEdges: NetworkEdge[],
): Map<string, number> {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const id of nodeIds) { adj.set(id, []); inDeg.set(id, 0); }
  for (const e of forwardEdges) {
    adj.get(e.sourceVsId)?.push(e.targetVsId);
    inDeg.set(e.targetVsId, (inDeg.get(e.targetVsId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }

  const order = new Map<string, number>();
  let idx = 0;
  while (queue.length > 0) {
    const n = queue.shift()!;
    order.set(n, idx++);
    for (const t of adj.get(n) ?? []) {
      const d = (inDeg.get(t) ?? 1) - 1;
      inDeg.set(t, d);
      if (d === 0) queue.push(t);
    }
  }

  // Any nodes not reached (cycles) get appended at the end
  for (const id of nodeIds) {
    if (!order.has(id)) order.set(id, idx++);
  }

  return order;
}

/**
 * N-layer layout: groups value streams by their layoutZone into rows.
 * Row order follows the layoutZones array if present, otherwise alphabetical.
 * Within each row, columns are assigned by journey sequence (topological order).
 */
function _layeredLayout(
  nodeIds: string[],
  forwardEdges: NetworkEdge[],
  scaffold: ScaffoldData,
): Map<string, { layer: number; row: number }> {
  const positions = new Map<string, { layer: number; row: number }>();

  // Build a map of zone id → row index from layoutZones (if available)
  const layoutZones = scaffold.layoutZones;
  const zoneRowMap = new Map<string, number>();
  if (layoutZones?.length) {
    for (const z of layoutZones) zoneRowMap.set(z.id, z.row);
  }

  // Group VS ids by their zone
  const buckets = new Map<string, string[]>();
  for (const vsId of nodeIds) {
    const vs = scaffold.elements.valueStreams[vsId];
    const zone = (vs?.layoutZone ?? vs?.zone) || "default";
    if (!buckets.has(zone)) buckets.set(zone, []);
    buckets.get(zone)!.push(vsId);
  }

  // Determine row order: use layoutZones row if available, else discovery order
  const zoneIds = [...buckets.keys()].sort((a, b) => {
    const rowA = zoneRowMap.get(a) ?? 99;
    const rowB = zoneRowMap.get(b) ?? 99;
    return rowA - rowB;
  });

  // Sort VS within each zone by journey sequence (topological order from forward edges)
  // rather than alphabetically — R-006: edge-based ordering
  const topoOrder = _topologicalOrder(nodeIds, forwardEdges);
  for (const [_zone, ids] of buckets) {
    ids.sort((a, b) => {
      const orderA = topoOrder.get(a) ?? 999;
      const orderB = topoOrder.get(b) ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      // Tie-break by name when no edge relationship
      const nameA = ((scaffold.elements.valueStreams[a] as { name?: string })?.name ?? "").toLowerCase();
      const nameB = ((scaffold.elements.valueStreams[b] as { name?: string })?.name ?? "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  // Assign positions: row = zone index, layer (column) = position within zone
  zoneIds.forEach((zone, rowIdx) => {
    const ids = buckets.get(zone) ?? [];
    ids.forEach((id, col) => {
      positions.set(id, { layer: col, row: rowIdx });
    });
  });

  return positions;
}

function _dagDepthLayout(
  nodeIds: string[],
  forwardEdges: NetworkEdge[],
): Map<string, { layer: number; row: number }> {
  const positions = new Map<string, { layer: number; row: number }>();

  // No edges → grid layout (3 columns max) instead of single tall column
  if (forwardEdges.length === 0) {
    const COLS = Math.min(3, nodeIds.length);
    nodeIds.forEach((id, idx) => {
      positions.set(id, { layer: idx % COLS, row: Math.floor(idx / COLS) });
    });
    return positions;
  }

  // Build adjacency from forward edges only
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }
  for (const e of forwardEdges) {
    adj.get(e.sourceVsId)!.push(e.targetVsId);
    inDegree.set(e.targetVsId, (inDegree.get(e.targetVsId) ?? 0) + 1);
  }

  // Longest path via topological BFS
  const dist = new Map<string, number>();
  for (const id of nodeIds) dist.set(id, 0);

  const queue: string[] = [];
  const tempDeg = new Map(inDegree);
  for (const [id, deg] of tempDeg) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const n = queue.shift()!;
    for (const t of adj.get(n) ?? []) {
      dist.set(t, Math.max(dist.get(t) ?? 0, (dist.get(n) ?? 0) + 1));
      const d = (tempDeg.get(t) ?? 1) - 1;
      tempDeg.set(t, d);
      if (d === 0) queue.push(t);
    }
  }

  // Group by layer and assign rows
  const layers = new Map<number, string[]>();
  for (const [id, layer] of dist) {
    const group = layers.get(layer) ?? [];
    group.push(id);
    layers.set(layer, group);
  }

  for (const [layer, ids] of layers) {
    ids.forEach((id, row) => {
      positions.set(id, { layer, row });
    });
  }

  return positions;
}

/* ── Node Construction ────────────────────────────────────────────── */

/**
 * Build NetworkNode objects from scaffold + optional heatmap data.
 */
export function buildNetworkNodes(
  scaffold: ScaffoldData,
  heatmaps: Map<string, HeatmapData>,
  positions: Map<string, { layer: number; row: number }>,
): NetworkNode[] {
  const nodes: NetworkNode[] = [];

  for (const [vsId, vs] of Object.entries(scaffold.elements.valueStreams)) {
    const vsTyped = vs as ScaffoldValueStream;
    const pos = positions.get(vsId) ?? { layer: 0, row: 0 };
    const heatmap = heatmaps.get(vsId);

    nodes.push({
      vsId,
      name: vsTyped.name ?? vsId,
      description: vsTyped.description,
      stageCount: resolveActivityIds(vsTyped, scaffold.elements.activities).length,
      frictionCount: heatmap?.observations.length ?? 0,
      hasBindingConstraint: !!heatmap?.bindingConstraint,
      bindingStageName: heatmap?.bindingConstraint?.bindingAnchor
        ? (() => {
            const anchor = heatmap.bindingConstraint.bindingAnchor;
            if (anchor.anchorType === "Activity") {
              const act = scaffold.elements.activities[anchor.anchorId];
              return act?.name;
            }
            return undefined;
          })()
        : undefined,
      confidence: heatmap?.bindingConstraint?.confidence ?? undefined,
      layer: pos.layer,
      row: pos.row,
    });
  }

  return nodes;
}


/* ── Heatmap Migration (D-050) ────────────────────────────────────── */

/**
 * Migrate a legacy HeatmapData to the three-layer HeatmapVNext shape.
 * Deterministic — same input always produces same output.
 * Rules:
 *  - observations → diagnosticLayer.observations
 *  - bindingConstraint → interpretiveLayer.bindingConstraint
 *  - solutions on observations → interventionLayer.interventions
 */
export function migrateHeatmap(legacy: HeatmapData): HeatmapVNext {
  const diagnosticObservations: DiagnosticObservation[] = legacy.observations.map(obs => ({
    id: obs.observationId,
    type: 'friction' as const,
    anchors: [obs.primaryAnchor.anchorId, ...(obs.contributingAnchors?.map(a => a.anchorId) ?? [])],
    contributingAnchors: obs.contributingAnchors?.map(a => a.anchorId),
    intensity: typeof obs.intensity.score === 'number' ? obs.intensity.score : undefined,
    rationale: obs.rationale,
    confidence: obs.confidence,
    category: obs.category,
  }));

  const interventions: Intervention[] = legacy.observations
    .filter(obs => obs.solutions && obs.solutions.length > 0)
    .flatMap(obs => (obs.solutions ?? []).map((sol, i) => ({
      id: `${obs.observationId}-sol-${i}`,
      sourceObservationId: obs.observationId,
      proposedSolution: sol.description,
      vendorMappings: sol.vendorFeatureRef
        ? [`${sol.vendorFeatureRef.vendorId}:${sol.vendorFeatureRef.featureId}`]
        : undefined,
    })));

  const bindingConstraint: InterpretiveConclusion | undefined = legacy.bindingConstraint
    ? {
        sourceObservationId: legacy.bindingConstraint.bindingAnchorObservationId,
        justification: legacy.bindingConstraint.justification,
        confidence: legacy.bindingConstraint.confidence,
      }
    : undefined;

  return {
    schemaVersion: legacy.schemaVersion,
    heatmapId: legacy.heatmapId,
    scaffoldId: legacy.scaffoldId,
    scaffoldIntegrityHash: legacy.scaffoldIntegrityHash,
    valueStreamId: legacy.valueStreamId,
    createdAt: legacy.createdAt,
    diagnosticLayer: { observations: diagnosticObservations },
    interpretiveLayer: { bindingConstraint },
    interventionLayer: { interventions },
  };
}

/* ── Capability Instance Derivation (D-051) ──────────────────────── */

/** Derive a stable deterministic ID for a CapabilityInstance.
 *  Identity: capabilityId + valueStreamId + activityId (stage excluded). */
function deriveCapabilityInstanceId(
  capabilityId: string,
  valueStreamId: string,
  activityId: string
): string {
  return `ci_${capabilityId}__${valueStreamId}__${activityId}`;
}

/**
 * Derive all CapabilityInstances from a sealed scaffold.
 * One instance per (capabilityId, valueStreamId, activityId) tuple.
 * Pure function — never mutates scaffold. Never stored in scaffold.
 */
export function deriveCapabilityInstances(
  scaffold: ScaffoldData,
  scaffoldIntegrityHash: string
): CapabilityInstanceView {
  const instances: CapabilityInstance[] = [];
  const activities = scaffold.elements.activities ?? {};
  const valueStreams = scaffold.elements.valueStreams ?? {};

  for (const [activityId, activity] of Object.entries(activities)) {
    const actTyped = activity as ScaffoldActivity;
    const capabilityIds = actTyped.enabledByCapabilityIds ?? actTyped.requiresCapabilityIds ?? [];
    const vsId = Object.entries(valueStreams).find(
      ([, vs]) => (vs as ScaffoldValueStream).activityIds?.includes(activityId)
    )?.[0];

    if (!vsId) continue;

    const act = activity as ScaffoldActivity;
    for (const capabilityId of capabilityIds) {
      const id = deriveCapabilityInstanceId(capabilityId, vsId, activityId);
      const capability = scaffold.elements.capabilities?.[capabilityId] as ScaffoldElement | undefined;
      const vs = valueStreams[vsId] as ScaffoldValueStream;

      instances.push({
        id,
        capabilityId,
        valueStreamId: vsId,
        activityId,
        prefLabel: `${vs.name ?? vsId} — ${capability?.name ?? capabilityId}`,
        roleIds: act.performedByRoleIds ?? [],
        controlIds: act.controlIds ?? [],
        applicationFunctionIds: act.applicationFunctionIds ?? [],
        primaryRecordClassId: act.primaryRecordClassId ?? '',
        scaffoldIntegrityHash,
      });
    }
  }

  return {
    scaffoldId: scaffold.scaffoldId,
    scaffoldIntegrityHash,
    instances,
  };
}

/* ── Topology View Derivation (D-052) ────────────────────────────── */

/**
 * Derive the topology interference mesh from a sealed scaffold + capability instances.
 * Pure function — coupling edges based only on constitutionally asserted scaffold fields.
 * Six coupling signals: outcomeAdjacency, sharedRole, sharedCapability,
 * sharedControl, sharedApplicationFunction, sharedPrimaryRecord.
 * Every edge carries explicit basis — no heuristic inference.
 */
export function deriveTopologyView(
  scaffold: ScaffoldData,
  capabilityInstanceView: CapabilityInstanceView,
  scaffoldIntegrityHash: string,
  rulesetVersion: string = 'topology-v1'
): TopologyView {
  const activities = scaffold.elements.activities ?? {};
  const activityList = Object.entries(activities).map(([id, act]) => ({
    ...act,
    id,  // ensure the map key wins over any stale act.id
  }));

  const edgeMap = new Map<string, TopologyEdge>();

  const addEdge = (sourceId: string, targetId: string, basis: TopologyBasis) => {
    if (sourceId === targetId) return;
    const key = `${sourceId}→${targetId}`;
    if (edgeMap.has(key)) {
      const existing = edgeMap.get(key)!;
      if (!existing.basis.includes(basis)) existing.basis.push(basis);
    } else {
      edgeMap.set(key, { sourceActivityId: sourceId, targetActivityId: targetId, basis: [basis] });
    }
  };

  // Signal 1: Outcome adjacency (FSM chain continuity)
  for (const act of activityList) {
    if (act.nextActivityId) {
      addEdge(act.id, act.nextActivityId, 'outcomeAdjacency');
    }
  }

  // Signals 2–4: Shared role, control, application function
  const arrayFields: Array<{ key: keyof ScaffoldActivity; basis: TopologyBasis }> = [
    { key: 'performedByRoleIds', basis: 'sharedRole' },
    { key: 'controlIds', basis: 'sharedControl' },
    { key: 'applicationFunctionIds', basis: 'sharedApplicationFunction' },
  ];

  for (const { key, basis } of arrayFields) {
    const index = new Map<string, string[]>();
    for (const act of activityList) {
      const ids = (act[key] as string[] | undefined) ?? [];
      for (const id of ids) {
        if (!index.has(id)) index.set(id, []);
        index.get(id)!.push(act.id);
      }
    }
    for (const actIds of index.values()) {
      for (let i = 0; i < actIds.length; i++) {
        for (let j = i + 1; j < actIds.length; j++) {
          addEdge(actIds[i], actIds[j], basis);
          addEdge(actIds[j], actIds[i], basis);
        }
      }
    }
  }

  // Signal 5: Shared primary record class
  const recordIndex = new Map<string, string[]>();
  for (const act of activityList) {
    const rcId = act.primaryRecordClassId;
    if (!rcId) continue;
    if (!recordIndex.has(rcId)) recordIndex.set(rcId, []);
    recordIndex.get(rcId)!.push(act.id);
  }
  for (const actIds of recordIndex.values()) {
    for (let i = 0; i < actIds.length; i++) {
      for (let j = i + 1; j < actIds.length; j++) {
        addEdge(actIds[i], actIds[j], 'sharedPrimaryRecord');
        addEdge(actIds[j], actIds[i], 'sharedPrimaryRecord');
      }
    }
  }

  // Signal 6: Capability co-deployment (via CapabilityInstances)
  const capIndex = new Map<string, string[]>();
  for (const inst of capabilityInstanceView.instances) {
    if (!capIndex.has(inst.capabilityId)) capIndex.set(inst.capabilityId, []);
    capIndex.get(inst.capabilityId)!.push(inst.activityId);
  }
  for (const actIds of capIndex.values()) {
    const unique = [...new Set(actIds)];
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        addEdge(unique[i], unique[j], 'sharedCapability');
        addEdge(unique[j], unique[i], 'sharedCapability');
      }
    }
  }

  // Signal 7: Lifecycle adjacency — two activities couple when they operate on
  // the same record class AND transition it through adjacent lifecycle states.
  // This is the R-013 Phase 2 causal flow signal — the relationship IS the
  // semantics (no flags). Directional: earlier state → later state.
  const recordClasses = scaffold.elements.recordClasses ?? {};
  for (const rc of Object.values(recordClasses)) {
    const states = rc.lifecycleStates;
    if (!states || states.length < 2) continue;

    // Build lifecycleStateId → activities index for this record class
    const stateToActs = new Map<string, string[]>();
    for (const act of activityList) {
      if (act.primaryRecordClassId !== rc.id || !act.lifecycleStateId) continue;
      const list = stateToActs.get(act.lifecycleStateId) ?? [];
      list.push(act.id);
      stateToActs.set(act.lifecycleStateId, list);
    }

    // For each pair of adjacent states, create edges between their activities
    for (let i = 0; i < states.length - 1; i++) {
      const fromActs = stateToActs.get(states[i].id) ?? [];
      const toActs = stateToActs.get(states[i + 1].id) ?? [];
      for (const fromId of fromActs) {
        for (const toId of toActs) {
          if (fromId !== toId) {
            addEdge(fromId, toId, 'lifecycleAdjacency');
          }
        }
      }
    }
  }

  // Build node list from all activities that appear in edges
  const valueStreams = scaffold.elements.valueStreams ?? {};
  const activityVsMap = new Map<string, string>();
  for (const [vsId, vs] of Object.entries(valueStreams)) {
    for (const actId of (vs as ScaffoldValueStream).activityIds ?? []) {
      activityVsMap.set(actId, vsId);
    }
  }

  const nodeIds = new Set<string>();
  for (const edge of edgeMap.values()) {
    nodeIds.add(edge.sourceActivityId);
    nodeIds.add(edge.targetActivityId);
  }

  const nodes: TopologyNode[] = [...nodeIds].map(activityId => ({
    activityId,
    valueStreamId: activityVsMap.get(activityId) ?? '',
  }));

  const ciHash = `ci-hash-${capabilityInstanceView.instances.length}-${capabilityInstanceView.scaffoldIntegrityHash}`;

  return {
    sourceScaffoldHash: scaffoldIntegrityHash,
    derivationRulesetVersion: rulesetVersion,
    capabilityInstanceHash: ciHash,
    derivedAt: new Date().toISOString(),
    nodes,
    edges: [...edgeMap.values()],
  };
}

/* ── R-013: Record-Lifecycle Coupling ─────────────────────────────
   Deterministic derivation that populates:
   1. scaffold.elements.recordClasses — from concepts of type "Record"
   2. activity.primaryRecordClassId — inferred from information object
      references, capability businessObject, and concept relationships

   Pure function that MUTATES the scaffold (called once during loadScaffold
   normalisation, before topology derivation reads these fields).

   Algorithm:
   a) Build recordClasses from Record-type concepts
   b) Build name→recordClassId index for fuzzy matching
   c) For each activity, find its primary record class via:
      - Direct: activity.informationObjectIds → IO name matches a RecordClass
      - Indirect: capability.businessObject → matches a RecordClass name
      - PPIT: capabilityPPIT.informationObjectIds → same IO→RecordClass path
   d) Tie-break: if multiple candidates, pick the one with the most references
   ──────────────────────────────────────────────────────────────── */

export function deriveRecordLifecycleCoupling(scaffold: ScaffoldData): {
  recordClassesAdded: number;
  activitiesLinked: number;
} {
  const els = scaffold.elements;
  if (!els) return { recordClassesAdded: 0, activitiesLinked: 0 };

  // ── Step 1: Build recordClasses from Record-type concepts ──
  const recordClasses: Record<string, RecordClass> = { ...(els.recordClasses ?? {}) };
  const concepts = els.concepts ?? {};
  const informationObjects = els.informationObjects ?? {};

  for (const [cId, concept] of Object.entries(concepts)) {
    const c = concept as ScaffoldConcept;
    if (c.type === "Record" && !recordClasses[cId]) {
      recordClasses[cId] = {
        id: cId,
        prefLabel: c.name ?? cId,
        description: c.definition ?? c.description,
      };
    }
  }

  // Also promote key information objects to record classes if they look like records
  // (referenced by 2+ activities or name matches common record patterns)
  const RECORD_PATTERNS = /order|invoice|contract|application|request|record|report|plan|schedule|profile|account|claim|ticket|brief|quote|payment/i;
  const ioRefCount: Record<string, number> = {};
  for (const act of Object.values(els.activities ?? {})) {
    for (const ioId of (act as ScaffoldActivity).informationObjectIds ?? []) {
      ioRefCount[ioId] = (ioRefCount[ioId] ?? 0) + 1;
    }
  }
  for (const [ioId, io] of Object.entries(informationObjects)) {
    const ioObj = io as ScaffoldInfoObject;
    const isKeyRecord = (ioRefCount[ioId] ?? 0) >= 2 || RECORD_PATTERNS.test(ioObj.name ?? "");
    if (isKeyRecord && !recordClasses[ioId]) {
      recordClasses[ioId] = {
        id: ioId,
        prefLabel: ioObj.name ?? ioId,
        description: ioObj.description,
      };
    }
  }

  const recordClassesAdded = Object.keys(recordClasses).length - Object.keys(els.recordClasses ?? {}).length;
  els.recordClasses = recordClasses;

  // ── Step 2: Build name→recordClassId index ──
  const nameToRcId = new Map<string, string>();
  for (const [rcId, rc] of Object.entries(recordClasses)) {
    nameToRcId.set(rc.prefLabel.toLowerCase(), rcId);
  }

  // ── Step 3: Assign primaryRecordClassId to activities ──
  let activitiesLinked = 0;
  const capabilities = els.capabilities ?? {};

  for (const [, activity] of Object.entries(els.activities ?? {})) {
    const act = activity as ScaffoldActivity;
    if (act.primaryRecordClassId) continue; // Already set — don't override

    const candidates = new Map<string, number>(); // rcId → score

    // 3a. Direct: information object IDs → match to record class
    for (const ioId of act.informationObjectIds ?? []) {
      if (recordClasses[ioId]) {
        candidates.set(ioId, (candidates.get(ioId) ?? 0) + 3); // Strong signal
      } else {
        // Try name match
        const ioName = (informationObjects[ioId] as ScaffoldInfoObject | undefined)?.name?.toLowerCase();
        if (ioName) {
          const matchId = nameToRcId.get(ioName);
          if (matchId) candidates.set(matchId, (candidates.get(matchId) ?? 0) + 2);
        }
      }
    }

    // 3b. Capability businessObject → match to record class name
    for (const capId of getCapabilityIds(act)) {
      const cap = capabilities[capId];
      if (!cap) continue;
      const bo = cap.businessObject?.toLowerCase();
      if (bo) {
        const matchId = nameToRcId.get(bo);
        if (matchId) candidates.set(matchId, (candidates.get(matchId) ?? 0) + 2);
      }
    }

    // 3c. PPIT information objects
    if (act.capabilityPPIT) {
      for (const decomp of Object.values(act.capabilityPPIT)) {
        for (const ioId of decomp.informationObjectIds ?? []) {
          if (recordClasses[ioId]) {
            candidates.set(ioId, (candidates.get(ioId) ?? 0) + 1);
          } else {
            const ioName = (informationObjects[ioId] as ScaffoldInfoObject | undefined)?.name?.toLowerCase();
            if (ioName) {
              const matchId = nameToRcId.get(ioName);
              if (matchId) candidates.set(matchId, (candidates.get(matchId) ?? 0) + 1);
            }
          }
        }
      }
    }

    // Tie-break: highest score wins
    if (candidates.size > 0) {
      let bestId = "";
      let bestScore = 0;
      for (const [rcId, score] of candidates) {
        if (score > bestScore) { bestId = rcId; bestScore = score; }
      }
      if (bestId) {
        act.primaryRecordClassId = bestId;
        activitiesLinked++;
      }
    }
  }

  // ── Step 4: Derive lifecycle states per record class ──
  // For each record class, walk the activities that reference it (in stage order)
  // and extract unique postOutcomeId transitions as ordered lifecycle states.
  // The outcome label becomes the lifecycle state label.
  const outcomes = els.outcomes ?? {};
  const valueStreams = els.valueStreams ?? {};

  // Group activities by recordClassId, preserving value-stream stage order
  const rcActivities = new Map<string, ScaffoldActivity[]>();
  for (const [, vsRaw] of Object.entries(valueStreams)) {
    const vs = vsRaw as ScaffoldValueStream;
    const actIds = vs.activityIds ?? [];
    for (const actId of actIds) {
      const act = (els.activities ?? {})[actId] as ScaffoldActivity | undefined;
      if (!act?.primaryRecordClassId) continue;
      const list = rcActivities.get(act.primaryRecordClassId) ?? [];
      list.push(act);
      rcActivities.set(act.primaryRecordClassId, list);
    }
  }

  let lifecycleStatesBuilt = 0;
  let activitiesWithLifecycleState = 0;

  for (const [rcId, acts] of rcActivities) {
    const rc = recordClasses[rcId];
    if (!rc) continue;

    // Build ordered lifecycle states from postOutcomeIds (preserving stage order)
    const seenOutcomes = new Set<string>();
    const states: LifecycleState[] = [];

    // Also include the first activity's preOutcomeId as the initial state
    if (acts.length > 0 && acts[0].preOutcomeId && !seenOutcomes.has(acts[0].preOutcomeId)) {
      const outcome = outcomes[acts[0].preOutcomeId] as ScaffoldElement | undefined;
      const label = outcome?.name ?? acts[0].preOutcomeId;
      states.push({
        id: `ls_${rcId}_${states.length}`,
        label,
        ordinal: states.length,
        position: "initial",
        outcomeId: acts[0].preOutcomeId,
      });
      seenOutcomes.add(acts[0].preOutcomeId);
    }

    for (const act of acts) {
      if (!act.postOutcomeId || seenOutcomes.has(act.postOutcomeId)) continue;
      const outcome = outcomes[act.postOutcomeId] as ScaffoldElement | undefined;
      const label = outcome?.name ?? act.postOutcomeId;
      states.push({
        id: `ls_${rcId}_${states.length}`,
        label,
        ordinal: states.length,
        position: "intermediate", // will be corrected to "terminal" below
        outcomeId: act.postOutcomeId,
      });
      seenOutcomes.add(act.postOutcomeId);
    }

    // Mark the last state as terminal
    if (states.length >= 2) {
      states[states.length - 1].position = "terminal";
      // Wire sequential transitions
      for (let i = 0; i < states.length - 1; i++) {
        states[i].transitionsTo = [states[i + 1].id];
      }
      rc.lifecycleStates = states;
      lifecycleStatesBuilt += states.length;
    }
  }

  // ── Step 5: Assign lifecycleStateId to activities ──
  // Map each activity's postOutcomeId to the corresponding lifecycle state,
  // scoped by record class — the same outcomeId can appear in multiple
  // record classes, so a global map would cause cross-contamination.
  const rcOutcomeToState = new Map<string, Map<string, string>>(); // rcId → (outcomeId → lifecycleStateId)
  for (const [rcId, rc] of Object.entries(recordClasses)) {
    const inner = new Map<string, string>();
    for (const ls of rc.lifecycleStates ?? []) {
      if (ls.outcomeId) {
        inner.set(ls.outcomeId, ls.id);
      }
    }
    if (inner.size > 0) rcOutcomeToState.set(rcId, inner);
  }

  for (const activity of Object.values(els.activities ?? {})) {
    const act = activity as ScaffoldActivity;
    if (!act.primaryRecordClassId || !act.postOutcomeId) continue;
    const inner = rcOutcomeToState.get(act.primaryRecordClassId);
    const lsId = inner?.get(act.postOutcomeId);
    if (lsId) {
      act.lifecycleStateId = lsId;
      activitiesWithLifecycleState++;
    }
  }

  if (recordClassesAdded > 0 || activitiesLinked > 0 || lifecycleStatesBuilt > 0) {
    console.log(
      `R-013: ${recordClassesAdded} record classes, ${activitiesLinked} activities linked, ` +
      `${lifecycleStatesBuilt} lifecycle states, ${activitiesWithLifecycleState} activities with lifecycle state`
    );
  }

  return { recordClassesAdded, activitiesLinked };
}
