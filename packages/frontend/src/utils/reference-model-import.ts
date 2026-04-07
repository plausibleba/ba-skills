/**
 * reference-model-import.ts — One-click import of Business Architecture Guild
 * Reference Models from .xlsx files.
 *
 * Supports the standard Guild format:
 *   - "Capability Map" sheet → capabilities (hierarchical, Tier/Level)
 *   - "Value Streams Inventory" (or similar) sheet → value streams
 *   - Per-VS detail sheets → stages with entrance/exit criteria, stakeholders
 *   - "Stakeholder Map" sheet → roles
 *   - "Information Map" sheet → information objects with lifecycle states
 *   - "Organization Map" sheet → (metadata, not mapped to scaffold currently)
 *
 * Produces a ScaffoldData object ready to load into the canvas store.
 *
 * Session 28 — Reference Model Import feature.
 */

import * as XLSX from "xlsx";
import type {
  ScaffoldData,
  ScaffoldValueStream,
  ScaffoldActivity,
  ScaffoldCapability,
  ScaffoldElement,
  ScaffoldInfoObject,
  ScaffoldConcept,
} from "../types.ts";

/* ── Helpers ─────────────────────────────────────────────── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function makeId(prefix: string, name: string): string {
  return `${prefix}-${slugify(name)}`;
}

function cellStr(row: unknown[], col: number): string {
  const v = row[col];
  if (v == null) return "";
  return String(v).trim();
}

/** Find a sheet by partial name match (case-insensitive, trimmed) */
function findSheet(wb: XLSX.WorkBook, pattern: string): XLSX.WorkSheet | null {
  const key = wb.SheetNames.find(
    (n) => n.trim().toLowerCase().includes(pattern.toLowerCase())
  );
  return key ? wb.Sheets[key] : null;
}

/** Convert a sheet to a 2D array of raw values */
function sheetToRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
}

/* ── Detection ───────────────────────────────────────────── */

/**
 * Quick check: does this file look like a Guild-format reference model?
 * Looks for a "Capability Map" sheet and a "Value Stream" sheet.
 */
export function isReferenceModelWorkbook(wb: XLSX.WorkBook): boolean {
  const hasCapMap = wb.SheetNames.some((n) =>
    n.trim().toLowerCase().includes("capability map")
  );
  const hasVS = wb.SheetNames.some((n) =>
    n.trim().toLowerCase().includes("value stream")
  );
  return hasCapMap && hasVS;
}

/**
 * Detect from a raw ArrayBuffer (before even parsing with XLSX).
 * Reads just enough to check sheet names.
 */
export function detectReferenceModel(buffer: ArrayBuffer): boolean {
  try {
    const wb = XLSX.read(buffer, { type: "array", sheetRows: 1 });
    return isReferenceModelWorkbook(wb);
  } catch {
    return false;
  }
}

/* ── Main parser ─────────────────────────────────────────── */

export interface ImportResult {
  scaffold: ScaffoldData;
  stats: {
    valueStreams: number;
    activities: number;
    capabilities: number;
    roles: number;
    informationObjects: number;
  };
}

export function parseReferenceModelWorkbook(
  buffer: ArrayBuffer,
  modelName?: string,
): ImportResult {
  const wb = XLSX.read(buffer, { type: "array" });

  // Determine model name from cover sheet or file
  const coverSheet = findSheet(wb, "cover");
  let name = modelName ?? "Reference Model";
  if (coverSheet) {
    const rows = sheetToRows(coverSheet);
    // Usually the first non-empty cell contains the model name
    for (const row of rows) {
      const val = cellStr(row, 0);
      if (val && val.length > 3 && val.length < 120) {
        name = val;
        break;
      }
    }
  }

  const scaffoldId = `ref-${slugify(name)}-${Date.now()}`;

  // Parse all sections
  const capabilities = parseCapabilities(wb);
  const { valueStreams, activities, outcomes } = parseValueStreams(wb);
  const roles = parseStakeholders(wb);
  const informationObjects = parseInformationMap(wb);
  const concepts = parseConcepts(wb, informationObjects);

  // Wire capability IDs onto value streams based on stage-level stakeholder/capability cross-refs
  // For now, collect all unique capability IDs and assign to VS
  for (const vs of Object.values(valueStreams)) {
    const vsCapIds = new Set<string>();
    for (const actId of vs.activityIds) {
      const act = activities[actId];
      if (act?.requiresCapabilityIds) {
        for (const cId of act.requiresCapabilityIds) vsCapIds.add(cId);
      }
    }
    vs.capabilityIds = [...vsCapIds];
  }

  const scaffold: ScaffoldData = {
    schemaVersion: "0.5",
    scaffoldId,
    name,
    description: `Imported reference model: ${name}`,
    elements: {
      valueStreams,
      activities,
      outcomes,
      roles,
      capabilities,
      controls: {},
      constraints: {},
      metrics: {},
      informationObjects,
      concepts,
    },
  };

  return {
    scaffold,
    stats: {
      valueStreams: Object.keys(valueStreams).length,
      activities: Object.keys(activities).length,
      capabilities: Object.keys(capabilities).length,
      roles: Object.keys(roles).length,
      informationObjects: Object.keys(informationObjects).length,
    },
  };
}

/* ── Capability Map parser ───────────────────────────────── */

function parseCapabilities(
  wb: XLSX.WorkBook,
): Record<string, ScaffoldCapability> {
  const sheet = findSheet(wb, "capability map");
  if (!sheet) return {};

  const rows = sheetToRows(sheet);
  const caps: Record<string, ScaffoldCapability> = {};

  // Find header row — must contain BOTH a "capability" column AND a "level" or
  // "tier" column.  A title row like "Capability Map" only has one keyword so
  // it won't match, avoiding the false-positive that previously let the title
  // row masquerade as the column header.
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = rows[i].map((c) => String(c).toLowerCase().trim());
    const hasCap = cells.some((c) => c === "capability" || c === "capabilities");
    const hasLevel = cells.some(
      (c) => c === "level" || c === "tier" || c === "tier " || c === "level ",
    );
    if (hasCap && hasLevel) {
      headerIdx = i;
      break;
    }
  }
  // Fallback: if we didn't find a combined header, look for any row with "tier" + "level"
  if (headerIdx < 0) {
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const cells = rows[i].map((c) => String(c).toLowerCase().trim());
      if (cells.some((c) => c === "tier") && cells.some((c) => c === "level")) {
        headerIdx = i;
        break;
      }
    }
  }
  if (headerIdx < 0) return {}; // No recognisable header found

  // Detect column positions from header
  const header = rows[headerIdx].map((c) => String(c).toLowerCase().trim());
  const tierCol = header.findIndex((h) => h === "tier" || h === "tier ");
  const levelCol = header.findIndex((h) => h === "level" || h === "level ");
  const nameCol = header.findIndex(
    (h) => h.includes("capability") && !h.includes("definition"),
  );
  const defCol = header.findIndex(
    (h) => h.includes("definition") || h.includes("description"),
  );

  // Track parent stack by level for hierarchy
  const parentStack: Record<number, string> = {};

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const capName = cellStr(row, nameCol >= 0 ? nameCol : 2);
    if (!capName) continue;

    const _tierRaw = Number(cellStr(row, tierCol >= 0 ? tierCol : 0)) || 1;
    void _tierRaw; // Tier column read but not used directly; level drives hierarchy
    const levelRaw = Number(cellStr(row, levelCol >= 0 ? levelCol : 1)) || 1;
    const definition = cellStr(row, defCol >= 0 ? defCol : 3);

    // Map Guild tiers (1-based) to VCC levels (1-4)
    // Guild uses Tier for the business area grouping and Level for depth within
    // We map: Level 1 = Tier heading (Business Area), Level 2+ = capabilities
    const vccLevel = Math.min(levelRaw, 4) as 1 | 2 | 3 | 4;

    const id = makeId("cap", capName);

    // Determine parent from level hierarchy
    let parentId: string | null = null;
    if (vccLevel > 1) {
      // Find the nearest parent at a lower level
      for (let pl = vccLevel - 1; pl >= 1; pl--) {
        if (parentStack[pl]) {
          parentId = parentStack[pl];
          break;
        }
      }
    }

    // Update parent stack
    parentStack[vccLevel] = id;
    // Clear deeper levels
    for (let pl = vccLevel + 1; pl <= 4; pl++) {
      delete parentStack[pl];
    }

    caps[id] = {
      id,
      elementType: "capability",
      name: capName,
      level: vccLevel,
      parentId,
      description: definition || undefined,
    };
  }

  return caps;
}

/* ── Value Stream + Activity parser ──────────────────────── */

function parseValueStreams(wb: XLSX.WorkBook): {
  valueStreams: Record<string, ScaffoldValueStream>;
  activities: Record<string, ScaffoldActivity>;
  outcomes: Record<string, ScaffoldElement>;
} {
  const valueStreams: Record<string, ScaffoldValueStream> = {};
  const activities: Record<string, ScaffoldActivity> = {};
  const outcomes: Record<string, ScaffoldElement> = {};

  // First, get the VS inventory for names + descriptions
  const invSheet =
    findSheet(wb, "value stream") ?? findSheet(wb, "value streams");
  if (!invSheet) return { valueStreams, activities, outcomes };

  const invRows = sheetToRows(invSheet);

  // Find header row
  let invHeader = 0;
  for (let i = 0; i < Math.min(invRows.length, 5); i++) {
    if (
      invRows[i].some((c) =>
        String(c).toLowerCase().includes("value stream name"),
      )
    ) {
      invHeader = i;
      break;
    }
  }

  // Collect VS names and descriptions (skip notes/metadata rows)
  const vsList: { name: string; description: string }[] = [];
  for (let i = invHeader + 1; i < invRows.length; i++) {
    const name = cellStr(invRows[i], 0);
    const desc = cellStr(invRows[i], 1);
    // Skip empty rows, notes, and metadata
    if (!name || name.toLowerCase().startsWith("note:") || name.toLowerCase().startsWith("note ")) continue;
    vsList.push({ name, description: desc });
  }

  // For each VS, try to find a matching detail sheet for stages
  for (const vs of vsList) {
    const vsId = makeId("vs", vs.name);
    const activityIds: string[] = [];

    // Try to find the detail sheet — match by VS name.
    // Handle abbreviated sheet names (e.g. "Maintain Cust.Part Infor" for
    // "Maintain Customer/Partner Information") via multiple strategies.
    const detailSheet = wb.SheetNames.find((sheetName) => {
      const normalised = sheetName.trim().toLowerCase();
      const vsNorm = vs.name.toLowerCase();
      // Exact or substring match
      if (normalised === vsNorm || normalised.includes(vsNorm)) return true;
      if (vsNorm.includes(normalised) && normalised.length > 8) return true;
      // First word match + significant char overlap (handles abbreviations)
      const sheetWords = normalised.split(/[\s.]+/);
      const vsWords = vsNorm.split(/[\s/]+/);
      if (
        sheetWords[0] === vsWords[0] &&
        sheetWords.length >= 2 &&
        vsWords.length >= 2 &&
        vsWords[1].startsWith(sheetWords[1].slice(0, 4))
      ) {
        return true;
      }
      return false;
    });

    if (detailSheet && wb.Sheets[detailSheet]) {
      const rows = sheetToRows(wb.Sheets[detailSheet]);

      // Find header row (contains "Value Stream Stage" or similar)
      let headerIdx = 0;
      for (let h = 0; h < Math.min(rows.length, 5); h++) {
        if (
          rows[h].some((c) => String(c).toLowerCase().includes("stage"))
        ) {
          headerIdx = h;
          break;
        }
      }

      // Detect column positions
      const hdr = rows[headerIdx].map((c) => String(c).toLowerCase().trim());
      const stageCol = hdr.findIndex((h) => h.includes("stage"));
      const descCol = hdr.findIndex(
        (h) => h.includes("description") && !h.includes("value"),
      );
      const entCol = hdr.findIndex((h) => h.includes("entrance"));
      const exitCol = hdr.findIndex((h) => h.includes("exit"));
      const stakeholderCol = hdr.findIndex((h) => h.includes("stakeholder"));

      let prevActId: string | null = null;

      for (let r = headerIdx + 1; r < rows.length; r++) {
        const stageName = cellStr(rows[r], stageCol >= 0 ? stageCol : 1);
        if (!stageName) continue;

        const actId = makeId("act", `${vs.name}-${stageName}`);
        const desc = cellStr(rows[r], descCol >= 0 ? descCol : 2);
        const entranceCriteria = cellStr(rows[r], entCol >= 0 ? entCol : 4);
        const exitCriteria = cellStr(rows[r], exitCol >= 0 ? exitCol : 5);
        const stakeholders = cellStr(
          rows[r],
          stakeholderCol >= 0 ? stakeholderCol : 7,
        );

        // Create pre/post outcomes from entrance/exit criteria
        const preOutcomeId = makeId("out", `${stageName}-pre`);
        const postOutcomeId = makeId("out", `${stageName}-post`);

        if (entranceCriteria) {
          outcomes[preOutcomeId] = {
            id: preOutcomeId,
            elementType: "outcome",
            name: entranceCriteria,
          };
        }
        if (exitCriteria) {
          outcomes[postOutcomeId] = {
            id: postOutcomeId,
            elementType: "outcome",
            name: exitCriteria,
          };
        }

        // Parse stakeholders into role references
        const roleIds = stakeholders
          ? stakeholders
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s) => makeId("role", s))
          : [];

        // Chain activities
        if (prevActId && activities[prevActId]) {
          activities[prevActId].nextActivityId = actId;
        }

        activities[actId] = {
          id: actId,
          elementType: "activity",
          name: stageName,
          performedByRoleIds: roleIds,
          preOutcomeId: entranceCriteria ? preOutcomeId : "",
          postOutcomeId: exitCriteria ? postOutcomeId : "",
          requiresCapabilityIds: [],
          nextActivityId: null,
        };

        // Store description as a property (it's used by various views)
        if (desc) {
          activities[actId].description = desc;
        }

        activityIds.push(actId);
        prevActId = actId;
      }
    }

    valueStreams[vsId] = {
      id: vsId,
      elementType: "valueStream",
      name: vs.name,
      description: vs.description,
      activityIds,
      capabilityIds: [],
    };
  }

  return { valueStreams, activities, outcomes };
}

/* ── Stakeholder Map parser ──────────────────────────────── */

function parseStakeholders(
  wb: XLSX.WorkBook,
): Record<string, ScaffoldElement> {
  const sheet = findSheet(wb, "stakeholder");
  if (!sheet) return {};

  const rows = sheetToRows(sheet);
  const roles: Record<string, ScaffoldElement> = {};

  // Find header row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (
      rows[i].some((c) => String(c).toLowerCase().includes("stakeholder"))
    ) {
      headerIdx = i;
      break;
    }
  }

  const hdr = rows[headerIdx].map((c) => String(c).toLowerCase().trim());
  const nameCol = hdr.findIndex(
    (h) =>
      h === "stakeholder" ||
      (h.includes("stakeholder") && !h.includes("type") && !h.includes("category")),
  );

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const name = cellStr(rows[i], nameCol >= 0 ? nameCol : 2);
    if (!name) continue;

    const id = makeId("role", name);
    if (roles[id]) continue; // deduplicate

    roles[id] = {
      id,
      elementType: "role",
      name,
    };
  }

  return roles;
}

/* ── Information Map parser ──────────────────────────────── */

function parseInformationMap(
  wb: XLSX.WorkBook,
): Record<string, ScaffoldInfoObject> {
  const sheet = findSheet(wb, "information map");
  if (!sheet) return {};

  const rows = sheetToRows(sheet);
  const infoObjects: Record<string, ScaffoldInfoObject> = {};

  // Find header row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (
      rows[i].some((c) => String(c).toLowerCase().includes("information concept"))
    ) {
      headerIdx = i;
      break;
    }
  }

  const hdr = rows[headerIdx].map((c) => String(c).toLowerCase().trim());
  const nameCol = hdr.findIndex(
    (h) => h === "information concept" || (h.includes("information concept") && !h.includes("category") && !h.includes("definition") && !h.includes("type") && !h.includes("state") && !h.includes("related")),
  );
  const defCol = hdr.findIndex((h) => h.includes("definition"));
  const statesCol = hdr.findIndex((h) => h.includes("state"));

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const name = cellStr(rows[i], nameCol >= 0 ? nameCol : 0);
    if (!name) continue;

    const id = makeId("io", name);
    const description = cellStr(rows[i], defCol >= 0 ? defCol : 2);
    const statesRaw = cellStr(rows[i], statesCol >= 0 ? statesCol : 5);

    // Parse lifecycle states if present
    const lifecycleStates = statesRaw
      ? statesRaw.split(/[,;]/).map((s, idx, arr) => {
          const label = s.trim();
          const stateId = makeId("state", `${name}-${label}`);
          return {
            id: stateId,
            label,
            ordinal: idx,
            position: (idx === 0
              ? "initial"
              : idx === arr.length - 1
                ? "terminal"
                : "intermediate") as "initial" | "intermediate" | "terminal",
            transitionsTo: undefined as string[] | undefined,
          };
        })
      : undefined;

    // Wire transitions sequentially
    if (lifecycleStates && lifecycleStates.length > 1) {
      for (let s = 0; s < lifecycleStates.length - 1; s++) {
        lifecycleStates[s].transitionsTo = [lifecycleStates[s + 1].id];
      }
    }

    infoObjects[id] = {
      id,
      elementType: "informationObject",
      name,
      description: description || undefined,
      lifecycleStates,
    };
  }

  return infoObjects;
}

/* ── Concepts parser (Information Map → ConceptNode shape) ── */

/** Heuristic: classify an information concept as Party / Record / Resource.
 *  The Guild Information Map may include a "category" or "type" column.
 *  If not, we fall back to keyword matching on the concept name.             */
const PARTY_KEYWORDS = [
  "customer", "client", "partner", "supplier", "vendor", "employee",
  "stakeholder", "regulator", "agent", "applicant", "user", "member",
  "citizen", "patient", "beneficiary", "provider", "broker", "insured",
  "claimant", "advisor", "consultant", "officer", "director", "manager",
  "owner", "operator", "tenant", "subscriber", "account holder",
  "borrower", "lender", "guarantor", "sponsor", "trustee",
];
const RESOURCE_KEYWORDS = [
  "product", "service", "asset", "resource", "device", "equipment",
  "facility", "location", "site", "system", "platform", "tool",
  "infrastructure", "material", "inventory", "vehicle", "property",
  "instrument", "channel", "network",
];

function classifyConcept(
  name: string,
  categoryHint?: string,
): "Party" | "Record" | "Resource" {
  // Prefer explicit category column when available
  if (categoryHint) {
    const lc = categoryHint.toLowerCase();
    if (lc.includes("party") || lc.includes("person") || lc.includes("org")) return "Party";
    if (lc.includes("resource") || lc.includes("thing") || lc.includes("product")) return "Resource";
    if (lc.includes("record") || lc.includes("document") || lc.includes("event")) return "Record";
  }
  const lc = name.toLowerCase();
  if (PARTY_KEYWORDS.some((kw) => lc.includes(kw))) return "Party";
  if (RESOURCE_KEYWORDS.some((kw) => lc.includes(kw))) return "Resource";
  return "Record"; // default
}

function parseConcepts(
  wb: XLSX.WorkBook,
  infoObjects: Record<string, ScaffoldInfoObject>,
): Record<string, ScaffoldConcept> {
  const concepts: Record<string, ScaffoldConcept> = {};

  const sheet = findSheet(wb, "information map");

  // Detect whether the Information Map has a "category" / "type" column
  let categoryCol = -1;
  if (sheet) {
    const rows = sheetToRows(sheet);
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i].some((c) => String(c).toLowerCase().includes("information concept"))) {
        headerIdx = i;
        break;
      }
    }
    const hdr = rows[headerIdx].map((c) => String(c).toLowerCase().trim());
    categoryCol = hdr.findIndex(
      (h) =>
        h === "category" ||
        h === "type" ||
        h.includes("concept type") ||
        h.includes("concept category"),
    );
    const nameCol = hdr.findIndex(
      (h) => h === "information concept" || (h.includes("information concept") && !h.includes("category") && !h.includes("definition") && !h.includes("type") && !h.includes("state") && !h.includes("related")),
    );

    // Re-parse rows to pick up category
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const name = cellStr(rows[i], nameCol >= 0 ? nameCol : 0);
      if (!name) continue;
      const id = makeId("io", name);
      const io = infoObjects[id];
      if (!io) continue;

      const categoryHint = categoryCol >= 0 ? cellStr(rows[i], categoryCol) : "";
      const conceptType = classifyConcept(name, categoryHint);

      concepts[id] = {
        id,
        elementType: "Concept",
        name: io.name,
        type: conceptType,
        definition: io.description,
        lifecycleStates: io.lifecycleStates,
        relationships: [],
        properties: {},
      };
    }
  }

  // Ensure every informationObject has a concept entry (fallback for sheets without a category column)
  for (const [id, io] of Object.entries(infoObjects)) {
    if (concepts[id]) continue;
    const ioName = io.name ?? id;
    concepts[id] = {
      id,
      elementType: "Concept",
      name: ioName,
      type: classifyConcept(ioName),
      definition: io.description,
      lifecycleStates: io.lifecycleStates,
      relationships: [],
      properties: {},
    };
  }

  return concepts;
}

/* ── Convenience: parse from File object ─────────────────── */

export async function importReferenceModelFile(
  file: File,
): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const name = file.name.replace(/\.xlsx?$/i, "").replace(/[_-]/g, " ");
  return parseReferenceModelWorkbook(buffer, name);
}
