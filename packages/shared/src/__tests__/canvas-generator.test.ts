import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createValidator, loadSchema } from "../schemas.js";
import { generateCanvasViewModel } from "../canvas-generator.js";
import type { ScaffoldInput } from "../validator.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const GOLDEN_DIR = resolve(__dirname, "../../../../fixtures/golden");

const goldenScaffold: ScaffoldInput = JSON.parse(
  readFileSync(resolve(GOLDEN_DIR, "scaffold.json"), "utf-8"),
) as ScaffoldInput;

const VS_ID = "vs_credit_risk_assessment_mgmt";

describe("generateCanvasViewModel", () => {
  const vm = generateCanvasViewModel(goldenScaffold, VS_ID);

  it("output validates against CanvasViewModel.schema.json", () => {
    const ajv = createValidator();
    const schema = loadSchema("CanvasViewModel.schema.json");
    const validate = ajv.compile(schema);
    const valid = validate(vm);
    if (!valid) {
      // Print errors for debugging if validation fails
      console.error(validate.errors);
    }
    expect(valid).toBe(true);
  });

  it("every activity appears in exactly one column (no orphans, no duplicates)", () => {
    const vsActivities =
      goldenScaffold.elements.valueStreams[VS_ID].activityIds;

    const allActivityIds = vm.columns.flatMap((c) => c.activityIds);

    // No duplicates
    expect(allActivityIds.length).toBe(new Set(allActivityIds).size);

    // Every VS activity is present
    for (const actId of vsActivities) {
      expect(allActivityIds).toContain(actId);
    }

    // No extra activities beyond the VS
    for (const actId of allActivityIds) {
      expect(vsActivities).toContain(actId);
    }
  });

  it("column count matches unique preOutcomeId values in chain", () => {
    const elements = goldenScaffold.elements;
    const vs = elements.valueStreams[VS_ID];

    // Walk the chain to collect unique preOutcomeIds
    const uniquePreOutcomes = new Set<string>();
    let current: string | null = vs.activityIds[0];
    const visited = new Set<string>();
    while (current != null && current in elements.activities) {
      if (visited.has(current)) break;
      visited.add(current);
      uniquePreOutcomes.add(elements.activities[current].preOutcomeId);
      current = elements.activities[current].nextActivityId ?? null;
    }

    expect(vm.columns.length).toBe(uniquePreOutcomes.size);
  });

  it("first column aggregates contain correct roleIds and capabilityIds", () => {
    // First activity: act_compile_credit_data_profile
    const firstCol = vm.columns[0];
    expect(firstCol.activityIds).toContain("act_compile_credit_data_profile");

    expect(firstCol.aggregates.roleIds.sort()).toEqual(
      [
        "role_credit_analyst",
        "role_data_steward",
        "role_relationship_manager",
      ].sort(),
    );

    expect(firstCol.aggregates.capabilityIds.sort()).toEqual(
      [
        "cap_credit_application_mgmt",
        "cap_creditworthiness_assurance",
        "cap_information_mgmt",
      ].sort(),
    );
  });

  it("summary counts are correct", () => {
    expect(vm.summary.totalActivities).toBe(9);
    expect(vm.summary.totalRoles).toBe(7);
    expect(vm.summary.totalCapabilities).toBe(8);
    expect(vm.summary.totalMetrics).toBe(9);
    expect(vm.summary.totalControls).toBe(4);
    expect(vm.summary.totalConstraints).toBe(0);
  });

  it("viewId is deterministic across calls", () => {
    const vm2 = generateCanvasViewModel(goldenScaffold, VS_ID);
    expect(vm2.viewId).toBe(vm.viewId);
  });

  it("scaffoldIntegrityHash is a 64-char hex string", () => {
    expect(vm.scaffoldIntegrityHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("throws for unknown valueStreamId", () => {
    expect(() =>
      generateCanvasViewModel(goldenScaffold, "vs_nonexistent"),
    ).toThrow("ValueStream 'vs_nonexistent' not found");
  });

  it("defaults groupingMode to OutcomeProgression", () => {
    expect(vm.groupingMode).toBe("OutcomeProgression");
  });
});
