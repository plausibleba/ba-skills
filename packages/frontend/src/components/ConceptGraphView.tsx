// @ts-nocheck
import { useState, useMemo, useRef, useCallback } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { ConceptRelationship } from "../types/cards.ts";

/* ── Colour palette ───────────────────────────────────────── */
const COLORS = {
  party:       "#2dd4bf",
  partyDim:    "rgba(45,212,191,0.12)",
  partyBorder: "rgba(45,212,191,0.5)",
  resource:       "#4a9eda",
  resourceDim:    "rgba(74,158,218,0.12)",
  resourceBorder: "rgba(74,158,218,0.5)",
  record:       "#e05b8a",
  recordDim:    "rgba(224,91,138,0.12)",
  recordBorder: "rgba(224,91,138,0.5)",
  border: "#2e3f5c",
  textDim: "#94a3b8",
  textMed: "#cbd5e1",
};

function colFor(type: string) {
  if (type === "Party")    return { fill: COLORS.partyDim, stroke: COLORS.partyBorder, text: "#e0fdf9", accent: COLORS.party };
  if (type === "Resource") return { fill: COLORS.resourceDim, stroke: COLORS.resourceBorder, text: "#e0f2fe", accent: COLORS.resource };
  return                          { fill: COLORS.recordDim, stroke: COLORS.recordBorder, text: "#fce7f3", accent: COLORS.record };
}

/* ── Inline SVG Icon paths (from jalapeno icons, 24×24 viewBox) ── */

/** role.svg — person in badge frame (Party) */
function PartyIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`} fill={color}>
      <path d="M12,10c-1.654,0-3,1.346-3,3c0,1.654,1.346,3,3,3c1.654,0,3-1.346,3-3C15,11.346,13.654,10,12,10z M12,14 c-0.552,0-1-0.448-1-1c0-0.551,0.448-1,1-1s1,0.449,1,1C13,13.552,12.552,14,12,14z" />
      <path d="M21,5h-6V3c0-0.552-0.447-1-1-1h-4C9.448,2,9,2.448,9,3v2H3C2.448,5,2,5.448,2,6v16c0,0.553,0.448,1,1,1h18 c0.553,0,1-0.447,1-1V6C22,5.448,21.553,5,21,5z M11,4h2v3h-2V4z M15,21H9v-1c0-0.561,0.438-1,0.998-1h4.004 C14.562,19,15,19.439,15,20V21z M20,21h-3v-1c0-1.654-1.346-3-2.998-3H9.998C8.345,17,7,18.346,7,20v1H4V7h5v1c0,0.552,0.448,1,1,1 h4c0.553,0,1-0.448,1-1V7h5V21z" />
    </g>
  );
}

/** product.svg — box with wrench (Resource) */
function ResourceIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`} fill={color}>
      <path d="M22,1H2C1.448,1,1,1.449,1,2.002v4.009c0,0.553,0.448,1.002,1,1.002h1v13.03c0,0.554,0.448,1.002,1,1.002h3.736 c0.552,0,1-0.448,1-1.002s-0.448-1.002-1-1.002H5V7.014h14v0.992c0,0.553,0.447,1.002,1,1.002s1-0.449,1-1.002V7.014h1 c0.553,0,1-0.449,1-1.002V2.002C23,1.449,22.553,1,22,1z M21,5.009h-1H4H3V3.004h18V5.009z" />
      <path d="M17.057,10.765c-0.257-0.25-0.623-0.346-0.968-0.25l-3.332,0.92l-2.061-2.003C10.3,9.045,9.668,9.056,9.282,9.453 C8.897,9.85,8.907,10.484,9.304,10.87l2.048,1.991l-0.912,3.312c-0.097,0.352,0.004,0.728,0.263,0.981l5.646,5.558 C16.544,22.904,16.797,23,17.05,23c0.257,0,0.513-0.098,0.707-0.294l4.949-4.96c0.188-0.188,0.294-0.444,0.293-0.714 c-0.001-0.268-0.108-0.521-0.299-0.711L17.057,10.765z M17.044,20.586l-4.521-4.447l0.466-1.687l1.336,1.299 c0.194,0.189,0.446,0.284,0.696,0.284c0.261,0,0.521-0.103,0.718-0.306c0.385-0.396,0.375-1.031-0.021-1.417l-1.295-1.26 l1.642-0.454l4.516,4.445L17.044,20.586z" />
    </g>
  );
}

/** result.svg — document with checkmarks (Record) */
function RecordIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`} fill={color}>
      <polygon points="18,5.274 13.078,10.387 13.076,10.387 13.076,10.387 10,7.192 11.23,5.913 13.076,7.831 16.77,3.996" />
      <polygon points="18,12.264 13.078,17.378 13.076,17.377 13.076,17.378 10,14.184 11.23,12.902 13.076,14.82 16.77,10.986" />
      <path d="M21,21.973H7c-0.552,0-1-0.447-1-1V1c0-0.552,0.448-1,1-1h14c0.553,0,1,0.448,1,1v19.973 C22,21.525,21.553,21.973,21,21.973z M8,19.973h12V2H8V19.973z" />
      <path d="M4,22c-0.552,0-1-0.447-1-1V1c0-0.552,0.448-1,1-1s1,0.448,1,1v20C5,21.553,4.552,22,4,22z" />
    </g>
  );
}

function TypeIcon({ type, x, y, size, color }: { type: string; x: number; y: number; size: number; color: string }) {
  if (type === "Party") return <PartyIcon x={x} y={y} size={size} color={color} />;
  if (type === "Resource") return <ResourceIcon x={x} y={y} size={size} color={color} />;
  return <RecordIcon x={x} y={y} size={size} color={color} />;
}

/* ── Syllable-aware word wrapping ─────────────────────────── */

const VOWELS = new Set("aeiouyAEIOUY".split(""));

/** Split a single word at roughly syllable boundaries */
function syllableSplit(word: string): string[] {
  if (word.length <= 8) return [word];
  // Find reasonable break points: between consonant+vowel boundaries
  const breakPoints: number[] = [];
  for (let i = 2; i < word.length - 2; i++) {
    const prev = VOWELS.has(word[i - 1]);
    const curr = VOWELS.has(word[i]);
    // Break before a consonant followed by a vowel (common syllable boundary)
    if (prev && !curr) {
      breakPoints.push(i);
    }
  }
  if (breakPoints.length === 0) {
    // Fallback: split in half
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid) + "-", word.slice(mid)];
  }
  // Pick the break point closest to the middle
  const mid = word.length / 2;
  const best = breakPoints.reduce((a, b) => Math.abs(a - mid) < Math.abs(b - mid) ? a : b);
  return [word.slice(0, best) + "-", word.slice(best)];
}

/** Wrap text into lines that fit within maxChars, using syllable breaks for long words */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      // Flush current line
      if (current) { lines.push(current.trim()); current = ""; }
      // Syllable-split the long word
      const parts = syllableSplit(word);
      for (const part of parts) {
        if (current && (current + " " + part).length > maxChars) {
          lines.push(current.trim());
          current = part;
        } else {
          current = current ? current + " " + part : part;
        }
      }
    } else if (current && (current + " " + word).length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines.length > 0 ? lines : [text];
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

interface ConceptEdge {
  from: string;
  to: string;
  label: string;
  type: ConceptRelationship["type"];
}

interface ConceptAttribute {
  name: string;
  dataType: string;
}

interface EnrichedProperties {
  relationships: ConceptEdge[];
  attributes: Record<string, ConceptAttribute[]>; // conceptId → attributes
}

/* ── Node dimensions ──────────────────────────────────────── */
const NODE_W = 130;
const NODE_H = 44;
const ICON_SIZE = 14;

/* ── Layout: position concepts in 3 columns by type ───────── */
function layoutConcepts(concepts: Record<string, any>): ConceptNode[] {
  const all = Object.values(concepts) as any[];

  const parties   = all.filter((c) => c.type === "Party");
  const resources = all.filter((c) => c.type === "Resource");
  const records   = all.filter((c) => c.type === "Record");

  const colX = { Party: 110, Resource: 340, Record: 570 };
  const yStart = 60;
  const yGap = 64;

  const positionCol = (items: any[], type: string): ConceptNode[] =>
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

  return [
    ...positionCol(parties, "Party"),
    ...positionCol(resources, "Resource"),
    ...positionCol(records, "Record"),
  ];
}

/* ── Heuristic enrichment — suggests relationships & attributes ── */

const RELATIONSHIP_TYPES: ConceptRelationship["type"][] = [
  "has-a", "is-a", "part-of", "consumes", "produces", "governs", "relates-to",
];

function suggestEnrichment(nodes: ConceptNode[]): EnrichedProperties {
  const relationships: ConceptEdge[] = [];
  const attributes: Record<string, ConceptAttribute[]> = {};

  // Build name map for cross-referencing
  const nameMap = new Map(nodes.map(n => [n.name.toLowerCase(), n]));

  for (const node of nodes) {
    const nameLower = node.name.toLowerCase();

    // ── Suggest relationships ──
    for (const other of nodes) {
      if (node.id === other.id) continue;
      const otherLower = other.name.toLowerCase();

      // Pattern: Party "manages" / "governs" Records
      if (node.type === "Party" && other.type === "Record") {
        if (otherLower.includes(nameLower) || nameLower.includes(otherLower.split(" ")[0])) {
          relationships.push({ from: node.id, to: other.id, label: `manages ${other.name}`, type: "governs" });
        }
      }
      // Pattern: Party "uses" Resources
      if (node.type === "Party" && other.type === "Resource") {
        if (otherLower.includes(nameLower) || nameLower.includes(otherLower.split(" ")[0])) {
          relationships.push({ from: node.id, to: other.id, label: `uses ${other.name}`, type: "consumes" });
        }
      }
      // Pattern: Record "relates-to" Resource if name overlap
      if (node.type === "Record" && other.type === "Resource") {
        const nodeWords = new Set(nameLower.split(/\s+/));
        const otherWords = new Set(otherLower.split(/\s+/));
        const shared = [...nodeWords].filter(w => otherWords.has(w) && w.length > 3);
        if (shared.length > 0) {
          relationships.push({ from: node.id, to: other.id, label: `references ${other.name}`, type: "relates-to" });
        }
      }
      // Pattern: Resource "produces" Record if name overlap
      if (node.type === "Resource" && other.type === "Record") {
        const nodeWords = new Set(nameLower.split(/\s+/));
        const otherWords = new Set(otherLower.split(/\s+/));
        const shared = [...nodeWords].filter(w => otherWords.has(w) && w.length > 3);
        if (shared.length > 0) {
          relationships.push({ from: node.id, to: other.id, label: `produces ${other.name}`, type: "produces" });
        }
      }
    }

    // ── Suggest attributes based on concept type ──
    const attrs: ConceptAttribute[] = [];
    if (node.type === "Party") {
      attrs.push(
        { name: "name", dataType: "string" },
        { name: "identifier", dataType: "string" },
        { name: "status", dataType: "enum" },
        { name: "contactInfo", dataType: "string" },
      );
    } else if (node.type === "Resource") {
      attrs.push(
        { name: "name", dataType: "string" },
        { name: "identifier", dataType: "string" },
        { name: "status", dataType: "enum" },
        { name: "description", dataType: "text" },
        { name: "category", dataType: "string" },
      );
    } else {
      // Record
      attrs.push(
        { name: "recordId", dataType: "string" },
        { name: "createdDate", dataType: "datetime" },
        { name: "status", dataType: "enum" },
        { name: "lastModified", dataType: "datetime" },
        { name: "createdBy", dataType: "reference" },
      );
    }
    attributes[node.id] = attrs;
  }

  // Deduplicate relationships
  const seen = new Set<string>();
  const deduped = relationships.filter(r => {
    const key = `${r.from}→${r.to}:${r.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { relationships: deduped, attributes };
}

/* ── Relationship type colours & styles ───────────────────── */
const REL_COLORS: Record<string, string> = {
  "has-a":      "#4a9eda",
  "is-a":       "#a78bfa",
  "part-of":    "#f59e0b",
  "consumes":   "#2dd4bf",
  "produces":   "#4ade80",
  "governs":    "#e05b8a",
  "relates-to": "#94a3b8",
};

/* ── Component ────────────────────────────────────────────── */
export function ConceptGraphView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<EnrichedProperties | null>(null);
  const [showRelLabels, setShowRelLabels] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes = useMemo(() => {
    if (!scaffoldData?.elements?.concepts) return [];
    return layoutConcepts(scaffoldData.elements.concepts as Record<string, any>);
  }, [scaffoldData]);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const parties = nodes.filter((n) => n.type === "Party").length;
    const resources = nodes.filter((n) => n.type === "Resource").length;
    const records = nodes.filter((n) => n.type === "Record").length;
    return { parties, resources, records, total: nodes.length };
  }, [nodes]);

  const handleEnrich = useCallback(() => {
    const result = suggestEnrichment(nodes);
    setEnriched(result);
  }, [nodes]);

  const handleClearEnrichment = useCallback(() => {
    setEnriched(null);
  }, []);

  // Edges from enrichment
  const edges = enriched?.relationships ?? [];

  // Calculate viewBox dynamically
  const maxY = Math.max(...nodes.map((n) => n.y), 200) + NODE_H;
  const viewBoxWidth = 700;
  const viewBoxHeight = Math.max(maxY + 20, 300);

  // Node lookup
  const nodeById = useMemo(() => {
    const m = new Map<string, ConceptNode>();
    nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [nodes]);

  if (!scaffoldData) return null;

  return (
    <div
      className="h-full overflow-auto"
      style={{
        background: "#1a2236",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div className="mx-auto max-w-[1100px] p-5">
        {/* Header */}
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
            Concept Model
          </div>
          <div className="mb-1 text-lg font-bold text-white">
            {scaffoldData.name} — Business Object Taxonomy
          </div>
          <div className="text-[11px]" style={{ color: "#94a3b8" }}>
            Capsicum Triad classification · {stats.parties} parties · {stats.resources} resources · {stats.records} records
          </div>
        </div>

        {/* Legend + Enrichment Controls */}
        <div className="mb-3 flex flex-wrap items-center gap-4">
          {/* Type legend */}
          {([
            { type: "Party", icon: "party", color: COLORS.party },
            { type: "Resource", icon: "resource", color: COLORS.resource },
            { type: "Record", icon: "record", color: COLORS.record },
          ] as const).map(({ type, color }) => (
            <div key={type} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#94a3b8" }}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
              {type}
            </div>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {enriched && (
              <>
                <button
                  onClick={() => setShowRelLabels(!showRelLabels)}
                  className="rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                  style={{
                    background: showRelLabels ? "rgba(74,158,218,0.15)" : "transparent",
                    color: showRelLabels ? "#4a9eda" : "#94a3b8",
                    border: "1px solid #2e3f5c",
                  }}
                >
                  Labels
                </button>
                <button
                  onClick={handleClearEnrichment}
                  className="rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                  style={{ color: "#94a3b8", border: "1px solid #2e3f5c" }}
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={handleEnrich}
              className="rounded px-3 py-1 text-[11px] font-semibold transition-colors"
              style={{
                background: enriched ? "rgba(45,212,191,0.15)" : "rgba(74,158,218,0.15)",
                color: enriched ? "#2dd4bf" : "#4a9eda",
                border: `1px solid ${enriched ? "rgba(45,212,191,0.3)" : "rgba(74,158,218,0.3)"}`,
              }}
            >
              {enriched ? "✓ Enriched" : "⚡ Enrich Properties"}
            </button>
          </div>
        </div>

        {/* Relationship legend (when enriched) */}
        {enriched && edges.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "#94a3b8" }}>
              Edge types:
            </span>
            {[...new Set(edges.map(e => e.type))].map(t => (
              <div key={t} className="flex items-center gap-1 text-[9px]" style={{ color: REL_COLORS[t] ?? "#94a3b8" }}>
                <svg width={16} height={6}><line x1={0} y1={3} x2={16} y2={3} stroke={REL_COLORS[t] ?? "#94a3b8"} strokeWidth={1.5} /></svg>
                {t}
              </div>
            ))}
          </div>
        )}

        {/* SVG Graph */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full rounded-lg"
          style={{ background: "#243352", border: "1px solid #2e3f5c" }}
        >
          {/* Arrow marker defs */}
          <defs>
            {RELATIONSHIP_TYPES.map(t => (
              <marker
                key={t}
                id={`arrow-${t}`}
                viewBox="0 0 10 7"
                refX={10}
                refY={3.5}
                markerWidth={8}
                markerHeight={6}
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 3.5 L0 7 Z" fill={REL_COLORS[t] ?? "#94a3b8"} />
              </marker>
            ))}
          </defs>

          {/* Column labels */}
          {([
            { type: "Party", x: 110 },
            { type: "Resource", x: 340 },
            { type: "Record", x: 570 },
          ] as const).map(({ type, x }) => (
            <text
              key={type}
              x={x}
              y={28}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={colFor(type).accent}
              fontFamily="DM Sans, sans-serif"
              letterSpacing={1}
            >
              {type.toUpperCase()}
            </text>
          ))}

          {/* Directed edges */}
          {edges.map((e, i) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;

            // Compute edge start/end at box boundaries
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return null;

            // Offset from center to box edge
            const hw = NODE_W / 2 + 2;
            const hh = NODE_H / 2 + 2;
            const angleToB = Math.atan2(dy, dx);
            const x1 = a.x + hw * Math.cos(angleToB);
            const y1 = a.y + hh * Math.sin(angleToB);
            const x2 = b.x - hw * Math.cos(angleToB);
            const y2 = b.y - hh * Math.sin(angleToB);

            const color = REL_COLORS[e.type] ?? "#94a3b8";
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            // Curved path for better readability
            const cx = midX + (y2 - y1) * 0.15;
            const cy = midY - (x2 - x1) * 0.15;

            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                  stroke={color}
                  strokeWidth={1.2}
                  fill="none"
                  opacity={0.7}
                  markerEnd={`url(#arrow-${e.type})`}
                />
                {showRelLabels && (
                  <text
                    x={cx}
                    y={cy - 4}
                    textAnchor="middle"
                    fontSize={7}
                    fill={color}
                    opacity={0.8}
                    fontFamily="DM Sans, sans-serif"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes — all boxes */}
          {nodes.map((node) => {
            const col = colFor(node.type);
            const isSelected = selectedId === node.id;
            const lines = wrapText(node.name, 14);
            const lineCount = lines.length;

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(node.id)}
              >
                {/* Box */}
                <rect
                  x={node.x - NODE_W / 2}
                  y={node.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill={col.fill}
                  stroke={isSelected ? col.accent : col.stroke}
                  strokeWidth={isSelected ? 2.5 : 1}
                />
                {/* Icon (left side of box) */}
                <TypeIcon
                  type={node.type}
                  x={node.x - NODE_W / 2 + 16}
                  y={node.y}
                  size={ICON_SIZE}
                  color={col.accent}
                />
                {/* Text (right of icon) */}
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={node.x + 6}
                    y={node.y + (li - (lineCount - 1) / 2) * 13 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
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
            border: `1.5px solid ${selected ? colFor(selected.type).accent : "#4a9eda"}`,
            minHeight: 72,
          }}
        >
          {selected ? (
            <div className="flex gap-6">
              {/* Left: basic info */}
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <div className="text-[15px] font-bold text-white">{selected.name}</div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={{ background: colFor(selected.type).fill, color: colFor(selected.type).accent, border: `1px solid ${colFor(selected.type).stroke}` }}
                  >
                    {selected.type}
                  </span>
                </div>

                {(selected.definition || selected.description) && (
                  <div className="mb-2 text-[12px] leading-relaxed" style={{ color: "#cbd5e1" }}>
                    {selected.definition || selected.description}
                  </div>
                )}

                {selected.lifecycleStates && selected.lifecycleStates.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                      Lifecycle
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selected.lifecycleStates.map((s: string, i: number) => (
                        <span key={i} className="flex items-center gap-1">
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ background: "rgba(74,158,218,0.1)", color: "#4a9eda", border: "1px solid rgba(74,158,218,0.2)" }}
                          >
                            {s}
                          </span>
                          {i < selected.lifecycleStates!.length - 1 && (
                            <span className="text-[10px]" style={{ color: "#2e3f5c" }}>→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relationships for this concept */}
                {enriched && (() => {
                  const rels = edges.filter(e => e.from === selected.id || e.to === selected.id);
                  if (rels.length === 0) return null;
                  return (
                    <div className="mb-2">
                      <div className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                        Relationships
                      </div>
                      <div className="space-y-0.5">
                        {rels.map((r, i) => {
                          const isSource = r.from === selected.id;
                          const otherId = isSource ? r.to : r.from;
                          const otherNode = nodeById.get(otherId);
                          return (
                            <div key={i} className="flex items-center gap-1 text-[10px]">
                              <span
                                className="rounded px-1 py-0.5 text-[8px] font-bold uppercase"
                                style={{ color: REL_COLORS[r.type] ?? "#94a3b8", background: "rgba(255,255,255,0.05)" }}
                              >
                                {r.type}
                              </span>
                              <span style={{ color: "#94a3b8" }}>{isSource ? "→" : "←"}</span>
                              <span
                                style={{ color: otherNode ? colFor(otherNode.type).accent : "#cbd5e1", cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); if (otherNode) setSelectedId(otherNode.id); }}
                              >
                                {otherNode?.name ?? otherId}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right: Attributes (when enriched) */}
              {enriched && enriched.attributes[selected.id] && (
                <div className="w-[220px] flex-shrink-0 rounded-md p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2e3f5c" }}>
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                    Attributes
                  </div>
                  <div className="space-y-1">
                    {enriched.attributes[selected.id].map((attr, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span style={{ color: "#cbd5e1" }}>{attr.name}</span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px]"
                          style={{
                            background: "rgba(74,158,218,0.1)",
                            color: "#4a9eda",
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          {attr.dataType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: "#94a3b8" }}>
              Select a concept node to inspect its definition, lifecycle, and properties.
              {!enriched && " Click \"Enrich Properties\" to suggest relationships and attributes."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
