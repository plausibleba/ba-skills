// Structured Graph Explorer — ELK.js + SVG C4-style drill-in/out diagrams
// Session 27 — Phase 3a: L1 Network + L2 VS Stages + L3 Stage Detail + L4 Capability PPIT
//
// Drill hierarchy:
//   L1  Operating Model — VS boxes in zone swim-lanes (matches Network View layout)
//   L2  Value Stream — activity/stage chain left→right
//   L3  Stage (Activity) — entry/exit states, stakeholders, metrics, capabilities
//   L4  Capability PPIT — roles, sub-activities, info objects, technology

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
  valueStream: "#3b82f6",
  activity: "#22c55e",
  capability: "#f59e0b",
  role: "#ef4444",
  concept: "#a855f7",
  metric: "#06b6d4",
  control: "#64748b",
  outcome: "#6b7280",
  infoObject: "#a855f7",
  appFunction: "#6366f1",
  zone: "rgba(245, 158, 11, 0.06)",
  zoneBorder: "rgba(245, 158, 11, 0.25)",
};

// ── Types ──

interface DrillLevel {
  level: 1 | 2 | 3 | 4;
  label: string;
  vsId?: string;
  activityId?: string;
  capabilityId?: string;
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: string;
  children?: LayoutNode[];
  data?: Record<string, any>;
  subtitle?: string;
}

interface LayoutEdge {
  id: string;
  sections?: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; bendPoints?: { x: number; y: number }[] }[];
  label?: string;
  type: string;
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

// ── ELK Instance ──

const elk = new ELK();

// ── Helpers ──

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

function getZone(vs: any): string {
  return vs.layoutZone ?? vs.zone ?? "default";
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function typeColor(type: string): string {
  return (theme as any)[type] || theme.textDim;
}

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    valueStream: "⟶", activity: "◆", capability: "⬡", role: "👤",
    metric: "📊", outcome: "○", infoObject: "◇", appFunction: "⚙",
    control: "🛡", subActivity: "▸",
  };
  return icons[type] || "•";
}

// ── L1: Operating Model ──

async function buildL1(scaffold: any): Promise<{ nodes: LayoutNode[]; edges: LayoutEdge[] }> {
  const el = scaffold.elements;
  const vsEntries = Object.entries(el.valueStreams || {}) as [string, any][];
  const acts = el.activities || {};
  const outcomes = el.outcomes || {};

  // Group VS by zone
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

  const VS_W = 260;
  const VS_H = 70;

  // Build ELK: zones contain VS, laid out LEFT→RIGHT within each zone, zones stacked DOWN
  const elkChildren: ElkNode[] = [];
  for (const zoneId of zoneOrder) {
    const vsList = zoneMap.get(zoneId) || [];
    if (vsList.length === 0) continue;
    const zoneLabel = zoneLabelMap.get(zoneId) || zoneId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    elkChildren.push({
      id: `zone-${zoneId}`,
      labels: [{ text: zoneLabel }],
      children: vsList.map(vs => ({
        id: vs.id,
        width: VS_W,
        height: VS_H,
        labels: [{ text: vs.name || vs.id }],
      })),
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.spacing.nodeNode": "30",
        "elk.layered.spacing.nodeNodeBetweenLayers": "40",
        "elk.padding": "[top=38,left=24,bottom=18,right=24]",
      },
    });
  }

  // Derive VS→VS edges via shared outcomes
  const entryMap = new Map<string, string[]>();
  const terminalMap = new Map<string, string>();

  for (const [, vs] of vsEntries) {
    const actIds = resolveActivityIds(vs, acts);
    if (actIds.length === 0) continue;
    const first = acts[actIds[0]];
    const last = acts[actIds[actIds.length - 1]];
    if (first?.preOutcomeId) {
      const arr = entryMap.get(first.preOutcomeId) ?? [];
      arr.push(vs.id);
      entryMap.set(first.preOutcomeId, arr);
    }
    if (last?.postOutcomeId) terminalMap.set(vs.id, last.postOutcomeId);
  }

  const elkEdges: ElkExtendedEdge[] = [];
  for (const [vsId, termOutId] of terminalMap.entries()) {
    for (const targetVsId of entryMap.get(termOutId) ?? []) {
      if (targetVsId === vsId) continue;
      const oName = outcomes[termOutId]?.name || "";
      elkEdges.push({
        id: `edge-${vsId}-${targetVsId}`,
        sources: [vsId],
        targets: [targetVsId],
        labels: oName ? [{ text: oName } as ElkLabel] : [],
      });
    }
  }

  // Feedback edges from secondaryTriggerOutcomeIds
  for (const [, vs] of vsEntries) {
    for (const trigId of vs.secondaryTriggerOutcomeIds || []) {
      for (const [srcVsId, srcTermId] of terminalMap.entries()) {
        if (srcTermId === trigId && srcVsId !== vs.id) {
          if (!elkEdges.some(e => e.id === `edge-${srcVsId}-${vs.id}`)) {
            elkEdges.push({
              id: `fb-${srcVsId}-${vs.id}`,
              sources: [srcVsId],
              targets: [vs.id],
              labels: [{ text: outcomes[trigId]?.name || "feedback" } as ElkLabel],
            });
          }
        }
      }
    }
  }

  const result = await elk.layout({
    id: "root",
    children: elkChildren,
    edges: elkEdges,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": "60",
      "elk.spacing.componentComponent": "50",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
    },
  });

  return convertElkResult(result, el, "L1");
}

// ── L2: Value Stream Stages ──

async function buildL2(scaffold: any, vsId: string): Promise<{ nodes: LayoutNode[]; edges: LayoutEdge[] }> {
  const el = scaffold.elements;
  const vs = el.valueStreams[vsId];
  if (!vs) return { nodes: [], edges: [] };

  const acts = el.activities || {};
  const outcomes = el.outcomes || {};
  const actIds = resolveActivityIds(vs, acts);
  if (actIds.length === 0) return { nodes: [], edges: [] };

  const ACT_W = 220;
  const ACT_H = 64;

  const actChildren: ElkNode[] = actIds.map(id => ({
    id,
    width: ACT_W,
    height: ACT_H,
    labels: [{ text: acts[id]?.name || id }],
  }));

  // Sequence edges
  const elkEdges: ElkExtendedEdge[] = [];
  for (let i = 0; i < actIds.length - 1; i++) {
    const act = acts[actIds[i]];
    const oName = act?.postOutcomeId ? (outcomes[act.postOutcomeId]?.name || "") : "";
    elkEdges.push({
      id: `seq-${actIds[i]}-${actIds[i + 1]}`,
      sources: [actIds[i]],
      targets: [actIds[i + 1]],
      labels: oName ? [{ text: oName } as ElkLabel] : [],
    });
  }

  const result = await elk.layout({
    id: "root",
    children: [{
      id: "vs-container",
      labels: [{ text: vs.name || vsId }],
      children: actChildren,
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.spacing.nodeNode": "30",
        "elk.layered.spacing.nodeNodeBetweenLayers": "50",
        "elk.padding": "[top=40,left=24,bottom=20,right=24]",
      },
    }],
    edges: elkEdges,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
    },
  });

  // Convert — activities carry their data
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  for (const group of result.children || []) {
    const g: LayoutNode = {
      id: group.id, x: group.x || 0, y: group.y || 0,
      width: group.width || 0, height: group.height || 0,
      label: group.labels?.[0]?.text || "", type: "zone", children: [],
    };
    for (const child of group.children || []) {
      const act = acts[child.id];
      const preOut = outcomes[act?.preOutcomeId]?.name || "";
      const postOut = outcomes[act?.postOutcomeId]?.name || "";
      g.children!.push({
        id: child.id, x: child.x || 0, y: child.y || 0,
        width: child.width || 0, height: child.height || 0,
        label: child.labels?.[0]?.text || child.id,
        type: "activity", data: act,
        subtitle: preOut && postOut ? `${truncate(preOut, 18)} → ${truncate(postOut, 18)}` : undefined,
      });
    }
    nodes.push(g);
  }

  for (const edge of result.edges || []) {
    const ext = edge as ElkExtendedEdge;
    const sec = ext.sections?.[0];
    if (!sec) continue;
    edges.push({
      id: ext.id, sections: ext.sections as any,
      label: ext.labels?.[0]?.text,
      type: "sequence", color: theme.activity, dashed: false,
    });
  }

  return { nodes, edges };
}

// ── L3: Stage Detail (Activity) ──

async function buildL3(scaffold: any, activityId: string): Promise<{ nodes: LayoutNode[]; edges: LayoutEdge[] }> {
  const el = scaffold.elements;
  const act = el.activities?.[activityId];
  if (!act) return { nodes: [], edges: [] };

  const outcomes = el.outcomes || {};
  const roles = el.roles || {};
  const caps = el.capabilities || {};
  const metrics = el.metrics || {};

  // Collect the elements for this stage
  const items: { id: string; label: string; type: string; data?: any }[] = [];

  // Entry & exit states
  if (act.preOutcomeId && outcomes[act.preOutcomeId]) {
    items.push({ id: `out-${act.preOutcomeId}`, label: `Entry: ${outcomes[act.preOutcomeId].name}`, type: "outcome" });
  }
  if (act.postOutcomeId && outcomes[act.postOutcomeId]) {
    items.push({ id: `out-${act.postOutcomeId}`, label: `Exit: ${outcomes[act.postOutcomeId].name}`, type: "outcome" });
  }

  // Stakeholders (roles)
  for (const rId of act.performedByRoleIds || []) {
    if (roles[rId]) items.push({ id: rId, label: roles[rId].name || rId, type: "role", data: roles[rId] });
  }

  // Metrics
  for (const mId of act.metricIds || []) {
    if (metrics[mId]) items.push({ id: mId, label: metrics[mId].name || mId, type: "metric", data: metrics[mId] });
  }

  // Capabilities (the drillable items)
  const capIds = act.requiresCapabilityIds || act.enabledByCapabilityIds || [];
  for (const cId of capIds) {
    if (caps[cId]) items.push({ id: cId, label: caps[cId].name || cId, type: "capability", data: caps[cId] });
  }

  if (items.length === 0) return { nodes: [], edges: [] };

  // Group into sections
  const sections: { id: string; label: string; items: typeof items }[] = [];
  const stateItems = items.filter(i => i.type === "outcome");
  const roleItems = items.filter(i => i.type === "role");
  const metricItems = items.filter(i => i.type === "metric");
  const capItems = items.filter(i => i.type === "capability");

  if (stateItems.length > 0) sections.push({ id: "states", label: "State Transitions", items: stateItems });
  if (roleItems.length > 0) sections.push({ id: "stakeholders", label: "Stakeholders", items: roleItems });
  if (metricItems.length > 0) sections.push({ id: "metrics", label: "Metrics", items: metricItems });
  if (capItems.length > 0) sections.push({ id: "capabilities", label: "Capabilities", items: capItems });

  const ITEM_W = 200;
  const ITEM_H = 40;

  const elkChildren: ElkNode[] = sections.map(sec => ({
    id: sec.id,
    labels: [{ text: sec.label }],
    children: sec.items.map(item => ({
      id: item.id,
      width: ITEM_W,
      height: ITEM_H,
      labels: [{ text: item.label }],
    })),
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "16",
      "elk.padding": "[top=34,left=16,bottom=12,right=16]",
    },
  }));

  const result = await elk.layout({
    id: "root",
    children: elkChildren,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "24",
      "elk.layered.spacing.nodeNodeBetweenLayers": "30",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
    },
  });

  // Convert
  const nodes: LayoutNode[] = [];
  const itemTypeMap = new Map(items.map(i => [i.id, i.type]));
  const itemDataMap = new Map(items.map(i => [i.id, i.data]));

  for (const group of result.children || []) {
    const g: LayoutNode = {
      id: group.id, x: group.x || 0, y: group.y || 0,
      width: group.width || 0, height: group.height || 0,
      label: group.labels?.[0]?.text || "", type: "zone", children: [],
    };
    for (const child of group.children || []) {
      g.children!.push({
        id: child.id, x: child.x || 0, y: child.y || 0,
        width: child.width || 0, height: child.height || 0,
        label: child.labels?.[0]?.text || child.id,
        type: itemTypeMap.get(child.id) || "unknown",
        data: itemDataMap.get(child.id),
      });
    }
    nodes.push(g);
  }

  return { nodes, edges: [] };
}

// ── L4: Capability PPIT ──

async function buildL4(scaffold: any, capabilityId: string, activityId?: string): Promise<{ nodes: LayoutNode[]; edges: LayoutEdge[] }> {
  const el = scaffold.elements;
  const cap = el.capabilities?.[capabilityId];
  if (!cap) return { nodes: [], edges: [] };

  const roles = el.roles || {};
  const infoObjs = el.informationObjects || {};
  const appFuncs = el.applicationFunctions || {};

  // Try to find PPIT data from the activity's capabilityPPIT map
  let ppitData: any = null;
  if (activityId) {
    const act = el.activities?.[activityId];
    ppitData = act?.capabilityPPIT?.[capabilityId];
  }

  // If no PPIT from a specific activity, scan all activities that reference this cap
  if (!ppitData) {
    for (const [, act] of Object.entries(el.activities || {}) as [string, any][]) {
      if (act.capabilityPPIT?.[capabilityId]) {
        ppitData = act.capabilityPPIT[capabilityId];
        break;
      }
    }
  }

  const sections: { id: string; label: string; items: { id: string; label: string; type: string }[] }[] = [];

  // People (roles from PPIT or from capability's parent activity)
  const ppitRoleIds = ppitData?.roleIds || ppitData?.performedByRoleIds || [];
  if (ppitRoleIds.length > 0) {
    sections.push({
      id: "people", label: "People (Roles)",
      items: ppitRoleIds.map((rId: string) => ({
        id: rId, label: roles[rId]?.name || rId, type: "role",
      })),
    });
  }

  // Process (sub-activities)
  const subActs = ppitData?.subActivities || [];
  if (subActs.length > 0) {
    sections.push({
      id: "process", label: "Process (Sub-Activities)",
      items: subActs.map((sa: any, i: number) => ({
        id: `subact-${i}`, label: sa.name || sa, type: "subActivity",
      })),
    });
  }

  // Information (objects)
  const ioIds = ppitData?.informationObjectIds || [];
  if (ioIds.length > 0) {
    sections.push({
      id: "information", label: "Information Objects",
      items: ioIds.map((ioId: string) => ({
        id: ioId, label: infoObjs[ioId]?.name || ioId, type: "infoObject",
      })),
    });
  }

  // Technology (app functions)
  const techIds = ppitData?.technologyAppIds || ppitData?.applicationFunctionIds || [];
  if (techIds.length > 0) {
    sections.push({
      id: "technology", label: "Technology",
      items: techIds.map((tId: string) => ({
        id: tId, label: appFuncs[tId]?.name || tId, type: "appFunction",
      })),
    });
  }

  // If no PPIT data at all, show a message node
  if (sections.length === 0) {
    return {
      nodes: [{
        id: "empty", x: 40, y: 40, width: 320, height: 60,
        label: "No PPIT data available for this capability", type: "zone",
      }],
      edges: [],
    };
  }

  const ITEM_W = 200;
  const ITEM_H = 36;

  const elkChildren: ElkNode[] = sections.map(sec => ({
    id: sec.id,
    labels: [{ text: sec.label }],
    children: sec.items.map(item => ({
      id: item.id,
      width: ITEM_W,
      height: ITEM_H,
      labels: [{ text: item.label }],
    })),
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "10",
      "elk.padding": "[top=32,left=14,bottom=10,right=14]",
    },
  }));

  const result = await elk.layout({
    id: "root",
    children: elkChildren,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "30",
      "elk.layered.spacing.nodeNodeBetweenLayers": "40",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    },
  });

  const nodes: LayoutNode[] = [];
  const typeMap = new Map<string, string>();
  for (const sec of sections) {
    for (const item of sec.items) typeMap.set(item.id, item.type);
  }

  for (const group of result.children || []) {
    const g: LayoutNode = {
      id: group.id, x: group.x || 0, y: group.y || 0,
      width: group.width || 0, height: group.height || 0,
      label: group.labels?.[0]?.text || "", type: "zone", children: [],
    };
    for (const child of group.children || []) {
      g.children!.push({
        id: child.id, x: child.x || 0, y: child.y || 0,
        width: child.width || 0, height: child.height || 0,
        label: child.labels?.[0]?.text || child.id,
        type: typeMap.get(child.id) || "unknown",
      });
    }
    nodes.push(g);
  }

  return { nodes, edges: [] };
}

// ── Convert ELK result to LayoutNodes/Edges (for L1) ──

function convertElkResult(result: ElkNode, elements: any, _level: string): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  for (const zoneNode of result.children || []) {
    const zN: LayoutNode = {
      id: zoneNode.id, x: zoneNode.x || 0, y: zoneNode.y || 0,
      width: zoneNode.width || 0, height: zoneNode.height || 0,
      label: zoneNode.labels?.[0]?.text || "", type: "zone", children: [],
    };
    for (const child of zoneNode.children || []) {
      const vsData = elements.valueStreams?.[child.id];
      const stageCount = vsData ? resolveActivityIds(vsData, elements.activities || {}).length : 0;
      zN.children!.push({
        id: child.id, x: child.x || 0, y: child.y || 0,
        width: child.width || 0, height: child.height || 0,
        label: child.labels?.[0]?.text || child.id,
        type: "valueStream", data: vsData,
        subtitle: `${stageCount} stages`,
      });
    }
    nodes.push(zN);
  }

  for (const edge of result.edges || []) {
    const ext = edge as ElkExtendedEdge;
    const sec = ext.sections?.[0];
    if (!sec) continue;
    const isFb = ext.id.startsWith("fb-");
    edges.push({
      id: ext.id, sections: ext.sections as any,
      label: ext.labels?.[0]?.text,
      type: isFb ? "feedback" : "flow",
      color: isFb ? theme.textDim : theme.valueStream,
      dashed: isFb,
    });
  }

  return { nodes, edges };
}

// ── Inspector builder ──

function buildInspector(id: string, type: string, scaffold: any): InspectorData | null {
  const el = scaffold.elements;
  if (type === "valueStream") {
    const vs = el.valueStreams?.[id];
    if (!vs) return null;
    const actIds = resolveActivityIds(vs, el.activities || {});
    return {
      id, name: vs.name || id, type: "Value Stream",
      fields: [
        { label: "Description", value: vs.description || "—" },
        { label: "Zone", value: getZone(vs) },
        { label: "Stages", value: String(actIds.length) },
      ],
      connections: actIds.map((aId: string) => ({
        label: "stage", targetId: aId,
        targetName: el.activities?.[aId]?.name || aId, targetType: "activity",
      })),
    };
  }
  if (type === "activity") {
    const act = el.activities?.[id];
    if (!act) return null;
    const outcomes = el.outcomes || {};
    const conns: InspectorData["connections"] = [];
    for (const rId of act.performedByRoleIds || []) {
      conns.push({ label: "performed by", targetId: rId, targetName: el.roles?.[rId]?.name || rId, targetType: "role" });
    }
    for (const cId of (act.requiresCapabilityIds || act.enabledByCapabilityIds || [])) {
      conns.push({ label: "requires", targetId: cId, targetName: el.capabilities?.[cId]?.name || cId, targetType: "capability" });
    }
    return {
      id, name: act.name || id, type: "Activity",
      fields: [
        { label: "Entry State", value: outcomes[act.preOutcomeId]?.name || "—" },
        { label: "Exit State", value: outcomes[act.postOutcomeId]?.name || "—" },
        ...(act.performedByRoleIds?.length ? [{ label: "Roles", value: act.performedByRoleIds.map((r: string) => el.roles?.[r]?.name || r).join(", ") }] : []),
      ],
      connections: conns,
    };
  }
  if (type === "capability") {
    const cap = el.capabilities?.[id];
    if (!cap) return null;
    const conns: InspectorData["connections"] = [];
    for (const [aId, act] of Object.entries(el.activities || {}) as [string, any][]) {
      if ((act.requiresCapabilityIds || act.enabledByCapabilityIds || []).includes(id)) {
        conns.push({ label: "used in", targetId: aId, targetName: act.name || aId, targetType: "activity" });
      }
    }
    return {
      id, name: cap.name || id, type: `Capability (L${cap.level || "?"})`,
      fields: [
        ...(cap.description ? [{ label: "Description", value: cap.description }] : []),
        ...(cap.level ? [{ label: "Level", value: `L${cap.level}` }] : []),
        ...(cap.parentId ? [{ label: "Parent", value: el.capabilities?.[cap.parentId]?.name || cap.parentId }] : []),
      ],
      connections: conns,
    };
  }
  if (type === "role") {
    const role = el.roles?.[id];
    if (!role) return null;
    const conns: InspectorData["connections"] = [];
    for (const [aId, act] of Object.entries(el.activities || {}) as [string, any][]) {
      if ((act.performedByRoleIds || []).includes(id)) {
        conns.push({ label: "performs in", targetId: aId, targetName: act.name || aId, targetType: "activity" });
      }
    }
    return { id, name: role.name || id, type: "Role", fields: [], connections: conns };
  }
  return null;
}

// ── SVG helpers ──

function edgePath(edge: LayoutEdge): string {
  const sec = edge.sections?.[0];
  if (!sec) return "";
  let d = `M ${sec.startPoint.x} ${sec.startPoint.y}`;
  for (const bp of sec.bendPoints || []) d += ` L ${bp.x} ${bp.y}`;
  d += ` L ${sec.endPoint.x} ${sec.endPoint.y}`;
  return d;
}

function edgeLabelPos(edge: LayoutEdge): { x: number; y: number } | null {
  const sec = edge.sections?.[0];
  if (!sec) return null;
  // Place label at midpoint of first segment
  const bps = sec.bendPoints || [];
  const p1 = sec.startPoint;
  const p2 = bps.length > 0 ? bps[0] : sec.endPoint;
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 8 };
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

  const current = drillStack[drillStack.length - 1];

  const levelLabels: Record<number, string> = {
    1: "Operating Model",
    2: "Value Stream",
    3: "Stage Detail",
    4: "Capability PPIT",
  };

  // Compute layout on drill change
  useEffect(() => {
    if (!scaffoldData?.elements) return;
    setLoading(true);
    setError(null);
    setSelectedId(null);
    setSelectedType(null);

    (async () => {
      try {
        let result: { nodes: LayoutNode[]; edges: LayoutEdge[] };
        if (current.level === 1) {
          result = await buildL1(scaffoldData);
        } else if (current.level === 2 && current.vsId) {
          result = await buildL2(scaffoldData, current.vsId);
        } else if (current.level === 3 && current.activityId) {
          result = await buildL3(scaffoldData, current.activityId);
        } else if (current.level === 4 && current.capabilityId) {
          result = await buildL4(scaffoldData, current.capabilityId, current.activityId);
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
          const pad = 50;
          setViewBox({ x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 });
        }
      } catch (err: any) {
        console.error("ELK layout error:", err);
        setError(err.message || "Layout failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [scaffoldData, current.level, current.vsId, current.activityId, current.capabilityId]);

  // Drill-in
  const drillIn = useCallback((id: string, type: string) => {
    if (current.level === 1 && type === "valueStream") {
      const name = scaffoldData?.elements?.valueStreams?.[id]?.name || id;
      setDrillStack(prev => [...prev, { level: 2, label: name, vsId: id }]);
    } else if (current.level === 2 && type === "activity") {
      const name = scaffoldData?.elements?.activities?.[id]?.name || id;
      setDrillStack(prev => [...prev, { level: 3, label: name, vsId: current.vsId, activityId: id }]);
    } else if (current.level === 3 && type === "capability") {
      const name = scaffoldData?.elements?.capabilities?.[id]?.name || id;
      setDrillStack(prev => [...prev, { level: 4, label: name, vsId: current.vsId, activityId: current.activityId, capabilityId: id }]);
    }
  }, [current, scaffoldData]);

  const drillOut = useCallback((toIndex: number) => {
    setDrillStack(prev => prev.slice(0, toIndex + 1));
  }, []);

  // Inspector
  const inspectorData = useMemo(() => {
    if (!selectedId || !selectedType || !scaffoldData) return null;
    return buildInspector(selectedId, selectedType, scaffoldData);
  }, [selectedId, selectedType, scaffoldData]);

  // Pan/zoom handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const tag = (e.target as Element).tagName;
    if (tag === "svg" || (e.target as Element).classList.contains("graph-bg")) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vbx: viewBox.x, vby: viewBox.y };
      e.preventDefault();
    }
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - panStart.current.x) * (viewBox.w / rect.width);
    const dy = (e.clientY - panStart.current.y) * (viewBox.h / rect.height);
    setViewBox(prev => ({ ...prev, x: panStart.current.vbx - dx, y: panStart.current.vby - dy }));
  }, [isPanning, viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
    setViewBox({
      x: mx - (mx - viewBox.x) * factor,
      y: my - (my - viewBox.y) * factor,
      w: viewBox.w * factor,
      h: viewBox.h * factor,
    });
  }, [viewBox]);

  const handleNodeClick = useCallback((id: string, type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    setSelectedType(type);
  }, []);

  const handleNodeDoubleClick = useCallback((id: string, type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    drillIn(id, type);
  }, [drillIn]);

  // Determine which element types can be drilled into at current level
  const drillableTypes = useMemo(() => {
    if (current.level === 1) return new Set(["valueStream"]);
    if (current.level === 2) return new Set(["activity"]);
    if (current.level === 3) return new Set(["capability"]);
    return new Set<string>();
  }, [current.level]);

  // Hint text
  const drillHint = useMemo(() => {
    if (current.level === 1) return "Double-click a value stream to drill in";
    if (current.level === 2) return "Double-click a stage to see its detail";
    if (current.level === 3) return "Double-click a capability to see PPIT";
    return "";
  }, [current.level]);

  // ── Render ──

  return (
    <div style={{ display: "flex", height: "100%", background: theme.bg, borderRadius: 8, overflow: "hidden" }}>
      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Breadcrumb */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
          borderBottom: `1px solid ${theme.border}`, background: theme.bgSurface, flexShrink: 0,
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
                  padding: "4px 10px", borderRadius: 4, fontSize: 13,
                  fontWeight: i === drillStack.length - 1 ? 600 : 400, fontFamily: "inherit",
                }}
              >
                {level.label}
              </button>
            </span>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{
            color: theme.textDim, fontSize: 11, padding: "3px 8px",
            border: `1px solid ${theme.border}`, borderRadius: 4,
          }}>
            L{current.level} — {levelLabels[current.level]}
          </span>
        </div>

        {/* SVG canvas */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textDim }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>⟳</div>
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
            <rect className="graph-bg" x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill={theme.bg} />

            {/* Arrow marker */}
            <defs>
              <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={theme.textDim} />
              </marker>
            </defs>

            {/* Edges */}
            <g className="edges">
              {layoutEdges.map(edge => {
                const lp = edgeLabelPos(edge);
                return (
                  <g key={edge.id}>
                    <path
                      d={edgePath(edge)}
                      fill="none"
                      stroke={edge.color}
                      strokeWidth={1.5}
                      strokeDasharray={edge.dashed ? "6 4" : undefined}
                      markerEnd="url(#arr)"
                    />
                    {edge.label && lp && (
                      <text x={lp.x} y={lp.y} fill={theme.textDim} fontSize={10} textAnchor="middle"
                        style={{ pointerEvents: "none" }}>
                        {truncate(edge.label, 30)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Zones + child nodes */}
            {layoutNodes.map(zone => (
              <g key={zone.id} transform={`translate(${zone.x}, ${zone.y})`}>
                {/* Zone container */}
                <rect x={0} y={0} width={zone.width} height={zone.height} rx={8}
                  fill={theme.zone} stroke={theme.zoneBorder} strokeWidth={1} strokeDasharray="4 3" />
                {/* Zone label */}
                <text x={14} y={20} fill={theme.textDim} fontSize={11} fontWeight={600}
                  style={{ pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {zone.label}
                </text>

                {/* Child elements */}
                {(zone.children || []).map(child => {
                  const isSelected = selectedId === child.id;
                  const isHovered = hoveredId === child.id;
                  const dimmed = (hoveredId || selectedId) && !isSelected && !isHovered;
                  const color = typeColor(child.type);
                  const canDrill = drillableTypes.has(child.type);

                  return (
                    <g key={child.id} transform={`translate(${child.x}, ${child.y})`}
                      onClick={(e) => handleNodeClick(child.id, child.type, e)}
                      onDoubleClick={(e) => handleNodeDoubleClick(child.id, child.type, e)}
                      onMouseEnter={() => setHoveredId(child.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ cursor: canDrill ? "pointer" : "default", opacity: dimmed ? 0.3 : 1, transition: "opacity 0.2s" }}>

                      <rect x={0} y={0} width={child.width} height={child.height} rx={6}
                        fill={isSelected ? `${color}22` : isHovered ? `${color}11` : `${color}08`}
                        stroke={isSelected ? color : isHovered ? `${color}88` : `${color}44`}
                        strokeWidth={isSelected ? 2 : 1} />

                      {/* Icon */}
                      <text x={10} y={child.subtitle ? child.height / 2 - 4 : child.height / 2 + 1}
                        fill={color} fontSize={13} dominantBaseline="middle"
                        style={{ pointerEvents: "none" }}>
                        {typeIcon(child.type)}
                      </text>

                      {/* Label */}
                      <text x={28} y={child.subtitle ? child.height / 2 - 4 : child.height / 2 + 1}
                        fill={theme.text} fontSize={12} fontWeight={500} dominantBaseline="middle"
                        style={{ pointerEvents: "none" }}>
                        {truncate(child.label, 28)}
                      </text>

                      {/* Subtitle */}
                      {child.subtitle && (
                        <text x={28} y={child.height / 2 + 12}
                          fill={theme.textDim} fontSize={10} dominantBaseline="middle"
                          style={{ pointerEvents: "none" }}>
                          {child.subtitle}
                        </text>
                      )}

                      {/* Drill chevron */}
                      {canDrill && (
                        <text x={child.width - 16} y={child.height / 2 + 1}
                          fill={`${color}66`} fontSize={16} dominantBaseline="middle" textAnchor="end"
                          style={{ pointerEvents: "none" }}>
                          ›
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        )}

        {/* Hint bar */}
        <div style={{
          padding: "6px 16px 6px 290px", borderTop: `1px solid ${theme.border}`, background: theme.bgSurface,
          display: "flex", gap: 16, fontSize: 11, color: theme.textDim, flexShrink: 0,
          position: "relative", zIndex: 10,
        }}>
          <span>Click to inspect</span>
          {drillHint && <span>{drillHint}</span>}
          <span>Scroll to zoom</span>
          <span>Drag to pan</span>
        </div>
      </div>

      {/* Inspector panel */}
      {inspectorData && (
        <div style={{
          width: 300, borderLeft: `1px solid ${theme.border}`, background: theme.bgSurface,
          overflowY: "auto", flexShrink: 0, padding: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: typeColor(selectedType || ""), fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {inspectorData.type}
            </span>
            <button onClick={() => { setSelectedId(null); setSelectedType(null); }}
              style={{ background: "transparent", border: "none", color: theme.textDim, cursor: "pointer", fontSize: 16, padding: 4 }}>
              ✕
            </button>
          </div>

          <h3 style={{ color: theme.text, fontSize: 16, fontWeight: 600, margin: "0 0 16px 0" }}>
            {inspectorData.name}
          </h3>

          {inspectorData.fields.map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                {f.label}
              </div>
              <div style={{ color: theme.text, fontSize: 13 }}>{f.value}</div>
            </div>
          ))}

          {inspectorData.connections.length > 0 && (
            <>
              <div style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 8 }}>
                Connections ({inspectorData.connections.length})
              </div>
              {inspectorData.connections.map((c, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 4, marginBottom: 4,
                  cursor: "pointer", background: hoveredId === c.targetId ? theme.accentDim : "transparent", transition: "background 0.15s",
                }}
                  onMouseEnter={() => setHoveredId(c.targetId)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => { setSelectedId(c.targetId); setSelectedType(c.targetType); }}>
                  <span style={{ color: typeColor(c.targetType), fontSize: 12 }}>{typeIcon(c.targetType)}</span>
                  <span style={{ color: theme.text, fontSize: 12, flex: 1 }}>{c.targetName}</span>
                  <span style={{ color: theme.textDim, fontSize: 10 }}>{c.label}</span>
                </div>
              ))}
            </>
          )}

          {/* Drill-in button */}
          {selectedType && drillableTypes.has(selectedType) && (
            <button
              onClick={() => drillIn(selectedId!, selectedType!)}
              style={{
                width: "100%", marginTop: 16, padding: "10px 16px",
                background: `${typeColor(selectedType)}22`, border: `1px solid ${typeColor(selectedType)}44`,
                borderRadius: 6, color: typeColor(selectedType), cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              }}>
              {current.level === 1 ? "View Stages" : current.level === 2 ? "View Stage Detail" : "View PPIT"} ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
