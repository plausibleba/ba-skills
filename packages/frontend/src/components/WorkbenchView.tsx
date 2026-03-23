// @ts-nocheck
// Op Model Workbench — Phase 1: Catalog grids + engine room theme
// Session 26

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type ColumnOrderState,
} from "@tanstack/react-table";
import { useCanvasStore } from "../store/canvas-store";
import { useWorkbenchStore, type CatalogType } from "../store/workbench-store";
import {
  CATALOG_CONFIGS,
  ALL_CATALOGS,
  resolveAccessor,
  type CatalogConfig,
  type CatalogColumnDef,
} from "../lib/catalog-configs";

// ── Engine Room Theme Styles ──

const theme = {
  bg: "#0f172a",
  bgSurface: "rgba(15, 23, 42, 0.95)",
  bgHover: "rgba(245, 158, 11, 0.03)",
  accent: "#f59e0b",
  accentMuted: "rgba(245, 158, 11, 0.15)",
  accentBorder: "rgba(245, 158, 11, 0.2)",
  accentBorderSubtle: "rgba(245, 158, 11, 0.08)",
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

interface TreeNode {
  element: any;
  children: TreeNode[];
  depth: number;
  sortKey: string; // e.g. "1.2.3" for hierarchical numbering
}

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
  const { updateElement, deleteElement, addElement } = useWorkbenchStore();
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
  const { validationIssues, runValidation, dismissIssue, applyFix, setStep } =
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

  const handleExit = () => {
    if (editHistory.length > 0) {
      if (!confirm("You have unsaved changes. Exit the Workbench?")) return;
    }
    exitWorkbench();
    backToNetwork();
  };

  const steps = [
    { num: 2 as const, label: "Catalog Review" },
    { num: 3 as const, label: "Agent" },
    { num: 4 as const, label: "Reconcile" },
    { num: 5 as const, label: "Apply" },
  ];

  const totalDirty = Object.values(dirtyCountByCatalog).reduce(
    (a, b) => a + b,
    0
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
          {/* Catalog Tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "8px 24px",
              background: "rgba(15, 23, 42, 0.6)",
              borderBottom: `1px solid ${theme.accentBorderSubtle}`,
              alignItems: "center",
            }}
          >
            {selectedCatalogs.map((cat) => {
              const cfg = CATALOG_CONFIGS[cat];
              const dirty = dirtyCountByCatalog[cat];
              const isActive = activeCatalog === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCatalog(cat)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 4,
                    fontSize: 12,
                    color: isActive ? theme.accent : theme.textMuted,
                    background: isActive ? theme.accentMuted : "transparent",
                    border: `1px solid ${
                      isActive ? theme.accentBorder : "transparent"
                    }`,
                    cursor: "pointer",
                  }}
                >
                  {cfg.icon} {cfg.label}
                  {dirty > 0 && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 8,
                        background: "rgba(245, 158, 11, 0.2)",
                        color: theme.accent,
                      }}
                    >
                      {dirty}
                    </span>
                  )}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
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
          </div>

          {/* Grid */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <CatalogGrid
              config={activeConfig}
              elements={activeElements}
              scaffoldData={workingScaffold}
            />
          </div>
        </>
      )}

      {/* Step 3: Agent (Phase 2 placeholder) */}
      {currentStep === 3 && (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: theme.textDim,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <p>Refinement Agent — coming in Phase 2</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Chat-style feedback with structured diff proposals
          </p>
        </div>
      )}

      {/* Step 4: Reconciliation */}
      {currentStep === 4 && <ReconciliationStep />}

      {/* Step 5: Regenerate / Apply */}
      {currentStep === 5 && <RegenerateStep />}

      {/* Gear spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
