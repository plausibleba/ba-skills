import type { ScaffoldData, ScaffoldActivity, FrictionObservation } from "../../types.ts";
import { FrictionBadge } from "../FrictionOverlay.tsx";
import { humanizeId } from "../../lib/humanize-id.ts";

/* ── Analytics Pane — scrollable, max-height ───────────────────────── */

export function AnalyticsPane({
  activity,
  scaffold,
  frictionObs,
  isBinding,
  isVisible,
  summaryOnly,
  onFrictionClick,
}: {
  activity: ScaffoldActivity;
  scaffold: ScaffoldData;
  frictionObs: FrictionObservation[];
  isBinding: boolean;
  isVisible: boolean;
  summaryOnly: boolean;
  onFrictionClick: () => void;
}) {
  const mCnt = activity.metricIds?.length ?? 0;
  const fCnt = frictionObs.length;
  const cCnt = activity.controlIds?.length ?? 0;
  if (mCnt + fCnt + cCnt === 0 || !isVisible) return null;

  const parts: string[] = [];
  if (mCnt > 0) parts.push(`Metrics (${mCnt})`);
  if (fCnt > 0) parts.push(`Frictions (${fCnt})`);
  if (cCnt > 0) parts.push(`Controls (${cCnt})`);

  if (summaryOnly) {
    return (
      <div className="border-t border-gray-100 px-3 py-1.5">
        <span className="text-[10px] text-gray-400">{parts.join(" · ")}</span>
      </div>
    );
  }

  return (
    <div className="max-h-[180px] overflow-y-auto border-t border-gray-100 bg-gray-50/40 px-3 py-2 scrollbar-thin">
      <div className="space-y-1.5">
        {mCnt > 0 && (
          <div>
            <span className="text-[9px] font-medium uppercase tracking-wider text-gray-500">
              Metrics
            </span>
            {(activity.metricIds ?? []).map((mid) => (
              <p key={mid} className="text-[11px] text-gray-600">
                {scaffold.elements.metrics[mid]?.name ?? humanizeId(mid)}
              </p>
            ))}
          </div>
        )}
        {fCnt > 0 && (
          <div>
            <span className="text-[9px] font-medium uppercase tracking-wider text-gray-500">
              Friction
            </span>
            <div className="mt-0.5">
              <FrictionBadge
                observations={frictionObs}
                isBinding={isBinding}
                onClick={onFrictionClick}
              />
            </div>
          </div>
        )}
        {cCnt > 0 && (
          <div>
            <span className="text-[9px] font-medium uppercase tracking-wider text-gray-500">
              Controls
            </span>
            {(activity.controlIds ?? []).map((cid) => (
              <p key={cid} className="text-[11px] text-gray-600">
                {scaffold.elements.controls[cid]?.name ?? humanizeId(cid)}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
