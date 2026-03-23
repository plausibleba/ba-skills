// Structured Graph Explorer — ELK.js + SVG C4-style drill-in/out diagrams
// Session 27 — Phase 3a: L1 Network + L2 Value Stream Detail

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ELK, { type ElkNode, type ElkExtendedEdge, type ElkLabel } from "elkjs/lib/elk.bundled.js";

// ── Theme (matches Workbench engine room) ──

const theme = {
  bg: "#0f172a",
  bgSurface: "rgba(15, 23, 42, 0.95)",
  accent: "#f59e0b",
  accentDim: "rgba(245, 158, 11, 0.15)",
  text: "#f8fafc",
  textDim: "#94a3b8",
  border: "rgba(245, 158, 11, 0.2)",
  // Element type colours
  valueStream: "#3b82f6",
  activity: "#22c55e",
  capability: "#f59e0b",
  role: "#ef4444",
  concept: "#a855f7",
  metric: "#06b6d4",
  control: "#64748b",
  outcome: "#6b7280",
  zone: "rgba(245, 158, 11, 0.06)",
  zoneBorder: "rgba(245, 158, 11, 0.25)",
};

// ── Types ──

interface DrillLevel {
  level: 1 | 2;
  label: string;
  vsId?: string; // for L2
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: string; // "zone" | "valueStream" | "activity" | "role" | "capability" | "outcome"
  children?: LayoutNode[];
  data?: Record<string, any>; // original scaffold element
}

interface LayoutEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sections?: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; bendPoints?: { x: number; y: number }[] }[];
  label?: string;
  type: string; // "flow" | "feedback" | "sequence" | "reference"
  color: string;
  dashed?: boolean;
}

interface InspectorData {
  id: string;
  name: string;
  type: string;
  fields: { label: string; value: string }[];
  connections: { label: string; targetId: string; targetName: string; targetType: string }[];
}

// ── ELK Instance (singleton) ──

const elk = new ELK();

// ── Scaffold → ELK Graph Transformers ──

function resolveActivityIds(vs: any, acts: Record<string, any>): string[] {
  if (Array.isArray(vs.activityIds)) return vs.activityIds;
  const head = vs.activityChainHead;
  if (!head) return [];
  const chain: string[] = [];
  const seen = new Set<string>();
  let current: string | null = head;
  while (current && !seen.has(current) && acts[current]) {
    seen.add(current);
    chain.push(current);
    current = acts[current].nextActivityId ?? null;
  }
  return chain;
}

function getZoneForVS(vs: any): string {
  return vs.layoutZone ?? vs.zone ?? "default";
}

async function buildL1Graph(scaffold: any): Promise<{ nodes: LayoutNode[]; edges: LayoutEdge[] }> {
  const el = scaffold.elements;
  const vsEntries = Object.entries(el.valueStreams || {}) as [string, any][];
  const acts = el.activities || {};
  const outcomes = el.outcomes || {};

  // Group VS by zone
  const zoneMap = new Map<string, any[]>();
  for (const [, vs] of vsEntries) {
    const zone = getZoneForVS(vs);
    if (!zoneMap.has(zone)) zoneMap.set(zone, []);
    zoneMap.get(zone)!.push(vs);
  }

  // Use layoutZones ordering if available
  const layoutZones = (scaffold.layoutZones || []) as { id: string; label: string; row: number }[];
  const zoneOrder: string[] = layoutZones.length > 0
    ? layoutZones.sort((a, b) => a.row - b.row).map(z => z.id)
    : [...zoneMap.keys()].sort();

  const zoneLabelMap = new Map(layoutZones.map(z => [z.id, z.label]));

  // Build ELK graph with zone containment
  const VS_WIDTH = 220;
  const VS_HEIGHT = 80;
  const ZONE_PADDING = 40;

  const elkChildren: ElkNode[] = [];
  for (const zoneId of zoneOrder) {
    const vsInZone = zoneMap.get(zoneId) || [];
    if (vsInZone.length === 0) continue;

    const zoneLabel = zoneLabelMap.get(zoneId) || zoneId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    const zoneChildren: ElkNode[] = vsInZone.map(vs => ({
      id: vs.id,
      width: VS_WIDTH,
      height: VS_HEIGHT,
      labels: [{ text: vs.name || vs.id }],
    }));

    elkChildren.push({
      id: `zone-${zoneId}`,
      labels: [{ text: zoneLabel }],
      children: zoneChildren,
      layoutOptions: {
        "elk.padding": `[top=${ZONE_PADDING + 20},left=${ZONE_PADDING},bottom=${ZONE_PADDING},right=${ZONE_PADDING}]`,
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.spacing.nodeNode": "30",
      },
    });
  }

  // Derive edges: VS → VS via shared outcomes
  const elkEdges: ElkExtendedEdge[] = [];
  const entryMap = new Map<string, string[]>(); // outcomeId → [vsId]
  const terminalMap = new Map<string, string>(); // vsId → terminal outcomeId

  for (const [, vs] of vsEntries) {
    const actIds = resolveActivityIds(vs, acts);
    if (actIds.length === 0) continue;
    const firstAct = acts[actIds[0]];
    const lastAct = acts[actIds[actIds.length - 1]];
    if (firstAct?.preOutcomeId) {
      const entries = entryMap.get(firstAct.preOutcomeId) ?? [];
      entries.push(vs.id);
      entryMap.set(firstAct.preOutcomeId, entries);
    }
    if (lastAct?.postOutcomeId) {
      terminalMap.set(vs.id, lastAct.postOutcomeId);
    }
  }

  for (const [vsId, termOutId] of terminalMap.entries()) {
    const targets = entryMap.get(termOutId) ?? [];
    for (const targetVsId of targets) {
      if (targetVsId === vsId) continue;
      const outcomeName = outcomes[termOutId]?.name || "";
      elkEdges.push({
        id: `edge-${vsId}-${targetVsId}`,
        sources: [vsId],
        targets: [targetVsId],
        labels: outcomeName ? [{ text: outcomeName } as ElkLabel] : [],
      });
    }
  }

  // Also check secondaryTriggerOutcomeIds for feedback edges
  for (const [, vs] of vsEntries) {
    for (const trigId of vs.secondaryTriggerOutcomeIds || []) {
      // Find VS that produces this outcome
      for (const [srcVsId, srcTermId] of terminalMap.entries()) {
        if (srcTermId === trigId && srcVsId !== vs.id) {
          const alreadyExists = elkEdges.some(e => e.id === `edge-${srcVsId}-${vs.id}`);
          if (!alreadyExists) {
            elkEdges.push({
              id: `feedback-${srcVsId}-${vs.id}`,
              sources: [srcVsId],
              targets: [vs.id],
              labels: [{ text: outcomes[trigId]?.name || "feedback" } as ElkLabel],
            });
          }
        }
      }
    }
  }

  const elkGraph: ElkNode = {
    id: "root",
    children: elkChildren,
    edges: elkEdges,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "60",
      "elk.spacing.componentComponent": "50",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
    },
  };

  const layoutResult = await elk.layout(elkGraph);

  // Convert ELK result to LayoutNodes/LayoutEdges
  const layoutNodes: LayoutNode[] = [];
  const layoutEdges: LayoutEdge[] = [];

  for (const zoneNode of layoutResult.children || []) {
    const zNode: LayoutNode = {
      id: zoneNode.id,
      x: zoneNode.x || 0,
      y: zoneNode.y || 0,
      width: zoneNode.width || 0,
      height: zoneNode.height || 0,
      label: zoneNode.labels?.[0]?.text || "",
      type: "zone",
      children: [],
    };

    for (const vsChild of zoneNode.children || []) {
      const vsData = el.valueStreams[vsChild.id];
      zNode.children!.push({
        id: vsChild.id,
        x: vsChild.x || 0,
        y: vsChild.y || 0,
        width: vsChild.width || 0,
        height: vsChild.height || 0,
        label: vsChild.labels?.[0]?.text || vsChild.id,
        type: "valueStream",
        data: vsData,
      });
    }

    layoutNodes.push(zNode);
  }

  for (const edge of layoutResult.edges || []) {
    const extEdge = edge as ElkExtendedEdge;
    const isFeedback = extEdge.id.startsWith("feedback-");
    const sections = extEdge.sections || [];
    const sec = sections[0];
    if (!sec) continue;

    layoutEdges.push({
      id: extEdge.id,
      sourceX: sec.startPoint.x,
      sourceY: sec.startPoint.y,
      targetX: sec.endPoint.x,
      targetY: sec.endPoint.y,
      sections: sections as any,
      label: extEdge.labels?.[0]?.text,
      type: isFeedback ? "feedback" : "flow",
      color: isFeedback ? theme.textDim : theme.valueStream,
      dashed: isFeedback,
    });
  }

  return { nodes: layoutNodes, edges: layoutEdges };
}

async function buildL2Graph(scaffold: any, vsId: string): Promise<{ nodes: LayoutNode[]; edges: LayoutEdge[] }> {
  const el = scaffold.elements;
  const vs = el.valueStreams[vsId];
  if (!vs) return { nodes: [], edges: [] };

  const acts = el.activities || {};
  const outcomes = el.outcomes || {};
  const roles = el.roles || {};
  const caps = el.capabilities || {};

  const actIds = resolveActivityIds(vs, acts);
  if (actIds.length === 0) return { nodes: [], edges: [] };

  const ACT_WIDTH = 200;
  const ACT_HEIGHT = 70;
  const ROLE_WIDTH = 140;
  const ROLE_HEIGHT = 36;
  const CAP_WIDTH = 160;
  const CAP_HEIGHT = 36;

  // Build ELK graph: activities in a chain, roles above, capabilities below
  const actChildren: ElkNode[] = actIds.map(id => {
    const act = acts[id];
    return {
      id,
      width: ACT_WIDTH,
      height: ACT_HEIGHT,
      labels: [{ text: act?.name || id }],
    };
  });

  // Collect roles and capabilities referenced by activities in this VS
  const roleIds = new Set<string>();
  const capIds = new Set<string>();
  for (const actId of actIds) {
    const act = acts[actId];
    if (!act) continue;
    for (const rId of act.performedByRoleIds || []) roleIds.add(rId);
    for (const cId of (act.requiresCapabilityIds || act.enabledByCapabilityIds || [])) capIds.add(cId);
  }

  const roleChildren: ElkNode[] = [...roleIds].map(id => ({
    id: `role-${id}`,
    width: ROLE_WIDTH,
    height: ROLE_HEIGHT,
    labels: [{ text: roles[id]?.name || id }],
  }));

  const capChildren: ElkNode[] = [...capIds].map(id => ({
    id: `cap-${id}`,
    width: CAP_WIDTH,
    height: CAP_HEIGHT,
    labels: [{ text: caps[id]?.name || id }],
  }));

  // Edges
  const elkEdges: ElkExtendedEdge[] = [];

  // Activity sequence edges
  for (let i = 0; i < actIds.length - 1; i++) {
    const act = acts[actIds[i]];
    const outcomeName = act?.postOutcomeId ? (outcomes[act.postOutcomeId]?.name || "") : "";
    elkEdges.push({
      id: `seq-${actIds[i]}-${actIds[i + 1]}`,
      sources: [actIds[i]],
      targets: [actIds[i + 1]],
      labels: outcomeName ? [{ text: outcomeName } as ElkLabel] : [],
    });
  }

  // Activity → Role edges
  for (const actId of actIds) {
    const act = acts[actId];
    if (!act) continue;
    for (const rId of act.performedByRoleIds || []) {
      elkEdges.push({
        id: `role-ref-${actId}-${rId}`,
        sources: [actId],
        targets: [`role-${rId}`],
      });
    }
  }

  // Activity → Capability edges
  for (const actId of actIds) {
    const act = acts[actId];
    if (!act) continue;
    for (const cId of (act.requiresCapabilityIds || act.enabledByCapabilityIds || [])) {
      elkEdges.push({
        id: `cap-ref-${actId}-${cId}`,
        sources: [actId],
        targets: [`cap-${cId}`],
      });
    }
  }

  // Use layered partitions to separate roles (top), activities (middle), capabilities (bottom)
  const elkGraph: ElkNode = {
    id: "root",
    children: [
      // Roles strip
      ...(roleChildren.length > 0 ? [{
        id: "role-group",
        labels: [{ text: "Roles" }],
        children: roleChildren,
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "RIGHT",
          "elk.spacing.nodeNode": "15",
          "elk.padding": "[top=30,left=15,bottom=10,right=15]",
        },
      } as ElkNode] : []),
      // Activity chain
      {
        id: "activity-group",
        labels: [{ text: vs.name || vsId }],
        children: actChildren,
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "RIGHT",
          "elk.spacing.nodeNode": "30",
          "elk.layered.spacing.nodeNodeBetweenLayers": "50",
          "elk.padding": "[top=35,left=20,bottom=15,right=20]",
        },
      },
      // Capabilities strip
      ...(capChildren.length > 0 ? [{
        id: "cap-group",
        labels: [{ text: "Capabilities" }],
        children: capChildren,
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "RIGHT",
          "elk.spacing.nodeNode": "15",
          "elk.padding": "[top=30,left=15,bottom=10,right=15]",
        },
      } as ElkNode] : []),
    ],
    edges: elkEdges,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "30",
      "elk.layered.spacing.nodeNodeBetweenLayers": "40",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
    },
  };

  const layoutResult = await elk.layout(elkGraph);

  const layoutNodes: LayoutNode[] = [];
  const layoutEdges: LayoutEdge[] = [];

  for (const group of layoutResult.children || []) {
    const groupType = group.id === "role-group" ? "role" : group.id === "cap-group" ? "capability" : "activity";
    const gNode: LayoutNode = {
      id: group.id,
      x: group.x || 0,
      y: group.y || 0,
      width: group.width || 0,
      height: group.height || 0,
      label: group.labels?.[0]?.text || "",
      type: "zone", // container
      children: [],
    };

    for (const child of group.children || []) {
      let childType = groupType;
      let childId = child.id;
      let childData: any;

      if (child.id.startsWith("role-")) {
        childType = "role";
        const realId = child.id.replace("role-", "");
        childData = roles[realId];
        childId = realId;
      } else if (child.id.startsWith("cap-")) {
        childType = "capability";
        const realId = child.id.replace("cap-", "");
        childData = caps[realId];
        childId = realId;
      } else {
        childData = acts[child.id];
      }

      gNode.children!.push({
        id: childId,
        x: child.x || 0,
        y: child.y || 0,
        width: child.width || 0,
        height: child.height || 0,
        label: child.labels?.[0]?.text || child.id,
        type: childType,
        data: childData,
      });
    }

    layoutNodes.push(gNode);
  }

  for (const edge of layoutResult.edges || []) {
    const extEdge = edge as ElkExtendedEdge;
    const sections = extEdge.sections || [];
    const sec = sections[0];
    if (!sec) continue;

    const isSequence = extEdge.id.startsWith("seq-");
    const isRoleRef = extEdge.id.startsWith("role-ref-");

    layoutEdges.push({
      id: extEdge.id,
      sourceX: sec.startPoint.x,
      sourceY: sec.startPoint.y,
      targetX: sec.endPoint.x,
      targetY: sec.endPoint.y,
      sections: sections as any,
      label: extEdge.labels?.[0]?.text,
      type: isSequence ? "sequence" : "reference",
      color: isSequence ? theme.activity : isRoleRef ? theme.role : theme.capability,
      dashed: !isSequence,
    });
  }

  return { nodes: layoutNodes, edges: layoutEdges };
}

// ── Build inspector data for an element ──

function buildInspectorData(elementId: string, elementType: string, scaffold: any): InspectorData | null {
  const el = scaffold.elements;

  if (elementType === "valueStream") {
    const vs = el.valueStreams?.[elementId];
    if (!vs) return null;
    const actIds = resolveActivityIds(vs, el.activities || {});
    return {
      id: elementId,
      name: vs.name || elementId,
      type: "Value Stream",
      fields: [
        { label: "Description", value: vs.description || "—" },
        { label: "Zone", value: getZoneForVS(vs) },
        { label: "Activities", value: `${actIds.length} stages` },
      ],
      connections: actIds.map(aId => ({
        label: "stage",
        targetId: aId,
        targetName: el.activities?.[aId]?.name || aId,
        targetType: "activity",
      })),
    };
  }

  if (elementType === "activity") {
    const act = el.activities?.[elementId];
    if (!act) return null;
    const connections: InspectorData["connections"] = [];
    for (const rId of act.performedByRoleIds || []) {
      connections.push({ label: "performed by", targetId: rId, targetName: el.roles?.[rId]?.name || rId, targetType: "role" });
    }
    for (const cId of (act.requiresCapabilityIds || act.enabledByCapabilityIds || [])) {
      connections.push({ label: "requires", targetId: cId, targetName: el.capabilities?.[cId]?.name || cId, targetType: "capability" });
    }
    const preOut = el.outcomes?.[act.preOutcomeId];
    const postOut = el.outcomes?.[act.postOutcomeId];
    return {
      id: elementId,
      name: act.name || elementId,
      type: "Activity",
      fields: [
        { label: "Entry State", value: preOut?.name || act.preOutcomeId || "—" },
        { label: "Exit State", value: postOut?.name || act.postOutcomeId || "—" },
        ...(act.performedByRoleIds?.length ? [{ label: "Roles", value: act.performedByRoleIds.map((r: string) => el.roles?.[r]?.name || r).join(", ") }] : []),
      ],
      connections,
    };
  }

  if (elementType === "role") {
    const role = el.roles?.[elementId];
    if (!role) return null;
    // Find activities this role participates in
    const connections: InspectorData["connections"] = [];
    for (const [aId, act] of Object.entries(el.activities || {}) as [string, any][]) {
      if ((act.performedByRoleIds || []).includes(elementId)) {
        connections.push({ label: "performs in", targetId: aId, targetName: act.name || aId, targetType: "activity" });
      }
    }
    return {
      id: elementId,
      name: role.name || elementId,
      type: "Role",
      fields: [
        { label: "Activities", value: `Participates in ${connections.length} activities` },
      ],
      connections,
    };
  }

  if (elementType === "capability") {
    const cap = el.capabilities?.[elementId];
    if (!cap) return null;
    const connections: InspectorData["connections"] = [];
    for (const [aId, act] of Object.entries(el.activities || {}) as [string, any][]) {
      const capRefs = act.requiresCapabilityIds || act.enabledByCapabilityIds || [];
      if (capRefs.includes(elementId)) {
        connections.push({ label: "used in", targetId: aId, targetName: act.name || aId, targetType: "activity" });
      }
    }
    return {
      id: elementId,
      name: cap.name || elementId,
      type: `Capability (L${cap.level || "?"})`,
      fields: [
        ...(cap.description ? [{ label: "Description", value: cap.description }] : []),
        ...(cap.level ? [{ label: "Level", value: `L${cap.level}` }] : []),
        ...(cap.parentId ? [{ label: "Parent", value: el.capabilities?.[cap.parentId]?.name || cap.parentId }] : []),
      ],
      connections,
    };
  }

  return null;
}

// ── SVG Rendering Helpers ──

function edgePath(edge: LayoutEdge): string {
  const sec = edge.sections?.[0];
  if (!sec) return `M ${edge.sourceX} ${edge.sourceY} L ${edge.targetX} ${edge.targetY}`;

  let d = `M ${sec.startPoint.x} ${sec.startPoint.y}`;
  for (const bp of sec.bendPoints || []) {
    d += ` L ${bp.x} ${bp.y}`;
  }
  d += ` L ${sec.endPoint.x} ${sec.endPoint.y}`;
  return d;
}

function typeColor(type: string): string {
  switch (type) {
    case "valueStream": return theme.valueStream;
    case "activity": return theme.activity;
    case "capability": return theme.capability;
    case "role": return theme.role;
    case "concept": return theme.concept;
    case "metric": return theme.metric;
    default: return theme.textDim;
  }
}

function typeIcon(type: string): string {
  switch (type) {
    case "valueStream": return "⟶";
    case "activity": return "◆";
    case "capability": return "⬡";
    case "role": return "👤";
    case "concept": return "◇";
    case "metric": return "📊";
    default: return "•";
  }
}

// ── Main Component ──

export function StructuredGraphExplorer({ scaffoldData }: { scaffoldData: any }) {
  const [drillStack, setDrillStack] = useState<DrillLevel[]>([{ level: 1, label: "Operating Model" }]);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<LayoutEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1200, h: 800 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vbx: 0, vby: 0 });

  const currentLevel = drillStack[drillStack.length - 1];

  // Run layout whenever drill level changes
  useEffect(() => {
    if (!scaffoldData?.elements) return;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setSelectedType(null);

    const runLayout = async () => {
      try {
        let result;
        if (currentLevel.level === 1) {
          result = await buildL1Graph(scaffoldData);
        } else if (currentLevel.level === 2 && currentLevel.vsId) {
          result = await buildL2Graph(scaffoldData, currentLevel.vsId);
        } else {
          result = { nodes: [], edges: [] };
        }
        setLayoutNodes(result.nodes);
        setLayoutEdges(result.edges);

        // Auto-fit viewBox
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of result.nodes) {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + n.width);
          maxY = Math.max(maxY, n.y + n.height);
        }
        if (result.nodes.length > 0) {
          const pad = 60;
          setViewBox({
            x: minX - pad,
            y: minY - pad,
            w: maxX - minX + pad * 2,
            h: maxY - minY + pad * 2,
          });
        }
      } catch (err: any) {
        console.error("ELK layout error:", err);
        setError(err.message || "Layout failed");
      } finally {
        setLoading(false);
      }
    };

    runLayout();
  }, [scaffoldData, currentLevel.level, currentLevel.vsId]);

  // Drill-in handler
  const drillIn = useCallback((id: string, type: string) => {
    if (currentLevel.level === 1 && type === "valueStream") {
      const vsName = scaffoldData?.elements?.valueStreams?.[id]?.name || id;
      setDrillStack(prev => [...prev, { level: 2, label: vsName, vsId: id }]);
    }
  }, [currentLevel.level, scaffoldData]);

  // Drill-out handler
  const drillOut = useCallback((toIndex: number) => {
    setDrillStack(prev => prev.slice(0, toIndex + 1));
  }, []);

  // Inspector data
  const inspectorData = useMemo(() => {
    if (!selectedId || !selectedType || !scaffoldData) return null;
    return buildInspectorData(selectedId, selectedType, scaffoldData);
  }, [selectedId, selectedType, scaffoldData]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    // Only start pan if clicking on background (not on a node)
    if ((e.target as Element).tagName === "svg" || (e.target as Element).classList.contains("graph-bg")) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vbx: viewBox.x, vby: viewBox.y };
      e.preventDefault();
    }
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const dx = (e.clientX - panStart.current.x) * scaleX;
    const dy = (e.clientY - panStart.current.y) * scaleY;
    setViewBox(prev => ({ ...prev, x: panStart.current.vbx - dx, y: panStart.current.vby - dy }));
  }, [isPanning, viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
    const newW = viewBox.w * factor;
    const newH = viewBox.h * factor;
    setViewBox({
      x: mx - (mx - viewBox.x) * factor,
      y: my - (my - viewBox.y) * factor,
      w: newW,
      h: newH,
    });
  }, [viewBox]);

  // Click on element node
  const handleNodeClick = useCallback((id: string, type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedId === id) {
      // Double-click to drill in
      drillIn(id, type);
    } else {
      setSelectedId(id);
      setSelectedType(type);
    }
  }, [selectedId, drillIn]);

  const handleNodeDoubleClick = useCallback((id: string, type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    drillIn(id, type);
  }, [drillIn]);

  // Determine which edges connect to hovered/selected node
  const highlightedEdgeIds = useMemo(() => {
    const targetId = hoveredId || selectedId;
    if (!targetId) return new Set<string>();
    const ids = new Set<string>();
    for (const edge of layoutEdges) {
      // Check if source or target matches (accounting for prefixed IDs)
      const srcMatch = edge.id.includes(targetId);
      if (srcMatch) ids.add(edge.id);
    }
    return ids;
  }, [hoveredId, selectedId, layoutEdges]);

  // ── Render ──

  return (
    <div style={{ display: "flex", height: "100%", background: theme.bg, borderRadius: 8, overflow: "hidden" }}>
      {/* Main graph area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Breadcrumb bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderBottom: `1px solid ${theme.border}`,
          background: theme.bgSurface,
          flexShrink: 0,
        }}>
          {drillStack.map((level, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span style={{ color: theme.textDim, margin: "0 2px" }}>›</span>}
              <button
                onClick={() => drillOut(i)}
                style={{
                  background: i === drillStack.length - 1 ? theme.accentDim : "transparent",
                  border: "none",
                  color: i === drillStack.length - 1 ? theme.accent : theme.textDim,
                  cursor: i === drillStack.length - 1 ? "default" : "pointer",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: i === drillStack.length - 1 ? 600 : 400,
                  fontFamily: "inherit",
                }}
              >
                {level.label}
              </button>
            </span>
          ))}

          <div style={{ flex: 1 }} />

          {/* Level indicator */}
          <span style={{
            color: theme.textDim,
            fontSize: 11,
            padding: "3px 8px",
            border: `1px solid ${theme.border}`,
            borderRadius: 4,
          }}>
            L{currentLevel.level} — {currentLevel.level === 1 ? "Network" : "Value Stream"}
          </span>
        </div>

        {/* SVG canvas */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textDim }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8, animation: "spin 1s linear infinite" }}>⟳</div>
              <div>Computing layout…</div>
            </div>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", padding: 32 }}>
            Layout error: {error}
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            style={{ flex: 1, cursor: isPanning ? "grabbing" : "grab", minHeight: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Background */}
            <rect
              className="graph-bg"
              x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h}
              fill={theme.bg}
            />

            {/* Render edges (behind nodes) */}
            <g className="edges">
              {layoutEdges.map(edge => {
                const highlighted = highlightedEdgeIds.has(edge.id);
                const dimmed = (hoveredId || selectedId) && !highlighted;
                return (
                  <g key={edge.id} opacity={dimmed ? 0.15 : 1}>
                    <path
                      d={edgePath(edge)}
                      fill="none"
                      stroke={edge.color}
                      strokeWidth={highlighted ? 2.5 : 1.5}
                      strokeDasharray={edge.dashed ? "6 4" : undefined}
                      markerEnd="url(#arrowhead)"
                    />
                    {edge.label && (
                      <text
                        x={(edge.sourceX + edge.targetX) / 2}
                        y={(edge.sourceY + edge.targetY) / 2 - 6}
                        fill={theme.textDim}
                        fontSize={10}
                        textAnchor="middle"
                        style={{ pointerEvents: "none" }}
                      >
                        {edge.label.length > 24 ? edge.label.slice(0, 22) + "…" : edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Arrowhead marker */}
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={theme.textDim} />
              </marker>
            </defs>

            {/* Render zone/group containers */}
            {layoutNodes.map(zone => (
              <g key={zone.id} transform={`translate(${zone.x}, ${zone.y})`}>
                {/* Zone background */}
                <rect
                  x={0} y={0}
                  width={zone.width}
                  height={zone.height}
                  rx={8}
                  fill={theme.zone}
                  stroke={theme.zoneBorder}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
                {/* Zone label */}
                <text
                  x={12} y={18}
                  fill={theme.textDim}
                  fontSize={11}
                  fontWeight={600}
                  style={{ pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {zone.label}
                </text>

                {/* Child elements */}
                {(zone.children || []).map(child => {
                  const isSelected = selectedId === child.id;
                  const isHovered = hoveredId === child.id;
                  const dimmed = (hoveredId || selectedId) && !isSelected && !isHovered;
                  const nodeColor = typeColor(child.type);
                  const canDrillIn = currentLevel.level === 1 && child.type === "valueStream";

                  return (
                    <g
                      key={child.id}
                      transform={`translate(${child.x}, ${child.y})`}
                      onClick={(e) => handleNodeClick(child.id, child.type, e)}
                      onDoubleClick={(e) => handleNodeDoubleClick(child.id, child.type, e)}
                      onMouseEnter={() => setHoveredId(child.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ cursor: canDrillIn ? "pointer" : "default", opacity: dimmed ? 0.3 : 1, transition: "opacity 0.2s" }}
                    >
                      {/* Node background */}
                      <rect
                        x={0} y={0}
                        width={child.width}
                        height={child.height}
                        rx={6}
                        fill={isSelected ? `${nodeColor}22` : isHovered ? `${nodeColor}11` : `${nodeColor}0a`}
                        stroke={isSelected ? nodeColor : isHovered ? `${nodeColor}88` : `${nodeColor}44`}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      {/* Type icon */}
                      <text
                        x={10} y={child.height / 2 + 1}
                        fill={nodeColor}
                        fontSize={14}
                        dominantBaseline="middle"
                        style={{ pointerEvents: "none" }}
                      >
                        {typeIcon(child.type)}
                      </text>
                      {/* Label */}
                      <text
                        x={28} y={child.height / 2 + 1}
                        fill={theme.text}
                        fontSize={12}
                        fontWeight={500}
                        dominantBaseline="middle"
                        style={{ pointerEvents: "none" }}
                      >
                        {child.label.length > 24 ? child.label.slice(0, 22) + "…" : child.label}
                      </text>
                      {/* Drill-in indicator */}
                      {canDrillIn && (
                        <text
                          x={child.width - 16}
                          y={child.height / 2 + 1}
                          fill={`${nodeColor}66`}
                          fontSize={14}
                          dominantBaseline="middle"
                          textAnchor="end"
                          style={{ pointerEvents: "none" }}
                        >
                          ›
                        </text>
                      )}
                      {/* VS: show activity count badge */}
                      {child.type === "valueStream" && child.data && (
                        <text
                          x={child.width - 10}
                          y={child.height - 8}
                          fill={`${nodeColor}88`}
                          fontSize={9}
                          textAnchor="end"
                          style={{ pointerEvents: "none" }}
                        >
                          {resolveActivityIds(child.data, scaffoldData?.elements?.activities || {}).length} stages
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        )}

        {/* Bottom hint bar */}
        <div style={{
          padding: "6px 16px",
          borderTop: `1px solid ${theme.border}`,
          background: theme.bgSurface,
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: theme.textDim,
          flexShrink: 0,
        }}>
          <span>Click to inspect</span>
          {currentLevel.level === 1 && <span>Double-click a value stream to drill in</span>}
          <span>Scroll to zoom</span>
          <span>Drag background to pan</span>
        </div>
      </div>

      {/* Inspector panel */}
      {inspectorData && (
        <div style={{
          width: 300,
          borderLeft: `1px solid ${theme.border}`,
          background: theme.bgSurface,
          overflowY: "auto",
          flexShrink: 0,
          padding: 16,
        }}>
          {/* Close button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: typeColor(selectedType || ""), fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {inspectorData.type}
            </span>
            <button
              onClick={() => { setSelectedId(null); setSelectedType(null); }}
              style={{ background: "transparent", border: "none", color: theme.textDim, cursor: "pointer", fontSize: 16, padding: 4 }}
            >
              ✕
            </button>
          </div>

          {/* Name */}
          <h3 style={{ color: theme.text, fontSize: 16, fontWeight: 600, margin: "0 0 16px 0" }}>
            {inspectorData.name}
          </h3>

          {/* Fields */}
          {inspectorData.fields.map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                {f.label}
              </div>
              <div style={{ color: theme.text, fontSize: 13 }}>{f.value}</div>
            </div>
          ))}

          {/* Connections */}
          {inspectorData.connections.length > 0 && (
            <>
              <div style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 8 }}>
                Connections ({inspectorData.connections.length})
              </div>
              {inspectorData.connections.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    borderRadius: 4,
                    marginBottom: 4,
                    cursor: "pointer",
                    background: hoveredId === c.targetId ? theme.accentDim : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={() => setHoveredId(c.targetId)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => { setSelectedId(c.targetId); setSelectedType(c.targetType); }}
                >
                  <span style={{ color: typeColor(c.targetType), fontSize: 12 }}>{typeIcon(c.targetType)}</span>
                  <span style={{ color: theme.text, fontSize: 12, flex: 1 }}>{c.targetName}</span>
                  <span style={{ color: theme.textDim, fontSize: 10 }}>{c.label}</span>
                </div>
              ))}
            </>
          )}

          {/* Drill-in button */}
          {selectedType === "valueStream" && currentLevel.level === 1 && (
            <button
              onClick={() => drillIn(selectedId!, selectedType!)}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "10px 16px",
                background: `${theme.valueStream}22`,
                border: `1px solid ${theme.valueStream}44`,
                borderRadius: 6,
                color: theme.valueStream,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Drill into Value Stream ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
