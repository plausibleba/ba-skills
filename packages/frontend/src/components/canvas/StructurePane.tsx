import type { ScaffoldData, ScaffoldActivity } from "../../types.ts";
import { humanizeId } from "../../lib/humanize-id.ts";
import { InlineEdit } from "./InlineEdit.tsx";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { getTheme } from "../../theme.ts";

/*
 * Structure Pane — entry/exit states + metrics
 *
 * Always rendered with dark palette regardless of theme mode.
 * The dark treatment provides the contrast needed for these
 * dense informational panels sitting inside stage cards.
 */

const dk = getTheme("dark");

export function StructurePane({
  activityId: _activityId,
  activity,
  scaffold,
  isOpen,
  maxMetricRows,
}: {
  activityId: string;
  activity: ScaffoldActivity;
  scaffold: ScaffoldData;
  isOpen: boolean;
  maxMetricRows: number;
}) {
  const { updateOutcomeName } = useCanvasStore();

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
    <div
      className="overflow-y-auto border-t px-4 pb-0.5 pt-2 scrollbar-thin"
      style={{ borderColor: dk.borderSubtle, background: dk.bgSurface, maxHeight: 160 }}
    >
      {/* Row 1: Entry State → Exit State */}
      {(preOutcome || postOutcome) && (
        <div className="flex items-start">
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: dk.textDim }}>
              Entry State
            </span>
            {preOutcome && (
              <span className="line-clamp-2 rounded-md px-2 py-0.5 text-center text-[10px] leading-snug" style={{ background: dk.tileBg, color: dk.textSecondary }}>
                <InlineEdit
                  value={preOutcome.name ?? ""}
                  onSave={(name) => updateOutcomeName(activity.preOutcomeId, name)}
                  className="text-[10px]"
                  style={{ color: dk.textSecondary }}
                  inputClassName="text-[10px] text-gray-900 bg-white"
                />
              </span>
            )}
          </div>
          <div className="flex items-center px-2 pt-4">
            <svg
              className="h-4 w-4"
              style={{ color: dk.textDim }}
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
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: dk.textDim }}>
              Exit State
            </span>
            {postOutcome && (
              <span className="line-clamp-2 rounded-md px-2 py-0.5 text-center text-[10px] leading-snug" style={{ background: dk.tileBg, color: dk.textSecondary }}>
                <InlineEdit
                  value={postOutcome.name ?? ""}
                  onSave={(name) => updateOutcomeName(activity.postOutcomeId, name)}
                  className="text-[10px]"
                  style={{ color: dk.textSecondary }}
                  inputClassName="text-[10px] text-gray-900 bg-white"
                />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Participating Stakeholders removed — redundant with Roles on Capabilities (PPIT layer) */}

      {/* Metrics */}
      {metricsMinH > 0 && (
        <div style={{ minHeight: metricsMinH }}>
          {metricIds.length > 0 && (
            <>
              <div className="my-2 border-t border-dashed" style={{ borderColor: dk.borderSubtle }} />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: dk.textDim }}>
                  Metrics
                </span>
                <div className="flex flex-wrap justify-center gap-1">
                  {metricIds.map((mid) => (
                    <span key={mid} className="rounded-md px-2.5 py-0.5 text-[10px]" style={{ background: dk.tileBg, color: dk.textSecondary }}>
                      {scaffold.elements.metrics[mid]?.name ?? humanizeId(mid)}
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
