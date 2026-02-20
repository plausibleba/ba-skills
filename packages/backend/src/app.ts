import express from "express";
import cors from "cors";
import {
  validate,
  computeScaffoldHash,
  type ScaffoldInput,
  type ValidationReport,
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
