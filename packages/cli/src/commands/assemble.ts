import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import {
  validate,
  computeScaffoldHash,
  type ScaffoldInput,
  type ScaffoldElements,
} from "@vcc/shared";
import { readJsonFile, writeJsonFile, sha256File } from "../utils/fs-helpers.js";
import { formatFindings, formatSummary } from "../utils/format.js";
import type { MappingFile, Patch, ValueStreamConfig } from "../types.js";

type ElementMap = Record<string, Record<string, unknown>>;

function readFragment(dir: string, filename: string): Promise<ElementMap> {
  return readJsonFile<ElementMap>(join(dir, filename));
}

async function readOptionalFragment(
  dir: string,
  filename: string,
): Promise<ElementMap> {
  try {
    return await readFragment(dir, filename);
  } catch {
    return {};
  }
}

/** Apply a single patch to the activities map (mutates clone). */
function applyPatch(
  activities: Record<string, Record<string, unknown>>,
  patch: Patch,
): void {
  const act = activities[patch.target.id];
  if (!act) {
    throw new Error(
      `Patch target activity '${patch.target.id}' not found`,
    );
  }

  const current = (act[patch.path] as string[] | undefined) ?? [];

  if (patch.op === "set") {
    act[patch.path] = [...patch.values];
  } else {
    // "add" — append and dedupe
    const merged = [...current];
    for (const v of patch.values) {
      if (!merged.includes(v)) {
        merged.push(v);
      }
    }
    act[patch.path] = merged;
  }
}

/** Find the chain head: the activity not referenced by any other's nextActivityId. */
function findChainHead(
  activities: Record<string, Record<string, unknown>>,
  activityIds: string[],
): string {
  const referenced = new Set<string>();
  for (const id of activityIds) {
    const next = activities[id]?.nextActivityId;
    if (typeof next === "string") {
      referenced.add(next);
    }
  }
  const heads = activityIds.filter((id) => !referenced.has(id));
  if (heads.length === 0) {
    throw new Error("Cannot determine chain head: all activities are referenced by another");
  }
  return heads[0];
}

/** Walk the chain from head, return ordered activity IDs. */
function walkChain(
  activities: Record<string, Record<string, unknown>>,
  head: string,
): string[] {
  const ordered: string[] = [];
  const visited = new Set<string>();
  let current: string | null = head;

  while (current != null) {
    if (visited.has(current)) break;
    visited.add(current);
    ordered.push(current);
    const next = activities[current]?.nextActivityId;
    current = typeof next === "string" ? next : null;
  }

  return ordered;
}

export async function assembleCommand(runDir: string): Promise<void> {
  const fragDir = join(runDir, "fragments");
  const assembledDir = join(runDir, "assembled");

  // --- 1. Read required fragments ---
  const files = (await readdir(fragDir)).filter(
    (f) => extname(f) === ".json" && !f.endsWith("_mapping.json"),
  );
  files.sort();

  console.log(`Reading fragments from ${fragDir} (${files.length} files)`);

  const roles: ElementMap = {};
  const capabilities: ElementMap = {};
  const outcomes: ElementMap = {};
  const activities: ElementMap = {};
  const controls: ElementMap = {};
  const metrics: ElementMap = {};
  const measures: ElementMap = {};
  const conditions: ElementMap = {};

  for (const f of files) {
    const data = await readFragment(fragDir, f);
    const lower = f.toLowerCase();

    if (lower.includes("role")) {
      Object.assign(roles, data);
    } else if (lower.includes("capabilit")) {
      Object.assign(capabilities, data);
    } else if (lower.includes("outcome")) {
      Object.assign(outcomes, data);
    } else if (lower.includes("activit")) {
      Object.assign(activities, data);
    } else if (lower.includes("control")) {
      Object.assign(controls, data);
    } else if (lower.includes("metric") && !lower.includes("measure")) {
      Object.assign(metrics, data);
    } else if (lower.includes("measure")) {
      Object.assign(measures, data);
    } else if (lower.includes("condition")) {
      Object.assign(conditions, data);
    }
  }

  // --- 2. Clone activities for mutation ---
  const actClone: Record<string, Record<string, unknown>> = structuredClone(activities);

  // --- 3. Read and apply mappings ---
  const mappingFiles = (await readdir(fragDir)).filter((f) =>
    f.endsWith("_mapping.json"),
  );
  mappingFiles.sort();

  const mappingsApplied: Array<{
    file: string;
    sha256: string;
    patchCount: number;
  }> = [];

  for (const mf of mappingFiles) {
    const mapping = await readJsonFile<MappingFile>(join(fragDir, mf));
    const hash = await sha256File(join(fragDir, mf));

    for (const patch of mapping.patches) {
      applyPatch(actClone, patch);
    }

    mappingsApplied.push({
      file: mf,
      sha256: hash,
      patchCount: mapping.patches.length,
    });
    console.log(`  Applied mapping: ${mf} (${mapping.patches.length} patches)`);
  }

  // --- 4. Read optional valuestream_config.json ---
  let vsConfig: ValueStreamConfig;
  try {
    vsConfig = await readJsonFile<ValueStreamConfig>(
      join(fragDir, "valuestream_config.json"),
    );
  } catch {
    vsConfig = {};
  }

  // --- 5. Build ValueStream from chain ---
  const activityIdList = Object.keys(actClone);
  const head = findChainHead(actClone, activityIdList);
  const orderedIds = walkChain(actClone, head);

  const vsId =
    vsConfig.valueStreamId ?? "vs_assembled";

  const valueStream: Record<string, unknown> = {
    id: vsId,
    elementType: "ValueStream",
    name: vsConfig.name ?? "Assembled Value Stream",
    description: vsConfig.description ?? "",
    activityIds: orderedIds,
    capabilityIds: Object.keys(capabilities),
    metricIds: Object.keys(metrics),
  };

  // --- 6. Compose full ScaffoldModel ---
  const scaffoldId = vsConfig.scaffoldId ?? "scaffold_assembled";

  const elements: ScaffoldElements = {
    valueStreams: { [vsId]: valueStream },
    activities: actClone,
    outcomes,
    roles,
    capabilities,
    controls,
    constraints: {},
    directives: {},
    deonticLogic: {},
    flowLogic: {},
    concepts: {},
    properties: {},
    metrics,
    measures,
    conditions,
  } as unknown as ScaffoldElements;

  const scaffold: ScaffoldInput & { createdAt: string; description?: string } = {
    schemaVersion: "1.0.0",
    scaffoldId,
    name: vsConfig.name ?? "Assembled Scaffold",
    description: vsConfig.description ?? "",
    createdAt: new Date().toISOString(),
    elements,
  };

  // --- 7. Compute integrity hash ---
  const modelIntegrityHash = computeScaffoldHash(scaffold);
  scaffold.modelIntegrityHash = modelIntegrityHash;

  // --- 8. Validate ---
  const report = validate(scaffold);
  console.log(formatSummary(report));

  if (report.status === "Invalid") {
    console.log(formatFindings(report.findings));
    process.exit(1);
  }

  if (report.findings.length > 0) {
    console.log(formatFindings(report.findings));
  }

  // --- 9. Add assembly metadata and write ---
  const fragmentHashes: Record<string, string> = {};
  for (const f of files) {
    fragmentHashes[f] = await sha256File(join(fragDir, f));
  }

  const output = {
    ...scaffold,
    _assemblyMetadata: {
      assembledAt: new Date().toISOString(),
      mappingsApplied,
      fragmentHashes,
    },
  };

  const outPath = join(assembledDir, "ScaffoldModel.json");
  await writeJsonFile(outPath, output);

  console.log(`Assembled scaffold written to ${outPath}`);
}
