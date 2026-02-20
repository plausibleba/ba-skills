import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  createExportBundle,
  packBundle,
  unpackBundle,
  validateImportBundle,
} from "../export-bundle.js";
import { generateCanvasViewModel } from "../canvas-generator.js";
import { validate, computeScaffoldHash } from "../validator.js";
import type { ScaffoldInput, HeatmapInput } from "../validator.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const GOLDEN_DIR = resolve(__dirname, "../../../../fixtures/golden");

const goldenScaffold: ScaffoldInput = JSON.parse(
  readFileSync(resolve(GOLDEN_DIR, "scaffold.json"), "utf-8"),
) as ScaffoldInput;

const goldenHeatmap: HeatmapInput = JSON.parse(
  readFileSync(resolve(GOLDEN_DIR, "heatmap.json"), "utf-8"),
) as HeatmapInput;

const VS_ID = "vs_credit_risk_assessment_mgmt";

describe("createExportBundle", () => {
  const canvas = generateCanvasViewModel(goldenScaffold, VS_ID);
  const report = validate(goldenScaffold, goldenHeatmap);
  const { metadata, files } = createExportBundle(
    goldenScaffold,
    goldenHeatmap,
    canvas,
    report,
    { createdBy: "test-suite", notes: "Unit test bundle" },
  );

  it("metadata has required fields", () => {
    expect(metadata.schemaVersion).toBe("1.0.0");
    expect(metadata.bundleFormatVersion).toBe("1.0");
    expect(metadata.bundleId).toBeTruthy();
    expect(metadata.createdAt).toBeTruthy();
    expect(metadata.createdBy).toBe("test-suite");
    expect(metadata.notes).toBe("Unit test bundle");
  });

  it("files map contains all 4 data artifacts", () => {
    expect(files.has("data/scaffold.json")).toBe(true);
    expect(files.has("data/heatmap.json")).toBe(true);
    expect(files.has("data/canvas.json")).toBe(true);
    expect(files.has("data/validation.json")).toBe(true);
    expect(files.size).toBe(4);
  });

  it("artifact SHA-256 hashes match file contents", () => {
    for (const [_key, ref] of Object.entries(metadata.artifacts)) {
      const artRef = ref as { path: string; sha256: string; bytes: number };
      const data = files.get(artRef.path)!;
      const computed = createHash("sha256").update(data).digest("hex");
      expect(artRef.sha256).toBe(computed);
      expect(artRef.bytes).toBe(data.length);
    }
  });

  it("bundleSha256 is a valid 64-char hex string", () => {
    expect(metadata.integrity.bundleSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("scaffoldIntegrityHash matches computed hash", () => {
    const expected = computeScaffoldHash(goldenScaffold);
    expect(metadata.integrity.scaffoldIntegrityHash).toBe(expected);
  });

  it("crossReferences contain correct IDs", () => {
    const refs = metadata.integrity.crossReferences;
    expect(refs.scaffoldId).toBe(goldenScaffold.scaffoldId);
    expect(refs.valueStreamId).toBe(VS_ID);
    expect(refs.canvasViewId).toBe(canvas.viewId);
    expect(refs.heatmapId).toBe(goldenHeatmap.heatmapId);
    expect(refs.validationReportId).toBe(report.reportId);
  });
});

describe("packBundle + unpackBundle round-trip", () => {
  it("round-trips all data artifacts correctly", async () => {
    const canvas = generateCanvasViewModel(goldenScaffold, VS_ID);
    const report = validate(goldenScaffold, goldenHeatmap);
    const { metadata, files } = createExportBundle(
      goldenScaffold,
      goldenHeatmap,
      canvas,
      report,
    );

    const zipBuffer = await packBundle(metadata, files);
    expect(zipBuffer.length).toBeGreaterThan(0);

    const result = await unpackBundle(zipBuffer);
    expect(result.errors).toHaveLength(0);

    // Verify manifest round-trips
    expect(result.metadata.bundleId).toBe(metadata.bundleId);
    expect(result.metadata.schemaVersion).toBe(metadata.schemaVersion);

    // Verify scaffold is byte-identical
    const originalScaffold = files.get("data/scaffold.json")!;
    const extractedScaffold = result.files.get("data/scaffold.json")!;
    expect(extractedScaffold.toString("utf-8")).toBe(
      originalScaffold.toString("utf-8"),
    );

    // Verify heatmap is byte-identical
    const originalHeatmap = files.get("data/heatmap.json")!;
    const extractedHeatmap = result.files.get("data/heatmap.json")!;
    expect(extractedHeatmap.toString("utf-8")).toBe(
      originalHeatmap.toString("utf-8"),
    );

    // All 5 files present (4 data + manifest.json)
    expect(result.files.size).toBe(5);
  });
});

describe("unpackBundle error detection", () => {
  it("detects invalid ZIP data", async () => {
    const result = await unpackBundle(Buffer.from("not a zip file"));
    expect(result.errors).toContain("Invalid ZIP file");
  });

  it("detects tampered artifact hash", async () => {
    const canvas = generateCanvasViewModel(goldenScaffold, VS_ID);
    const report = validate(goldenScaffold, goldenHeatmap);
    const { metadata, files } = createExportBundle(
      goldenScaffold,
      goldenHeatmap,
      canvas,
      report,
    );

    // Tamper with scaffold data after hash was computed
    files.set("data/scaffold.json", Buffer.from('{"tampered": true}'));

    const zipBuffer = await packBundle(metadata, files);
    const result = await unpackBundle(zipBuffer);

    const hashErrors = result.errors.filter((e) => e.includes("Hash mismatch"));
    expect(hashErrors.length).toBeGreaterThanOrEqual(1);
    expect(hashErrors[0]).toContain("scaffold");
  });
});

describe("validateImportBundle", () => {
  it("valid bundle → Valid report with no findings", async () => {
    const canvas = generateCanvasViewModel(goldenScaffold, VS_ID);
    const report = validate(goldenScaffold, goldenHeatmap);
    const { metadata, files } = createExportBundle(
      goldenScaffold,
      goldenHeatmap,
      canvas,
      report,
    );

    const zipBuffer = await packBundle(metadata, files);
    const importReport = await validateImportBundle(zipBuffer);

    expect(importReport.status).toBe("Valid");
    expect(importReport.findings).toHaveLength(0);
  });

  it("tampered artifact → V-EXPORT-02 HASH_MISMATCH", async () => {
    const canvas = generateCanvasViewModel(goldenScaffold, VS_ID);
    const report = validate(goldenScaffold, goldenHeatmap);
    const { metadata, files } = createExportBundle(
      goldenScaffold,
      goldenHeatmap,
      canvas,
      report,
    );

    // Tamper with heatmap
    files.set("data/heatmap.json", Buffer.from('{"tampered": true}'));
    const zipBuffer = await packBundle(metadata, files);

    const importReport = await validateImportBundle(zipBuffer);
    expect(importReport.status).toBe("Invalid");

    const hashFindings = importReport.findings.filter(
      (f) => f.ruleId === "V-EXPORT-02",
    );
    expect(hashFindings.length).toBeGreaterThanOrEqual(1);
  });

  it("scaffold integrity hash mismatch → V-EXPORT-03", async () => {
    const canvas = generateCanvasViewModel(goldenScaffold, VS_ID);
    const report = validate(goldenScaffold, goldenHeatmap);
    const { metadata, files } = createExportBundle(
      goldenScaffold,
      goldenHeatmap,
      canvas,
      report,
    );

    // Provide a different scaffold for comparison
    const alteredScaffold = {
      ...goldenScaffold,
      name: "Altered scaffold name to change hash",
    };

    const zipBuffer = await packBundle(metadata, files);
    const importReport = await validateImportBundle(zipBuffer, alteredScaffold);

    expect(importReport.status).toBe("Invalid");
    const hashFindings = importReport.findings.filter(
      (f) => f.ruleId === "V-EXPORT-03",
    );
    expect(hashFindings).toHaveLength(1);
    expect(hashFindings[0].code).toBe("SCAFFOLD_HASH_MISMATCH");
  });

  it("cross-reference scaffoldId mismatch → V-EXPORT-04", async () => {
    const canvas = generateCanvasViewModel(goldenScaffold, VS_ID);
    const report = validate(goldenScaffold, goldenHeatmap);
    const { metadata, files } = createExportBundle(
      goldenScaffold,
      goldenHeatmap,
      canvas,
      report,
    );

    // Tamper crossReferences.scaffoldId in manifest but keep scaffold file as-is
    const tamperedMeta = JSON.parse(JSON.stringify(metadata));
    tamperedMeta.integrity.crossReferences.scaffoldId = "wrong_scaffold_id";

    // Recompute artifact hashes so V-EXPORT-02 doesn't trigger
    const zipBuffer = await packBundle(tamperedMeta, files);
    const importReport = await validateImportBundle(zipBuffer);

    expect(importReport.status).toBe("Invalid");
    const crossRefFindings = importReport.findings.filter(
      (f) => f.ruleId === "V-EXPORT-04" && f.code === "CROSS_REF_MISMATCH",
    );
    expect(crossRefFindings.length).toBeGreaterThanOrEqual(1);
    expect(crossRefFindings[0].message).toContain("scaffoldId");
  });

  it("invalid ZIP → V-EXPORT-01 BUNDLE_ERROR", async () => {
    const importReport = await validateImportBundle(
      Buffer.from("corrupted data"),
    );
    expect(importReport.status).toBe("Invalid");
    expect(
      importReport.findings.some(
        (f) => f.ruleId === "V-EXPORT-01" && f.code === "BUNDLE_ERROR",
      ),
    ).toBe(true);
  });
});
