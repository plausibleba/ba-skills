import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { app } from "../app.js";

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
