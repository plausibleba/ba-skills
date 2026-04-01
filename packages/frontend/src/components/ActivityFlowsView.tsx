// ActivityFlowsView — Dedicated Workbench tab showing all sub-activity DAGs
// in a swimlane layout grouped by value stream.
//
// Each activity's DAG is rendered as an SVG with:
//   - Rounded rect nodes for work steps
//   - Diamond nodes for decision gates
//   - Curved connectors with edge labels for branches
//   - Role annotations on each node
//   - Proper sizing (capped at natural pixel width, not stretched)

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
  connector: "#64748b",
};

// ── Layout constants ──

const NODE_W = 130;
const NODE_H = 32;
const GATE_R = 16;
const GAP_X = 24;
const GAP_Y = 40; // taller gap for edge labels
const PAD = 16;

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
  for (const n of nodes) {
    if (!visited.has(n.id)) {
      layers.push([n]);
      visited.add(n.id);
    }
  }

  // Detect upstream edges for extra margin
  const layerOf = new Map<string, number>();
  layers.forEach((layer, li) => layer.forEach(n => layerOf.set(n.id, li)));
  const hasUpstream = nodes.some(n =>
    (n.nextIds ?? []).some(nxt => (layerOf.get(nxt) ?? 999) <= (layerOf.get(n.id) ?? 0))
  );
  const ROUTE_MARGIN = hasUpstream ? 20 : 0;

  const maxCols = Math.max(...layers.map(l => l.length), 1);
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

// ── Edge path builder — elbow connectors (matches Inspector DagGraph) ──

function buildEdgePath(
  from: LayoutNode,
  to: LayoutNode,
  svgW: number,
): { d: string; labelX: number; labelY: number } {
  const fromCx = from.x + from.w / 2;
  const fromBot = from.y + from.h;
  const toCx = to.x + to.w / 2;
  const toTop = to.y;
  const isUpstream = toTop <= fromBot + 4;

  if (!isUpstream && fromCx === toCx) {
    // Same column, downward: straight line
    const d = `M${fromCx},${fromBot} L${toCx},${toTop}`;
    return { d, labelX: fromCx + 6, labelY: (fromBot + toTop) / 2 };
  }

  if (!isUpstream) {
    // Normal downward with horizontal offset: elbow from bottom
    const midY = (fromBot + toTop) / 2;
    const d = `M${fromCx},${fromBot} L${fromCx},${midY} L${toCx},${midY} L${toCx},${toTop}`;
    return { d, labelX: (fromCx + toCx) / 2, labelY: midY - 3 };
  }

  // Upstream or same-level: exit from the OUTER side (toward nearest SVG edge),
  // route along the SVG perimeter so the path never crosses intermediate nodes.
  const fromMidX = from.x + from.w / 2;
  const svgMidX = svgW / 2;
  // Choose the side closest to the SVG boundary — pushes the loop outward
  const goRight = fromMidX >= svgMidX;
  const exitX = goRight ? from.x + from.w : from.x;
  const exitY = from.y + from.h / 2;
  const MARGIN = 18;
  // Route to the SVG boundary edge (well outside all nodes)
  const outerX = goRight ? svgW - PAD / 2 : PAD / 2;
  const d = `M${exitX},${exitY} L${outerX},${exitY} L${outerX},${toTop - MARGIN} L${toCx},${toTop - MARGIN} L${toCx},${toTop}`;
  return { d, labelX: outerX + (goRight ? 4 : -4), labelY: (exitY + (toTop - MARGIN)) / 2 };
}

// ── Single DAG SVG renderer ──

function DagSvg({ dagNodes, roles, activityId }: { dagNodes: SubActivity[]; roles: Record<string, any>; activityId: string }) {
  const layout = useMemo(() => layoutDag(dagNodes), [dagNodes]);
  const { nodes: lnodes, svgW, svgH } = layout;

  if (!lnodes.length) return null;

  const posMap = new Map(lnodes.map(ln => [ln.node.id, ln]));

  // Unique marker ID per DAG to avoid SVG id collisions
  const markerId = `flowArrow-${activityId}`;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      preserveAspectRatio="xMidYMin meet"
      style={{
        width: Math.min(svgW, 800),
        maxWidth: "100%",
        height: "auto",
        display: "block",
        margin: "0 auto",
      }}
    >
      <defs>
        <marker id={markerId} viewBox="0 0 8 6" refX="7" refY="3" markerWidth="5" markerHeight="4" orient="auto">
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
          const { d, labelX, labelY } = buildEdgePath(from, to, layout.svgW);

          return (
            <g key={`${node.id}-${nxtId}`}>
              <path d={d} fill="none" stroke={theme.connector} strokeWidth={1} opacity={0.5}
                markerEnd={`url(#${markerId})`} />
              {edgeLabel && (
                <text x={labelX} y={labelY} textAnchor="middle" fontSize={8}
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
                fill={`${theme.gate}18`} stroke={theme.gate} strokeWidth={0.8} />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
                fill={theme.gate} fontSize={8} fontWeight={600}>
                {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
              </text>
            </g>
          );
        }

        return (
          <g key={node.id}>
            <rect x={x} y={y} width={w} height={h} rx={6}
              fill={`${theme.activity}10`} stroke={theme.activity} strokeWidth={0.6} opacity={0.9} />
            <text x={x + w / 2} y={y + (roleName ? h / 2 - 3 : h / 2 + 1)}
              textAnchor="middle" dominantBaseline="central"
              fill={theme.text} fontSize={9} fontWeight={500}>
              {node.label.length > 20 ? node.label.slice(0, 18) + "…" : node.label}
            </text>
            {roleName && (
              <text x={x + w / 2} y={y + h / 2 + 7} textAnchor="middle" dominantBaseline="central"
                fill={theme.role} fontSize={7} opacity={0.6}>
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
        No sub-activity flows yet. Run <strong style={{ color: theme.accent }}>Derive Activity Flows</strong> enrichment
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
    // Track which activity IDs are claimed by a value stream
    const claimedActivityIds = new Set<string>();

    const flows = vsEntries
      .map(([vsId, vs]) => {
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
        } else {
          // Fallback: find activities that reference this value stream
          actIds = Object.entries(activities)
            .filter(([, act]: [string, any]) => act.valueStreamId === vsId)
            .map(([id]) => id);
        }

        for (const aId of actIds) claimedActivityIds.add(aId);

        const actFlows = actIds
          .filter(aId => subActivityGraphs[aId]?.nodes?.length > 0)
          .map(aId => ({
            activityId: aId,
            activityName: activities[aId]?.name ?? aId,
            nodes: subActivityGraphs[aId].nodes as SubActivity[],
          }));

        return { vsId, vsName: vs.name ?? vsId, actFlows };
      })
      .filter(vs => vs.actFlows.length > 0);

    // Catch any orphaned DAGs not claimed by a value stream
    const orphanFlows = Object.keys(subActivityGraphs)
      .filter(aId => !claimedActivityIds.has(aId) && subActivityGraphs[aId]?.nodes?.length > 0)
      .map(aId => ({
        activityId: aId,
        activityName: activities[aId]?.name ?? aId,
        nodes: subActivityGraphs[aId].nodes as SubActivity[],
      }));
    if (orphanFlows.length > 0) {
      flows.push({ vsId: "__uncategorised__", vsName: "Other Activities", actFlows: orphanFlows });
    }

    return flows;
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
        <div style={{ display: "flex", gap: 14, fontSize: 10, color: theme.textDim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, border: `1px solid ${theme.activity}`, background: `${theme.activity}12`, display: "inline-block" }} />
            Step
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              width: 8, height: 8, transform: "rotate(45deg)",
              border: `1px solid ${theme.gate}`, background: `${theme.gate}18`, display: "inline-block",
            }} />
            Gate
          </span>
        </div>
      </div>

      {/* Scrollable swimlane body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {vsFlows.map(vs => (
          <div key={vs.vsId} style={{ marginBottom: 16 }}>
            {/* VS header */}
            <button
              onClick={() => toggleVs(vs.vsId)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "6px 12px",
                background: theme.accentDim, border: `1px solid ${theme.border}`,
                borderRadius: 6, cursor: "pointer", color: theme.accent,
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 10, transition: "transform 0.15s", transform: expandedVs.has(vs.vsId) ? "rotate(90deg)" : "rotate(0)" }}>
                ▸
              </span>
              {vs.vsName}
              <span style={{ color: theme.textFaint, fontSize: 10, fontWeight: 400 }}>
                ({vs.actFlows.length} activit{vs.actFlows.length === 1 ? "y" : "ies"})
              </span>
            </button>

            {/* Activity DAGs in a responsive grid */}
            {expandedVs.has(vs.vsId) && (
              <div style={{
                marginTop: 8,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 10,
                paddingLeft: 8,
              }}>
                {vs.actFlows.map(af => {
                  const gateCount = af.nodes.filter(n => n.nodeType === "gate").length;
                  return (
                    <div key={af.activityId} style={{
                      background: theme.bgCard, border: `1px solid ${theme.borderSubtle}`,
                      borderRadius: 8, overflow: "hidden",
                    }}>
                      <div style={{
                        padding: "5px 10px", borderBottom: `1px solid ${theme.borderSubtle}`,
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{ color: theme.activity, fontSize: 11 }}>◆</span>
                        <span style={{ color: theme.text, fontSize: 11, fontWeight: 600 }}>{af.activityName}</span>
                        <span style={{ color: theme.textFaint, fontSize: 9 }}>
                          {af.nodes.length} steps · {gateCount} gate{gateCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div style={{ padding: "10px 6px", overflowX: "auto" }}>
                        <DagSvg dagNodes={af.nodes} roles={roles} activityId={af.activityId} />
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
