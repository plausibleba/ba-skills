import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validate,
  type ScaffoldInput,
  type ScaffoldElements,
} from "../validator.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../../../../fixtures/golden");

function loadGoldenScaffold(): ScaffoldInput {
  const raw = readFileSync(resolve(FIXTURES_DIR, "scaffold.json"), "utf-8");
  return JSON.parse(raw) as ScaffoldInput;
}

function makeScaffold(
  overrides: Partial<ScaffoldElements> = {},
): ScaffoldInput {
  return {
    scaffoldId: "test-scaffold",
    name: "Test",
    schemaVersion: "1.0.0",
    modelIntegrityHash: "0".repeat(64),
    elements: {
      valueStreams: { vs1: { id: "vs1", activityIds: ["a1"] } },
      activities: {
        a1: {
          id: "a1",
          preOutcomeId: "o1",
          postOutcomeId: "o2",
          performedByRoleIds: ["r1"],
          nextActivityId: null,
        },
      },
      outcomes: { o1: { id: "o1" }, o2: { id: "o2" } },
      roles: { r1: { id: "r1" } },
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
      ...overrides,
    },
  };
}

describe("Scaffold semantic validation", () => {
  describe("Golden scaffold", () => {
    it("passes all 4 rules with zero errors", () => {
      const scaffold = loadGoldenScaffold();
      const report = validate(scaffold);

      expect(report.status).toBe("Valid");
      expect(report.findings).toHaveLength(0);
      expect(report.summary.errorCount).toBe(0);
      expect(report.summary.warningCount).toBe(0);
      expect(report.artifacts.scaffold.scaffoldId).toBe(
        "scaffold_credit_risk_v5",
      );
    });
  });

  describe("V-SCAFFOLD-01: Referential Integrity", () => {
    it("detects unresolved activity outcome reference", () => {
      const scaffold = makeScaffold({
        activities: {
          a1: {
            id: "a1",
            preOutcomeId: "nonexistent_outcome",
            postOutcomeId: "o2",
            performedByRoleIds: ["r1"],
            nextActivityId: null,
          },
        },
      });

      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");

      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-01",
      );
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].code).toBe("UNRESOLVED_REF");
      expect(findings[0].message).toContain("nonexistent_outcome");
      expect(findings[0].path).toBe(
        "/elements/activities/a1/preOutcomeId",
      );
    });

    it("detects unresolved valueStream activityId", () => {
      const scaffold = makeScaffold({
        valueStreams: {
          vs1: { id: "vs1", activityIds: ["a1", "ghost_activity"] },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-01",
      );
      expect(findings.length).toBeGreaterThanOrEqual(1);

      const vsFindings = findings.filter((f) =>
        f.message.includes("ghost_activity"),
      );
      expect(vsFindings).toHaveLength(1);
      expect(vsFindings[0].code).toBe("UNRESOLVED_REF");
      expect(vsFindings[0].anchor?.anchorType).toBe("ValueStream");
    });

    it("detects unresolved metric measure reference", () => {
      const scaffold = makeScaffold({
        metrics: {
          m1: {
            id: "m1",
            measures: {
              targets: [],
              baselineMeasureId: "ghost_measure",
            },
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-01",
      );
      expect(findings.length).toBeGreaterThanOrEqual(1);

      const metricFindings = findings.filter((f) =>
        f.message.includes("ghost_measure"),
      );
      expect(metricFindings).toHaveLength(1);
      expect(metricFindings[0].code).toBe("UNRESOLVED_REF");
      expect(metricFindings[0].anchor?.anchorType).toBe("Metric");
      expect(metricFindings[0].path).toBe(
        "/elements/metrics/m1/measures/baselineMeasureId",
      );
    });
  });

  describe("V-SCAFFOLD-02: No No-Op Transitions", () => {
    it("detects activity with identical pre and post outcome", () => {
      const scaffold = makeScaffold({
        activities: {
          a1: {
            id: "a1",
            preOutcomeId: "o1",
            postOutcomeId: "o1",
            performedByRoleIds: ["r1"],
            nextActivityId: null,
          },
        },
      });

      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");

      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-02",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("NOOP_TRANSITION");
      expect(findings[0].anchor?.anchorType).toBe("Activity");
      expect(findings[0].anchor?.anchorId).toBe("a1");
    });
  });

  describe("V-SCAFFOLD-03: No Cycles", () => {
    it("detects cycle in nextActivityId chain", () => {
      const scaffold = makeScaffold({
        valueStreams: {
          vs1: { id: "vs1", activityIds: ["a1", "a2"] },
        },
        activities: {
          a1: {
            id: "a1",
            preOutcomeId: "o1",
            postOutcomeId: "o2",
            performedByRoleIds: ["r1"],
            nextActivityId: "a2",
          },
          a2: {
            id: "a2",
            preOutcomeId: "o2",
            postOutcomeId: "o1",
            performedByRoleIds: ["r1"],
            nextActivityId: "a1",
          },
        },
      });

      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");

      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-03",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("CYCLE_DETECTED");
      expect(findings[0].anchor?.anchorType).toBe("Activity");
    });

    it("detects self-cycle", () => {
      const scaffold = makeScaffold({
        activities: {
          a1: {
            id: "a1",
            preOutcomeId: "o1",
            postOutcomeId: "o2",
            performedByRoleIds: ["r1"],
            nextActivityId: "a1",
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-03",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("CYCLE_DETECTED");
    });
  });

  describe("V-SCAFFOLD-04: ValueStream Activities Required", () => {
    it("detects empty activityIds", () => {
      const scaffold = makeScaffold({
        valueStreams: { vs1: { id: "vs1", activityIds: [] } },
        activities: {},
      });

      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");

      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-04",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("EMPTY_VALUE_STREAM");
      expect(findings[0].anchor?.anchorType).toBe("ValueStream");
      expect(findings[0].anchor?.anchorId).toBe("vs1");
      expect(findings[0].path).toBe(
        "/elements/valueStreams/vs1/activityIds",
      );
    });
  });

  describe("Report structure", () => {
    it("produces valid summary with error counts by rule", () => {
      const scaffold = makeScaffold({
        activities: {
          a1: {
            id: "a1",
            preOutcomeId: "o1",
            postOutcomeId: "o1",
            performedByRoleIds: ["ghost_role"],
            nextActivityId: null,
          },
        },
      });

      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");
      expect(report.schemaVersion).toBe("3.0.0");
      expect(report.summary.errorCount).toBe(
        report.findings.filter((f) => f.severity === "Error").length,
      );
      expect(report.summary.ruleCounts.errorsByRule["V-SCAFFOLD-01"]).toBe(1);
      expect(report.summary.ruleCounts.errorsByRule["V-SCAFFOLD-02"]).toBe(1);
    });
  });
});
