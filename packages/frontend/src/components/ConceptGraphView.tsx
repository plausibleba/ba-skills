// @ts-nocheck
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useDiscoverySessionStore } from "../store/discovery-session-store.ts";
import { deriveConceptsFromScaffold } from "../domain/pipeline/pipeline-orchestrator.ts";
import type { ScaffoldGraphIndex } from "../store/graph-index.ts";
import { tv } from "../theme.ts";

/* ═══════════════════════════════════════════════════════════════
   Type helpers
   ═══════════════════════════════════════════════════════════════ */
interface ConceptNode {
  id: string;
  name: string;
  type: "Party" | "Record" | "Resource";
  subtype?: string;
  definition?: string;
  lifecycleStates?: any[];
  relationships?: Rel[];
  properties?: Record<string, { name: string; dataType: string; description?: string; required?: boolean }>;
  relatedCapabilityIds?: string[];
}
interface Rel {
  targetId: string;
  type: string;
  label?: string;
  cardinality?: string;
}

/* ═══════════════════════════════════════════════════════════════
   Colour + ER styling
   ═══════════════════════════════════════════════════════════════ */
const ER_STYLE = { bg: "#fafafa", border: "#d4d4d4", accent: "#525252", text: "#262626", headerBg: "#f0f0f0" };

/* ═══════════════════════════════════════════════════════════════
   Auto-generate attributes for a concept based on type + name
   ═══════════════════════════════════════════════════════════════ */
function deriveAttributes(c: ConceptNode): { name: string; type: string }[] {
  if (c.properties && Object.keys(c.properties).length > 0) {
    return Object.values(c.properties).map(p => ({ name: p.name, type: p.dataType }));
  }
  const base = [{ name: "id", type: "UUID" }, { name: "name", type: "String" }];
  if (c.type === "Party") {
    base.push({ name: "role", type: "String" }, { name: "email", type: "String" }, { name: "status", type: "Enum" });
  } else if (c.type === "Record") {
    base.push({ name: "createdAt", type: "DateTime" }, { name: "status", type: "Enum" }, { name: "reference", type: "String" });
    if (c.lifecycleStates?.length) base.push({ name: "state", type: "Lifecycle" });
  } else {
    base.push({ name: "type", type: "String" }, { name: "version", type: "String" }, { name: "status", type: "Enum" });
  }
  return base;
}

/* ═══════════════════════════════════════════════════════════════
   Build class hierarchy tree: Party / Record / Resource as roots
   ═══════════════════════════════════════════════════════════════ */
interface TreeNode { id: string; label: string; type: string; subtype?: string; children?: TreeNode[] }

function buildTree(concepts: Record<string, ConceptNode>): TreeNode[] {
  const groups: Record<string, ConceptNode[]> = { Party: [], Record: [], Resource: [] };
  for (const c of Object.values(concepts)) {
    (groups[c.type] ?? (groups.Record ??= [])).push(c);
  }
  return [
    { id: "__party", label: "Party", type: "Party", children: groups.Party.sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name, type: c.type, subtype: c.subtype })) },
    { id: "__record", label: "Record", type: "Record", children: groups.Record.sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name, type: c.type, subtype: c.subtype })) },
    { id: "__resource", label: "Resource", type: "Resource", children: groups.Resource.sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name, type: c.type, subtype: c.subtype })) },
  ];
}

/* ═══════════════════════════════════════════════════════════════
   ER Diagram layout — center node + ring of related nodes
   ═══════════════════════════════════════════════════════════════ */
interface ERNode {
  concept: ConceptNode;
  x: number;
  y: number;
  w: number;
  h: number;
  expanded: boolean;
}
interface EREdge {
  fromId: string;
  toId: string;
  label: string;
  cardinality: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

function layoutER(
  focusId: string,
  concepts: Record<string, ConceptNode>,
  expandedIds: Set<string>,
  graphIndex?: ScaffoldGraphIndex | null,
  scaffoldElements?: Record<string, any>,
): { nodes: ERNode[]; edges: EREdge[] } {
  const focus = concepts[focusId];
  if (!focus) return { nodes: [], edges: [] };

  const CX = 500, CY = 340;
  const NODE_W = 220, NODE_H_BASE = 44, ATTR_ROW = 18;

  const focusAttrs = deriveAttributes(focus);
  const focusH = NODE_H_BASE + focusAttrs.length * ATTR_ROW;
  const nodes: ERNode[] = [{ concept: focus, x: CX - NODE_W / 2, y: CY - focusH / 2, w: NODE_W, h: focusH, expanded: true }];

  // Collect 1st-order relations (outgoing + incoming)
  const relatedIds = new Set<string>();
  const edgeData: { fromId: string; toId: string; label: string; cardinality: string }[] = [];
  const seenEdgeKeys = new Set<string>(); // Deduplicate edges

  const addEdgeDedup = (fromId: string, toId: string, label: string, cardinality: string) => {
    const key = `${fromId}→${toId}→${label}`;
    const reverseKey = `${toId}→${fromId}→${label}`;
    if (seenEdgeKeys.has(key) || seenEdgeKeys.has(reverseKey)) return;
    seenEdgeKeys.add(key);
    edgeData.push({ fromId, toId, label, cardinality });
  };

  // 1. Explicit relationships on the concept object
  for (const rel of focus.relationships ?? []) {
    if (concepts[rel.targetId]) {
      relatedIds.add(rel.targetId);
      addEdgeDedup(focusId, rel.targetId, rel.label ?? rel.type, rel.cardinality ?? "");
    }
  }
  // Incoming explicit relations
  for (const [cId, c] of Object.entries(concepts)) {
    if (cId === focusId) continue;
    for (const rel of c.relationships ?? []) {
      if (rel.targetId === focusId && !relatedIds.has(cId)) {
        relatedIds.add(cId);
        addEdgeDedup(cId, focusId, rel.label ?? rel.type, rel.cardinality ?? "");
      }
    }
  }

  // 2. Graph-index derived relationships (D-097)
  // Find concepts that share capabilities, activities, or value streams with the focus concept
  if (graphIndex && scaffoldElements) {
    const focusEdges = graphIndex.edgesFor(focusId);

    // Collect all capabilities and activities linked to this concept
    const linkedCapIds = new Set<string>();
    const linkedActIds = new Set<string>();
    const linkedVsIds = new Set<string>();

    for (const e of focusEdges) {
      const otherId = e.sourceId === focusId ? e.targetId : e.sourceId;
      const otherType = e.sourceId === focusId ? e.targetType : e.sourceType;
      if (otherType === "Capability") linkedCapIds.add(otherId);
      if (otherType === "Activity") linkedActIds.add(otherId);
      if (otherType === "ValueStream") linkedVsIds.add(otherId);
    }

    // Also find capabilities via businessObject name match (capability → concept)
    for (const [capId, cap] of Object.entries(scaffoldElements.capabilities ?? {})) {
      const bo = (cap as any).businessObject;
      if (bo && focus.name && bo.toLowerCase() === focus.name.toLowerCase()) {
        linkedCapIds.add(capId);
      }
    }

    // For each linked capability, find other concepts that also link to it
    for (const capId of linkedCapIds) {
      const capEdges = graphIndex.edgesFor(capId);
      for (const e of capEdges) {
        const otherId = e.sourceId === capId ? e.targetId : e.sourceId;
        const otherType = e.sourceId === capId ? e.targetType : e.sourceType;
        if (otherType === "Concept" && otherId !== focusId && concepts[otherId] && !relatedIds.has(otherId)) {
          relatedIds.add(otherId);
          const capName = (scaffoldElements.capabilities?.[capId] as any)?.name ?? "capability";
          addEdgeDedup(focusId, otherId, `shared capability`, "");
        }
      }
    }

    // For each linked activity, find other concepts referenced in the same activity
    for (const actId of linkedActIds) {
      const actEdges = graphIndex.edgesFor(actId);
      for (const e of actEdges) {
        const otherId = e.sourceId === actId ? e.targetId : e.sourceId;
        const otherType = e.sourceId === actId ? e.targetType : e.sourceType;
        if (otherType === "Concept" && otherId !== focusId && concepts[otherId] && !relatedIds.has(otherId)) {
          relatedIds.add(otherId);
          addEdgeDedup(focusId, otherId, `co-occurs in activity`, "");
        }
      }
    }

    // Concept ↔ InformationObject matching: find concepts that map to IOs in the same activities
    // This connects e.g. Product → Product Catalog when both appear in the same VS
    const ioIds = graphIndex.relatedIds(focusId, { targetType: "InformationObject" });
    for (const ioId of ioIds) {
      // Find activities that use this IO
      const ioActIds = graphIndex.referencedBy(ioId, "Activity");
      for (const actId of ioActIds) {
        // Find other IOs in this activity
        const actEdges = graphIndex.edgesFor(actId);
        for (const e of actEdges) {
          if (e.relation !== "usesInformationObject") continue;
          const otherIoId = e.targetId;
          if (otherIoId === ioId) continue;
          // Check if this IO maps to a concept
          const ioName = (scaffoldElements.informationObjects?.[otherIoId] as any)?.name?.toLowerCase();
          if (!ioName) continue;
          for (const [cId, c] of Object.entries(concepts)) {
            if (cId === focusId || relatedIds.has(cId)) continue;
            if ((c as ConceptNode).name?.toLowerCase() === ioName) {
              relatedIds.add(cId);
              addEdgeDedup(focusId, cId, "co-occurs in stage", "");
            }
          }
        }
      }
    }
  }

  // Layout related nodes in a ring
  const related = [...relatedIds];
  const RADIUS = 280;
  const startAngle = -Math.PI / 2;
  const angleStep = related.length > 0 ? (2 * Math.PI) / related.length : 0;

  for (let i = 0; i < related.length; i++) {
    const rId = related[i];
    const rc = concepts[rId];
    const angle = startAngle + i * angleStep;
    const isExpanded = expandedIds.has(rId);
    const attrs = isExpanded ? deriveAttributes(rc) : [];
    const h = isExpanded ? NODE_H_BASE + attrs.length * ATTR_ROW : NODE_H_BASE;
    const rx = CX + RADIUS * Math.cos(angle) - NODE_W / 2;
    const ry = CY + RADIUS * Math.sin(angle) - h / 2;
    nodes.push({ concept: rc, x: rx, y: ry, w: NODE_W, h, expanded: isExpanded });
  }

  // Compute edge endpoints
  const nodeMap = new Map(nodes.map(n => [n.concept.id, n]));
  const edges: EREdge[] = edgeData.map(e => {
    const from = nodeMap.get(e.fromId)!;
    const to = nodeMap.get(e.toId)!;
    const fromCx = from.x + from.w / 2, fromCy = from.y + from.h / 2;
    const toCx = to.x + to.w / 2, toCy = to.y + to.h / 2;
    return { ...e, fromX: fromCx, fromY: fromCy, toX: toCx, toY: toCy };
  });

  return { nodes, edges };
}

/* ═══════════════════════════════════════════════════════════════
   SVG: curved edge with arrowhead and cardinality labels
   ═══════════════════════════════════════════════════════════════ */
function EREdgeSVG({ edge }: { edge: EREdge }) {
  const { fromX, fromY, toX, toY, label, cardinality } = edge;
  const dx = toX - fromX, dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular offset for curve
  const off = Math.min(dist * 0.2, 50);
  const mx = (fromX + toX) / 2 - (dy / dist) * off;
  const my = (fromY + toY) / 2 + (dx / dist) * off;

  // Shorten endpoints to not overlap node borders
  const SHORTEN = 14;
  const ux = dx / dist, uy = dy / dist;
  const sx = fromX + ux * SHORTEN, sy = fromY + uy * SHORTEN;
  const ex = toX - ux * SHORTEN, ey = toY - uy * SHORTEN;

  const d = `M${sx},${sy} Q${mx},${my} ${ex},${ey}`;
  const markerId = `arrow-${edge.fromId}-${edge.toId}`;

  // Cardinality parts
  const [cardFrom, cardTo] = cardinality.includes(":")
    ? cardinality.split(":")
    : ["", ""];

  return (
    <g>
      <defs>
        <marker id={markerId} viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>
      <path d={d} fill="none" stroke="#94a3b8" strokeWidth={1.2} markerEnd={`url(#${markerId})`} />
      {/* Label */}
      <text x={mx} y={my - 6} textAnchor="middle" fontSize={9} fill="#64748b" fontStyle="italic">{label}</text>
      {/* Cardinality near from */}
      {cardFrom && <text x={sx + ux * 18 - uy * 10} y={sy + uy * 18 + ux * 10} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight={600}>{cardFrom}</text>}
      {/* Cardinality near to */}
      {cardTo && <text x={ex - ux * 18 - uy * 10} y={ey - uy * 18 + ux * 10} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight={600}>{cardTo}</text>}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SVG: ER Node — entity box with header + attribute rows
   ═══════════════════════════════════════════════════════════════ */
function ERNodeSVG({
  node, isFocus, isSelected, onClick, onDoubleClick, onMouseDown,
}: {
  node: ERNode;
  isFocus: boolean;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const { concept, x, y, w, h, expanded } = node;
  const tc = ER_STYLE;
  const attrs = expanded ? deriveAttributes(concept) : [];
  const HEADER_H = 42;
  const borderWidth = isFocus ? 2 : isSelected ? 1.5 : 0.75;
  const borderColor = isFocus ? "#737373" : tc.border;

  return (
    <g
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      style={{ cursor: "grab" }}
    >
      {/* Shadow */}
      <rect x={x + 2} y={y + 2} width={w} height={h} rx={4} fill="rgba(0,0,0,0.06)" />
      {/* Body */}
      <rect x={x} y={y} width={w} height={h} rx={4} fill={tc.bg} stroke={borderColor} strokeWidth={borderWidth} />
      {/* Header */}
      <rect x={x} y={y} width={w} height={HEADER_H} rx={4} fill={tc.headerBg} />
      <rect x={x} y={y + HEADER_H - 4} width={w} height={4} fill={tc.headerBg} />
      <line x1={x} y1={y + HEADER_H} x2={x + w} y2={y + HEADER_H} stroke={tc.border} strokeWidth={0.5} />
      {/* Type badge */}
      <text x={x + 8} y={y + 13} fontSize={8} fill={tc.accent} fontWeight={700} letterSpacing="0.05em">
        {concept.type.toUpperCase()}{concept.subtype ? ` · ${concept.subtype}` : ""}
      </text>
      {/* Name */}
      <text x={x + 8} y={y + 30} fontSize={12} fill={tc.text} fontWeight={600}>
        {concept.name.length > 24 ? concept.name.slice(0, 22) + "…" : concept.name}
      </text>
      {/* Attributes */}
      {attrs.map((attr, i) => (
        <g key={attr.name}>
          {i % 2 === 0 && <rect x={x + 1} y={y + HEADER_H + i * 18} width={w - 2} height={18} fill="rgba(0,0,0,0.02)" />}
          <text x={x + 10} y={y + HEADER_H + 13 + i * 18} fontSize={10} fill={tc.text}>
            {attr.name}
          </text>
          <text x={x + w - 10} y={y + HEADER_H + 13 + i * 18} fontSize={9} fill="#94a3b8" textAnchor="end">
            {attr.type}
          </text>
        </g>
      ))}
      {/* Expand hint for non-focus collapsed nodes */}
      {!expanded && !isFocus && (
        <text x={x + w / 2} y={y + h - 4} textAnchor="middle" fontSize={7} fill="#94a3b8">
          click to expand · double-click to focus
        </text>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Architecture Grid Background
   ═══════════════════════════════════════════════════════════════ */
function GridBackground({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <defs>
        <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth={0.3} />
        </pattern>
        <pattern id="bigGrid" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#smallGrid)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#cbd5e1" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="#f8fafc" />
      <rect width={width} height={height} fill="url(#bigGrid)" />
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Tree Sidebar
   ═══════════════════════════════════════════════════════════════ */
function TreeSidebar({
  tree, selectedId, onSelect,
}: {
  tree: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="h-full overflow-auto" style={{ width: 240, borderRight: `1px solid ${tv.borderSubtle}`, background: tv.bgCard }}>
      <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: tv.textDim, borderBottom: `1px solid ${tv.borderSubtle}` }}>
        Class Hierarchy
      </div>
      {tree.map(root => {
        const isOpen = !collapsed.has(root.id);
        const count = root.children?.length ?? 0;
        return (
          <div key={root.id}>
            <div
              className="flex items-center gap-1 px-3 py-1.5 cursor-pointer"
              style={{ borderBottom: `1px solid ${tv.borderSubtle}` }}
              onClick={() => toggle(root.id)}
            >
              <span style={{ fontSize: 9, color: tv.textDim, width: 12 }}>{isOpen ? "▼" : "▶"}</span>
              <span className="text-[11px] font-semibold" style={{ color: "#525252" }}>{root.label}</span>
              <span className="text-[9px] ml-auto" style={{ color: tv.textDim }}>{count}</span>
            </div>
            {isOpen && root.children?.map(child => {
              const isSel = selectedId === child.id;
              return (
                <div
                  key={child.id}
                  className="flex items-center gap-1.5 pl-7 pr-3 py-1 cursor-pointer transition-colors"
                  style={{
                    background: isSel ? "#f0f0f0" : "transparent",
                    borderLeft: isSel ? `2px solid #525252` : "2px solid transparent",
                  }}
                  onClick={() => onSelect(child.id)}
                >
                  <span className="text-[10px]" style={{ color: isSel ? "#262626" : tv.textSecondary }}>
                    {child.label}
                  </span>
                  {child.subtype && (
                    <span className="text-[8px] ml-auto" style={{ color: tv.textDim }}>{child.subtype}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export function ConceptGraphView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const graphIndex = useCanvasStore((s) => s.graphIndex);

  // Re-derive concept relationships on mount so existing scaffolds pick up
  // improved logic (e.g. Record→Resource via capability businessObject context)
  // without requiring a full pipeline re-run.
  useEffect(() => {
    if (!scaffoldData?.elements) return;
    const discoveryIR = useDiscoverySessionStore.getState().discoveryIR;
    deriveConceptsFromScaffold(scaffoldData, discoveryIR ?? undefined);
    // Trigger re-render by updating scaffoldData reference
    useCanvasStore.setState({ scaffoldData: { ...scaffoldData } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount — not on every scaffoldData change (would infinite-loop)

  const [focusId, setFocusId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Drag state: position overrides keyed by concept id
  const [dragOffsets, setDragOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ nodeId: string; startMouseX: number; startMouseY: number; origDx: number; origDy: number } | null>(null);
  const didDragRef = useRef(false);

  const concepts = useMemo<Record<string, ConceptNode>>(() => {
    if (!scaffoldData?.elements?.concepts) return {};
    const raw = scaffoldData.elements.concepts as Record<string, any>;
    const result: Record<string, ConceptNode> = {};
    for (const [id, c] of Object.entries(raw)) {
      result[id] = { ...c, id: c.id ?? id } as ConceptNode;
    }
    return result;
  }, [scaffoldData]);

  const tree = useMemo(() => buildTree(concepts), [concepts]);

  // Auto-select first concept if none selected
  const effectiveFocusId = focusId ?? Object.keys(concepts)[0] ?? null;

  // Reset drag offsets when focus changes
  const prevFocusRef = useRef<string | null>(null);
  if (effectiveFocusId !== prevFocusRef.current) {
    prevFocusRef.current = effectiveFocusId;
    if (Object.keys(dragOffsets).length > 0) setDragOffsets({});
  }

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!effectiveFocusId) return { nodes: [], edges: [] };
    return layoutER(effectiveFocusId, concepts, expandedIds, graphIndex, scaffoldData?.elements);
  }, [effectiveFocusId, concepts, expandedIds, graphIndex, scaffoldData?.elements]);

  // Apply drag offsets to produce final node positions
  const nodes = useMemo(() => layoutNodes.map(n => {
    const off = dragOffsets[n.concept.id];
    if (!off) return n;
    return { ...n, x: n.x + off.dx, y: n.y + off.dy };
  }), [layoutNodes, dragOffsets]);

  // Recompute edge endpoints from final (dragged) node positions
  const edges = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.concept.id, n]));
    return layoutEdges.map(e => {
      const from = nodeMap.get(e.fromId);
      const to = nodeMap.get(e.toId);
      if (!from || !to) return e;
      return {
        ...e,
        fromX: from.x + from.w / 2,
        fromY: from.y + from.h / 2,
        toX: to.x + to.w / 2,
        toY: to.y + to.h / 2,
      };
    });
  }, [nodes, layoutEdges]);

  // SVG coordinate helper
  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const svgP = pt.matrixTransform(ctm.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  const handleDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = svgPoint(e.clientX, e.clientY);
    const existing = dragOffsets[nodeId] ?? { dx: 0, dy: 0 };
    dragRef.current = { nodeId, startMouseX: pos.x, startMouseY: pos.y, origDx: existing.dx, origDy: existing.dy };
    didDragRef.current = false;
  }, [svgPoint, dragOffsets]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const pos = svgPoint(e.clientX, e.clientY);
    const { nodeId, startMouseX, startMouseY, origDx, origDy } = dragRef.current;
    const dx = origDx + (pos.x - startMouseX);
    const dy = origDy + (pos.y - startMouseY);
    if (Math.abs(pos.x - startMouseX) > 3 || Math.abs(pos.y - startMouseY) > 3) {
      didDragRef.current = true;
    }
    setDragOffsets(prev => ({ ...prev, [nodeId]: { dx, dy } }));
  }, [svgPoint]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleTreeSelect = useCallback((id: string) => {
    setFocusId(id);
    setExpandedIds(new Set());
  }, []);

  const handleNodeClick = useCallback((id: string) => {
    if (didDragRef.current) return; // ignore click after drag
    if (id === effectiveFocusId) return;
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, [effectiveFocusId]);

  const handleNodeDoubleClick = useCallback((id: string) => {
    if (id === effectiveFocusId) return;
    setFocusId(id);
    setExpandedIds(new Set());
  }, [effectiveFocusId]);

  const stats = useMemo(() => {
    let parties = 0, records = 0, resources = 0;
    for (const c of Object.values(concepts)) {
      if (c.type === "Party") parties++;
      else if (c.type === "Record") records++;
      else resources++;
    }
    return { parties, records, resources, total: parties + records + resources };
  }, [concepts]);

  if (!scaffoldData) return null;

  const SVG_W = 1000, SVG_H = 700;
  const focusConcept = effectiveFocusId ? concepts[effectiveFocusId] : null;

  return (
    <div className="h-full flex" style={{ background: tv.bgPrimary, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Tree Sidebar */}
      <TreeSidebar tree={tree} selectedId={effectiveFocusId} onSelect={handleTreeSelect} />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 flex items-center gap-4" style={{ borderBottom: `1px solid ${tv.borderSubtle}` }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tv.textDim }}>
              Concept Model
            </div>
            <div className="text-sm font-semibold" style={{ color: tv.textPrimary }}>
              {focusConcept?.name ?? "Select a concept"}
              {focusConcept && (
                <span className="ml-2 text-[9px] font-normal px-1.5 py-0.5 rounded" style={{
                  background: ER_STYLE.headerBg,
                  color: ER_STYLE.accent,
                }}>
                  {focusConcept.type}
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3 text-[9px]" style={{ color: tv.textDim }}>
            <span>{stats.parties} parties</span>
            <span>{stats.records} records</span>
            <span>{stats.resources} resources</span>
          </div>
        </div>

        {/* ER Diagram */}
        <div className="flex-1 overflow-auto">
          <svg
            ref={svgRef}
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ display: "block", minWidth: SVG_W, cursor: dragRef.current ? "grabbing" : "default" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <GridBackground width={SVG_W} height={SVG_H} />

            {/* Edges first (under nodes) */}
            {edges.map((e, i) => <EREdgeSVG key={i} edge={e} />)}

            {/* Nodes */}
            {nodes.map(n => (
              <ERNodeSVG
                key={n.concept.id}
                node={n}
                isFocus={n.concept.id === effectiveFocusId}
                isSelected={expandedIds.has(n.concept.id)}
                onClick={() => handleNodeClick(n.concept.id)}
                onDoubleClick={() => handleNodeDoubleClick(n.concept.id)}
                onMouseDown={(e) => handleDragStart(n.concept.id, e)}
              />
            ))}
          </svg>
        </div>

        {/* Definition panel */}
        {focusConcept && (
          <div className="px-4 py-2" style={{ borderTop: `1px solid ${tv.borderSubtle}`, background: tv.bgCard }}>
            <div className="text-[11px] leading-relaxed" style={{ color: tv.textSecondary }}>
              {focusConcept.definition ?? "No definition available."}
            </div>
            {focusConcept.lifecycleStates && focusConcept.lifecycleStates.length > 0 && (
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[9px] font-bold uppercase" style={{ color: tv.textDim }}>Lifecycle:</span>
                {focusConcept.lifecycleStates.map((s: any, i: number) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: tv.bgSurface, color: tv.textSecondary }}>
                    {typeof s === "string" ? s : s.name ?? s.label ?? "State"}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
