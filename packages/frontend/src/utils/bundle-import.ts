/**
 * bundle-import.ts — Normalises PlausibleBA ba-skills-bundles AND individual
 * PlausibleBA artifacts (concept-model, capability-map, value-stream) into
 * VCC's internal ScaffoldData shape.
 *
 * The ba-skills-bundle schema uses metamodel-aligned naming:
 *   elements.valueStreamStages  → VCC elements.activities
 *   ValueStream.stageIds        → VCC ValueStream.activityIds
 *   PPITEntry.processActivities → VCC PPITEntry.activities
 *   elementType: "ValueStreamStage" → VCC "Activity"
 *
 * Individual artifact JSONs (as downloaded from plausibleba.com/case-study)
 * are flat registries: { "obj_customer": {...}, "cap_foo": {...}, ... }
 * These are detected by inspecting element shapes and wrapped into a scaffold.
 *
 * This mapper runs at the import boundary so the rest of the VCC codebase
 * can continue using its existing naming internally.
 */

import type { ScaffoldData } from "../types.ts";

// ─── Artifact type detection ────────────────────────────────────────────────

export type PlausibleArtifactType =
  | "concept-model"
  | "capability-map"
  | "value-stream"
  | "ba-skills-bundle"
  | "unknown";

/**
 * Detect whether a parsed JSON object is a PlausibleBA full bundle.
 */
export function isPlausibleBABundle(json: Record<string, unknown>): boolean {
  const meta = json.meta as Record<string, unknown> | undefined;
  return (
    !!meta?.bundleVersion &&
    ("scaffoldId" in json || !!meta?.scaffoldId) && // Accept scaffoldId at top-level or inside meta
    "elements" in json &&
    !("schemaVersion" in json) // VCC-native scaffolds have schemaVersion
  );
}

/**
 * Detect what type of PlausibleBA artifact a JSON file is.
 * Handles both wrapped bundles and flat element registries.
 */
export function detectArtifactType(json: Record<string, unknown>): PlausibleArtifactType {
  // Full bundle with meta envelope
  if (isPlausibleBABundle(json)) return "ba-skills-bundle";

  // Wrapped artifact with explicit artifactType
  if ("artifactType" in json && "elements" in json) {
    const t = json.artifactType as string;
    if (t === "concept-model" || t === "capability-map" || t === "value-stream") return t;
  }

  // Flat registry detection — look at the values of the top-level object
  const values = Object.values(json);
  if (values.length === 0) return "unknown";

  // Check if every value is an object with an elementType field
  const typed = values.filter(
    (v) => v && typeof v === "object" && !Array.isArray(v) && "elementType" in (v as Record<string, unknown>)
  );
  if (typed.length === 0) return "unknown";

  // Sample the elementTypes to classify
  const elementTypes = new Set(typed.map((v) => (v as Record<string, unknown>).elementType as string));

  if (elementTypes.has("BusinessObject") && !elementTypes.has("Capability") && !elementTypes.has("ValueStream")) {
    return "concept-model";
  }
  if (elementTypes.has("Capability") && !elementTypes.has("BusinessObject") && !elementTypes.has("ValueStream")) {
    return "capability-map";
  }
  if (elementTypes.has("ValueStream")) {
    return "value-stream";
  }

  return "unknown";
}

// ─── Concept model mapping ──────────────────────────────────────────────────

/** Map PlausibleBA BusinessObject type → VCC Concept subclass */
function mapConceptSubclass(type: string): string {
  switch (type) {
    case "Party": return "PartyClass";
    case "Resource": return "ProductClass";
    case "Record": return "RecordClass";
    default: return "General";
  }
}

/**
 * Convert a flat concept-model registry into VCC elements.concepts format.
 * PlausibleBA: { type: "Party"|"Resource"|"Record", lifecycleStates, relatedObjects, ... }
 * VCC Concept: { subclass: "PartyClass"|"ProductClass"|"RecordClass", ... }
 */
function normaliseConceptRegistry(flat: Record<string, any>): Record<string, any> {
  const concepts: Record<string, any> = {};

  for (const [id, obj] of Object.entries(flat)) {
    concepts[id] = {
      id: obj.id ?? id,
      name: obj.name,
      type: obj.type, // Keep original Party/Resource/Record for ConceptGraphView
      subclass: mapConceptSubclass(obj.type ?? ""),
      definition: obj.definition ?? obj.description ?? "",
      lifecycleStates: obj.lifecycleStates ?? [],
      relatedCapabilities: obj.relatedCapabilities ?? [],
      elementType: "Concept",
      // Preserve relationships for graph rendering
      relationships: (obj.relatedObjects ?? []).map((rel: any) => ({
        targetId: rel.objectId,
        type: rel.relationship?.toLowerCase() === "composition" ? "part-of" : "relates-to",
        label: rel.label ?? "",
      })),
    };
  }

  return concepts;
}

// ─── Capability map mapping ──────────────────────────────────────────────────

/**
 * Parse a PlausibleBA level string ("L1", "L2", "L3") or number into a numeric level.
 * VCC's CapabilityMapView.buildHierarchy() requires `typeof level === "number"`.
 */
function parseLevel(level: unknown): number | undefined {
  if (typeof level === "number") return level;
  if (typeof level === "string") {
    // "L1" → 1, "L2" → 2, "L3" → 3
    const match = level.match(/^L?(\d+)$/i);
    if (match) return parseInt(match[1], 10);
  }
  return undefined;
}

/**
 * Normalise a flat capability registry so that:
 * - level: "L1"/"L2"/"L3" → level: 1/2/3 (number)
 * - type: "Governance"/"Execution" is preserved for optional downstream use
 * - parentId references are preserved
 */
function normaliseCapabilityRegistry(flat: Record<string, any>): Record<string, any> {
  const capabilities: Record<string, any> = {};

  for (const [id, cap] of Object.entries(flat)) {
    const numLevel = parseLevel(cap.level);
    capabilities[id] = {
      ...cap,
      id: cap.id ?? id,
      elementType: "Capability",
      // Convert string levels to numbers for VCC hierarchy rendering
      level: numLevel ?? cap.level,
    };
  }

  return capabilities;
}

// ─── Value stream mapping ───────────────────────────────────────────────────

/**
 * Convert a flat value-stream registry with inline stages[] into
 * VCC elements.valueStreams + elements.activities.
 *
 * PlausibleBA VS has `stages: [{ id, name, capabilities, objects, ... }]`
 * VCC expects `valueStreams[id].activityIds` pointing to separate `activities[stgId]`.
 */
function normaliseValueStreamRegistry(
  flat: Record<string, any>
): { valueStreams: Record<string, any>; activities: Record<string, any>; outcomes: Record<string, any> } {
  const valueStreams: Record<string, any> = {};
  const activities: Record<string, any> = {};
  const outcomes: Record<string, any> = {};

  for (const [vsId, vs] of Object.entries(flat)) {
    const stages = vs.stages ?? [];
    const activityIds: string[] = [];

    for (const stage of stages) {
      const stgId = stage.id ?? `stg_${vsId}_${stage.number}`;
      activityIds.push(stgId);

      // Map stage → VCC activity/ScaffoldActivity
      activities[stgId] = {
        id: stgId,
        elementType: "Activity",
        name: stage.name,
        description: stage.entryCriteria
          ? `Entry: ${stage.entryCriteria}. Exit: ${stage.exitCriteria ?? ""}`
          : "",
        requiresCapabilityIds: stage.capabilities ?? [],
        requiresRoleIds: [],
        producesOutcomeIds: [],
        // Preserve extra metadata for enrichment
        valueObjectState: stage.valueObjectState,
        entryCriteria: stage.entryCriteria,
        exitCriteria: stage.exitCriteria,
        objects: stage.objects ?? [],
        systems: stage.systems ?? [],
      };

      // Create an outcome for each stage's valueObjectState if present
      if (stage.valueObjectState) {
        const outcomeId = `outcome_${stgId}`;
        outcomes[outcomeId] = {
          id: outcomeId,
          elementType: "Outcome",
          name: `${vs.valueObject ?? "Object"} → ${stage.valueObjectState}`,
          description: stage.exitCriteria ?? "",
        };
        activities[stgId].producesOutcomeIds = [outcomeId];
      }
    }

    valueStreams[vsId] = {
      id: vs.id ?? vsId,
      elementType: "ValueStream",
      name: vs.name,
      description: vs.outcome ?? vs.description ?? "",
      activityIds,
      trigger: vs.trigger,
      recipient: vs.recipient,
      valueObject: vs.valueObject,
    };
  }

  return { valueStreams, activities, outcomes };
}

// ─── Hierarchy inference ─────────────────────────────────────────────────────

/** Convert a snake_case ID like "cap_menu_development" to "Menu Development" */
function snakeToTitle(id: string): string {
  return id
    .replace(/^cap_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "&");
}

/**
 * Auto-generate missing L1/L2 entries from parent references.
 * When only L3 capabilities are present with parent refs pointing to
 * non-existent entries, this creates L2 entries from those refs and
 * groups them under synthetic L1 business areas.
 */
function generateMissingHierarchy(caps: Record<string, any>): Record<string, any> {
  const result = { ...caps };

  // Collect parent IDs that don't exist as entries
  const existingIds = new Set(Object.keys(result));
  const missingParentIds = new Set<string>();
  for (const cap of Object.values(result)) {
    if (cap.parentId && !existingIds.has(cap.parentId)) {
      missingParentIds.add(cap.parentId);
    }
  }

  if (missingParentIds.size === 0) return result;

  // Check if there are any L1 or L2 entries already
  const hasL1 = Object.values(result).some((c: any) => c.level === 1);
  const hasL2 = Object.values(result).some((c: any) => c.level === 2);

  if (hasL1 && hasL2) return result; // Hierarchy already exists

  // Create L2 entries from missing parent IDs
  const newL2Ids: string[] = [];
  for (const parentId of missingParentIds) {
    result[parentId] = {
      id: parentId,
      elementType: "Capability",
      name: snakeToTitle(parentId),
      level: 2,
      parentId: null, // Will be assigned to L1 below
    };
    newL2Ids.push(parentId);
  }

  // Group L2s into L1 business areas.
  // Strategy: group consecutive L2s (by order of first L3 appearance) into pairs.
  // This mirrors the typical Skills output order (2–3 domains per area).
  const l2Order: string[] = [];
  const seen = new Set<string>();
  for (const cap of Object.values(caps)) {
    if (cap.parentId && missingParentIds.has(cap.parentId) && !seen.has(cap.parentId)) {
      l2Order.push(cap.parentId);
      seen.add(cap.parentId);
    }
  }

  // Detect governance L2s (group separately)
  const govL2s: string[] = [];
  const execL2s: string[] = [];
  for (const l2Id of l2Order) {
    // Check if majority of children are Gov authority
    const children = Object.values(result).filter((c: any) => c.parentId === l2Id);
    const govCount = children.filter((c: any) =>
      c.authority === "Gov" || c.type === "Governance"
    ).length;
    if (govCount > children.length / 2) {
      govL2s.push(l2Id);
    } else {
      execL2s.push(l2Id);
    }
  }

  // Create L1 areas — pair consecutive exec L2s, group all gov L2s together
  let areaCounter = 1;
  for (let i = 0; i < execL2s.length; i += 2) {
    const l1Id = `cap_area_${areaCounter}`;
    // Derive name from L2 names
    const l2Names = [execL2s[i], execL2s[i + 1]].filter(Boolean).map((id) =>
      snakeToTitle(id)
    );
    const l1Name = deriveAreaName(l2Names);
    result[l1Id] = {
      id: l1Id,
      elementType: "Capability",
      name: l1Name,
      level: 1,
      parentId: null,
      type: "Execution",
    };
    result[execL2s[i]].parentId = l1Id;
    if (execL2s[i + 1]) result[execL2s[i + 1]].parentId = l1Id;
    areaCounter++;
  }

  if (govL2s.length > 0) {
    const govL1Id = `cap_area_gov`;
    result[govL1Id] = {
      id: govL1Id,
      elementType: "Capability",
      name: "Governance & Compliance",
      level: 1,
      parentId: null,
      type: "Governance",
    };
    for (const l2Id of govL2s) {
      result[l2Id].parentId = govL1Id;
    }
  }

  return result;
}

/** Derive a sensible L1 area name from its child L2 domain names */
function deriveAreaName(l2Names: string[]): string {
  if (l2Names.length === 1) return l2Names[0];
  // Look for common keywords
  const words1 = new Set(l2Names[0].toLowerCase().split(/\s+/));
  const words2 = new Set(l2Names[1]?.toLowerCase().split(/\s+/) ?? []);
  const shared = [...words1].filter((w) => words2.has(w) && w.length > 3);
  if (shared.length > 0) {
    return shared.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Management";
  }
  // Fallback: combine shortened versions
  const short = l2Names.map((n) => n.replace(/ Management$/, "").replace(/ And /, " & "));
  return short.join(" & ");
}

/**
 * Infer relatedCapabilities on concepts from:
 * 1. Capabilities' valueObject field (cap → object reverse lookup)
 * 2. Stage co-occurrence (objects appearing in the same stage share capabilities)
 */
function inferConceptCapabilityLinks(
  concepts: Record<string, any>,
  capabilities: Record<string, any>,
  stages?: Record<string, any>,
): void {
  // Build reverse index: objectId → capabilityIds[]
  const objToCaps: Record<string, Set<string>> = {};
  for (const cap of Object.values(capabilities)) {
    const objRef = cap.valueObject ?? cap.businessObject;
    if (objRef && typeof objRef === "string") {
      if (!objToCaps[objRef]) objToCaps[objRef] = new Set();
      objToCaps[objRef].add(cap.id);
    }
  }

  // Also add capability links from stage participation
  if (stages) {
    for (const stage of Object.values(stages)) {
      const stageObjs: string[] = stage.objects ?? stage.informationObjectIds ?? [];
      const stageCaps: string[] = stage.capabilities ?? stage.requiresCapabilityIds ?? [];
      for (const objId of stageObjs) {
        if (!objToCaps[objId]) objToCaps[objId] = new Set();
        for (const capId of stageCaps) {
          objToCaps[objId].add(capId);
        }
      }
    }
  }

  // Apply to concepts
  for (const concept of Object.values(concepts)) {
    const existing = concept.relatedCapabilities ?? concept.relatedCapabilityIds ?? [];
    const inferred = [...(objToCaps[concept.id] ?? [])];
    if (existing.length === 0 && inferred.length > 0) {
      concept.relatedCapabilities = inferred;
    }
  }
}

// ─── Main normalisation entry points ────────────────────────────────────────

/** Build an empty scaffold shell */
function emptyScaffold(name?: string): ScaffoldData {
  return {
    schemaVersion: "ba-artifact-import-1.0.0",
    scaffoldId: `imported_${Date.now()}`,
    name: name ?? "Imported Artifact",
    elements: {
      valueStreams: {},
      activities: {},
      outcomes: {},
      roles: {},
      capabilities: {},
      controls: {},
      constraints: {},
      metrics: {},
      concepts: {},
    } as unknown as ScaffoldData["elements"],
  };
}

/**
 * Convert a flat concept-model JSON into a ScaffoldData with concepts populated.
 */
export function normaliseConceptModelArtifact(json: Record<string, unknown>): ScaffoldData {
  // If wrapped with { artifactType, name, elements }, unwrap
  const flat = ("elements" in json ? json.elements : json) as Record<string, any>;
  const name = (json.name as string) ?? deriveNameFromElements(flat, "Concept Model");

  const scaffold = emptyScaffold(name);
  scaffold.elements.concepts = normaliseConceptRegistry(flat);
  return scaffold;
}

/**
 * Convert a flat capability-map JSON into a ScaffoldData with capabilities populated.
 */
export function normaliseCapabilityMapArtifact(json: Record<string, unknown>): ScaffoldData {
  const flat = ("elements" in json ? json.elements : json) as Record<string, any>;
  const name = (json.name as string) ?? deriveNameFromElements(flat, "Capability Map");

  const scaffold = emptyScaffold(name);
  scaffold.elements.capabilities = normaliseCapabilityRegistry(flat);
  return scaffold;
}

/**
 * Convert a flat value-stream JSON into a ScaffoldData with valueStreams + activities.
 */
export function normaliseValueStreamArtifact(json: Record<string, unknown>): ScaffoldData {
  const flat = ("elements" in json ? json.elements : json) as Record<string, any>;
  const name = (json.name as string) ?? deriveNameFromElements(flat, "Value Stream");

  const scaffold = emptyScaffold(name);
  const { valueStreams, activities, outcomes } = normaliseValueStreamRegistry(flat);
  scaffold.elements.valueStreams = valueStreams;
  scaffold.elements.activities = activities;
  scaffold.elements.outcomes = { ...scaffold.elements.outcomes, ...outcomes };
  return scaffold;
}

/**
 * Merge a partial scaffold into an existing scaffold. Non-destructive:
 * existing elements are preserved, new elements are added, conflicts
 * are resolved by preferring the new data.
 */
export function mergeScaffolds(existing: ScaffoldData, incoming: ScaffoldData): ScaffoldData {
  const merged = {
    ...existing,
    // Use the incoming name if the existing is a generic import name
    name: existing.name.startsWith("Imported") ? incoming.name : existing.name,
    elements: { ...existing.elements },
  };

  const incomingElements = incoming.elements as Record<string, Record<string, any>>;
  const mergedElements = merged.elements as Record<string, Record<string, any>>;

  for (const [registry, entries] of Object.entries(incomingElements)) {
    if (!entries || typeof entries !== "object") continue;
    if (Object.keys(entries).length === 0) continue;
    mergedElements[registry] = {
      ...(mergedElements[registry] ?? {}),
      ...entries,
    };
  }

  return merged as ScaffoldData;
}

/** Try to derive a reasonable name from the first element in a flat registry */
function deriveNameFromElements(flat: Record<string, any>, fallback: string): string {
  const first = Object.values(flat)[0];
  if (first?.name) {
    // Try to extract a domain prefix — e.g. "Dough to Door" from element naming patterns
    // Not reliably possible, use fallback
  }
  return `Imported ${fallback}`;
}

/** Normalise a PlausibleBA ba-skills-bundle into VCC ScaffoldData */
export function normaliseBundle(bundle: Record<string, unknown>): ScaffoldData {
  const elements = { ...(bundle.elements as Record<string, any>) };

  // 1. valueStreamStages → activities
  if (elements.valueStreamStages && !elements.activities) {
    const stages: Record<string, any> = {};
    for (const [id, stage] of Object.entries(elements.valueStreamStages as Record<string, any>)) {
      const mapped = { ...stage };
      // Rename elementType
      if (mapped.elementType === "ValueStreamStage" || !mapped.elementType) {
        mapped.elementType = "Activity";
      }
      // Normalise field names: capabilities → requiresCapabilityIds, objects → informationObjectIds
      if (mapped.capabilities && !mapped.requiresCapabilityIds) {
        mapped.requiresCapabilityIds = mapped.capabilities;
        delete mapped.capabilities;
      }
      if (mapped.objects && !mapped.informationObjectIds) {
        mapped.informationObjectIds = mapped.objects;
        delete mapped.objects;
      }
      if (mapped.entryCondition && !mapped.entryCriteria) {
        mapped.entryCriteria = mapped.entryCondition;
        delete mapped.entryCondition;
      }
      if (mapped.exitCondition && !mapped.exitCriteria) {
        mapped.exitCriteria = mapped.exitCondition;
        delete mapped.exitCondition;
      }
      // Normalise PPIT entries: processActivities → activities
      if (mapped.capabilityPPIT) {
        const ppit: Record<string, any> = {};
        for (const [capId, entry] of Object.entries(mapped.capabilityPPIT as Record<string, any>)) {
          const mappedEntry = { ...entry };
          if (mappedEntry.processActivities && !mappedEntry.activities) {
            mappedEntry.activities = mappedEntry.processActivities;
            delete mappedEntry.processActivities;
          }
          ppit[capId] = mappedEntry;
        }
        mapped.capabilityPPIT = ppit;
      }
      stages[id] = mapped;
    }
    elements.activities = stages;
    delete elements.valueStreamStages;
  }

  // 2. ValueStream: stageIds → activityIds
  if (elements.valueStreams) {
    const streams: Record<string, any> = {};
    for (const [id, vs] of Object.entries(elements.valueStreams as Record<string, any>)) {
      const mapped = { ...vs };
      if (mapped.stageIds && !mapped.activityIds) {
        mapped.activityIds = mapped.stageIds;
        delete mapped.stageIds;
      }
      // Handle stages[] — could be array of string IDs or inline objects
      if (mapped.stages && Array.isArray(mapped.stages) && !mapped.activityIds) {
        if (mapped.stages.length > 0 && typeof mapped.stages[0] === "string") {
          // Array of string IDs referencing valueStreamStages/activities — just rename
          mapped.activityIds = mapped.stages;
        } else {
          // Inline stage objects — flatten into activities
          const activityIds: string[] = [];
          for (const stage of mapped.stages) {
            const stgId = stage.id ?? `stg_${id}_${stage.number}`;
            activityIds.push(stgId);
            if (!elements.activities) elements.activities = {};
            elements.activities[stgId] = {
              id: stgId,
              elementType: "Activity",
              name: stage.name,
              description: stage.entryCriteria ? `Entry: ${stage.entryCriteria}` : "",
              requiresCapabilityIds: stage.capabilities ?? [],
              valueObjectState: stage.valueObjectState,
              entryCriteria: stage.entryCriteria,
              exitCriteria: stage.exitCriteria,
              objects: stage.objects ?? [],
            };
          }
          mapped.activityIds = activityIds;
        }
        delete mapped.stages;
      }
      streams[id] = mapped;
    }
    elements.valueStreams = streams;
  }

  // 2b. Pattern 3: resolve activityIds from activities that reference VS via valueStreamId
  // When a value stream has no activityIds/stageIds/stages, collect activities that
  // point back to it via valueStreamId, sorted by their stage number.
  if (elements.valueStreams && elements.activities) {
    for (const [vsId, vs] of Object.entries(elements.valueStreams as Record<string, any>)) {
      if (!vs.activityIds || vs.activityIds.length === 0) {
        const matching = Object.values(elements.activities as Record<string, any>)
          .filter((a: any) => a.valueStreamId === vsId || a.valueStreamId === vs.id)
          .sort((a: any, b: any) => (a.number ?? 0) - (b.number ?? 0));
        if (matching.length > 0) {
          vs.activityIds = matching.map((a: any) => a.id);
        }
      }
    }
  }

  // 3. Normalise concepts if present (BusinessObject → Concept)
  if (elements.concepts) {
    const normalised: Record<string, any> = {};
    for (const [id, obj] of Object.entries(elements.concepts as Record<string, any>)) {
      if (obj.elementType === "BusinessObject" && obj.type && !obj.subclass) {
        normalised[id] = {
          ...obj,
          elementType: "Concept",
          subclass: mapConceptSubclass(obj.type),
          definition: obj.definition ?? obj.description ?? "",
          lifecycleStates: obj.lifecycleStates ?? [],
          relationships: (obj.relatedObjects ?? []).map((rel: any) => ({
            targetId: rel.objectId,
            type: rel.relationship?.toLowerCase() === "composition" ? "part-of" : "relates-to",
            label: rel.label ?? "",
          })),
        };
      } else {
        normalised[id] = obj;
      }
    }
    elements.concepts = normalised;
  }

  // 4. Normalise capability levels: "L1"/"L2"/"L3" → 1/2/3, and parent → parentId
  if (elements.capabilities && Object.keys(elements.capabilities).length > 0) {
    elements.capabilities = normaliseCapabilityRegistry(elements.capabilities);
    // Map parent → parentId for all caps
    for (const cap of Object.values(elements.capabilities as Record<string, any>)) {
      if (cap.parent && !cap.parentId) {
        cap.parentId = cap.parent;
        delete cap.parent;
      }
    }
    // Auto-generate missing L1/L2 entries from parent references
    elements.capabilities = generateMissingHierarchy(elements.capabilities);
  }

  // 4b. Infer relatedCapabilities on concepts from capabilities + stage co-occurrence
  if (elements.concepts && elements.capabilities) {
    inferConceptCapabilityLinks(
      elements.concepts as Record<string, any>,
      elements.capabilities as Record<string, any>,
      (elements.activities ?? elements.valueStreamStages) as Record<string, any> | undefined,
    );
  }

  // 5½. Ensure registries that VCC expects exist (even if empty)
  elements.controls = elements.controls ?? {};
  elements.constraints = elements.constraints ?? {};
  elements.metrics = elements.metrics ?? {};
  elements.roles = elements.roles ?? {};
  elements.capabilities = elements.capabilities ?? {};
  elements.outcomes = elements.outcomes ?? {};
  elements.activities = elements.activities ?? {};
  elements.valueStreams = elements.valueStreams ?? {};
  elements.concepts = elements.concepts ?? {};

  // 5. Build the ScaffoldData envelope
  const meta = bundle.meta as Record<string, any> | undefined;
  const scaffold: ScaffoldData = {
    schemaVersion: `ba-bundle-${meta?.bundleVersion ?? "1.0.0"}`,
    scaffoldId: (bundle.scaffoldId as string) ?? (meta?.scaffoldId as string) ?? "imported",
    name: (bundle.name as string) ?? (meta?.name as string) ?? "Imported Bundle",
    description: bundle.description as string | undefined,
    elements: elements as unknown as ScaffoldData["elements"],
  };

  return scaffold;
}
