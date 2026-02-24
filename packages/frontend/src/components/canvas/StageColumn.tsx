import type {
  CanvasColumn,
  FrictionObservation,
  ScaffoldData,
} from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import { StructurePane } from "./StructurePane.tsx";
import { StageCard } from "./StageCard.tsx";

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
  structureOpen,
  analyticsOpen,
  onFrictionClick,
  maxMetricRows,
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
  structureOpen: boolean;
  analyticsOpen: boolean;
  onFrictionClick: (activityId: string) => void;
  maxMetricRows: number;
}) {
  const fCnt = column.activityIds.reduce(
    (s, a) => s + (frictionMap.get(a)?.length ?? 0),
    0,
  );
  const hasBinding = column.activityIds.some((a) => bindingActivityIds.has(a));
  const primary = scaffold.elements.activities[column.activityIds[0]];
  const stageName = primary?.name ?? column.label;
  const stageDescription = primary
    ? ((primary as Record<string, unknown>).description as string | undefined) ?? ""
    : "";

  return (
    <div className="flex w-[300px] flex-shrink-0 flex-col">
      {/* Dark header */}
      <div
        className={`rounded-t-lg border border-b-0 ${
          hasBinding
            ? "border-red-300 bg-red-800"
            : "border-vcc-200 bg-vcc-700"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/70">
            Stage {index + 1} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            {hasBinding && (
              <span className="rounded bg-red-500/80 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                ▲ Binding
              </span>
            )}
            {fCnt > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white/90">
                {fCnt} obs
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between gap-2 px-4 pb-2.5">
          <h3 className="text-[15px] font-semibold leading-snug text-white">
            {stageName}
          </h3>
          {stageDescription && (
            <div className="group relative flex-shrink-0 pt-0.5">
              <svg className="h-3.5 w-3.5 cursor-help text-white/40 transition-colors group-hover:text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-md bg-blue-50 px-3 py-2 text-[10px] leading-relaxed text-blue-800 opacity-0 shadow-lg ring-1 ring-blue-200 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                {stageDescription}
              </div>
            </div>
          )}
        </div>
        {primary && (
          <StructurePane
            activity={primary}
            scaffold={scaffold}
            isOpen={structureOpen}
            maxMetricRows={maxMetricRows}
          />
        )}
      </div>

      {/* Card body */}
      <div
        className={`flex min-h-[160px] flex-1 flex-col gap-2 rounded-b-lg border border-t-0 p-2.5 ${
          hasBinding ? "border-red-200" : "border-vcc-200"
        }`}
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
            analyticsOpen={analyticsOpen}
            onFrictionClick={onFrictionClick}
          />
        ))}
      </div>
    </div>
  );
}
