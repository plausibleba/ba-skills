import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "..", "cli.ts");
const GOLDEN_SCAFFOLD = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "fixtures",
  "golden",
  "scaffold.json",
);

function run(args: string, cwd?: string): string {
  return execSync(`npx tsx ${CLI} ${args}`, {
    cwd,
    encoding: "utf-8",
    timeout: 30_000,
  });
}

/**
 * Split the golden scaffold into numbered fragment files.
 * Also creates a controls_mapping.json that assigns controlIds to activities.
 */
function splitGoldenIntoFragments(dir: string): void {
  const scaffold = JSON.parse(readFileSync(GOLDEN_SCAFFOLD, "utf-8"));
  const el = scaffold.elements;

  // Write element maps as individual fragment files
  writeFileSync(
    join(dir, "03_roles.json"),
    JSON.stringify(el.roles, null, 2),
  );
  writeFileSync(
    join(dir, "04_capabilities.json"),
    JSON.stringify(el.capabilities, null, 2),
  );
  writeFileSync(
    join(dir, "05_outcomes.json"),
    JSON.stringify(el.outcomes, null, 2),
  );

  // Write activities WITHOUT controlIds, metricIds, conditions — those come from mappings
  const bareActivities: Record<string, Record<string, unknown>> = {};
  for (const [id, act] of Object.entries(el.activities)) {
    const a = act as Record<string, unknown>;
    bareActivities[id] = {
      ...a,
      controlIds: [],
      metricIds: [],
      entryConditionIds: a.entryConditionIds ?? [],
      exitConditionIds: a.exitConditionIds ?? [],
    };
  }
  writeFileSync(
    join(dir, "06_activities.json"),
    JSON.stringify(bareActivities, null, 2),
  );

  writeFileSync(
    join(dir, "07_controls.json"),
    JSON.stringify(el.controls, null, 2),
  );
  writeFileSync(
    join(dir, "08_metrics.json"),
    JSON.stringify(el.metrics, null, 2),
  );
  writeFileSync(
    join(dir, "08_measures.json"),
    JSON.stringify(el.measures, null, 2),
  );
  writeFileSync(
    join(dir, "09_conditions.json"),
    JSON.stringify(el.conditions, null, 2),
  );

  // Create mapping files that restore the original controlIds and metricIds
  const controlPatches: Array<{
    target: { elementType: string; id: string };
    op: string;
    path: string;
    values: string[];
  }> = [];
  const metricPatches: Array<{
    target: { elementType: string; id: string };
    op: string;
    path: string;
    values: string[];
  }> = [];
  const conditionPatches: Array<{
    target: { elementType: string; id: string };
    op: string;
    path: string;
    values: string[];
  }> = [];

  for (const [id, act] of Object.entries(el.activities)) {
    const a = act as Record<string, unknown>;
    const cids = a.controlIds as string[] | undefined;
    if (cids && cids.length > 0) {
      controlPatches.push({
        target: { elementType: "Activity", id },
        op: "add",
        path: "controlIds",
        values: cids,
      });
    }
    const mids = a.metricIds as string[] | undefined;
    if (mids && mids.length > 0) {
      metricPatches.push({
        target: { elementType: "Activity", id },
        op: "add",
        path: "metricIds",
        values: mids,
      });
    }
    const entryIds = a.entryConditionIds as string[] | undefined;
    const exitIds = a.exitConditionIds as string[] | undefined;
    if (entryIds && entryIds.length > 0) {
      conditionPatches.push({
        target: { elementType: "Activity", id },
        op: "add",
        path: "entryConditionIds",
        values: entryIds,
      });
    }
    if (exitIds && exitIds.length > 0) {
      conditionPatches.push({
        target: { elementType: "Activity", id },
        op: "add",
        path: "exitConditionIds",
        values: exitIds,
      });
    }
  }

  writeFileSync(
    join(dir, "controls_mapping.json"),
    JSON.stringify(
      {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        patches: controlPatches,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(dir, "metrics_mapping.json"),
    JSON.stringify(
      {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        patches: metricPatches,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(dir, "conditions_mapping.json"),
    JSON.stringify(
      {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        patches: conditionPatches,
      },
      null,
      2,
    ),
  );

  // Write valuestream_config.json
  const vs = Object.values(el.valueStreams)[0] as Record<string, unknown>;
  writeFileSync(
    join(dir, "valuestream_config.json"),
    JSON.stringify(
      {
        valueStreamId: vs.id,
        name: vs.name,
        description: vs.description,
        scaffoldId: scaffold.scaffoldId,
      },
      null,
      2,
    ),
  );
}

describe("vcc CLI", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "vcc-cli-test-"));
  });

  it("init creates correct folder structure and run.json", () => {
    const output = run(`init test-engagement`, tmp);
    expect(output).toContain("Initialised run:");

    // Find the run directory
    const runsDir = join(tmp, "runs", "test-engagement");
    expect(existsSync(runsDir)).toBe(true);

    const entries = require("node:fs").readdirSync(runsDir) as string[];
    expect(entries.length).toBe(1);

    const runDir = join(runsDir, entries[0]);
    expect(existsSync(join(runDir, "run.json"))).toBe(true);
    expect(existsSync(join(runDir, "fragments"))).toBe(true);
    expect(existsSync(join(runDir, "assembled"))).toBe(true);
    expect(existsSync(join(runDir, "dist"))).toBe(true);

    const runJson = JSON.parse(
      readFileSync(join(runDir, "run.json"), "utf-8"),
    );
    expect(runJson.engagement).toBe("test-engagement");
    expect(runJson.packVersion).toBe("0.1.0");
  });

  it("validate scaffold golden → Valid", () => {
    const output = run(`validate scaffold ${GOLDEN_SCAFFOLD}`);
    expect(output).toContain("OK");
  });

  it("validate scaffold broken → Invalid with error codes", () => {
    // Create a broken scaffold: missing outcome reference
    const scaffold = JSON.parse(readFileSync(GOLDEN_SCAFFOLD, "utf-8"));
    delete scaffold.elements.outcomes.outcome_risk_case_initiated;
    const brokenPath = join(tmp, "broken.json");
    writeFileSync(brokenPath, JSON.stringify(scaffold, null, 2));

    try {
      run(`validate scaffold ${brokenPath}`);
      expect.fail("Should have exited with error");
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string };
      const output = (err.stdout ?? "") + (err.stderr ?? "");
      expect(output).toContain("FAIL");
    }
  });

  it("validate mappings valid → passes", () => {
    const fragDir = join(tmp, "fragments");
    mkdirSync(fragDir, { recursive: true });
    splitGoldenIntoFragments(fragDir);

    const output = run(
      `validate mappings ${fragDir} ${join(fragDir, "controls_mapping.json")}`,
    );
    expect(output).toContain("OK");
  });

  it("validate mappings invalid ref → fails", () => {
    const fragDir = join(tmp, "fragments");
    mkdirSync(fragDir, { recursive: true });
    splitGoldenIntoFragments(fragDir);

    // Create a mapping with a bogus target
    const badMapping = {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      patches: [
        {
          target: { elementType: "Activity", id: "act_nonexistent" },
          op: "add",
          path: "controlIds",
          values: ["ctrl_data_quality_gate"],
        },
      ],
    };
    const badPath = join(fragDir, "bad_mapping.json");
    writeFileSync(badPath, JSON.stringify(badMapping, null, 2));

    try {
      run(`validate mappings ${fragDir} ${badPath}`);
      expect.fail("Should have exited with error");
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string };
      const output = (err.stdout ?? "") + (err.stderr ?? "");
      expect(output).toContain("act_nonexistent");
    }
  });

  it("assemble golden fragments → valid ScaffoldModel.json", () => {
    // Set up run directory structure
    const runDir = join(tmp, "run");
    const fragDir = join(runDir, "fragments");
    const assembledDir = join(runDir, "assembled");
    const distDir = join(runDir, "dist");
    mkdirSync(fragDir, { recursive: true });
    mkdirSync(assembledDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });

    splitGoldenIntoFragments(fragDir);

    const output = run(`assemble ${runDir}`);
    expect(output).toContain("OK");
    expect(output).toContain("Assembled scaffold written to");

    const outPath = join(assembledDir, "ScaffoldModel.json");
    expect(existsSync(outPath)).toBe(true);

    // The assembled scaffold should be valid
    const assembled = JSON.parse(readFileSync(outPath, "utf-8"));
    expect(assembled.scaffoldId).toBe("scaffold_credit_risk_v5");
    expect(assembled.elements.activities).toBeDefined();
  });

  it("assemble output has _assemblyMetadata", () => {
    const runDir = join(tmp, "run");
    const fragDir = join(runDir, "fragments");
    const assembledDir = join(runDir, "assembled");
    const distDir = join(runDir, "dist");
    mkdirSync(fragDir, { recursive: true });
    mkdirSync(assembledDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });

    splitGoldenIntoFragments(fragDir);
    run(`assemble ${runDir}`);

    const outPath = join(assembledDir, "ScaffoldModel.json");
    const assembled = JSON.parse(readFileSync(outPath, "utf-8"));

    expect(assembled._assemblyMetadata).toBeDefined();
    expect(assembled._assemblyMetadata.assembledAt).toBeDefined();
    expect(assembled._assemblyMetadata.mappingsApplied).toBeInstanceOf(Array);
    expect(assembled._assemblyMetadata.mappingsApplied.length).toBeGreaterThan(0);
    expect(assembled._assemblyMetadata.fragmentHashes).toBeDefined();
  });

  it("bundle → ZIP + manifest exist", () => {
    const runDir = join(tmp, "run");
    const fragDir = join(runDir, "fragments");
    const assembledDir = join(runDir, "assembled");
    const distDir = join(runDir, "dist");
    mkdirSync(fragDir, { recursive: true });
    mkdirSync(assembledDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });

    splitGoldenIntoFragments(fragDir);
    run(`assemble ${runDir}`);
    const output = run(`bundle ${runDir}`);

    expect(output).toContain("Bundle written to");
    expect(output).toContain("Manifest written to");

    expect(existsSync(join(distDir, "export.zip"))).toBe(true);
    expect(existsSync(join(distDir, "manifest.json"))).toBe(true);

    const manifest = JSON.parse(
      readFileSync(join(distDir, "manifest.json"), "utf-8"),
    );
    expect(manifest.bundleId).toBeDefined();
    expect(manifest.integrity.bundleSha256).toBeDefined();
    expect(manifest.integrity.scaffoldIntegrityHash).toBeDefined();
  });
});
