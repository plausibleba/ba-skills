import type { ScaffoldData, FrictionObservation } from "../../types.ts";
import type { PPITLayer } from "./ppit.ts";
import { CapabilityBlock } from "./CapabilityBlock.tsx";
import { TransformationPane } from "./TransformationPane.tsx";

/* ── Stage Card ────────────────────────────────────────────────────── */

export function StageCard({
  activityId,
  scaffold,
  frictionObs,
  isBinding,
  isSelected,
  hasHeatmap,
  ppitToggles,
  analyticsOpen,
  onFrictionClick,
}: {
  activityId: string;
  scaffold: ScaffoldData;
  frictionObs: FrictionObservation[];
  isBinding: boolean;
  isSelected: boolean;
  hasHeatmap: boolean;
  ppitToggles: Record<PPITLayer, boolean>;
  analyticsOpen: boolean;
  onFrictionClick: (activityId: string) => void;
}) {
  const activity = scaffold.elements.activities[activityId];
  if (!activity) return null;

  const caps = activity.requiresCapabilityIds ?? [];
  const showSummary = !isSelected && analyticsOpen;

  return (
    <div
      onClick={() => {
        if (hasHeatmap && frictionObs.length > 0) onFrictionClick(activityId);
      }}
      className={`flex flex-1 flex-col overflow-hidden rounded-lg border transition-shadow ${
        hasHeatmap && frictionObs.length > 0
          ? "cursor-pointer hover:shadow-md"
          : ""
      } ${isSelected ? "ring-2 ring-vcc-500 ring-offset-2" : ""} ${
        isBinding ? "border-red-200 bg-red-50/10" : "border-gray-200 bg-white"
      }`}
    >
      {isBinding && (
        <div className="flex items-center gap-1.5 bg-red-50/60 px-3 py-1.5">
          <svg
            className="h-3 w-3 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-red-600">
            Binding Constraint
          </span>
        </div>
      )}

      {caps.length > 0 && (
        <div className="space-y-1 px-2.5 py-2">
          {caps.map((capId, idx) => (
            <CapabilityBlock
              key={capId}
              capabilityId={capId}
              scaffold={scaffold}
              activity={activity}
              ppitToggles={ppitToggles}
              isFirst={idx === 0}
            />
          ))}
        </div>
      )}

      {/* Transformation pane: friction, controls (future: painpoints, ideas, requirements) */}
      <TransformationPane
        activity={activity}
        scaffold={scaffold}
        frictionObs={frictionObs}
        isBinding={isBinding}
        isVisible={analyticsOpen}
        summaryOnly={showSummary}
        onFrictionClick={() => onFrictionClick(activityId)}
      />
    </div>
  );
}
