import type { HeatmapData } from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import type { CardToggleLayer } from "./useCanvasControls.ts";
import type { ModuleFeatures } from "../../lib/module-features.ts";
import { PPIT_LABELS, PPIT_LAYERS } from "./ppit.ts";
import { useThemeStore } from "../../store/theme-store.ts";
import { tv } from "../../theme.ts";

/* ── Layer colour map — dark/light variants for contrast ──────────── */

const LAYER_COLORS_DARK: Record<PPITLayer, { bg: string; fg: string }> = {
  roles:        { bg: "rgba(59,130,246,0.15)",  fg: "#93c5fd" },
  activities:   { bg: "rgba(139,92,246,0.15)",  fg: "#c4b5fd" },
  concepts:     { bg: "rgba(245,158,11,0.15)",  fg: "#fcd34d" },
  applications: { bg: "rgba(16,185,129,0.15)",  fg: "#6ee7b7" },
};

const LAYER_COLORS_LIGHT: Record<PPITLayer, { bg: string; fg: string }> = {
  roles:        { bg: "rgba(59,130,246,0.12)",  fg: "#2563eb" },
  activities:   { bg: "rgba(139,92,246,0.12)",  fg: "#7c3aed" },
  concepts:     { bg: "rgba(217,119,6,0.12)",   fg: "#b45309" },
  applications: { bg: "rgba(5,150,105,0.12)",   fg: "#047857" },
};

/* ── Canvas Toolbar ────────────────────────────────────────────────── */

export function CanvasToolbar({
  constraintDAGOpen,
  ppitToggles,
  cardToggles,
  onToggleConstraintDAG,
  onTogglePPIT,
  onToggleCard,
  heatmapData,
  features,
}: {
  constraintDAGOpen: boolean;
  ppitToggles: Record<PPITLayer, boolean>;
  cardToggles: Record<CardToggleLayer, boolean>;
  onToggleConstraintDAG: () => void;
  onTogglePPIT: (layer: PPITLayer) => void;
  onToggleCard: (layer: CardToggleLayer) => void;
  heatmapData: HeatmapData | null;
  features: ModuleFeatures;
}) {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const layerPalette = isDark ? LAYER_COLORS_DARK : LAYER_COLORS_LIGHT;
  return (
    <div className="flex flex-shrink-0 items-center gap-3">
      {/* Dependencies graph icon */}
      <button
        onClick={onToggleConstraintDAG}
        className="flex items-center justify-center rounded-lg p-1.5 transition-all"
        style={constraintDAGOpen
          ? { background: "rgba(74,158,218,0.15)", color: tv.accent, border: `1px solid ${tv.borderSubtle}` }
          : { color: tv.textDim, border: `1px solid transparent` }}
        title="Dependency Graph"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="5" cy="6" r="2" />
          <circle cx="19" cy="6" r="2" />
          <circle cx="12" cy="18" r="2" />
          <path d="M7 7l3.5 9M17 7l-3.5 9" />
        </svg>
      </button>

      {/* Layer toggles */}
      <div className="flex items-center gap-0.5 rounded-lg px-1.5 py-1 shadow-sm" style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.bgCard }}>
        <span className="px-1 text-[9px] font-medium uppercase tracking-wider" style={{ color: tv.textDim }}>
          Layers
        </span>
        {PPIT_LAYERS.map((layer) => (
          <button
            key={layer}
            onClick={() => onTogglePPIT(layer)}
            className="rounded px-2 py-0.5 text-[10px] font-medium transition-all"
            style={ppitToggles[layer]
              ? { background: layerPalette[layer].bg, color: layerPalette[layer].fg }
              : { color: tv.textDim }}
          >
            {PPIT_LABELS[layer].short}
          </button>
        ))}
      </div>

      {/* MVC Card toggles */}
      {features.mvcCards && <div className="flex items-center gap-0.5 rounded-lg px-1.5 py-1 shadow-sm" style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.bgCard }}>
        <span className="px-1 text-[9px] font-medium uppercase tracking-wider" style={{ color: tv.textDim }}>
          Cards
        </span>
        <button
          onClick={() => onToggleCard("concepts")}
          className="rounded px-2 py-0.5 text-[10px] font-medium transition-all"
          style={cardToggles.concepts
            ? { background: isDark ? "rgba(14,165,233,0.15)" : "rgba(2,132,199,0.12)", color: isDark ? "#7dd3fc" : "#0369a1" }
            : { color: tv.textDim }}
          title="Concept Cards (MVC)"
        >
          C
        </button>
        <button
          onClick={() => onToggleCard("policies")}
          className="rounded px-2 py-0.5 text-[10px] font-medium transition-all"
          style={cardToggles.policies
            ? { background: isDark ? "rgba(244,63,94,0.15)" : "rgba(225,29,72,0.12)", color: isDark ? "#fda4af" : "#be123c" }
            : { color: tv.textDim }}
          title="Policy Cards (MVC)"
        >
          P
        </button>
      </div>}

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
        {/* Validation status removed — internal signal, not useful for end users */}
      </div>
    </div>
  );
}
