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

export {
  generateCanvasViewModel,
  type CanvasViewModel,
  type CanvasColumn,
  type CanvasSummary,
  type GroupingMode,
} from "./canvas-generator.js";

export {
  createExportBundle,
  packBundle,
  unpackBundle,
  validateImportBundle,
  type ExportBundleOptions,
  type ExportBundleMetadata,
  type UnpackResult,
} from "./export-bundle.js";
