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
      const ZONE_GAP = 120;

      const row0 = nodes.filter((n) => n.row === 0);
      const row1 = nodes.filter((n) => n.row === 1);

      // Sort by layer (column position within zone)
      row0.sort((a, b) => a.layer - b.layer);
      row1.sort((a, b) => a.layer - b.layer);

      const zone0Width = row0.length * NODE_WIDTH + (row0.length - 1) * LAYER_GAP;
      const zone1Width = row1.length * NODE_WIDTH + (row1.length - 1) * LAYER_GAP;
      const totalWidth = Math.max(zone0Width, zone1Width);

      // Ecosystem layer (top)
      row0.forEach((node, idx) => {
        const xOffset = (totalWidth - zone0Width) / 2;
        positions.set(node.vsId, {
          x: PADDING_X + xOffset + idx * (NODE_WIDTH + LAYER_GAP),
          y: PADDING_Y,
        });
      });

      // Knowledge layer (bottom)
      row1.forEach((node, idx) => {
        const xOffset = (totalWidth - zone1Width) / 2;
        positions.set(node.vsId, {
          x: PADDING_X + xOffset + idx * (NODE_WIDTH + LAYER_GAP),
          y: PADDING_Y + NODE_HEIGHT + ZONE_GAP,
        });
      });

      const canvasWidth = PADDING_X * 2 + totalWidth;
      const canvasHeight = PADDING_Y * 2 + NODE_HEIGHT * 2 + ZONE_GAP;
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
      stroke="currentColor"
      strokeWidth={1.5}
      className="text-vcc-400"
      opacity={0.6}
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
      stroke="currentColor"
      strokeWidth={1.5}
      strokeDasharray="8 5"
      className="text-vcc-200"
      opacity={0.4}
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
}: {
  node: NetworkNode;
  position: { x: number; y: number };
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
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
  const borderClass = node.hasBindingConstraint
    ? "border-red-300/80"
    : frictionLevel === "High" ? "border-amber-200/60"
    : frictionLevel === "Medium" ? "border-amber-200/40"
    : "border-gray-200";

  // Background tint: very subtle
  const bgClass = node.hasBindingConstraint
    ? "bg-red-50/20"
    : frictionLevel === "High" ? "bg-amber-50/15"
    : frictionLevel === "Medium" ? "bg-amber-50/10"
    : "bg-white";

  // Heat badge colours
  const badgeClass =
    frictionLevel === "High" ? "bg-red-100 text-red-600"
    : frictionLevel === "Medium" ? "bg-amber-100 text-amber-600"
    : frictionLevel === "Low" ? "bg-yellow-50 text-yellow-600"
    : "";

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
        className={`relative flex h-full cursor-pointer flex-col justify-between rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${borderClass} ${bgClass} ${
          isHovered ? "ring-2 ring-vcc-400/50 ring-offset-1" : ""
        } ${!node.hasBindingConstraint && !frictionLevel ? "hover:border-vcc-300" : ""}`}
      >
        {/* Heat badge — top right, quiet */}
        {frictionLevel && (
          <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-semibold ${badgeClass}`}>
            {frictionLevel}
          </span>
        )}

        {/* Title — the hero */}
        <div>
          <h3 className="text-[15px] font-bold leading-snug text-gray-900 pr-12">
            {node.name}
          </h3>
          {node.description && (
            <p className="mt-0.5 text-[11px] leading-snug text-gray-400 line-clamp-1">
              {node.description}
            </p>
          )}
        </div>

        {/* Bottom: stage count + binding indicator only */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {node.stageCount} stages
          </span>

          {node.hasBindingConstraint && (
            <>
              <div className="h-3 w-px bg-gray-200" />
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
}: {
  node: NetworkNode;
  position: { x: number; y: number };
  canvasHeight: number;
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
        className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        style={showBelow ? {} : { position: "absolute", bottom: 0, width: tooltipWidth }}
      >
        <h4 className="text-xs font-semibold text-gray-900">{node.name}</h4>
        {node.description && (
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            {node.description}
          </p>
        )}
        <div className="mt-2 space-y-0.5 text-[10px] text-gray-400">
          <p>{node.stageCount} stages</p>
          {node.frictionCount > 0 && (
            <p>{node.frictionCount} friction observations</p>
          )}
          {node.bindingStageName && (
            <p className="text-red-500">Binding: {node.bindingStageName}</p>
          )}
          {node.confidence != null && (
            <p>Confidence: {(node.confidence * 100).toFixed(0)}%</p>
          )}
        </div>
        <p className="mt-2 text-[10px] text-vcc-500">Click to explore →</p>
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4">
        <div className="space-y-2">
          {/* Scaffold selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Scaffold
            </span>
            <button
              onClick={() => useCanvasStore.getState().reset()}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              {scaffoldData.name}
              <svg
                className="h-3 w-3 text-gray-400"
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
            <div className="max-w-3xl rounded-md bg-gray-50 px-3 py-2">
              <p
                title={scaffoldData.description}
                className="text-xs leading-relaxed text-gray-500 line-clamp-4"
              >
                {scaffoldData.description}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="rounded-full bg-vcc-50 px-3 py-1 font-medium text-vcc-600">
            {networkNodes.length} value streams
          </span>
          {totalFriction > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-600">
              {totalFriction} friction observations
            </span>
          )}
          {constrainedCount > 0 && (
            <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-500">
              {constrainedCount} constrained
            </span>
          )}
          {highestFrictionNode && highestFrictionNode.frictionCount > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">
              Highest friction: <span className="font-medium text-gray-700">{highestFrictionNode.name}</span>
            </span>
          )}

          {/* Load assessment heatmaps */}
          <button
            onClick={() => heatmapInputRef.current?.click()}
            className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-gray-400 transition-colors hover:border-vcc-300 hover:text-vcc-600"
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
      <div className="flex-1 overflow-auto rounded-xl border border-gray-100 bg-gray-50/30">
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
              <polygon points="0 0, 10 3.5, 0 7" className="fill-vcc-400" />
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
              <polygon points="0 0, 10 3.5, 0 7" className="fill-vcc-200" />
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
            const minY = Math.min(...zonePositions.map((p) => p.y)) - ZONE_PAD - ZONE_LABEL_H;
            const maxY = Math.max(...zonePositions.map((p) => p.y)) + NODE_HEIGHT + ZONE_PAD;

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
                  x={minX + (maxX - minX) / 2}
                  y={minY - 8}
                  textAnchor="middle"
                  className="fill-gray-400"
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
              />
            );
          })}

          {/* Tooltip */}
          {hoveredNode && hoveredPos && (
            <NodeTooltip
              node={hoveredNode}
              position={hoveredPos}
              canvasHeight={canvasHeight}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
