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

/** Also check the capability's own `type` field from PlausibleBA */
function isGovCap(cap: CapNode): boolean {
  if ((cap as any).type === "Governance") return true;
  return false;
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
  l3s: L3Group[];       // L3 capability groups (when 4-level) or synthetic wrapper
  caps: CapNode[];       // leaf capabilities directly under L2 (when 3-level fallback)
}

interface L1Block {
  id: string;
  name: string;
  gov: boolean;
  l2s: L2Group[];
}

function buildHierarchy(caps: Record<string, any>): L1Block[] {
  const all = Object.values(caps) as CapNode[];

  // If capabilities have level/parentId, use them
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
          // L3 capability groups under this L2
          const l3Groups = l3s.filter((l3) => l3.parentId === l2.id);
          // L4 capabilities parented directly to L2 (3-level fallback)
          const directCaps = l4s.filter((l4) => l4.parentId === l2.id);

          if (l3Groups.length > 0) {
            // 4-level: L2 → L3 groups → L4 caps
            return {
              id: l2.id,
              name: l2.name,
              l3s: l3Groups.map((l3) => ({
                id: l3.id,
                name: l3.name,
                caps: l4s.filter((l4) => l4.parentId === l3.id),
              })),
              caps: directCaps, // any orphaned L4s under L2
            };
          }
          // 3-level fallback: L2 → L4 caps directly (no L3 groups)
          return {
            id: l2.id,
            name: l2.name,
            l3s: [],
            caps: directCaps,
          };
        }),
    }));
  }

  // Fallback: flat capabilities → single L1 with one L2
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

/* ── Component ────────────────────────────────────────────── */
export function CapabilityMapView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const [selectedL3, setSelectedL3] = useState<CapNode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const hierarchy = useMemo(() => {
    if (!scaffoldData?.elements?.capabilities) return [];
    return buildHierarchy(scaffoldData.elements.capabilities as Record<string, any>);
  }, [scaffoldData]);

  // Build PPIT lookup: capId → { roles, activities, infoObjects, techApps }
  const ppitByCapId = useMemo(() => {
    if (!scaffoldData?.elements?.activities) return new Map<string, { roles: string[]; activityNames: string[]; infoObjects: string[]; techApps: string[] }>();
    const map = new Map<string, { roles: string[]; activityNames: string[]; infoObjects: string[]; techApps: string[] }>();
    const roles = scaffoldData.elements.roles ?? {};
    const infoObjs = scaffoldData.elements.informationObjects ?? {};
    const techApps = scaffoldData.elements.technologyApplications ?? {};
    for (const [, act] of Object.entries(scaffoldData.elements.activities)) {
      const a = act as any;
      const ppit = a.capabilityPPIT;
      if (!ppit) continue;
      for (const [capId, decomp] of Object.entries(ppit)) {
        const d = decomp as any;
        if (!map.has(capId)) map.set(capId, { roles: [], activityNames: [], infoObjects: [], techApps: [] });
        const entry = map.get(capId)!;
        for (const rId of d.roleIds ?? []) {
          const rName = (roles as any)[rId]?.name ?? rId;
          if (!entry.roles.includes(rName)) entry.roles.push(rName);
        }
        if (a.name && !entry.activityNames.includes(a.name)) entry.activityNames.push(a.name);
        for (const iId of d.informationObjectIds ?? []) {
          const iName = (infoObjs as any)[iId]?.name ?? iId;
          if (!entry.infoObjects.includes(iName)) entry.infoObjects.push(iName);
        }
        for (const tId of d.technologyAppIds ?? []) {
          const tName = (techApps as any)[tId]?.name ?? tId;
          if (!entry.techApps.includes(tName)) entry.techApps.push(tName);
        }
      }
    }
    return map;
  }, [scaffoldData]);

  const stats = useMemo(() => {
    const l2Count = hierarchy.reduce((a, b) => a + b.l2s.length, 0);
    const capCount = hierarchy.reduce(
      (a, l1) => a + l1.l2s.reduce((b, l2) =>
        b + l2.caps.length + l2.l3s.reduce((c, l3) => c + l3.caps.length, 0), 0), 0,
    );
    return { l1: hierarchy.length, l2: l2Count, caps: capCount };
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
            {stats.l1} business areas · {stats.l2} domains · {stats.caps}{" "}
            capabilities
          </div>
        </div>

        {/* Legend */}
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
          <div
            className="ml-1 text-[9px]"
            style={{ color: tv.textDim }}
          >
            Click any capability tile to inspect · Double-click to rename
          </div>
        </div>

        {/* Treemap grid */}
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
          }}
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
            />
          ))}
        </div>

        {/* Inspector panel */}
        <div
          className="mt-3 rounded-lg p-4"
          style={{
            background: tv.bgCard,
            border: `1.5px solid ${tv.borderAccent}`,
            minHeight: 72,
          }}
        >
          {selectedL3 ? (
            <>
              <div
                className="mb-1 text-[15px] font-bold"
                style={{ color: tv.textPrimary }}
              >
                {selectedL3.name}
              </div>
              {selectedL3.businessObject && (
                <div
                  className="mb-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: tv.accent }}
                >
                  Business Object: {selectedL3.businessObject}
                </div>
              )}
              {selectedL3.description && (
                <div
                  className="text-[12px] leading-relaxed"
                  style={{ color: tv.textSecondary }}
                >
                  {selectedL3.description}
                </div>
              )}
              {!selectedL3.description && (
                <div className="text-[12px]" style={{ color: tv.textDim }}>
                  No description available. Double-click the tile to edit.
                </div>
              )}
              {/* PPIT Mappings */}
              {(() => {
                const ppit = ppitByCapId.get(selectedL3.id);
                if (!ppit) return null;
                const sections = [
                  { label: "People", items: ppit.roles, color: "#f59e0b" },
                  { label: "Process", items: ppit.activityNames, color: "#10b981" },
                  { label: "Information", items: ppit.infoObjects, color: "#3b82f6" },
                  { label: "Technology", items: ppit.techApps, color: "#8b5cf6" },
                ].filter(s => s.items.length > 0);
                if (sections.length === 0) return null;
                return (
                  <div className="mt-3 space-y-2">
                    {sections.map(s => (
                      <div key={s.label}>
                        <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: s.color }}>{s.label}</div>
                        <div className="flex flex-wrap gap-1">
                          {s.items.map(item => (
                            <span key={item} className="inline-block rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: `${s.color}22`, color: s.color }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            <p className="text-[12px]" style={{ color: tv.textDim }}>
              Select a capability tile to see its definition, business object,
              and relationships.
            </p>
          )}
        </div>
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
}: {
  block: L1Block;
  selectedL3: CapNode | null;
  editingId: string | null;
  editText: string;
  onSelectL3: (c: CapNode) => void;
  onStartEdit: (c: CapNode) => void;
  onEditTextChange: (t: string) => void;
  onCommitEdit: () => void;
}) {
  const borderColor = block.gov ? tv.govColor : tv.accentBorder;
  const headerBg = block.gov ? tv.govMuted : tv.accentMuted;
  const capCount = block.l2s.reduce((a, l2) =>
    a + l2.caps.length + l2.l3s.reduce((b, l3) => b + l3.caps.length, 0), 0);

  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{
        border: `1.5px solid ${borderColor}`,
        background: tv.bgCard,
      }}
    >
      {/* L1 header */}
      <div
        className="border-b px-2.5 py-2"
        style={{ background: headerBg, borderColor: tv.borderSubtle }}
      >
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

      {/* L2 groups */}
      <div className="p-1.5">
        {block.l2s.map((l2) => (
          <div
            key={l2.id}
            className="mb-1 overflow-hidden rounded last:mb-0"
            style={{ border: `1px solid ${tv.borderSubtle}` }}
          >
            <div
              className="px-2 py-1"
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
            </div>
            <div className="px-1.5 py-1.5">
              {/* L3 capability groups (when 4-level hierarchy) */}
              {l2.l3s.map((l3) => (
                <div key={l3.id} className="mb-1 last:mb-0">
                  <div className="mb-0.5 text-[8px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>
                    {l3.name}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
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
              ))}
              {/* Direct L4 caps under L2 (3-level fallback) */}
              {l2.caps.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
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
              )}
            </div>
          </div>
        ))}
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
      }}
      title={cap.description || cap.name}
    >
      {cap.name}
    </div>
  );
}
