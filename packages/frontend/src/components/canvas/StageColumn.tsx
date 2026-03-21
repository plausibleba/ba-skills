// @ts-nocheck
import type {
  CanvasColumn,
  FrictionObservation,
  ScaffoldData,
} from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import type { CardToggleLayer } from "./useCanvasControls.ts";
import type { CardRegistry } from "../../types/cards.ts";
import type { InspectorTarget } from "./InspectorPanel.tsx";
import { StructurePane } from "./StructurePane.tsx";
import { StageCard } from "./StageCard.tsx";
import { InlineEdit } from "./InlineEdit.tsx";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { tv, getTheme } from "../../theme.ts";

/* Dark palette for binding constraint headers (always dark bg) */
const dk = getTheme("dark");

/* ── Stage Column ──────────────────────────────────────────────────── */

export function StageColumn({
  column,
  scaffold,
  index,
  total,
  frictionMap,
  bindingActivityIds,
  selectedActivityId,
  hasHeatmap,
  ppitToggles,
  cardToggles,
  cardRegistry,
  structureOpen,
  analyticsOpen,
  onFrictionClick,
  onCardClick,
  onInspect,
  maxMetricRows,
  onRemoveActivity,
}: {
  column: CanvasColumn;
  scaffold: ScaffoldData;
  index: number;
  total: number;
  frictionMap: Map<string, FrictionObservation[]>;
  bindingActivityIds: Set<string>;
  selectedActivityId: string | null;
  hasHeatmap: boolean;
  ppitToggles: Record<PPITLayer, boolean>;
  cardToggles?: Record<CardToggleLayer, boolean>;
  cardRegistry?: CardRegistry | null;
  structureOpen: boolean;
  analyticsOpen: boolean;
  onFrictionClick: (activityId: string) => void;
  onCardClick?: (activityId: string) => void;
  onInspect?: (target: InspectorTarget) => void;
  maxMetricRows: number;
  onRemoveActivity?: () => void;
}) {
  const { updateActivityName } = useCanvasStore();
  const fCnt = column.activityIds.reduce(
    (s, a) => s + (frictionMap.get(a)?.length ?? 0),
    0,
  );
  const hasBinding = column.activityIds.some((a) => bindingActivityIds.has(a));
  const primaryId = column.activityIds[0];
  const primary = scaffold.elements.activities[primaryId];
  const stageName = primary?.name ?? column.label;
  const stageDescription = primary
    ? ((primary as Record<string, unknown>).description as string | undefined) ?? ""
    : "";

  return (
    <div className="flex w-[300px] flex-shrink-0 flex-col">
      {/* Dark header — flat fill, strong contrast */}
      <div
        className={`rounded-t-lg border border-b-0 ${
          hasBinding
            ? "border-status-binding bg-status-binding"
            : ""
        }`}
        style={hasBinding ? {} : { borderColor: tv.borderSubtle, background: tv.bgCard }}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: hasBinding ? dk.textDim : tv.textDim }}>
            Stage {index + 1} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            {onInspect && (
              <button
                onClick={(e) => { e.stopPropagation(); onInspect({ kind: "stage", activityId: primaryId }); }}
                className="rounded p-0.5 transition-colors hover:bg-black/10"
                style={{ color: hasBinding ? dk.textDim : tv.textDim }}
                title="Inspect this stage"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            {hasBinding && (
              <span className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-tight text-white backdrop-blur-sm">
                ⚠ Binding
              </span>
            )}
            {fCnt > 0 && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-mono" style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.tileBg, color: tv.textSecondary }}>
                {fCnt} obs
              </span>
            )}
            {onRemoveActivity && (
              <button
                onClick={onRemoveActivity}
                title="Remove this stage"
                className="rounded px-1.5 py-0.5 text-[9px] font-semibold hover:bg-red-500/40 hover:text-white transition-colors"
                style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.tileBg, color: tv.textDim }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between gap-2 px-4 pb-2.5">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight" style={{ color: hasBinding ? dk.textPrimary : tv.textPrimary }}>
            <InlineEdit
              value={stageName}
              onSave={(name) => updateActivityName(primaryId, name)}
              className="text-[15px] font-semibold leading-snug tracking-tight"
              inputClassName="text-[15px] font-semibold text-gray-900 bg-white"
              style={{ color: hasBinding ? dk.textPrimary : tv.textPrimary }}
            />
          </h3>
          {stageDescription && (
            <div className="group relative flex-shrink-0 pt-0.5">
              <svg className="h-3.5 w-3.5 cursor-help transition-colors" style={{ color: hasBinding ? dk.textDim : tv.textDim }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-md bg-vcc-50 px-3 py-2 text-[10px] leading-relaxed text-vcc-700 opacity-0 shadow-vcc-card ring-1 ring-vcc-200 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                {stageDescription}
              </div>
            </div>
          )}
        </div>
        {primary && (
          <StructurePane
            activityId={primaryId}
            activity={primary}
            scaffold={scaffold}
            isOpen={structureOpen}
            maxMetricRows={maxMetricRows}
          />
        )}
      </div>

      {/* Card body */}
      <div
        className={`flex flex-1 flex-col gap-2 rounded-b-lg border border-t-0 p-2.5 ${
          hasBinding
            ? "border-status-binding/40"
            : ""
        }`}
        style={hasBinding ? { background: "rgba(124,45,45,0.15)" } : { borderColor: tv.borderSubtle, background: tv.bgCardHover }}
      >
        {column.activityIds.map((actId) => (
          <StageCard
            key={actId}
            activityId={actId}
            scaffold={scaffold}
            frictionObs={frictionMap.get(actId) ?? []}
            isBinding={bindingActivityIds.has(actId)}
            isSelected={selectedActivityId === actId}
            hasHeatmap={hasHeatmap}
            ppitToggles={ppitToggles}
            cardToggles={cardToggles}
            cardRegistry={cardRegistry}
            analyticsOpen={analyticsOpen}
            onFrictionClick={onFrictionClick}
            onCardClick={onCardClick}
            onInspect={onInspect}
          />
        ))}
      </div>
    </div>
  );
}
