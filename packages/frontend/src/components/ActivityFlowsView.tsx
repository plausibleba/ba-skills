// ActivityFlowsView — Dedicated Workbench tab showing all sub-activity DAGs
// in a swimlane layout grouped by value stream.
//
// Each activity's DAG is rendered as an SVG with:
//   - Rounded rect nodes for work steps
//   - Diamond nodes for decision gates
//   - Elbow connectors with edge labels for branches
//   - Role annotations on each node

import { useState, useMemo } from "react";
import type { SubActivity } from "../types";

// ── Theme (matches WorkbenchView dulled palette) ──

const theme = {
  bg: "#0f172a",
  bgSurface: "rgba(15, 23, 42, 0.95)",
  bgCard: "rgba(15, 23, 42, 0.6)",
  accent: "#d4a053",
  accentDim: "rgba(212, 160, 83, 0.12)",
  text: "#f8fafc",
  textDim: "#94a3b8",
  textFaint: "#64748b",
  border: "rgba(212, 160, 83, 0.18)",
  borderSubtle: "rgba(51, 65, 85, 0.4)",
  activity: "#22c55e",
  gate: "#f59e0b",
  role: "#ef4444",
  connector: "#475569",
};

// ── Layout constants ──

const NODE_W = 160;
const NODE_H = 36;
const GATE_R = 20;
const GAP_X = 28;
const GAP_Y = 28;
const PAD = 20;

// ── DAG layout engine ──

interface LayoutNode {
  node: SubActivity;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  col: number;
}

interface DagLayout {
  nodes: LayoutNode[];
  svgW: number;
  svgH: number;
}

function layoutDag(nodes: SubActivity[]): DagLayout {
  if (!nodes.length) return { nodes: [], svgW: 0, svgH: 0 };

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Find roots (no incoming edges)
  const hasIncoming = new Set<string>();
  for (const n of nodes) for (const nxt of n.nextIds ?? []) hasIncoming.add(nxt);
  const roots = nodes.filter(n => !hasIncoming.has(n.id));
  if (roots.length === 0) roots.push(nodes[0]);

  // BFS layering
  const layers: SubActivity[][] = [];
  const visited = new Set<string>();
  let queue = roots.map(r => r.id);
  while (queue.length > 0) {
    const layer: SubActivity[] = [];
    const next: string[] = [];
    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      const node = nodeMap.get(id);
      if (node) {
        layer.push(node);
        for (const nxt of node.nextIds ?? []) {
          if (!visited.has(nxt)) next.push(nxt);
        }
      }
    }
    if (layer.length > 0) layers.push(layer);
    queue = next;
  }
  // Catch unvisited
  for (const n of nodes) {
    if (!visited.has(n.id)) {
      layers.push([n]);
      visited.add(n.id);
    }
  }

  // Position nodes
  const maxCols = Math.max(...layers.map(l => l.length), 1);

  // Detect upstream edges for extra margin
  const layerOf = new Map<string, number>();
  layers.forEach((layer, li) => layer.forEach(n => layerOf.set(n.id, li)));
  const hasUpstream = nodes.some(n =>
    (n.nextIds ?? []).some(nxt => (layerOf.get(nxt) ?? 999) <= (layerOf.get(n.id) ?? 0))
  );
  const ROUTE_MARGIN = hasUpstream ? 24 : 0;

  const svgW = maxCols * (NODE_W + GAP_X) - GAP_X + PAD * 2 + ROUTE_MARGIN * 2;
  const svgH = layers.length * (NODE_H + GAP_Y) - GAP_Y + PAD * 2;

  const layoutNodes: LayoutNode[] = [];
  layers.forEach((layer, li) => {
    const layerW = layer.length * (NODE_W + GAP_X) - GAP_X;
    const startX = (svgW - layerW) / 2;
    layer.forEach((node, ni) => {
      const w = node.nodeType === "gate" ? GATE_R * 2 : NODE_W;
      const h = node.nodeType === "gate" ? GATE_R * 2 : NODE_H;
      const x = startX + ni * (NODE_W + GAP_X) + (NODE_W - w) / 2;
      const y = PAD + li * (NODE_H + GAP_Y);
      layoutNodes.push({ node, x, y, w, h, layer: li, col: ni });
    });
  });

  return { nodes: layoutNodes, svgW, svgH };
}

// ── Single DAG SVG renderer ──

function DagSvg({ dagNodes, roles }: { dagNodes: SubActivity[]; roles: Record<string, any> }) {
  const layout = useMemo(() => layoutDag(dagNodes), [dagNodes]);
  const { nodes: lnodes, svgW, svgH } = layout;

  if (!lnodes.length) return null;

  const posMap = new Map(lnodes.map(ln => [ln.node.id, ln]));

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMin meet"
      style={{ minWidth: Math.min(svgW, 300) }}>
      <defs>
        <marker id="flowArrow" viewBox="0 0 8 6" refX="8" refY="3" markerWidth="6" markerHeight="5" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={theme.connector} opacity={0.7} />
        </marker>
      </defs>

      {/* Edges */}
      {dagNodes.map(node => {
        const from = posMap.get(node.id);
        if (!from) return null;
        return (node.nextIds ?? []).map(nxtId => {
          const to = posMap.get(nxtId);
          if (!to) return null;
          const edgeLabel = node.edgeLabels?.[nxtId];

          const fromCx = from.x + from.w / 2;
          const fromBot = from.y + from.h;
          const toCx = to.x + to.w / 2;
          const toTop = to.y;
          const isUpstream = toTop <= fromBot + 4;

          let d: string;
          let labelX: number;
          let labelY: number;

          if (!isUpstream && fromCx === toCx) {
            d = `M${fromCx},${fromBot} L${toCx},${toTop}`;
            labelX = fromCx + 8;
            labelY = (fromBot + toTop) / 2;
          } else if (!isUpstream) {
            const midY = (fromBot + toTop) / 2;
            d = `M${fromCx},${fromBot} L${fromCx},${midY} L${toCx},${midY} L${toCx},${toTop}`;
            labelX = (fromCx + toCx) / 2;
            labelY = midY - 4;
          } else {
            const goRight = toCx >= fromCx;
            const exitX = goRight ? from.x + from.w : from.x;
            const exitY = from.y + from.h / 2;
            const MARGIN = 18;
            const outerX = goRight
              ? Math.max(from.x + from.w, to.x + to.w) + MARGIN
              : Math.min(from.x, to.x) - MARGIN;
            d = `M${exitX},${exitY} L${outerX},${exitY} L${outerX},${toTop - MARGIN} L${toCx},${toTop - MARGIN} L${toCx},${toTop}`;
            labelX = outerX + (goRight ? 4 : -4);
            labelY = (exitY + (toTop - MARGIN)) / 2;
          }

          return (
            <g key={`${node.id}-${nxtId}`}>
              <path d={d} fill="none" stroke={theme.connector} strokeWidth={1.2} opacity={0.5}
                markerEnd="url(#flowArrow)" />
              {edgeLabel && (
                <text x={labelX} y={labelY} textAnchor="middle" fontSize={9}
                  fill={theme.gate} fontWeight={600} opacity={0.9}>
                  {edgeLabel}
                </text>
              )}
            </g>
          );
        });
      })}

      {/* Nodes */}
      {lnodes.map(({ node, x, y, w, h }) => {
        const roleName = node.roleId ? (roles[node.roleId]?.name ?? "") : "";

        if (node.nodeType === "gate") {
          const cx = x + w / 2;
          const cy = y + h / 2;
          const r = w / 2;
          return (
            <g key={node.id}>
              <polygon
                points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
                fill={`${theme.gate}20`} stroke={theme.gate} strokeWidth={1} />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
                fill={theme.gate} fontSize={9} fontWeight={600}>
                {node.label.length > 12 ? node.label.slice(0, 11) + "…" : node.label}
              </text>
            </g>
          );
        }

        return (
          <g key={node.id}>
            <rect x={x} y={y} width={w} height={h} rx={8}
              fill={`${theme.activity}12`} stroke={theme.activity} strokeWidth={0.8} opacity={0.9} />
            <text x={x + w / 2} y={y + (roleName ? h / 2 - 4 : h / 2 + 1)}
              textAnchor="middle" dominantBaseline="central"
              fill={theme.text} fontSize={10} fontWeight={500}>
              {node.label.length > 22 ? node.label.slice(0, 20) + "…" : node.label}
            </text>
            {roleName && (
              <text x={x + w / 2} y={y + h / 2 + 8} textAnchor="middle" dominantBaseline="central"
                fill={theme.role} fontSize={8} opacity={0.7}>
                {roleName}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Empty state ──

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 12, padding: 40, color: theme.textDim,
    }}>
      <span style={{ fontSize: 32, opacity: 0.4 }}>🔬</span>
      <p style={{ fontSize: 13, textAlign: "center", maxWidth: 360, lineHeight: 1.5 }}>
        No sub-activity flows yet. Run <strong style={{ color: theme.accent }}>Deepen Structure</strong> enrichment
        to generate detailed step-by-step breakdowns with decision gates for each activity.
      </p>
    </div>
  );
}

// ── Main component ──

export function ActivityFlowsView({ scaffoldData }: { scaffoldData: any }) {
  const els = scaffoldData?.elements ?? {};
  const vsEntries = Object.entries(els.valueStreams ?? {}) as [string, any][];
  const activities = els.activities ?? {};
  const roles = els.roles ?? {};
  const subActivityGraphs = els.subActivityGraphs ?? {};

  // Build structure: VS → activities → DAGs
  const vsFlows = useMemo(() => {
    return vsEntries
      .map(([vsId, vs]) => {
        // Resolve activity chain
        let actIds: string[] = [];
        if (Array.isArray(vs.activityIds) && vs.activityIds.length > 0) {
          actIds = vs.activityIds;
        } else if (vs.activityChainHead) {
          const chain: string[] = [];
          let cur: string | null = vs.activityChainHead;
          const seen = new Set<string>();
          while (cur && !seen.has(cur)) {
            seen.add(cur);
            chain.push(cur);
            cur = activities[cur]?.nextActivityId ?? null;
          }
          actIds = chain;
        }

        const actFlows = actIds
          .filter(aId => subActivityGraphs[aId]?.nodes?.length > 0)
          .map(aId => ({
            activityId: aId,
            activityName: activities[aId]?.name ?? aId,
            nodes: subActivityGraphs[aId].nodes as SubActivity[],
          }));

        return {
          vsId,
          vsName: vs.name ?? vsId,
          actFlows,
        };
      })
      .filter(vs => vs.actFlows.length > 0);
  }, [vsEntries, activities, subActivityGraphs]);

  const [expandedVs, setExpandedVs] = useState<Set<string>>(() => new Set(vsFlows.map(v => v.vsId)));

  const toggleVs = (vsId: string) => {
    setExpandedVs(prev => {
      const next = new Set(prev);
      if (next.has(vsId)) next.delete(vsId);
      else next.add(vsId);
      return next;
    });
  };

  // Total counts
  const totalDags = vsFlows.reduce((sum, vs) => sum + vs.actFlows.length, 0);

  if (totalDags === 0) return <EmptyState />;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: theme.bg }}>
      {/* Header */}
      <div style={{
        padding: "8px 16px", borderBottom: `1px solid ${theme.border}`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        background: theme.bgSurface,
      }}>
        <span style={{ color: theme.accent, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Activity Flows
        </span>
        <span style={{ color: theme.textFaint, fontSize: 11 }}>
          {totalDags} DAG{totalDags !== 1 ? "s" : ""} across {vsFlows.length} value stream{vsFlows.length !== 1 ? "s" : ""}
        </span>
        <div style={{ flex: 1 }} />
        {/* Legend */}
        <div style={{ display: "flex", gap: 14, fontSize: 10, color: theme.textDim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, border: `1px solid ${theme.activity}`, background: `${theme.activity}12`, display: "inline-block" }} />
            Step
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              width: 10, height: 10, transform: "rotate(45deg)",
              border: `1px solid ${theme.gate}`, background: `${theme.gate}20`, display: "inline-block",
            }} />
            Gate
          </span>
        </div>
      </div>

      {/* Scrollable swimlane body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {vsFlows.map(vs => (
          <div key={vs.vsId} style={{ marginBottom: 20 }}>
            {/* VS header (collapsible) */}
            <button
              onClick={() => toggleVs(vs.vsId)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "8px 12px",
                background: theme.accentDim, border: `1px solid ${theme.border}`,
                borderRadius: 6, cursor: "pointer", color: theme.accent,
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 11, transition: "transform 0.15s", transform: expandedVs.has(vs.vsId) ? "rotate(90deg)" : "rotate(0)" }}>
                ▸
              </span>
              {vs.vsName}
              <span style={{ color: theme.textFaint, fontSize: 11, fontWeight: 400 }}>
                ({vs.actFlows.length} activit{vs.actFlows.length === 1 ? "y" : "ies"})
              </span>
            </button>

            {/* Activity DAGs */}
            {expandedVs.has(vs.vsId) && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12, paddingLeft: 12 }}>
                {vs.actFlows.map(af => {
                  const gateCount = af.nodes.filter(n => n.nodeType === "gate").length;
                  return (
                    <div key={af.activityId} style={{
                      background: theme.bgCard, border: `1px solid ${theme.borderSubtle}`,
                      borderRadius: 8, overflow: "hidden",
                    }}>
                      {/* Activity label */}
                      <div style={{
                        padding: "6px 12px", borderBottom: `1px solid ${theme.borderSubtle}`,
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ color: theme.activity, fontSize: 12 }}>◆</span>
                        <span style={{ color: theme.text, fontSize: 12, fontWeight: 600 }}>{af.activityName}</span>
                        <span style={{ color: theme.textFaint, fontSize: 10 }}>
                          {af.nodes.length} steps · {gateCount} gate{gateCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {/* DAG */}
                      <div style={{ padding: "12px 8px", overflowX: "auto" }}>
                        <DagSvg dagNodes={af.nodes} roles={roles} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
