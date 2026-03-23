// Structured Graph Explorer — card-based C4-style drill-in/out diagrams
// Session 27 — Phase 3a: L1→L2→L3→L4 with context preservation
//
// Context model: when drilling in, the parent level stays visible as a compact
// column on the left, connected to the detail area by a dotted line divider.
// This gives spatial memory of "where did I come from" at every level.
//
// Drill hierarchy:
//   L1  Operating Model — VS boxes in zone swim-lanes
//   L2  Value Stream — stage chain (vertical)
//   L3  Stage Detail — entry/exit, stakeholders, metrics, capabilities (vertical)
//   L4  Capability PPIT — roles, sub-activities, info objects, technology

import { useState, useMemo, useCallback, useEffect, useRef } from "react";

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
  zone: "rgba(212, 160, 83, 0.04)",
  zoneBorder: "rgba(212, 160, 83, 0.2)",
};

// ── Types ──

interface DrillLevel {
  level: 1 | 2 | 3 | 4;
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
  data?: any;
}

interface SectionData {
  id: string;
  label: string;
  items: SimpleNode[];
}

// ── Helpers ──

function resolveActivityIds(vs: any, acts: Record<string, any>): string[] {
  if (Array.isArray(vs.activityIds)) return vs.activityIds;
  const head = vs.activityChainHead;
  if (!head) return [];
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = head;
  while (cur && !seen.has(cur) && acts[cur]) {
    seen.add(cur);
    chain.push(cur);
    cur = acts[cur].nextActivityId ?? null;
  }
  return chain;
}

function getZone(vs: any): string {
  return vs.layoutZone ?? vs.zone ?? "default";
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function typeColor(type: string): string {
  return (theme as any)[type] || theme.textDim;
}

function typeIcon(type: string): string {
  const m: Record<string, string> = {
    valueStream: "⟶", activity: "◆", capability: "⬡", role: "👤",
    metric: "📊", outcome: "○", infoObject: "◇", appFunction: "⚙",
    subActivity: "▸",
  };
  return m[type] || "•";
}

// ── Data builders (no ELK needed — we use simple vertical card layouts) ──

function buildL1Data(scaffold: any): { sections: SectionData[]; edges: { from: string; to: string; label: string; dashed: boolean }[] } {
  const el = scaffold.elements;
  const vsEntries = Object.entries(el.valueStreams || {}) as [string, any][];
  const acts = el.activities || {};
  const outcomes = el.outcomes || {};

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

  // Edges
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
    // Secondary triggers
    for (const trigId of vs.secondaryTriggerOutcomeIds || []) {
      const arr = entryMap.get(trigId) ?? [];
      arr.push(vs.id);
      entryMap.set(trigId, arr);
    }
  }

  const edges: { from: string; to: string; label: string; dashed: boolean }[] = [];
  // Check ALL activities' postOutcomes against entry map (not just terminal)
  for (const [, vs] of vsEntries) {
    const actIds = resolveActivityIds(vs, acts);
    for (const aId of actIds) {
      const act = acts[aId];
      if (!act?.postOutcomeId) continue;
      const targets = entryMap.get(act.postOutcomeId) ?? [];
      for (const tgtVsId of targets) {
        if (tgtVsId === vs.id) continue;
        // Is this a secondary trigger (feedback)?
        const tgtVs = el.valueStreams[tgtVsId];
        const isFeedback = (tgtVs?.secondaryTriggerOutcomeIds || []).includes(act.postOutcomeId);
        const oName = outcomes[act.postOutcomeId]?.name || "";
        if (!edges.some(e => e.from === vs.id && e.to === tgtVsId && e.label === oName)) {
          edges.push({ from: vs.id, to: tgtVsId, label: oName, dashed: isFeedback });
        }
      }
    }
  }

  return { sections, edges };
}

function buildL2Data(scaffold: any, vsId: string): SectionData[] {
  const el = scaffold.elements;
  const vs = el.valueStreams?.[vsId];
  if (!vs) return [];
  const acts = el.activities || {};
  const actIds = resolveActivityIds(vs, acts);

  return [{
    id: "stages",
    label: vs.name || vsId,
    items: actIds.map(aId => {
      const act = acts[aId];
      const capCount = (act?.requiresCapabilityIds || act?.enabledByCapabilityIds || []).length;
      const roleCount = (act?.performedByRoleIds || []).length;
      return {
        id: aId,
        label: act?.name || aId,
        type: "activity",
        subtitle: `${roleCount} roles · ${capCount} capabilities`,
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

// ── Flow arrow connector (between activity cards in a chain) ──

function FlowArrow({ compact }: { compact: boolean }) {
  const h = compact ? 12 : 20;
  const color = theme.activity;
  return (
    <div style={{ display: "flex", justifyContent: "center", height: h, flexShrink: 0, opacity: 0.5 }}>
      <svg width="12" height={h} viewBox={`0 0 12 ${h}`}>
        <line x1="6" y1="0" x2="6" y2={h - 4} stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points={`3,${h - 5} 9,${h - 5} 6,${h}`} fill={color} />
      </svg>
    </div>
  );
}

// ── Edge badge (shows VS-to-VS relationships at L1) ──

function EdgeBadge({ label, dashed }: { label: string; dashed: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "1px 6px", borderRadius: 10,
      background: dashed ? "rgba(168,85,247,0.12)" : "rgba(59,130,246,0.12)",
      border: `1px ${dashed ? "dashed" : "solid"} ${dashed ? "rgba(168,85,247,0.3)" : "rgba(59,130,246,0.25)"}`,
      color: dashed ? "#c084fc" : "#93c5fd",
      fontSize: 9, fontWeight: 500, lineHeight: 1,
      maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 8 }}>{dashed ? "↩" : "→"}</span>
      {label || "linked"}
    </span>
  );
}

// ── Card renderer (used for detail panel and context panel) ──

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
  edges,
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
  edges?: { from: string; to: string; label: string; dashed: boolean }[];
}) {
  const itemH = compact ? 28 : 40;
  const labelSize = compact ? 9 : 12;
  const sectionLabelSize = compact ? 8 : 10;
  const maxLabelLen = compact ? 20 : 40;

  // Build per-item edge lookup (for L1 VS edge badges)
  const edgesByItem = useMemo(() => {
    if (!edges) return new Map<string, { label: string; dashed: boolean }[]>();
    const m = new Map<string, { label: string; dashed: boolean }[]>();
    for (const e of edges) {
      const arr = m.get(e.from) ?? [];
      arr.push({ label: e.label, dashed: e.dashed });
      m.set(e.from, arr);
    }
    return m;
  }, [edges]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 14, padding: compact ? 6 : 14, maxWidth: compact ? undefined : 400 }}>
      {sections.map(sec => (
        <div key={sec.id} style={{
          border: `1px solid ${theme.zoneBorder}`,
          borderRadius: 8,
          padding: compact ? "5px 6px" : "10px 12px",
          background: theme.zone,
          boxShadow: compact ? "none" : "0 1px 4px rgba(0,0,0,0.2)",
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
              const itemEdges = edgesByItem.get(item.id);
              const showArrow = showFlowArrows && idx > 0;

              return (
                <div key={item.id}>
                  {showArrow && <FlowArrow compact={compact} />}
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: isHighlight ? "#fff" : theme.text, fontSize: labelSize,
                        fontWeight: isHighlight ? 600 : 500,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {trunc(item.label, maxLabelLen)}
                      </div>
                      {item.subtitle && !compact && (
                        <div style={{ color: theme.textFaint, fontSize: 10, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.subtitle}
                        </div>
                      )}
                      {/* Edge badges for L1 VS relationships */}
                      {itemEdges && !compact && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
                          {itemEdges.map((e, i) => <EdgeBadge key={i} label={e.label} dashed={e.dashed} />)}
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

// ── Inspector ──

function buildInspector(id: string, type: string, scaffold: any): { name: string; typeName: string; fields: { label: string; value: string }[]; connections: { label: string; id: string; name: string; type: string }[] } | null {
  const el = scaffold.elements;
  if (type === "valueStream") {
    const vs = el.valueStreams?.[id];
    if (!vs) return null;
    return { name: vs.name || id, typeName: "Value Stream", fields: [
      { label: "Description", value: vs.description || "—" },
      { label: "Zone", value: getZone(vs) },
      { label: "Stages", value: String(resolveActivityIds(vs, el.activities || {}).length) },
    ], connections: [] };
  }
  if (type === "activity") {
    const act = el.activities?.[id];
    if (!act) return null;
    const outcomes = el.outcomes || {};
    return { name: act.name || id, typeName: "Activity / Stage", fields: [
      { label: "Entry State", value: outcomes[act.preOutcomeId]?.name || "—" },
      { label: "Exit State", value: outcomes[act.postOutcomeId]?.name || "—" },
      ...(act.performedByRoleIds?.length ? [{ label: "Roles", value: act.performedByRoleIds.map((r: string) => el.roles?.[r]?.name || r).join(", ") }] : []),
    ], connections: [] };
  }
  if (type === "capability") {
    const cap = el.capabilities?.[id];
    if (!cap) return null;
    return { name: cap.name || id, typeName: `Capability (L${cap.level || "?"})`, fields: [
      ...(cap.description ? [{ label: "Description", value: cap.description }] : []),
      ...(cap.parentId ? [{ label: "Parent", value: el.capabilities?.[cap.parentId]?.name || cap.parentId }] : []),
    ], connections: [] };
  }
  if (type === "role") {
    const role = el.roles?.[id];
    if (!role) return null;
    return { name: role.name || id, typeName: "Role", fields: [], connections: [] };
  }
  return null;
}

// ── Main Component ──

export function StructuredGraphExplorer({ scaffoldData }: { scaffoldData: any }) {
  const [drillStack, setDrillStack] = useState<DrillLevel[]>([{ level: 1, label: "Operating Model" }]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const current = drillStack[drillStack.length - 1];

  const levelLabels: Record<number, string> = {
    1: "Operating Model", 2: "Value Stream", 3: "Stage Detail", 4: "Capability PPIT",
  };

  // Drill handlers
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
    }
  }, [current, scaffoldData]);

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
  }, [scaffoldData, drillStack]);

  const l4Data = useMemo(() => {
    const lvl4 = drillStack.find(d => d.level === 4);
    return lvl4?.capabilityId && scaffoldData?.elements
      ? buildL4Data(scaffoldData, lvl4.capabilityId, lvl4.activityId) : null;
  }, [scaffoldData, drillStack]);

  // What types are drillable at the current level?
  const drillableTypes = useMemo(() => {
    if (current.level === 1) return new Set(["valueStream"]);
    if (current.level === 2) return new Set(["activity"]);
    if (current.level === 3) return new Set(["capability"]);
    return new Set<string>();
  }, [current.level]);

  // Inspector
  const inspector = useMemo(() => {
    if (!selectedId || !selectedType || !scaffoldData) return null;
    return buildInspector(selectedId, selectedType, scaffoldData);
  }, [selectedId, selectedType, scaffoldData]);

  // Build the columns to render: context columns (compact) + detail column (full)
  const columns: { level: DrillLevel; sections: SectionData[]; isCurrent: boolean; highlightId?: string }[] = useMemo(() => {
    const cols: typeof columns = [];

    // All ancestors are context columns
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
      if (dl.level === 1 && l1Data) sections = l1Data.sections;
      else if (dl.level === 2 && l2Data) sections = l2Data;
      else if (dl.level === 3 && l3Data) sections = l3Data;
      else if (dl.level === 4 && l4Data) sections = l4Data;

      cols.push({ level: dl, sections, isCurrent, highlightId });
    }

    return cols;
  }, [drillStack, l1Data, l2Data, l3Data, l4Data]);

  // Hint text
  const drillHint = current.level === 1 ? "Double-click a value stream to drill in"
    : current.level === 2 ? "Double-click a stage to see detail"
    : current.level === 3 ? "Double-click a capability to see PPIT" : "";

  // Track drill transitions for animation (key forces re-mount for CSS animation)
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

        {/* Columns area: context panels (compact) | dotted divider | detail panel (full) */}
        <div key={drillAnimKey} style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {columns.map((col, i) => {
            const isContext = !col.isCurrent;
            const showDivider = i > 0;

            // Which types are drillable in this column?
            const colDrillable = col.isCurrent ? drillableTypes : (
              col.level.level === 1 ? new Set(["valueStream"]) :
              col.level.level === 2 ? new Set(["activity"]) :
              col.level.level === 3 ? new Set(["capability"]) :
              new Set<string>()
            );

            // Should this section show flow arrows? (L2 activity chains)
            const isActivityChain = col.level.level === 2;

            return (
              <div key={i} style={{
                display: "flex", flexShrink: isContext ? 0 : undefined, flex: col.isCurrent ? 1 : undefined,
                animation: col.isCurrent ? "sge-slide-in 0.25s ease-out" : isContext ? "sge-fade-in 0.2s ease" : undefined,
              }}>
                {/* Dotted divider */}
                {showDivider && (
                  <div style={{
                    width: 0, flexShrink: 0,
                    borderLeft: `1.5px dashed ${theme.zoneBorder}`,
                    margin: "12px 0",
                  }} />
                )}
                {/* Column content */}
                <div
                  className={isContext ? "sge-context-col" : undefined}
                  style={{
                    width: isContext ? 170 : undefined,
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
                  {/* Level label */}
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
                    edges={col.level.level === 1 && col.isCurrent ? l1Data?.edges : undefined}
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

      {/* Inspector panel */}
      {inspector && (
        <div style={{
          width: 260, borderLeft: `1px solid ${theme.border}`, background: theme.bgSurface,
          overflowY: "auto", flexShrink: 0, padding: 14,
          animation: "sge-fade-in 0.2s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: typeColor(selectedType || ""), fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {inspector.typeName}
            </span>
            <button onClick={() => { setSelectedId(null); setSelectedType(null); }}
              style={{ background: "transparent", border: "none", color: theme.textFaint, cursor: "pointer", fontSize: 14, padding: 4, lineHeight: 1 }}>✕</button>
          </div>
          <h3 style={{ color: theme.text, fontSize: 15, fontWeight: 600, margin: "0 0 14px 0", lineHeight: 1.3 }}>{inspector.name}</h3>
          {inspector.fields.map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ color: theme.textFaint, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{f.label}</div>
              <div style={{ color: theme.text, fontSize: 12, lineHeight: 1.4 }}>{f.value}</div>
            </div>
          ))}
          {selectedType && drillableTypes.has(selectedType) && (
            <button onClick={() => drillIn(selectedId!, selectedType!)}
              style={{
                width: "100%", marginTop: 14, padding: "8px 14px",
                background: `${typeColor(selectedType)}1a`, border: `1px solid ${typeColor(selectedType)}33`,
                borderRadius: 6, color: typeColor(selectedType), cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                transition: "all 0.15s",
              }}>
              {current.level === 1 ? "View Stages" : current.level === 2 ? "View Stage Detail" : "View PPIT"} ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
