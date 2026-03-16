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
    "scaffoldId" in json &&
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
    (v) => v && typeof v === "object" && !Array.isArray(v) && "elementType" in (v as any)
  );
  if (typed.length === 0) return "unknown";

  // Sample the elementTypes to classify
  const elementTypes = new Set(typed.map((v) => (v as any).elementType));

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
  (scaffold.elements as any).concepts = normaliseConceptRegistry(flat);
  return scaffold;
}

/**
 * Convert a flat capability-map JSON into a ScaffoldData with capabilities populated.
 */
export function normaliseCapabilityMapArtifact(json: Record<string, unknown>): ScaffoldData {
  const flat = ("elements" in json ? json.elements : json) as Record<string, any>;
  const name = (json.name as string) ?? deriveNameFromElements(flat, "Capability Map");

  const scaffold = emptyScaffold(name);
  (scaffold.elements as any).capabilities = { ...flat };
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
  (scaffold.elements as any).valueStreams = valueStreams;
  (scaffold.elements as any).activities = activities;
  (scaffold.elements as any).outcomes = { ...(scaffold.elements as any).outcomes, ...outcomes };
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
      if (mapped.elementType === "ValueStreamStage") {
        mapped.elementType = "Activity";
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
      // Also handle inline stages[] from newer PlausibleBA exports
      if (mapped.stages && Array.isArray(mapped.stages) && !mapped.activityIds) {
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
        delete mapped.stages;
      }
      streams[id] = mapped;
    }
    elements.valueStreams = streams;
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

  // 4. Ensure registries that VCC expects exist (even if empty)
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
    scaffoldId: (bundle.scaffoldId as string) ?? "imported",
    name: (bundle.name as string) ?? "Imported Bundle",
    description: bundle.description as string | undefined,
    elements: elements as unknown as ScaffoldData["elements"],
  };

  return scaffold;
}
