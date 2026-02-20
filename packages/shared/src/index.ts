export {
  validate,
  validateSemantic,
  computeScaffoldHash,
  type ValidationReport,
  type Finding,
  type ScaffoldInput,
  type HeatmapInput,
  type ScaffoldElements,
} from "./validator.js";

export {
  validateScaffoldSchema,
  validateHeatmapSchema,
  type SchemaFinding,
} from "./schema-validator.js";
