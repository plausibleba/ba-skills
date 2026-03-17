import type { ScaffoldData, ScaffoldActivity } from "../../types.ts";
import { humanizeId } from "../../lib/humanize-id.ts";
import { InlineEdit } from "./InlineEdit.tsx";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { useThemeStore } from "../../store/theme-store.ts";
import { getTheme } from "../../theme.ts";

/* ── Structure Pane — entry/exit states + metrics ──────────────────── */

export function StructurePane({
  activityId,
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
  const { updateOutcomeName, scaffoldData } = useCanvasStore();
  const themeMode = useThemeStore((s) => s.mode);
  const t = getTheme(themeMode);
  const isDark = themeMode === "dark";

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
    <div className="overflow-y-auto border-t px-4 pb-0.5 pt-2 scrollbar-thin" style={{ borderColor: t.borderSubtle }}>
      {/* Row 1: Entry State → Exit State */}
      {(preOutcome || postOutcome) && (
        <div className="flex items-start">
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: t.textDim }}>
              Entry State
            </span>
            {preOutcome && (
              <span className="line-clamp-2 rounded-md px-2 py-0.5 text-center text-[10px] leading-snug" style={{ background: t.tileBg, color: t.textSecondary }}>
                <InlineEdit
                  value={preOutcome.name ?? ""}
                  onSave={(name) => updateOutcomeName(activity.preOutcomeId, name)}
                  className="text-[10px]"
                  style={{ color: t.textSecondary }}
                  inputClassName="text-[10px] text-gray-900 bg-white"
                />
              </span>
            )}
          </div>
          <div className="flex items-center px-2 pt-4">
            <svg
              className="h-4 w-4"
              style={{ color: t.textDim }}
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
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: t.textDim }}>
              Exit State
            </span>
            {postOutcome && (
              <span className="line-clamp-2 rounded-md px-2 py-0.5 text-center text-[10px] leading-snug" style={{ background: t.tileBg, color: t.textSecondary }}>
                <InlineEdit
                  value={postOutcome.name ?? ""}
                  onSave={(name) => updateOutcomeName(activity.postOutcomeId, name)}
                  className="text-[10px]"
                  style={{ color: t.textSecondary }}
                  inputClassName="text-[10px] text-gray-900 bg-white"
                />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Participating Stakeholders — aggregated from all capabilities' PPIT roleIds */}
      {(() => {
        // Read from the store's scaffoldData directly for freshness after mutations
        const storeAct = scaffoldData?.elements.activities[activityId] ?? activity;
        const ppitMap = (storeAct as unknown as Record<string, unknown>).capabilityPPIT as Record<string, { roleIds?: string[] }> | undefined;
        const capIds = (storeAct as any).requiresCapabilityIds ?? (storeAct as any).enabledByCapabilityIds ?? [];
        const aggregatedRoleIds = new Set<string>();
        if (ppitMap) {
          for (const capId of capIds) {
            const capPpit = ppitMap[capId];
            if (capPpit?.roleIds) capPpit.roleIds.forEach((rid: string) => aggregatedRoleIds.add(rid));
          }
        }
        // Fallback to activity-level performedByRoleIds if no PPIT roles found
        if (aggregatedRoleIds.size === 0) {
          ((storeAct as any).performedByRoleIds ?? []).forEach((rid: string) => aggregatedRoleIds.add(rid));
        }
        const roleArr = Array.from(aggregatedRoleIds);
        if (roleArr.length === 0) return null;
        const roles = scaffoldData?.elements.roles ?? scaffold.elements.roles;
        return (
          <>
            <div className="my-2 border-t border-dashed" style={{ borderColor: t.borderSubtle }} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: t.textDim }}>
                Participating Stakeholders
              </span>
              <div className="flex flex-wrap justify-center gap-1">
                {roleArr.map((rid) => (
                  <span key={rid} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(74,158,218,0.18)", color: isDark ? "#93c5fd" : "#2563eb" }}>
                    {roles[rid]?.name ?? humanizeId(rid)}
                  </span>
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {/* Metrics */}
      {metricsMinH > 0 && (
        <div style={{ minHeight: metricsMinH }}>
          {metricIds.length > 0 && (
            <>
              <div className="my-2 border-t border-dashed" style={{ borderColor: t.borderSubtle }} />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: t.textDim }}>
                  Metrics
                </span>
                <div className="flex flex-wrap justify-center gap-1">
                  {metricIds.map((mid) => (
                    <span key={mid} className="rounded-md px-2.5 py-0.5 text-[10px]" style={{ background: t.tileBg, color: t.textSecondary }}>
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
