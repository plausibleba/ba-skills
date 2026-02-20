import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validate, ScaffoldInput, HeatmapInput } from "../validator.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const GOLDEN_DIR = resolve(__dirname, "../../../../fixtures/golden");
const PAIRED_DIR = resolve(__dirname, "../../../../fixtures/paired-negative");
const SEMANTIC_DIR = resolve(__dirname, "../../../../fixtures/semantic-negative");

function loadJSON<T>(filepath: string): T {
  return JSON.parse(readFileSync(filepath, "utf-8")) as T;
}

const goldenScaffold = loadJSON<ScaffoldInput>(
  resolve(GOLDEN_DIR, "scaffold.json"),
);
const goldenHeatmap = loadJSON<HeatmapInput>(
  resolve(GOLDEN_DIR, "heatmap.json"),
);

// ─── Paired negative fixtures ────────────────────────────────────────────────

describe("Paired negative fixtures", () => {
  function loadPairedCase(caseName: string) {
    const dir = resolve(PAIRED_DIR, caseName);
    return {
      scaffold: loadJSON<ScaffoldInput>(resolve(dir, "scaffold.json")),
      heatmap: loadJSON<HeatmapInput>(resolve(dir, "heatmap.json")),
    };
  }

  it("CASE_01: V-SCAFFOLD-03 cycle detected", () => {
    const { scaffold, heatmap } = loadPairedCase(
      "CASE_01_scaffold_cycle_nextActivity",
    );
    const report = validate(scaffold, heatmap);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-SCAFFOLD-03"),
    ).toBe(true);
  });

  it("CASE_02: V-SCAFFOLD-07 unreachable activities", () => {
    const { scaffold, heatmap } = loadPairedCase(
      "CASE_02_scaffold_broken_chain_unreachable",
    );
    const report = validate(scaffold, heatmap);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-SCAFFOLD-07"),
    ).toBe(true);
  });

  it("CASE_04: V-FRICTION-01 anchor type mismatch", () => {
    const { scaffold, heatmap } = loadPairedCase(
      "CASE_04_heatmap_anchor_type_mismatch",
    );
    const report = validate(scaffold, heatmap);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-FRICTION-01"),
    ).toBe(true);
  });

  it("CASE_05: V-FRICTION-01 unknown anchor ID", () => {
    const { scaffold, heatmap } = loadPairedCase(
      "CASE_05_heatmap_unknown_anchor_id",
    );
    const report = validate(scaffold, heatmap);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-FRICTION-01"),
    ).toBe(true);
  });

  it("CASE_06: V-FRICTION-03 binding anchor not in referenced observation", () => {
    const { scaffold, heatmap } = loadPairedCase(
      "CASE_06_heatmap_bindingConstraint_inconsistent",
    );
    const report = validate(scaffold, heatmap);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-FRICTION-03"),
    ).toBe(true);
  });

  it("CASE_07: V-FRICTION-05 hash mismatch", () => {
    const { scaffold, heatmap } = loadPairedCase(
      "CASE_07_crossfile_hash_mismatch",
    );
    const report = validate(scaffold, heatmap);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some(
        (f) => f.ruleId === "V-FRICTION-05" && f.code === "HASH_MISMATCH",
      ),
    ).toBe(true);
  });

  it("CASE_08: V-SCAFFOLD-01 missing metric element", () => {
    const { scaffold, heatmap } = loadPairedCase(
      "CASE_08_crossfile_missing_metric_element",
    );
    const report = validate(scaffold, heatmap);
    expect(report.status).toBe("Invalid");
    expect(
      report.findings.some((f) => f.ruleId === "V-SCAFFOLD-01"),
    ).toBe(true);
  });
});

// ─── Semantic negative fixtures (standalone) ─────────────────────────────────

describe("Semantic negative fixtures", () => {
  describe("scaffold-only (validated without heatmap)", () => {
    it("scaffold_semantic_cycle_nextActivity: V-SCAFFOLD-03", () => {
      const scaffold = loadJSON<ScaffoldInput>(
        resolve(SEMANTIC_DIR, "scaffold_semantic_cycle_nextActivity.json"),
      );
      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");
      expect(
        report.findings.some((f) => f.ruleId === "V-SCAFFOLD-03"),
      ).toBe(true);
    });

    it("scaffold_semantic_disconnected_chain: V-SCAFFOLD-07", () => {
      const scaffold = loadJSON<ScaffoldInput>(
        resolve(SEMANTIC_DIR, "scaffold_semantic_disconnected_chain.json"),
      );
      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");
      expect(
        report.findings.some((f) => f.ruleId === "V-SCAFFOLD-07"),
      ).toBe(true);
    });

    it("scaffold_semantic_inconsistent_outcome_chain: V-SCAFFOLD-08", () => {
      const scaffold = loadJSON<ScaffoldInput>(
        resolve(
          SEMANTIC_DIR,
          "scaffold_semantic_inconsistent_outcome_chain.json",
        ),
      );
      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");
      expect(
        report.findings.some((f) => f.ruleId === "V-SCAFFOLD-08"),
      ).toBe(true);
    });

    it("scaffold_semantic_measure_value_type_mismatch: V-MEASURE-02", () => {
      const scaffold = loadJSON<ScaffoldInput>(
        resolve(
          SEMANTIC_DIR,
          "scaffold_semantic_measure_value_type_mismatch.json",
        ),
      );
      const report = validate(scaffold);
      expect(
        report.findings.some((f) => f.ruleId === "V-MEASURE-02"),
      ).toBe(true);
    });
  });

  describe("heatmap (paired with golden scaffold)", () => {
    it("heatmap_semantic_anchor_type_mismatch: V-FRICTION-01", () => {
      const heatmap = loadJSON<HeatmapInput>(
        resolve(SEMANTIC_DIR, "heatmap_semantic_anchor_type_mismatch.json"),
      );
      const report = validate(goldenScaffold, heatmap);
      expect(report.status).toBe("Invalid");
      expect(
        report.findings.some((f) => f.ruleId === "V-FRICTION-01"),
      ).toBe(true);
    });

    it("heatmap_semantic_unknown_anchor_id: V-FRICTION-01", () => {
      const heatmap = loadJSON<HeatmapInput>(
        resolve(SEMANTIC_DIR, "heatmap_semantic_unknown_anchor_id.json"),
      );
      const report = validate(goldenScaffold, heatmap);
      expect(report.status).toBe("Invalid");
      expect(
        report.findings.some((f) => f.ruleId === "V-FRICTION-01"),
      ).toBe(true);
    });

    it("heatmap_semantic_bindingConstraint_inconsistent: V-FRICTION-03", () => {
      const heatmap = loadJSON<HeatmapInput>(
        resolve(
          SEMANTIC_DIR,
          "heatmap_semantic_bindingConstraint_inconsistent.json",
        ),
      );
      const report = validate(goldenScaffold, heatmap);
      expect(report.status).toBe("Invalid");
      expect(
        report.findings.some((f) => f.ruleId === "V-FRICTION-03"),
      ).toBe(true);
    });

    it("heatmap_semantic_scaffold_hash_mismatch: V-FRICTION-05", () => {
      const heatmap = loadJSON<HeatmapInput>(
        resolve(
          SEMANTIC_DIR,
          "heatmap_semantic_scaffold_hash_mismatch.json",
        ),
      );
      const report = validate(goldenScaffold, heatmap);
      expect(report.status).toBe("Invalid");
      expect(
        report.findings.some(
          (f) => f.ruleId === "V-FRICTION-05" && f.code === "HASH_MISMATCH",
        ),
      ).toBe(true);
    });
  });
});
