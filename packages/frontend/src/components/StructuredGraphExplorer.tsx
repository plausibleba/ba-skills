// Structured Graph Explorer — ELK.js + SVG C4-style drill-in/out diagrams
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

import { useState, useMemo, useCallback } from "react";

// ── Theme ──

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
  subActivity: "#22c55e",
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
}) {
  const itemH = compact ? 32 : 44;
  const labelSize = compact ? 10 : 12;
  const sectionLabelSize = compact ? 9 : 11;
  const maxLabelLen = compact ? 22 : 34;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 16, padding: compact ? 8 : 16 }}>
      {sections.map(sec => (
        <div key={sec.id} style={{
          border: `1px dashed ${theme.zoneBorder}`,
          borderRadius: 8,
          padding: compact ? "6px 8px" : "12px 14px",
          background: theme.zone,
        }}>
          <div style={{
            color: theme.textDim, fontSize: sectionLabelSize, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em",
            marginBottom: compact ? 4 : 8,
          }}>
            {sec.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: compact ? 3 : 6 }}>
            {sec.items.map(item => {
              const isSelected = selectedId === item.id;
              const isHovered = hoveredId === item.id;
              const isHighlight = highlightId === item.id;
              const color = typeColor(item.type);
              const canDrill = drillableTypes.has(item.type);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id, item.type)}
                  onDoubleClick={() => onDoubleClick(item.id, item.type)}
                  onMouseEnter={() => onHover(item.id)}
                  onMouseLeave={() => onHover(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    height: itemH, padding: "0 10px", borderRadius: 6,
                    cursor: canDrill ? "pointer" : "default",
                    background: isHighlight ? `${color}30` : isSelected ? `${color}22` : isHovered ? `${color}0c` : `${color}08`,
                    border: `1px solid ${isHighlight ? color : isSelected ? color : isHovered ? `${color}66` : `${color}33`}`,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ color, fontSize: compact ? 11 : 13, flexShrink: 0 }}>{typeIcon(item.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: theme.text, fontSize: labelSize, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {trunc(item.label, maxLabelLen)}
                    </div>
                    {item.subtitle && !compact && (
                      <div style={{ color: theme.textDim, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  {canDrill && (
                    <span style={{ color: `${color}66`, fontSize: compact ? 12 : 16, flexShrink: 0 }}>›</span>
                  )}
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
          {drillStack.map((lvl, i) => (
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
                {lvl.label}
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

        {/* Columns area: context panels (compact) | dotted divider | detail panel (full) */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
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

            return (
              <div key={i} style={{ display: "flex", flexShrink: isContext ? 0 : undefined, flex: col.isCurrent ? 1 : undefined }}>
                {/* Dotted divider */}
                {showDivider && (
                  <div style={{
                    width: 1, background: "transparent",
                    borderLeft: `2px dashed ${theme.zoneBorder}`,
                    margin: "16px 0",
                    flexShrink: 0,
                  }} />
                )}
                {/* Column content */}
                <div style={{
                  width: isContext ? 200 : undefined,
                  flex: col.isCurrent ? 1 : undefined,
                  overflowY: "auto",
                  overflowX: "hidden",
                  opacity: isContext ? 0.6 : 1,
                  transition: "opacity 0.2s",
                  position: "relative",
                }}>
                  {/* Level label */}
                  <div style={{
                    padding: isContext ? "6px 8px" : "8px 16px",
                    fontSize: isContext ? 9 : 11,
                    fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: "0.05em", color: theme.accent,
                    borderBottom: `1px solid ${theme.border}`,
                    position: "sticky", top: 0, background: theme.bg, zIndex: 2,
                  }}>
                    L{col.level.level} · {col.level.label}
                  </div>
                  <SectionCards
                    sections={col.sections}
                    selectedId={col.isCurrent ? selectedId : null}
                    hoveredId={col.isCurrent ? hoveredId : null}
                    onSelect={(id, type) => { if (col.isCurrent) { setSelectedId(id); setSelectedType(type); } else { /* click on context item navigates back */ drillOut(i); } }}
                    onHover={(id) => { if (col.isCurrent) setHoveredId(id); }}
                    onDoubleClick={(id, type) => {
                      if (col.isCurrent) drillIn(id, type);
                      else drillOut(i); // double-click on context goes back to that level
                    }}
                    drillableTypes={colDrillable}
                    compact={isContext}
                    highlightId={col.highlightId}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Hint bar */}
        <div style={{
          padding: "6px 16px 6px 290px", borderTop: `1px solid ${theme.border}`, background: theme.bgSurface,
          display: "flex", gap: 16, fontSize: 11, color: theme.textDim, flexShrink: 0, position: "relative", zIndex: 10,
        }}>
          <span>Click to inspect</span>
          {drillHint && <span>{drillHint}</span>}
          <span>Click context column to navigate back</span>
        </div>
      </div>

      {/* Inspector panel */}
      {inspector && (
        <div style={{
          width: 280, borderLeft: `1px solid ${theme.border}`, background: theme.bgSurface,
          overflowY: "auto", flexShrink: 0, padding: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: typeColor(selectedType || ""), fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {inspector.typeName}
            </span>
            <button onClick={() => { setSelectedId(null); setSelectedType(null); }}
              style={{ background: "transparent", border: "none", color: theme.textDim, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
          </div>
          <h3 style={{ color: theme.text, fontSize: 16, fontWeight: 600, margin: "0 0 16px 0" }}>{inspector.name}</h3>
          {inspector.fields.map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ color: theme.textDim, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{f.label}</div>
              <div style={{ color: theme.text, fontSize: 13 }}>{f.value}</div>
            </div>
          ))}
          {selectedType && drillableTypes.has(selectedType) && (
            <button onClick={() => drillIn(selectedId!, selectedType!)}
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
