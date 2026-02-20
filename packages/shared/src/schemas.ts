import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const SCHEMAS_DIR = resolve(__dirname, "../../../schemas");

export function createValidator(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  return ajv;
}

export function loadAllSchemas(): Map<string, Record<string, unknown>> {
  const schemas = new Map<string, Record<string, unknown>>();
  const files = readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const content = readFileSync(join(SCHEMAS_DIR, file), "utf-8");
    schemas.set(file, JSON.parse(content) as Record<string, unknown>);
  }
  return schemas;
}

export function loadSchema(filename: string): Record<string, unknown> {
  const content = readFileSync(join(SCHEMAS_DIR, filename), "utf-8");
  return JSON.parse(content) as Record<string, unknown>;
}
