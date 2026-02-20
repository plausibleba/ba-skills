import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalStringify } from "../utils/canonical-json.js";
import type { RunJson } from "../types.js";

export async function initCommand(engagement: string): Promise<void> {
  const now = new Date();
  const runId = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const runDir = join("runs", engagement, runId);
  const dirs = [
    join(runDir, "fragments"),
    join(runDir, "assembled"),
    join(runDir, "dist"),
  ];

  for (const d of dirs) {
    await mkdir(d, { recursive: true });
  }

  const runJson: RunJson = {
    engagement,
    runId,
    packVersion: "0.1.0",
    createdAt: now.toISOString(),
    operator: "",
    notes: "",
    sources: [],
  };

  await writeFile(
    join(runDir, "run.json"),
    canonicalStringify(runJson) + "\n",
    "utf-8",
  );

  console.log(`Initialised run: ${runDir}`);
}
