import { useState, useRef, useCallback, useEffect } from "react";
import type { CanvasViewModel, TopologyView, TopologyBasis, TopologyEdge, ScaffoldData, ScaffoldActivity } from "../../types.ts";

// ─── Geometry ────────────────────────────────────────────────────────────────

const NODE_W = 150;
const NODE_H = 40;
const CANVAS_W = 800;
const CANVAS_H = 560;
const CX = CANVAS_W / 2;
const CY = CANVAS_H / 2;
const RADIUS = 210;

// ─── Basis styling ───────────────────────────────────────────────────────────

interface BasisStyle {
  color: string;
  dash: string;
  label: string;
}

const BASIS_STYLES: Record<TopologyBasis, BasisStyle> = {
  outcomeAdjacency:          { color: "#1e40af", dash: "",    label: "Sequential flow" },
  sharedRole:                { color: "#7c3aed", dash: "5,3", label: "Shared role" },
  sharedCapability:          { color: "#0891b2", dash: "5,3", label: "Shared capability" },
  sharedControl:             { color: "#ea580c", dash: "5,3", label: "Shared control" },
  sharedApplicationFunction: { color: "#16a34a", dash: "5,3", label: "Shared application" },
  sharedPrimaryRecord:       { color: "#dc2626", dash: "5,3", label: "Shared record" },
};

function primaryBasis(bases: TopologyBasis[]): TopologyBasis {
  const nonAdj = bases.find(b => b !== "outcomeAdjacency");
  return nonAdj ?? bases[0];
}

// ─── Shared instance resolution ─────────────────────────────────────────────

/** For a given basis, find the specific shared instance names between two activities */
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

// ─── Radial initial positions ────────────────────────────────────────────────

function radialPositions(count: number): { x: number; y: number }[] {
  // Start from top (-π/2), go clockwise
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return {
      x: CX + RADIUS * Math.cos(angle) - NODE_W / 2,
      y: CY + RADIUS * Math.sin(angle) - NODE_H / 2,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConstraintDAGOverlay({
  columns,
  topologyView,
  bindingActivityIds,
  scaffoldData,
  onClose,
}: {
  columns: CanvasViewModel["columns"];
  topologyView: TopologyView;
  bindingActivityIds: Set<string>;
  scaffoldData: ScaffoldData;
  onClose: () => void;
}) {
  // Activity data
  const activityIds = columns.map(col => col.activityIds[0]).filter(Boolean);
  const vsActivitySet = new Set(activityIds);
  const activityIndexMap = new Map(activityIds.map((id, i) => [id, i]));

  // Positions state — radial initial layout
  const [positions, setPositions] = useState(() => radialPositions(activityIds.length));

  // Drag state
  const dragRef = useRef<{
    idx: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter edges to current VS, then deduplicate bidirectional pairs.
  // Shared-resource edges (role, capability, etc.) are symmetric — merge A→B and B→A
  // into a single undirected edge. Only outcomeAdjacency is truly directed.
  const mergedEdges = (() => {
    const vsEdges = topologyView.edges.filter(
      e => vsActivitySet.has(e.sourceActivityId) && vsActivitySet.has(e.targetActivityId)
    );
    const edgeMap = new Map<string, { sourceActivityId: string; targetActivityId: string; basis: TopologyBasis[]; directed: boolean }>();
    for (const e of vsEdges) {
      // Canonical key — always lower-id first for undirected, exact order for directed
      const hasDirected = e.basis.includes("outcomeAdjacency");
      const undirectedBases = e.basis.filter(b => b !== "outcomeAdjacency");
      // Add directed edge (outcomeAdjacency) as-is
      if (hasDirected) {
        const dKey = `d:${e.sourceActivityId}→${e.targetActivityId}`;
        if (!edgeMap.has(dKey)) {
          edgeMap.set(dKey, { sourceActivityId: e.sourceActivityId, targetActivityId: e.targetActivityId, basis: ["outcomeAdjacency"], directed: true });
        }
      }
      // Merge undirected bases into canonical pair
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
          edgeMap.set(uKey, { sourceActivityId: a, targetActivityId: b, basis: [...undirectedBases], directed: false });
        }
      }
    }
    return [...edgeMap.values()];
  })();

  // Collect active bases
  const activeBases = new Set<TopologyBasis>();
  mergedEdges.forEach(e => e.basis.forEach(b => activeBases.add(b)));

  function activityName(actId: string): string {
    return scaffoldData.elements.activities[actId]?.name ?? actId;
  }

  // Node center for edge drawing
  function nodeCenter(idx: number): { x: number; y: number } {
    const pos = positions[idx];
    return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H / 2 };
  }

  // ── Drag handlers ──

  const handlePointerDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      idx,
      startX: e.clientX,
      startY: e.clientY,
      origX: positions[idx].x,
      origY: positions[idx].y,
    };
  }, [positions]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setPositions(prev => {
      const next = [...prev];
      next[drag.idx] = { x: drag.origX + dx, y: drag.origY + dy };
      return next;
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Edge tooltip state
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    edge: TopologyEdge;
  } | null>(null);

  const handleEdgeEnter = useCallback((e: React.PointerEvent, edge: TopologyEdge) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 12,
      edge,
    });
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Activity Constraint Graph</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {mergedEdges.length} coupling edge{mergedEdges.length !== 1 ? "s" : ""} across {activityIds.length} activities
              <span className="ml-2 text-gray-300">·</span>
              <span className="ml-2">Drag nodes to rearrange</span>
            </p>
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

        {/* Graph */}
        <div className="relative flex-1 overflow-auto bg-gray-50/30 p-4">
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
              {Object.entries(BASIS_STYLES).map(([basis, style]) => (
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
            {mergedEdges.map((edge, i) => {
              const si = activityIndexMap.get(edge.sourceActivityId);
              const ti = activityIndexMap.get(edge.targetActivityId);
              if (si === undefined || ti === undefined) return null;
              const src = nodeCenter(si);
              const tgt = nodeCenter(ti);

              const basis = primaryBasis(edge.basis);
              const style = BASIS_STYLES[basis];
              const isBinding =
                bindingActivityIds.has(edge.sourceActivityId) ||
                bindingActivityIds.has(edge.targetActivityId);

              // Quadratic curve through center for some curvature
              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;
              // Offset perpendicular to the line towards center
              const dx = tgt.x - src.x;
              const dy = tgt.y - src.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = -dy / len;
              const ny = dx / len;
              // Pull towards center for curvature
              const toCenterX = CX - midX;
              const toCenterY = CY - midY;
              const dot = nx * toCenterX + ny * toCenterY;
              const curvature = Math.min(len * 0.2, 40) * (dot > 0 ? 1 : -1);
              const cpx = midX + nx * curvature;
              const cpy = midY + ny * curvature;

              // Shorten line to stop at node edge
              const angle = Math.atan2(tgt.y - cpy, tgt.x - cpx);
              const endX = tgt.x - Math.cos(angle) * (NODE_W / 2 + 2);
              const endY = tgt.y - Math.sin(angle) * (NODE_H / 2 + 2);
              const path = `M ${src.x} ${src.y} Q ${cpx} ${cpy}, ${endX} ${endY}`;

              // Build a TopologyEdge-shaped object for the tooltip
              const tooltipEdge: TopologyEdge = {
                sourceActivityId: edge.sourceActivityId,
                targetActivityId: edge.targetActivityId,
                basis: edge.basis,
              };

              return (
                <g key={i}>
                  {/* Invisible wider hit area for hover */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onPointerEnter={ev => handleEdgeEnter(ev, tooltipEdge)}
                    onPointerMove={handleEdgeMove}
                    onPointerLeave={handleEdgeLeave}
                  />
                  {/* Visible edge — arrow only for directed (sequential) edges */}
                  <path
                    d={path}
                    fill="none"
                    stroke={style.color}
                    strokeWidth={isBinding ? 2.5 : 1.5}
                    strokeDasharray={style.dash}
                    opacity={isBinding ? 0.85 : 0.5}
                    markerEnd={edge.directed ? `url(#dag-arrow-${basis})` : undefined}
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              );
            })}

            {/* Activity nodes */}
            {activityIds.map((aId, idx) => {
              const pos = positions[idx];
              const isBinding = bindingActivityIds.has(aId);
              const name = activityName(aId);

              return (
                <g
                  key={aId}
                  style={{ cursor: "grab" }}
                  onPointerDown={e => handlePointerDown(e, idx)}
                >
                  {/* Shadow */}
                  <rect
                    x={pos.x + 1} y={pos.y + 2}
                    width={NODE_W} height={NODE_H}
                    rx={8} ry={8}
                    fill="#0001"
                  />
                  {/* Binding highlight */}
                  {isBinding && (
                    <rect
                      x={pos.x - 3} y={pos.y - 3}
                      width={NODE_W + 6} height={NODE_H + 6}
                      rx={10} ry={10}
                      fill="none" stroke="#dc2626" strokeWidth={2.5} opacity={0.5}
                    />
                  )}
                  {/* Node */}
                  <rect
                    x={pos.x} y={pos.y}
                    width={NODE_W} height={NODE_H}
                    rx={8} ry={8}
                    fill={isBinding ? "#fef2f2" : "white"}
                    stroke={isBinding ? "#fca5a5" : "#cbd5e1"}
                    strokeWidth={1.5}
                  />
                  {/* Stage badge */}
                  <circle
                    cx={pos.x + 16} cy={pos.y + NODE_H / 2}
                    r={10}
                    fill={isBinding ? "#dc2626" : "#64748b"}
                  />
                  <text
                    x={pos.x + 16} y={pos.y + NODE_H / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="white"
                  >
                    {idx + 1}
                  </text>
                  {/* Name */}
                  <foreignObject x={pos.x + 30} y={pos.y + 3} width={NODE_W - 38} height={NODE_H - 6}>
                    <div
                      style={{
                        fontSize: "10.5px",
                        lineHeight: "13px",
                        color: isBinding ? "#991b1b" : "#1e293b",
                        fontWeight: isBinding ? 600 : 500,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        padding: "3px 2px",
                        userSelect: "none",
                        pointerEvents: "none",
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

          {/* Edge tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: "translate(-50%, -100%)",
                maxWidth: 260,
              }}
            >
              <div className="text-[10px] font-semibold text-gray-700 mb-1">
                {activityName(tooltip.edge.sourceActivityId)}
                {tooltip.edge.basis.length === 1 && tooltip.edge.basis[0] === "outcomeAdjacency" ? " → " : " ↔ "}
                {activityName(tooltip.edge.targetActivityId)}
              </div>
              <div className="flex flex-col gap-1">
                {tooltip.edge.basis.map(b => {
                  const s = BASIS_STYLES[b];
                  const instances = resolveSharedInstances(
                    b,
                    tooltip.edge.sourceActivityId,
                    tooltip.edge.targetActivityId,
                    scaffoldData,
                  );
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
          {Array.from(activeBases).map(basis => {
            const style = BASIS_STYLES[basis];
            return (
              <div key={basis} className="flex items-center gap-1.5">
                <svg width="24" height="6">
                  <line
                    x1="0" y1="3" x2="24" y2="3"
                    stroke={style.color}
                    strokeWidth={2}
                    strokeDasharray={style.dash}
                  />
                </svg>
                <span className="text-[10px] font-medium text-gray-500">{style.label}</span>
              </div>
            );
          })}
          {bindingActivityIds.size > 0 && (
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
