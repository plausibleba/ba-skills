import { useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useThemeStore } from "../store/theme-store.ts";
import { getTheme } from "../theme.ts";

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

interface L2Group {
  id: string;
  name: string;
  l3s: CapNode[];
}

interface L1Block {
  id: string;
  name: string;
  gov: boolean;
  l2s: L2Group[];
}

function buildHierarchy(caps: Record<string, any>): L1Block[] {
  const all = Object.values(caps) as CapNode[];

  // If capabilities have level/parentId (PlausibleBA bundle), use them
  const hasLevels = all.some((c) => typeof c.level === "number");

  if (hasLevels) {
    const l1s = all.filter((c) => c.level === 1);
    const l2s = all.filter((c) => c.level === 2);
    const l3s = all.filter((c) => c.level === 3);

    return l1s.map((l1) => ({
      id: l1.id,
      name: l1.name,
      gov: isGovCap(l1) || isGov(l1.name),
      l2s: l2s
        .filter((l2) => l2.parentId === l1.id)
        .map((l2) => ({
          id: l2.id,
          name: l2.name,
          l3s: l3s.filter((l3) => l3.parentId === l2.id),
        })),
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
          l3s: all.map((c) => ({ ...c, level: 3, parentId: "flat_l2" })),
        },
      ],
    },
  ];
}

/* ── Component ────────────────────────────────────────────── */
export function CapabilityMapView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const mode = useThemeStore((s) => s.mode);
  const t = getTheme(mode);
  const [selectedL3, setSelectedL3] = useState<CapNode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const hierarchy = useMemo(() => {
    if (!scaffoldData?.elements?.capabilities) return [];
    return buildHierarchy(scaffoldData.elements.capabilities as Record<string, any>);
  }, [scaffoldData]);

  const stats = useMemo(() => {
    const l2Count = hierarchy.reduce((a, b) => a + b.l2s.length, 0);
    const l3Count = hierarchy.reduce(
      (a, b) => a + b.l2s.reduce((c, d) => c + d.l3s.length, 0),
      0,
    );
    return { l1: hierarchy.length, l2: l2Count, l3: l3Count };
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
        background: t.bgPrimary,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div className="mx-auto max-w-[1400px] p-5">
        {/* Header */}
        <div className="mb-4">
          <div
            className="mb-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: t.textDim }}
          >
            Capability Map
          </div>
          <div
            className="mb-1 text-lg font-bold"
            style={{ color: t.textPrimary }}
          >
            {scaffoldData.name} — Operating Capabilities
          </div>
          <div className="text-[11px]" style={{ color: t.textSecondary }}>
            {stats.l1} business areas · {stats.l2} domains · {stats.l3}{" "}
            capabilities
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-5">
          <div
            className="flex items-center gap-1.5 text-[10px]"
            style={{ color: t.textSecondary }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: t.accent }}
            />
            Execution
          </div>
          <div
            className="flex items-center gap-1.5 text-[10px]"
            style={{ color: t.textSecondary }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: t.govColor }}
            />
            Governance
          </div>
          <div
            className="ml-1 text-[9px]"
            style={{ color: t.textDim }}
          >
            Click any L3 tile to inspect · Double-click to rename
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
              t={t}
            />
          ))}
        </div>

        {/* Inspector panel */}
        <div
          className="mt-3 rounded-lg p-4"
          style={{
            background: t.bgCard,
            border: `1.5px solid ${t.borderAccent}`,
            minHeight: 72,
          }}
        >
          {selectedL3 ? (
            <>
              <div
                className="mb-1 text-[15px] font-bold"
                style={{ color: t.textPrimary }}
              >
                {selectedL3.name}
              </div>
              {selectedL3.businessObject && (
                <div
                  className="mb-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: t.accent }}
                >
                  Business Object: {selectedL3.businessObject}
                </div>
              )}
              {selectedL3.description && (
                <div
                  className="text-[12px] leading-relaxed"
                  style={{ color: t.textSecondary }}
                >
                  {selectedL3.description}
                </div>
              )}
              {!selectedL3.description && (
                <div className="text-[12px]" style={{ color: t.textDim }}>
                  No description available. Double-click the tile to edit.
                </div>
              )}
            </>
          ) : (
            <p className="text-[12px]" style={{ color: t.textDim }}>
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
  t,
}: {
  block: L1Block;
  selectedL3: CapNode | null;
  editingId: string | null;
  editText: string;
  onSelectL3: (c: CapNode) => void;
  onStartEdit: (c: CapNode) => void;
  onEditTextChange: (t: string) => void;
  onCommitEdit: () => void;
  t: import("../theme.ts").ThemeTokens;
}) {
  const borderColor = block.gov ? t.govColor : t.accentBorder;
  const headerBg = block.gov ? t.govMuted : t.accentMuted;
  const l3Count = block.l2s.reduce((a, l2) => a + l2.l3s.length, 0);

  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{
        border: `1.5px solid ${borderColor}`,
        background: t.bgCard,
      }}
    >
      {/* L1 header */}
      <div
        className="border-b px-2.5 py-2"
        style={{ background: headerBg, borderColor: t.borderSubtle }}
      >
        <div
          className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-bold uppercase tracking-wider"
          style={{ color: t.textPrimary }}
          title={block.name}
        >
          {block.name}
        </div>
        <div className="mt-0.5 text-[9px]" style={{ color: t.textSecondary }}>
          {block.l2s.length} domains · {l3Count} capabilities
        </div>
      </div>

      {/* L2 groups */}
      <div className="p-1.5">
        {block.l2s.map((l2) => (
          <div
            key={l2.id}
            className="mb-1 overflow-hidden rounded last:mb-0"
            style={{ border: `1px solid ${t.borderSubtle}` }}
          >
            <div
              className="px-2 py-1"
              style={{
                background: t.bgSurface,
                borderBottom: `1px solid ${t.borderSubtle}`,
              }}
            >
              <div
                className="text-[9px] font-semibold"
                style={{ color: t.textSecondary }}
              >
                {l2.name}
              </div>
            </div>
            <div className="flex flex-wrap gap-0.5 px-1.5 py-1.5">
              {l2.l3s.map((l3) => (
                <L3Tile
                  key={l3.id}
                  cap={l3}
                  gov={block.gov}
                  isSelected={selectedL3?.id === l3.id}
                  isEditing={editingId === l3.id}
                  editText={editText}
                  onSelect={() => onSelectL3(l3)}
                  onStartEdit={() => onStartEdit(l3)}
                  onEditTextChange={onEditTextChange}
                  onCommitEdit={onCommitEdit}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── L3 Tile ──────────────────────────────────────────────── */
function L3Tile({
  cap,
  gov,
  isSelected,
  isEditing,
  editText,
  onSelect,
  onStartEdit,
  onEditTextChange,
  onCommitEdit,
  t,
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
  t: import("../theme.ts").ThemeTokens;
}) {
  const selectedBg = gov ? t.govMuted : t.tileSelectedBg;
  const selectedBorder = gov ? t.govColor : t.tileSelectedBorder;
  const selectedColor = gov ? t.govColor : t.accent;

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
          background: t.bgInput,
          border: `1px solid ${t.accentBorder}`,
          color: t.textPrimary,
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
        background: isSelected ? selectedBg : t.tileBg,
        border: `0.5px solid ${isSelected ? selectedBorder : t.borderSubtle}`,
        color: isSelected ? selectedColor : t.textSecondary,
      }}
      title={cap.description || cap.name}
    >
      {cap.name}
    </div>
  );
}
