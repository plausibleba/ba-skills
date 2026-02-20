import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import {
  validate,
  validateSemantic,
  type ScaffoldInput,
  type HeatmapInput,
  type ScaffoldElements,
} from "@vcc/shared";
import { readJsonFile } from "../utils/fs-helpers.js";
import { formatFindings, formatSummary } from "../utils/format.js";
import type { MappingFile } from "../types.js";

const EMPTY_ELEMENTS: ScaffoldElements = {
  valueStreams: {},
  activities: {},
  outcomes: {},
  roles: {},
  capabilities: {},
  controls: {},
  constraints: {},
  directives: {},
  deonticLogic: {},
  flowLogic: {},
  concepts: {},
  properties: {},
  metrics: {},
  measures: {},
  conditions: {},
};

const SCAFFOLD_RULES = new Set([
  "V-SCAFFOLD-01",
  "V-SCAFFOLD-02",
  "V-SCAFFOLD-03",
  "V-SCAFFOLD-07",
  "V-SCAFFOLD-08",
]);

async function validateFragments(fragmentsDir: string): Promise<boolean> {
  const files = (await readdir(fragmentsDir)).filter(
    (f) => extname(f) === ".json",
  );

  if (files.length === 0) {
    console.log("No fragment files found in", fragmentsDir);
    return true;
  }

  // Parse all fragments
  const fragments = new Map<string, Record<string, unknown>>();
  for (const f of files) {
    const data = await readJsonFile<Record<string, unknown>>(
      join(fragmentsDir, f),
    );
    fragments.set(f, data);
  }
  console.log(`Parsed ${fragments.size} fragment file(s)`);

  // Build partial scaffold with whatever elements are present
  const elements: ScaffoldElements = { ...EMPTY_ELEMENTS };

  for (const [filename, data] of fragments) {
    // Detect element type from filename convention or content
    const lower = filename.toLowerCase();
    if (lower.includes("role")) {
      Object.assign(elements.roles, data);
    } else if (lower.includes("capabilit")) {
      Object.assign(elements.capabilities, data);
    } else if (lower.includes("outcome")) {
      Object.assign(elements.outcomes, data);
    } else if (lower.includes("activit")) {
      Object.assign(elements.activities, data);
    } else if (lower.includes("control")) {
      Object.assign(elements.controls, data);
    } else if (lower.includes("metric") && !lower.includes("measure")) {
      Object.assign(elements.metrics, data);
    } else if (lower.includes("measure")) {
      Object.assign(elements.measures, data);
    } else if (lower.includes("condition")) {
      Object.assign(elements.conditions, data);
    } else if (lower.includes("constraint")) {
      Object.assign(elements.constraints, data);
    }
  }

  const partial: ScaffoldInput = {
    scaffoldId: "fragment-check",
    name: "Fragment Validation",
    schemaVersion: "1.0.0",
    elements,
  };

  const report = validateSemantic(partial);
  const filtered = report.findings.filter((f) => SCAFFOLD_RULES.has(f.ruleId));

  if (filtered.length === 0) {
    console.log("OK Fragment gate-1 checks passed");
    return true;
  }

  console.log(`Fragment gate-1: ${filtered.length} finding(s)`);
  console.log(formatFindings(filtered));
  return filtered.every((f) => f.severity !== "Error");
}

async function validateMappings(
  fragmentsDir: string,
  mappingFiles: string[],
): Promise<boolean> {
  // Load fragment files for cross-reference
  const fragFiles = (await readdir(fragmentsDir)).filter(
    (f) => extname(f) === ".json",
  );
  const allFragmentData = new Map<string, Record<string, unknown>>();
  for (const f of fragFiles) {
    const data = await readJsonFile<Record<string, unknown>>(
      join(fragmentsDir, f),
    );
    for (const [id, val] of Object.entries(data)) {
      allFragmentData.set(id, val as Record<string, unknown>);
    }
  }

  let valid = true;

  for (const mf of mappingFiles) {
    const mapping = await readJsonFile<MappingFile>(mf);
    console.log(`Checking mapping: ${mf} (${mapping.patches.length} patches)`);

    for (const patch of mapping.patches) {
      // Check that target element exists in fragments
      if (!allFragmentData.has(patch.target.id)) {
        console.log(
          `  [x] Patch target '${patch.target.id}' (${patch.target.elementType}) not found in fragments`,
        );
        valid = false;
      }

      // Check that patch values reference existing elements (where applicable)
      for (const val of patch.values) {
        if (
          patch.path.endsWith("Ids") &&
          !allFragmentData.has(val)
        ) {
          console.log(
            `  [x] Patch value '${val}' on ${patch.target.id}.${patch.path} not found in fragments`,
          );
          valid = false;
        }
      }
    }
  }

  if (valid) {
    console.log("OK Mapping cross-references valid");
  }
  return valid;
}

async function validateScaffold(filePath: string): Promise<boolean> {
  const data = await readJsonFile<unknown>(filePath);
  const report = validate(data);

  console.log(formatSummary(report));
  if (report.findings.length > 0) {
    console.log(formatFindings(report.findings));
  }
  return report.status !== "Invalid";
}

async function validateHeatmap(
  scaffoldPath: string,
  heatmapPath: string,
): Promise<boolean> {
  const scaffold = await readJsonFile<unknown>(scaffoldPath);
  const heatmap = await readJsonFile<unknown>(heatmapPath);
  const report = validate(scaffold, heatmap);

  console.log(formatSummary(report));
  if (report.findings.length > 0) {
    console.log(formatFindings(report.findings));
  }
  return report.status !== "Invalid";
}

export async function validateCommand(
  target: string,
  files: string[],
): Promise<void> {
  let success = false;

  switch (target) {
    case "fragments":
      success = await validateFragments(files[0] ?? "fragments");
      break;
    case "mappings":
      success = await validateMappings(
        files[0] ?? "fragments",
        files.slice(1),
      );
      break;
    case "scaffold":
      if (!files[0]) {
        console.error("Usage: vcc validate scaffold <file>");
        process.exit(1);
      }
      success = await validateScaffold(files[0]);
      break;
    case "heatmap":
      if (!files[0] || !files[1]) {
        console.error("Usage: vcc validate heatmap <scaffold> <heatmap>");
        process.exit(1);
      }
      success = await validateHeatmap(files[0], files[1]);
      break;
    default:
      console.error(`Unknown validate target: ${target}`);
      process.exit(1);
  }

  if (!success) {
    process.exit(1);
  }
}
