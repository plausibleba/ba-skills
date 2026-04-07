import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type {
  CanvasViewModel,
  TopologyView,
  TopologyBasis,
  TopologyEdge,
  ScaffoldData,
  ScaffoldActivity,
  CapabilityInstanceView,
} from "../../types.ts";

// ─── Geometry ────────────────────────────────────────────────────────────────

const NODE_W = 150;
const NODE_H = 40;
const CANVAS_W = 800;
const CANVAS_H = 560;
const CX = CANVAS_W / 2;
const CY = CANVAS_H / 2;
const RADIUS = 210;

// ─── View modes ─────────────────────────────────────────────────────────────

type ViewMode = "stage" | "capability";

// ─── Basis styling (shared across both views) ───────────────────────────────

interface BasisStyle {
  color: string;
  dash: string;
  label: string;
}

const STAGE_BASIS_STYLES: Record<TopologyBasis, BasisStyle> = {
  outcomeAdjacency:          { color: "#1e40af", dash: "",    label: "Sequential flow" },
  sharedRole:                { color: "#7c3aed", dash: "5,3", label: "Shared role" },
  sharedCapability:          { color: "#0891b2", dash: "5,3", label: "Shared capability" },
  sharedControl:             { color: "#ea580c", dash: "5,3", label: "Shared control" },
  sharedApplicationFunction: { color: "#16a34a", dash: "5,3", label: "Shared application" },
  sharedPrimaryRecord:       { color: "#dc2626", dash: "5,3", label: "Shared record" },
  lifecycleAdjacency:        { color: "#059669", dash: "",    label: "Lifecycle flow" },
};

// Capability-level basis types
type CapBasis = "coDeployed" | "sharedRole" | "sharedControl" | "sharedApplicationFunction" | "sharedPrimaryRecord";

const CAP_BASIS_STYLES: Record<CapBasis, BasisStyle> = {
  coDeployed:                { color: "#1e40af", dash: "",    label: "Co-deployed" },
  sharedRole:                { color: "#7c3aed", dash: "5,3", label: "Shared role" },
  sharedControl:             { color: "#ea580c", dash: "5,3", label: "Shared control" },
  sharedApplicationFunction: { color: "#16a34a", dash: "5,3", label: "Shared application" },
  sharedPrimaryRecord:       { color: "#dc2626", dash: "5,3", label: "Shared record" },
};

function primaryBasis<T extends string>(bases: T[], directedBasis?: T): T {
  if (directedBasis) {
    const nonDir = bases.find(b => b !== directedBasis);
    return nonDir ?? bases[0];
  }
  return bases[0];
}

// ─── Shared instance resolution (stage view) ────────────────────────────────

function resolveSharedInstances(
  basis: TopologyBasis,
  srcId: string,
  tgtId: string,
  scaffold: ScaffoldData,
): string[] {
  const acts = scaffold.elements.activities;
  const src = acts[srcId] as ScaffoldActivity | undefined;
  const tgt = acts[tgtId] as ScaffoldActivity | undefined;
  if (!src || !tgt) return [];

  const lookup = (ids: string[], registry: Record<string, unknown> | undefined): string[] =>
    ids.map(id => (registry?.[id] as { name?: string; prefLabel?: string })?.name
      ?? (registry?.[id] as { prefLabel?: string })?.prefLabel
      ?? id);

  const intersect = (a: string[] | undefined, b: string[] | undefined): string[] => {
    if (!a?.length || !b?.length) return [];
    const setB = new Set(b);
    return a.filter(id => setB.has(id));
  };

  switch (basis) {
    case "sharedRole":
      return lookup(intersect(src.performedByRoleIds, tgt.performedByRoleIds), scaffold.elements.roles);
    case "sharedCapability":
      return lookup(intersect(src.requiresCapabilityIds, tgt.requiresCapabilityIds), scaffold.elements.capabilities);
    case "sharedControl":
      return lookup(intersect(src.controlIds, tgt.controlIds), scaffold.elements.controls);
    case "sharedApplicationFunction":
      return lookup(
        intersect(src.applicationFunctionIds, tgt.applicationFunctionIds),
        scaffold.elements.applicationFunctions as Record<string, unknown> | undefined,
      );
    case "sharedPrimaryRecord": {
      if (src.primaryRecordClassId && src.primaryRecordClassId === tgt.primaryRecordClassId) {
        const rc = scaffold.elements.recordClasses?.[src.primaryRecordClassId] as { prefLabel?: string } | undefined;
        return [rc?.prefLabel ?? src.primaryRecordClassId];
      }
      return [];
    }
    case "outcomeAdjacency":
    default:
      return [];
  }
}

// ─── Shared instance resolution (capability view) ───────────────────────────

function resolveCapSharedInstances(
  basis: CapBasis,
  srcCapId: string,
  tgtCapId: string,
  capInstances: CapabilityInstanceView,
  scaffold: ScaffoldData,
): string[] {
  const lookup = (ids: string[], registry: Record<string, unknown> | undefined): string[] =>
    ids.map(id => (registry?.[id] as { name?: string; prefLabel?: string })?.name
      ?? (registry?.[id] as { prefLabel?: string })?.prefLabel
      ?? id);

  const srcInsts = capInstances.instances.filter(i => i.capabilityId === srcCapId);
  const tgtInsts = capInstances.instances.filter(i => i.capabilityId === tgtCapId);

  const srcSet = (field: "roleIds" | "controlIds" | "applicationFunctionIds") =>
    new Set(srcInsts.flatMap(i => i[field] ?? []));

  switch (basis) {
    case "coDeployed": {
      const srcActs = new Set(srcInsts.map(i => i.activityId));
      const shared = tgtInsts.filter(i => srcActs.has(i.activityId)).map(i => i.activityId);
      return [...new Set(shared)].map(aId => scaffold.elements.activities[aId]?.name ?? aId);
    }
    case "sharedRole": {
      const s = srcSet("roleIds");
      const shared = [...new Set(tgtInsts.flatMap(i => i.roleIds ?? []))].filter(id => s.has(id));
      return lookup(shared, scaffold.elements.roles);
    }
    case "sharedControl": {
      const s = srcSet("controlIds");
      const shared = [...new Set(tgtInsts.flatMap(i => i.controlIds ?? []))].filter(id => s.has(id));
      return lookup(shared, scaffold.elements.controls);
    }
    case "sharedApplicationFunction": {
      const s = srcSet("applicationFunctionIds");
      const shared = [...new Set(tgtInsts.flatMap(i => i.applicationFunctionIds ?? []))].filter(id => s.has(id));
      return lookup(shared, scaffold.elements.applicationFunctions as Record<string, unknown> | undefined);
    }
    case "sharedPrimaryRecord": {
      const srcRecs = new Set(srcInsts.map(i => i.primaryRecordClassId).filter(Boolean));
      const shared = [...new Set(tgtInsts.map(i => i.primaryRecordClassId).filter(Boolean))].filter(id => srcRecs.has(id));
      return shared.map(id => {
        const rc = scaffold.elements.recordClasses?.[id] as { prefLabel?: string } | undefined;
        return rc?.prefLabel ?? id;
      });
    }
    default:
      return [];
  }
}

// ─── Build capability graph ─────────────────────────────────────────────────

interface MergedEdge<B extends string> {
  sourceId: string;
  targetId: string;
  basis: B[];
  directed: boolean;
}

function buildCapabilityGraph(
  columns: CanvasViewModel["columns"],
  scaffoldData: ScaffoldData,
  capInstances: CapabilityInstanceView,
): { nodeIds: string[]; nodeNames: Map<string, string>; edges: MergedEdge<CapBasis>[] } {
  const activityIds = columns.map(col => col.activityIds[0]).filter(Boolean);

  // Collect unique capabilities across all stages
  const capSet = new Set<string>();
  for (const aId of activityIds) {
    const act = scaffoldData.elements.activities[aId] as ScaffoldActivity | undefined;
    for (const cId of act?.requiresCapabilityIds ?? []) capSet.add(cId);
  }
  const nodeIds = [...capSet];
  const nodeNames = new Map<string, string>();
  for (const cId of nodeIds) {
    const cap = scaffoldData.elements.capabilities?.[cId] as { name?: string } | undefined;
    nodeNames.set(cId, cap?.name ?? cId);
  }

  // Build edges from capability instances
  const edgeMap = new Map<string, MergedEdge<CapBasis>>();
  const addEdge = (a: string, b: string, basis: CapBasis) => {
    if (a === b) return;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const key = `${lo}↔${hi}`;
    const existing = edgeMap.get(key);
    if (existing) {
      if (!existing.basis.includes(basis)) existing.basis.push(basis);
    } else {
      edgeMap.set(key, { sourceId: lo, targetId: hi, basis: [basis], directed: false });
    }
  };

  // Co-deployed: capabilities sharing an activity
  const activityCaps = new Map<string, string[]>();
  for (const inst of capInstances.instances) {
    if (!activityIds.includes(inst.activityId)) continue;
    const list = activityCaps.get(inst.activityId) ?? [];
    if (!list.includes(inst.capabilityId)) list.push(inst.capabilityId);
    activityCaps.set(inst.activityId, list);
  }
  for (const caps of activityCaps.values()) {
    for (let i = 0; i < caps.length; i++) {
      for (let j = i + 1; j < caps.length; j++) {
        if (capSet.has(caps[i]) && capSet.has(caps[j])) addEdge(caps[i], caps[j], "coDeployed");
      }
    }
  }

  // Shared PPIT resources between capabilities
  const relevantInsts = capInstances.instances.filter(i => capSet.has(i.capabilityId));

  type CapInstField = "roleIds" | "controlIds" | "applicationFunctionIds";
  const buildIndex = (field: CapInstField) => {
    const index = new Map<string, Set<string>>();
    for (const inst of relevantInsts) {
      const ids = inst[field] ?? [];
      for (const id of ids) {
        const set = index.get(id) ?? new Set();
        set.add(inst.capabilityId);
        index.set(id, set);
      }
    }
    return index;
  };

  const sharedFields: Array<{ field: CapInstField; basis: CapBasis }> = [
    { field: "roleIds", basis: "sharedRole" },
    { field: "controlIds", basis: "sharedControl" },
    { field: "applicationFunctionIds", basis: "sharedApplicationFunction" },
  ];

  for (const { field, basis } of sharedFields) {
    for (const caps of buildIndex(field).values()) {
      const arr = [...caps];
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          addEdge(arr[i], arr[j], basis);
        }
      }
    }
  }

  // Shared primary record
  const recIndex = new Map<string, Set<string>>();
  for (const inst of relevantInsts) {
    if (!inst.primaryRecordClassId) continue;
    const set = recIndex.get(inst.primaryRecordClassId) ?? new Set();
    set.add(inst.capabilityId);
    recIndex.set(inst.primaryRecordClassId, set);
  }
  for (const caps of recIndex.values()) {
    const arr = [...caps];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        addEdge(arr[i], arr[j], "sharedPrimaryRecord");
      }
    }
  }

  return { nodeIds, nodeNames, edges: [...edgeMap.values()] };
}

// ─── Radial initial positions ────────────────────────────────────────────────

function radialPositions(count: number): { x: number; y: number }[] {
  const r = count <= 6 ? RADIUS : RADIUS + (count - 6) * 8;
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return {
      x: CX + r * Math.cos(angle) - NODE_W / 2,
      y: CY + r * Math.sin(angle) - NODE_H / 2,
    };
  });
}

// ─── Edge dedup for stage view ──────────────────────────────────────────────

function deduplicateStageEdges(
  edges: TopologyEdge[],
  vsActivitySet: Set<string>,
): MergedEdge<TopologyBasis>[] {
  const vsEdges = edges.filter(
    e => vsActivitySet.has(e.sourceActivityId) && vsActivitySet.has(e.targetActivityId)
  );
  const edgeMap = new Map<string, MergedEdge<TopologyBasis>>();
  for (const e of vsEdges) {
    const hasDirected = e.basis.includes("outcomeAdjacency");
    const undirectedBases = e.basis.filter(b => b !== "outcomeAdjacency");
    if (hasDirected) {
      const dKey = `d:${e.sourceActivityId}→${e.targetActivityId}`;
      if (!edgeMap.has(dKey)) {
        edgeMap.set(dKey, { sourceId: e.sourceActivityId, targetId: e.targetActivityId, basis: ["outcomeAdjacency"], directed: true });
      }
    }
    if (undirectedBases.length > 0) {
      const [a, b] = e.sourceActivityId < e.targetActivityId
        ? [e.sourceActivityId, e.targetActivityId]
        : [e.targetActivityId, e.sourceActivityId];
      const uKey = `u:${a}↔${b}`;
      const existing = edgeMap.get(uKey);
      if (existing) {
        for (const basis of undirectedBases) {
          if (!existing.basis.includes(basis)) existing.basis.push(basis);
        }
      } else {
        edgeMap.set(uKey, { sourceId: a, targetId: b, basis: [...undirectedBases], directed: false });
      }
    }
  }
  return [...edgeMap.values()];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConstraintDAGOverlay({
  columns,
  topologyView,
  bindingActivityIds,
  scaffoldData,
  capabilityInstanceView,
  onClose,
}: {
  columns: CanvasViewModel["columns"];
  topologyView: TopologyView;
  bindingActivityIds: Set<string>;
  scaffoldData: ScaffoldData;
  capabilityInstanceView?: CapabilityInstanceView | null;
  onClose: () => void;
}) {
  // ── View mode ──
  const [viewMode, setViewMode] = useState<ViewMode>("stage");

  // ── Stage data ──
  const activityIds = columns.map(col => col.activityIds[0]).filter(Boolean);
  const vsActivitySet = new Set(activityIds);
  const stageEdges = useMemo(
    () => deduplicateStageEdges(topologyView.edges, vsActivitySet),
    [topologyView.edges, vsActivitySet]
  );

  // ── Capability data ──
  const capGraph = useMemo(() => {
    if (!capabilityInstanceView) return { nodeIds: [], nodeNames: new Map<string, string>(), edges: [] as MergedEdge<CapBasis>[] };
    return buildCapabilityGraph(columns, scaffoldData, capabilityInstanceView);
  }, [columns, scaffoldData, capabilityInstanceView]);

  // ── Active graph data ──
  const isStageView = viewMode === "stage";
  const nodeIds = isStageView ? activityIds : capGraph.nodeIds;
  const nodeIndexMap = useMemo(() => new Map(nodeIds.map((id, i) => [id, i])), [nodeIds]);

  // ── Basis toggle state — per view mode ──
  const [stageBasisToggles, setStageBasisToggles] = useState<Record<TopologyBasis, boolean>>({
    outcomeAdjacency: true, sharedRole: true, sharedCapability: true,
    sharedControl: true, sharedApplicationFunction: true, sharedPrimaryRecord: true,
    lifecycleAdjacency: true,
  });
  const [capBasisToggles, setCapBasisToggles] = useState<Record<CapBasis, boolean>>({
    coDeployed: true, sharedRole: true, sharedControl: true,
    sharedApplicationFunction: true, sharedPrimaryRecord: true,
  });

  // Filter edges by active toggles
  const visibleEdges: MergedEdge<string>[] = useMemo(() => {
    if (isStageView) {
      return stageEdges.filter(e =>
        e.basis.some(b => stageBasisToggles[b as TopologyBasis])
      );
    }
    return capGraph.edges.filter(e =>
      e.basis.some(b => capBasisToggles[b as CapBasis])
    );
  }, [isStageView, stageEdges, capGraph.edges, stageBasisToggles, capBasisToggles]);

  // Active basis styles for current view
  const currentStyles: Record<string, BasisStyle> = isStageView ? STAGE_BASIS_STYLES : CAP_BASIS_STYLES;

  // Collect bases present in visible edges
  const activeBases = useMemo(() => {
    const set = new Set<string>();
    visibleEdges.forEach(e => e.basis.forEach(b => set.add(b)));
    return set;
  }, [visibleEdges]);

  // ── Positions — keyed by viewMode so switching resets layout synchronously ──
  const [stagePositions, setStagePositions] = useState(() => radialPositions(activityIds.length));
  const [capPositions, setCapPositions] = useState(() => radialPositions(capGraph.nodeIds.length));

  // Reset positions when node count changes (e.g. different scaffold)
  const prevStageCount = useRef(activityIds.length);
  const prevCapCount = useRef(capGraph.nodeIds.length);
  if (activityIds.length !== prevStageCount.current) {
    prevStageCount.current = activityIds.length;
    setStagePositions(radialPositions(activityIds.length));
  }
  if (capGraph.nodeIds.length !== prevCapCount.current) {
    prevCapCount.current = capGraph.nodeIds.length;
    setCapPositions(radialPositions(capGraph.nodeIds.length));
  }

  const positions = isStageView ? stagePositions : capPositions;
  const setPositions = isStageView ? setStagePositions : setCapPositions;

  // ── Drag state ──
  const dragRef = useRef<{
    idx: number; startX: number; startY: number; origX: number; origY: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function nodeName(id: string): string {
    if (isStageView) return scaffoldData.elements.activities[id]?.name ?? id;
    return capGraph.nodeNames.get(id) ?? id;
  }

  function nodeCenter(idx: number): { x: number; y: number } {
    const pos = positions[idx];
    return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H / 2 };
  }

  // ── Drag handlers ──
  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { idx, startX: e.clientX, startY: e.clientY, origX: positions[idx].x, origY: positions[idx].y };
  }, [positions]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPositions(prev => {
      const next = [...prev];
      next[drag.idx] = { x: drag.origX + (e.clientX - drag.startX), y: drag.origY + (e.clientY - drag.startY) };
      return next;
    });
  }, []);

  const handlePointerUp = useCallback(() => { dragRef.current = null; }, []);

  // ── Edge tooltip ──
  const [tooltip, setTooltip] = useState<{ x: number; y: number; edge: MergedEdge<string> } | null>(null);

  const handleEdgeEnter = useCallback((e: React.PointerEvent, edge: MergedEdge<string>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 12, edge });
  }, []);

  const handleEdgeMove = useCallback((e: React.PointerEvent) => {
    if (!tooltip) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top - 12 } : null);
  }, [tooltip]);

  const handleEdgeLeave = useCallback(() => setTooltip(null), []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Clear tooltip on view switch
  useEffect(() => { setTooltip(null); }, [viewMode]);

  // ── Render ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        style={{ width: CANVAS_W + 48, maxWidth: "95vw", maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with view mode tabs */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Dependency Graph</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {visibleEdges.length} coupling edge{visibleEdges.length !== 1 ? "s" : ""} across {nodeIds.length} {isStageView ? "stages" : "capabilities"}
                <span className="ml-2 text-gray-300">·</span>
                <span className="ml-2">Drag nodes to rearrange</span>
              </p>
            </div>
            {/* View mode tabs */}
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => setViewMode("stage")}
                className={`rounded-md px-3 py-1 text-[10px] font-medium transition-colors ${
                  isStageView ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                By Stage
              </button>
              <button
                onClick={() => setViewMode("capability")}
                className={`rounded-md px-3 py-1 text-[10px] font-medium transition-colors ${
                  !isStageView ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                By Capability
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Basis toggle toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-50 bg-white px-6 py-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300 mr-1">Filter</span>
          {Object.entries(currentStyles).map(([basis, style]) => {
            const isOn = isStageView
              ? stageBasisToggles[basis as TopologyBasis]
              : capBasisToggles[basis as CapBasis];
            return (
              <button
                key={basis}
                onClick={() => {
                  if (isStageView) {
                    setStageBasisToggles(prev => ({ ...prev, [basis]: !prev[basis as TopologyBasis] }));
                  } else {
                    setCapBasisToggles(prev => ({ ...prev, [basis]: !prev[basis as CapBasis] }));
                  }
                }}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${
                  isOn
                    ? "border-gray-200 bg-white text-gray-600 shadow-sm"
                    : "border-transparent bg-gray-50 text-gray-300"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full transition-opacity"
                  style={{ backgroundColor: style.color, opacity: isOn ? 1 : 0.25 }}
                />
                {style.label}
              </button>
            );
          })}
        </div>

        {/* Graph */}
        <div className="relative flex-1 overflow-auto bg-gray-50/30 p-4">
          {nodeIds.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No {isStageView ? "stages" : "capabilities"} to display
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="block mx-auto"
              style={{ cursor: dragRef.current ? "grabbing" : "default" }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <defs>
                {Object.entries(currentStyles).map(([basis, style]) => (
                  <marker
                    key={basis}
                    id={`dag-arrow-${basis}`}
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill={style.color} opacity={0.8} />
                  </marker>
                ))}
              </defs>

              {/* Edges */}
              {visibleEdges.map((edge, i) => {
                const si = nodeIndexMap.get(edge.sourceId);
                const ti = nodeIndexMap.get(edge.targetId);
                if (si === undefined || ti === undefined) return null;
                const src = nodeCenter(si);
                const tgt = nodeCenter(ti);

                const basis = primaryBasis(edge.basis, isStageView ? "outcomeAdjacency" : undefined);
                const style = currentStyles[basis];
                if (!style) return null;
                const isBinding = isStageView && (
                  bindingActivityIds.has(edge.sourceId) || bindingActivityIds.has(edge.targetId)
                );

                // Quadratic curve with curvature towards center
                const midX = (src.x + tgt.x) / 2;
                const midY = (src.y + tgt.y) / 2;
                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;
                const toCenterX = CX - midX;
                const toCenterY = CY - midY;
                const dot = nx * toCenterX + ny * toCenterY;
                const curvature = Math.min(len * 0.2, 40) * (dot > 0 ? 1 : -1);
                const cpx = midX + nx * curvature;
                const cpy = midY + ny * curvature;

                const angle = Math.atan2(tgt.y - cpy, tgt.x - cpx);
                const endX = tgt.x - Math.cos(angle) * (NODE_W / 2 + 2);
                const endY = tgt.y - Math.sin(angle) * (NODE_H / 2 + 2);
                const path = `M ${src.x} ${src.y} Q ${cpx} ${cpy}, ${endX} ${endY}`;

                return (
                  <g key={i}>
                    <path
                      d={path} fill="none" stroke="transparent" strokeWidth={14}
                      style={{ cursor: "pointer" }}
                      onPointerEnter={ev => handleEdgeEnter(ev, edge)}
                      onPointerMove={handleEdgeMove}
                      onPointerLeave={handleEdgeLeave}
                    />
                    <path
                      d={path} fill="none" stroke={style.color}
                      strokeWidth={isBinding ? 2.5 : 1.5}
                      strokeDasharray={style.dash}
                      opacity={isBinding ? 0.85 : 0.5}
                      markerEnd={edge.directed ? `url(#dag-arrow-${basis})` : undefined}
                      style={{ pointerEvents: "none" }}
                    />
                  </g>
                );
              })}

              {/* Nodes */}
              {nodeIds.map((nId, idx) => {
                const pos = positions[idx];
                if (!pos) return null;
                const isBinding = isStageView && bindingActivityIds.has(nId);
                const name = nodeName(nId);
                const badgeColor = isStageView ? (isBinding ? "#dc2626" : "#64748b") : "#0891b2";

                return (
                  <g key={nId} style={{ cursor: "grab" }} onPointerDown={e => handlePointerDown(e, idx)}>
                    <rect x={pos.x + 1} y={pos.y + 2} width={NODE_W} height={NODE_H} rx={8} ry={8} fill="#0001" />
                    {isBinding && (
                      <rect x={pos.x - 3} y={pos.y - 3} width={NODE_W + 6} height={NODE_H + 6} rx={10} ry={10}
                        fill="none" stroke="#dc2626" strokeWidth={2.5} opacity={0.5} />
                    )}
                    <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H} rx={8} ry={8}
                      fill={isBinding ? "#fef2f2" : "white"} stroke={isBinding ? "#fca5a5" : "#cbd5e1"} strokeWidth={1.5} />
                    <circle cx={pos.x + 16} cy={pos.y + NODE_H / 2} r={10} fill={badgeColor} />
                    <text x={pos.x + 16} y={pos.y + NODE_H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={10} fontWeight={700} fill="white">
                      {isStageView ? idx + 1 : (name[0] ?? "").toUpperCase()}
                    </text>
                    <foreignObject x={pos.x + 30} y={pos.y + 3} width={NODE_W - 38} height={NODE_H - 6}>
                      <div
                        style={{
                          fontSize: "10.5px", lineHeight: "13px",
                          color: isBinding ? "#991b1b" : "#1e293b",
                          fontWeight: isBinding ? 600 : 500,
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                          padding: "3px 2px", userSelect: "none", pointerEvents: "none",
                        }}
                        title={name}
                      >
                        {name}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Edge tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
              style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)", maxWidth: 280 }}
            >
              <div className="text-[10px] font-semibold text-gray-700 mb-1">
                {nodeName(tooltip.edge.sourceId)}
                {tooltip.edge.directed ? " → " : " ↔ "}
                {nodeName(tooltip.edge.targetId)}
              </div>
              <div className="flex flex-col gap-1">
                {tooltip.edge.basis.map(b => {
                  const s = currentStyles[b];
                  if (!s) return null;
                  const instances = isStageView
                    ? resolveSharedInstances(b as TopologyBasis, tooltip.edge.sourceId, tooltip.edge.targetId, scaffoldData)
                    : capabilityInstanceView
                      ? resolveCapSharedInstances(b as CapBasis, tooltip.edge.sourceId, tooltip.edge.targetId, capabilityInstanceView, scaffoldData)
                      : [];
                  return (
                    <div key={b}>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[10px] font-medium text-gray-600">{s.label}</span>
                      </div>
                      {instances.length > 0 && (
                        <div className="ml-3.5 mt-0.5 flex flex-col gap-0">
                          {instances.map((name, ni) => (
                            <span key={ni} className="text-[9px] text-gray-400 leading-tight">{name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 bg-gray-50/80 px-6 py-2.5">
          {Object.entries(currentStyles).map(([basis, style]) => {
            const isOn = isStageView
              ? stageBasisToggles[basis as TopologyBasis]
              : capBasisToggles[basis as CapBasis];
            if (!isOn || !activeBases.has(basis)) return null;
            return (
              <div key={basis} className="flex items-center gap-1.5">
                <svg width="24" height="6">
                  <line x1="0" y1="3" x2="24" y2="3" stroke={style.color} strokeWidth={2} strokeDasharray={style.dash} />
                </svg>
                <span className="text-[10px] font-medium text-gray-500">{style.label}</span>
              </div>
            );
          })}
          {isStageView && bindingActivityIds.size > 0 && (
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16">
                <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke="#dc2626" strokeWidth={1.5} />
                <rect x="4" y="4" width="8" height="8" rx="2" fill="#fca5a5" />
              </svg>
              <span className="text-[10px] font-medium text-gray-500">Binding constraint</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
