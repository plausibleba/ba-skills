/**
 * validator-session11.test.ts
 * Unit tests for Session 11 validator rules:
 *   - V-ACTIVITY-04/05/06: Execution grammar ref integrity
 *   - V-ACTIVITY-09/10:    Execution grammar cardinality
 *   - V-COMPOSITE-02–06:   Mereological parthood semantics
 *   - V-HEATMAP-02–04:     Three-layer heatmap integrity
 *
 * Run: vitest run packages/shared/src/validator-session11.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  checkExecutionGrammarRefs,
  checkExecutionGrammarCardinality,
  checkCompositeActivitySemantics,
  checkHeatmapLayerIntegrity,
} from "./validator";
import type { ScaffoldElements, HeatmapInput } from "./validator";

/* ── Helpers ──────────────────────────────────────────────────────── */

function makeElements(overrides: Partial<ScaffoldElements> = {}): ScaffoldElements {
  return {
    valueStreams: {},
    activities: {},
    outcomes: {},
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
    applicationFunctions: {},
    recordClasses: {},
    ...overrides,
  };
}

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: "act_001",
    elementType: "Activity",
    name: "Test Activity",
    performedByRoleIds: ["role_001"],
    preOutcomeId: "oc_pre",
    postOutcomeId: "oc_post",
    ...overrides,
  };
}

/* ── V-ACTIVITY-04: applicationFunctionIds must resolve ──────────── */

describe("checkExecutionGrammarRefs — V-ACTIVITY-04", () => {
  it("passes when applicationFunctionIds resolve", () => {
    const elements = makeElements({
      applicationFunctions: { "af_001": { id: "af_001", elementType: "ApplicationFunction", name: "Workday Recruitment" } },
      activities: {
        act_001: makeActivity({ applicationFunctionIds: ["af_001"] }) as any,
      },
    });
    const findings = checkExecutionGrammarRefs(elements);
    expect(findings.filter(f => f.ruleId === "V-ACTIVITY-04")).toHaveLength(0);
  });

  it("errors when applicationFunctionId does not resolve", () => {
    const elements = makeElements({
      applicationFunctions: {},
      activities: {
        act_001: makeActivity({ applicationFunctionIds: ["af_MISSING"] }) as any,
      },
    });
    const findings = checkExecutionGrammarRefs(elements);
    const errors = findings.filter(f => f.ruleId === "V-ACTIVITY-04");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("UNRESOLVED_APPLICATION_FUNCTION");
    expect(errors[0].severity).toBe("Error");
  });

  it("errors for each unresolved applicationFunctionId", () => {
    const elements = makeElements({
      applicationFunctions: { "af_001": { id: "af_001", elementType: "ApplicationFunction", name: "AF One" } },
      activities: {
        act_001: makeActivity({ applicationFunctionIds: ["af_001", "af_MISSING_1", "af_MISSING_2"] }) as any,
      },
    });
    const findings = checkExecutionGrammarRefs(elements);
    expect(findings.filter(f => f.ruleId === "V-ACTIVITY-04")).toHaveLength(2);
  });
});

/* ── V-ACTIVITY-05: primaryRecordClassId must resolve ───────────── */

describe("checkExecutionGrammarRefs — V-ACTIVITY-05", () => {
  it("passes when primaryRecordClassId resolves", () => {
    const elements = makeElements({
      recordClasses: { "rc_001": { id: "rc_001", elementType: "RecordClass", name: "CustomerRecord" } },
      activities: {
        act_001: makeActivity({ primaryRecordClassId: "rc_001" }) as any,
      },
    });
    const findings = checkExecutionGrammarRefs(elements);
    expect(findings.filter(f => f.ruleId === "V-ACTIVITY-05")).toHaveLength(0);
  });

  it("errors when primaryRecordClassId does not resolve", () => {
    const elements = makeElements({
      recordClasses: {},
      activities: {
        act_001: makeActivity({ primaryRecordClassId: "rc_MISSING" }) as any,
      },
    });
    const findings = checkExecutionGrammarRefs(elements);
    const errors = findings.filter(f => f.ruleId === "V-ACTIVITY-05");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("UNRESOLVED_RECORD_CLASS");
  });

  it("passes when primaryRecordClassId is absent (optional field)", () => {
    const elements = makeElements({
      recordClasses: {},
      activities: {
        act_001: makeActivity() as any,
      },
    });
    const findings = checkExecutionGrammarRefs(elements);
    expect(findings.filter(f => f.ruleId === "V-ACTIVITY-05")).toHaveLength(0);
  });
});

/* ── V-ACTIVITY-06: compositeActivityId must resolve ────────────── */

describe("checkExecutionGrammarRefs — V-ACTIVITY-06", () => {
  it("passes when compositeActivityId resolves to existing activity", () => {
    const elements = makeElements({
      activities: {
        composite_001: makeActivity({ id: "composite_001" }) as any,
        act_001: makeActivity({ id: "act_001", compositeActivityId: "composite_001" }) as any,
      },
    });
    const findings = checkExecutionGrammarRefs(elements);
    expect(findings.filter(f => f.ruleId === "V-ACTIVITY-06")).toHaveLength(0);
  });

  it("errors when compositeActivityId does not resolve", () => {
    const elements = makeElements({
      activities: {
        act_001: makeActivity({ compositeActivityId: "composite_MISSING" }) as any,
      },
    });
    const findings = checkExecutionGrammarRefs(elements);
    const errors = findings.filter(f => f.ruleId === "V-ACTIVITY-06");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("UNRESOLVED_COMPOSITE_ACTIVITY");
  });
});

/* ── V-ACTIVITY-09/10: Cardinality ──────────────────────────────── */

describe("checkExecutionGrammarCardinality", () => {
  it("warns (not errors) when registries are absent and fields missing", () => {
    const elements = makeElements({
      applicationFunctions: {},
      recordClasses: {},
      activities: {
        act_001: makeActivity() as any,
      },
    });
    const findings = checkExecutionGrammarCardinality(elements);
    // No registries = legacy scaffold = warnings only
    expect(findings.every(f => f.severity === "Warning")).toBe(true);
    expect(findings.some(f => f.ruleId === "V-ACTIVITY-09")).toBe(true);
    expect(findings.some(f => f.ruleId === "V-ACTIVITY-10")).toBe(true);
  });

  it("errors when registries ARE present but fields missing", () => {
    const elements = makeElements({
      applicationFunctions: { "af_001": { id: "af_001", elementType: "ApplicationFunction", name: "AF" } },
      recordClasses: {},
      activities: {
        act_001: makeActivity() as any,
      },
    });
    const findings = checkExecutionGrammarCardinality(elements);
    // Registry present = errors
    expect(findings.some(f => f.severity === "Error" && f.ruleId === "V-ACTIVITY-09")).toBe(true);
  });

  it("passes when both fields populated", () => {
    const elements = makeElements({
      applicationFunctions: { "af_001": { id: "af_001", elementType: "ApplicationFunction", name: "AF" } },
      recordClasses: { "rc_001": { id: "rc_001", elementType: "RecordClass", name: "RC" } },
      activities: {
        act_001: makeActivity({
          applicationFunctionIds: ["af_001"],
          primaryRecordClassId: "rc_001",
        }) as any,
      },
    });
    const findings = checkExecutionGrammarCardinality(elements);
    expect(findings.filter(f => f.ruleId === "V-ACTIVITY-09" || f.ruleId === "V-ACTIVITY-10")).toHaveLength(0);
  });
});

/* ── V-COMPOSITE: Mereological parthood semantics ───────────────── */

describe("checkCompositeActivitySemantics", () => {
  // Build a valid composite + 2 parts for reuse
  function makeCompositeScenario() {
    return makeElements({
      recordClasses: { "rc_001": { id: "rc_001", elementType: "RecordClass", name: "OrderRecord" } },
      activities: {
        // Composite: oc_start → oc_end
        composite_001: makeActivity({
          id: "composite_001",
          preOutcomeId: "oc_start",
          postOutcomeId: "oc_end",
          primaryRecordClassId: "rc_001",
        }) as any,
        // Part 1: oc_start → oc_mid
        part_001: makeActivity({
          id: "part_001",
          preOutcomeId: "oc_start",
          postOutcomeId: "oc_mid",
          primaryRecordClassId: "rc_001",
          compositeActivityId: "composite_001",
        }) as any,
        // Part 2: oc_mid → oc_end
        part_002: makeActivity({
          id: "part_002",
          preOutcomeId: "oc_mid",
          postOutcomeId: "oc_end",
          primaryRecordClassId: "rc_001",
          compositeActivityId: "composite_001",
        }) as any,
      },
    });
  }

  it("passes a valid composite with correct chain and boundaries", () => {
    const elements = makeCompositeScenario();
    const findings = checkCompositeActivitySemantics(elements);
    expect(findings).toHaveLength(0);
  });

  it("V-COMPOSITE-02: errors when part has different RecordClass to composite", () => {
    const elements = makeCompositeScenario();
    (elements.activities["part_001"] as any).primaryRecordClassId = "rc_DIFFERENT";
    const findings = checkCompositeActivitySemantics(elements);
    expect(findings.some(f => f.ruleId === "V-COMPOSITE-02")).toBe(true);
  });

  it("V-COMPOSITE-03: errors when first part preOutcome mismatches composite preOutcome", () => {
    const elements = makeCompositeScenario();
    (elements.activities["part_001"] as any).preOutcomeId = "oc_WRONG";
    const findings = checkCompositeActivitySemantics(elements);
    expect(findings.some(f => f.ruleId === "V-COMPOSITE-03")).toBe(true);
  });

  it("V-COMPOSITE-04: errors when last part postOutcome mismatches composite postOutcome", () => {
    const elements = makeCompositeScenario();
    (elements.activities["part_002"] as any).postOutcomeId = "oc_WRONG";
    const findings = checkCompositeActivitySemantics(elements);
    expect(findings.some(f => f.ruleId === "V-COMPOSITE-04")).toBe(true);
  });

  it("V-COMPOSITE-05: errors when parts have ambiguous chain (two possible first parts)", () => {
    const elements = makeCompositeScenario();
    // Make part_002 also start at oc_start — now two candidates for first part
    (elements.activities["part_002"] as any).preOutcomeId = "oc_start";
    const findings = checkCompositeActivitySemantics(elements);
    expect(findings.some(f => f.ruleId === "V-COMPOSITE-05")).toBe(true);
  });

  it("V-COMPOSITE-06: errors when chain is incomplete (disconnected part)", () => {
    const elements = makeCompositeScenario();
    // Add a third part that is disconnected from the chain
    (elements.activities as any)["part_003"] = makeActivity({
      id: "part_003",
      preOutcomeId: "oc_ORPHAN",
      postOutcomeId: "oc_ORPHAN_END",
      primaryRecordClassId: "rc_001",
      compositeActivityId: "composite_001",
    });
    const findings = checkCompositeActivitySemantics(elements);
    expect(findings.some(f => f.ruleId === "V-COMPOSITE-06")).toBe(true);
  });
});

/* ── V-HEATMAP-02–04: Three-layer heatmap integrity ─────────────── */

describe("checkHeatmapLayerIntegrity", () => {
  function makeThreeLayerHeatmap(overrides: Record<string, unknown> = {}): HeatmapInput {
    return {
      heatmapId: "hm_001",
      scaffoldId: "sc_001",
      valueStreamId: "vs_001",
      createdAt: new Date().toISOString(),
      observations: [],
      bindingConstraint: null as any,
      // Three-layer shape fields
      diagnosticLayer: {
        observations: [
          { id: "obs_001", type: "friction", anchors: ["act_001"] },
          { id: "obs_002", type: "opportunity", anchors: ["cap_001"] },
        ],
      },
      interpretiveLayer: {
        bindingConstraint: {
          sourceObservationId: "obs_001",
          justification: "Most systemic blocker",
        },
      },
      interventionLayer: {
        interventions: [
          { id: "int_001", sourceObservationId: "obs_001" },
        ],
      },
      ...overrides,
    } as any;
  }

  it("skips gracefully on legacy flat heatmap (no diagnosticLayer)", () => {
    const legacy: HeatmapInput = {
      heatmapId: "hm_001",
      scaffoldId: "sc_001",
      valueStreamId: "vs_001",
      createdAt: new Date().toISOString(),
      observations: [],
      bindingConstraint: null as any,
    };
    const findings = checkHeatmapLayerIntegrity(legacy);
    expect(findings).toHaveLength(0);
  });

  it("passes a valid three-layer heatmap", () => {
    const heatmap = makeThreeLayerHeatmap();
    const findings = checkHeatmapLayerIntegrity(heatmap);
    expect(findings).toHaveLength(0);
  });

  it("V-HEATMAP-02: errors when binding constraint references missing observation", () => {
    const heatmap = makeThreeLayerHeatmap({
      interpretiveLayer: {
        bindingConstraint: {
          sourceObservationId: "obs_MISSING",
          justification: "should fail",
        },
      },
    });
    const findings = checkHeatmapLayerIntegrity(heatmap);
    expect(findings.some(f => f.ruleId === "V-HEATMAP-02")).toBe(true);
  });

  it("V-HEATMAP-02: passes when no binding constraint set", () => {
    const heatmap = makeThreeLayerHeatmap({
      interpretiveLayer: {},
    });
    const findings = checkHeatmapLayerIntegrity(heatmap);
    expect(findings.filter(f => f.ruleId === "V-HEATMAP-02")).toHaveLength(0);
  });

  it("V-HEATMAP-04: errors when intervention references missing observation", () => {
    const heatmap = makeThreeLayerHeatmap({
      interventionLayer: {
        interventions: [
          { id: "int_001", sourceObservationId: "obs_MISSING" },
        ],
      },
    });
    const findings = checkHeatmapLayerIntegrity(heatmap);
    expect(findings.some(f => f.ruleId === "V-HEATMAP-04")).toBe(true);
  });

  it("V-HEATMAP-04: passes when intervention references valid observation", () => {
    const heatmap = makeThreeLayerHeatmap();
    const findings = checkHeatmapLayerIntegrity(heatmap);
    expect(findings.filter(f => f.ruleId === "V-HEATMAP-04")).toHaveLength(0);
  });

  it("V-HEATMAP-04: errors for each invalid intervention independently", () => {
    const heatmap = makeThreeLayerHeatmap({
      interventionLayer: {
        interventions: [
          { id: "int_001", sourceObservationId: "obs_001" },       // valid
          { id: "int_002", sourceObservationId: "obs_MISSING_1" }, // invalid
          { id: "int_003", sourceObservationId: "obs_MISSING_2" }, // invalid
        ],
      },
    });
    const findings = checkHeatmapLayerIntegrity(heatmap);
    expect(findings.filter(f => f.ruleId === "V-HEATMAP-04")).toHaveLength(2);
  });
});
