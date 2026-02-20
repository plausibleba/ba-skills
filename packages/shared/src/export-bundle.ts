import { createHash, randomUUID } from "node:crypto";
import JSZip from "jszip";
import { computeScaffoldHash } from "./validator.js";
import type {
  ScaffoldInput,
  HeatmapInput,
  ValidationReport,
  Finding,
} from "./validator.js";
import type { CanvasViewModel } from "./canvas-generator.js";
import { createValidator, loadSchema } from "./schemas.js";

// --- Helpers ---

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function jsonBuffer(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj, null, 2), "utf-8");
}

function artifactRef(
  path: string,
  contentType: string,
  buf: Buffer,
): { path: string; contentType: string; sha256: string; bytes: number } {
  return { path, contentType, sha256: sha256(buf), bytes: buf.length };
}

// --- Types ---

export interface ExportBundleOptions {
  createdBy?: string;
  notes?: string;
}

// Matches ExportBundle.schema.json
export interface ExportBundleMetadata {
  schemaVersion: string;
  bundleId: string;
  bundleFormatVersion: "1.0";
  createdAt: string;
  createdBy: string;
  notes?: string;
  manifest: {
    zipLayout: {
      root: "/";
      paths: {
        manifest: "manifest.json";
        scaffold: "data/scaffold.json";
        validation: "data/validation.json";
        canvas: "data/canvas.json";
        heatmap: "data/heatmap.json";
      };
    };
    requiredPaths: string[];
    optionalPaths: string[];
    tooling: {
      appName: string;
      appVersion: string;
      schemaSetVersion?: string;
      validator?: {
        jsonSchemaValidator?: string;
        customRuleEngine?: string;
      };
    };
  };
  artifacts: {
    scaffold: ReturnType<typeof artifactRef>;
    validationReport: ReturnType<typeof artifactRef>;
    canvasView: ReturnType<typeof artifactRef>;
    frictionHeatmap: ReturnType<typeof artifactRef>;
  };
  integrity: {
    bundleSha256: string;
    scaffoldIntegrityHash: string;
    crossReferences: {
      scaffoldId: string;
      valueStreamId: string;
      canvasViewId?: string;
      heatmapId?: string;
      validationReportId?: string;
    };
  };
}

// Deterministic artifact file order for bundleSha256
const ARTIFACT_PATHS = [
  "data/canvas.json",
  "data/heatmap.json",
  "data/scaffold.json",
  "data/validation.json",
] as const;

// --- Create ---

export function createExportBundle(
  scaffold: ScaffoldInput,
  heatmap?: HeatmapInput,
  canvasView?: CanvasViewModel,
  validationReport?: ValidationReport,
  options?: ExportBundleOptions,
): { metadata: ExportBundleMetadata; files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();

  const scaffoldBuf = jsonBuffer(scaffold);
  const heatmapBuf = jsonBuffer(heatmap ?? null);
  const canvasBuf = jsonBuffer(canvasView ?? null);
  const validationBuf = jsonBuffer(validationReport ?? null);

  files.set("data/scaffold.json", scaffoldBuf);
  files.set("data/heatmap.json", heatmapBuf);
  files.set("data/canvas.json", canvasBuf);
  files.set("data/validation.json", validationBuf);

  // bundleSha256: SHA-256 of all artifact bytes in deterministic (alpha) order
  const bundleDigest = createHash("sha256");
  for (const p of ARTIFACT_PATHS) {
    bundleDigest.update(files.get(p)!);
  }
  const bundleSha256 = bundleDigest.digest("hex");

  const scaffoldIntegrityHash = computeScaffoldHash(scaffold);

  const valueStreamId =
    canvasView?.valueStreamId ??
    heatmap?.valueStreamId ??
    Object.keys(scaffold.elements.valueStreams)[0] ??
    "unknown";

  const metadata: ExportBundleMetadata = {
    schemaVersion: "1.0.0",
    bundleId: randomUUID(),
    bundleFormatVersion: "1.0",
    createdAt: new Date().toISOString(),
    createdBy: options?.createdBy ?? "VCC Export",
    ...(options?.notes != null ? { notes: options.notes } : {}),
    manifest: {
      zipLayout: {
        root: "/",
        paths: {
          manifest: "manifest.json",
          scaffold: "data/scaffold.json",
          validation: "data/validation.json",
          canvas: "data/canvas.json",
          heatmap: "data/heatmap.json",
        },
      },
      requiredPaths: [
        "manifest.json",
        "data/scaffold.json",
        "data/validation.json",
        "data/canvas.json",
        "data/heatmap.json",
      ],
      optionalPaths: [
        "README.md",
        "ttl/ontology-schema.ttl",
        "ttl/ontology-constraints.ttl",
        "ttl/example-data.ttl",
      ],
      tooling: {
        appName: "VCC",
        appVersion: "0.1.0",
        schemaSetVersion: "1.0.0",
        validator: {
          jsonSchemaValidator: "AJV 8.x",
          customRuleEngine: "VCC Semantic Validator v0.1.0",
        },
      },
    },
    artifacts: {
      scaffold: artifactRef("data/scaffold.json", "application/json", scaffoldBuf),
      validationReport: artifactRef("data/validation.json", "application/json", validationBuf),
      canvasView: artifactRef("data/canvas.json", "application/json", canvasBuf),
      frictionHeatmap: artifactRef("data/heatmap.json", "application/json", heatmapBuf),
    },
    integrity: {
      bundleSha256,
      scaffoldIntegrityHash,
      crossReferences: {
        scaffoldId: scaffold.scaffoldId,
        valueStreamId,
        ...(canvasView ? { canvasViewId: canvasView.viewId } : {}),
        ...(heatmap ? { heatmapId: heatmap.heatmapId } : {}),
        ...(validationReport
          ? { validationReportId: validationReport.reportId }
          : {}),
      },
    },
  };

  return { metadata, files };
}

// --- Pack ---

export async function packBundle(
  metadata: ExportBundleMetadata,
  files: Map<string, Buffer>,
): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("manifest.json", jsonBuffer(metadata));
  for (const [path, data] of files) {
    zip.file(path, data);
  }
  return zip.generateAsync({ type: "nodebuffer" }) as Promise<Buffer>;
}

// --- Unpack ---

export interface UnpackResult {
  metadata: ExportBundleMetadata;
  files: Map<string, Buffer>;
  errors: string[];
}

export async function unpackBundle(zipBuffer: Buffer): Promise<UnpackResult> {
  const errors: string[] = [];
  const files = new Map<string, Buffer>();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    return {
      metadata: undefined as unknown as ExportBundleMetadata,
      files,
      errors: ["Invalid ZIP file"],
    };
  }

  // Extract manifest
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    return {
      metadata: undefined as unknown as ExportBundleMetadata,
      files,
      errors: ["manifest.json not found in ZIP"],
    };
  }

  const manifestBuf = Buffer.from(await manifestEntry.async("uint8array"));
  let metadata: ExportBundleMetadata;
  try {
    metadata = JSON.parse(manifestBuf.toString("utf-8")) as ExportBundleMetadata;
  } catch {
    return {
      metadata: undefined as unknown as ExportBundleMetadata,
      files,
      errors: ["manifest.json is not valid JSON"],
    };
  }

  // Validate manifest against ExportBundle schema
  const ajv = createValidator();
  const schema = loadSchema("ExportBundle.schema.json");
  const schemaValidate = ajv.compile(schema);
  if (!schemaValidate(metadata)) {
    for (const err of schemaValidate.errors ?? []) {
      errors.push(
        `Manifest schema error: ${err.instancePath || "/"}: ${err.message ?? err.keyword}`,
      );
    }
  }

  // Extract all files
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!entry.dir) {
      files.set(path, Buffer.from(await entry.async("uint8array")));
    }
  }

  // Verify required paths
  if (metadata.manifest?.requiredPaths) {
    for (const rp of metadata.manifest.requiredPaths) {
      if (!files.has(rp)) {
        errors.push(`Missing required path: ${rp}`);
      }
    }
  }

  // Verify artifact hashes
  const artifactEntries = metadata.artifacts
    ? Object.entries(metadata.artifacts)
    : [];
  for (const [key, ref] of artifactEntries) {
    if (
      ref &&
      typeof ref === "object" &&
      "path" in ref &&
      "sha256" in ref
    ) {
      const artRef = ref as { path: string; sha256: string };
      const data = files.get(artRef.path);
      if (!data) {
        errors.push(`Artifact '${key}' file missing: ${artRef.path}`);
      } else {
        const computed = sha256(data);
        if (computed !== artRef.sha256) {
          errors.push(
            `Hash mismatch for '${key}' (${artRef.path}): expected ${artRef.sha256}, got ${computed}`,
          );
        }
      }
    }
  }

  return { metadata, files, errors };
}

// --- Validate Import ---

function finding(
  severity: "Error" | "Warning",
  ruleId: string,
  code: string,
  message: string,
  path?: string,
): Finding {
  return { severity, ruleId, code, message, ...(path ? { path } : {}) };
}

function buildImportReport(findings: Finding[]): ValidationReport {
  let errorCount = 0;
  let warningCount = 0;
  const errorsByRule: Record<string, number> = {};
  const warningsByRule: Record<string, number> = {};

  for (const f of findings) {
    if (f.severity === "Error") {
      errorCount++;
      errorsByRule[f.ruleId] = (errorsByRule[f.ruleId] ?? 0) + 1;
    } else {
      warningCount++;
      warningsByRule[f.ruleId] = (warningsByRule[f.ruleId] ?? 0) + 1;
    }
  }

  return {
    reportId: randomUUID(),
    schemaVersion: "3.0.0",
    createdAt: new Date().toISOString(),
    status:
      errorCount > 0
        ? "Invalid"
        : warningCount > 0
          ? "ValidWithWarnings"
          : "Valid",
    summary: {
      errorCount,
      warningCount,
      ruleCounts: { errorsByRule, warningsByRule },
    },
    artifacts: {
      scaffold: {
        scaffoldId: "import",
        modelIntegrityHash: "0".repeat(64),
      },
    },
    findings,
  };
}

export async function validateImportBundle(
  zipBuffer: Buffer,
  scaffold?: ScaffoldInput,
): Promise<ValidationReport> {
  const findings: Finding[] = [];

  const result = await unpackBundle(zipBuffer);

  // Convert unpack errors to V-EXPORT findings
  for (const err of result.errors) {
    if (err.includes("Missing required path")) {
      findings.push(finding("Error", "V-EXPORT-01", "MISSING_PATH", err));
    } else if (err.includes("Hash mismatch")) {
      findings.push(finding("Error", "V-EXPORT-02", "HASH_MISMATCH", err));
    } else if (err.includes("Manifest schema error")) {
      findings.push(finding("Error", "V-EXPORT-01", "SCHEMA_ERROR", err));
    } else {
      findings.push(finding("Error", "V-EXPORT-01", "BUNDLE_ERROR", err));
    }
  }

  if (!result.metadata) {
    return buildImportReport(findings);
  }

  const meta = result.metadata;

  // V-EXPORT-03: scaffoldIntegrityHash verification
  if (scaffold && meta.integrity?.scaffoldIntegrityHash) {
    const computed = computeScaffoldHash(scaffold);
    if (meta.integrity.scaffoldIntegrityHash !== computed) {
      findings.push(
        finding(
          "Error",
          "V-EXPORT-03",
          "SCAFFOLD_HASH_MISMATCH",
          `Bundle scaffoldIntegrityHash '${meta.integrity.scaffoldIntegrityHash}' does not match computed '${computed}'`,
          "/integrity/scaffoldIntegrityHash",
        ),
      );
    }
  }

  // V-EXPORT-04: cross-reference verification
  const crossRefs = meta.integrity?.crossReferences;
  if (crossRefs) {
    // Verify scaffoldId matches embedded scaffold
    const scaffoldFile = result.files.get("data/scaffold.json");
    if (scaffoldFile) {
      try {
        const embedded = JSON.parse(scaffoldFile.toString("utf-8")) as {
          scaffoldId?: string;
        };
        if (embedded.scaffoldId && embedded.scaffoldId !== crossRefs.scaffoldId) {
          findings.push(
            finding(
              "Error",
              "V-EXPORT-04",
              "CROSS_REF_MISMATCH",
              `crossReferences.scaffoldId '${crossRefs.scaffoldId}' does not match scaffold.scaffoldId '${embedded.scaffoldId}'`,
              "/integrity/crossReferences/scaffoldId",
            ),
          );
        }
      } catch {
        // Parse error already covered by hash checks
      }
    }

    // Verify heatmapId
    if (crossRefs.heatmapId) {
      const heatmapFile = result.files.get("data/heatmap.json");
      if (heatmapFile) {
        try {
          const embedded = JSON.parse(heatmapFile.toString("utf-8")) as {
            heatmapId?: string;
          };
          if (
            embedded.heatmapId &&
            embedded.heatmapId !== crossRefs.heatmapId
          ) {
            findings.push(
              finding(
                "Error",
                "V-EXPORT-04",
                "CROSS_REF_MISMATCH",
                `crossReferences.heatmapId '${crossRefs.heatmapId}' does not match heatmap.heatmapId '${embedded.heatmapId}'`,
                "/integrity/crossReferences/heatmapId",
              ),
            );
          }
        } catch {
          // handled elsewhere
        }
      }
    }

    // Verify valueStreamId in canvas
    if (crossRefs.canvasViewId) {
      const canvasFile = result.files.get("data/canvas.json");
      if (canvasFile) {
        try {
          const embedded = JSON.parse(canvasFile.toString("utf-8")) as {
            viewId?: string;
            valueStreamId?: string;
          };
          if (embedded.viewId && embedded.viewId !== crossRefs.canvasViewId) {
            findings.push(
              finding(
                "Error",
                "V-EXPORT-04",
                "CROSS_REF_MISMATCH",
                `crossReferences.canvasViewId '${crossRefs.canvasViewId}' does not match canvas.viewId '${embedded.viewId}'`,
                "/integrity/crossReferences/canvasViewId",
              ),
            );
          }
          if (
            embedded.valueStreamId &&
            embedded.valueStreamId !== crossRefs.valueStreamId
          ) {
            findings.push(
              finding(
                "Error",
                "V-EXPORT-04",
                "CROSS_REF_MISMATCH",
                `crossReferences.valueStreamId '${crossRefs.valueStreamId}' does not match canvas.valueStreamId '${embedded.valueStreamId}'`,
                "/integrity/crossReferences/valueStreamId",
              ),
            );
          }
        } catch {
          // handled elsewhere
        }
      }
    }
  }

  // V-EXPORT-02: verify bundleSha256
  const bundleDigest = createHash("sha256");
  let allPresent = true;
  for (const p of ARTIFACT_PATHS) {
    const data = result.files.get(p);
    if (data) {
      bundleDigest.update(data);
    } else {
      allPresent = false;
    }
  }
  if (allPresent && meta.integrity?.bundleSha256) {
    const computed = bundleDigest.digest("hex");
    if (computed !== meta.integrity.bundleSha256) {
      findings.push(
        finding(
          "Error",
          "V-EXPORT-02",
          "BUNDLE_HASH_MISMATCH",
          `bundleSha256 '${meta.integrity.bundleSha256}' does not match computed '${computed}'`,
          "/integrity/bundleSha256",
        ),
      );
    }
  }

  return buildImportReport(findings);
}
