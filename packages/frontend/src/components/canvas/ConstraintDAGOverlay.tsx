import type { CanvasViewModel, TopologyView, TopologyBasis, ScaffoldData } from "../../types.ts";

// ─── Geometry ────────────────────────────────────────────────────────────────

const NODE_W    = 140;
const NODE_H    = 36;
const NODE_GAP  = 60;
const CELL      = NODE_W + NODE_GAP;
const BASE_ARC  = 50;
const ARC_PER_SPAN = 18;
const SVG_PAD_X = 40;
const SVG_PAD_TOP = 20;

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

// ─── Modal Component ─────────────────────────────────────────────────────────

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
  // Map activityId → column index
  const activityIndex = new Map<string, number>();
  const vsActivityIds = new Set<string>();
  columns.forEach((col, i) => {
    for (const aId of col.activityIds) {
      activityIndex.set(aId, i);
      vsActivityIds.add(aId);
    }
  });

  // Filter edges to current VS
  const edges = topologyView.edges.filter(
    e => vsActivityIds.has(e.sourceActivityId) && vsActivityIds.has(e.targetActivityId)
  );

  // Compute arc space
  const maxSpan = edges.length > 0
    ? Math.max(...edges.map(e => {
        const si = activityIndex.get(e.sourceActivityId) ?? 0;
        const ti = activityIndex.get(e.targetActivityId) ?? 0;
        return Math.abs(ti - si);
      }))
    : 1;
  const arcSpace = BASE_ARC + maxSpan * ARC_PER_SPAN + SVG_PAD_TOP;

  // SVG dimensions
  const svgWidth = columns.length * CELL + SVG_PAD_X * 2 - NODE_GAP;
  const nodeRowY = arcSpace;
  const svgHeight = nodeRowY + NODE_H + 20;

  function nodeX(idx: number): number {
    return SVG_PAD_X + idx * CELL;
  }
  function nodeCenterX(idx: number): number {
    return nodeX(idx) + NODE_W / 2;
  }
  const anchorY = nodeRowY + 2; // top of node boxes — arcs land here

  // Collect active bases for legend
  const activeBases = new Set<TopologyBasis>();
  edges.forEach(e => e.basis.forEach(b => activeBases.add(b)));

  // Activity names
  function activityName(actId: string): string {
    return scaffoldData.elements.activities[actId]?.name ?? actId;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[95vw] overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Activity Constraint Graph</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {edges.length} coupling edge{edges.length !== 1 ? "s" : ""} across {columns.length} activities
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
        <div className="overflow-auto p-6">
          <svg
            width={svgWidth}
            height={svgHeight}
            className="block"
            style={{ minWidth: svgWidth }}
          >
            <defs>
              {Object.entries(BASIS_STYLES).map(([basis, style]) => (
                <marker
                  key={basis}
                  id={`dag-arrow-${basis}`}
                  markerWidth="7"
                  markerHeight="5"
                  refX="6"
                  refY="2.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 2.5, 0 5" fill={style.color} opacity={0.8} />
                </marker>
              ))}
            </defs>

            {/* Edges — arcs above nodes */}
            {edges.map((edge, i) => {
              const si = activityIndex.get(edge.sourceActivityId) ?? 0;
              const ti = activityIndex.get(edge.targetActivityId) ?? 0;
              const x1 = nodeCenterX(si);
              const x2 = nodeCenterX(ti);
              const span = Math.abs(ti - si);
              const arcH = BASE_ARC + span * ARC_PER_SPAN;
              const basis = primaryBasis(edge.basis);
              const style = BASIS_STYLES[basis];

              const cpY = anchorY - arcH;
              const path = `M ${x1} ${anchorY} C ${x1} ${cpY}, ${x2} ${cpY}, ${x2} ${anchorY}`;

              const isBinding =
                bindingActivityIds.has(edge.sourceActivityId) ||
                bindingActivityIds.has(edge.targetActivityId);

              return (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  stroke={style.color}
                  strokeWidth={isBinding ? 2.5 : 1.5}
                  strokeDasharray={style.dash}
                  opacity={isBinding ? 0.9 : 0.55}
                  markerEnd={`url(#dag-arrow-${basis})`}
                />
              );
            })}

            {/* Activity nodes */}
            {columns.map((col, idx) => {
              const aId = col.activityIds[0];
              if (!aId) return null;
              const x = nodeX(idx);
              const isBinding = bindingActivityIds.has(aId);
              const name = activityName(aId);

              return (
                <g key={col.columnId}>
                  {/* Binding highlight ring */}
                  {isBinding && (
                    <rect
                      x={x - 3} y={nodeRowY - 3}
                      width={NODE_W + 6} height={NODE_H + 6}
                      rx={8} ry={8}
                      fill="none" stroke="#dc2626" strokeWidth={2} opacity={0.6}
                    />
                  )}
                  {/* Node box */}
                  <rect
                    x={x} y={nodeRowY}
                    width={NODE_W} height={NODE_H}
                    rx={6} ry={6}
                    fill={isBinding ? "#fef2f2" : "#f8fafc"}
                    stroke={isBinding ? "#fca5a5" : "#cbd5e1"}
                    strokeWidth={1}
                  />
                  {/* Stage number badge */}
                  <circle
                    cx={x + 14} cy={nodeRowY + NODE_H / 2}
                    r={9}
                    fill={isBinding ? "#dc2626" : "#64748b"}
                    opacity={0.8}
                  />
                  <text
                    x={x + 14} y={nodeRowY + NODE_H / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontWeight={600}
                    fill="white"
                  >
                    {idx + 1}
                  </text>
                  {/* Activity name */}
                  <foreignObject x={x + 28} y={nodeRowY + 2} width={NODE_W - 34} height={NODE_H - 4}>
                    <div
                      style={{
                        fontSize: "10px",
                        lineHeight: "12px",
                        color: isBinding ? "#991b1b" : "#334155",
                        fontWeight: isBinding ? 600 : 500,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        padding: "3px 2px",
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
        </div>

        {/* Legend */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t border-gray-100 bg-gray-50/80 px-6 py-2.5">
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
