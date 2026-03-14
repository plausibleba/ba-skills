// @ts-nocheck
import { useMemo, useState, useRef, useCallback } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { NetworkNode, NetworkEdge, HeatmapData } from "../types.ts";

/* ── Layout Constants ──────────────────────────────────────────────── */

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const LAYER_GAP = 140;
const ROW_GAP = 50;
const PADDING_X = 100;
const PADDING_Y = 220;  // Extra top space for zone labels and tooltips above nodes

/* ── Compute pixel positions from layer/row ────────────────────────── */

function useNodePositions(nodes: NetworkNode[]) {
  return useMemo(() => {
    if (nodes.length === 0) return { positions: new Map(), canvasWidth: 0, canvasHeight: 0 };

    // Detect two-layer mode: nodes use row for Y-zone (0=ecosystem, 1=knowledge)
    const hasRow0 = nodes.some((n) => n.row === 0);
    const hasRow1 = nodes.some((n) => n.row === 1);
    const twoLayerMode = hasRow0 && hasRow1;

    const positions = new Map<string, { x: number; y: number }>();

    if (twoLayerMode) {
      const ZONE_GAP = 80;    // vertical gap between ecosystem and knowledge zones
      const WRAP_GAP = 40;    // vertical gap between wrapped rows within a zone
      const COLS = 4;         // max nodes per row within a zone

      const zone0 = nodes.filter((n) => n.row === 0);
      const zone1 = nodes.filter((n) => n.row === 1);
      zone0.sort((a, b) => a.layer - b.layer);
      zone1.sort((a, b) => a.layer - b.layer);

      // Split a zone's nodes into wrapped rows of COLS
      function chunkZone(zoneNodes: NetworkNode[]) {
        const rows: NetworkNode[][] = [];
        for (let i = 0; i < zoneNodes.length; i += COLS) {
          rows.push(zoneNodes.slice(i, i + COLS));
        }
        return rows;
      }

      const zone0Rows = chunkZone(zone0);
      const zone1Rows = chunkZone(zone1);

      // Width = widest row across both zones
      const rowWidth = (count: number) => count * NODE_WIDTH + (count - 1) * LAYER_GAP;
      const maxCols = Math.min(COLS, Math.max(zone0.length, zone1.length));
      const totalWidth = rowWidth(maxCols);

      // Place a zone's rows starting at yStart, return next yStart
      function placeZone(zoneRows: NetworkNode[][], yStart: number) {
        zoneRows.forEach((row, rowIdx) => {
          const rw = rowWidth(row.length);
          const xOffset = (totalWidth - rw) / 2;
          row.forEach((node, colIdx) => {
            positions.set(node.vsId, {
              x: PADDING_X + xOffset + colIdx * (NODE_WIDTH + LAYER_GAP),
              y: yStart + rowIdx * (NODE_HEIGHT + WRAP_GAP),
            });
          });
        });
        return yStart + zone0Rows.length * (NODE_HEIGHT + WRAP_GAP) - WRAP_GAP;
      }

      const zone0Bottom = placeZone(zone0Rows, PADDING_Y);
      placeZone(zone1Rows, zone0Bottom + ZONE_GAP);

      const zone1RowCount = zone1Rows.length;
      const canvasWidth = PADDING_X * 2 + totalWidth;
      const BOTTOM_LABEL_SPACE = 32; // room for zone label below bottom box
      const canvasHeight = PADDING_Y * 2
        + zone0Rows.length * (NODE_HEIGHT + WRAP_GAP) - WRAP_GAP
        + ZONE_GAP
        + zone1RowCount * (NODE_HEIGHT + WRAP_GAP) - WRAP_GAP
        + BOTTOM_LABEL_SPACE;

      return { positions, canvasWidth, canvasHeight };
    }

    // Fallback: original DAG layout (layer = X column, row = Y position)
    const layers = new Map<number, NetworkNode[]>();
    for (const n of nodes) {
      const group = layers.get(n.layer) ?? [];
      group.push(n);
      layers.set(n.layer, group);
    }

    const maxRows = Math.max(...[...layers.values()].map((g) => g.length), 1);
    const totalHeight = maxRows * NODE_HEIGHT + (maxRows - 1) * ROW_GAP;

    for (const [layer, group] of layers) {
      const groupHeight = group.length * NODE_HEIGHT + (group.length - 1) * ROW_GAP;
      const yOffset = (totalHeight - groupHeight) / 2;

      group.forEach((node, rowIdx) => {
        positions.set(node.vsId, {
          x: PADDING_X + layer * (NODE_WIDTH + LAYER_GAP),
          y: PADDING_Y + yOffset + rowIdx * (NODE_HEIGHT + ROW_GAP),
        });
      });
    }

    const maxLayer = Math.max(...nodes.map((n) => n.layer), 0);
    const canvasWidth = PADDING_X * 2 + (maxLayer + 1) * NODE_WIDTH + maxLayer * LAYER_GAP;
    const canvasHeight = PADDING_Y * 2 + totalHeight;

    return { positions, canvasWidth, canvasHeight };
  }, [nodes]);
}

/* ── Edge Paths ────────────────────────────────────────────────────── */

function ForwardEdge({
  edge,
  positions,
  isDashed,
}: {
  edge: NetworkEdge;
  positions: Map<string, { x: number; y: number }>;
  isDashed: boolean;
}) {
  const src = positions.get(edge.sourceVsId);
  const tgt = positions.get(edge.targetVsId);
  if (!src || !tgt) return null;

  // Determine connection points based on relative position
  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let x1: number, y1: number, x2: number, y2: number;

  if (absDy > absDx * 0.5) {
    // Primarily vertical: connect top/bottom
    if (dy > 0) {
      x1 = src.x + NODE_WIDTH / 2;
      y1 = src.y + NODE_HEIGHT;
      x2 = tgt.x + NODE_WIDTH / 2;
      y2 = tgt.y;
    } else {
      x1 = src.x + NODE_WIDTH / 2;
      y1 = src.y;
      x2 = tgt.x + NODE_WIDTH / 2;
      y2 = tgt.y + NODE_HEIGHT;
    }
  } else {
    // Primarily horizontal: connect left/right
    if (dx > 0) {
      x1 = src.x + NODE_WIDTH;
      y1 = src.y + NODE_HEIGHT / 2;
      x2 = tgt.x;
      y2 = tgt.y + NODE_HEIGHT / 2;
    } else {
      x1 = src.x;
      y1 = src.y + NODE_HEIGHT / 2;
      x2 = tgt.x + NODE_WIDTH;
      y2 = tgt.y + NODE_HEIGHT / 2;
    }
  }

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const path = absDy > absDx * 0.5
    ? `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
    : `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  return (
    <path
      d={path}
      fill="none"
      stroke="#4a9eda"
      strokeWidth={1.5}
      opacity={0.4}
      strokeDasharray={isDashed ? "6 3" : undefined}
      markerEnd="url(#arrowForward)"
    />
  );
}

function FeedbackEdge({
  edge,
  positions,
}: {
  edge: NetworkEdge;
  positions: Map<string, { x: number; y: number }>;
}) {
  const src = positions.get(edge.sourceVsId);
  const tgt = positions.get(edge.targetVsId);
  if (!src || !tgt) return null;

  // Feedback edges: dashed, curve around nodes
  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let x1: number, y1: number, x2: number, y2: number;
  let path: string;

  if (absDy > absDx * 0.5) {
    // Vertical feedback: use side connections and curve outward
    x1 = dx > 0 ? src.x + NODE_WIDTH : src.x;
    y1 = src.y + NODE_HEIGHT / 2;
    x2 = dx > 0 ? tgt.x : tgt.x + NODE_WIDTH;
    y2 = tgt.y + NODE_HEIGHT / 2;
    const offsetX = dx > 0 ? 60 : -60;
    path = `M ${x1} ${y1} C ${x1 + offsetX} ${y1}, ${x2 + offsetX} ${y2}, ${x2} ${y2}`;
  } else {
    // Horizontal feedback: curve below/above
    x1 = src.x + NODE_WIDTH / 2;
    y1 = dy >= 0 ? src.y : src.y + NODE_HEIGHT;
    x2 = tgt.x + NODE_WIDTH / 2;
    y2 = dy >= 0 ? tgt.y : tgt.y + NODE_HEIGHT;
    const offsetY = dy >= 0 ? -60 : 60;
    path = `M ${x1} ${y1} C ${x1} ${y1 + offsetY}, ${x2} ${y2 + offsetY}, ${x2} ${y2}`;
  }

  return (
    <path
      d={path}
      fill="none"
      stroke="#4a9eda"
      strokeWidth={1.5}
      strokeDasharray="8 5"
      opacity={0.2}
      markerEnd="url(#arrowFeedback)"
    />
  );
}

/* ── Network Node ──────────────────────────────────────────────────── */

function NetworkNodeCard({
  node,
  position,
  isHovered,
  onHover,
  onLeave,
  onClick,
  couplingCount = 0,
}: {
  node: NetworkNode;
  position: { x: number; y: number };
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  couplingCount?: number;
}) {
  // Visual encoding hierarchy (Reviewer spec):
  // 1. Position (layout)  2. Title  3. Edge direction
  // 4. Binding border  5. Friction tint  6. Small friction badge

  // Friction level: 3-state
  const frictionLevel =
    node.frictionCount >= 5 ? "High"
    : node.frictionCount >= 2 ? "Medium"
    : node.frictionCount > 0 ? "Low"
    : null;

  // Border: binding > friction > neutral
  const borderStyle = node.hasBindingConstraint
    ? { borderColor: "rgba(239,68,68,0.4)" }
    : frictionLevel === "High" ? { borderColor: "rgba(245,158,11,0.4)" }
    : frictionLevel === "Medium" ? { borderColor: "rgba(245,158,11,0.25)" }
    : { borderColor: "#2e3f5c" };

  // Background tint: very subtle
  const bgStyle = node.hasBindingConstraint
    ? { background: "rgba(239,68,68,0.08)" }
    : frictionLevel === "High" ? { background: "rgba(245,158,11,0.08)" }
    : frictionLevel === "Medium" ? { background: "rgba(245,158,11,0.05)" }
    : { background: "#243352" };

  // Heat badge colours
  const badgeStyle =
    frictionLevel === "High" ? { background: "rgba(239,68,68,0.15)", color: "#f87171" }
    : frictionLevel === "Medium" ? { background: "rgba(245,158,11,0.15)", color: "#fbbf24" }
    : frictionLevel === "Low" ? { background: "rgba(234,179,8,0.15)", color: "#facc15" }
    : {};

  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={NODE_WIDTH}
      height={NODE_HEIGHT}
    >
      <div
        onClick={onClick}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        className={`relative flex h-full cursor-pointer flex-col justify-between rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
          isHovered ? "ring-2 ring-blue-400/50 ring-offset-1" : ""
        }`}
        style={{ ...borderStyle, ...bgStyle, fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        {/* Heat badge — top right, quiet */}
        {frictionLevel && (
          <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={badgeStyle}>
            {frictionLevel}
          </span>
        )}

        {/* Title — the hero */}
        <div>
          <h3 className="text-[15px] font-bold leading-snug text-white pr-12">
            {node.name}
          </h3>
          {node.description && (
            <p className="mt-0.5 text-[11px] leading-snug line-clamp-1" style={{ color: "#94a3b8" }}>
              {node.description}
            </p>
          )}
        </div>

        {/* Bottom: stage count + binding + coupling indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "#94a3b8" }}>
            {node.stageCount} stages
          </span>

          {couplingCount > 0 && (
            <>
              <div className="h-3 w-px" style={{ background: "#2e3f5c" }} />
              <span className="text-[10px] text-indigo-300" title="Value streams coupled via shared roles, controls, application functions, or record classes">
                {couplingCount} coupled
              </span>
            </>
          )}

          {node.hasBindingConstraint && (
            <>
              <div className="h-3 w-px" style={{ background: "#2e3f5c" }} />
              <span className="text-[10px] font-medium text-red-400">
                Constrained
              </span>
            </>
          )}
        </div>
      </div>
    </foreignObject>
  );
}

/* ── Tooltip ───────────────────────────────────────────────────────── */

function NodeTooltip({
  node,
  position,
  canvasHeight,
  couplingCount = 0,
}: {
  node: NetworkNode;
  position: { x: number; y: number };
  canvasHeight: number;
  couplingCount?: number;
}) {
  const tooltipWidth = 280;
  // Center horizontally on node
  const x = position.x + (NODE_WIDTH - tooltipWidth) / 2;

  // If node is in the top half, show tooltip below; otherwise above
  const midCanvas = canvasHeight / 2;
  const nodeCenter = position.y + NODE_HEIGHT / 2;
  const gap = 14;

  const showBelow = nodeCenter >= midCanvas;
  const y = showBelow
    ? position.y + NODE_HEIGHT + gap
    : position.y - gap;

  return (
    <foreignObject
      x={x}
      y={showBelow ? y : 0}
      width={tooltipWidth}
      height={showBelow ? canvasHeight - y : y}
      style={{ overflow: "visible" }}
    >
      <div
        className="rounded-lg p-3 shadow-lg"
        style={{
          background: "#243352",
          border: "1.5px solid #4a9eda",
          ...(showBelow ? {} : { position: "absolute" as const, bottom: 0, width: tooltipWidth }),
        }}
      >
        <h4 className="text-xs font-semibold text-white">{node.name}</h4>
        {node.description && (
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#94a3b8" }}>
            {node.description}
          </p>
        )}
        <div className="mt-2 space-y-0.5 text-[10px]" style={{ color: "#94a3b8" }}>
          <p>{node.stageCount} stages</p>
          {node.frictionCount > 0 && (
            <p>{node.frictionCount} friction observations</p>
          )}
          {couplingCount > 0 && (
            <p className="text-indigo-300">{couplingCount} coupled value stream{couplingCount !== 1 ? "s" : ""}</p>
          )}
          {node.bindingStageName && (
            <p className="text-red-400">Binding: {node.bindingStageName}</p>
          )}
          {node.confidence != null && (
            <p>Confidence: {(node.confidence * 100).toFixed(0)}%</p>
          )}
        </div>
        <p className="mt-2 text-[10px]" style={{ color: "#4a9eda" }}>Click to explore →</p>
      </div>
    </foreignObject>
  );
}

/* ── Network View ──────────────────────────────────────────────────── */

export function NetworkView() {
  const {
    scaffoldData,
    networkNodes,
    networkForwardEdges,
    networkFeedbackEdges,
    topologyView,
    selectVs,
    loadHeatmap,
  } = useCanvasStore();

  const [hoveredVsId, setHoveredVsId] = useState<string | null>(null);
  const heatmapInputRef = useRef<HTMLInputElement>(null);
  const { positions, canvasWidth, canvasHeight } = useNodePositions(networkNodes);

  if (!scaffoldData || networkNodes.length === 0) return null;

  const hoveredNode = hoveredVsId
    ? networkNodes.find((n) => n.vsId === hoveredVsId)
    : null;
  const hoveredPos = hoveredVsId ? positions.get(hoveredVsId) : null;

  const totalFriction = networkNodes.reduce((s, n) => s + n.frictionCount, 0);

  // D-052: Coupling counts per VS — count topology edges where this VS's activities appear
  const couplingByVs = new Map<string, number>();
  if (topologyView && scaffoldData) {
    for (const node of networkNodes) {
      const vsActivities = new Set(
        scaffoldData.elements.valueStreams[node.vsId]?.activityIds ?? []
      );
      const couplingEdges = topologyView.edges.filter(
        e => vsActivities.has(e.sourceActivityId) || vsActivities.has(e.targetActivityId)
      );
      // Count unique partner VS ids (not self-edges)
      const partners = new Set<string>();
      for (const edge of couplingEdges) {
        const partnerId = vsActivities.has(edge.sourceActivityId)
          ? edge.targetActivityId
          : edge.sourceActivityId;
        // Find which VS the partner belongs to
        for (const [vsId, vs] of Object.entries(scaffoldData.elements.valueStreams)) {
          if (vsId !== node.vsId && vs.activityIds?.includes(partnerId)) {
            partners.add(vsId);
          }
        }
      }
      couplingByVs.set(node.vsId, partners.size);
    }
  }
  const constrainedCount = networkNodes.filter((n) => n.hasBindingConstraint).length;

  // Highest friction stream (summary chip, no auto-focus)
  const highestFrictionNode = networkNodes.reduce<NetworkNode | null>(
    (best, n) => (!best || n.frictionCount > best.frictionCount) ? n : best,
    null,
  );

  const handleHeatmapFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as Record<string, unknown>;
        if ("heatmapId" in json && "observations" in json) {
          const heatmap = json as unknown as HeatmapData;
          if (scaffoldData && heatmap.scaffoldId !== scaffoldData.scaffoldId) {
            useCanvasStore.setState({
              error: `Heatmap scaffold mismatch: generated for "${heatmap.scaffoldId}", loaded scaffold is "${scaffoldData.scaffoldId}".`,
            });
            return;
          }
          await loadHeatmap(heatmap);
        }
      } catch {
        useCanvasStore.setState({ error: "Failed to parse heatmap JSON." });
      }
    },
    [loadHeatmap, scaffoldData],
  );

  return (
    <div className="flex h-full flex-col" style={{ background: "#1a2236", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="space-y-2">
          {/* Scaffold selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
              Scaffold
            </span>
            <button
              onClick={() => useCanvasStore.getState().reset()}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors"
              style={{ border: "1px solid #2e3f5c", background: "#243352" }}
            >
              {scaffoldData.name}
              <svg
                className="h-3 w-3"
                style={{ color: "#94a3b8" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {scaffoldData.description && (
            <div className="max-w-3xl rounded-md px-3 py-2" style={{ background: "#243352" }}>
              <p
                title={scaffoldData.description}
                className="text-xs leading-relaxed line-clamp-4"
                style={{ color: "#94a3b8" }}
              >
                {scaffoldData.description}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="rounded-full px-3 py-1 font-medium" style={{ background: "rgba(74,158,218,0.15)", color: "#4a9eda" }}>
            {networkNodes.length} value streams
          </span>
          {totalFriction > 0 && (
            <span className="rounded-full px-3 py-1 font-medium" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
              {totalFriction} friction observations
            </span>
          )}
          {constrainedCount > 0 && (
            <span className="rounded-full px-3 py-1 font-medium" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
              {constrainedCount} constrained
            </span>
          )}
          {highestFrictionNode && highestFrictionNode.frictionCount > 0 && (
            <span className="rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
              Highest friction: <span className="font-medium text-white">{highestFrictionNode.name}</span>
            </span>
          )}

          {/* Load assessment heatmaps */}
          <button
            onClick={() => heatmapInputRef.current?.click()}
            className="rounded-full border border-dashed px-3 py-1 transition-colors"
            style={{ borderColor: "#2e3f5c", color: "#94a3b8" }}
          >
            + Load Assessment
          </button>
          <input
            ref={heatmapInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleHeatmapFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Network canvas — scrollable in both directions */}
      <div className="flex-1 overflow-auto rounded-xl mx-5 mb-5" style={{ background: "#243352", border: "1px solid #2e3f5c" }}>
        <svg
          width={Math.max(canvasWidth, 800)}
          height={Math.max(canvasHeight, 400)}
          style={{ minWidth: canvasWidth, minHeight: canvasHeight, display: "block", margin: "0 auto" }}
        >
          {/* Arrow markers */}
          <defs>
            <marker
              id="arrowForward"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="8"
              markerHeight="6"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#4a9eda" opacity={0.6} />
            </marker>
            <marker
              id="arrowFeedback"
              viewBox="0 0 10 7"
              refX="10"
              refY="3.5"
              markerWidth="8"
              markerHeight="6"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#4a9eda" opacity={0.3} />
            </marker>
          </defs>

          {/* Zone containers — dashed rectangles with labels */}
          {scaffoldData.layoutZones && (scaffoldData.layoutZones as Array<{ id: string; label: string; row: number }>).map((zone) => {
            const zoneNodes = networkNodes.filter((n) => {
              const vs = scaffoldData.elements.valueStreams[n.vsId] as Record<string, unknown>;
              return vs?.layoutZone === zone.id;
            });
            if (zoneNodes.length === 0) return null;

            const zonePositions = zoneNodes.map((n) => positions.get(n.vsId)).filter(Boolean) as { x: number; y: number }[];
            if (zonePositions.length === 0) return null;

            const ZONE_PAD = 24;
            const ZONE_LABEL_H = 28;
            const minX = Math.min(...zonePositions.map((p) => p.x)) - ZONE_PAD;
            const maxX = Math.max(...zonePositions.map((p) => p.x)) + NODE_WIDTH + ZONE_PAD;
            // For row 0 (top zone): label above, so extend minY up for label space
            // For row > 0 (lower zones): label below, no need to extend minY
            const labelAbove = zone.row === 0;
            const minY = Math.min(...zonePositions.map((p) => p.y)) - ZONE_PAD - (labelAbove ? ZONE_LABEL_H : 0);
            const maxY = Math.max(...zonePositions.map((p) => p.y)) + NODE_HEIGHT + ZONE_PAD;

            // Label position: above box for top zone, below box for lower zones
            const labelX = minX + (maxX - minX) / 2;
            const labelY = labelAbove ? minY - 8 : maxY + 20;

            return (
              <g key={zone.id}>
                <rect
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  rx={12}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="8 4"
                  opacity={0.5}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={13}
                  fontWeight={600}
                  letterSpacing={0.5}
                >
                  {zone.label}
                </text>
              </g>
            );
          })}

          {/* Edges — solid for production/dependency, dashed for influence/feedback */}
          {networkForwardEdges.map((edge) => {
            // Dashed if source is ecosystem and target is knowledge (influence/feedback)
            const srcVs = scaffoldData.elements.valueStreams[edge.sourceVsId] as Record<string, unknown>;
            const tgtVs = scaffoldData.elements.valueStreams[edge.targetVsId] as Record<string, unknown>;
            const isDashed = srcVs?.layoutZone === "ecosystem" && tgtVs?.layoutZone === "knowledge";
            return (
              <ForwardEdge
                key={`${edge.sourceVsId}-${edge.targetVsId}`}
                edge={edge}
                positions={positions}
                isDashed={isDashed}
              />
            );
          })}

          {/* Legacy feedback edges (only used in non-zone DAG mode) */}
          {networkFeedbackEdges.map((edge) => (
            <ForwardEdge
              key={`fb-${edge.sourceVsId}-${edge.targetVsId}`}
              edge={edge}
              positions={positions}
              isDashed={true}
            />
          ))}

          {/* Nodes */}
          {networkNodes.map((node) => {
            const pos = positions.get(node.vsId);
            if (!pos) return null;
            return (
              <NetworkNodeCard
                key={node.vsId}
                node={node}
                position={pos}
                isHovered={hoveredVsId === node.vsId}
                onHover={() => setHoveredVsId(node.vsId)}
                onLeave={() => setHoveredVsId(null)}
                onClick={() => selectVs(node.vsId)}
                couplingCount={couplingByVs.get(node.vsId) ?? 0}
              />
            );
          })}

          {/* Tooltip */}
          {hoveredNode && hoveredPos && (
            <NodeTooltip
              node={hoveredNode}
              position={hoveredPos}
              canvasHeight={canvasHeight}
              couplingCount={couplingByVs.get(hoveredNode.vsId) ?? 0}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
