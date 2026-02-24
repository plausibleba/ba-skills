import type { ScaffoldData, ScaffoldActivity } from "../../types.ts";

/* ── Structure Pane — entry/exit states + metrics ──────────────────── */

export function StructurePane({
  activity,
  scaffold,
  isOpen,
  maxMetricRows,
}: {
  activity: ScaffoldActivity;
  scaffold: ScaffoldData;
  isOpen: boolean;
  maxMetricRows: number;
}) {
  if (!isOpen) return null;

  const preOutcome = activity.preOutcomeId
    ? scaffold.elements.outcomes[activity.preOutcomeId]
    : null;
  const postOutcome = activity.postOutcomeId
    ? scaffold.elements.outcomes[activity.postOutcomeId]
    : null;
  const metricIds = activity.metricIds ?? [];

  // Consistent metrics section height across columns
  // Each badge row ~22px, label ~16px, divider ~12px
  const metricsMinH = maxMetricRows > 0 ? 12 + 16 + maxMetricRows * 22 : 0;

  return (
    <div className="overflow-y-auto border-t border-white/20 px-4 pb-0.5 pt-2 scrollbar-thin">
      {/* Row 1: Entry State → Exit State */}
      {(preOutcome || postOutcome) && (
        <div className="flex items-start">
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">
              Entry State
            </span>
            {preOutcome && (
              <span
                title={preOutcome.name}
                className="line-clamp-2 rounded-md bg-white/15 px-2 py-0.5 text-center text-[10px] leading-snug text-white/90"
              >
                {preOutcome.name}
              </span>
            )}
          </div>
          <div className="flex items-center px-2 pt-4">
            <svg
              className="h-4 w-4 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">
              Exit State
            </span>
            {postOutcome && (
              <span
                title={postOutcome.name}
                className="line-clamp-2 rounded-md bg-white/15 px-2 py-0.5 text-center text-[10px] leading-snug text-white/90"
              >
                {postOutcome.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Metrics */}
      {metricsMinH > 0 && (
        <div style={{ minHeight: metricsMinH }}>
          {metricIds.length > 0 && (
            <>
              <div className="my-2 border-t border-dashed border-white/15" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">
                  Metrics
                </span>
                <div className="flex flex-wrap justify-center gap-1">
                  {metricIds.map((mid) => (
                    <span key={mid} className="rounded-md bg-white/15 px-2.5 py-0.5 text-[10px] text-white/80">
                      {scaffold.elements.metrics[mid]?.name ?? mid}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
