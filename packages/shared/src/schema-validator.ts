import type { ValidateFunction, ErrorObject } from "ajv/dist/2020.js";
import { createValidator, loadSchema } from "./schemas.js";

export interface SchemaFinding {
  severity: "Error";
  ruleId: "SCHEMA";
  code: string;
  message: string;
  path: string;
}

const KEYWORD_TO_CODE: Record<string, string> = {
  additionalProperties: "ADDITIONAL_PROPERTIES",
};

function keywordToCode(keyword: string): string {
  return `ERR_SCHEMA_${KEYWORD_TO_CODE[keyword] ?? keyword.toUpperCase()}`;
}

function ajvErrorToFinding(err: ErrorObject): SchemaFinding {
  return {
    severity: "Error",
    ruleId: "SCHEMA",
    code: keywordToCode(err.keyword),
    message: `${err.instancePath || "/"}: ${err.message ?? err.keyword}`,
    path: err.instancePath || "/",
  };
}

// Validators compiled once at module load
const ajv = createValidator();
const _validateScaffold: ValidateFunction = ajv.compile(
  loadSchema("ScaffoldModel.schema.json"),
);
const _validateHeatmap: ValidateFunction = ajv.compile(
  loadSchema("FrictionHeatmap.schema.json"),
);

export function validateScaffoldSchema(data: unknown): SchemaFinding[] {
  const valid = _validateScaffold(data);
  if (valid) return [];
  return (_validateScaffold.errors ?? []).map(ajvErrorToFinding);
}

export function validateHeatmapSchema(data: unknown): SchemaFinding[] {
  const valid = _validateHeatmap(data);
  if (valid) return [];
  return (_validateHeatmap.errors ?? []).map(ajvErrorToFinding);
}
