// @ts-nocheck
import type {
  ScaffoldData,
  ScaffoldActivity,
  ScaffoldValueStream,
  HeatmapData,
  NetworkNode,
  NetworkEdge,
} from "../types.ts";

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
    const actIds = vsTyped.activityIds;
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
    (v) => (v as Record<string, unknown>).layoutZone,
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
  // Check if scaffold has layoutZone metadata for two-layer mode
  const hasLayerMeta = scaffold && Object.values(scaffold.elements.valueStreams).some(
    (vs) => (vs as Record<string, unknown>).layoutZone,
  );

  if (hasLayerMeta && scaffold) {
    return _twoLayerLayout(nodeIds, forwardEdges, scaffold);
  }

  // Fallback: DAG-depth layout (original algorithm)
  return _dagDepthLayout(nodeIds, forwardEdges);
}

function _twoLayerLayout(
  nodeIds: string[],
  forwardEdges: NetworkEdge[],
  scaffold: ScaffoldData,
): Map<string, { layer: number; row: number }> {
  const positions = new Map<string, { layer: number; row: number }>();

  // Separate into ecosystem (row 0) and knowledge (row 1) layers
  const ecosystem: string[] = [];
  const knowledge: string[] = [];

  // Define preferred column order within each layer
  const ecosystemOrder = ["Member", "Community", "Partner"];
  const knowledgeOrder = ["Certification", "Knowledge", "Thought"];

  for (const vsId of nodeIds) {
    const vs = scaffold.elements.valueStreams[vsId] as Record<string, unknown>;
    const layer = vs.layoutZone as string;
    if (layer === "ecosystem") {
      ecosystem.push(vsId);
    } else {
      knowledge.push(vsId);
    }
  }

  // Sort within layers by preferred order
  const sortByOrder = (ids: string[], order: string[]) => {
    return ids.sort((a, b) => {
      const vsA = scaffold.elements.valueStreams[a];
      const vsB = scaffold.elements.valueStreams[b];
      const nameA = (vsA as { name?: string })?.name ?? "";
      const nameB = (vsB as { name?: string })?.name ?? "";
      const idxA = order.findIndex((prefix) => nameA.startsWith(prefix));
      const idxB = order.findIndex((prefix) => nameB.startsWith(prefix));
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  };

  sortByOrder(ecosystem, ecosystemOrder);
  sortByOrder(knowledge, knowledgeOrder);

  // Ecosystem = row 0, Knowledge = row 1
  // Columns assigned by position in sorted array
  ecosystem.forEach((id, col) => {
    positions.set(id, { layer: col, row: 0 });
  });
  knowledge.forEach((id, col) => {
    positions.set(id, { layer: col, row: 1 });
  });

  return positions;
}

function _dagDepthLayout(
  nodeIds: string[],
  forwardEdges: NetworkEdge[],
): Map<string, { layer: number; row: number }> {
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

  const positions = new Map<string, { layer: number; row: number }>();
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
      stageCount: vsTyped.activityIds.length,
      frictionCount: heatmap?.observations.length ?? 0,
      hasBindingConstraint: !!heatmap?.bindingConstraint,
      bindingStageName: heatmap?.bindingConstraint?.bindingAnchor
        ? (() => {
            const anchor = heatmap.bindingConstraint.bindingAnchor;
            if (anchor.anchorType === "Activity") {
              const act = scaffold.elements.activities[anchor.anchorId];
              return (act as { name?: string })?.name;
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
