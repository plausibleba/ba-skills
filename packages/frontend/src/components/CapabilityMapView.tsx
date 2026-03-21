import { useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { tv } from "../theme.ts";

/* ── Governance detection ─────────────────────────────────── */
const GOV_WORDS = [
  "governance", "compliance", "risk", "audit", "regulatory",
  "data governance", "privacy", "strategy", "performance management",
];
function isGov(name: string): boolean {
  const lower = name.toLowerCase();
  return GOV_WORDS.some((w) => lower.includes(w));
}

function isGovCap(cap: CapNode): boolean {
  if ((cap as any).type === "Governance") return true;
  return false;
}

/* ── Layout types ──────────────────────────────────────────── */

/** Layout mode for any container level */
type LayoutMode = "wrap" | "vertical" | "horizontal";

/** A key like "l1_<id>" or "l2_<id>" → layout preference */
type LayoutMap = Record<string, LayoutMode>;

const LAYOUT_ICONS: Record<LayoutMode, string> = {
  wrap: "⊞",       // grid/wrap
  vertical: "↕",   // stack
  horizontal: "↔", // row
};
const LAYOUT_LABELS: Record<LayoutMode, string> = {
  wrap: "Grid",
  vertical: "Stack",
  horizontal: "Row",
};
const LAYOUT_CYCLE: LayoutMode[] = ["wrap", "vertical", "horizontal"];

function nextLayout(current: LayoutMode): LayoutMode {
  const idx = LAYOUT_CYCLE.indexOf(current);
  return LAYOUT_CYCLE[(idx + 1) % LAYOUT_CYCLE.length];
}

/* ── Hierarchy builder ────────────────────────────────────── */
interface CapNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  description?: string;
  businessObject?: string;
}

interface L3Group {
  id: string;
  name: string;
  caps: CapNode[];
}

interface L2Group {
  id: string;
  name: string;
  l3s: L3Group[];
  caps: CapNode[];
}

interface L1Block {
  id: string;
  name: string;
  gov: boolean;
  l2s: L2Group[];
}

function buildHierarchy(caps: Record<string, any>): L1Block[] {
  // Use Object.entries so we capture the record key as the canonical id —
  // Pass B caps often lack an explicit `id` property in the object value.
  const all = Object.entries(caps).map(([key, cap]) => ({
    ...cap,
    id: cap.id ?? key,
  })) as CapNode[];
  const hasLevels = all.some((c) => typeof c.level === "number");

  if (hasLevels) {
    const l1s = all.filter((c) => c.level === 1);
    const l2s = all.filter((c) => c.level === 2);
    const l3s = all.filter((c) => c.level === 3);
    const l4s = all.filter((c) => c.level === 4);

    return l1s.map((l1) => ({
      id: l1.id,
      name: l1.name,
      gov: isGovCap(l1) || isGov(l1.name),
      l2s: l2s
        .filter((l2) => l2.parentId === l1.id)
        .map((l2) => {
          const l3Groups = l3s.filter((l3) => l3.parentId === l2.id);
          const directCaps = l4s.filter((l4) => l4.parentId === l2.id);

          if (l3Groups.length > 0) {
            return {
              id: l2.id,
              name: l2.name,
              l3s: l3Groups.map((l3) => ({
                id: l3.id,
                name: l3.name,
                caps: l4s.filter((l4) => l4.parentId === l3.id),
              })),
              caps: directCaps,
            };
          }
          return { id: l2.id, name: l2.name, l3s: [], caps: directCaps };
        }),
    }));
  }

  return [
    {
      id: "flat",
      name: "Capabilities",
      gov: false,
      l2s: [
        {
          id: "flat_l2",
          name: "All Capabilities",
          l3s: [],
          caps: all.map((c) => ({ ...c, level: 4, parentId: "flat_l2" })),
        },
      ],
    },
  ];
}

/* ── Layout toggle button ─────────────────────────────────── */
function LayoutToggle({
  mode,
  onToggle,
}: {
  mode: LayoutMode;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="inline-flex items-center justify-center rounded px-1 py-0.5 transition-colors"
      style={{
        background: tv.bgSurface,
        border: `1px solid ${tv.borderSubtle}`,
        color: tv.textDim,
        fontSize: 9,
        lineHeight: 1,
        cursor: "pointer",
        minWidth: 18,
      }}
      title={`Layout: ${LAYOUT_LABELS[mode]} — click to cycle`}
    >
      {LAYOUT_ICONS[mode]}
    </button>
  );
}

/* ── Container style for a given layout mode ──────────────── */
function layoutStyle(mode: LayoutMode, cols?: number): React.CSSProperties {
  switch (mode) {
    case "vertical":
      return { display: "flex", flexDirection: "column", gap: 4 };
    case "horizontal":
      return { display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 4, overflowX: "auto", minWidth: 0 };
    case "wrap":
    default:
      return cols
        ? { display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4 }
        : { display: "flex", flexWrap: "wrap", gap: 4 };
  }
}

/* ── Column count control ─────────────────────────────────── */
function ColControl({
  cols,
  onInc,
  onDec,
}: {
  cols: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      <button
        onClick={(e) => { e.stopPropagation(); onDec(); }}
        className="rounded px-0.5 transition-colors"
        style={{ color: tv.textDim, fontSize: 9, cursor: "pointer", background: tv.bgSurface, border: `1px solid ${tv.borderSubtle}` }}
        title="Fewer columns"
      >−</button>
      <span style={{ color: tv.textDim, fontSize: 8 }}>{cols}col</span>
      <button
        onClick={(e) => { e.stopPropagation(); onInc(); }}
        className="rounded px-0.5 transition-colors"
        style={{ color: tv.textDim, fontSize: 9, cursor: "pointer", background: tv.bgSurface, border: `1px solid ${tv.borderSubtle}` }}
        title="More columns"
      >+</button>
    </span>
  );
}

/* ── Component ────────────────────────────────────────────── */
export function CapabilityMapView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const [selectedL3, setSelectedL3] = useState<CapNode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [viewMode, setViewMode] = useState<"treemap" | "table">("treemap");

  // Layout state: per-container layout preferences
  const [layouts, setLayouts] = useState<LayoutMap>({});
  const [colCounts, setColCounts] = useState<Record<string, number>>({});

  const getLayout = useCallback((key: string): LayoutMode => layouts[key] ?? "wrap", [layouts]);
  const toggleLayout = useCallback((key: string) => {
    setLayouts((prev) => ({ ...prev, [key]: nextLayout(prev[key] ?? "wrap") }));
  }, []);
  const getCols = useCallback((key: string) => colCounts[key] ?? 0, [colCounts]); // 0 = auto
  const incCols = useCallback((key: string) => {
    setColCounts((prev) => ({ ...prev, [key]: Math.min((prev[key] ?? 2) + 1, 8) }));
  }, []);
  const decCols = useCallback((key: string) => {
    setColCounts((prev) => ({ ...prev, [key]: Math.max((prev[key] ?? 2) - 1, 1) }));
  }, []);

  const hierarchy = useMemo(() => {
    if (!scaffoldData?.elements?.capabilities) return [];
    return buildHierarchy(scaffoldData.elements.capabilities as Record<string, any>);
  }, [scaffoldData]);

  // Build enriched capability lookup — merges data from two sources:
  //   1. Activity→capability links (always present from Pass B): enabledByCapabilityIds,
  //      performedByRoleIds, subActivities, informationObjectIds, technologyAppIds
  //   2. capabilityPPIT (only present if Pass C ran): fine-grained per-capability decomposition
  interface PPITEntry {
    roles: string[];
    activityNames: string[];
    subActivities: string[];
    infoObjects: string[];
    techApps: string[];
    vsNames: string[];
    vsActivityPairs: { vs: string; activity: string }[];
  }
  const ppitByCapId = useMemo(() => {
    if (!scaffoldData?.elements?.activities) return new Map<string, PPITEntry>();
    const map = new Map<string, PPITEntry>();
    const rolesLookup = scaffoldData.elements.roles ?? {};
    const infoObjs = (scaffoldData.elements as any).informationObjects ?? {};
    const techAppsLookup = (scaffoldData.elements as any).technologyApplications ?? (scaffoldData.elements as any).technologyApps ?? {};
    const vsLookup = scaffoldData.elements.valueStreams ?? {};

    const ensure = (capId: string): PPITEntry => {
      if (!map.has(capId)) map.set(capId, {
        roles: [], activityNames: [], subActivities: [], infoObjects: [], techApps: [],
        vsNames: [], vsActivityPairs: [],
      });
      return map.get(capId)!;
    };
    const addUnique = (arr: string[], val: string) => { if (val && !arr.includes(val)) arr.push(val); };

    for (const [, act] of Object.entries(scaffoldData.elements.activities)) {
      const a = act as any;
      const vsId = a.valueStreamId ?? a.vsId;
      const vsName = vsId ? ((vsLookup as any)[vsId]?.name ?? "") : "";

      // Source 1: activity→capability links from Pass B (always present)
      const capIds: string[] = a.enabledByCapabilityIds ?? a.requiresCapabilityIds ?? [];
      for (const capId of capIds) {
        const entry = ensure(capId);
        // Roles from the activity
        for (const rId of (a.performedByRoleIds ?? [])) {
          addUnique(entry.roles, (rolesLookup as any)[rId]?.name ?? rId);
        }
        addUnique(entry.activityNames, a.name ?? "");
        // Sub-activities (string array on the activity)
        for (const sub of (a.subActivities ?? [])) {
          if (typeof sub === "string") addUnique(entry.subActivities, sub);
          else if (sub?.name) addUnique(entry.subActivities, sub.name);
        }
        // Info objects from the activity
        for (const iId of (a.informationObjectIds ?? [])) {
          addUnique(entry.infoObjects, (infoObjs as any)[iId]?.name ?? iId);
        }
        // Tech from the activity
        for (const tId of (a.technologyAppIds ?? [])) {
          addUnique(entry.techApps, (techAppsLookup as any)[tId]?.name ?? tId);
        }
        if (vsName) addUnique(entry.vsNames, vsName);
        if (vsName && a.name) {
          const pair = { vs: vsName, activity: a.name };
          if (!entry.vsActivityPairs.some((p: any) => p.vs === pair.vs && p.activity === pair.activity)) {
            entry.vsActivityPairs.push(pair);
          }
        }
      }

      // Source 2: capabilityPPIT from Pass C (fine-grained, may not exist)
      const ppit = a.capabilityPPIT;
      if (!ppit) continue;
      for (const [capId, decomp] of Object.entries(ppit)) {
        const d = decomp as any;
        const entry = ensure(capId);
        for (const rId of d.roleIds ?? []) {
          addUnique(entry.roles, (rolesLookup as any)[rId]?.name ?? rId);
        }
        addUnique(entry.activityNames, a.name ?? "");
        for (const sub of d.activities ?? []) {
          addUnique(entry.subActivities, sub);
        }
        for (const iId of d.informationObjectIds ?? []) {
          addUnique(entry.infoObjects, (infoObjs as any)[iId]?.name ?? iId);
        }
        for (const tId of d.technologyAppIds ?? []) {
          addUnique(entry.techApps, (techAppsLookup as any)[tId]?.name ?? tId);
        }
        if (vsName) addUnique(entry.vsNames, vsName);
        if (vsName && a.name) {
          const pair = { vs: vsName, activity: a.name };
          if (!entry.vsActivityPairs.some((p: any) => p.vs === pair.vs && p.activity === pair.activity)) {
            entry.vsActivityPairs.push(pair);
          }
        }
      }
    }
    return map;
  }, [scaffoldData]);

  const stats = useMemo(() => {
    const l2Count = hierarchy.reduce((a, b) => a + b.l2s.length, 0);
    const l3Count = hierarchy.reduce(
      (a, l1) => a + l1.l2s.reduce((b, l2) => b + l2.l3s.length, 0), 0,
    );
    const capCount = hierarchy.reduce(
      (a, l1) => a + l1.l2s.reduce((b, l2) =>
        b + l2.caps.length + l2.l3s.reduce((c, l3) => c + l3.caps.length, 0), 0), 0,
    );
    return { l1: hierarchy.length, l2: l2Count, l3: l3Count, caps: capCount };
  }, [hierarchy]);

  /* ── Inline rename ──────────────────────────────────────── */
  const startEdit = useCallback((cap: CapNode) => {
    setEditingId(cap.id);
    setEditText(cap.name);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId || !scaffoldData) return;
    const cap = (scaffoldData.elements.capabilities as Record<string, any>)[editingId];
    if (cap && editText.trim() && editText.trim() !== cap.name) {
      const updatedCaps = {
        ...scaffoldData.elements.capabilities,
        [editingId]: { ...cap, name: editText.trim() },
      };
      useCanvasStore.setState({
        scaffoldData: {
          ...scaffoldData,
          elements: { ...scaffoldData.elements, capabilities: updatedCaps },
        },
      });
    }
    setEditingId(null);
  }, [editingId, editText, scaffoldData]);

  if (!scaffoldData) return null;

  const topLayoutKey = "top";
  const topLayout = getLayout(topLayoutKey);
  const topCols = getCols(topLayoutKey);

  return (
    <div
      className="h-full overflow-auto"
      style={{
        background: tv.bgPrimary,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div className="mx-auto max-w-[1400px] p-5">
        {/* Header */}
        <div className="mb-4">
          <div
            className="mb-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: tv.textDim }}
          >
            Capability Map
          </div>
          <div
            className="mb-1 text-lg font-bold"
            style={{ color: tv.textPrimary }}
          >
            {scaffoldData.name} — Operating Capabilities
          </div>
          <div className="text-[11px]" style={{ color: tv.textSecondary }}>
            {stats.l1} business areas · {stats.l2} domains
            {stats.l3 > 0 && <> · {stats.l3} groups</>}
            {" "}· {stats.caps} capabilities
          </div>
        </div>

        {/* Legend + top layout toggle */}
        <div className="mb-4 flex flex-wrap items-center gap-5">
          <div
            className="flex items-center gap-1.5 text-[10px]"
            style={{ color: tv.textSecondary }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: tv.accent }}
            />
            Execution
          </div>
          <div
            className="flex items-center gap-1.5 text-[10px]"
            style={{ color: tv.textSecondary }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: tv.govColor }}
            />
            Governance
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-[9px]" style={{ color: tv.textDim }}>
              Layout:
            </div>
            <LayoutToggle mode={topLayout} onToggle={() => toggleLayout(topLayoutKey)} />
            {topLayout === "wrap" && topCols > 0 && (
              <ColControl cols={topCols} onInc={() => incCols(topLayoutKey)} onDec={() => decCols(topLayoutKey)} />
            )}
          </div>
          {/* View mode toggle */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setViewMode("treemap")}
              className="rounded px-1.5 py-0.5 text-[9px] transition-colors"
              style={{
                background: viewMode === "treemap" ? tv.accent : tv.bgSurface,
                color: viewMode === "treemap" ? "#fff" : tv.textDim,
                border: `1px solid ${viewMode === "treemap" ? tv.accent : tv.borderSubtle}`,
                cursor: "pointer",
              }}
              title="Treemap view"
            >
              ⊞ Map
            </button>
            <button
              onClick={() => setViewMode("table")}
              className="rounded px-1.5 py-0.5 text-[9px] transition-colors"
              style={{
                background: viewMode === "table" ? tv.accent : tv.bgSurface,
                color: viewMode === "table" ? "#fff" : tv.textDim,
                border: `1px solid ${viewMode === "table" ? tv.accent : tv.borderSubtle}`,
                cursor: "pointer",
              }}
              title="Table view"
            >
              ☰ Table
            </button>
          </div>
        </div>

        {viewMode === "treemap" ? (
          <>
            {/* Treemap grid — top level uses grid with configurable columns */}
            <div
              style={
                topLayout === "wrap" && topCols > 0
                  ? { display: "grid", gridTemplateColumns: `repeat(${topCols}, 1fr)`, gap: 6 }
                  : topLayout === "vertical"
                    ? { display: "flex", flexDirection: "column", gap: 6 }
                    : topLayout === "horizontal"
                      ? { display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 6, overflowX: "auto", paddingBottom: 6 }
                      : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 6 }
              }
            >
              {hierarchy.map((l1) => (
                <L1Card
                  key={l1.id}
                  block={l1}
                  selectedL3={selectedL3}
                  editingId={editingId}
                  editText={editText}
                  onSelectL3={setSelectedL3}
                  onStartEdit={startEdit}
                  onEditTextChange={setEditText}
                  onCommitEdit={commitEdit}
                  getLayout={getLayout}
                  toggleLayout={toggleLayout}
                  getCols={getCols}
                  incCols={incCols}
                  decCols={decCols}
                />
              ))}
            </div>

            {/* Enriched Inspector panel */}
            <CapabilityInspectorPanel cap={selectedL3} ppit={selectedL3 ? ppitByCapId.get(selectedL3.id) : undefined} />
          </>
        ) : (
          /* Table view */
          <CapabilityTable hierarchy={hierarchy} ppitByCapId={ppitByCapId} onSelect={setSelectedL3} selectedId={selectedL3?.id ?? null} />
        )}
      </div>
    </div>
  );
}

/* ── L1 Card ──────────────────────────────────────────────── */
function L1Card({
  block,
  selectedL3,
  editingId,
  editText,
  onSelectL3,
  onStartEdit,
  onEditTextChange,
  onCommitEdit,
  getLayout,
  toggleLayout,
  getCols,
  incCols,
  decCols,
}: {
  block: L1Block;
  selectedL3: CapNode | null;
  editingId: string | null;
  editText: string;
  onSelectL3: (c: CapNode) => void;
  onStartEdit: (c: CapNode) => void;
  onEditTextChange: (t: string) => void;
  onCommitEdit: () => void;
  getLayout: (key: string) => LayoutMode;
  toggleLayout: (key: string) => void;
  getCols: (key: string) => number;
  incCols: (key: string) => void;
  decCols: (key: string) => void;
}) {
  const borderColor = block.gov ? tv.govColor : tv.accentBorder;
  const headerBg = block.gov ? tv.govMuted : tv.accentMuted;
  const capCount = block.l2s.reduce((a, l2) =>
    a + l2.caps.length + l2.l3s.reduce((b, l3) => b + l3.caps.length, 0), 0);

  const l1Key = `l1_${block.id}`;
  const l1Layout = getLayout(l1Key);
  const l1Cols = getCols(l1Key);

  return (
    <div
      className="rounded-lg"
      style={{
        border: `1.5px solid ${borderColor}`,
        background: tv.bgCard,
        overflow: "visible",
      }}
    >
      {/* L1 header */}
      <div
        className="flex items-center justify-between border-b px-2.5 py-2"
        style={{ background: headerBg, borderColor: tv.borderSubtle }}
      >
        <div>
          <div
            className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold uppercase tracking-wider"
            style={{ color: tv.textPrimary }}
            title={block.name}
          >
            {block.name}
          </div>
          <div className="mt-0.5 text-[9px]" style={{ color: tv.textSecondary }}>
            {block.l2s.length} domains · {capCount} capabilities
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LayoutToggle mode={l1Layout} onToggle={() => toggleLayout(l1Key)} />
          {l1Layout === "wrap" && l1Cols > 0 && (
            <ColControl cols={l1Cols} onInc={() => incCols(l1Key)} onDec={() => decCols(l1Key)} />
          )}
        </div>
      </div>

      {/* L2 groups */}
      <div
        className="p-1.5"
        style={
          l1Layout === "wrap" && l1Cols > 0
            ? { display: "grid", gridTemplateColumns: `repeat(${l1Cols}, 1fr)`, gap: 4 }
            : l1Layout === "horizontal"
              ? { display: "flex", flexDirection: "row", gap: 4, overflowX: "auto", paddingBottom: 4, minWidth: 0 }
              : { display: "flex", flexDirection: "column", gap: 4 }
        }
      >
        {block.l2s.map((l2) => {
          const l2Key = `l2_${l2.id}`;
          const l2Layout = getLayout(l2Key);
          const l2Cols = getCols(l2Key);

          return (
            <div
              key={l2.id}
              className="rounded"
              style={{
                border: `1px solid ${tv.borderSubtle}`,
                minWidth: l1Layout === "horizontal" ? 200 : undefined,
                flex: l1Layout === "horizontal" ? "0 0 auto" : undefined,
                overflow: "visible",
              }}
            >
              <div
                className="flex items-center justify-between px-2 py-1"
                style={{
                  background: tv.bgSurface,
                  borderBottom: `1px solid ${tv.borderSubtle}`,
                }}
              >
                <div
                  className="text-[9px] font-semibold"
                  style={{ color: tv.textSecondary }}
                >
                  {l2.name}
                </div>
                <LayoutToggle mode={l2Layout} onToggle={() => toggleLayout(l2Key)} />
              </div>
              <div
                className="px-1.5 py-1.5"
                style={
                  l2Layout === "wrap" && l2Cols > 0
                    ? { display: "grid", gridTemplateColumns: `repeat(${l2Cols}, 1fr)`, gap: 4 }
                    : l2Layout === "horizontal"
                      ? { display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 4, overflowX: "auto", paddingBottom: 4, minWidth: 0 }
                      : { display: "flex", flexDirection: "column", gap: 4 }
                }
              >
                {/* L3 capability groups */}
                {l2.l3s.map((l3) => {
                  const l3Key = `l3_${l3.id}`;
                  const l3Layout = getLayout(l3Key);

                  return (
                    <div key={l3.id} className="rounded" style={{
                      border: `1px dashed ${tv.borderSubtle}`,
                      padding: 4,
                      flex: l2Layout === "horizontal" ? "0 0 auto" : undefined,
                      minWidth: l2Layout === "horizontal" ? 160 : undefined,
                    }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>
                          {l3.name}
                        </div>
                        <LayoutToggle mode={l3Layout} onToggle={() => toggleLayout(l3Key)} />
                      </div>
                      <div style={layoutStyle(l3Layout)}>
                        {l3.caps.map((cap) => (
                          <CapTile
                            key={cap.id}
                            cap={cap}
                            gov={block.gov}
                            isSelected={selectedL3?.id === cap.id}
                            isEditing={editingId === cap.id}
                            editText={editText}
                            onSelect={() => onSelectL3(cap)}
                            onStartEdit={() => onStartEdit(cap)}
                            onEditTextChange={onEditTextChange}
                            onCommitEdit={onCommitEdit}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Direct L4 caps under L2 (no L3 groups) */}
                {l2.caps.map((cap) => (
                  <CapTile
                    key={cap.id}
                    cap={cap}
                    gov={block.gov}
                    isSelected={selectedL3?.id === cap.id}
                    isEditing={editingId === cap.id}
                    editText={editText}
                    onSelect={() => onSelectL3(cap)}
                    onStartEdit={() => onStartEdit(cap)}
                    onEditTextChange={onEditTextChange}
                    onCommitEdit={onCommitEdit}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Capability Tile (L4 or L3 leaf) ─────────────────────── */
function CapTile({
  cap,
  gov,
  isSelected,
  isEditing,
  editText,
  onSelect,
  onStartEdit,
  onEditTextChange,
  onCommitEdit,
}: {
  cap: CapNode;
  gov: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editText: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditTextChange: (t: string) => void;
  onCommitEdit: () => void;
}) {
  const selectedBg = gov ? tv.govMuted : tv.tileSelectedBg;
  const selectedBorder = gov ? tv.govColor : tv.tileSelectedBorder;
  const selectedColor = gov ? tv.govColor : tv.accent;

  if (isEditing) {
    return (
      <input
        autoFocus
        value={editText}
        onChange={(e) => onEditTextChange(e.target.value)}
        onBlur={onCommitEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommitEdit();
          if (e.key === "Escape") onCommitEdit();
        }}
        className="rounded px-1.5 py-0.5 text-[8px] leading-snug outline-none"
        style={{
          background: tv.bgInput,
          border: `1px solid ${tv.accentBorder}`,
          color: tv.textPrimary,
          minWidth: 60,
        }}
      />
    );
  }

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onStartEdit}
      className="cursor-pointer rounded px-1.5 py-0.5 text-[8px] leading-snug transition-colors"
      style={{
        background: isSelected ? selectedBg : tv.tileBg,
        border: `0.5px solid ${isSelected ? selectedBorder : tv.borderSubtle}`,
        color: isSelected ? selectedColor : tv.textSecondary,
        whiteSpace: "normal",
        minWidth: 60,
        flexShrink: 0,
      }}
      title={cap.description || cap.name}
    >
      {cap.name}
    </div>
  );
}

/* ── Enriched Inspector Panel ──────────────────────────────── */
interface PPITData {
  roles: string[];
  activityNames: string[];
  subActivities: string[];
  infoObjects: string[];
  techApps: string[];
  vsNames: string[];
  vsActivityPairs: { vs: string; activity: string }[];
}

function CapabilityInspectorPanel({ cap, ppit }: { cap: CapNode | null; ppit?: PPITData }) {
  if (!cap) {
    return (
      <div
        className="mt-3 rounded-lg p-4"
        style={{ background: tv.bgCard, border: `1.5px solid ${tv.borderAccent}`, minHeight: 72 }}
      >
        <p className="text-[12px]" style={{ color: tv.textDim }}>
          Select a capability tile to see its definition, business object, and relationships.
        </p>
      </div>
    );
  }

  const SECTIONS: { label: string; items: string[]; color: string }[] = [
    { label: "People (Roles)", items: ppit?.roles ?? [], color: "#f59e0b" },
    { label: "Process (Activities)", items: ppit?.activityNames ?? [], color: "#10b981" },
    { label: "Sub-Activities", items: ppit?.subActivities ?? [], color: "#6366f1" },
    { label: "Information Objects", items: ppit?.infoObjects ?? [], color: "#3b82f6" },
    { label: "Technology", items: ppit?.techApps ?? [], color: "#8b5cf6" },
  ].filter(s => s.items.length > 0);

  return (
    <div
      className="mt-3 rounded-lg p-4"
      style={{ background: tv.bgCard, border: `1.5px solid ${tv.borderAccent}`, minHeight: 72 }}
    >
      {/* Header */}
      <div className="mb-1 text-[15px] font-bold" style={{ color: tv.textPrimary }}>
        {cap.name}
      </div>
      {cap.businessObject && (
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: tv.accent }}>
          Business Object: {cap.businessObject}
        </div>
      )}
      {cap.description ? (
        <div className="text-[12px] leading-relaxed mb-2" style={{ color: tv.textSecondary }}>
          {cap.description}
        </div>
      ) : (
        <div className="text-[12px] mb-2" style={{ color: tv.textDim }}>
          No description. Double-click the tile to edit.
        </div>
      )}

      {/* PPIT Sections */}
      {SECTIONS.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: SECTIONS.length >= 4 ? "1fr 1fr" : "1fr" }}>
          {SECTIONS.map(s => (
            <div key={s.label}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: s.color }}>
                {s.label} ({s.items.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {s.items.map(item => (
                  <span key={item} className="inline-block rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: `${s.color}18`, color: s.color }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cross-VS Usage */}
      {ppit && ppit.vsActivityPairs.length > 1 && (
        <div className="mt-3">
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "#ec4899" }}>
            Shared Across {ppit.vsNames.length} Value Streams
          </div>
          <div className="space-y-0.5">
            {ppit.vsActivityPairs.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: "rgba(236,72,153,0.1)", color: "#ec4899" }}>
                  {p.vs}
                </span>
                <span style={{ color: tv.textDim }}>→</span>
                <span style={{ color: tv.textSecondary }}>{p.activity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Capability Table View ─────────────────────────────────── */
function CapabilityTable({
  hierarchy,
  ppitByCapId,
  onSelect,
  selectedId,
}: {
  hierarchy: L1Block[];
  ppitByCapId: Map<string, PPITData>;
  onSelect: (c: CapNode) => void;
  selectedId: string | null;
}) {
  // Flatten all caps with their L1/L2/L3 ancestry
  const rows = useMemo(() => {
    const result: {
      cap: CapNode;
      l1Name: string;
      l2Name: string;
      l3Name: string;
      ppit: PPITData | undefined;
    }[] = [];
    for (const l1 of hierarchy) {
      for (const l2 of l1.l2s) {
        // Caps under L3 groups
        for (const l3 of l2.l3s) {
          for (const cap of l3.caps) {
            result.push({ cap, l1Name: l1.name, l2Name: l2.name, l3Name: l3.name, ppit: ppitByCapId.get(cap.id) });
          }
        }
        // Direct caps under L2
        for (const cap of l2.caps) {
          result.push({ cap, l1Name: l1.name, l2Name: l2.name, l3Name: "—", ppit: ppitByCapId.get(cap.id) });
        }
      }
    }
    return result;
  }, [hierarchy, ppitByCapId]);

  const thStyle: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: tv.textDim,
    borderBottom: `1px solid ${tv.borderSubtle}`,
    textAlign: "left" as const,
    position: "sticky" as const,
    top: 0,
    background: tv.bgSurface,
    zIndex: 1,
  };
  const tdStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: 10,
    color: tv.textSecondary,
    borderBottom: `1px solid ${tv.borderSubtle}`,
    verticalAlign: "top" as const,
  };

  const chipList = (items: string[], color: string) => {
    if (!items || items.length === 0) return <span style={{ color: tv.textDim, fontSize: 9 }}>—</span>;
    return (
      <div className="flex flex-wrap gap-0.5">
        {items.slice(0, 4).map(item => (
          <span key={item} className="inline-block rounded px-1 py-0 text-[8px]" style={{ backgroundColor: `${color}18`, color }}>
            {item}
          </span>
        ))}
        {items.length > 4 && <span className="text-[8px]" style={{ color: tv.textDim }}>+{items.length - 4}</span>}
      </div>
    );
  };

  return (
    <div className="rounded-lg" style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.bgCard, maxHeight: 600, overflow: "auto" }}>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Business Area</th>
            <th style={thStyle}>Domain</th>
            <th style={thStyle}>Group</th>
            <th style={thStyle}>Capability</th>
            <th style={thStyle}>People</th>
            <th style={thStyle}>Process</th>
            <th style={thStyle}>Information</th>
            <th style={thStyle}>Technology</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.cap.id}
              onClick={() => onSelect(row.cap)}
              className="cursor-pointer transition-colors"
              style={{
                background: selectedId === row.cap.id ? tv.accentMuted : undefined,
              }}
              onMouseOver={(e) => { if (selectedId !== row.cap.id) (e.currentTarget.style.background = tv.bgSurface); }}
              onMouseOut={(e) => { if (selectedId !== row.cap.id) (e.currentTarget.style.background = ""); }}
            >
              <td style={tdStyle}>{row.l1Name}</td>
              <td style={tdStyle}>{row.l2Name}</td>
              <td style={tdStyle}>{row.l3Name}</td>
              <td style={{ ...tdStyle, color: tv.textPrimary, fontWeight: 500 }}>{row.cap.name}</td>
              <td style={tdStyle}>{chipList(row.ppit?.roles ?? [], "#f59e0b")}</td>
              <td style={tdStyle}>{chipList(row.ppit?.activityNames ?? [], "#10b981")}</td>
              <td style={tdStyle}>{chipList(row.ppit?.infoObjects ?? [], "#3b82f6")}</td>
              <td style={tdStyle}>{chipList(row.ppit?.techApps ?? [], "#8b5cf6")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
