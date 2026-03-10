import type { CanvasViewModel, TopologyView, TopologyBasis } from "../../types.ts";

// ─── Geometry ────────────────────────────────────────────────────────────────

const COL_WIDTH = 300;   // matches StageColumn w-[300px]
const COL_GAP   = 30;    // FlowChevron ~20px + flex gaps
const CELL      = COL_WIDTH + COL_GAP;
const BASE_ARC  = 35;
const ARC_PER_SPAN = 14;
const NODE_R    = 5;     // anchor dot radius
const SVG_PAD_X = 20;

// ─── Basis styling ───────────────────────────────────────────────────────────

interface BasisStyle {
  color: string;
  dash: string;       // SVG strokeDasharray ("" = solid)
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

// Pick the most interesting (non-adjacency) basis, fallback to first
function primaryBasis(bases: TopologyBasis[]): TopologyBasis {
  const nonAdj = bases.find(b => b !== "outcomeAdjacency");
  return nonAdj ?? bases[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConstraintDAGOverlay({
  columns,
  topologyView,
  bindingActivityIds,
}: {
  columns: CanvasViewModel["columns"];
  topologyView: TopologyView;
  bindingActivityIds: Set<string>;
}) {
  // Map activityId → column index for position lookup
  const activityIndex = new Map<string, number>();
  const vsActivityIds = new Set<string>();
  columns.forEach((col, i) => {
    for (const aId of col.activityIds) {
      activityIndex.set(aId, i);
      vsActivityIds.add(aId);
    }
  });

  // Filter edges to those within this value stream
  const edges = topologyView.edges.filter(
    e => vsActivityIds.has(e.sourceActivityId) && vsActivityIds.has(e.targetActivityId)
  );

  if (edges.length === 0) return null;

  // Compute SVG dimensions
  const svgWidth = columns.length * CELL + SVG_PAD_X * 2;
  const maxSpan = Math.max(...edges.map(e => {
    const si = activityIndex.get(e.sourceActivityId) ?? 0;
    const ti = activityIndex.get(e.targetActivityId) ?? 0;
    return Math.abs(ti - si);
  }));
  const maxArc = BASE_ARC + maxSpan * ARC_PER_SPAN;
  const svgHeight = maxArc + 30; // room for arcs + anchor dots

  // Activity x-position: center of column
  function actX(activityId: string): number {
    const idx = activityIndex.get(activityId) ?? 0;
    return SVG_PAD_X + idx * CELL + COL_WIDTH / 2;
  }

  const anchorY = svgHeight - 8; // bottom of SVG, dots sit here

  // Collect which bases are actually present for the legend
  const activeBases = new Set<TopologyBasis>();
  edges.forEach(e => e.basis.forEach(b => activeBases.add(b)));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block"
        style={{ minWidth: svgWidth }}
      >
        {/* Arrow markers */}
        <defs>
          {Object.entries(BASIS_STYLES).map(([basis, style]) => (
            <marker
              key={basis}
              id={`arrow-${basis}`}
              markerWidth="6"
              markerHeight="4"
              refX="5"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill={style.color} opacity={0.7} />
            </marker>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const x1 = actX(edge.sourceActivityId);
          const x2 = actX(edge.targetActivityId);
          const si = activityIndex.get(edge.sourceActivityId) ?? 0;
          const ti = activityIndex.get(edge.targetActivityId) ?? 0;
          const span = Math.abs(ti - si);
          const arcH = BASE_ARC + span * ARC_PER_SPAN;
          const basis = primaryBasis(edge.basis);
          const style = BASIS_STYLES[basis];

          // Cubic bezier arcing upward
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
              opacity={isBinding ? 0.9 : 0.6}
              markerEnd={`url(#arrow-${basis})`}
            />
          );
        })}

        {/* Anchor dots */}
        {columns.map((col) => {
          const aId = col.activityIds[0];
          if (!aId) return null;
          const x = actX(aId);
          const isBinding = bindingActivityIds.has(aId);

          return (
            <g key={col.columnId}>
              {isBinding && (
                <circle cx={x} cy={anchorY} r={NODE_R + 4} fill="none" stroke="#dc2626" strokeWidth={2} opacity={0.7} />
              )}
              <circle
                cx={x}
                cy={anchorY}
                r={NODE_R}
                fill={isBinding ? "#dc2626" : "#64748b"}
                opacity={0.8}
              />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-5 pb-2 pt-0.5">
        {Array.from(activeBases).map(basis => {
          const style = BASIS_STYLES[basis];
          return (
            <div key={basis} className="flex items-center gap-1.5">
              <svg width="20" height="6">
                <line
                  x1="0" y1="3" x2="20" y2="3"
                  stroke={style.color}
                  strokeWidth={1.5}
                  strokeDasharray={style.dash}
                />
              </svg>
              <span className="text-[9px] text-gray-500">{style.label}</span>
            </div>
          );
        })}
        {bindingActivityIds.size > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14">
              <circle cx="7" cy="7" r="5" fill="none" stroke="#dc2626" strokeWidth={1.5} />
              <circle cx="7" cy="7" r="2.5" fill="#dc2626" />
            </svg>
            <span className="text-[9px] text-gray-500">Binding constraint</span>
          </div>
        )}
      </div>
    </div>
  );
}
