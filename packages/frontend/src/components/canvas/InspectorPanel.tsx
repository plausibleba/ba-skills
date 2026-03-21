import { useMemo } from "react";
import type { ScaffoldData, ScaffoldActivity, SubActivity, LifecycleState } from "../../types.ts";
import { humanizeId } from "../../lib/humanize-id.ts";
import { useThemeStore } from "../../store/theme-store.ts";
import { tv } from "../../theme.ts";

/* ── Inspector selection types ───────────────────────────────────────── */

export type InspectorTarget =
  | { kind: "stage"; activityId: string }
  | { kind: "capability"; capabilityId: string; activityId: string }
  | { kind: "role"; roleId: string }
  | { kind: "infoObject"; infoObjectId: string }
  | { kind: "techApp"; techAppId: string };

/* ── Colour palettes ─────────────────────────────────────────────────── */

const PALETTE = {
  dark: {
    role:  { bg: "rgba(59,130,246,0.15)",  fg: "#93c5fd", label: "People" },
    info:  { bg: "rgba(245,158,11,0.15)",  fg: "#fcd34d", label: "Information" },
    tech:  { bg: "rgba(34,197,94,0.15)",   fg: "#4ade80", label: "Technology" },
    activ: { bg: "rgba(139,92,246,0.15)",  fg: "#c4b5fd", label: "Process" },
    stage: { bg: "rgba(74,158,218,0.15)",  fg: "#93c5fd", label: "Stage" },
    cap:   { bg: "rgba(74,158,218,0.10)",  fg: "#7dd3fc", label: "Capability" },
  },
  light: {
    role:  { bg: "rgba(59,130,246,0.08)",  fg: "#2563eb", label: "People" },
    info:  { bg: "rgba(217,119,6,0.08)",   fg: "#b45309", label: "Information" },
    tech:  { bg: "rgba(5,150,105,0.08)",   fg: "#047857", label: "Technology" },
    activ: { bg: "rgba(139,92,246,0.08)",  fg: "#7c3aed", label: "Process" },
    stage: { bg: "rgba(59,130,246,0.08)",  fg: "#2563eb", label: "Stage" },
    cap:   { bg: "rgba(59,130,246,0.06)",  fg: "#1d4ed8", label: "Capability" },
  },
};

/* ── Section component ───────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: tv.textDim }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function ChipList({ items, color }: { items: { id: string; name: string }[]; color: { bg: string; fg: string } }) {
  if (items.length === 0) return <span className="text-[10px] italic" style={{ color: tv.textDim }}>None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item.id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: color.bg, color: color.fg }}>
          {item.name}
        </span>
      ))}
    </div>
  );
}

/* ── Activity Flow DAG ──────────────────────────────────────────────── */

/**
 * Renders a mini DAG of sub-activities within a stage.
 * If structured SubActivity[] data is available, renders a true DAG with branches.
 * Otherwise, falls back to rendering the string[] sub-activities as a linear chain.
 */
function ActivityFlowGraph({
  subActivities,
  dagNodes,
  pal,
}: {
  subActivities?: string[];
  dagNodes?: SubActivity[];
  pal: Pal;
}) {
  // If we have structured DAG data, render it
  if (dagNodes && dagNodes.length > 0) return <DagGraph nodes={dagNodes} pal={pal} />;

  // Fallback: render string sub-activities as a linear chain
  if (!subActivities || subActivities.length === 0) return null;

  const NODE_W = 140;
  const NODE_H = 28;
  const GAP_Y = 16;
  const PAD = 12;
  const totalH = subActivities.length * NODE_H + (subActivities.length - 1) * GAP_Y + PAD * 2;
  const svgW = NODE_W + PAD * 2;

  return (
    <svg width={svgW} height={totalH} className="w-full" viewBox={`0 0 ${svgW} ${totalH}`} preserveAspectRatio="xMidYMin meet">
      {subActivities.map((label, i) => {
        const y = PAD + i * (NODE_H + GAP_Y);
        const cx = svgW / 2;
        return (
          <g key={i}>
            <rect x={PAD} y={y} width={NODE_W} height={NODE_H} rx={6}
              fill={pal.activ.bg} stroke={pal.activ.fg} strokeWidth={0.5} opacity={0.9} />
            <text x={cx} y={y + NODE_H / 2 + 1} textAnchor="middle" dominantBaseline="central"
              fill={pal.activ.fg} fontSize={9} fontWeight={500}>
              {label.length > 22 ? label.slice(0, 20) + "…" : label}
            </text>
            {i < subActivities.length - 1 && (
              <line x1={cx} y1={y + NODE_H} x2={cx} y2={y + NODE_H + GAP_Y}
                stroke={pal.activ.fg} strokeWidth={1} opacity={0.4} markerEnd="url(#dagArrow)" />
            )}
          </g>
        );
      })}
      <defs>
        <marker id="dagArrow" viewBox="0 0 8 6" refX="8" refY="3" markerWidth="6" markerHeight="5" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={pal.activ.fg} opacity={0.5} />
        </marker>
      </defs>
    </svg>
  );
}

/**
 * Renders a structured DAG from SubActivity[] nodes.
 * Uses a simple layered layout: BFS from root nodes, level by level.
 */
function DagGraph({ nodes, pal }: { nodes: SubActivity[]; pal: Pal }) {
  const layout = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    // Find roots (no incoming edges)
    const hasIncoming = new Set<string>();
    for (const n of nodes) for (const nxt of n.nextIds ?? []) hasIncoming.add(nxt);
    const roots = nodes.filter(n => !hasIncoming.has(n.id));
    if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);

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
    // Any unvisited nodes
    for (const n of nodes) {
      if (!visited.has(n.id)) {
        layers.push([n]);
        visited.add(n.id);
      }
    }

    // Position nodes
    const NODE_W = 120;
    const NODE_H = 28;
    const GATE_R = 14;
    const GAP_X = 20;
    const GAP_Y = 20;
    const PAD = 16;

    const maxCols = Math.max(...layers.map(l => l.length), 1);
    const svgW = maxCols * (NODE_W + GAP_X) - GAP_X + PAD * 2;
    const svgH = layers.length * (NODE_H + GAP_Y) - GAP_Y + PAD * 2;

    const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
    layers.forEach((layer, li) => {
      const layerW = layer.length * (NODE_W + GAP_X) - GAP_X;
      const startX = (svgW - layerW) / 2;
      layer.forEach((node, ni) => {
        const w = node.nodeType === "gate" ? GATE_R * 2 : NODE_W;
        const h = node.nodeType === "gate" ? GATE_R * 2 : NODE_H;
        const x = startX + ni * (NODE_W + GAP_X) + (NODE_W - w) / 2;
        const y = PAD + li * (NODE_H + GAP_Y);
        positions.set(node.id, { x, y, w, h });
      });
    });

    return { positions, svgW, svgH, nodeMap };
  }, [nodes]);

  const { positions, svgW, svgH, nodeMap } = layout;

  return (
    <svg width={svgW} height={svgH} className="w-full" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMin meet">
      <defs>
        <marker id="dagArrowStruct" viewBox="0 0 8 6" refX="8" refY="3" markerWidth="6" markerHeight="5" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={pal.activ.fg} opacity={0.5} />
        </marker>
      </defs>
      {/* Edges */}
      {nodes.map(node => {
        const from = positions.get(node.id);
        if (!from) return null;
        return (node.nextIds ?? []).map(nxtId => {
          const to = positions.get(nxtId);
          if (!to) return null;
          const x1 = from.x + from.w / 2;
          const y1 = from.y + from.h;
          const x2 = to.x + to.w / 2;
          const y2 = to.y;
          const edgeLabel = node.edgeLabels?.[nxtId];
          return (
            <g key={`${node.id}-${nxtId}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={pal.activ.fg} strokeWidth={1} opacity={0.4} markerEnd="url(#dagArrowStruct)" />
              {edgeLabel && (
                <text x={(x1 + x2) / 2 + 4} y={(y1 + y2) / 2} fontSize={7} fill={pal.activ.fg} opacity={0.7}>
                  {edgeLabel}
                </text>
              )}
            </g>
          );
        });
      })}
      {/* Nodes */}
      {nodes.map(node => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        if (node.nodeType === "gate") {
          // Diamond
          const cx = pos.x + pos.w / 2;
          const cy = pos.y + pos.h / 2;
          const r = pos.w / 2;
          return (
            <g key={node.id}>
              <polygon
                points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
                fill={pal.stage.bg} stroke={pal.stage.fg} strokeWidth={0.8} />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
                fill={pal.stage.fg} fontSize={7} fontWeight={600}>
                {node.label.length > 8 ? node.label.slice(0, 7) + "…" : node.label}
              </text>
            </g>
          );
        }
        return (
          <g key={node.id}>
            <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={6}
              fill={pal.activ.bg} stroke={pal.activ.fg} strokeWidth={0.5} opacity={0.9} />
            <text x={pos.x + pos.w / 2} y={pos.y + pos.h / 2 + 1} textAnchor="middle" dominantBaseline="central"
              fill={pal.activ.fg} fontSize={8} fontWeight={500}>
              {node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Lifecycle State Diagram ─────────────────────────────────────────── */

/**
 * Renders a state diagram for an information object's lifecycle.
 * States are shown as rounded boxes, transitions as arrows.
 */
function LifecycleStateDiagram({ states, pal }: { states: LifecycleState[]; pal: Pal }) {
  if (!states || states.length === 0) return null;

  const NODE_W = 110;
  const NODE_H = 26;
  const GAP_Y = 24;
  const PAD = 16;

  // Simple layout: single column for linear lifecycles, multi-column for branching
  const stateMap = new Map(states.map(s => [s.id, s]));
  const hasIncoming = new Set<string>();
  for (const s of states) for (const t of s.transitionsTo ?? []) hasIncoming.add(t);
  const initials = states.filter(s => s.position === "initial" || !hasIncoming.has(s.id));
  if (initials.length === 0 && states.length > 0) initials.push(states[0]);

  // BFS layering
  const layers: LifecycleState[][] = [];
  const visited = new Set<string>();
  let queue = initials.map(s => s.id);
  while (queue.length > 0) {
    const layer: LifecycleState[] = [];
    const next: string[] = [];
    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      const state = stateMap.get(id);
      if (state) {
        layer.push(state);
        for (const t of state.transitionsTo ?? []) {
          if (!visited.has(t)) next.push(t);
        }
      }
    }
    if (layer.length > 0) layers.push(layer);
    queue = next;
  }
  for (const s of states) {
    if (!visited.has(s.id)) { layers.push([s]); visited.add(s.id); }
  }

  const maxCols = Math.max(...layers.map(l => l.length), 1);
  const svgW = maxCols * (NODE_W + 16) - 16 + PAD * 2;
  const svgH = layers.length * (NODE_H + GAP_Y) - GAP_Y + PAD * 2;

  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, li) => {
    const layerW = layer.length * (NODE_W + 16) - 16;
    const startX = (svgW - layerW) / 2;
    layer.forEach((state, si) => {
      positions.set(state.id, {
        x: startX + si * (NODE_W + 16),
        y: PAD + li * (NODE_H + GAP_Y),
      });
    });
  });

  const stateColor = (s: LifecycleState) => {
    if (s.position === "initial") return { bg: pal.stage.bg, fg: pal.stage.fg };
    if (s.position === "terminal") return { bg: pal.tech.bg, fg: pal.tech.fg };
    if (s.position === "decision") return { bg: pal.info.bg, fg: pal.info.fg };
    return { bg: pal.activ.bg, fg: pal.activ.fg };
  };

  return (
    <svg width={svgW} height={svgH} className="w-full" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMin meet">
      <defs>
        <marker id="stateArrow" viewBox="0 0 8 6" refX="8" refY="3" markerWidth="6" markerHeight="5" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={pal.info.fg} opacity={0.5} />
        </marker>
      </defs>
      {/* Transition edges */}
      {states.map(state => {
        const from = positions.get(state.id);
        if (!from) return null;
        return (state.transitionsTo ?? []).map(toId => {
          const to = positions.get(toId);
          if (!to) return null;
          return (
            <line key={`${state.id}-${toId}`}
              x1={from.x + NODE_W / 2} y1={from.y + NODE_H}
              x2={to.x + NODE_W / 2} y2={to.y}
              stroke={pal.info.fg} strokeWidth={1} opacity={0.4}
              markerEnd="url(#stateArrow)" />
          );
        });
      })}
      {/* State nodes */}
      {states.map(state => {
        const pos = positions.get(state.id);
        if (!pos) return null;
        const col = stateColor(state);
        const isTerminal = state.position === "terminal";
        return (
          <g key={state.id}>
            <rect x={pos.x} y={pos.y} width={NODE_W} height={NODE_H}
              rx={isTerminal ? NODE_H / 2 : 6}
              fill={col.bg} stroke={col.fg} strokeWidth={isTerminal ? 1.5 : 0.5} opacity={0.9} />
            <text x={pos.x + NODE_W / 2} y={pos.y + NODE_H / 2 + 1}
              textAnchor="middle" dominantBaseline="central"
              fill={col.fg} fontSize={8} fontWeight={isTerminal ? 700 : 500}>
              {state.label.length > 16 ? state.label.slice(0, 14) + "…" : state.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Cross-VS Usage derivation ───────────────────────────────────────── */

function deriveCrossVsUsage(
  elementId: string,
  elementKind: "capability" | "role" | "infoObject" | "techApp",
  scaffold: ScaffoldData,
): { vsId: string; vsName: string; activityId: string; activityName: string; capabilityName?: string }[] {
  const results: { vsId: string; vsName: string; activityId: string; activityName: string; capabilityName?: string }[] = [];
  const vsEntries = Object.entries(scaffold.elements.valueStreams) as [string, { name?: string }][];

  for (const [vsId, vs] of vsEntries) {
    // Walk all activities (linked list or activityIds)
    const activityIds = collectVsActivityIds(vsId, scaffold);
    for (const actId of activityIds) {
      const act = scaffold.elements.activities[actId] as ScaffoldActivity & Record<string, unknown>;
      if (!act) continue;

      if (elementKind === "capability") {
        const caps = (act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? []) as string[];
        if (caps.includes(elementId)) {
          results.push({
            vsId,
            vsName: vs?.name ?? humanizeId(vsId),
            activityId: actId,
            activityName: act.name ?? humanizeId(actId),
          });
        }
      } else {
        // Check capabilityPPIT for role/info/tech
        const ppitMap = act.capabilityPPIT as Record<string, { roleIds?: string[]; informationObjectIds?: string[]; technologyAppIds?: string[] }> | undefined;
        const caps = (act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? []) as string[];
        for (const capId of caps) {
          const ppit = ppitMap?.[capId];
          let found = false;
          if (elementKind === "role") {
            found = !!(ppit?.roleIds?.includes(elementId) || (!ppit && (act.performedByRoleIds as string[] | undefined)?.includes(elementId)));
          } else if (elementKind === "infoObject") {
            found = !!(ppit?.informationObjectIds?.includes(elementId));
          } else if (elementKind === "techApp") {
            found = !!(ppit?.technologyAppIds?.includes(elementId));
          }
          if (found) {
            const cap = scaffold.elements.capabilities[capId];
            results.push({
              vsId,
              vsName: vs?.name ?? humanizeId(vsId),
              activityId: actId,
              activityName: act.name ?? humanizeId(actId),
              capabilityName: cap?.name ?? humanizeId(capId),
            });
            break; // one match per activity is enough
          }
        }
      }
    }
  }
  return results;
}

function collectVsActivityIds(vsId: string, scaffold: ScaffoldData): string[] {
  const vs = scaffold.elements.valueStreams[vsId] as unknown as Record<string, unknown>;
  if (!vs) return [];
  // v5: chain walk
  if (vs.activityChainHead) {
    const ids: string[] = [];
    let cur = vs.activityChainHead as string;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      ids.push(cur);
      const act = scaffold.elements.activities[cur] as unknown as Record<string, unknown> | undefined;
      cur = (act?.nextActivityId as string) ?? "";
    }
    return ids;
  }
  // v4: activityIds array
  if (Array.isArray(vs.activityIds)) return vs.activityIds as string[];
  return [];
}

/* ── Inspector Panel ─────────────────────────────────────────────────── */

export function InspectorPanel({
  target,
  scaffold,
  onClose,
}: {
  target: InspectorTarget;
  scaffold: ScaffoldData;
  onClose: () => void;
}) {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const pal = isDark ? PALETTE.dark : PALETTE.light;

  return (
    <div className="flex h-full flex-col overflow-hidden border-l" style={{ borderColor: tv.borderSubtle, background: tv.bgSurface }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${tv.borderSubtle}` }}>
        <div className="flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{ background: pal[target.kind === "stage" ? "stage" : target.kind === "capability" ? "cap" : target.kind === "role" ? "role" : target.kind === "infoObject" ? "info" : "tech"].bg,
                     color: pal[target.kind === "stage" ? "stage" : target.kind === "capability" ? "cap" : target.kind === "role" ? "role" : target.kind === "infoObject" ? "info" : "tech"].fg }}>
            {pal[target.kind === "stage" ? "stage" : target.kind === "capability" ? "cap" : target.kind === "role" ? "role" : target.kind === "infoObject" ? "info" : "tech"].label}
          </span>
          <span className="text-[11px] font-medium" style={{ color: tv.textPrimary }}>Inspector</span>
        </div>
        <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-black/10" style={{ color: tv.textDim }}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
        {target.kind === "stage" && <StageInspector activityId={target.activityId} scaffold={scaffold} pal={pal} />}
        {target.kind === "capability" && <CapabilityInspector capabilityId={target.capabilityId} activityId={target.activityId} scaffold={scaffold} pal={pal} />}
        {target.kind === "role" && <RoleInspector roleId={target.roleId} scaffold={scaffold} pal={pal} />}
        {target.kind === "infoObject" && <InfoObjectInspector infoObjectId={target.infoObjectId} scaffold={scaffold} pal={pal} />}
        {target.kind === "techApp" && <TechAppInspector techAppId={target.techAppId} scaffold={scaffold} pal={pal} />}
      </div>
    </div>
  );
}

/* ── Stage Inspector ─────────────────────────────────────────────────── */

type Pal = typeof PALETTE.dark;

function StageInspector({ activityId, scaffold, pal }: { activityId: string; scaffold: ScaffoldData; pal: Pal }) {
  const act = scaffold.elements.activities[activityId] as ScaffoldActivity & Record<string, unknown>;
  if (!act) return null;

  const preOutcome = act.preOutcomeId ? scaffold.elements.outcomes[act.preOutcomeId] : null;
  const postOutcome = act.postOutcomeId ? scaffold.elements.outcomes[act.postOutcomeId] : null;
  const caps = ((act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? []) as string[])
    .map(id => ({ id, name: scaffold.elements.capabilities[id]?.name ?? humanizeId(id) }));
  const ppitMap = act.capabilityPPIT as Record<string, { roleIds?: string[]; activities?: string[]; informationObjectIds?: string[]; technologyAppIds?: string[] }> | undefined;

  // Aggregate all PPIT items across all capabilities
  const allRoles = new Set<string>();
  const allInfoObjs = new Set<string>();
  const allTechApps = new Set<string>();
  const allSubActivities: string[] = [];

  if (ppitMap) {
    for (const capId of Object.keys(ppitMap)) {
      const p = ppitMap[capId];
      p.roleIds?.forEach(r => allRoles.add(r));
      p.informationObjectIds?.forEach(i => allInfoObjs.add(i));
      p.technologyAppIds?.forEach(t => allTechApps.add(t));
      p.activities?.forEach(a => allSubActivities.push(a));
    }
  }
  // Fallback to activity-level
  if (allRoles.size === 0) {
    ((act.performedByRoleIds as string[] | undefined) ?? []).forEach(r => allRoles.add(r));
  }

  const roles = Array.from(allRoles).map(id => ({
    id, name: scaffold.elements.roles[id]?.name ?? humanizeId(id),
  }));
  const infoObjs = Array.from(allInfoObjs).map(id => ({
    id, name: ((scaffold.elements as Record<string, Record<string, { name?: string }>>).informationObjects?.[id]?.name ?? humanizeId(id)),
  }));
  const techApps = Array.from(allTechApps).map(id => ({
    id, name: ((scaffold.elements as Record<string, Record<string, { name?: string }>>).technologyApps?.[id]?.name ?? humanizeId(id)),
  }));
  const metrics = (act.metricIds ?? []).map(id => ({
    id, name: scaffold.elements.metrics[id]?.name ?? humanizeId(id),
  }));

  const description = (act as unknown as Record<string, unknown>).description as string | undefined;

  // Structured sub-activity DAG (if available)
  const dagNodes: SubActivity[] = scaffold.elements.subActivityGraphs?.[activityId]?.nodes ?? [];

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{act.name ?? humanizeId(activityId)}</h3>
        {description && <p className="mt-1 text-[11px] leading-relaxed" style={{ color: tv.textSecondary }}>{description}</p>}
      </div>

      {/* Lifecycle */}
      {(preOutcome || postOutcome) && (
        <Section title="Record Lifecycle">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded px-2 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>
              {preOutcome?.name ?? "—"}
            </span>
            <svg className="h-3 w-3" style={{ color: tv.textDim }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <span className="rounded px-2 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>
              {postOutcome?.name ?? "—"}
            </span>
          </div>
        </Section>
      )}

      {/* Capabilities */}
      <Section title={`Capabilities (${caps.length})`}>
        <ChipList items={caps} color={pal.cap} />
      </Section>

      {/* PPIT summary */}
      <Section title={`People (${roles.length})`}>
        <ChipList items={roles} color={pal.role} />
      </Section>

      {/* Activity Flow Graph — structured DAG or linear fallback */}
      {(allSubActivities.length > 0 || dagNodes.length > 0) && (
        <Section title="Activity Flow">
          <div className="rounded-lg p-2" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
            <ActivityFlowGraph
              subActivities={allSubActivities.length > 0 ? allSubActivities : undefined}
              dagNodes={dagNodes.length > 0 ? dagNodes : undefined}
              pal={pal}
            />
          </div>
        </Section>
      )}

      <Section title={`Information (${infoObjs.length})`}>
        <ChipList items={infoObjs} color={pal.info} />
      </Section>

      <Section title={`Technology (${techApps.length})`}>
        <ChipList items={techApps} color={pal.tech} />
      </Section>

      {metrics.length > 0 && (
        <Section title={`Metrics (${metrics.length})`}>
          <ChipList items={metrics} color={pal.stage} />
        </Section>
      )}
    </>
  );
}

/* ── Capability Inspector ────────────────────────────────────────────── */

function CapabilityInspector({ capabilityId, activityId, scaffold, pal }: { capabilityId: string; activityId: string; scaffold: ScaffoldData; pal: Pal }) {
  const cap = scaffold.elements.capabilities[capabilityId];
  const act = scaffold.elements.activities[activityId] as ScaffoldActivity & Record<string, unknown>;
  const ppitMap = act ? (act.capabilityPPIT as Record<string, { roleIds?: string[]; activities?: string[]; informationObjectIds?: string[]; technologyAppIds?: string[] }> | undefined) : undefined;
  const ppit = ppitMap?.[capabilityId];

  const description = (cap as unknown as Record<string, unknown> | undefined)?.description as string | undefined;

  const roles = (ppit?.roleIds ?? (act?.performedByRoleIds as string[] | undefined) ?? [])
    .map(id => ({ id, name: scaffold.elements.roles[id]?.name ?? humanizeId(id) }));
  const subActivities = ppit?.activities ?? [];
  const infoObjs = (ppit?.informationObjectIds ?? [])
    .map(id => ({ id, name: ((scaffold.elements as Record<string, Record<string, { name?: string }>>).informationObjects?.[id]?.name ?? humanizeId(id)) }));
  const techApps = (ppit?.technologyAppIds ?? [])
    .map(id => ({ id, name: ((scaffold.elements as Record<string, Record<string, { name?: string }>>).technologyApps?.[id]?.name ?? humanizeId(id)) }));

  // Cross-VS usage
  const crossVs = useMemo(() => deriveCrossVsUsage(capabilityId, "capability", scaffold), [capabilityId, scaffold]);

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{cap?.name ?? humanizeId(capabilityId)}</h3>
        {description && <p className="mt-1 text-[11px] leading-relaxed" style={{ color: tv.textSecondary }}>{description}</p>}
        <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
          on stage: <span style={{ color: tv.textSecondary }}>{act?.name ?? humanizeId(activityId)}</span>
        </p>
      </div>

      <Section title={`People (${roles.length})`}>
        <ChipList items={roles} color={pal.role} />
      </Section>

      {subActivities.length > 0 && (
        <Section title={`Sub-Activities (${subActivities.length})`}>
          <div className="space-y-0.5">
            {subActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-[3px] h-1 w-1 flex-shrink-0 rounded-full" style={{ background: pal.activ.fg }} />
                <span className="text-[10px] leading-tight" style={{ color: pal.activ.fg }}>{a}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Information (${infoObjs.length})`}>
        <ChipList items={infoObjs} color={pal.info} />
      </Section>

      <Section title={`Technology (${techApps.length})`}>
        <ChipList items={techApps} color={pal.tech} />
      </Section>

      {/* Cross-VS Usage */}
      {crossVs.length > 1 && (
        <Section title={`Shared Across ${new Set(crossVs.map(u => u.vsId)).size} Value Streams`}>
          <div className="space-y-1">
            {crossVs.map((u, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="rounded px-1.5 py-0.5" style={{ background: pal.cap.bg, color: pal.cap.fg }}>{u.vsName}</span>
                <span style={{ color: tv.textDim }}>→</span>
                <span style={{ color: tv.textSecondary }}>{u.activityName}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/* ── Role Inspector ──────────────────────────────────────────────────── */

function RoleInspector({ roleId, scaffold, pal }: { roleId: string; scaffold: ScaffoldData; pal: Pal }) {
  const role = scaffold.elements.roles[roleId];
  const crossVs = useMemo(() => deriveCrossVsUsage(roleId, "role", scaffold), [roleId, scaffold]);
  const uniqueVs = new Set(crossVs.map(u => u.vsId));

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{role?.name ?? humanizeId(roleId)}</h3>
        <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
          Participates in {crossVs.length} activit{crossVs.length !== 1 ? "ies" : "y"} across {uniqueVs.size} value stream{uniqueVs.size !== 1 ? "s" : ""}
        </p>
      </div>

      <Section title="Usage Map">
        <div className="space-y-1">
          {crossVs.map((u, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="rounded px-1.5 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>{u.vsName}</span>
              <span style={{ color: tv.textDim }}>→</span>
              <span style={{ color: tv.textSecondary }}>{u.activityName}</span>
              {u.capabilityName && (
                <>
                  <span style={{ color: tv.textDim }}>·</span>
                  <span className="italic" style={{ color: tv.textDim }}>{u.capabilityName}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ── Info Object Inspector ───────────────────────────────────────────── */

function InfoObjectInspector({ infoObjectId, scaffold, pal }: { infoObjectId: string; scaffold: ScaffoldData; pal: Pal }) {
  const el = ((scaffold.elements as Record<string, Record<string, { name?: string; description?: string; lifecycleStates?: LifecycleState[] }>>).informationObjects)?.[infoObjectId];
  const crossVs = useMemo(() => deriveCrossVsUsage(infoObjectId, "infoObject", scaffold), [infoObjectId, scaffold]);
  const uniqueVs = new Set(crossVs.map(u => u.vsId));
  const lifecycleStates = (el as { lifecycleStates?: LifecycleState[] } | undefined)?.lifecycleStates;

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{el?.name ?? humanizeId(infoObjectId)}</h3>
        {(el as { description?: string } | undefined)?.description && (
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: tv.textSecondary }}>{(el as { description?: string }).description}</p>
        )}
        <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
          Referenced in {crossVs.length} activit{crossVs.length !== 1 ? "ies" : "y"} across {uniqueVs.size} value stream{uniqueVs.size !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Lifecycle State Diagram */}
      {lifecycleStates && lifecycleStates.length > 0 && (
        <Section title="Lifecycle States">
          <div className="rounded-lg p-2" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
            <LifecycleStateDiagram states={lifecycleStates} pal={pal} />
          </div>
        </Section>
      )}

      <Section title="Usage Map">
        <div className="space-y-1">
          {crossVs.map((u, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="rounded px-1.5 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>{u.vsName}</span>
              <span style={{ color: tv.textDim }}>→</span>
              <span style={{ color: tv.textSecondary }}>{u.activityName}</span>
              {u.capabilityName && (
                <>
                  <span style={{ color: tv.textDim }}>·</span>
                  <span className="italic" style={{ color: tv.textDim }}>{u.capabilityName}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ── Tech App Inspector ──────────────────────────────────────────────── */

function TechAppInspector({ techAppId, scaffold, pal }: { techAppId: string; scaffold: ScaffoldData; pal: Pal }) {
  const el = ((scaffold.elements as Record<string, Record<string, { name?: string }>>).technologyApps)?.[techAppId];
  const crossVs = useMemo(() => deriveCrossVsUsage(techAppId, "techApp", scaffold), [techAppId, scaffold]);
  const uniqueVs = new Set(crossVs.map(u => u.vsId));

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>{el?.name ?? humanizeId(techAppId)}</h3>
        <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
          Used in {crossVs.length} activit{crossVs.length !== 1 ? "ies" : "y"} across {uniqueVs.size} value stream{uniqueVs.size !== 1 ? "s" : ""}
        </p>
      </div>

      <Section title="Usage Map">
        <div className="space-y-1">
          {crossVs.map((u, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="rounded px-1.5 py-0.5" style={{ background: pal.stage.bg, color: pal.stage.fg }}>{u.vsName}</span>
              <span style={{ color: tv.textDim }}>→</span>
              <span style={{ color: tv.textSecondary }}>{u.activityName}</span>
              {u.capabilityName && (
                <>
                  <span style={{ color: tv.textDim }}>·</span>
                  <span className="italic" style={{ color: tv.textDim }}>{u.capabilityName}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
