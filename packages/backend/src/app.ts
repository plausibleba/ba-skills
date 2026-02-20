import express from "express";
import cors from "cors";
import multer from "multer";
import {
  validate,
  computeScaffoldHash,
  generateCanvasViewModel,
  createExportBundle,
  packBundle,
  unpackBundle,
  validateImportBundle,
  type ScaffoldInput,
  type HeatmapInput,
  type ValidationReport,
  type GroupingMode,
} from "@vcc/shared";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

app.post("/v1/validate", (req, res) => {
  const body = req.body as Record<string, unknown> | undefined;

  if (!body || typeof body.scaffold !== "object" || body.scaffold === null) {
    res.status(400).json({ error: "Request body must include a scaffold object" });
    return;
  }

  const scaffoldData: unknown = body.scaffold;
  const heatmapData: unknown = body.heatmap ?? undefined;

  let report: ValidationReport;
  try {
    report = validate(scaffoldData, heatmapData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal validation error";
    res.status(500).json({ error: message });
    return;
  }

  // Set computed scaffold hash header when schema validation passed
  if (!report.findings.some((f) => f.ruleId === "SCHEMA")) {
    try {
      const hash = computeScaffoldHash(scaffoldData as ScaffoldInput);
      res.setHeader("X-Scaffold-Hash", hash);
    } catch {
      // scaffold was schema-valid but hash computation failed — skip header
    }
  }

  res.json(report);
});

app.post("/v1/canvas/generate", (req, res) => {
  const body = req.body as Record<string, unknown> | undefined;

  if (!body || typeof body.scaffold !== "object" || body.scaffold === null) {
    res.status(400).json({ error: "Request body must include a scaffold object" });
    return;
  }

  if (typeof body.valueStreamId !== "string" || body.valueStreamId === "") {
    res.status(400).json({ error: "Request body must include a valueStreamId string" });
    return;
  }

  const scaffoldData: unknown = body.scaffold;
  const valueStreamId = body.valueStreamId;
  const groupingMode = (body.groupingMode as GroupingMode | undefined) ?? "OutcomeProgression";

  // Validate scaffold first
  let report: ValidationReport;
  try {
    report = validate(scaffoldData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal validation error";
    res.status(500).json({ error: message });
    return;
  }

  if (report.status === "Invalid") {
    res.status(422).json({ error: "Scaffold validation failed", report });
    return;
  }

  try {
    const viewModel = generateCanvasViewModel(
      scaffoldData as ScaffoldInput,
      valueStreamId,
      groupingMode,
    );
    res.json(viewModel);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Canvas generation error";
    res.status(400).json({ error: message });
    return;
  }
});

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

app.post("/v1/export", (req, res) => {
  const body = req.body as Record<string, unknown> | undefined;

  if (!body || typeof body.scaffold !== "object" || body.scaffold === null) {
    res.status(400).json({ error: "Request body must include a scaffold object" });
    return;
  }

  const scaffoldData = body.scaffold as unknown;
  const heatmapData = body.heatmap as unknown | undefined;
  const valueStreamId = body.valueStreamId as string | undefined;
  const groupingMode = (body.groupingMode as GroupingMode | undefined) ?? "OutcomeProgression";

  // Validate scaffold first
  let report: ValidationReport;
  try {
    report = validate(scaffoldData, heatmapData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal validation error";
    res.status(500).json({ error: message });
    return;
  }

  if (report.status === "Invalid") {
    res.status(422).json({ error: "Scaffold validation failed", report });
    return;
  }

  const scaffold = scaffoldData as ScaffoldInput;
  const heatmap = heatmapData as HeatmapInput | undefined;

  // Determine valueStreamId
  const vsId =
    valueStreamId ??
    Object.keys(scaffold.elements.valueStreams)[0];

  if (!vsId) {
    res.status(400).json({ error: "No valueStreamId provided and scaffold has no value streams" });
    return;
  }

  // Generate canvas
  let canvasView;
  try {
    canvasView = generateCanvasViewModel(scaffold, vsId, groupingMode);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Canvas generation error";
    res.status(400).json({ error: message });
    return;
  }

  const { metadata, files } = createExportBundle(
    scaffold,
    heatmap,
    canvasView,
    report,
    {
      createdBy: (body.createdBy as string) ?? "VCC API",
      notes: body.notes as string | undefined,
    },
  );

  packBundle(metadata, files)
    .then((zipBuffer) => {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="vcc-export-${metadata.bundleId}.zip"`,
      );
      res.send(zipBuffer);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "ZIP creation error";
      res.status(500).json({ error: message });
    });
});

app.post("/v1/import", upload.single("bundle"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Request must include a 'bundle' file (multipart/form-data)" });
    return;
  }

  const zipBuffer = req.file.buffer;

  // Optional: compare against a provided scaffold
  let scaffold: ScaffoldInput | undefined;
  if (req.body?.scaffold) {
    try {
      scaffold = JSON.parse(req.body.scaffold as string) as ScaffoldInput;
    } catch {
      // If scaffold field is not valid JSON, skip comparison
    }
  }

  validateImportBundle(zipBuffer, scaffold)
    .then(async (importReport) => {
      const result = await unpackBundle(zipBuffer);

      const response: Record<string, unknown> = { report: importReport };

      // If valid, also return the extracted scaffold and heatmap
      if (importReport.status !== "Invalid") {
        const scaffoldFile = result.files.get("data/scaffold.json");
        const heatmapFile = result.files.get("data/heatmap.json");
        if (scaffoldFile) {
          try {
            response.scaffold = JSON.parse(scaffoldFile.toString("utf-8"));
          } catch { /* skip */ }
        }
        if (heatmapFile) {
          try {
            response.heatmap = JSON.parse(heatmapFile.toString("utf-8"));
          } catch { /* skip */ }
        }
      }

      res.json(response);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Import validation error";
      res.status(500).json({ error: message });
    });
});

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(500).json({ error: err.message || "Internal server error" });
  },
);

export { app };
