import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateScaffoldSchema,
  validateHeatmapSchema,
} from "../schema-validator.js";
import { validate } from "../validator.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const NEGATIVE_DIR = resolve(__dirname, "../../../../fixtures/negative");
const GOLDEN_DIR = resolve(__dirname, "../../../../fixtures/golden");

function loadNegative(filename: string): unknown {
  return JSON.parse(
    readFileSync(resolve(NEGATIVE_DIR, filename), "utf-8"),
  );
}

function loadGolden(filename: string): unknown {
  return JSON.parse(
    readFileSync(resolve(GOLDEN_DIR, filename), "utf-8"),
  );
}

// ─── Schema-level failures (Layer 1 rejects) ────────────────────────────────

describe("Schema-level negative fixtures", () => {
  describe("scaffold schema failures", () => {
    it("scaffold_missing_outcomes → ERR_SCHEMA_REQUIRED", () => {
      const data = loadNegative("scaffold_missing_outcomes.json");
      const findings = validateScaffoldSchema(data);
      expect(findings.length).toBeGreaterThan(0);
      expect(
        findings.some((f) => f.code === "ERR_SCHEMA_REQUIRED"),
      ).toBe(true);
    });

    it("scaffold_valueStream_missing_activityIds → ERR_SCHEMA_REQUIRED", () => {
      const data = loadNegative(
        "scaffold_valueStream_missing_activityIds.json",
      );
      const findings = validateScaffoldSchema(data);
      expect(findings.length).toBeGreaterThan(0);
      expect(
        findings.some((f) => f.code === "ERR_SCHEMA_REQUIRED"),
      ).toBe(true);
    });

    it("scaffold_additionalProperties_violation → ERR_SCHEMA_ADDITIONAL_PROPERTIES", () => {
      const data = loadNegative(
        "scaffold_additionalProperties_violation.json",
      );
      const findings = validateScaffoldSchema(data);
      expect(findings.length).toBeGreaterThan(0);
      expect(
        findings.some(
          (f) => f.code === "ERR_SCHEMA_ADDITIONAL_PROPERTIES",
        ),
      ).toBe(true);
    });
  });

  describe("heatmap schema failures", () => {
    it("heatmap_invalid_category_enum → ERR_SCHEMA_ENUM", () => {
      const data = loadNegative("heatmap_invalid_category_enum.json");
      const findings = validateHeatmapSchema(data);
      expect(findings.length).toBeGreaterThan(0);
      expect(
        findings.some((f) => f.code === "ERR_SCHEMA_ENUM"),
      ).toBe(true);
    });

    it("heatmap_invalid_anchorType → ERR_SCHEMA_ENUM", () => {
      const data = loadNegative("heatmap_invalid_anchorType.json");
      const findings = validateHeatmapSchema(data);
      expect(findings.length).toBeGreaterThan(0);
      expect(
        findings.some((f) => f.code === "ERR_SCHEMA_ENUM"),
      ).toBe(true);
    });

    it("heatmap_missing_rationale → ERR_SCHEMA_REQUIRED", () => {
      const data = loadNegative("heatmap_missing_rationale.json");
      const findings = validateHeatmapSchema(data);
      expect(findings.length).toBeGreaterThan(0);
      expect(
        findings.some((f) => f.code === "ERR_SCHEMA_REQUIRED"),
      ).toBe(true);
    });

    it("heatmap_invalid_scaffoldIntegrityHash → ERR_SCHEMA_PATTERN", () => {
      const data = loadNegative(
        "heatmap_invalid_scaffoldIntegrityHash.json",
      );
      const findings = validateHeatmapSchema(data);
      expect(findings.length).toBeGreaterThan(0);
      expect(
        findings.some((f) => f.code === "ERR_SCHEMA_PATTERN"),
      ).toBe(true);
    });

    it("heatmap_additionalProperties_violation → ERR_SCHEMA_ADDITIONAL_PROPERTIES", () => {
      const data = loadNegative(
        "heatmap_additionalProperties_violation.json",
      );
      const findings = validateHeatmapSchema(data);
      expect(findings.length).toBeGreaterThan(0);
      expect(
        findings.some(
          (f) => f.code === "ERR_SCHEMA_ADDITIONAL_PROPERTIES",
        ),
      ).toBe(true);
    });
  });

  describe("schema failures gate semantic rules via validate()", () => {
    it("schema errors produce Invalid report with SCHEMA ruleId", () => {
      const data = loadNegative("scaffold_missing_outcomes.json");
      const report = validate(data);
      expect(report.status).toBe("Invalid");
      expect(report.findings.every((f) => f.ruleId === "SCHEMA")).toBe(true);
    });

    it("schema errors prevent semantic rules from running", () => {
      const data = loadNegative(
        "scaffold_additionalProperties_violation.json",
      );
      const report = validate(data);
      expect(report.findings.some((f) => f.ruleId === "SCHEMA")).toBe(true);
      expect(
        report.findings.some((f) => f.ruleId.startsWith("V-")),
      ).toBe(false);
    });
  });
});

// ─── Schema-valid, semantically invalid (Layer 1 passes → Layer 2 catches) ──

describe("Schema-valid negative fixtures (semantic failures)", () => {
  it("scaffold_activity_unknown_role passes schema, fails V-SCAFFOLD-01", () => {
    const data = loadNegative("scaffold_activity_unknown_role.json");
    expect(validateScaffoldSchema(data)).toHaveLength(0);
    const report = validate(data);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-SCAFFOLD-01"),
    ).toBe(true);
  });

  it("scaffold_metric_missing_measure_ref passes schema, fails V-SCAFFOLD-01", () => {
    const data = loadNegative("scaffold_metric_missing_measure_ref.json");
    expect(validateScaffoldSchema(data)).toHaveLength(0);
    const report = validate(data);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-SCAFFOLD-01"),
    ).toBe(true);
  });

  it("scaffold_broken_nextActivity_chain passes schema, fails V-SCAFFOLD-01", () => {
    const data = loadNegative("scaffold_broken_nextActivity_chain.json");
    expect(validateScaffoldSchema(data)).toHaveLength(0);
    const report = validate(data);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-SCAFFOLD-01"),
    ).toBe(true);
  });

  it("heatmap_bindingConstraint_missing_observation passes schema, fails semantic", () => {
    const heatmapData = loadNegative(
      "heatmap_bindingConstraint_missing_observation.json",
    );
    const scaffoldData = loadGolden("scaffold.json");
    expect(validateHeatmapSchema(heatmapData)).toHaveLength(0);
    const report = validate(scaffoldData, heatmapData);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-FRICTION-03"),
    ).toBe(true);
  });
});
