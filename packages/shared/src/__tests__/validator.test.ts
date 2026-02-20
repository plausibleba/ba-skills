import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateSemantic as validate,
  type ScaffoldInput,
  type ScaffoldElements,
  type HeatmapInput,
} from "../validator.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../../../../fixtures/golden");

function loadGoldenScaffold(): ScaffoldInput {
  const raw = readFileSync(resolve(FIXTURES_DIR, "scaffold.json"), "utf-8");
  return JSON.parse(raw) as ScaffoldInput;
}

function loadGoldenHeatmap(): HeatmapInput {
  const raw = readFileSync(resolve(FIXTURES_DIR, "heatmap.json"), "utf-8");
  return JSON.parse(raw) as HeatmapInput;
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

function makeHeatmap(overrides: Partial<HeatmapInput> = {}): HeatmapInput {
  return {
    heatmapId: "test-heatmap",
    scaffoldId: "test-scaffold",
    valueStreamId: "vs1",
    observations: [
      {
        observationId: "obs1",
        primaryAnchor: { anchorType: "Activity", anchorId: "a1" },
        contributingAnchors: [{ anchorType: "Role", anchorId: "r1" }],
      },
    ],
    bindingConstraint: {
      findingId: "bc1",
      bindingAnchor: { anchorType: "Activity", anchorId: "a1" },
      bindingAnchorObservationId: "obs1",
      justification: "Test binding constraint",
    },
    ...overrides,
  };
}

describe("Scaffold semantic validation", () => {
  describe("Golden scaffold (standalone)", () => {
    it("passes all scaffold and measure rules with zero findings", () => {
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

  describe("Golden pair (scaffold + heatmap)", () => {
    it("passes all rules except placeholder hash warning", () => {
      const scaffold = loadGoldenScaffold();
      const heatmap = loadGoldenHeatmap();
      const report = validate(scaffold, heatmap);

      expect(report.summary.errorCount).toBe(0);
      expect(report.status).toBe("ValidWithWarnings");

      const findings = report.findings;
      expect(findings).toHaveLength(1);
      expect(findings[0].ruleId).toBe("V-FRICTION-05");
      expect(findings[0].code).toBe("PLACEHOLDER_HASH");
      expect(findings[0].severity).toBe("Warning");

      expect(report.artifacts.heatmap?.heatmapId).toBe(
        "heatmap_credit_risk_v5",
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

  describe("V-SCAFFOLD-06: No Orphan Metrics", () => {
    it("detects metric not referenced by any activity or value stream", () => {
      const scaffold = makeScaffold({
        metrics: {
          orphan_m: {
            id: "orphan_m",
            measures: { targets: [] },
          },
        },
      });

      const report = validate(scaffold);
      expect(report.status).toBe("ValidWithWarnings");
      expect(report.summary.errorCount).toBe(0);
      expect(report.summary.warningCount).toBe(1);

      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-06",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("Warning");
      expect(findings[0].code).toBe("ORPHAN_METRIC");
      expect(findings[0].anchor?.anchorType).toBe("Metric");
      expect(findings[0].anchor?.anchorId).toBe("orphan_m");
    });

    it("does not warn when metric is referenced by an activity", () => {
      const scaffold = makeScaffold({
        activities: {
          a1: {
            id: "a1",
            preOutcomeId: "o1",
            postOutcomeId: "o2",
            performedByRoleIds: ["r1"],
            metricIds: ["m1"],
            nextActivityId: null,
          },
        },
        metrics: {
          m1: {
            id: "m1",
            measures: { targets: [] },
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-06",
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe("V-SCAFFOLD-07: Chain Reachability", () => {
    it("detects unreachable activity in value stream", () => {
      const scaffold = makeScaffold({
        outcomes: { o1: { id: "o1" }, o2: { id: "o2" }, o3: { id: "o3" } },
        valueStreams: {
          vs1: { id: "vs1", activityIds: ["a1", "a2"] },
        },
        activities: {
          a1: {
            id: "a1",
            preOutcomeId: "o1",
            postOutcomeId: "o2",
            performedByRoleIds: ["r1"],
            nextActivityId: null,
          },
          a2: {
            id: "a2",
            preOutcomeId: "o2",
            postOutcomeId: "o3",
            performedByRoleIds: ["r1"],
            nextActivityId: null,
          },
        },
      });

      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");

      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-07",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("UNREACHABLE_ACTIVITY");
      expect(findings[0].anchor?.anchorId).toBe("a2");
      expect(findings[0].message).toContain("a2");
      expect(findings[0].message).toContain("a1");
    });

    it("is skipped when referential integrity errors exist", () => {
      const scaffold = makeScaffold({
        valueStreams: {
          vs1: { id: "vs1", activityIds: ["a1", "ghost"] },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-07",
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe("V-SCAFFOLD-08: Outcome Chain Consistency", () => {
    it("detects mismatched outcome between adjacent activities", () => {
      const scaffold = makeScaffold({
        outcomes: { o1: { id: "o1" }, o2: { id: "o2" }, o3: { id: "o3" } },
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
            preOutcomeId: "o3",
            postOutcomeId: "o1",
            performedByRoleIds: ["r1"],
            nextActivityId: null,
          },
        },
      });

      const report = validate(scaffold);
      expect(report.status).toBe("Invalid");

      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-08",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("OUTCOME_MISMATCH");
      expect(findings[0].anchor?.anchorId).toBe("a2");
      expect(findings[0].message).toContain("o2");
      expect(findings[0].message).toContain("o3");
    });

    it("is skipped when cycle errors exist", () => {
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
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-SCAFFOLD-08",
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe("V-MEASURE-01: Current Measures Require Timestamp", () => {
    it("warns when current measure lacks measureAsOf", () => {
      const scaffold = makeScaffold({
        metrics: {
          m1: {
            id: "m1",
            measures: {
              targets: [],
              currentMeasureId: "ms1",
            },
          },
        },
        measures: {
          ms1: {
            id: "ms1",
            measureDataType: "number",
            measureValue: "42",
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-MEASURE-01",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("Warning");
      expect(findings[0].code).toBe("MISSING_MEASURE_TIMESTAMP");
      expect(findings[0].anchor?.anchorType).toBe("Metric");
      expect(findings[0].anchor?.anchorId).toBe("m1");
      expect(findings[0].path).toBe("/elements/measures/ms1/measureAsOf");
    });

    it("passes when current measure has measureAsOf", () => {
      const scaffold = makeScaffold({
        metrics: {
          m1: {
            id: "m1",
            measures: {
              targets: [],
              currentMeasureId: "ms1",
            },
          },
        },
        measures: {
          ms1: {
            id: "ms1",
            measureDataType: "number",
            measureValue: "42",
            measureAsOf: "2026-02-19T05:57:04Z",
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-MEASURE-01",
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe("V-MEASURE-02: Measure Value Type Integrity", () => {
    it("warns when string value does not parse as declared number", () => {
      const scaffold = makeScaffold({
        measures: {
          ms1: {
            id: "ms1",
            measureDataType: "number",
            measureValue: "not_a_number",
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-MEASURE-02",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("Warning");
      expect(findings[0].code).toBe("MEASURE_TYPE_MISMATCH");
      expect(findings[0].path).toBe("/elements/measures/ms1/measureValue");
    });

    it("warns when string value is not an integer for integer type", () => {
      const scaffold = makeScaffold({
        measures: {
          ms1: {
            id: "ms1",
            measureDataType: "integer",
            measureValue: "3.14",
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-MEASURE-02",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("MEASURE_TYPE_MISMATCH");
    });

    it("passes valid number and integer values", () => {
      const scaffold = makeScaffold({
        measures: {
          ms1: {
            id: "ms1",
            measureDataType: "number",
            measureValue: "0.032",
          },
          ms2: {
            id: "ms2",
            measureDataType: "integer",
            measureValue: "12",
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-MEASURE-02",
      );
      expect(findings).toHaveLength(0);
    });

    it("warns when boolean value is invalid string", () => {
      const scaffold = makeScaffold({
        measures: {
          ms1: {
            id: "ms1",
            measureDataType: "boolean",
            measureValue: "yes",
          },
        },
      });

      const report = validate(scaffold);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-MEASURE-02",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("MEASURE_TYPE_MISMATCH");
    });
  });

  describe("V-FRICTION-01: Anchor Referential Integrity", () => {
    it("detects anchor referencing nonexistent element", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        observations: [
          {
            observationId: "obs1",
            primaryAnchor: {
              anchorType: "Activity",
              anchorId: "ghost_activity",
            },
          },
        ],
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-01",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("UNRESOLVED_ANCHOR");
      expect(findings[0].message).toContain("ghost_activity");
      expect(findings[0].message).toContain("activities");
    });

    it("detects anchor in wrong element map", () => {
      const scaffold = makeScaffold();
      // r1 exists as a Role, but referencing it as an Activity should fail
      const heatmap = makeHeatmap({
        observations: [
          {
            observationId: "obs1",
            primaryAnchor: { anchorType: "Activity", anchorId: "r1" },
          },
        ],
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-01",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("UNRESOLVED_ANCHOR");
    });

    it("checks contributing anchors too", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        observations: [
          {
            observationId: "obs1",
            primaryAnchor: { anchorType: "Activity", anchorId: "a1" },
            contributingAnchors: [
              { anchorType: "Role", anchorId: "ghost_role" },
            ],
          },
        ],
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-01",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain("ghost_role");
    });
  });

  describe("V-FRICTION-02: Binding Anchor Must Appear in Observations", () => {
    it("detects binding anchor absent from all observations", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        observations: [
          {
            observationId: "obs1",
            primaryAnchor: { anchorType: "Activity", anchorId: "a1" },
          },
        ],
        bindingConstraint: {
          findingId: "bc1",
          bindingAnchor: { anchorType: "Role", anchorId: "r1" },
          bindingAnchorObservationId: "obs1",
          justification: "test",
        },
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-02",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("BINDING_ANCHOR_NOT_OBSERVED");
      expect(findings[0].anchor?.anchorType).toBe("Role");
    });

    it("passes when binding anchor is a contributing anchor", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        observations: [
          {
            observationId: "obs1",
            primaryAnchor: { anchorType: "Activity", anchorId: "a1" },
            contributingAnchors: [{ anchorType: "Role", anchorId: "r1" }],
          },
        ],
        bindingConstraint: {
          findingId: "bc1",
          bindingAnchor: { anchorType: "Role", anchorId: "r1" },
          bindingAnchorObservationId: "obs1",
          justification: "test",
        },
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-02",
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe("V-FRICTION-03: Binding Anchor Specificity", () => {
    it("detects binding anchor not in the referenced observation", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        observations: [
          {
            observationId: "obs1",
            primaryAnchor: { anchorType: "Activity", anchorId: "a1" },
          },
          {
            observationId: "obs2",
            primaryAnchor: { anchorType: "Role", anchorId: "r1" },
          },
        ],
        bindingConstraint: {
          findingId: "bc1",
          bindingAnchor: { anchorType: "Role", anchorId: "r1" },
          bindingAnchorObservationId: "obs1",
          justification: "test",
        },
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-03",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("BINDING_ANCHOR_NOT_IN_OBSERVATION");
    });

    it("detects invalid bindingAnchorObservationId", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        bindingConstraint: {
          findingId: "bc1",
          bindingAnchor: { anchorType: "Activity", anchorId: "a1" },
          bindingAnchorObservationId: "nonexistent_obs",
          justification: "test",
        },
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-03",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("BINDING_OBSERVATION_NOT_FOUND");
    });
  });

  describe("V-FRICTION-04: ValueStream ID Must Exist", () => {
    it("detects heatmap referencing nonexistent value stream", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        valueStreamId: "ghost_vs",
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-04",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].code).toBe("INVALID_VALUE_STREAM_REF");
      expect(findings[0].message).toContain("ghost_vs");
    });

    it("passes when valueStreamId exists in scaffold", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({ valueStreamId: "vs1" });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-04",
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe("V-FRICTION-05: Cross-File Integrity Hash", () => {
    it("warns on placeholder hash", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        scaffoldIntegrityHash: "0".repeat(64),
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-05",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("Warning");
      expect(findings[0].code).toBe("PLACEHOLDER_HASH");
    });

    it("errors on mismatched hash", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap({
        scaffoldIntegrityHash: "a".repeat(64),
      });

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-05",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe("Error");
      expect(findings[0].code).toBe("HASH_MISMATCH");
    });

    it("passes when hash is absent", () => {
      const scaffold = makeScaffold();
      const heatmap = makeHeatmap();
      // no scaffoldIntegrityHash set

      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-05",
      );
      expect(findings).toHaveLength(0);
    });

    it("passes when hash matches computed scaffold hash", () => {
      const scaffold = makeScaffold();
      // Compute the correct hash by running validation and extracting from a mismatch error
      const probeHeatmap = makeHeatmap({
        scaffoldIntegrityHash: "a".repeat(64),
      });
      const probeReport = validate(scaffold, probeHeatmap);
      const mismatch = probeReport.findings.find(
        (f) => f.code === "HASH_MISMATCH",
      );
      // Extract the computed hash from the message
      const match = mismatch?.message.match(/computed scaffold hash '([a-f0-9]{64})'/);
      const correctHash = match?.[1];
      expect(correctHash).toBeTruthy();

      const heatmap = makeHeatmap({
        scaffoldIntegrityHash: correctHash!,
      });
      const report = validate(scaffold, heatmap);
      const findings = report.findings.filter(
        (f) => f.ruleId === "V-FRICTION-05",
      );
      expect(findings).toHaveLength(0);
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
