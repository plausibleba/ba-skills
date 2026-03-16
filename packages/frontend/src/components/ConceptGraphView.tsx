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

function PartyIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`} fill={color}>
      <path d="M12,10c-1.654,0-3,1.346-3,3c0,1.654,1.346,3,3,3c1.654,0,3-1.346,3-3C15,11.346,13.654,10,12,10z M12,14 c-0.552,0-1-0.448-1-1c0-0.551,0.448-1,1-1s1,0.449,1,1C13,13.552,12.552,14,12,14z" />
      <path d="M21,5h-6V3c0-0.552-0.447-1-1-1h-4C9.448,2,9,2.448,9,3v2H3C2.448,5,2,5.448,2,6v16c0,0.553,0.448,1,1,1h18 c0.553,0,1-0.447,1-1V6C22,5.448,21.553,5,21,5z M11,4h2v3h-2V4z M15,21H9v-1c0-0.561,0.438-1,0.998-1h4.004 C14.562,19,15,19.439,15,20V21z M20,21h-3v-1c0-1.654-1.346-3-2.998-3H9.998C8.345,17,7,18.346,7,20v1H4V7h5v1c0,0.552,0.448,1,1,1 h4c0.553,0,1-0.448,1-1V7h5V21z" />
    </g>
  );
}

function ResourceIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`} fill={color}>
      <path d="M22,1H2C1.448,1,1,1.449,1,2.002v4.009c0,0.553,0.448,1.002,1,1.002h1v13.03c0,0.554,0.448,1.002,1,1.002h3.736 c0.552,0,1-0.448,1-1.002s-0.448-1.002-1-1.002H5V7.014h14v0.992c0,0.553,0.447,1.002,1,1.002s1-0.449,1-1.002V7.014h1 c0.553,0,1-0.449,1-1.002V2.002C23,1.449,22.553,1,22,1z M21,5.009h-1H4H3V3.004h18V5.009z" />
      <path d="M17.057,10.765c-0.257-0.25-0.623-0.346-0.968-0.25l-3.332,0.92l-2.061-2.003C10.3,9.045,9.668,9.056,9.282,9.453 C8.897,9.85,8.907,10.484,9.304,10.87l2.048,1.991l-0.912,3.312c-0.097,0.352,0.004,0.728,0.263,0.981l5.646,5.558 C16.544,22.904,16.797,23,17.05,23c0.257,0,0.513-0.098,0.707-0.294l4.949-4.96c0.188-0.188,0.294-0.444,0.293-0.714 c-0.001-0.268-0.108-0.521-0.299-0.711L17.057,10.765z M17.044,20.586l-4.521-4.447l0.466-1.687l1.336,1.299 c0.194,0.189,0.446,0.284,0.696,0.284c0.261,0,0.521-0.103,0.718-0.306c0.385-0.396,0.375-1.031-0.021-1.417l-1.295-1.26 l1.642-0.454l4.516,4.445L17.044,20.586z" />
    </g>
  );
}

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

function syllableSplit(word: string): string[] {
  if (word.length <= 8) return [word];
  const breakPoints: number[] = [];
  for (let i = 2; i < word.length - 2; i++) {
    const prev = VOWELS.has(word[i - 1]);
    const curr = VOWELS.has(word[i]);
    if (prev && !curr) breakPoints.push(i);
  }
  if (breakPoints.length === 0) {
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid) + "-", word.slice(mid)];
  }
  const mid = word.length / 2;
  const best = breakPoints.reduce((a, b) => Math.abs(a - mid) < Math.abs(b - mid) ? a : b);
  return [word.slice(0, best) + "-", word.slice(best)];
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > maxChars) {
      if (current) { lines.push(current.trim()); current = ""; }
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
  type: string;
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
  attributes: Record<string, ConceptAttribute[]>;
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

/* ── Enrichment — aggressively infer relationships & attributes ── */

/**
 * Semantic affinity: score how likely two concepts are related
 * based on their names and definitions, not just exact name matches.
 */
function semanticAffinity(a: ConceptNode, b: ConceptNode): number {
  const aWords = new Set([
    ...a.name.toLowerCase().split(/\s+/),
    ...(a.definition ?? "").toLowerCase().split(/\s+/).filter(w => w.length > 3),
  ]);
  const bWords = new Set([
    ...b.name.toLowerCase().split(/\s+/),
    ...(b.definition ?? "").toLowerCase().split(/\s+/).filter(w => w.length > 3),
  ]);
  const aName = a.name.toLowerCase();
  const bName = b.name.toLowerCase();

  let score = 0;

  // Direct name containment (strongest signal)
  if (bName.includes(aName) || aName.includes(bName)) score += 5;

  // Word overlap between names and definitions
  const shared = [...aWords].filter(w => bWords.has(w));
  score += shared.length;

  return score;
}

/** Pick the best relationship verb for a cross-type pair */
function inferRelVerb(from: ConceptNode, to: ConceptNode): { label: string; type: ConceptRelationship["type"] } {
  const ft = from.type;
  const tt = to.type;

  if (ft === "Party" && tt === "Resource")
    return { label: `uses`, type: "consumes" };
  if (ft === "Party" && tt === "Record")
    return { label: `creates`, type: "produces" };
  if (ft === "Resource" && tt === "Record")
    return { label: `generates`, type: "produces" };
  if (ft === "Resource" && tt === "Party")
    return { label: `assigned to`, type: "relates-to" };
  if (ft === "Record" && tt === "Resource")
    return { label: `references`, type: "relates-to" };
  if (ft === "Record" && tt === "Party")
    return { label: `involves`, type: "relates-to" };
  // Same type
  if (ft === tt)
    return { label: `associated with`, type: "relates-to" };

  return { label: `relates to`, type: "relates-to" };
}

function suggestEnrichment(nodes: ConceptNode[]): EnrichedProperties {
  const relationships: ConceptEdge[] = [];
  const attributes: Record<string, ConceptAttribute[]> = {};

  // ── Infer relationships across ALL cross-type pairs ──
  // Score each potential pair and keep the best connections
  const candidates: { from: ConceptNode; to: ConceptNode; score: number }[] = [];

  for (const a of nodes) {
    for (const b of nodes) {
      if (a.id >= b.id) continue; // avoid dupes and self
      if (a.type === b.type) continue; // skip intra-type for now
      const score = semanticAffinity(a, b);
      candidates.push({ from: a, to: b, score });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Ensure every concept has at least 1 relationship, and high-scoring pairs
  // always get included. Track how many edges each node has.
  const edgeCount = new Map<string, number>();
  nodes.forEach(n => edgeCount.set(n.id, 0));

  const usedPairs = new Set<string>();

  for (const { from, to, score } of candidates) {
    const key = `${from.id}|${to.id}`;
    if (usedPairs.has(key)) continue;

    const fromEdges = edgeCount.get(from.id) ?? 0;
    const toEdges = edgeCount.get(to.id) ?? 0;

    // Include if: high affinity, or one of the nodes still has no edges
    const needsEdge = fromEdges === 0 || toEdges === 0;
    const highAffinity = score >= 1;

    if (needsEdge || highAffinity) {
      // Cap edges per node at 3 to avoid visual clutter
      if (fromEdges >= 3 && toEdges >= 3) continue;

      const verb = inferRelVerb(from, to);
      relationships.push({
        from: from.id,
        to: to.id,
        label: verb.label,
        type: verb.type,
      });
      usedPairs.add(key);
      edgeCount.set(from.id, fromEdges + 1);
      edgeCount.set(to.id, toEdges + 1);
    }
  }

  // If any node still has 0 edges, connect to its nearest neighbour by type priority
  for (const node of nodes) {
    if ((edgeCount.get(node.id) ?? 0) > 0) continue;
    // Find nearest cross-type neighbour
    let bestOther: ConceptNode | null = null;
    let bestScore = -1;
    for (const other of nodes) {
      if (other.id === node.id || other.type === node.type) continue;
      const s = semanticAffinity(node, other);
      if (s > bestScore || bestOther === null) { bestScore = s; bestOther = other; }
    }
    if (bestOther) {
      const verb = inferRelVerb(node, bestOther);
      relationships.push({
        from: node.id,
        to: bestOther.id,
        label: verb.label,
        type: verb.type,
      });
      edgeCount.set(node.id, (edgeCount.get(node.id) ?? 0) + 1);
      edgeCount.set(bestOther.id, (edgeCount.get(bestOther.id) ?? 0) + 1);
    }
  }

  // ── Suggest attributes based on concept type + name ──
  for (const node of nodes) {
    const attrs: ConceptAttribute[] = [];
    const nameLower = node.name.toLowerCase();

    // Universal attributes
    attrs.push({ name: "id", dataType: "uuid" });
    attrs.push({ name: "name", dataType: "string" });

    if (node.type === "Party") {
      attrs.push(
        { name: "type", dataType: "enum" },
        { name: "status", dataType: "enum" },
        { name: "contactEmail", dataType: "string" },
        { name: "phone", dataType: "string" },
      );
      // Context-specific party attributes
      if (nameLower.includes("guest") || nameLower.includes("tenant")) {
        attrs.push({ name: "checkInDate", dataType: "date" });
        attrs.push({ name: "preferences", dataType: "json" });
      }
      if (nameLower.includes("owner")) {
        attrs.push({ name: "portfolioCount", dataType: "integer" });
      }
      if (nameLower.includes("contractor")) {
        attrs.push({ name: "specialty", dataType: "string" });
        attrs.push({ name: "licenseNumber", dataType: "string" });
      }
    } else if (node.type === "Resource") {
      attrs.push(
        { name: "status", dataType: "enum" },
        { name: "description", dataType: "text" },
      );
      if (nameLower.includes("property")) {
        attrs.push(
          { name: "address", dataType: "string" },
          { name: "propertyType", dataType: "enum" },
          { name: "bedrooms", dataType: "integer" },
          { name: "marketValue", dataType: "decimal" },
        );
      }
      if (nameLower.includes("portfolio")) {
        attrs.push(
          { name: "propertyCount", dataType: "integer" },
          { name: "totalValue", dataType: "decimal" },
        );
      }
      if (nameLower.includes("booking")) {
        attrs.push(
          { name: "checkIn", dataType: "date" },
          { name: "checkOut", dataType: "date" },
          { name: "totalAmount", dataType: "decimal" },
        );
      }
      if (nameLower.includes("tenancy")) {
        attrs.push(
          { name: "startDate", dataType: "date" },
          { name: "endDate", dataType: "date" },
          { name: "monthlyRent", dataType: "decimal" },
        );
      }
    } else {
      // Record
      attrs.push(
        { name: "recordId", dataType: "string" },
        { name: "createdDate", dataType: "datetime" },
        { name: "status", dataType: "enum" },
        { name: "createdBy", dataType: "reference" },
      );
      if (nameLower.includes("financial") || nameLower.includes("yield")) {
        attrs.push(
          { name: "period", dataType: "string" },
          { name: "amount", dataType: "decimal" },
          { name: "currency", dataType: "string" },
        );
      }
      if (nameLower.includes("maintenance")) {
        attrs.push(
          { name: "priority", dataType: "enum" },
          { name: "assignedTo", dataType: "reference" },
          { name: "resolvedDate", dataType: "datetime" },
        );
      }
      if (nameLower.includes("review")) {
        attrs.push(
          { name: "rating", dataType: "integer" },
          { name: "comment", dataType: "text" },
        );
      }
      if (nameLower.includes("compliance") || nameLower.includes("obligation")) {
        attrs.push(
          { name: "regulation", dataType: "string" },
          { name: "dueDate", dataType: "date" },
          { name: "complianceStatus", dataType: "enum" },
        );
      }
      if (nameLower.includes("subscription") || nameLower.includes("fee")) {
        attrs.push(
          { name: "amount", dataType: "decimal" },
          { name: "frequency", dataType: "enum" },
          { name: "nextDueDate", dataType: "date" },
        );
      }
    }
    attributes[node.id] = attrs;
  }

  return { relationships, attributes };
}

/* ── Relationship type colours ────────────────────────────── */
const REL_COLORS: Record<string, string> = {
  "has-a":      "#4a9eda",
  "is-a":       "#a78bfa",
  "part-of":    "#f59e0b",
  "consumes":   "#2dd4bf",
  "produces":   "#4ade80",
  "governs":    "#e05b8a",
  "relates-to": "#94a3b8",
};

const RELATIONSHIP_TYPES: ConceptRelationship["type"][] = [
  "has-a", "is-a", "part-of", "consumes", "produces", "governs", "relates-to",
];

/* ── Compute edge path between two nodes (box boundary → box boundary) ── */
function computeEdgePath(
  a: ConceptNode,
  b: ConceptNode,
  edgeIndex: number,
  totalEdgesForPair: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return null;

  // Clip to box edges
  const hw = NODE_W / 2 + 2;
  const hh = NODE_H / 2 + 2;

  // Use actual angle-based box clipping
  const angle = Math.atan2(dy, dx);
  const clipToBox = (cx: number, cy: number, ang: number) => {
    const absCos = Math.abs(Math.cos(ang));
    const absSin = Math.abs(Math.sin(ang));
    let r: number;
    if (absCos * hh > absSin * hw) {
      r = hw / absCos;
    } else {
      r = hh / absSin;
    }
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
  };

  const start = clipToBox(a.x, a.y, angle);
  const end = clipToBox(b.x, b.y, angle + Math.PI);

  // Curve offset for readability — spread parallel edges slightly
  const offsetFactor = (edgeIndex - (totalEdgesForPair - 1) / 2) * 12;
  const perpX = -(end.y - start.y) / dist;
  const perpY = (end.x - start.x) / dist;
  const midX = (start.x + end.x) / 2 + perpX * (15 + offsetFactor);
  const midY = (start.y + end.y) / 2 + perpY * (15 + offsetFactor);

  return {
    d: `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`,
    labelX: midX,
    labelY: midY,
  };
}

/* ── Component ────────────────────────────────────────────── */
export function ConceptGraphView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<EnrichedProperties | null>(null);
  const [showRelLabels, setShowRelLabels] = useState(true);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragState, setDragState] = useState<{ nodeId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const baseNodes = useMemo(() => {
    if (!scaffoldData?.elements?.concepts) return [];
    return layoutConcepts(scaffoldData.elements.concepts as Record<string, any>);
  }, [scaffoldData]);

  // Merge layout positions with drag overrides
  const nodes = useMemo(() => {
    return baseNodes.map(n => ({
      ...n,
      x: nodePositions[n.id]?.x ?? n.x,
      y: nodePositions[n.id]?.y ?? n.y,
    }));
  }, [baseNodes, nodePositions]);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const parties = nodes.filter((n) => n.type === "Party").length;
    const resources = nodes.filter((n) => n.type === "Resource").length;
    const records = nodes.filter((n) => n.type === "Record").length;
    return { parties, resources, records, total: nodes.length };
  }, [nodes]);

  const handleEnrich = useCallback(() => {
    setEnriched(suggestEnrichment(nodes));
  }, [nodes]);

  const handleClearEnrichment = useCallback(() => {
    setEnriched(null);
  }, []);

  const handleResetLayout = useCallback(() => {
    setNodePositions({});
  }, []);

  // Edges from enrichment
  const edges = enriched?.relationships ?? [];

  // Count parallel edges per node pair for offset calculation
  const pairEdgeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const indices = new Map<string, number>();
    for (const e of edges) {
      const key = [e.from, e.to].sort().join("|");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return { counts, indices };
  }, [edges]);

  // Track edge indices for parallel offset
  const edgeWithIndex = useMemo(() => {
    const indexTracker = new Map<string, number>();
    return edges.map(e => {
      const key = [e.from, e.to].sort().join("|");
      const idx = indexTracker.get(key) ?? 0;
      indexTracker.set(key, idx + 1);
      const total = pairEdgeCounts.counts.get(key) ?? 1;
      return { ...e, edgeIndex: idx, totalForPair: total };
    });
  }, [edges, pairEdgeCounts]);

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

  // ── Drag handlers ──
  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const svgPt = getSVGPoint(e.clientX, e.clientY);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragState({
      nodeId,
      startX: svgPt.x,
      startY: svgPt.y,
      origX: node.x,
      origY: node.y,
    });
  }, [getSVGPoint, nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const svgPt = getSVGPoint(e.clientX, e.clientY);
    const dx = svgPt.x - dragState.startX;
    const dy = svgPt.y - dragState.startY;
    setNodePositions(prev => ({
      ...prev,
      [dragState.nodeId]: {
        x: dragState.origX + dx,
        y: dragState.origY + dy,
      },
    }));
  }, [dragState, getSVGPoint]);

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      // If barely moved, treat as click (select)
      const node = nodes.find(n => n.id === dragState.nodeId);
      if (node) {
        const dx = Math.abs(node.x - dragState.origX);
        const dy = Math.abs(node.y - dragState.origY);
        if (dx < 3 && dy < 3) {
          setSelectedId(dragState.nodeId);
        }
      }
    }
    setDragState(null);
  }, [dragState, nodes]);

  if (!scaffoldData) return null;

  const hasMovedNodes = Object.keys(nodePositions).length > 0;

  return (
    <div
      className="h-full overflow-auto"
      style={{ background: "#1a2236", fontFamily: "'DM Sans', system-ui, sans-serif" }}
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

        {/* Legend + Controls */}
        <div className="mb-3 flex flex-wrap items-center gap-4">
          {([
            { type: "Party", color: COLORS.party },
            { type: "Resource", color: COLORS.resource },
            { type: "Record", color: COLORS.record },
          ] as const).map(({ type, color }) => (
            <div key={type} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#94a3b8" }}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
              {type}
            </div>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {hasMovedNodes && (
              <button
                onClick={handleResetLayout}
                className="rounded px-2 py-0.5 text-[10px] font-medium"
                style={{ color: "#94a3b8", border: "1px solid #2e3f5c" }}
              >
                Reset layout
              </button>
            )}
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

        {/* SVG Graph */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full rounded-lg"
          style={{ background: "#243352", border: "1px solid #2e3f5c" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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

          {/* Column labels (only when layout hasn't been moved) */}
          {!hasMovedNodes && ([
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
          {edgeWithIndex.map((e, i) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;

            const path = computeEdgePath(a, b, e.edgeIndex, e.totalForPair);
            if (!path) return null;

            const color = REL_COLORS[e.type] ?? "#94a3b8";

            return (
              <g key={i}>
                <path
                  d={path.d}
                  stroke={color}
                  strokeWidth={1.2}
                  fill="none"
                  opacity={0.65}
                  markerEnd={`url(#arrow-${e.type})`}
                />
                {showRelLabels && (
                  <>
                    {/* Background for readability */}
                    <text
                      x={path.labelX}
                      y={path.labelY + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={7}
                      fill="#243352"
                      stroke="#243352"
                      strokeWidth={3}
                      fontFamily="DM Sans, sans-serif"
                      paintOrder="stroke"
                    >
                      {e.label}
                    </text>
                    <text
                      x={path.labelX}
                      y={path.labelY + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={7}
                      fill={color}
                      fontFamily="DM Sans, sans-serif"
                    >
                      {e.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Nodes — all boxes, draggable */}
          {nodes.map((node) => {
            const col = colFor(node.type);
            const isSelected = selectedId === node.id;
            const isDragging = dragState?.nodeId === node.id;
            const lines = wrapText(node.name, 14);
            const lineCount = lines.length;

            return (
              <g
                key={node.id}
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
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
                    style={{ pointerEvents: "none" }}
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
              <div className="flex-1 min-w-0">
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
                                className="rounded px-1 py-0.5 text-[8px] font-bold"
                                style={{ color: REL_COLORS[r.type] ?? "#94a3b8", background: "rgba(255,255,255,0.05)" }}
                              >
                                {r.label}
                              </span>
                              <span style={{ color: "#94a3b8" }}>{isSource ? "→" : "←"}</span>
                              <span
                                style={{ color: otherNode ? colFor(otherNode.type).accent : "#cbd5e1", cursor: "pointer" }}
                                onClick={() => { if (otherNode) setSelectedId(otherNode.id); }}
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
                <div className="w-[240px] flex-shrink-0 rounded-md p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2e3f5c" }}>
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
              {" Drag nodes to rearrange the layout."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
