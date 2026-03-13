/**
 * bundle-import.ts — Normalises a PlausibleBA ba-skills-bundle into VCC's
 * internal ScaffoldData shape.
 *
 * The ba-skills-bundle schema uses metamodel-aligned naming:
 *   elements.valueStreamStages  → VCC elements.activities
 *   ValueStream.stageIds        → VCC ValueStream.activityIds
 *   PPITEntry.processActivities → VCC PPITEntry.activities
 *   elementType: "ValueStreamStage" → VCC "Activity"
 *
 * This mapper runs at the import boundary so the rest of the VCC codebase
 * can continue using its existing naming internally.
 */

import type { ScaffoldData } from "../types.ts";

/** Detect whether a parsed JSON object is a PlausibleBA bundle */
export function isPlausibleBABundle(json: Record<string, unknown>): boolean {
  const meta = json.meta as Record<string, unknown> | undefined;
  return (
    !!meta?.bundleVersion &&
    "scaffoldId" in json &&
    "elements" in json &&
    !("schemaVersion" in json) // VCC-native scaffolds have schemaVersion
  );
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
      streams[id] = mapped;
    }
    elements.valueStreams = streams;
  }

  // 3. Ensure registries that VCC expects exist (even if empty)
  elements.controls = elements.controls ?? {};
  elements.constraints = elements.constraints ?? {};
  elements.metrics = elements.metrics ?? {};
  elements.roles = elements.roles ?? {};
  elements.capabilities = elements.capabilities ?? {};
  elements.outcomes = elements.outcomes ?? {};

  // 4. Map concepts → informationObjects if VCC doesn't have them yet
  //    (PlausibleBA concepts include Party/Record/Resource — VCC uses
  //     informationObjects for Record/Resource and roles for Party)
  if (elements.concepts && !elements.recordClasses) {
    // Preserve concepts registry for future use, VCC will ignore it for now
  }

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
