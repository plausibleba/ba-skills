// @ts-nocheck
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useThemeStore } from "../store/theme-store.ts";
import { tv } from "../theme.ts";
import type { NetworkNode, NetworkEdge } from "../types.ts";
import { LAYER_SCHEMES, detectSchemeId } from "../lib/layer-schemes.ts";

/* ── VS Editor Modal ──────────────────────────────────────────────── */

function VSEditorModal({
  vsId,
  scaffoldData,
  onClose,
}: {
  vsId: string;
  scaffoldData: any;
  onClose: () => void;
}) {
  const vs = scaffoldData.elements.valueStreams[vsId] as Record<string, any>;
  const [name, setName] = useState(vs?.name ?? "");
  const [description, setDescription] = useState(vs?.description ?? "");
  const [layoutZone, setLayoutZone] = useState(vs?.layoutZone ?? "");
  const [stakeholder, setStakeholder] = useState(vs?.accountableStakeholder ?? "");

  const layoutZones = (scaffoldData.layoutZones as Array<{ id: string; label: string }>) ?? [];
  const roles = Object.entries(scaffoldData.elements.roles ?? {}) as [string, { name: string }][];

  const handleSave = () => {
    const updatedVS = { ...vs, name, description, layoutZone, accountableStakeholder: stakeholder };
    const updatedScaffold = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        valueStreams: {
          ...scaffoldData.elements.valueStreams,
          [vsId]: updatedVS,
        },
      },
    };
    // Update the scaffold in the canvas store — triggers re-render
    useCanvasStore.getState().loadScaffold(updatedScaffold);
    onClose();
  };

  const inputCls = "w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Edit Value Stream</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Name</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Description</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Layer</label>
              {layoutZones.length > 0 ? (
                <select className={inputCls} value={layoutZone} onChange={e => setLayoutZone(e.target.value)}>
                  {layoutZones.map((z: any) => (
                    <option key={z.id} value={z.id}>{z.label}</option>
                  ))}
                </select>
              ) : (
                <input className={inputCls} value={layoutZone} onChange={e => setLayoutZone(e.target.value)} />
              )}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Accountable Stakeholder</label>
              {roles.length > 0 ? (
                <select className={inputCls} value={stakeholder} onChange={e => setStakeholder(e.target.value)}>
                  <option value="">— none —</option>
                  {roles.map(([id, r]) => (
                    <option key={id} value={id}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <input className={inputCls} value={stakeholder} onChange={e => setStakeholder(e.target.value)} />
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Stages</label>
            <div className="flex flex-wrap gap-1">
              {(vs?.activityIds ?? []).map((actId: string) => {
                const act = scaffoldData.elements.activities?.[actId];
                return (
                  <span key={actId} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                    {act?.name ?? actId}
                  </span>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Stage editing coming soon — use the Stage View for now.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-700">Save</button>
        </div>
      </div>
    </div>
  );
}

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
  onEdit,
  couplingCount = 0,
}: {
  node: NetworkNode;
  position: { x: number; y: number };
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  onEdit?: () => void;
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
    : { borderColor: tv.borderSubtle };

  // Background tint: very subtle
  const bgStyle = node.hasBindingConstraint
    ? { background: "rgba(239,68,68,0.08)" }
    : frictionLevel === "High" ? { background: "rgba(245,158,11,0.08)" }
    : frictionLevel === "Medium" ? { background: "rgba(245,158,11,0.05)" }
    : { background: tv.bgCard };

  // Heat badge colours — dark text on light bg, light text on dark bg
  const isDk = useThemeStore((s) => s.mode) === "dark";
  const badgeStyle =
    frictionLevel === "High" ? { background: "rgba(239,68,68,0.15)", color: isDk ? "#f87171" : "#dc2626" }
    : frictionLevel === "Medium" ? { background: isDk ? "rgba(245,158,11,0.15)" : "rgba(217,119,6,0.12)", color: isDk ? "#fbbf24" : "#b45309" }
    : frictionLevel === "Low" ? { background: isDk ? "rgba(234,179,8,0.15)" : "rgba(202,138,4,0.12)", color: isDk ? "#facc15" : "#a16207" }
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
        {/* Edit pencil + Heat badge — top right */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="rounded-full p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Edit value stream properties"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {frictionLevel && (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={badgeStyle}>
              {frictionLevel}
            </span>
          )}
        </div>

        {/* Title — the hero */}
        <div>
          <h3 className="text-[15px] font-bold leading-snug pr-12" style={{ color: tv.textPrimary }}>
            {node.name}
          </h3>
          {node.description && (
            <p className="mt-0.5 text-[11px] leading-snug line-clamp-1" style={{ color: tv.textDim }}>
              {node.description}
            </p>
          )}
        </div>

        {/* Bottom: stage count + binding + coupling indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: tv.textDim }}>
            {node.stageCount} stages
          </span>

          {couplingCount > 0 && (
            <>
              <div className="h-3 w-px" style={{ background: tv.borderSubtle }} />
              <span className="text-[10px]" style={{ color: isDk ? "#a5b4fc" : "#4f46e5" }} title="Value streams coupled via shared roles, controls, application functions, or record classes">
                {couplingCount} coupled
              </span>
            </>
          )}

          {node.hasBindingConstraint && (
            <>
              <div className="h-3 w-px" style={{ background: tv.borderSubtle }} />
              <span className="text-[10px] font-medium" style={{ color: isDk ? "#f87171" : "#dc2626" }}>
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

  const isDark = useThemeStore((s) => s.mode) === "dark";
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
          background: tv.bgCard,
          border: `1.5px solid ${tv.accent}`,
          ...(showBelow ? {} : { position: "absolute" as const, bottom: 0, width: tooltipWidth }),
        }}
      >
        <h4 className="text-xs font-semibold" style={{ color: tv.textPrimary }}>{node.name}</h4>
        {node.description && (
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: tv.textDim }}>
            {node.description}
          </p>
        )}
        <div className="mt-2 space-y-0.5 text-[10px]" style={{ color: tv.textDim }}>
          <p>{node.stageCount} stages</p>
          {node.frictionCount > 0 && (
            <p>{node.frictionCount} friction observations</p>
          )}
          {couplingCount > 0 && (
            <p style={{ color: isDark ? "#a5b4fc" : "#4f46e5" }}>{couplingCount} coupled value stream{couplingCount !== 1 ? "s" : ""}</p>
          )}
          {node.bindingStageName && (
            <p className="text-red-400">Binding: {node.bindingStageName}</p>
          )}
          {node.confidence != null && (
            <p>Confidence: {(node.confidence * 100).toFixed(0)}%</p>
          )}
        </div>
        <p className="mt-2 text-[10px]" style={{ color: tv.accent }}>Click to explore →</p>
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
    heatmapsByVs,
  } = useCanvasStore();

  const isDark = useThemeStore((s) => s.mode) === "dark";
  const [hoveredVsId, setHoveredVsId] = useState<string | null>(null);
  const [editingVsId, setEditingVsId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"cards" | "graph">("cards");
  const { positions, canvasWidth, canvasHeight } = useNodePositions(networkNodes);

  // Detect the current layer scheme from the scaffold's layoutZones
  const currentSchemeId = useMemo(
    () => detectSchemeId(scaffoldData?.layoutZones as Array<{ id: string }> | undefined),
    [scaffoldData],
  );

  /** Apply a different layer scheme — updates layoutZones + reassigns each VS.
   *
   *  Strategy:
   *  1. If VS are well-distributed across old layers → positional mapping
   *     (row N in old → row N in new, clamped).
   *  2. If most VS sit in one layer (>80% in a single row) → distribute
   *     across the new scheme's layers using journey order (topological).
   *     This gives a meaningful starting point the user can refine via the
   *     edit pencil. */
  const applyLayerScheme = useCallback((schemeId: string) => {
    if (!scaffoldData) return;
    const scheme = LAYER_SCHEMES.find(s => s.id === schemeId);
    if (!scheme) return;

    const newLayoutZones = scheme.layers.map((l, i) => ({
      id: l.id,
      label: l.label,
      row: i,
      description: l.description,
    }));

    // Build a lookup: old zone id → row index (from current layoutZones)
    const oldZones = (scaffoldData.layoutZones as Array<{ id: string; row: number }>) ?? [];
    const oldZoneRow = new Map<string, number>();
    for (const z of oldZones) oldZoneRow.set(z.id, z.row);

    // Check if VS are concentrated in a single layer
    const vsEntries = Object.entries(scaffoldData.elements.valueStreams) as [string, any][];
    const rowCounts = new Map<number, number>();
    for (const [, vs] of vsEntries) {
      const zone = vs.layoutZone ?? vs.zone;
      const row = oldZoneRow.get(zone) ?? 0;
      rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
    }
    const maxInOneRow = Math.max(...rowCounts.values(), 0);
    const allInOneLayer = maxInOneRow >= vsEntries.length * 0.8;

    const updatedVS = { ...scaffoldData.elements.valueStreams } as Record<string, any>;

    if (allInOneLayer && scheme.layers.length >= 2) {
      // Distribute across new layers using journey order (from networkNodes which
      // are already sorted by topological position).
      const orderedVsIds = networkNodes.map(n => n.vsId);
      // Include any VS not in networkNodes (shouldn't happen, but safety)
      for (const [vsId] of vsEntries) {
        if (!orderedVsIds.includes(vsId)) orderedVsIds.push(vsId);
      }
      const layerCount = scheme.layers.length;
      const perLayer = Math.ceil(orderedVsIds.length / layerCount);
      orderedVsIds.forEach((vsId, idx) => {
        const layerIdx = Math.min(Math.floor(idx / perLayer), layerCount - 1);
        const vs = updatedVS[vsId];
        if (vs) updatedVS[vsId] = { ...vs, layoutZone: scheme.layers[layerIdx].id };
      });
    } else {
      // Positional mapping — VS already distributed across layers
      for (const [vsId, vs] of vsEntries) {
        const currentZone = vs.layoutZone ?? vs.zone;
        const oldRow = oldZoneRow.get(currentZone) ?? 0;
        const newRow = Math.min(oldRow, scheme.layers.length - 1);
        updatedVS[vsId] = { ...vs, layoutZone: scheme.layers[newRow].id };
      }
    }

    const updatedScaffold = {
      ...scaffoldData,
      layoutZones: newLayoutZones,
      elements: { ...scaffoldData.elements, valueStreams: updatedVS },
    };
    useCanvasStore.getState().loadScaffold(updatedScaffold);
  }, [scaffoldData, networkNodes]);

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

  return (
    <div className="flex h-full flex-col" style={{ background: tv.bgSurface, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="space-y-2">
          {/* Scaffold selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>
              Scaffold
            </span>
            <button
              onClick={() => useCanvasStore.getState().reset()}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
              style={{ color: tv.textPrimary, border: `1px solid ${tv.borderSubtle}`, background: tv.bgCard }}
            >
              {scaffoldData.name}
              <svg
                className="h-3 w-3"
                style={{ color: tv.textDim }}
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
            <div className="max-w-3xl rounded-md px-3 py-2" style={{ background: tv.bgCard }}>
              <p
                title={scaffoldData.description}
                className="text-xs leading-relaxed line-clamp-4"
                style={{ color: tv.textDim }}
              >
                {scaffoldData.description}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="rounded-full px-3 py-1 font-medium" style={{ background: isDark ? "rgba(74,158,218,0.15)" : "rgba(37,99,235,0.1)", color: isDark ? "#4a9eda" : "#2563eb" }}>
            {networkNodes.length} value streams
          </span>
          {totalFriction > 0 && (
            <span className="rounded-full px-3 py-1 font-medium" style={{ background: isDark ? "rgba(245,158,11,0.15)" : "rgba(217,119,6,0.12)", color: isDark ? "#fbbf24" : "#b45309" }}>
              {totalFriction} friction observations
            </span>
          )}
          {constrainedCount > 0 && (
            <span className="rounded-full px-3 py-1 font-medium" style={{ background: isDark ? "rgba(239,68,68,0.15)" : "rgba(220,38,38,0.1)", color: isDark ? "#f87171" : "#dc2626" }}>
              {constrainedCount} constrained
            </span>
          )}
          {highestFrictionNode && highestFrictionNode.frictionCount > 0 && (
            <span className="rounded-full px-3 py-1" style={{ background: tv.tileBg, color: tv.textDim }}>
              Highest friction: <span className="font-medium" style={{ color: tv.textPrimary }}>{highestFrictionNode.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* View toggle + Layer scheme selector */}
      <div className="flex items-center justify-between gap-2 px-5 pb-3">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 w-fit">
          {([["cards", "Cards"], ["graph", "Graph"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${
                viewTab === tab ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Layer scheme selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>
            Layers
          </span>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 w-fit">
            {LAYER_SCHEMES.map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => applyLayerScheme(scheme.id)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${
                  currentSchemeId === scheme.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                title={scheme.layers.map(l => l.label).join(" / ")}
              >
                {scheme.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VS Editor Modal */}
      {editingVsId && scaffoldData && (
        <VSEditorModal vsId={editingVsId} scaffoldData={scaffoldData} onClose={() => setEditingVsId(null)} />
      )}

      {/* ── Cards View ── */}
      {viewTab === "cards" && (
        <div className="flex-1 overflow-auto rounded-xl mx-5 mb-5" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
          <svg
            width={Math.max(canvasWidth, 800)}
            height={Math.max(canvasHeight, 400)}
            style={{ minWidth: canvasWidth, minHeight: canvasHeight, display: "block", margin: "0 auto" }}
          >
            {/* Arrow markers */}
            <defs>
              <marker id="arrowForward" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#4a9eda" opacity={0.6} />
              </marker>
              <marker id="arrowFeedback" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
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
              const labelAbove = zone.row === 0;
              const minY = Math.min(...zonePositions.map((p) => p.y)) - ZONE_PAD - (labelAbove ? ZONE_LABEL_H : 0);
              const maxY = Math.max(...zonePositions.map((p) => p.y)) + NODE_HEIGHT + ZONE_PAD;
              const labelX = minX + (maxX - minX) / 2;
              const labelY = labelAbove ? minY - 8 : maxY + 20;

              return (
                <g key={zone.id}>
                  <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} rx={12}
                    fill="none" stroke={tv.textDim} strokeWidth={1.5} strokeDasharray="8 4" opacity={0.5} />
                  <text x={labelX} y={labelY} textAnchor="middle" fill={tv.textDim} fontSize={13} fontWeight={600} letterSpacing={0.5}>
                    {zone.label}
                  </text>
                </g>
              );
            })}

            {/* Edges */}
            {networkForwardEdges.map((edge) => {
              const srcVs = scaffoldData.elements.valueStreams[edge.sourceVsId] as Record<string, unknown>;
              const tgtVs = scaffoldData.elements.valueStreams[edge.targetVsId] as Record<string, unknown>;
              const isDashed = srcVs?.layoutZone === "ecosystem" && tgtVs?.layoutZone === "knowledge";
              return <ForwardEdge key={`${edge.sourceVsId}-${edge.targetVsId}`} edge={edge} positions={positions} isDashed={isDashed} />;
            })}
            {networkFeedbackEdges.map((edge) => (
              <ForwardEdge key={`fb-${edge.sourceVsId}-${edge.targetVsId}`} edge={edge} positions={positions} isDashed={true} />
            ))}

            {/* Nodes */}
            {networkNodes.map((node) => {
              const pos = positions.get(node.vsId);
              if (!pos) return null;
              return (
                <NetworkNodeCard key={node.vsId} node={node} position={pos}
                  isHovered={hoveredVsId === node.vsId}
                  onHover={() => setHoveredVsId(node.vsId)} onLeave={() => setHoveredVsId(null)}
                  onClick={() => selectVs(node.vsId)} onEdit={() => setEditingVsId(node.vsId)}
                  couplingCount={couplingByVs.get(node.vsId) ?? 0} />
              );
            })}

            {/* Tooltip */}
            {hoveredNode && hoveredPos && (
              <NodeTooltip node={hoveredNode} position={hoveredPos} canvasHeight={canvasHeight}
                couplingCount={couplingByVs.get(hoveredNode.vsId) ?? 0} />
            )}
          </svg>
        </div>
      )}

      {/* ── Graph View — draggable force-like layout with coupling edges ── */}
      {viewTab === "graph" && (
        <NetworkGraphView
          nodes={networkNodes}
          forwardEdges={networkForwardEdges}
          feedbackEdges={networkFeedbackEdges}
          couplingByVs={couplingByVs}
          topologyView={topologyView}
          scaffoldData={scaffoldData}
          onSelectVs={selectVs}
          onEditVs={setEditingVsId}
        />
      )}
    </div>
  );
}

/* ── Graph View Component ─────────────────────────────────────────── */

function NetworkGraphView({
  nodes,
  forwardEdges,
  feedbackEdges,
  couplingByVs,
  topologyView,
  scaffoldData,
  onSelectVs,
  onEditVs,
}: {
  nodes: NetworkNode[];
  forwardEdges: NetworkEdge[];
  feedbackEdges: NetworkEdge[];
  couplingByVs: Map<string, number>;
  topologyView: any;
  scaffoldData: any;
  onSelectVs: (vsId: string) => void;
  onEditVs: (vsId: string) => void;
}) {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Position state — initialise in a circle layout
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(() => {
    const map = new Map<string, { x: number; y: number }>();
    const cx = 400, cy = 300, r = Math.min(250, nodes.length * 40);
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      map.set(n.vsId, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    });
    return map;
  });

  const GRAPH_NODE_R = 50;

  // Build coupling edges (VS-to-VS) from topology view
  const couplingEdges = useMemo(() => {
    if (!topologyView || !scaffoldData) return [];
    const edges: { from: string; to: string; basis: string }[] = [];
    const seen = new Set<string>();

    for (const edge of topologyView.edges) {
      // Find which VS each activity belongs to
      let fromVs = "", toVs = "";
      for (const [vsId, vs] of Object.entries(scaffoldData.elements.valueStreams) as [string, any][]) {
        if (vs.activityIds?.includes(edge.sourceActivityId)) fromVs = vsId;
        if (vs.activityIds?.includes(edge.targetActivityId)) toVs = vsId;
      }
      if (fromVs && toVs && fromVs !== toVs) {
        const key = [fromVs, toVs].sort().join("--");
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ from: fromVs, to: toVs, basis: edge.basis ?? "coupled" });
        }
      }
    }
    return edges;
  }, [topologyView, scaffoldData]);

  // Drag handlers
  const handleMouseDown = (vsId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const pos = nodePositions.get(vsId);
    if (!pos) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragId(vsId);
    setDragOffset({ x: e.clientX - rect.left - pos.x, y: e.clientY - rect.top - pos.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setNodePositions(prev => {
      const next = new Map(prev);
      next.set(dragId, { x: e.clientX - rect.left - dragOffset.x, y: e.clientY - rect.top - dragOffset.y });
      return next;
    });
  }, [dragId, dragOffset]);

  const handleMouseUp = useCallback(() => setDragId(null), []);

  useEffect(() => {
    if (dragId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [dragId, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto rounded-xl mx-5 mb-5 relative"
      style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}`, minHeight: 500 }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="graphArrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4a9eda" opacity={0.6} />
          </marker>
        </defs>

        {/* Forward edges — blue */}
        {forwardEdges.map((edge) => {
          const from = nodePositions.get(edge.sourceVsId);
          const to = nodePositions.get(edge.targetVsId);
          if (!from || !to) return null;
          return (
            <line key={`fwd-${edge.sourceVsId}-${edge.targetVsId}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="#4a9eda" strokeWidth={2} opacity={0.5} markerEnd="url(#graphArrow)" />
          );
        })}

        {/* Coupling edges — purple dashed */}
        {couplingEdges.map((edge) => {
          const from = nodePositions.get(edge.from);
          const to = nodePositions.get(edge.to);
          if (!from || !to) return null;
          return (
            <line key={`coupling-${edge.from}-${edge.to}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={isDark ? "#a5b4fc" : "#6366f1"} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6} />
          );
        })}
      </svg>

      {/* Draggable nodes */}
      {nodes.map((node) => {
        const pos = nodePositions.get(node.vsId);
        if (!pos) return null;
        const coupling = couplingByVs.get(node.vsId) ?? 0;
        return (
          <div
            key={node.vsId}
            className={`absolute select-none rounded-xl border shadow-sm p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
              dragId === node.vsId ? "ring-2 ring-blue-400/50 z-10" : ""
            }`}
            style={{
              left: pos.x - 80,
              top: pos.y - 40,
              width: 160,
              background: tv.bgCard,
              borderColor: node.hasBindingConstraint ? "#dc2626" : tv.borderSubtle,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
            onMouseDown={(e) => handleMouseDown(node.vsId, e)}
            onDoubleClick={() => onSelectVs(node.vsId)}
          >
            <div className="flex items-start justify-between">
              <h4 className="text-[12px] font-bold leading-tight" style={{ color: tv.textPrimary }}>
                {node.name}
              </h4>
              <button
                onClick={e => { e.stopPropagation(); onEditVs(node.vsId); }}
                className="ml-1 flex-shrink-0 rounded-full p-0.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                title="Edit"
              >
                <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[9px]" style={{ color: tv.textDim }}>
              <span>{node.stageCount} stages</span>
              {coupling > 0 && (
                <>
                  <span className="opacity-40">|</span>
                  <span style={{ color: isDark ? "#a5b4fc" : "#4f46e5" }}>{coupling} coupled</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
