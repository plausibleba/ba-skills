import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createValidator, loadSchema } from "../schemas.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../../../../fixtures/golden");

function loadFixture(filename: string): unknown {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, filename), "utf-8"));
}

describe("Golden fixture validation", () => {
  const ajv = createValidator();

  it("scaffold.json validates against ScaffoldModel.schema.json", () => {
    const schema = loadSchema("ScaffoldModel.schema.json");
    const data = loadFixture("scaffold.json");
    const validate = ajv.compile(schema);
    const valid = validate(data);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it("heatmap.json validates against FrictionHeatmap.schema.json", () => {
    const schema = loadSchema("FrictionHeatmap.schema.json");
    const data = loadFixture("heatmap.json");
    const validate = ajv.compile(schema);
    const valid = validate(data);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });
});
