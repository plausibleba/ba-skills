import type { HeatmapData, ValidationReport } from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import type { CardToggleLayer } from "./useCanvasControls.ts";
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
          ? "shadow-sm"
          : ""
      }`}
      style={isOpen ? { background: "rgba(74,158,218,0.15)", color: "#4a9eda" } : { color: "#94a3b8" }}
    >
      <ChevronIcon
        open={isOpen}
        className={isOpen ? "text-blue-400" : "text-gray-500"}
      />
      {label}
    </button>
  );
}

/* ── Layer colour map ──────────────────────────────────────────────── */

const LAYER_COLORS: Record<PPITLayer, { on: string }> = {
  roles: { on: "bg-blue-500/15 text-blue-300" },
  activities: { on: "bg-violet-500/15 text-violet-300" },
  concepts: { on: "bg-amber-500/15 text-amber-300" },
  applications: { on: "bg-emerald-500/15 text-emerald-300" },
};

/* ── Canvas Toolbar ────────────────────────────────────────────────── */

export function CanvasToolbar({
  structureOpen,
  analyticsOpen,
  constraintDAGOpen,
  ppitToggles,
  cardToggles,
  onToggleStructure,
  onToggleAnalytics,
  onToggleConstraintDAG,
  onTogglePPIT,
  onToggleCard,
  heatmapData,
  validationReport,
}: {
  structureOpen: boolean;
  analyticsOpen: boolean;
  constraintDAGOpen: boolean;
  ppitToggles: Record<PPITLayer, boolean>;
  cardToggles: Record<CardToggleLayer, boolean>;
  onToggleStructure: () => void;
  onToggleAnalytics: () => void;
  onToggleConstraintDAG: () => void;
  onTogglePPIT: (layer: PPITLayer) => void;
  onToggleCard: (layer: CardToggleLayer) => void;
  heatmapData: HeatmapData | null;
  validationReport: ValidationReport | null;
}) {
  return (
    <div className="flex flex-shrink-0 items-center gap-3">
      {/* View controls */}
      <div className="flex items-center gap-1 rounded-lg px-1.5 py-1 shadow-sm" style={{ border: "1px solid #2e3f5c", background: "#243352" }}>
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
        <ToggleBtn
          label="Constraints"
          isOpen={constraintDAGOpen}
          onToggle={onToggleConstraintDAG}
        />
      </div>

      {/* Layer toggles */}
      <div className="flex items-center gap-0.5 rounded-lg px-1.5 py-1 shadow-sm" style={{ border: "1px solid #2e3f5c", background: "#243352" }}>
        <span className="px-1 text-[9px] font-medium uppercase tracking-wider" style={{ color: "#94a3b8" }}>
          Layers
        </span>
        {PPIT_LAYERS.map((layer) => (
          <button
            key={layer}
            onClick={() => onTogglePPIT(layer)}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
              ppitToggles[layer]
                ? LAYER_COLORS[layer].on
                : ""
            }`}
            style={ppitToggles[layer] ? {} : { color: "#94a3b8" }}
          >
            {PPIT_LABELS[layer].short}
          </button>
        ))}
      </div>

      {/* MVC Card toggles */}
      <div className="flex items-center gap-0.5 rounded-lg px-1.5 py-1 shadow-sm" style={{ border: "1px solid #2e3f5c", background: "#243352" }}>
        <span className="px-1 text-[9px] font-medium uppercase tracking-wider" style={{ color: "#94a3b8" }}>
          Cards
        </span>
        <button
          onClick={() => onToggleCard("concepts")}
          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
            cardToggles.concepts
              ? "bg-sky-500/15 text-sky-300"
              : ""
          }`}
          style={cardToggles.concepts ? {} : { color: "#94a3b8" }}
          title="Concept Cards (MVC)"
        >
          C
        </button>
        <button
          onClick={() => onToggleCard("policies")}
          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
            cardToggles.policies
              ? "bg-rose-500/15 text-rose-300"
              : ""
          }`}
          style={cardToggles.policies ? {} : { color: "#94a3b8" }}
          title="Policy Cards (MVC)"
        >
          P
        </button>
      </div>

      {/* State indicators */}
      <div className="flex items-center gap-2">
        {heatmapData && (
          <div className="flex gap-1 text-[9px]">
            <span className="rounded px-1.5 py-0.5" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
              Execution
            </span>
            <span className="rounded px-1.5 py-0.5" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
              Governing
            </span>
          </div>
        )}
        {validationReport && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={
              validationReport.status === "Valid"
                ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                : validationReport.status === "ValidWithWarnings"
                  ? { background: "rgba(234,179,8,0.15)", color: "#facc15" }
                  : { background: "rgba(239,68,68,0.15)", color: "#f87171" }
            }
          >
            {validationReport.status}
          </span>
        )}
      </div>
    </div>
  );
}
