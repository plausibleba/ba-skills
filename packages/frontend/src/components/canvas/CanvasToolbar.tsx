import type { HeatmapData, ValidationReport } from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import { PPIT_LABELS, PPIT_LAYERS } from "./ppit.ts";
import { ChevronIcon } from "./ChevronIcon.tsx";

/* ── Toggle Button ─────────────────────────────────────────────────── */

function ToggleBtn({
  label,
  isOpen,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
        isOpen
          ? "bg-vcc-100 text-vcc-700 shadow-sm"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-500"
      }`}
    >
      <ChevronIcon
        open={isOpen}
        className={isOpen ? "text-vcc-400" : "text-gray-300"}
      />
      {label}
    </button>
  );
}

/* ── Layer colour map ──────────────────────────────────────────────── */

const LAYER_COLORS: Record<PPITLayer, { on: string }> = {
  roles: { on: "bg-blue-100 text-blue-600" },
  activities: { on: "bg-violet-100 text-violet-600" },
  concepts: { on: "bg-amber-100 text-amber-700" },
  applications: { on: "bg-emerald-100 text-emerald-600" },
};

/* ── Canvas Toolbar ────────────────────────────────────────────────── */

export function CanvasToolbar({
  structureOpen,
  analyticsOpen,
  ppitToggles,
  onToggleStructure,
  onToggleAnalytics,
  onTogglePPIT,
  heatmapData,
  validationReport,
}: {
  structureOpen: boolean;
  analyticsOpen: boolean;
  ppitToggles: Record<PPITLayer, boolean>;
  onToggleStructure: () => void;
  onToggleAnalytics: () => void;
  onTogglePPIT: (layer: PPITLayer) => void;
  heatmapData: HeatmapData | null;
  validationReport: ValidationReport | null;
}) {
  return (
    <div className="flex flex-shrink-0 items-center gap-3">
      {/* View controls */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-100 bg-white px-1.5 py-1 shadow-sm">
        <ToggleBtn
          label="Structure"
          isOpen={structureOpen}
          onToggle={onToggleStructure}
        />
        <ToggleBtn
          label="Transformation"
          isOpen={analyticsOpen}
          onToggle={onToggleAnalytics}
        />
      </div>

      {/* Layer toggles */}
      <div className="flex items-center gap-0.5 rounded-lg border border-gray-100 bg-white px-1.5 py-1 shadow-sm">
        <span className="px-1 text-[9px] font-medium uppercase tracking-wider text-gray-300">
          Layers
        </span>
        {PPIT_LAYERS.map((layer) => (
          <button
            key={layer}
            onClick={() => onTogglePPIT(layer)}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
              ppitToggles[layer]
                ? LAYER_COLORS[layer].on
                : "text-gray-400 hover:bg-gray-50 hover:text-gray-500"
            }`}
          >
            {PPIT_LABELS[layer].short}
          </button>
        ))}
      </div>

      {/* State indicators */}
      <div className="flex items-center gap-2">
        {heatmapData && (
          <div className="flex gap-1 text-[9px]">
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-500">
              Execution
            </span>
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-400">
              Governing
            </span>
          </div>
        )}
        {validationReport && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              validationReport.status === "Valid"
                ? "bg-green-50 text-green-600"
                : validationReport.status === "ValidWithWarnings"
                  ? "bg-yellow-50 text-yellow-600"
                  : "bg-red-50 text-red-500"
            }`}
          >
            {validationReport.status}
          </span>
        )}
      </div>
    </div>
  );
}
