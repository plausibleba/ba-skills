import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { app } from "../app.js";
import { unpackBundle } from "@vcc/shared";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const GOLDEN_DIR = resolve(__dirname, "../../../../fixtures/golden");

let goldenScaffold: unknown;
let goldenHeatmap: unknown;

beforeAll(() => {
  goldenScaffold = JSON.parse(
    readFileSync(resolve(GOLDEN_DIR, "scaffold.json"), "utf-8"),
  );
  goldenHeatmap = JSON.parse(
    readFileSync(resolve(GOLDEN_DIR, "heatmap.json"), "utf-8"),
  );
});

describe("GET /health", () => {
  it("returns ok status and version", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", version: "0.1.0" });
  });
});

describe("POST /v1/validate", () => {
  it("golden scaffold + heatmap → ValidWithWarnings (placeholder hash)", async () => {
    const res = await request(app)
      .post("/v1/validate")
      .send({ scaffold: goldenScaffold, heatmap: goldenHeatmap });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ValidWithWarnings");
    expect(
      res.body.findings.some(
        (f: { ruleId: string; code: string }) =>
          f.ruleId === "V-FRICTION-05" && f.code === "PLACEHOLDER_HASH",
      ),
    ).toBe(true);
    expect(res.headers["x-scaffold-hash"]).toBeDefined();
    expect(res.headers["x-scaffold-hash"]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("golden scaffold only → Valid", async () => {
    const res = await request(app)
      .post("/v1/validate")
      .send({ scaffold: goldenScaffold });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Valid");
    expect(res.body.findings).toHaveLength(0);
    expect(res.headers["x-scaffold-hash"]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("empty body → 400", async () => {
    const res = await request(app)
      .post("/v1/validate")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("invalid scaffold (missing required field) → 200 Invalid with SCHEMA findings", async () => {
    const badScaffold = {
      schemaVersion: "1.0.0",
      scaffoldId: "test",
      name: "Test",
      createdAt: "2026-01-01T00:00:00Z",
      elements: {
        valueStreams: {},
        activities: {},
        // outcomes deliberately missing
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
      },
    };

    const res = await request(app)
      .post("/v1/validate")
      .send({ scaffold: badScaffold });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Invalid");
    expect(
      res.body.findings.some(
        (f: { ruleId: string; code: string }) =>
          f.ruleId === "SCHEMA" && f.code === "ERR_SCHEMA_REQUIRED",
      ),
    ).toBe(true);
    // No semantic rules should have run
    expect(
      res.body.findings.every(
        (f: { ruleId: string }) => f.ruleId === "SCHEMA",
      ),
    ).toBe(true);
  });
});

describe("POST /v1/canvas/generate", () => {
  it("golden scaffold → 200 with valid CanvasViewModel", async () => {
    const res = await request(app)
      .post("/v1/canvas/generate")
      .send({
        scaffold: goldenScaffold,
        valueStreamId: "vs_credit_risk_assessment_mgmt",
      });

    expect(res.status).toBe(200);
    expect(res.body.schemaVersion).toBe("1.0.0");
    expect(res.body.scaffoldId).toBe("scaffold_credit_risk_v5");
    expect(res.body.valueStreamId).toBe("vs_credit_risk_assessment_mgmt");
    expect(res.body.groupingMode).toBe("OutcomeProgression");
    expect(res.body.columns.length).toBe(9);
    expect(res.body.summary.totalActivities).toBe(9);
  });

  it("missing scaffold → 400", async () => {
    const res = await request(app)
      .post("/v1/canvas/generate")
      .send({ valueStreamId: "vs_credit_risk_assessment_mgmt" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scaffold/);
  });

  it("missing valueStreamId → 400", async () => {
    const res = await request(app)
      .post("/v1/canvas/generate")
      .send({ scaffold: goldenScaffold });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valueStreamId/);
  });

  it("invalid scaffold → 422 with validation report", async () => {
    const res = await request(app)
      .post("/v1/canvas/generate")
      .send({
        scaffold: { scaffoldId: "bad" },
        valueStreamId: "vs1",
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/validation failed/i);
    expect(res.body.report.status).toBe("Invalid");
  });
});

/** Helper: export golden fixtures and return the raw ZIP buffer */
async function exportGoldenZip(): Promise<Buffer> {
  const res = await request(app)
    .post("/v1/export")
    .send({
      scaffold: goldenScaffold,
      heatmap: goldenHeatmap,
      valueStreamId: "vs_credit_risk_assessment_mgmt",
    })
    .responseType("arraybuffer");

  expect(res.status).toBe(200);
  return Buffer.from(res.body as ArrayBuffer);
}

describe("POST /v1/export", () => {
  it("golden scaffold + heatmap → ZIP with correct content-type", async () => {
    const res = await request(app)
      .post("/v1/export")
      .send({
        scaffold: goldenScaffold,
        heatmap: goldenHeatmap,
        valueStreamId: "vs_credit_risk_assessment_mgmt",
      })
      .responseType("arraybuffer");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/zip/);
    expect(res.headers["content-disposition"]).toMatch(/attachment.*\.zip/);

    // Verify the ZIP can be unpacked
    const zipBuffer = Buffer.from(res.body as ArrayBuffer);
    const result = await unpackBundle(zipBuffer);
    expect(result.errors).toHaveLength(0);
    expect(result.files.has("data/scaffold.json")).toBe(true);
    expect(result.files.has("data/heatmap.json")).toBe(true);
    expect(result.files.has("data/canvas.json")).toBe(true);
    expect(result.files.has("data/validation.json")).toBe(true);
  });

  it("missing scaffold → 400", async () => {
    const res = await request(app)
      .post("/v1/export")
      .send({ heatmap: goldenHeatmap });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scaffold/);
  });

  it("invalid scaffold → 422", async () => {
    const res = await request(app)
      .post("/v1/export")
      .send({ scaffold: { scaffoldId: "bad" } });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/validation failed/i);
  });
});

describe("POST /v1/import", () => {
  it("valid ZIP → import report with Valid status and extracted data", async () => {
    const zipBuffer = await exportGoldenZip();

    const importRes = await request(app)
      .post("/v1/import")
      .attach("bundle", zipBuffer, "bundle.zip");

    expect(importRes.status).toBe(200);
    expect(importRes.body.report.status).toBe("Valid");
    expect(importRes.body.scaffold).toBeDefined();
    expect(importRes.body.scaffold.scaffoldId).toBe("scaffold_credit_risk_v5");
    expect(importRes.body.heatmap).toBeDefined();
  });

  it("no file attached → 400", async () => {
    const res = await request(app).post("/v1/import");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/bundle/);
  });

  it("corrupted ZIP → import report with Invalid status", async () => {
    const res = await request(app)
      .post("/v1/import")
      .attach("bundle", Buffer.from("not a zip"), "bad.zip");

    expect(res.status).toBe(200);
    expect(res.body.report.status).toBe("Invalid");
    expect(
      res.body.report.findings.some(
        (f: { ruleId: string }) => f.ruleId === "V-EXPORT-01",
      ),
    ).toBe(true);
  });
});
