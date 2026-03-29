// Structured Graph Explorer — card-based C4-style drill-in/out diagrams
// Session 27 — Phase 3a: L1→L2→L3→L4 with context preservation
//
// Context model: when drilling in, the parent level stays visible as a compact
// column on the left, connected to the detail area by a dotted line divider.
//
// Drill hierarchy:
//   L1  Operating Model — VS boxes in zone swim-lanes
//   L2  Value Stream — stage chain (vertical) with transition labels
//   L3  Stage Detail — entry/exit, stakeholders, metrics, capabilities (vertical)
//   L4  Capability PPIT — roles, sub-activities, info objects, technology
//   L5  Activity Flow — sub-activity DAG with decision gates & branch labels

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { InspectorPanel, type InspectorTarget } from "./canvas/InspectorPanel";
import { useCanvasStore, type EnrichSection } from "../store/canvas-store.ts";
import { useEnrichmentStore } from "../store/enrichment-store";

// ── Theme (aligned with WorkbenchView dulled palette) ──

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
  valueStream: "#3b82f6",
  activity: "#22c55e",
  capability: "#d4a053",
  role: "#ef4444",
  concept: "#a855f7",
  metric: "#06b6d4",
  control: "#64748b",
  outcome: "#6b7280",
  infoObject: "#a855f7",
  appFunction: "#6366f1",
  subActivity: "#22c55e",
  gate: "#f59e0b",
  zone: "rgba(212, 160, 83, 0.04)",
  zoneBorder: "rgba(212, 160, 83, 0.2)",
};

// ── Types ──

interface DrillLevel {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  vsId?: string;
  activityId?: string;
  capabilityId?: string;
}

interface SimpleNode {
  id: string;
  label: string;
  type: string;
  subtitle?: string;
  /** Transition label to show ABOVE this item (outcome name between stages) */
  transitionLabel?: string;
  data?: any;
}

interface SectionData {
  id: string;
  label: string;
  items: SimpleNode[];
}

// ── Helpers ──

function resolveActivityIds(vs: any, acts: Record<string, any>): string[] {
  // If activityIds is a non-empty array, use it directly
  if (Array.isArray(vs.activityIds) && vs.activityIds.length > 0) return vs.activityIds;

  // Fall through to chain resolution (handles missing activityIds OR empty array)
  const head = vs.activityChainHead;
  if (head) {
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur: string | null = head;
    while (cur && !seen.has(cur) && acts[cur]) {
      seen.add(cur);
      chain.push(cur);
      cur = acts[cur].nextActivityId ?? null;
    }
    if (chain.length > 0) return chain;
  }

  // Last resort: scan activities whose valueStreamId matches this VS
  const vsId = vs.id;
  if (vsId) {
    const matched = Object.entries(acts)
      .filter(([, a]: [string, any]) => a.valueStreamId === vsId)
      .sort(([, a]: [string, any], [, b]: [string, any]) =>
        (a.stageNumber ?? a.order ?? 0) - (b.stageNumber ?? b.order ?? 0),
      )
      .map(([id]) => id);
    if (matched.length > 0) return matched;
  }

  return [];
}

function getZone(vs: any): string {
  return vs.layoutZone ?? vs.zone ?? "default";
}

function typeColor(type: string): string {
  return (theme as any)[type] || theme.textDim;
}

function typeIcon(type: string): string {
  const m: Record<string, string> = {
    valueStream: "⟶", activity: "◆", capability: "⬡", role: "👤",
    metric: "📊", outcome: "○", infoObject: "◇", appFunction: "⚙",
    subActivity: "▸", gate: "◇",
  };
  return m[type] || "•";
}

// ── Data builders ──

function buildL1Data(scaffold: any): SectionData[] {
  const el = scaffold.elements;
  const vsEntries = Object.entries(el.valueStreams || {}) as [string, any][];
  const acts = el.activities || {};

  // Stamp id onto each VS object if not already present (key IS the id)
  for (const [key, vs] of vsEntries) {
    if (!vs.id) vs.id = key;
  }

  // Group by zone
  const zoneMap = new Map<string, any[]>();
  for (const [, vs] of vsEntries) {
    const z = getZone(vs);
    if (!zoneMap.has(z)) zoneMap.set(z, []);
    zoneMap.get(z)!.push(vs);
  }

  const layoutZones = (scaffold.layoutZones || []) as { id: string; label: string; row: number }[];
  const zoneOrder = layoutZones.length > 0
    ? layoutZones.sort((a, b) => a.row - b.row).map(z => z.id)
    : [...zoneMap.keys()].sort();
  const zoneLabelMap = new Map(layoutZones.map(z => [z.id, z.label]));

  const sections: SectionData[] = [];
  for (const zId of zoneOrder) {
    const vsList = zoneMap.get(zId) || [];
    if (vsList.length === 0) continue;
    const label = zoneLabelMap.get(zId) || zId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    sections.push({
      id: `zone-${zId}`,
      label,
      items: vsList.map(vs => ({
        id: vs.id,
        label: vs.name || vs.id,
        type: "valueStream",
        subtitle: `${resolveActivityIds(vs, acts).length} stages`,
        data: vs,
      })),
    });
  }

  return sections;
}

function buildL2Data(scaffold: any, vsId: string): SectionData[] {
  const el = scaffold.elements;
  const vs = el.valueStreams?.[vsId];
  if (!vs) return [];
  const acts = el.activities || {};
  const outcomes = el.outcomes || {};
  const actIds = resolveActivityIds(vs, acts);

  return [{
    id: "stages",
    label: vs.name || vsId,
    items: actIds.map((aId, idx) => {
      const act = acts[aId];
      const capCount = (act?.requiresCapabilityIds || act?.enabledByCapabilityIds || []).length;
      const roleCount = (act?.performedByRoleIds || []).length;

      // Transition label: the post-outcome of the PREVIOUS stage (= pre-outcome of this stage)
      let transitionLabel: string | undefined;
      if (idx > 0 && act?.preOutcomeId && outcomes[act.preOutcomeId]) {
        transitionLabel = outcomes[act.preOutcomeId].name;
      }

      return {
        id: aId,
        label: act?.name || aId,
        type: "activity",
        subtitle: `${roleCount} roles · ${capCount} capabilities`,
        transitionLabel,
        data: act,
      };
    }),
  }];
}

function buildL3Data(scaffold: any, activityId: string): SectionData[] {
  const el = scaffold.elements;
  const act = el.activities?.[activityId];
  if (!act) return [];
  const outcomes = el.outcomes || {};
  const roles = el.roles || {};
  const metrics = el.metrics || {};
  const caps = el.capabilities || {};

  const sections: SectionData[] = [];

  // 1. Entry/Exit
  const states: SimpleNode[] = [];
  if (act.preOutcomeId && outcomes[act.preOutcomeId]) {
    states.push({ id: `entry-${act.preOutcomeId}`, label: `Entry: ${outcomes[act.preOutcomeId].name}`, type: "outcome" });
  }
  if (act.postOutcomeId && outcomes[act.postOutcomeId]) {
    states.push({ id: `exit-${act.postOutcomeId}`, label: `Exit: ${outcomes[act.postOutcomeId].name}`, type: "outcome" });
  }
  if (states.length) sections.push({ id: "states", label: "State Transitions", items: states });

  // 2. Stakeholders
  const roleItems: SimpleNode[] = (act.performedByRoleIds || [])
    .filter((rId: string) => roles[rId])
    .map((rId: string) => ({ id: rId, label: roles[rId].name || rId, type: "role" }));
  if (roleItems.length) sections.push({ id: "stakeholders", label: "Stakeholders", items: roleItems });

  // 3. Metrics
  const metricItems: SimpleNode[] = (act.metricIds || [])
    .filter((mId: string) => metrics[mId])
    .map((mId: string) => ({ id: mId, label: metrics[mId].name || mId, type: "metric" }));
  if (metricItems.length) sections.push({ id: "metrics", label: "Metrics", items: metricItems });

  // 4. Capabilities (drillable)
  const capItems: SimpleNode[] = (act.requiresCapabilityIds || act.enabledByCapabilityIds || [])
    .filter((cId: string) => caps[cId])
    .map((cId: string) => ({ id: cId, label: caps[cId].name || cId, type: "capability", data: caps[cId] }));
  if (capItems.length) sections.push({ id: "capabilities", label: "Capabilities", items: capItems });

  // 5. Activity Flow (drillable into L5 if DAG exists)
  // Check both the workbench scaffold and the canvas store's live scaffold (enrichment may have updated it)
  const dag = el.subActivityGraphs?.[activityId]
    ?? (useCanvasStore.getState().scaffoldData as any)?.elements?.subActivityGraphs?.[activityId];
  if (dag?.nodes?.length > 0) {
    const gateCount = dag.nodes.filter((n: any) => n.nodeType === "gate").length;
    sections.push({
      id: "activityFlow",
      label: "Activity Flow",
      items: [{
        id: activityId,
        label: `${dag.nodes.length} steps · ${gateCount} decision gate${gateCount !== 1 ? "s" : ""}`,
        type: "activity",
        subtitle: "Double-click to view sub-activity DAG",
      }],
    });
  }

  return sections;
}

function buildL4Data(scaffold: any, capabilityId: string, activityId?: string): SectionData[] {
  const el = scaffold.elements;
  const cap = el.capabilities?.[capabilityId];
  if (!cap) return [];
  const roles = el.roles || {};
  const infoObjs = el.informationObjects || {};
  const appFuncs = el.applicationFunctions || {};

  // Find PPIT data
  let ppit: any = null;
  if (activityId) ppit = el.activities?.[activityId]?.capabilityPPIT?.[capabilityId];
  if (!ppit) {
    for (const [, act] of Object.entries(el.activities || {}) as [string, any][]) {
      if (act.capabilityPPIT?.[capabilityId]) { ppit = act.capabilityPPIT[capabilityId]; break; }
    }
  }

  const sections: SectionData[] = [];
  const ppitRoles = ppit?.roleIds || ppit?.performedByRoleIds || [];
  if (ppitRoles.length) {
    sections.push({ id: "people", label: "People (Roles)", items: ppitRoles.map((rId: string) => ({ id: rId, label: roles[rId]?.name || rId, type: "role" })) });
  }
  const subActs = ppit?.subActivities || [];
  if (subActs.length) {
    sections.push({ id: "process", label: "Process (Sub-Activities)", items: subActs.map((sa: any, i: number) => ({ id: `sa-${i}`, label: sa.name || sa, type: "subActivity" })) });
  }
  const ios = ppit?.informationObjectIds || [];
  if (ios.length) {
    sections.push({ id: "info", label: "Information Objects", items: ios.map((ioId: string) => ({ id: ioId, label: infoObjs[ioId]?.name || ioId, type: "infoObject" })) });
  }
  const techs = ppit?.technologyAppIds || ppit?.applicationFunctionIds || [];
  if (techs.length) {
    sections.push({ id: "tech", label: "Technology", items: techs.map((tId: string) => ({ id: tId, label: appFuncs[tId]?.name || tId, type: "appFunction" })) });
  }

  if (sections.length === 0) {
    sections.push({ id: "empty", label: "No PPIT Data", items: [{ id: "none", label: "No PPIT breakdown available for this capability", type: "outcome" }] });
  }
  return sections;
}

function buildL5Data(scaffold: any, activityId: string): SectionData[] {
  const el = scaffold.elements;
  // Check both workbench scaffold and canvas store's live scaffold
  const dag = el.subActivityGraphs?.[activityId]
    ?? (useCanvasStore.getState().scaffoldData as any)?.elements?.subActivityGraphs?.[activityId];
  if (!dag?.nodes?.length) return [];
  const roles = el.roles || {};

  // BFS layer ordering for display
  const nodes: any[] = dag.nodes;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const hasIncoming = new Set<string>();
  for (const n of nodes) for (const nxt of n.nextIds ?? []) hasIncoming.add(nxt);
  const roots = nodes.filter(n => !hasIncoming.has(n.id));
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);

  const ordered: any[] = [];
  const visited = new Set<string>();
  let queue = roots.map(r => r.id);
  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      const node = nodeMap.get(id);
      if (node) {
        ordered.push(node);
        for (const nxt of node.nextIds ?? []) {
          if (!visited.has(nxt)) next.push(nxt);
        }
      }
    }
    queue = next;
  }
  // Catch unvisited
  for (const n of nodes) if (!visited.has(n.id)) ordered.push(n);

  const items: SimpleNode[] = ordered.map((node: any) => {
    const roleName = node.roleId && roles[node.roleId] ? roles[node.roleId].name : undefined;
    const branchCount = (node.nextIds ?? []).length;
    const isGate = node.nodeType === "gate";
    const edgeLabels = node.edgeLabels ?? {};
    const branchNames = Object.values(edgeLabels).join(" / ");

    // Build subtitle
    const parts: string[] = [];
    if (isGate && branchNames) parts.push(`→ ${branchNames}`);
    else if (isGate && branchCount > 1) parts.push(`${branchCount} branches`);
    if (roleName) parts.push(roleName);
    if (node.outcome && !isGate) parts.push(node.outcome);

    // Transition label: for non-root nodes, show the edge label from parent
    let transitionLabel: string | undefined;
    // Find a parent that points to this node and has an edgeLabel for it
    for (const parent of dag.nodes) {
      if ((parent.nextIds ?? []).includes(node.id) && parent.edgeLabels?.[node.id]) {
        transitionLabel = parent.edgeLabels[node.id];
        break;
      }
    }

    return {
      id: node.id,
      label: `${isGate ? "◇ " : ""}${node.label}`,
      type: isGate ? "gate" : "subActivity",
      subtitle: parts.join(" · ") || undefined,
      transitionLabel,
      data: node,
    };
  });

  return [{ id: "dag", label: "Activity Flow", items }];
}

// ── Flow arrow connector with optional transition label ──

function FlowArrow({ compact, label }: { compact: boolean; label?: string }) {
  const h = compact ? 12 : (label ? 32 : 20);
  const color = theme.activity;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: h, flexShrink: 0, opacity: 0.6 }}>
      {label && !compact && (
        <div style={{
          fontSize: 9, color: theme.textDim, lineHeight: 1,
          maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textAlign: "center", marginBottom: 2,
        }} title={label}>
          {label}
        </div>
      )}
      <svg width="12" height={compact ? 12 : 16} viewBox={`0 0 12 ${compact ? 12 : 16}`} style={{ flexShrink: 0 }}>
        <line x1="6" y1="0" x2="6" y2={compact ? 8 : 12} stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points={compact ? "3,7 9,7 6,12" : "3,11 9,11 6,16"} fill={color} />
      </svg>
    </div>
  );
}

// ── Card renderer ──

function SectionCards({
  sections,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onDoubleClick,
  drillableTypes,
  compact = false,
  highlightId,
  showFlowArrows = false,
}: {
  sections: SectionData[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string, type: string) => void;
  onHover: (id: string | null) => void;
  onDoubleClick: (id: string, type: string) => void;
  drillableTypes: Set<string>;
  compact?: boolean;
  highlightId?: string;
  showFlowArrows?: boolean;
}) {
  const itemH = compact ? 28 : 40;
  const labelSize = compact ? 9 : 12;
  const sectionLabelSize = compact ? 8 : 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 14, padding: compact ? 6 : 14 }}>
      {sections.map(sec => (
        <div key={sec.id} style={{
          border: `1px solid ${theme.zoneBorder}`,
          borderRadius: 8,
          padding: compact ? "5px 6px" : "10px 12px",
          background: theme.zone,
          boxShadow: compact ? "none" : "0 1px 4px rgba(0,0,0,0.2)",
          maxWidth: compact ? undefined : 480,
        }}>
          <div style={{
            color: theme.textFaint, fontSize: sectionLabelSize, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: compact ? 3 : 6,
            paddingBottom: compact ? 2 : 4,
            borderBottom: `1px solid ${theme.borderSubtle}`,
          }}>
            {sec.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {sec.items.map((item, idx) => {
              const isSelected = selectedId === item.id;
              const isHovered = hoveredId === item.id;
              const isHighlight = highlightId === item.id;
              const color = typeColor(item.type);
              const canDrill = drillableTypes.has(item.type);
              const showArrow = showFlowArrows && idx > 0;

              return (
                <div key={item.id}>
                  {showArrow && <FlowArrow compact={compact} label={item.transitionLabel} />}
                  <div
                    onClick={() => onSelect(item.id, item.type)}
                    onDoubleClick={() => onDoubleClick(item.id, item.type)}
                    onMouseEnter={() => onHover(item.id)}
                    onMouseLeave={() => onHover(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      minHeight: itemH, padding: compact ? "3px 8px" : "6px 10px", borderRadius: 6,
                      cursor: canDrill ? "pointer" : "default",
                      background: isHighlight ? `${color}28` : isSelected ? `${color}1a` : isHovered ? `${color}0a` : theme.bgCard,
                      border: `1px solid ${isHighlight ? `${color}88` : isSelected ? `${color}66` : isHovered ? `${color}44` : `${color}22`}`,
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? `0 0 0 1px ${color}44` : "none",
                    }}
                  >
                    <span style={{
                      color, fontSize: compact ? 10 : 13, flexShrink: 0,
                      width: compact ? 14 : 18, textAlign: "center",
                    }}>{typeIcon(item.type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }} title={item.label}>
                      <div style={{
                        color: isHighlight ? "#fff" : theme.text, fontSize: labelSize,
                        fontWeight: isHighlight ? 600 : 500,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {item.label}
                      </div>
                      {item.subtitle && !compact && (
                        <div style={{ color: theme.textFaint, fontSize: 10, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                          title={item.subtitle}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    {canDrill && (
                      <span style={{ color: `${color}55`, fontSize: compact ? 11 : 15, flexShrink: 0, transition: "color 0.15s" }}>›</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Enrichment status detection ──

interface EnrichmentStatus {
  hasSubactivities: boolean;
  hasPPIT: boolean;
  hasCards: boolean;
  hasFriction: boolean;
  /** Per-activity: does each activity have capabilities mapped? */
  activityHasCaps: (activityId: string) => boolean;
  /** Per-capability on an activity: does it have PPIT data? */
  capHasPPIT: (capabilityId: string, activityId?: string) => boolean;
}

function detectEnrichmentStatus(scaffold: any): EnrichmentStatus {
  const els = scaffold?.elements ?? {};
  const activities = els.activities ?? {};
  const subGraphs = els.subActivityGraphs ?? {};

  // Also check the canvas store's live scaffold in case the workbench copy is stale
  const canvasScaffoldData = useCanvasStore.getState().scaffoldData as any;
  const canvasSubGraphs = canvasScaffoldData?.elements?.subActivityGraphs ?? {};
  const completed = useEnrichmentStore.getState().completedThisSession;

  const hasSubactivities =
    completed.has("subactivities") ||
    Object.values(subGraphs).some((v: any) => v?.nodes?.length > 0) ||
    Object.values(canvasSubGraphs).some((v: any) => v?.nodes?.length > 0);

  const hasPPIT =
    completed.has("ppit") ||
    Object.values(activities).some(
      (a: any) => a.capabilityPPIT && Object.keys(a.capabilityPPIT).length > 0,
    );

  const cardRegistry = useCanvasStore.getState().cardRegistry;
  const hasCards = completed.has("cards") || !!(
    cardRegistry &&
    ((Object.keys(cardRegistry.conceptCards ?? {}).length > 0) ||
     (Object.keys(cardRegistry.policyCards ?? {}).length > 0))
  );

  const hasFriction = useCanvasStore.getState().heatmapsByVs.size > 0;

  const activityHasCaps = (activityId: string) => {
    const act = activities[activityId];
    if (!act) return false;
    const ids = act.enabledByCapabilityIds ?? act.requiresCapabilityIds ?? [];
    return ids.length > 0;
  };

  const capHasPPIT = (capabilityId: string, activityId?: string) => {
    if (activityId) {
      return !!activities[activityId]?.capabilityPPIT?.[capabilityId];
    }
    return Object.values(activities).some(
      (a: any) => a.capabilityPPIT?.[capabilityId],
    );
  };

  return { hasSubactivities, hasPPIT, hasCards, hasFriction, activityHasCaps, capHasPPIT };
}

// ── Smart next-action recommendations ──

export interface NextAction {
  icon: string;
  title: string;
  /** Short context-specific description for the inline banner */
  description: string;
  /** Longer explanation from the enrichment card — used for (i) tooltip */
  tooltip: string;
  enrichSection: EnrichSection;
  buttonLabel: string;
}

function getNextActions(
  status: EnrichmentStatus,
  level: number,
  activityId?: string,
  capabilityId?: string,
): NextAction[] {
  const actions: NextAction[] = [];

  // Tooltip text sourced from the enrichment card descriptions
  const TOOLTIPS = {
    ppit: "For every capability, this identifies the four foundational dimensions: People (roles, teams), Processes (workflows), Information (data, documents), and Technology (systems, platforms). Essential for impact analysis, transformation planning, and investment decisions.",
    subactivities: "Breaks each stage down into detailed work steps, decision points, handoffs, and checkpoints. Reveals how work really flows through each stage — making it easier to spot inefficiencies, missing steps, or unclear responsibilities.",
    friction: "Analyses every stage and handoff to identify where friction occurs — delays, errors, manual workarounds, and capacity mismatches. Results appear as a heatmap overlay on your value stream canvas.",
    cards: "Generates Concept Cards (key business terms and definitions) and Policy Cards (business rules, governance constraints, regulatory requirements). Together they form a living glossary and rule book for your organisation.",
    crossMap: "Builds explicit relationship maps between element types. Map Capabilities to Technology to see which systems support which capabilities, or Roles to Stages to clarify responsibilities at each step.",
  };

  if (level === 2) {
    // L2: Value Stream stages
    if (!status.hasPPIT) {
      actions.push({
        icon: "🧩", title: "Map PPIT", buttonLabel: "Map PPIT",
        description: "Decompose capabilities into People, Process, Information & Technology.",
        tooltip: TOOLTIPS.ppit,
        enrichSection: "structure",
      });
    }
    if (!status.hasSubactivities) {
      actions.push({
        icon: "🔬", title: "Deepen Structure", buttonLabel: "Deepen Structure",
        description: "Generate detailed sub-activity breakdowns for each stage.",
        tooltip: TOOLTIPS.subactivities,
        enrichSection: "structure",
      });
    }
    if (!status.hasFriction) {
      actions.push({
        icon: "⚡", title: "Assess Friction", buttonLabel: "Assess Friction",
        description: "Identify pain points, risks, and bottlenecks across stages.",
        tooltip: TOOLTIPS.friction,
        enrichSection: "friction",
      });
    }
  }

  if (level === 3 && activityId) {
    // L3: Stage detail
    if (!status.activityHasCaps(activityId)) {
      actions.push({
        icon: "🔄", title: "Cross-Map Capabilities", buttonLabel: "Cross-Map",
        description: "This stage has no capabilities mapped. Link business capabilities to this stage.",
        tooltip: TOOLTIPS.crossMap,
        enrichSection: "mapping",
      });
    } else if (!status.hasPPIT) {
      actions.push({
        icon: "🧩", title: "Map PPIT", buttonLabel: "Map PPIT",
        description: "Capabilities exist but aren't decomposed into People, Process, Info & Tech.",
        tooltip: TOOLTIPS.ppit,
        enrichSection: "structure",
      });
    }
    if (!status.hasCards) {
      actions.push({
        icon: "🃏", title: "Generate Cards", buttonLabel: "Generate Cards",
        description: "Create concept and policy reference cards from the model.",
        tooltip: TOOLTIPS.cards,
        enrichSection: "structure",
      });
    }
  }

  if (level === 4 && capabilityId) {
    // L4: Capability PPIT
    if (!status.capHasPPIT(capabilityId, activityId)) {
      actions.push({
        icon: "🧩", title: "Map PPIT", buttonLabel: "Run PPIT Enrichment",
        description: "This capability has no PPIT breakdown yet.",
        tooltip: TOOLTIPS.ppit,
        enrichSection: "structure",
      });
    }
  }

  return actions;
}

// NextActionBanner removed — actions now rendered in WorkbenchView toolbar header

// ── Main Component ──

export function StructuredGraphExplorer({ scaffoldData, onActionsChange }: { scaffoldData: any; onActionsChange?: (actions: NextAction[]) => void }) {
  const [drillStack, setDrillStack] = useState<DrillLevel[]>([{ level: 1, label: "Operating Model" }]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const current = drillStack[drillStack.length - 1];

  // Enrichment status for smart recommendations
  // Subscribe to enrichment store's completed set so we detect when enrichments finish
  const enrichCompleted = useEnrichmentStore((s) => s.completedThisSession);
  const canvasScaffold = useCanvasStore((s) => s.scaffoldData);
  const enrichStatus = useMemo(() => detectEnrichmentStatus(scaffoldData), [scaffoldData, enrichCompleted, canvasScaffold]);
  const nextActions = useMemo(() => getNextActions(
    enrichStatus,
    current.level,
    current.activityId,
    current.capabilityId,
  ), [enrichStatus, current.level, current.activityId, current.capabilityId]);

  // Report actions to parent (WorkbenchView toolbar)
  useEffect(() => {
    onActionsChange?.(nextActions);
  }, [nextActions, onActionsChange]);

  const levelLabels: Record<number, string> = {
    1: "Operating Model", 2: "Value Stream", 3: "Stage Detail", 4: "Capability PPIT", 5: "Activity Flow",
  };

  // Drill handlers
  // Check if an activity has a sub-activity DAG
  const activityHasDAG = useCallback((actId: string) => {
    const dag = scaffoldData?.elements?.subActivityGraphs?.[actId]
      ?? (canvasScaffold as any)?.elements?.subActivityGraphs?.[actId];
    return dag?.nodes?.length > 0;
  }, [scaffoldData, canvasScaffold]);

  const drillIn = useCallback((id: string, type: string) => {
    if (current.level === 1 && type === "valueStream") {
      setDrillStack(prev => [...prev, { level: 2, label: scaffoldData?.elements?.valueStreams?.[id]?.name || id, vsId: id }]);
      setSelectedId(null); setSelectedType(null);
    } else if (current.level === 2 && type === "activity") {
      setDrillStack(prev => [...prev, { level: 3, label: scaffoldData?.elements?.activities?.[id]?.name || id, vsId: current.vsId, activityId: id }]);
      setSelectedId(null); setSelectedType(null);
    } else if (current.level === 3 && type === "capability") {
      setDrillStack(prev => [...prev, { level: 4, label: scaffoldData?.elements?.capabilities?.[id]?.name || id, vsId: current.vsId, activityId: current.activityId, capabilityId: id }]);
      setSelectedId(null); setSelectedType(null);
    } else if (current.level === 3 && type === "activity" && current.activityId && activityHasDAG(current.activityId)) {
      // Drill from L3 stage detail into L5 activity flow DAG
      const actName = scaffoldData?.elements?.activities?.[current.activityId]?.name || current.activityId;
      setDrillStack(prev => [...prev, { level: 5, label: `${actName} Flow`, vsId: current.vsId, activityId: current.activityId }]);
      setSelectedId(null); setSelectedType(null);
    }
  }, [current, scaffoldData, activityHasDAG]);

  const drillOut = useCallback((toIndex: number) => {
    setDrillStack(prev => prev.slice(0, toIndex + 1));
    setSelectedId(null); setSelectedType(null);
  }, []);

  // Build data for each visible level
  const l1Data = useMemo(() => scaffoldData?.elements ? buildL1Data(scaffoldData) : null, [scaffoldData]);

  const l2Data = useMemo(() => {
    const vsId = drillStack.find(d => d.level === 2)?.vsId;
    return vsId && scaffoldData?.elements ? buildL2Data(scaffoldData, vsId) : null;
  }, [scaffoldData, drillStack]);

  const l3Data = useMemo(() => {
    const actId = drillStack.find(d => d.level === 3)?.activityId;
    return actId && scaffoldData?.elements ? buildL3Data(scaffoldData, actId) : null;
  }, [scaffoldData, drillStack, canvasScaffold]);

  const l4Data = useMemo(() => {
    const lvl4 = drillStack.find(d => d.level === 4);
    return lvl4?.capabilityId && scaffoldData?.elements
      ? buildL4Data(scaffoldData, lvl4.capabilityId, lvl4.activityId) : null;
  }, [scaffoldData, drillStack]);

  const l5Data = useMemo(() => {
    const lvl5 = drillStack.find(d => d.level === 5);
    return lvl5?.activityId && scaffoldData?.elements
      ? buildL5Data(scaffoldData, lvl5.activityId) : null;
  }, [scaffoldData, drillStack, canvasScaffold]);

  // What types are drillable at the current level?
  const drillableTypes = useMemo(() => {
    if (current.level === 1) return new Set(["valueStream"]);
    if (current.level === 2) return new Set(["activity"]);
    if (current.level === 3) return new Set(["capability"]);
    return new Set<string>();
  }, [current.level]);

  // Build InspectorTarget from selection (maps to the real InspectorPanel)
  const inspectorTarget: InspectorTarget | null = useMemo(() => {
    if (!selectedId || !selectedType) return null;
    if (selectedType === "activity") return { kind: "stage", activityId: selectedId };
    if (selectedType === "capability") {
      // Find the activityId context for this capability
      const actId = current.activityId || drillStack.find(d => d.activityId)?.activityId || "";
      return { kind: "capability", capabilityId: selectedId, activityId: actId };
    }
    if (selectedType === "role") return { kind: "role", roleId: selectedId };
    if (selectedType === "infoObject") return { kind: "infoObject", infoObjectId: selectedId };
    if (selectedType === "appFunction") return { kind: "techApp", techAppId: selectedId };
    return null;
  }, [selectedId, selectedType, current, drillStack]);

  // Build the columns to render: context columns (compact) + detail column (full)
  const columns: { level: DrillLevel; sections: SectionData[]; isCurrent: boolean; highlightId?: string }[] = useMemo(() => {
    const cols: typeof columns = [];

    for (let i = 0; i < drillStack.length; i++) {
      const dl = drillStack[i];
      const isCurrent = i === drillStack.length - 1;

      // What item in this level was drilled into? (highlighted in context)
      const nextLevel = drillStack[i + 1];
      let highlightId: string | undefined;
      if (nextLevel) {
        if (dl.level === 1 && nextLevel.vsId) highlightId = nextLevel.vsId;
        if (dl.level === 2 && nextLevel.activityId) highlightId = nextLevel.activityId;
        if (dl.level === 3 && nextLevel.capabilityId) highlightId = nextLevel.capabilityId;
      }

      let sections: SectionData[] = [];
      if (dl.level === 1 && l1Data) sections = l1Data;
      else if (dl.level === 2 && l2Data) sections = l2Data;
      else if (dl.level === 3 && l3Data) sections = l3Data;
      else if (dl.level === 4 && l4Data) sections = l4Data;
      else if (dl.level === 5 && l5Data) sections = l5Data;

      cols.push({ level: dl, sections, isCurrent, highlightId });
    }

    return cols;
  }, [drillStack, l1Data, l2Data, l3Data, l4Data, l5Data]);

  // Hint text
  const drillHint = current.level === 1 ? "Double-click a value stream to drill in"
    : current.level === 2 ? "Double-click a stage to see detail"
    : current.level === 3 ? "Double-click a capability for PPIT, or Activity Flow for the DAG"
    : current.level === 5 ? "Sub-activity DAG with decision gates" : "";

  // Track drill transitions for animation
  const [drillAnimKey, setDrillAnimKey] = useState(0);
  const prevLevelRef = useRef(current.level);
  useEffect(() => {
    if (prevLevelRef.current !== current.level) {
      setDrillAnimKey(k => k + 1);
      prevLevelRef.current = current.level;
    }
  }, [current.level]);

  // ── Render ──

  return (
    <div style={{ display: "flex", height: "100%", background: theme.bg, borderRadius: 8, overflow: "hidden" }}>
      {/* Inject keyframe animation */}
      <style>{`
        @keyframes sge-slide-in {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes sge-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .sge-context-col:hover { opacity: 0.85 !important; }
      `}</style>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Breadcrumb */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4, padding: "6px 14px",
          borderBottom: `1px solid ${theme.border}`, background: theme.bgSurface, flexShrink: 0,
        }}>
          {drillStack.map((lvl, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {i > 0 && <span style={{ color: theme.textFaint, margin: "0 1px", fontSize: 11 }}>›</span>}
              <button
                onClick={() => drillOut(i)}
                style={{
                  background: i === drillStack.length - 1 ? theme.accentDim : "transparent",
                  border: i === drillStack.length - 1 ? `1px solid ${theme.border}` : "1px solid transparent",
                  color: i === drillStack.length - 1 ? theme.accent : theme.textDim,
                  cursor: i === drillStack.length - 1 ? "default" : "pointer",
                  padding: "3px 8px", borderRadius: 4, fontSize: 12,
                  fontWeight: i === drillStack.length - 1 ? 600 : 400, fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {lvl.label}
              </button>
            </span>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{
            color: theme.textFaint, fontSize: 10, padding: "2px 8px",
            border: `1px solid ${theme.borderSubtle}`, borderRadius: 4,
          }}>
            L{current.level} — {levelLabels[current.level]}
          </span>
        </div>

        {/* Columns area */}
        <div key={drillAnimKey} style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {columns.map((col, i) => {
            const isContext = !col.isCurrent;
            const showDivider = i > 0;

            const colDrillable = col.isCurrent ? drillableTypes : (
              col.level.level === 1 ? new Set(["valueStream"]) :
              col.level.level === 2 ? new Set(["activity"]) :
              col.level.level === 3 ? new Set(["capability"]) :
              new Set<string>()
            );

            const isActivityChain = col.level.level === 2 || col.level.level === 5;

            return (
              <div key={i} style={{
                display: "flex", flexShrink: isContext ? 0 : undefined,
                flex: col.isCurrent ? 1 : undefined,
                animation: col.isCurrent ? "sge-slide-in 0.25s ease-out" : isContext ? "sge-fade-in 0.2s ease" : undefined,
              }}>
                {showDivider && (
                  <div style={{
                    width: 0, flexShrink: 0,
                    borderLeft: `1.5px dashed ${theme.zoneBorder}`,
                    margin: "12px 0",
                  }} />
                )}
                <div
                  className={isContext ? "sge-context-col" : undefined}
                  style={{
                    width: isContext ? 200 : undefined,
                    flex: col.isCurrent ? 1 : undefined,
                    overflowY: "auto",
                    overflowX: "hidden",
                    opacity: isContext ? 0.5 : 1,
                    transition: "opacity 0.2s",
                    position: "relative",
                    cursor: isContext ? "pointer" : undefined,
                  }}
                  onClick={isContext ? () => drillOut(i) : undefined}
                  title={isContext ? `Back to ${col.level.label}` : undefined}
                >
                  <div style={{
                    padding: isContext ? "5px 6px" : "7px 14px",
                    fontSize: isContext ? 8 : 10,
                    fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: theme.accent,
                    borderBottom: `1px solid ${theme.border}`,
                    position: "sticky", top: 0, background: theme.bg, zIndex: 2,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span>L{col.level.level} · {col.level.label}</span>
                    {isContext && (
                      <span style={{ fontSize: 9, color: theme.textFaint, fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>← click to return</span>
                    )}
                  </div>
                  <SectionCards
                    sections={col.sections}
                    selectedId={col.isCurrent ? selectedId : null}
                    hoveredId={col.isCurrent ? hoveredId : null}
                    onSelect={(id, type) => { if (col.isCurrent) { setSelectedId(id); setSelectedType(type); } else { drillOut(i); } }}
                    onHover={(id) => { if (col.isCurrent) setHoveredId(id); }}
                    onDoubleClick={(id, type) => {
                      if (col.isCurrent) drillIn(id, type);
                      else drillOut(i);
                    }}
                    drillableTypes={colDrillable}
                    compact={isContext}
                    highlightId={col.highlightId}
                    showFlowArrows={isActivityChain}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Hint bar */}
        <div style={{
          padding: "5px 16px", borderTop: `1px solid ${theme.border}`, background: theme.bgSurface,
          display: "flex", gap: 16, fontSize: 10, color: theme.textFaint, flexShrink: 0, position: "relative", zIndex: 10,
        }}>
          <span>Click to inspect</span>
          {drillHint && <span style={{ color: theme.textDim }}>{drillHint}</span>}
          {drillStack.length > 1 && <span>Click context column to navigate back</span>}
        </div>
      </div>

      {/* Inspector panel — uses the real InspectorPanel from the Canvas view */}
      {inspectorTarget && scaffoldData && (
        <div style={{
          width: 340, flexShrink: 0,
          animation: "sge-fade-in 0.2s ease",
        }}>
          <InspectorPanel
            target={inspectorTarget}
            scaffold={scaffoldData}
            onClose={() => { setSelectedId(null); setSelectedType(null); }}
          />
        </div>
      )}
    </div>
  );
}
