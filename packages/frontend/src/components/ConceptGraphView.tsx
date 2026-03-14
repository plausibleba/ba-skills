import { useState, useMemo, useRef } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";

/* ── Colour palette ───────────────────────────────────────── */
const COLORS = {
  party:       "#2dd4bf",
  partyDim:    "rgba(45,212,191,0.15)",
  partyBorder: "rgba(45,212,191,0.6)",
  partyText:   "#e0fdf9",
  resource:       "#4a9eda",
  resourceDim:    "rgba(74,158,218,0.15)",
  resourceBorder: "rgba(74,158,218,0.6)",
  resourceText:   "#e0f2fe",
  record:       "#e05b8a",
  recordDim:    "rgba(224,91,138,0.15)",
  recordBorder: "rgba(224,91,138,0.6)",
  recordText:   "#fce7f3",
  border: "#2e3f5c",
  textDim: "#94a3b8",
  textMed: "#cbd5e1",
};

function colFor(type: string) {
  if (type === "Party")    return { fill: COLORS.partyDim, stroke: COLORS.partyBorder, text: COLORS.partyText, accent: COLORS.party };
  if (type === "Resource") return { fill: COLORS.resourceDim, stroke: COLORS.resourceBorder, text: COLORS.resourceText, accent: COLORS.resource };
  return                          { fill: COLORS.recordDim, stroke: COLORS.recordBorder, text: COLORS.recordText, accent: COLORS.record };
}

/* ── Types ─────────────────────────────────────────────────── */
interface ConceptNode {
  id: string;
  name: string;
  type: string; // Party | Record | Resource
  definition?: string;
  description?: string;
  lifecycleStates?: string[];
  relatedCapabilityIds?: string[];
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
}

/* ── Layout: position concepts in 3 columns by type ───────── */
function layoutConcepts(concepts: Record<string, any>): { nodes: ConceptNode[]; edges: Edge[] } {
  const all = Object.values(concepts) as any[];

  const parties   = all.filter((c) => c.type === "Party");
  const resources = all.filter((c) => c.type === "Resource");
  const records   = all.filter((c) => c.type === "Record");

  const colX = { Party: 90, Resource: 290, Record: 520 };
  const yStart = 60;
  const yGap = 95;

  const positionCol = (items: any[], type: string) =>
    items.map((c, i) => ({
      id: c.id,
      name: c.name,
      type: c.type ?? type,
      definition: c.definition ?? c.description,
      description: c.description,
      lifecycleStates: c.lifecycleStates,
      relatedCapabilityIds: c.relatedCapabilityIds,
      x: colX[type as keyof typeof colX],
      y: yStart + i * yGap,
    }));

  const nodes = [
    ...positionCol(parties, "Party"),
    ...positionCol(resources, "Resource"),
    ...positionCol(records, "Record"),
  ];

  // Derive edges from shared names or conceptId back-references
  // Simple heuristic: connect concepts whose names appear in each other's related capability lists
  // or that share a naming relationship (e.g. "Guest" party → "Guest Review" record)
  const edges: Edge[] = [];

  // Build edges from name proximity: if a concept name appears at the start of another
  for (const a of nodes) {
    for (const b of nodes) {
      if (a.id === b.id) continue;
      if (a.type === b.type) continue; // no intra-column edges
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      // "Guest" → "Guest Review", "Property" → "Property" (info object)
      if (bName.startsWith(aName) || aName.startsWith(bName)) {
        // Avoid duplicates
        if (!edges.some((e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id))) {
          edges.push({ from: a.id, to: b.id });
        }
      }
    }
  }

  return { nodes, edges };
}

/* ── Component ────────────────────────────────────────────── */
export function ConceptGraphView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, edges } = useMemo(() => {
    if (!scaffoldData?.elements?.concepts) return { nodes: [], edges: [] };
    return layoutConcepts(scaffoldData.elements.concepts as Record<string, any>);
  }, [scaffoldData]);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const parties = nodes.filter((n) => n.type === "Party").length;
    const resources = nodes.filter((n) => n.type === "Resource").length;
    const records = nodes.filter((n) => n.type === "Record").length;
    return { parties, resources, records, total: nodes.length };
  }, [nodes]);

  // Calculate viewBox height dynamically
  const maxY = Math.max(...nodes.map((n) => n.y), 200) + 50;
  const viewBoxWidth = 680;
  const viewBoxHeight = Math.max(maxY, 300);

  if (!scaffoldData) return null;

  return (
    <div
      className="h-full overflow-auto"
      style={{
        background: "#1a2236",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div className="mx-auto max-w-[1000px] p-5">
        {/* Header */}
        <div className="mb-4">
          <div
            className="mb-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "#94a3b8" }}
          >
            Concept Model
          </div>
          <div className="mb-1 text-lg font-bold text-white">
            {scaffoldData.name} — Business Object Taxonomy
          </div>
          <div className="text-[11px]" style={{ color: "#94a3b8" }}>
            Capsicum Triad classification · {stats.parties} parties · {stats.resources} resources · {stats.records} records
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#94a3b8" }}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS.party }} />
            Party
          </div>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#94a3b8" }}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS.resource }} />
            Resource
          </div>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#94a3b8" }}>
            <span className="inline-block h-3 w-3.5 rounded-sm" style={{ background: COLORS.record }} />
            Record
          </div>
          <div className="ml-1 text-[9px]" style={{ color: "#94a3b8" }}>
            Click any node for details
          </div>
        </div>

        {/* SVG Graph */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full rounded-lg"
          style={{
            background: "#243352",
            border: "1px solid #2e3f5c",
          }}
        >
          {/* Column labels */}
          {[
            { type: "Party", x: 90 },
            { type: "Resource", x: 290 },
            { type: "Record", x: 520 },
          ].map(({ type, x }) => (
            <text
              key={type}
              x={x}
              y={22}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              fill={colFor(type).accent}
              fontFamily="DM Sans, sans-serif"
              letterSpacing={0.5}
            >
              {type.toUpperCase()}
            </text>
          ))}

          {/* Edges */}
          {edges.map((e, i) => {
            const a = nodes.find((n) => n.id === e.from);
            const b = nodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="rgba(46,63,92,0.8)"
                strokeWidth={1}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const col = colFor(node.type);
            const isSelected = selectedId === node.id;
            const lines = node.name.length > 14
              ? [node.name.slice(0, Math.ceil(node.name.length / 2)), node.name.slice(Math.ceil(node.name.length / 2))]
              : [node.name];

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(node.id)}
              >
                {node.type === "Record" ? (
                  <rect
                    x={node.x - 38}
                    y={node.y - 19}
                    width={76}
                    height={38}
                    rx={4}
                    fill={col.fill}
                    stroke={col.stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                ) : (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={30}
                    fill={col.fill}
                    stroke={col.stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                )}
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={node.x}
                    y={node.y + (li - (lines.length - 1) / 2) * 12 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={8.5}
                    fontWeight={600}
                    fill={col.text}
                    fontFamily="DM Sans, sans-serif"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>

        {/* Inspector panel */}
        <div
          className="mt-3 rounded-lg p-4"
          style={{
            background: "#243352",
            border: "1.5px solid #4a9eda",
            minHeight: 72,
          }}
        >
          {selected ? (
            <>
              <div className="mb-1 text-[15px] font-bold text-white">
                {selected.name}
              </div>
              <div
                className="mb-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: colFor(selected.type).accent }}
              >
                {selected.type}
              </div>
              {(selected.definition || selected.description) && (
                <div
                  className="mb-1.5 text-[12px] leading-relaxed"
                  style={{ color: "#cbd5e1" }}
                >
                  {selected.definition || selected.description}
                </div>
              )}
              {selected.lifecycleStates && selected.lifecycleStates.length > 0 && (
                <div
                  className="text-[10px]"
                  style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}
                >
                  Lifecycle: {selected.lifecycleStates.join(" → ")}
                </div>
              )}
              {selected.relatedCapabilityIds && selected.relatedCapabilityIds.length > 0 && (
                <div className="mt-2 text-[10px]" style={{ color: "#94a3b8" }}>
                  Related capabilities: {selected.relatedCapabilityIds.length}
                </div>
              )}
            </>
          ) : (
            <p className="text-[12px]" style={{ color: "#94a3b8" }}>
              Select a concept node to see its definition and lifecycle states.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
