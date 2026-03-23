// Op Model Workbench — Phase 1+2: Catalog grids + Refinement Agent
// Session 26

import { useState, useMemo, useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { useCanvasStore } from "../store/canvas-store";
import { useWorkbenchStore, type CatalogType, type DiffOperation, type ChatMessage } from "../store/workbench-store";
import {
  CATALOG_CONFIGS,
  resolveAccessor,
  type CatalogConfig,
} from "../lib/catalog-configs";
import { callLLM } from "../domain/pipeline/llm-client";
import { buildRefinementAgentPrompt, parseAgentResponse } from "../domain/pipeline/prompts/refinement-agent";
import { StructuredGraphExplorer } from "./StructuredGraphExplorer";

// ── Engine Room Theme Styles ──

const theme = {
  bg: "#0f172a",
  bgSurface: "rgba(15, 23, 42, 0.95)",
  bgHover: "rgba(212, 160, 83, 0.03)",
  accent: "#d4a053",
  accentMuted: "rgba(212, 160, 83, 0.12)",
  accentBorder: "rgba(212, 160, 83, 0.18)",
  accentBorderSubtle: "rgba(212, 160, 83, 0.06)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  border: "#334155",
  borderSubtle: "rgba(51, 65, 85, 0.4)",
  green: "#22c55e",
  greenMuted: "rgba(34, 197, 94, 0.2)",
  red: "#ef4444",
};

// ── Tree Sort ──
// Builds a depth-first sorted list from parent-child hierarchy.
// Works for capabilities (level + parentId) and any future hierarchical catalog.


function buildTreeSorted(elements: Record<string, any>): { sorted: any[]; depthMap: Map<string, number>; sortKeyMap: Map<string, string> } {
  const entries = Object.values(elements || {});
  const byId = new Map(entries.map((e: any) => [e.id, e]));
  const childrenOf = new Map<string | null, any[]>();
  const depthMap = new Map<string, number>();
  const sortKeyMap = new Map<string, string>();

  // Group by parent
  for (const el of entries) {
    const pid = (el as any).parentId || null;
    if (!childrenOf.has(pid)) childrenOf.set(pid, []);
    childrenOf.get(pid)!.push(el);
  }

  // Sort children within each parent by name
  for (const [, children] of childrenOf) {
    children.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  }

  // DFS walk
  const sorted: any[] = [];
  function walk(parentId: string | null, depth: number, prefix: string) {
    const children = childrenOf.get(parentId) || [];
    children.forEach((child: any, idx: number) => {
      const key = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      depthMap.set(child.id, depth);
      sortKeyMap.set(child.id, key);
      sorted.push(child);
      walk(child.id, depth + 1, key);
    });
  }

  // Check if this catalog actually has hierarchy
  const hasHierarchy = entries.some((e: any) => e.parentId);
  if (hasHierarchy) {
    // Start from roots (no parent or parent not in set)
    walk(null, 0, "");
    // Also collect orphans whose parent isn't in the set
    for (const el of entries) {
      if (!sorted.includes(el)) {
        const pid = (el as any).parentId;
        if (pid && !byId.has(pid)) {
          depthMap.set(el.id, 0);
          sortKeyMap.set(el.id, `?.${sorted.length + 1}`);
          sorted.push(el);
        }
      }
    }
  } else {
    // Flat catalog — sort by name
    entries.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    entries.forEach((el: any, i: number) => {
      depthMap.set(el.id, 0);
      sortKeyMap.set(el.id, `${i + 1}`);
      sorted.push(el);
    });
  }

  return { sorted, depthMap, sortKeyMap };
}

// ── Catalog Grid ──

function CatalogGrid({
  config,
  elements,
  scaffoldData,
}: {
  config: CatalogConfig;
  elements: Record<string, any>;
  scaffoldData: any;
}) {
  const { updateElement, deleteElement, addElement, undo, redo, undoStack, redoStack } = useWorkbenchStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    colId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Convert Record to array with tree sort for hierarchical catalogs
  const { data, depthMap, sortKeyMap } = useMemo(() => {
    const isHierarchical = config.id === "capabilities" || config.id === "concepts";
    if (isHierarchical) {
      const tree = buildTreeSorted(elements);
      return { data: tree.sorted, depthMap: tree.depthMap, sortKeyMap: tree.sortKeyMap };
    }
    const entries = Object.values(elements || {});
    entries.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    const dm = new Map<string, number>();
    const sm = new Map<string, string>();
    entries.forEach((e: any, i) => { dm.set(e.id, 0); sm.set(e.id, `${i + 1}`); });
    return { data: entries, depthMap: dm, sortKeyMap: sm };
  }, [elements, config.id]);

  // Level badge colours
  const levelColors: Record<number, string> = {
    1: "rgba(245, 158, 11, 0.15)",
    2: "rgba(168, 85, 247, 0.15)",
    3: "rgba(59, 130, 246, 0.15)",
    4: "rgba(34, 197, 94, 0.15)",
  };
  const levelTextColors: Record<number, string> = {
    1: "#f59e0b",
    2: "#a855f7",
    3: "#3b82f6",
    4: "#22c55e",
  };

  // Build TanStack columns from catalog config, prepending an ID column
  const columns = useMemo(() => {
    const isHierarchical = config.id === "capabilities" || config.id === "concepts";

    // ID column — always first
    const idCol = {
      id: "_sortKey",
      header: "ID",
      accessorFn: (row: any) => sortKeyMap.get(row.id) || row.id || "—",
      size: 70,
      enableSorting: false, // tree order is the default
      meta: { editable: false, pinned: false, monospace: true },
      cell: ({ getValue, row }: any) => {
        const key = getValue();
        const depth = depthMap.get(row.original.id) || 0;
        const level = row.original.level;
        return (
          <span style={{
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: 11,
            color: level ? (levelTextColors[level] || theme.textDim) : theme.textDim,
            paddingLeft: isHierarchical ? depth * 8 : 0,
          }}>
            {key}
          </span>
        );
      },
    };

    const dataCols = config.columns.map((col) => ({
      id: col.id,
      header: col.header,
      accessorFn: (row: any) => {
        if (col.accessorKey) return row[col.accessorKey];
        if (col.accessorFn) return resolveAccessor(col.accessorFn, row, scaffoldData);
        return "";
      },
      size: parseInt(col.width || "100"),
      enableSorting: !isHierarchical, // disable column sorting on tree-sorted catalogs (tree order is canonical)
      meta: {
        editable: col.editable,
        editType: col.editType,
        pinned: col.pinned,
        monospace: col.monospace,
        dropdownOptions: col.dropdownOptions,
        accessorKey: col.accessorKey,
      },
      cell: ({ getValue, row, column }: any) => {
        const value = getValue();
        const isEditing =
          editingCell?.rowId === row.original.id &&
          editingCell?.colId === column.id;
        const meta = column.columnDef.meta;

        if (isEditing && meta?.editable) {
          return (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                if (editValue !== String(value ?? "")) {
                  updateElement(
                    config.id,
                    row.original.id,
                    meta.accessorKey,
                    meta.editType === "number" ? Number(editValue) : editValue
                  );
                }
                setEditingCell(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingCell(null);
              }}
              style={{
                width: "100%",
                background: "rgba(30, 41, 59, 0.8)",
                border: `1px solid ${theme.accent}`,
                color: theme.text,
                padding: "4px 8px",
                borderRadius: 3,
                fontSize: 13,
                outline: "none",
              }}
            />
          );
        }

        // Name column with tree indent + level badges for hierarchical catalogs
        if (isHierarchical && column.id === "name") {
          const depth = depthMap.get(row.original.id) || 0;
          const level = row.original.level;
          const indent = depth * 20;

          return (
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: indent }}>
              {level && (
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    background: levelColors[level] || "rgba(100,100,100,0.15)",
                    color: levelTextColors[level] || theme.textMuted,
                  }}
                >
                  L{level}
                </span>
              )}
              <span style={{ fontWeight: depth <= 1 ? 600 : 400 }}>
                {value}
              </span>
            </div>
          );
        }

        // Array values (tags, etc.)
        if (Array.isArray(value)) {
          return (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {value.map((v: string, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 8,
                    background: "rgba(100, 116, 139, 0.2)",
                    color: theme.textMuted,
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
          );
        }

        return (
          <span style={meta?.monospace ? { fontFamily: "'SF Mono', monospace", fontSize: 11, color: theme.textMuted } : {}}>
            {value ?? "—"}
          </span>
        );
      },
    }));

    return [idCol, ...dataCols];
  }, [config, scaffoldData, editingCell, editValue, updateElement, depthMap, sortKeyMap]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <input
          type="text"
          placeholder={`Filter ${config.label.toLowerCase()}...`}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          style={{
            background: "rgba(30, 41, 59, 0.8)",
            border: `1px solid ${theme.border}`,
            color: theme.text,
            padding: "6px 12px",
            borderRadius: 4,
            fontSize: 13,
            width: 240,
          }}
        />
        <button
          onClick={() => {
            const newName = `New ${config.label.slice(0, -1)}`;
            addElement(config.id, { name: newName, elementType: config.id === "capabilities" ? "Capability" : config.id === "activities" ? "Activity" : "Element" });
          }}
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            fontSize: 12,
            cursor: "pointer",
            border: `1px solid ${theme.border}`,
            background: "rgba(30, 41, 59, 0.6)",
            color: theme.textMuted,
          }}
        >
          + Add Row
        </button>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            style={{
              padding: "5px 8px",
              borderRadius: 4,
              fontSize: 13,
              cursor: undoStack.length === 0 ? "default" : "pointer",
              border: `1px solid ${theme.border}`,
              background: "rgba(30, 41, 59, 0.6)",
              color: undoStack.length === 0 ? theme.textDim : theme.textMuted,
              opacity: undoStack.length === 0 ? 0.4 : 1,
            }}
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            style={{
              padding: "5px 8px",
              borderRadius: 4,
              fontSize: 13,
              cursor: redoStack.length === 0 ? "default" : "pointer",
              border: `1px solid ${theme.border}`,
              background: "rgba(30, 41, 59, 0.6)",
              color: redoStack.length === 0 ? theme.textDim : theme.textMuted,
              opacity: redoStack.length === 0 ? 0.4 : 1,
            }}
          >
            ↪
          </button>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: theme.textDim }}>
          {data.length} items
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as any;
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        color: theme.textMuted,
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: `1px solid ${theme.accentBorderSubtle}`,
                        background: meta?.pinned
                          ? "rgba(15, 23, 42, 0.9)"
                          : "rgba(15, 23, 42, 0.5)",
                        position: "sticky",
                        top: 0,
                        cursor: "pointer",
                        userSelect: "none",
                        borderRight: meta?.pinned
                          ? `2px solid ${theme.accentBorder}`
                          : "none",
                        zIndex: 1,
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && " ↑"}
                      {header.column.getIsSorted() === "desc" && " ↓"}
                    </th>
                  );
                })}
                {/* Delete column */}
                <th
                  style={{
                    width: 40,
                    padding: "8px",
                    borderBottom: `1px solid ${theme.accentBorderSubtle}`,
                    background: "rgba(15, 23, 42, 0.5)",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                />
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                style={{
                  borderBottom: `1px solid ${theme.borderSubtle}`,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = theme.bgHover)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as any;
                  return (
                    <td
                      key={cell.id}
                      onDoubleClick={() => {
                        if (meta?.editable && meta?.accessorKey) {
                          setEditingCell({
                            rowId: row.original.id,
                            colId: cell.column.id,
                          });
                          setEditValue(
                            String(
                              (row.original as any)[meta.accessorKey] ?? ""
                            )
                          );
                        }
                      }}
                      style={{
                        padding: "10px 12px",
                        color: theme.text,
                        cursor: meta?.editable ? "text" : "default",
                        borderRight: meta?.pinned
                          ? `2px solid ${theme.accentBorder}`
                          : "none",
                        background: meta?.pinned
                          ? "rgba(15, 23, 42, 0.3)"
                          : "transparent",
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}
                {/* Delete button */}
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <button
                    onClick={() => deleteElement(config.id, row.original.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.textDim,
                      cursor: "pointer",
                      fontSize: 14,
                      opacity: 0.4,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.color = theme.red;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "0.4";
                      e.currentTarget.style.color = theme.textDim;
                    }}
                    title="Delete row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reconciliation Step ──

function ReconciliationStep() {
  const { validationIssues, runValidation, dismissIssue, setStep } =
    useWorkbenchStore();

  useEffect(() => {
    runValidation();
  }, []);

  const activeIssues = validationIssues.filter((i) => !i.dismissed);
  const errors = activeIssues.filter((i) => i.severity === "error");
  const warnings = activeIssues.filter((i) => i.severity === "warning");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: theme.accent, marginBottom: 8 }}>
        Reconciliation
      </h2>
      <p style={{ fontSize: 14, color: theme.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
        Cross-catalog validation checks. Fix issues before regenerating.
      </p>

      {activeIssues.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            background: theme.greenMuted,
            borderRadius: 8,
            border: `1px solid rgba(34, 197, 94, 0.3)`,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ color: theme.green, fontWeight: 600 }}>
            All checks passed — model is structurally sound
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            {errors.length > 0 && (
              <span style={{ color: theme.red }}>✗ {errors.length} errors</span>
            )}
            {warnings.length > 0 && (
              <span style={{ color: theme.accent }}>
                ⚠ {warnings.length} warnings
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeIssues.map((issue) => (
              <div
                key={issue.id}
                style={{
                  padding: "12px 16px",
                  background: "rgba(30, 41, 59, 0.5)",
                  border: `1px solid ${
                    issue.severity === "error"
                      ? "rgba(239, 68, 68, 0.3)"
                      : theme.accentBorder
                  }`,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    color:
                      issue.severity === "error" ? theme.red : theme.accent,
                  }}
                >
                  {issue.severity === "error" ? "✗" : "⚠"}
                </span>
                <div style={{ flex: 1, fontSize: 13, color: theme.text }}>
                  {issue.message}
                </div>
                <button
                  onClick={() => dismissIssue(issue.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.textDim,
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 32,
        }}
      >
        <button
          onClick={() => setStep(2)}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            border: `1px solid ${theme.border}`,
            background: "transparent",
            color: theme.textMuted,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ← Back to Catalogs
        </button>
        <button
          onClick={() => setStep(5)}
          style={{
            padding: "10px 24px",
            borderRadius: 6,
            border: "none",
            background: theme.accent,
            color: theme.bg,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Proceed to Regenerate →
        </button>
      </div>
    </div>
  );
}

// ── Regenerate Step (placeholder for Phase 3) ──

function RegenerateStep() {
  const { editHistory, selectedCatalogs, setStep, workingScaffold } =
    useWorkbenchStore();
  const backToNetwork = useCanvasStore((s) => s.backToNetwork);
  const loadScaffold = useCanvasStore((s) => s.loadScaffold);
  const exitWorkbench = useWorkbenchStore((s) => s.exitWorkbench);

  const [committed, setCommitted] = useState(false);

  const commitChanges = async () => {
    if (workingScaffold) {
      await loadScaffold(workingScaffold);
      setCommitted(true);
    }
  };

  const returnToNetwork = () => {
    exitWorkbench();
    backToNetwork();
  };

  const algorithmSteps = [
    { label: "Capabilities", desc: "foundation — everything references these" },
    { label: "Concepts / Business Objects", desc: "grounded against capabilities" },
    { label: "Value Streams & Stages", desc: "delivery structure" },
    { label: "Stage-to-Capability Mappings", desc: "cross-references" },
    { label: "PPIT / Roles / Metrics", desc: "derived from all of the above" },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: theme.accent,
          marginBottom: 8,
        }}
      >
        {committed ? "Changes Applied" : "Apply Changes"}
      </h2>

      {!committed ? (
        <>
          <p
            style={{
              fontSize: 14,
              color: theme.textMuted,
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            You've made {editHistory.length} edits across{" "}
            {selectedCatalogs.length} catalogs. Apply these changes to your
            project model.
          </p>

          <div
            style={{
              marginBottom: 24,
              padding: 16,
              background: "rgba(30, 41, 59, 0.5)",
              borderRadius: 8,
              border: `1px solid ${theme.accentBorder}`,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: theme.textMuted,
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Dependency Order
            </div>
            {algorithmSteps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: theme.textDim,
                    fontFamily: "monospace",
                    width: 16,
                  }}
                >
                  {i + 1}.
                </span>
                <span style={{ fontSize: 13, color: theme.text }}>
                  {step.label}
                </span>
                <span style={{ fontSize: 11, color: theme.textDim }}>
                  — {step.desc}
                </span>
                {i < algorithmSteps.length - 1 && (
                  <span
                    style={{
                      position: "absolute",
                      marginLeft: 6,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={() => setStep(4)}
              style={{
                padding: "10px 20px",
                borderRadius: 6,
                border: `1px solid ${theme.border}`,
                background: "transparent",
                color: theme.textMuted,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ← Back
            </button>
            <button
              onClick={commitChanges}
              style={{
                padding: "12px 28px",
                borderRadius: 6,
                border: "none",
                background: theme.accent,
                color: theme.bg,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Apply Changes to Project
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p
            style={{
              fontSize: 16,
              color: theme.green,
              marginBottom: 32,
              fontWeight: 600,
            }}
          >
            Model updated successfully.
          </p>
          <button
            onClick={returnToNetwork}
            style={{
              padding: "12px 28px",
              borderRadius: 6,
              border: "none",
              background: theme.accent,
              color: theme.bg,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Return to Network View →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Workbench View ──

// ── Agent Sidebar (floats alongside catalog grid) ──

function AgentSidebar({ onClose }: { onClose: () => void }) {
  const {
    activeCatalog,
    workingScaffold,
    agentMessages,
    addAgentMessage,
    applyEdits,
  } = useWorkbenchStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = agentMessages[activeCatalog] || [];
  const scaffoldKey = CATALOG_CONFIGS[activeCatalog].scaffoldKey;
  const catalogElements = workingScaffold
    ? (workingScaffold.elements as any)[scaffoldKey] || {}
    : {};

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeCatalog]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    addAgentMessage(activeCatalog, userMsg);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role === "agent" ? "assistant" : "user",
        content: m.diffs
          ? `${m.content}\n\n<diff>\n${JSON.stringify(m.diffs, null, 2)}\n</diff>`
          : m.content,
      }));

      const llmMessages = buildRefinementAgentPrompt(
        activeCatalog,
        catalogElements,
        history,
        trimmed,
      );

      const response = await callLLM({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        temperature: 0.3,
        messages: llmMessages,
      });

      const { explanation, diffs } = parseAgentResponse(response.text);

      addAgentMessage(activeCatalog, {
        id: `agent_${Date.now()}`,
        role: "agent",
        content: explanation,
        diffs: diffs.length > 0 ? diffs : undefined,
        timestamp: Date.now(),
      });
    } catch (e: any) {
      setError(e.message || "Failed to get agent response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const acceptDiffs = (diffs: DiffOperation[]) => {
    applyEdits(diffs);
    addAgentMessage(activeCatalog, {
      id: `system_${Date.now()}`,
      role: "agent",
      content: `Applied ${diffs.length} change${diffs.length !== 1 ? "s" : ""} to ${CATALOG_CONFIGS[activeCatalog].label}. The grid has been updated.`,
      timestamp: Date.now(),
    });
  };

  return (
    <div
      style={{
        width: 380,
        minWidth: 380,
        display: "flex",
        flexDirection: "column",
        borderLeft: `1px solid ${theme.accentBorder}`,
        background: "rgba(15, 23, 42, 0.97)",
      }}
    >
      {/* Sidebar header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: `1px solid ${theme.accentBorderSubtle}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.accent }}>Refinement Agent</span>
          <span style={{ fontSize: 10, color: theme.textDim }}>
            — {CATALOG_CONFIGS[activeCatalog].label}
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textDim, cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>×</button>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>
        {/* Welcome */}
        {messages.length === 0 && (
          <div style={{ padding: "16px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
              Describe changes to the <strong style={{ color: theme.text }}>{CATALOG_CONFIGS[activeCatalog].label}</strong> catalog. I'll propose structured diffs you can accept or reject.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {getExamplePrompts(activeCatalog).slice(0, 3).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    color: theme.textMuted,
                    background: "rgba(30, 41, 59, 0.5)",
                    border: `1px solid ${theme.borderSubtle}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 10 }}>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: msg.role === "user"
                  ? "rgba(245, 158, 11, 0.08)"
                  : "rgba(30, 41, 59, 0.6)",
                border: `1px solid ${msg.role === "user" ? theme.accentBorder : theme.borderSubtle}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: msg.role === "user" ? theme.accent : theme.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {msg.role === "user" ? "You" : "Agent"}
                </span>
                <span style={{ fontSize: 9, color: theme.textDim }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {msg.content}
              </div>
            </div>

            {/* Diff card — compact */}
            {msg.diffs && msg.diffs.length > 0 && (
              <div style={{
                marginTop: 6,
                borderRadius: 8,
                overflow: "hidden",
                border: `1px solid ${theme.accentBorder}`,
                background: "rgba(15, 23, 42, 0.9)",
              }}>
                <div style={{ padding: "6px 10px", borderBottom: `1px solid ${theme.accentBorderSubtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: theme.accent }}>
                    {msg.diffs.length} change{msg.diffs.length !== 1 ? "s" : ""}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => acceptDiffs(msg.diffs!)}
                      style={{ padding: "3px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600, color: theme.bg, background: theme.green, border: "none", cursor: "pointer" }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        addAgentMessage(activeCatalog, {
                          id: `system_${Date.now()}`,
                          role: "agent",
                          content: "Rejected. What would you prefer?",
                          timestamp: Date.now(),
                        });
                      }}
                      style={{ padding: "3px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600, color: theme.red, background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.3)`, cursor: "pointer" }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div style={{ maxHeight: 180, overflow: "auto" }}>
                  {msg.diffs.map((diff: any, i: number) => (
                    <div key={i} style={{ padding: "5px 10px", borderBottom: `1px solid ${theme.borderSubtle}`, display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 4px",
                        borderRadius: 2,
                        background: actionColors[diff.action]?.bg || "rgba(100,100,100,0.15)",
                        color: actionColors[diff.action]?.text || theme.textMuted,
                        flexShrink: 0,
                      }}>
                        {diff.action.toUpperCase()}
                      </span>
                      <span style={{ color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {renderDiffDetail(diff)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(30, 41, 59, 0.6)", border: `1px solid ${theme.borderSubtle}`, display: "inline-block", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: theme.textMuted }}>
              <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>Thinking...</span>
            </span>
          </div>
        )}

        {error && (
          <div style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 11, color: theme.red, marginBottom: 10 }}>
            {error}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${theme.accentBorderSubtle}` }}>
        <div style={{ display: "flex", gap: 6 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe changes..."
            rows={2}
            style={{
              flex: 1,
              resize: "none",
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 12,
              color: theme.text,
              background: "rgba(30, 41, 59, 0.6)",
              border: `1px solid ${theme.border}`,
              outline: "none",
              lineHeight: 1.4,
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: theme.bg,
              background: isLoading || !input.trim() ? theme.textDim : theme.accent,
              border: "none",
              cursor: isLoading || !input.trim() ? "default" : "pointer",
              alignSelf: "flex-end",
              opacity: isLoading || !input.trim() ? 0.5 : 1,
            }}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tooltip Component ──

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
        setVisible(true);
      }}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          transform: "translateX(-50%)",
          maxWidth: 260,
          padding: "8px 12px",
          borderRadius: 6,
          background: "rgba(15, 23, 42, 0.95)",
          border: `1px solid ${theme.accentBorder}`,
          color: theme.textMuted,
          fontSize: 11,
          lineHeight: 1.5,
          zIndex: 100,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// Diff action colours
const actionColors: Record<string, { bg: string; text: string }> = {
  add: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e" },
  modify: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
  delete: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
  merge: { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7" },
  split: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
  move: { bg: "rgba(6, 182, 212, 0.15)", text: "#06b6d4" },
};

function renderDiffDetail(diff: any): string {
  switch (diff.action) {
    case "modify":
    case "move":
      return `${diff.field}: "${diff.before}" → "${diff.after}"`;
    case "add":
      return `New: "${diff.element?.name || diff.elementId}"`;
    case "delete":
      return `Remove${diff.cascadeUpdates?.length ? ` (+${diff.cascadeUpdates.length} cascade updates)` : ""}`;
    case "merge":
      return `${diff.sourceIds?.length || 0} elements → "${diff.mergedElement?.name || diff.targetId}"`;
    case "split":
      return `Into ${diff.newElements?.length || 0} new elements`;
    default:
      return JSON.stringify(diff).slice(0, 80);
  }
}

function getExamplePrompts(catalog: CatalogType): string[] {
  const examples: Record<CatalogType, string[]> = {
    capabilities: [
      "Merge Customer Onboarding and Client Setup",
      "Add missing L4 capabilities under Risk Management",
      "Rename all L1s to match our org structure",
      "Flag any orphaned capabilities",
    ],
    valueStreams: [
      "This stage sequence doesn't flow logically",
      "Merge the last two stages — they're too thin",
      "Suggest missing stages in the onboarding flow",
      "Add entry/exit criteria to empty stages",
    ],
    activities: [
      "Reassign capabilities to the correct stages",
      "Flag stages with no capabilities",
      "Update role references to match new role names",
    ],
    concepts: [
      "Reclassify these objects — some are mistyped",
      "Merge duplicate business objects",
      "Add missing properties to Customer",
      "Flag concepts not linked to any capability",
    ],
    roles: [
      "Merge Analyst, Risk Analyst, and Senior Analyst",
      "Suggest RACI separation for overlapping roles",
      "Flag roles not assigned to any activity",
    ],
    metrics: [
      "Suggest KPIs for unmetered capabilities",
      "Reclassify — some leading metrics are actually lagging",
      "Retarget metrics pointing at deleted elements",
    ],
  };
  return examples[catalog] || [];
}

// ── Graph Explorer (moved to StructuredGraphExplorer.tsx) ──

/* Old force-directed GraphExplorer removed — replaced by StructuredGraphExplorer */

// ── Main Workbench View ──
export function WorkbenchView() {
  const {
    currentStep,
    setStep,
    selectedCatalogs,
    activeCatalog,
    setActiveCatalog,
    workingScaffold,
    dirtyCountByCatalog,
    exitWorkbench,
    editHistory,
  } = useWorkbenchStore();

  const backToNetwork = useCanvasStore((s) => s.backToNetwork);
  const [workbenchTab, setWorkbenchTab] = useState<"catalog" | "graph">("catalog");
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);

  // Global undo/redo keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useWorkbenchStore.getState().undo();
      }
      if (isMod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        useWorkbenchStore.getState().redo();
      }
      // Ctrl+Y alternative for redo
      if (isMod && e.key === "y") {
        e.preventDefault();
        useWorkbenchStore.getState().redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleExit = () => {
    if (editHistory.length > 0) {
      if (!confirm("You have unsaved changes. Exit the Workbench?")) return;
    }
    exitWorkbench();
    backToNetwork();
  };

  const steps = [
    { num: 2 as const, label: "Catalog Review" },
    { num: 4 as const, label: "Reconcile" },
    { num: 5 as const, label: "Apply" },
  ];

  const totalDirty = Object.values(dirtyCountByCatalog).reduce(
    (a, b) => a + b,
    0
  );

  // Sort catalogs alphabetically for the dropdown
  const sortedCatalogs = useMemo(
    () => [...selectedCatalogs].sort((a, b) => CATALOG_CONFIGS[a].label.localeCompare(CATALOG_CONFIGS[b].label)),
    [selectedCatalogs],
  );

  // Get elements for active catalog
  const activeConfig = CATALOG_CONFIGS[activeCatalog];
  const activeElements = workingScaffold
    ? (workingScaffold.elements as any)[activeConfig.scaffoldKey] || {}
    : {};

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          background: theme.bgSurface,
          borderBottom: `1px solid ${theme.accentBorderSubtle}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 18,
              display: "inline-block",
              animation: "spin 8s linear infinite",
            }}
          >
            ⚙
          </span>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: theme.accent, margin: 0 }}>
            Op Model Workbench
          </h1>
          {totalDirty > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 10,
                background: theme.accentMuted,
                color: theme.accent,
              }}
            >
              {totalDirty} edit{totalDirty !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 13,
              color: theme.textDim,
              fontFamily: "'SF Mono', monospace",
            }}
          >
            {workingScaffold?.name || "—"}
          </span>
          <button
            onClick={handleExit}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              border: `1px solid ${theme.border}`,
              background: "transparent",
              color: theme.textMuted,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Exit Workbench
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div
        style={{
          display: "flex",
          gap: 2,
          padding: "12px 24px",
          background: "rgba(15, 23, 42, 0.8)",
          borderBottom: `1px solid ${theme.accentBorderSubtle}`,
        }}
      >
        {steps.map((step, i) => {
          const isCompleted = currentStep > step.num;
          const isActive = currentStep === step.num;
          const isClickable = step.num <= currentStep || (step.num === 4 && currentStep >= 2);

          return (
            <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
              <button
                onClick={() => isClickable && setStep(step.num)}
                disabled={!isClickable}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontSize: 13,
                  color: isActive
                    ? theme.accent
                    : isCompleted
                    ? theme.green
                    : theme.textDim,
                  background: isActive ? theme.accentMuted : "transparent",
                  border: isActive
                    ? `1px solid ${theme.accentBorder}`
                    : "1px solid transparent",
                  cursor: isClickable ? "pointer" : "default",
                  opacity: isClickable ? 1 : 0.5,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    border: `1.5px solid currentColor`,
                    background: isActive
                      ? "rgba(245, 158, 11, 0.2)"
                      : isCompleted
                      ? theme.greenMuted
                      : "transparent",
                  }}
                >
                  {isCompleted ? "✓" : i + 1}
                </span>
                {step.label}
              </button>
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: 20,
                    height: 1,
                    background: theme.border,
                    margin: "0 2px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 2: Catalog Review */}
      {currentStep === 2 && (
        <>
          {/* Intro panel — dismissible orientation */}
          {introVisible && (
            <div style={{
              padding: "12px 24px",
              background: "rgba(245, 158, 11, 0.04)",
              borderBottom: `1px solid ${theme.accentBorderSubtle}`,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent, marginBottom: 4 }}>
                  Welcome to the Op Model Workbench
                </div>
                <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.6, margin: 0 }}>
                  This is where you refine your operating model's structural foundations. Use the <strong style={{ color: theme.text }}>Catalog</strong> view to browse and directly edit elements.
                  Open the <strong style={{ color: theme.text }}>Refinement Agent</strong> to describe changes in plain English — it will propose structured diffs you can accept or reject.
                  When you're done editing, <strong style={{ color: theme.text }}>Reconcile</strong> runs cross-catalog validation to catch orphaned references and structural gaps,
                  then <strong style={{ color: theme.text }}>Apply</strong> commits your changes back to the project model.
                </p>
              </div>
              <button
                onClick={() => setIntroVisible(false)}
                style={{ background: "none", border: "none", color: theme.textDim, cursor: "pointer", fontSize: 14, padding: "2px 6px", flexShrink: 0 }}
                title="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Toolbar: View toggle + Catalog dropdown + Reconcile */}
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "8px 24px",
              background: "rgba(15, 23, 42, 0.6)",
              borderBottom: `1px solid ${theme.accentBorderSubtle}`,
              alignItems: "center",
            }}
          >
            {/* View mode toggle */}
            <Tooltip text="Switch between the tabular catalog editor and the force-directed graph explorer showing cross-catalog relationships.">
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1px solid ${theme.border}` }}>
              <button
                onClick={() => setWorkbenchTab("catalog")}
                style={{
                  padding: "5px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  color: workbenchTab === "catalog" ? theme.accent : theme.textDim,
                  background: workbenchTab === "catalog" ? theme.accentMuted : "transparent",
                }}
              >
                Catalog
              </button>
              <button
                onClick={() => setWorkbenchTab("graph")}
                style={{
                  padding: "5px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  borderLeft: `1px solid ${theme.border}`,
                  color: workbenchTab === "graph" ? theme.accent : theme.textDim,
                  background: workbenchTab === "graph" ? theme.accentMuted : "transparent",
                }}
              >
                Graph Explorer
              </button>
            </div>
            </Tooltip>

            {/* Catalog dropdown (visible when in catalog mode) */}
            {workbenchTab === "catalog" && (
              <Tooltip text="Select which catalog to review. Each catalog represents a different facet of your operating model — capabilities, value streams, roles, etc.">
              <select
                value={activeCatalog}
                onChange={(e) => setActiveCatalog(e.target.value as any)}
                style={{
                  padding: "5px 28px 5px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  color: theme.text,
                  background: "rgba(30, 41, 59, 0.8)",
                  border: `1px solid ${theme.accentBorder}`,
                  cursor: "pointer",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 8px center",
                }}
              >
                {sortedCatalogs.map((cat) => {
                  const cfg = CATALOG_CONFIGS[cat];
                  const dirty = dirtyCountByCatalog[cat];
                  return (
                    <option key={cat} value={cat}>
                      {cfg.icon} {cfg.label}{dirty > 0 ? ` (${dirty} edits)` : ""}
                    </option>
                  );
                })}
              </select>
              </Tooltip>
            )}

            {/* Dirty indicator for current catalog */}
            {workbenchTab === "catalog" && dirtyCountByCatalog[activeCatalog] > 0 && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: theme.accentMuted,
                  color: theme.accent,
                }}
              >
                {dirtyCountByCatalog[activeCatalog]} edit{dirtyCountByCatalog[activeCatalog] !== 1 ? "s" : ""}
              </span>
            )}

            <div style={{ flex: 1 }} />
            <Tooltip text="Chat with the AI refinement agent to propose structural changes to the active catalog. The agent sees only this catalog's data and proposes diffs you can accept or reject.">
              <button
                onClick={() => setAgentPanelOpen(!agentPanelOpen)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 4,
                  fontSize: 12,
                  color: agentPanelOpen ? theme.bg : theme.accent,
                  background: agentPanelOpen ? theme.accent : theme.accentMuted,
                  border: `1px solid ${theme.accentBorder}`,
                  cursor: "pointer",
                  fontWeight: agentPanelOpen ? 600 : 400,
                }}
              >
                🤖 {agentPanelOpen ? "Close Agent" : "Refine with Agent"}
              </button>
            </Tooltip>
            <Tooltip text="Run cross-catalog validation checks to find structural issues — orphaned capabilities, missing role references, broken chains.">
              <button
                onClick={() => setStep(4)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 4,
                  fontSize: 12,
                  color: theme.textMuted,
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                  cursor: "pointer",
                }}
              >
                Reconcile →
              </button>
            </Tooltip>
          </div>

          {/* Content area: grid/graph + optional agent sidebar */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Main content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {workbenchTab === "catalog" && (
                <CatalogGrid
                  config={activeConfig}
                  elements={activeElements}
                  scaffoldData={workingScaffold}
                />
              )}
              {workbenchTab === "graph" && workingScaffold && (
                <StructuredGraphExplorer scaffoldData={workingScaffold} />
              )}
            </div>

            {/* Agent sidebar */}
            {agentPanelOpen && (
              <AgentSidebar onClose={() => setAgentPanelOpen(false)} />
            )}
          </div>
        </>
      )}

      {/* Step 4: Reconciliation */}
      {currentStep === 4 && <ReconciliationStep />}

      {/* Step 5: Regenerate / Apply */}
      {currentStep === 5 && <RegenerateStep />}

      {/* Animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
