import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createExportBundle,
  packBundle,
  type ScaffoldInput,
  type HeatmapInput,
} from "@vcc/shared";
import { readJsonFile, writeJsonFile } from "../utils/fs-helpers.js";

export async function bundleCommand(runDir: string): Promise<void> {
  const assembledDir = join(runDir, "assembled");
  const distDir = join(runDir, "dist");

  // --- 1. Read assembled scaffold ---
  const scaffoldPath = join(assembledDir, "ScaffoldModel.json");
  const rawScaffold = await readJsonFile<
    ScaffoldInput & { _assemblyMetadata?: unknown }
  >(scaffoldPath);

  // Strip _assemblyMetadata for export (schema has additionalProperties: false)
  const { _assemblyMetadata, ...scaffold } = rawScaffold;

  // --- 2. Read optional heatmap ---
  let heatmap: HeatmapInput | undefined;
  try {
    heatmap = await readJsonFile<HeatmapInput>(
      join(assembledDir, "FrictionHeatmap.json"),
    );
  } catch {
    // No heatmap — that's fine
  }

  // --- 3. Create bundle ---
  const { metadata, files } = createExportBundle(
    scaffold,
    heatmap,
    undefined, // no canvas view
    undefined, // no validation report
    { createdBy: "VCC CLI" },
  );

  // --- 4. Pack ZIP ---
  const zipBuffer = await packBundle(metadata, files);

  // --- 5. Write outputs ---
  const zipPath = join(distDir, "export.zip");
  const manifestPath = join(distDir, "manifest.json");

  await writeFile(zipPath, zipBuffer);
  await writeJsonFile(manifestPath, metadata);

  console.log(`Bundle written to ${zipPath} (${zipBuffer.length} bytes)`);
  console.log(`Manifest written to ${manifestPath}`);
}
