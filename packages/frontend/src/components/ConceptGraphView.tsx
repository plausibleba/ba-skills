// @ts-nocheck
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { ConceptRelationship } from "../types/cards.ts";

/* ═══════════════════════════════════════════════════════════════
   Colour palette & helpers
   ═══════════════════════════════════════════════════════════════ */
const COLORS = {
  party: "#2dd4bf", partyDim: "rgba(45,212,191,0.12)", partyBorder: "rgba(45,212,191,0.5)",
  resource: "#4a9eda", resourceDim: "rgba(74,158,218,0.12)", resourceBorder: "rgba(74,158,218,0.5)",
  record: "#e05b8a", recordDim: "rgba(224,91,138,0.12)", recordBorder: "rgba(224,91,138,0.5)",
  border: "#2e3f5c", textDim: "#94a3b8", textMed: "#cbd5e1",
  interaction: "#f59e0b", structural: "#a78bfa",
};

function colFor(type: string) {
  if (type === "Party") return { fill: COLORS.partyDim, stroke: COLORS.partyBorder, text: "#e0fdf9", accent: COLORS.party };
  if (type === "Resource") return { fill: COLORS.resourceDim, stroke: COLORS.resourceBorder, text: "#e0f2fe", accent: COLORS.resource };
  return { fill: COLORS.recordDim, stroke: COLORS.recordBorder, text: "#fce7f3", accent: COLORS.record };
}

/* ═══════════════════════════════════════════════════════════════
   SVG Icons (jalapeno)
   ═══════════════════════════════════════════════════════════════ */
function PartyIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`} fill={color}>
      <path d="M12,10c-1.654,0-3,1.346-3,3c0,1.654,1.346,3,3,3c1.654,0,3-1.346,3-3C15,11.346,13.654,10,12,10z M12,14c-0.552,0-1-0.448-1-1c0-0.551,0.448-1,1-1s1,0.449,1,1C13,13.552,12.552,14,12,14z" />
      <path d="M21,5h-6V3c0-0.552-0.447-1-1-1h-4C9.448,2,9,2.448,9,3v2H3C2.448,5,2,5.448,2,6v16c0,0.553,0.448,1,1,1h18c0.553,0,1-0.447,1-1V6C22,5.448,21.553,5,21,5z M11,4h2v3h-2V4z M15,21H9v-1c0-0.561,0.438-1,0.998-1h4.004C14.562,19,15,19.439,15,20V21z M20,21h-3v-1c0-1.654-1.346-3-2.998-3H9.998C8.345,17,7,18.346,7,20v1H4V7h5v1c0,0.552,0.448,1,1,1h4c0.553,0,1-0.448,1-1V7h5V21z" />
    </g>
  );
}
function ResourceIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`} fill={color}>
      <path d="M22,1H2C1.448,1,1,1.449,1,2.002v4.009c0,0.553,0.448,1.002,1,1.002h1v13.03c0,0.554,0.448,1.002,1,1.002h3.736c0.552,0,1-0.448,1-1.002s-0.448-1.002-1-1.002H5V7.014h14v0.992c0,0.553,0.447,1.002,1,1.002s1-0.449,1-1.002V7.014h1c0.553,0,1-0.449,1-1.002V2.002C23,1.449,22.553,1,22,1z M21,5.009h-1H4H3V3.004h18V5.009z" />
      <path d="M17.057,10.765c-0.257-0.25-0.623-0.346-0.968-0.25l-3.332,0.92l-2.061-2.003C10.3,9.045,9.668,9.056,9.282,9.453C8.897,9.85,8.907,10.484,9.304,10.87l2.048,1.991l-0.912,3.312c-0.097,0.352,0.004,0.728,0.263,0.981l5.646,5.558C16.544,22.904,16.797,23,17.05,23c0.257,0,0.513-0.098,0.707-0.294l4.949-4.96c0.188-0.188,0.294-0.444,0.293-0.714c-0.001-0.268-0.108-0.521-0.299-0.711L17.057,10.765z M17.044,20.586l-4.521-4.447l0.466-1.687l1.336,1.299c0.194,0.189,0.446,0.284,0.696,0.284c0.261,0,0.521-0.103,0.718-0.306c0.385-0.396,0.375-1.031-0.021-1.417l-1.295-1.26l1.642-0.454l4.516,4.445L17.044,20.586z" />
    </g>
  );
}
function RecordIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`} fill={color}>
      <polygon points="18,5.274 13.078,10.387 13.076,10.387 13.076,10.387 10,7.192 11.23,5.913 13.076,7.831 16.77,3.996" />
      <polygon points="18,12.264 13.078,17.378 13.076,17.377 13.076,17.378 10,14.184 11.23,12.902 13.076,14.82 16.77,10.986" />
      <path d="M21,21.973H7c-0.552,0-1-0.447-1-1V1c0-0.552,0.448-1,1-1h14c0.553,0,1,0.448,1,1v19.973C22,21.525,21.553,21.973,21,21.973z M8,19.973h12V2H8V19.973z" />
      <path d="M4,22c-0.552,0-1-0.447-1-1V1c0-0.552,0.448-1,1-1s1,0.448,1,1v20C5,21.553,4.552,22,4,22z" />
    </g>
  );
}
function TypeIcon({ type, x, y, size, color }: { type: string; x: number; y: number; size: number; color: string }) {
  if (type === "Party") return <PartyIcon x={x} y={y} size={size} color={color} />;
  if (type === "Resource") return <ResourceIcon x={x} y={y} size={size} color={color} />;
  return <RecordIcon x={x} y={y} size={size} color={color} />;
}

/* ═══════════════════════════════════════════════════════════════
   Text wrapping (syllable-aware)
   ═══════════════════════════════════════════════════════════════ */
const VOWELS = new Set("aeiouyAEIOUY".split(""));
function syllableSplit(word: string): string[] {
  if (word.length <= 8) return [word];
  const bp: number[] = [];
  for (let i = 2; i < word.length - 2; i++) {
    if (VOWELS.has(word[i - 1]) && !VOWELS.has(word[i])) bp.push(i);
  }
  if (!bp.length) { const m = Math.ceil(word.length / 2); return [word.slice(0, m) + "-", word.slice(m)]; }
  const mid = word.length / 2;
  const best = bp.reduce((a, b) => Math.abs(a - mid) < Math.abs(b - mid) ? a : b);
  return [word.slice(0, best) + "-", word.slice(best)];
}
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (w.length > maxChars) {
      if (cur) { lines.push(cur.trim()); cur = ""; }
      for (const p of syllableSplit(w)) {
        if (cur && (cur + " " + p).length > maxChars) { lines.push(cur.trim()); cur = p; }
        else cur = cur ? cur + " " + p : p;
      }
    } else if (cur && (cur + " " + w).length > maxChars) { lines.push(cur.trim()); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur.trim());
  return lines.length ? lines : [text];
}

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface ConceptNode {
  id: string; name: string; type: string;
  definition?: string; description?: string;
  lifecycleStates?: string[]; relatedCapabilityIds?: string[];
  x: number; y: number;
}

type RelationCategory = "interaction" | "structural";

interface ConceptEdge {
  from: string; to: string; label: string;
  type: ConceptRelationship["type"];
  category: RelationCategory;
}

interface ConceptAttribute { name: string; dataType: string; }

interface EnrichedProperties {
  relationships: ConceptEdge[];
  attributes: Record<string, ConceptAttribute[]>;
}

/* ═══════════════════════════════════════════════════════════════
   Node layout — Party | Record (centre) | Resource
   ═══════════════════════════════════════════════════════════════ */
const NODE_W = 130;
const NODE_H = 44;
const ICON_SIZE = 14;
const COL_X = { Party: 100, Record: 350, Resource: 600 };

function layoutConcepts(concepts: Record<string, any>): ConceptNode[] {
  const all = Object.values(concepts) as any[];
  const parties = all.filter(c => c.type === "Party");
  const resources = all.filter(c => c.type === "Resource");
  const records = all.filter(c => c.type === "Record");
  const yStart = 60, yGap = 64;
  const pos = (items: any[], type: string): ConceptNode[] =>
    items.map((c, i) => ({
      id: c.id, name: c.name, type: c.type ?? type,
      definition: c.definition ?? c.description, description: c.description,
      lifecycleStates: c.lifecycleStates, relatedCapabilityIds: c.relatedCapabilityIds,
      x: COL_X[type as keyof typeof COL_X], y: yStart + i * yGap,
    }));
  return [...pos(parties, "Party"), ...pos(records, "Record"), ...pos(resources, "Resource")];
}

/* ═══════════════════════════════════════════════════════════════
   Enrichment — Interaction + Structural relations
   ═══════════════════════════════════════════════════════════════ */

function suggestEnrichment(nodes: ConceptNode[]): EnrichedProperties {
  const rels: ConceptEdge[] = [];
  const attributes: Record<string, ConceptAttribute[]> = {};
  const parties = nodes.filter(n => n.type === "Party");
  const resources = nodes.filter(n => n.type === "Resource");
  const records = nodes.filter(n => n.type === "Record");

  // ── INTERACTION RELATIONS ──
  // Each Record is an interaction: it has subject Parties and object Resources
  for (const rec of records) {
    const rn = rec.name.toLowerCase();
    // Find subject parties (who creates/initiates this record?)
    const subjectParties = findSubjectParties(rn, parties);
    for (const { party, role } of subjectParties) {
      rels.push({ from: party.id, to: rec.id, label: role, type: "produces", category: "interaction" });
    }
    // Find object resources (what is this record about?)
    const objectResources = findObjectResources(rn, resources);
    for (const { resource, role } of objectResources) {
      rels.push({ from: rec.id, to: resource.id, label: role, type: "relates-to", category: "interaction" });
    }
  }

  // ── STRUCTURAL RELATIONS ──
  // Party ↔ Resource ownership, composition, assignment
  for (const party of parties) {
    const pn = party.name.toLowerCase();
    for (const res of resources) {
      const rn = res.name.toLowerCase();
      const rel = inferStructuralRel(pn, rn, party, res);
      if (rel) rels.push(rel);
    }
  }
  // Resource ↔ Resource composition
  for (let i = 0; i < resources.length; i++) {
    for (let j = i + 1; j < resources.length; j++) {
      const a = resources[i], b = resources[j];
      const rel = inferResourceStructural(a, b);
      if (rel) rels.push(rel);
    }
  }

  // Ensure no orphans — every node gets at least one edge
  const connected = new Set(rels.flatMap(r => [r.from, r.to]));
  for (const n of nodes) {
    if (connected.has(n.id)) continue;
    // Connect to nearest record (if party/resource) or nearest party (if record)
    const targets = n.type === "Record" ? parties : records;
    if (targets.length) {
      const target = targets[0];
      const cat: RelationCategory = n.type === "Record" || target.type === "Record" ? "interaction" : "structural";
      rels.push({ from: n.id, to: target.id, label: "associated with", type: "relates-to", category: cat });
    }
  }

  // ── ATTRIBUTES ──
  for (const node of nodes) {
    attributes[node.id] = suggestAttributes(node);
  }

  // Deduplicate
  const seen = new Set<string>();
  const deduped = rels.filter(r => {
    const key = `${r.from}→${r.to}:${r.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { relationships: deduped, attributes };
}

function findSubjectParties(recordName: string, parties: ConceptNode[]): { party: ConceptNode; role: string }[] {
  const results: { party: ConceptNode; role: string }[] = [];
  const map: Record<string, { keywords: string[]; role: string }[]> = {
    "booking": [{ keywords: ["guest"], role: "bookedBy" }, { keywords: ["owner"], role: "receivedBy" }],
    "maintenance": [{ keywords: ["tenant", "guest"], role: "requestedBy" }, { keywords: ["contractor"], role: "assignedTo" }],
    "review": [{ keywords: ["guest"], role: "writtenBy" }],
    "financial": [{ keywords: ["owner"], role: "reportedTo" }],
    "compliance": [{ keywords: ["owner"], role: "obligatedTo" }],
    "yield": [{ keywords: ["owner"], role: "measuredFor" }],
    "subscription": [{ keywords: ["tenant", "guest"], role: "paidBy" }, { keywords: ["owner"], role: "receivedBy" }],
    "fee": [{ keywords: ["tenant", "guest"], role: "paidBy" }, { keywords: ["owner"], role: "receivedBy" }],
    "tenancy": [{ keywords: ["tenant"], role: "heldBy" }],
  };
  for (const [trigger, mappings] of Object.entries(map)) {
    if (!recordName.includes(trigger)) continue;
    for (const { keywords, role } of mappings) {
      for (const p of parties) {
        if (keywords.some(k => p.name.toLowerCase().includes(k))) {
          results.push({ party: p, role });
        }
      }
    }
  }
  // Fallback: if no matches, connect to first party
  if (!results.length && parties.length) {
    results.push({ party: parties[0], role: "involves" });
  }
  return results;
}

function findObjectResources(recordName: string, resources: ConceptNode[]): { resource: ConceptNode; role: string }[] {
  const results: { resource: ConceptNode; role: string }[] = [];
  const map: Record<string, { keywords: string[]; role: string }[]> = {
    "booking": [{ keywords: ["property"], role: "forProperty" }, { keywords: ["booking"], role: "forBooking" }],
    "maintenance": [{ keywords: ["property"], role: "forProperty" }],
    "review": [{ keywords: ["property", "booking"], role: "regarding" }],
    "financial": [{ keywords: ["portfolio", "property"], role: "regarding" }],
    "compliance": [{ keywords: ["property", "portfolio"], role: "regarding" }],
    "yield": [{ keywords: ["portfolio", "property"], role: "regarding" }],
    "subscription": [{ keywords: ["tenancy", "property"], role: "forTenancy" }],
    "fee": [{ keywords: ["tenancy", "property"], role: "forTenancy" }],
  };
  for (const [trigger, mappings] of Object.entries(map)) {
    if (!recordName.includes(trigger)) continue;
    for (const { keywords, role } of mappings) {
      for (const r of resources) {
        if (keywords.some(k => r.name.toLowerCase().includes(k))) {
          results.push({ resource: r, role });
        }
      }
    }
  }
  if (!results.length && resources.length) {
    results.push({ resource: resources[0], role: "regarding" });
  }
  return results;
}

function inferStructuralRel(partyName: string, resName: string, party: ConceptNode, res: ConceptNode): ConceptEdge | null {
  if (partyName.includes("owner") && resName.includes("property"))
    return { from: party.id, to: res.id, label: "owns", type: "has-a", category: "structural" };
  if (partyName.includes("owner") && resName.includes("portfolio"))
    return { from: party.id, to: res.id, label: "manages", type: "governs", category: "structural" };
  if (partyName.includes("tenant") && resName.includes("tenancy"))
    return { from: party.id, to: res.id, label: "holds", type: "has-a", category: "structural" };
  if (partyName.includes("tenant") && resName.includes("property"))
    return { from: party.id, to: res.id, label: "occupies", type: "consumes", category: "structural" };
  if (partyName.includes("guest") && resName.includes("booking"))
    return { from: party.id, to: res.id, label: "makes", type: "produces", category: "structural" };
  if (partyName.includes("guest") && resName.includes("property"))
    return { from: party.id, to: res.id, label: "stays at", type: "consumes", category: "structural" };
  if (partyName.includes("contractor") && resName.includes("property"))
    return { from: party.id, to: res.id, label: "maintains", type: "consumes", category: "structural" };
  return null;
}

function inferResourceStructural(a: ConceptNode, b: ConceptNode): ConceptEdge | null {
  const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
  if (an.includes("property") && bn.includes("portfolio"))
    return { from: a.id, to: b.id, label: "partOf", type: "part-of", category: "structural" };
  if (bn.includes("property") && an.includes("portfolio"))
    return { from: b.id, to: a.id, label: "partOf", type: "part-of", category: "structural" };
  if (an.includes("tenancy") && bn.includes("property"))
    return { from: a.id, to: b.id, label: "onProperty", type: "relates-to", category: "structural" };
  if (bn.includes("tenancy") && an.includes("property"))
    return { from: b.id, to: a.id, label: "onProperty", type: "relates-to", category: "structural" };
  if (an.includes("booking") && bn.includes("property"))
    return { from: a.id, to: b.id, label: "forProperty", type: "relates-to", category: "structural" };
  if (bn.includes("booking") && an.includes("property"))
    return { from: b.id, to: a.id, label: "forProperty", type: "relates-to", category: "structural" };
  return null;
}

function suggestAttributes(node: ConceptNode): ConceptAttribute[] {
  const a: ConceptAttribute[] = [{ name: "id", dataType: "uuid" }, { name: "name", dataType: "string" }];
  const n = node.name.toLowerCase();
  if (node.type === "Party") {
    a.push({ name: "type", dataType: "enum" }, { name: "status", dataType: "enum" }, { name: "contactEmail", dataType: "string" }, { name: "phone", dataType: "string" });
    if (n.includes("guest") || n.includes("tenant")) a.push({ name: "checkInDate", dataType: "date" }, { name: "preferences", dataType: "json" });
    if (n.includes("owner")) a.push({ name: "portfolioCount", dataType: "integer" });
    if (n.includes("contractor")) a.push({ name: "specialty", dataType: "string" }, { name: "licenseNumber", dataType: "string" });
  } else if (node.type === "Resource") {
    a.push({ name: "status", dataType: "enum" }, { name: "description", dataType: "text" });
    if (n.includes("property")) a.push({ name: "address", dataType: "string" }, { name: "propertyType", dataType: "enum" }, { name: "bedrooms", dataType: "integer" }, { name: "marketValue", dataType: "decimal" });
    if (n.includes("portfolio")) a.push({ name: "propertyCount", dataType: "integer" }, { name: "totalValue", dataType: "decimal" });
    if (n.includes("booking")) a.push({ name: "checkIn", dataType: "date" }, { name: "checkOut", dataType: "date" }, { name: "totalAmount", dataType: "decimal" });
    if (n.includes("tenancy")) a.push({ name: "startDate", dataType: "date" }, { name: "endDate", dataType: "date" }, { name: "monthlyRent", dataType: "decimal" });
  } else {
    a.push({ name: "recordId", dataType: "string" }, { name: "createdDate", dataType: "datetime" }, { name: "status", dataType: "enum" }, { name: "createdBy", dataType: "reference" });
    if (n.includes("financial") || n.includes("yield")) a.push({ name: "period", dataType: "string" }, { name: "amount", dataType: "decimal" }, { name: "currency", dataType: "string" });
    if (n.includes("maintenance")) a.push({ name: "priority", dataType: "enum" }, { name: "assignedTo", dataType: "reference" }, { name: "resolvedDate", dataType: "datetime" });
    if (n.includes("review")) a.push({ name: "rating", dataType: "integer" }, { name: "comment", dataType: "text" });
    if (n.includes("compliance") || n.includes("obligation")) a.push({ name: "regulation", dataType: "string" }, { name: "dueDate", dataType: "date" }, { name: "complianceStatus", dataType: "enum" });
    if (n.includes("subscription") || n.includes("fee")) a.push({ name: "amount", dataType: "decimal" }, { name: "frequency", dataType: "enum" }, { name: "nextDueDate", dataType: "date" });
  }
  return a;
}

/* ═══════════════════════════════════════════════════════════════
   Edge colours & path computation
   ═══════════════════════════════════════════════════════════════ */
const REL_COLORS: Record<string, string> = {
  "has-a": "#4a9eda", "is-a": "#a78bfa", "part-of": "#f59e0b",
  "consumes": "#2dd4bf", "produces": "#4ade80", "governs": "#e05b8a", "relates-to": "#94a3b8",
};
const RELATIONSHIP_TYPES: ConceptRelationship["type"][] = ["has-a", "is-a", "part-of", "consumes", "produces", "governs", "relates-to"];

function computeEdgePath(a: ConceptNode, b: ConceptNode, edgeIndex: number, totalEdgesForPair: number) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return null;
  const hw = NODE_W / 2 + 2, hh = NODE_H / 2 + 2;
  const angle = Math.atan2(dy, dx);
  const clip = (cx: number, cy: number, ang: number) => {
    const ac = Math.abs(Math.cos(ang)), as2 = Math.abs(Math.sin(ang));
    const r = ac * hh > as2 * hw ? hw / ac : hh / as2;
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
  };
  const s = clip(a.x, a.y, angle), e = clip(b.x, b.y, angle + Math.PI);
  const off = (edgeIndex - (totalEdgesForPair - 1) / 2) * 12;
  const px = -(e.y - s.y) / dist, py = (e.x - s.x) / dist;
  const mx = (s.x + e.x) / 2 + px * (15 + off), my = (s.y + e.y) / 2 + py * (15 + off);
  return { d: `M ${s.x} ${s.y} Q ${mx} ${my} ${e.x} ${e.y}`, labelX: mx, labelY: my };
}

/* ═══════════════════════════════════════════════════════════════
   Editable Table View
   ═══════════════════════════════════════════════════════════════ */
function ConceptTableView({
  concepts, enriched, onUpdateConcept,
}: {
  concepts: Record<string, any>;
  enriched: EnrichedProperties | null;
  onUpdateConcept: (id: string, field: string, value: string) => void;
}) {
  const all = Object.values(concepts) as any[];
  const sorted = [...all].sort((a, b) => {
    const order = { Party: 0, Resource: 1, Record: 2 };
    return (order[a.type] ?? 3) - (order[b.type] ?? 3) || a.name.localeCompare(b.name);
  });

  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #2e3f5c" }}>
      <table className="w-full text-left text-[11px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#1e2d4a" }}>
            {["Type", "Name", "Definition", "Lifecycle States"].map(h => (
              <th key={h} className="px-3 py-2 font-semibold" style={{ color: "#94a3b8", borderBottom: "1px solid #2e3f5c" }}>{h}</th>
            ))}
            {enriched && <th className="px-3 py-2 font-semibold" style={{ color: "#94a3b8", borderBottom: "1px solid #2e3f5c" }}>Attributes</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #2e3f5c" }}>
              <td className="px-3 py-2">
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                  style={{ background: colFor(c.type).fill, color: colFor(c.type).accent, border: `1px solid ${colFor(c.type).stroke}` }}>
                  {c.type}
                </span>
              </td>
              <td className="px-3 py-2">
                <input
                  defaultValue={c.name}
                  onBlur={(e) => onUpdateConcept(c.id, "name", e.target.value)}
                  className="w-full rounded px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid transparent", outline: "none" }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#4a9eda"; }}
                  onBlurCapture={(e) => { (e.target as HTMLInputElement).style.borderColor = "transparent"; }}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  defaultValue={c.definition ?? c.description ?? ""}
                  onBlur={(e) => onUpdateConcept(c.id, "definition", e.target.value)}
                  className="w-full rounded px-1.5 py-0.5 text-[11px]"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#cbd5e1", border: "1px solid transparent", outline: "none" }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#4a9eda"; }}
                  onBlurCapture={(e) => { (e.target as HTMLInputElement).style.borderColor = "transparent"; }}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  defaultValue={(c.lifecycleStates ?? []).join(", ")}
                  onBlur={(e) => onUpdateConcept(c.id, "lifecycleStates", e.target.value)}
                  className="w-full rounded px-1.5 py-0.5 text-[11px]"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#4a9eda", border: "1px solid transparent", outline: "none", fontFamily: "'DM Mono', monospace" }}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#4a9eda"; }}
                  onBlurCapture={(e) => { (e.target as HTMLInputElement).style.borderColor = "transparent"; }}
                  placeholder="state1, state2, ..."
                />
              </td>
              {enriched && enriched.attributes[c.id] && (
                <td className="px-3 py-2 text-[10px]" style={{ color: "#94a3b8" }}>
                  {enriched.attributes[c.id].slice(0, 4).map(a => a.name).join(", ")}
                  {enriched.attributes[c.id].length > 4 && ` +${enriched.attributes[c.id].length - 4}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export function ConceptGraphView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<EnrichedProperties | null>(null);
  const [showRelLabels, setShowRelLabels] = useState(true);
  const [showInteraction, setShowInteraction] = useState(true);
  const [showStructural, setShowStructural] = useState(true);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragState, setDragState] = useState<{ nodeId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [viewTab, setViewTab] = useState<"graph" | "table">("graph");

  // Pan & zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const baseNodes = useMemo(() => {
    if (!scaffoldData?.elements?.concepts) return [];
    return layoutConcepts(scaffoldData.elements.concepts as Record<string, any>);
  }, [scaffoldData]);

  const nodes = useMemo(() => baseNodes.map(n => ({
    ...n,
    x: nodePositions[n.id]?.x ?? n.x,
    y: nodePositions[n.id]?.y ?? n.y,
  })), [baseNodes, nodePositions]);

  const selected = nodes.find(n => n.id === selectedId) ?? null;
  const stats = useMemo(() => {
    const p = nodes.filter(n => n.type === "Party").length;
    const r = nodes.filter(n => n.type === "Resource").length;
    const rc = nodes.filter(n => n.type === "Record").length;
    return { parties: p, resources: r, records: rc, total: nodes.length };
  }, [nodes]);

  const handleEnrich = useCallback(() => setEnriched(suggestEnrichment(nodes)), [nodes]);
  const handleClearEnrichment = useCallback(() => setEnriched(null), []);
  const handleResetLayout = useCallback(() => { setNodePositions({}); setPan({ x: 0, y: 0 }); setZoom(1); }, []);

  const allEdges = enriched?.relationships ?? [];
  const edges = useMemo(() =>
    allEdges.filter(e => (e.category === "interaction" && showInteraction) || (e.category === "structural" && showStructural)),
    [allEdges, showInteraction, showStructural],
  );

  const edgeWithIndex = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of edges) { const k = [e.from, e.to].sort().join("|"); counts.set(k, (counts.get(k) ?? 0) + 1); }
    const tracker = new Map<string, number>();
    return edges.map(e => {
      const k = [e.from, e.to].sort().join("|");
      const idx = tracker.get(k) ?? 0;
      tracker.set(k, idx + 1);
      return { ...e, edgeIndex: idx, totalForPair: counts.get(k) ?? 1 };
    });
  }, [edges]);

  const maxY = Math.max(...nodes.map(n => n.y), 200) + NODE_H;
  const vbW = 720, vbH = Math.max(maxY + 40, 300);

  const nodeById = useMemo(() => { const m = new Map<string, ConceptNode>(); nodes.forEach(n => m.set(n.id, n)); return m; }, [nodes]);

  // ── SVG coordinate helper ──
  const getSVGPoint = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const p = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // ── Node drag ──
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault(); e.stopPropagation();
    const p = getSVGPoint(e.clientX, e.clientY);
    const n = nodes.find(nd => nd.id === nodeId);
    if (!n) return;
    setDragState({ nodeId, startX: p.x, startY: p.y, origX: n.x, origY: n.y });
  }, [getSVGPoint, nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragState) {
      const p = getSVGPoint(e.clientX, e.clientY);
      setNodePositions(prev => ({
        ...prev,
        [dragState.nodeId]: { x: dragState.origX + (p.x - dragState.startX), y: dragState.origY + (p.y - dragState.startY) },
      }));
    } else if (isPanning) {
      const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
      setPan({ x: panOrigin.x + dx, y: panOrigin.y + dy });
    }
  }, [dragState, getSVGPoint, isPanning, panStart, panOrigin]);

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      const n = nodes.find(nd => nd.id === dragState.nodeId);
      if (n && Math.abs(n.x - dragState.origX) < 3 && Math.abs(n.y - dragState.origY) < 3) {
        setSelectedId(dragState.nodeId);
      }
      setDragState(null);
    }
    setIsPanning(false);
  }, [dragState, nodes]);

  // ── Pan (background drag) ──
  const handleBgMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start pan if clicking on SVG background (not a node)
    if ((e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).tagName === "rect" && (e.target as SVGRectElement).getAttribute("data-bg") === "true") {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOrigin({ ...pan });
    }
  }, [pan]);

  // ── Zoom (wheel) ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(3, Math.max(0.3, z * delta)));
  }, []);

  // ── Table update handler ──
  const handleUpdateConcept = useCallback((id: string, field: string, value: string) => {
    const state = useCanvasStore.getState();
    if (!state.scaffoldData?.elements?.concepts) return;
    const concepts = { ...state.scaffoldData.elements.concepts };
    if (concepts[id]) {
      const updated = { ...concepts[id] };
      if (field === "lifecycleStates") {
        updated.lifecycleStates = value.split(",").map(s => s.trim()).filter(Boolean);
      } else {
        updated[field] = value;
      }
      concepts[id] = updated;
      useCanvasStore.setState({
        scaffoldData: {
          ...state.scaffoldData,
          elements: { ...state.scaffoldData.elements, concepts },
        },
        scaffoldDirty: true,
      });
    }
  }, []);

  if (!scaffoldData) return null;

  const hasMovedNodes = Object.keys(nodePositions).length > 0;
  const interactionCount = allEdges.filter(e => e.category === "interaction").length;
  const structuralCount = allEdges.filter(e => e.category === "structural").length;

  return (
    <div style={{ background: "#1a2236", fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100%" }}>
      <div className="mx-auto max-w-[1100px] p-5">
        {/* Header */}
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Concept Model</div>
          <div className="mb-1 text-lg font-bold text-white">{scaffoldData.name} — Business Object Taxonomy</div>
          <div className="text-[11px]" style={{ color: "#94a3b8" }}>
            Capsicum Triad · {stats.parties} parties · {stats.resources} resources · {stats.records} records
          </div>
        </div>

        {/* Tab bar: Graph | Table */}
        <div className="mb-3 flex items-center gap-1" style={{ borderBottom: "1px solid #2e3f5c" }}>
          {(["graph", "table"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setViewTab(tab)}
              className="rounded-t px-4 py-1.5 text-[11px] font-semibold capitalize"
              style={{
                background: viewTab === tab ? "#243352" : "transparent",
                color: viewTab === tab ? "#fff" : "#94a3b8",
                borderBottom: viewTab === tab ? "2px solid #4a9eda" : "2px solid transparent",
              }}
            >
              {tab === "graph" ? "Graph" : "Table"}
            </button>
          ))}
        </div>

        {/* Legend + Controls */}
        <div className="mb-3 flex flex-wrap items-center gap-4">
          {([
            { type: "Party", color: COLORS.party },
            { type: "Record", color: COLORS.record },
            { type: "Resource", color: COLORS.resource },
          ] as const).map(({ type, color }) => (
            <div key={type} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#94a3b8" }}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
              {type}
            </div>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {hasMovedNodes && (
              <button onClick={handleResetLayout} className="rounded px-2 py-0.5 text-[10px] font-medium" style={{ color: "#94a3b8", border: "1px solid #2e3f5c" }}>
                Reset
              </button>
            )}
            {enriched && (
              <>
                {/* Relation category filters */}
                <button
                  onClick={() => setShowInteraction(!showInteraction)}
                  className="rounded px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background: showInteraction ? "rgba(245,158,11,0.15)" : "transparent",
                    color: showInteraction ? COLORS.interaction : "#94a3b8",
                    border: `1px solid ${showInteraction ? "rgba(245,158,11,0.3)" : "#2e3f5c"}`,
                  }}
                >
                  Interaction ({interactionCount})
                </button>
                <button
                  onClick={() => setShowStructural(!showStructural)}
                  className="rounded px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background: showStructural ? "rgba(167,139,250,0.15)" : "transparent",
                    color: showStructural ? COLORS.structural : "#94a3b8",
                    border: `1px solid ${showStructural ? "rgba(167,139,250,0.3)" : "#2e3f5c"}`,
                  }}
                >
                  Structural ({structuralCount})
                </button>
                <button
                  onClick={() => setShowRelLabels(!showRelLabels)}
                  className="rounded px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: showRelLabels ? "rgba(74,158,218,0.15)" : "transparent", color: showRelLabels ? "#4a9eda" : "#94a3b8", border: "1px solid #2e3f5c" }}
                >
                  Labels
                </button>
                <button onClick={handleClearEnrichment} className="rounded px-2 py-0.5 text-[10px] font-medium" style={{ color: "#94a3b8", border: "1px solid #2e3f5c" }}>
                  Clear
                </button>
              </>
            )}
            <button
              onClick={handleEnrich}
              className="rounded px-3 py-1 text-[11px] font-semibold"
              style={{
                background: enriched ? "rgba(45,212,191,0.15)" : "rgba(74,158,218,0.15)",
                color: enriched ? "#2dd4bf" : "#4a9eda",
                border: `1px solid ${enriched ? "rgba(45,212,191,0.3)" : "rgba(74,158,218,0.3)"}`,
              }}
            >
              {enriched ? "✓ Enriched" : "⚡ Enrich"}
            </button>
          </div>
        </div>

        {/* ── GRAPH VIEW ── */}
        {viewTab === "graph" && (
          <>
            <div
              ref={containerRef}
              className="overflow-hidden rounded-lg"
              style={{ border: "1px solid #2e3f5c", background: "#243352", position: "relative" }}
              onWheel={handleWheel}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${vbW} ${vbH}`}
                className="w-full"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  cursor: isPanning ? "grabbing" : dragState ? "grabbing" : "default",
                  minHeight: 350,
                }}
                onMouseDown={handleBgMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Background rect for pan detection */}
                <rect x={0} y={0} width={vbW} height={vbH} fill="transparent" data-bg="true" />

                {/* Arrowhead defs */}
                <defs>
                  {RELATIONSHIP_TYPES.map(t => (
                    <marker key={t} id={`arrow-${t}`} viewBox="0 0 10 7" refX={10} refY={3.5} markerWidth={8} markerHeight={6} orient="auto-start-reverse">
                      <path d="M0 0 L10 3.5 L0 7 Z" fill={REL_COLORS[t] ?? "#94a3b8"} />
                    </marker>
                  ))}
                </defs>

                {/* Column labels */}
                {!hasMovedNodes && ([
                  { type: "Party", x: COL_X.Party },
                  { type: "Record", x: COL_X.Record },
                  { type: "Resource", x: COL_X.Resource },
                ] as const).map(({ type, x }) => (
                  <text key={type} x={x} y={28} textAnchor="middle" fontSize={10} fontWeight={700} fill={colFor(type).accent} fontFamily="DM Sans, sans-serif" letterSpacing={1}>
                    {type.toUpperCase()}
                  </text>
                ))}

                {/* Edges */}
                {edgeWithIndex.map((e, i) => {
                  const a = nodeById.get(e.from), b = nodeById.get(e.to);
                  if (!a || !b) return null;
                  const path = computeEdgePath(a, b, e.edgeIndex, e.totalForPair);
                  if (!path) return null;
                  const catColor = e.category === "interaction" ? COLORS.interaction : COLORS.structural;
                  return (
                    <g key={i}>
                      <path d={path.d} stroke={catColor} strokeWidth={1.2} fill="none" opacity={0.6}
                        strokeDasharray={e.category === "structural" ? "4 2" : "none"}
                        markerEnd={`url(#arrow-${e.type})`} />
                      {showRelLabels && (
                        <>
                          <text x={path.labelX} y={path.labelY + 1} textAnchor="middle" dominantBaseline="middle"
                            fontSize={7} fill="#243352" stroke="#243352" strokeWidth={3} fontFamily="DM Sans, sans-serif" paintOrder="stroke">
                            {e.label}
                          </text>
                          <text x={path.labelX} y={path.labelY + 1} textAnchor="middle" dominantBaseline="middle"
                            fontSize={7} fill={catColor} fontFamily="DM Sans, sans-serif">
                            {e.label}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {nodes.map((node) => {
                  const col = colFor(node.type);
                  const isSel = selectedId === node.id;
                  const lines = wrapText(node.name, 14);
                  const lc = lines.length;
                  return (
                    <g key={node.id} style={{ cursor: dragState?.nodeId === node.id ? "grabbing" : "grab" }}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}>
                      <rect x={node.x - NODE_W / 2} y={node.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={6}
                        fill={col.fill} stroke={isSel ? col.accent : col.stroke} strokeWidth={isSel ? 2.5 : 1} />
                      <TypeIcon type={node.type} x={node.x - NODE_W / 2 + 16} y={node.y} size={ICON_SIZE} color={col.accent} />
                      {lines.map((line, li) => (
                        <text key={li} x={node.x + 6} y={node.y + (li - (lc - 1) / 2) * 13 + 1}
                          textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={600}
                          fill={col.text} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </svg>

              {/* Zoom indicator */}
              {zoom !== 1 && (
                <div className="absolute bottom-2 right-2 rounded px-2 py-0.5 text-[9px] font-medium"
                  style={{ background: "rgba(26,34,54,0.8)", color: "#94a3b8", border: "1px solid #2e3f5c" }}>
                  {Math.round(zoom * 100)}%
                </div>
              )}
            </div>

            {/* Inspector */}
            <div className="mt-3 rounded-lg p-4" style={{
              background: "#243352",
              border: `1.5px solid ${selected ? colFor(selected.type).accent : "#4a9eda"}`,
              minHeight: 72,
            }}>
              {selected ? (
                <div className="flex gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="text-[15px] font-bold text-white">{selected.name}</div>
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                        style={{ background: colFor(selected.type).fill, color: colFor(selected.type).accent, border: `1px solid ${colFor(selected.type).stroke}` }}>
                        {selected.type}
                      </span>
                    </div>
                    {(selected.definition || selected.description) && (
                      <div className="mb-2 text-[12px] leading-relaxed" style={{ color: "#cbd5e1" }}>
                        {selected.definition || selected.description}
                      </div>
                    )}
                    {selected.lifecycleStates?.length > 0 && (
                      <div className="mb-2">
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Lifecycle</div>
                        <div className="flex flex-wrap gap-1">
                          {selected.lifecycleStates.map((s: string, i: number) => (
                            <span key={i} className="flex items-center gap-1">
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ background: "rgba(74,158,218,0.1)", color: "#4a9eda", border: "1px solid rgba(74,158,218,0.2)" }}>
                                {s}
                              </span>
                              {i < selected.lifecycleStates!.length - 1 && <span className="text-[10px]" style={{ color: "#2e3f5c" }}>→</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {enriched && (() => {
                      const rels = edges.filter(e => e.from === selected.id || e.to === selected.id);
                      if (!rels.length) return null;
                      return (
                        <div className="mb-2">
                          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Relationships</div>
                          <div className="space-y-0.5">
                            {rels.map((r, i) => {
                              const isSource = r.from === selected.id;
                              const other = nodeById.get(isSource ? r.to : r.from);
                              const catCol = r.category === "interaction" ? COLORS.interaction : COLORS.structural;
                              return (
                                <div key={i} className="flex items-center gap-1 text-[10px]">
                                  <span className="rounded px-1 py-0.5 text-[8px] font-bold" style={{ color: catCol, background: "rgba(255,255,255,0.05)" }}>
                                    {r.label}
                                  </span>
                                  <span className="text-[8px] rounded px-1" style={{ color: "#94a3b8", background: "rgba(255,255,255,0.03)" }}>
                                    {r.category}
                                  </span>
                                  <span style={{ color: "#94a3b8" }}>{isSource ? "→" : "←"}</span>
                                  <span style={{ color: other ? colFor(other.type).accent : "#cbd5e1", cursor: "pointer" }}
                                    onClick={() => { if (other) setSelectedId(other.id); }}>
                                    {other?.name ?? (isSource ? r.to : r.from)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {enriched?.attributes[selected.id] && (
                    <div className="w-[240px] flex-shrink-0 rounded-md p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #2e3f5c" }}>
                      <div className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Attributes</div>
                      <div className="space-y-1">
                        {enriched.attributes[selected.id].map((attr, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span style={{ color: "#cbd5e1" }}>{attr.name}</span>
                            <span className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: "rgba(74,158,218,0.1)", color: "#4a9eda", fontFamily: "'DM Mono', monospace" }}>
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
                  Select a concept to inspect. Drag nodes to rearrange. Scroll to zoom, drag background to pan.
                  {!enriched && " Click \"Enrich\" to suggest relationships and attributes."}
                </p>
              )}
            </div>
          </>
        )}

        {/* ── TABLE VIEW ── */}
        {viewTab === "table" && scaffoldData?.elements?.concepts && (
          <ConceptTableView
            concepts={scaffoldData.elements.concepts as Record<string, any>}
            enriched={enriched}
            onUpdateConcept={handleUpdateConcept}
          />
        )}
      </div>
    </div>
  );
}
