import type {
  FrictionObservation,
  HeatmapData,
  ScaffoldData,
} from "../types.ts";
import { classifyCategory, categoryLabel } from "./FrictionOverlay.tsx";

function IntensityBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 8
      ? "bg-red-500"
      : score >= 6
        ? "bg-amber-500"
        : score >= 4
          ? "bg-yellow-400"
          : "bg-green-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function ObservationCard({
  obs,
  isBindingObs,
  scaffold,
}: {
  obs: FrictionObservation;
  isBindingObs: boolean;
  scaffold: ScaffoldData;
}) {
  const group = classifyCategory(obs.category);
  const borderColor =
    group === "execution" ? "border-l-amber-500" : "border-l-red-500";

  // Resolve anchor name
  function anchorName(anchorType: string, anchorId: string): string {
    const elementMap =
      anchorType === "Activity"
        ? scaffold.elements.activities
        : anchorType === "Metric"
          ? scaffold.elements.metrics
          : anchorType === "Role"
            ? scaffold.elements.roles
            : anchorType === "Control"
              ? scaffold.elements.controls
              : anchorType === "Capability"
                ? scaffold.elements.capabilities
                : null;
    const el = elementMap?.[anchorId] as
      | { name?: string; id: string }
      | undefined;
    return el?.name ?? anchorId;
  }

  return (
    <div
      className={`rounded-md border border-gray-200 border-l-4 ${borderColor} bg-white p-3 ${
        isBindingObs ? "ring-2 ring-red-300 ring-offset-1" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              group === "execution"
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {categoryLabel(obs.category)}
          </span>
          {isBindingObs && (
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Binding
            </span>
          )}
        </div>
        {obs.intensity.score != null && (
          <IntensityBar score={obs.intensity.score} />
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-gray-700">
        {obs.rationale}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-500">
        <span>
          Anchor: {obs.primaryAnchor.anchorType} /{" "}
          {anchorName(obs.primaryAnchor.anchorType, obs.primaryAnchor.anchorId)}
        </span>
        {obs.confidence != null && (
          <span>Confidence: {(obs.confidence * 100).toFixed(0)}%</span>
        )}
      </div>

      {obs.contributingAnchors && obs.contributingAnchors.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {obs.contributingAnchors.map((ca) => (
            <span
              key={`${ca.anchorType}-${ca.anchorId}`}
              className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
            >
              {ca.anchorType}: {anchorName(ca.anchorType, ca.anchorId)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function FrictionPanel({
  activityId,
  observations,
  heatmap,
  scaffold,
  onClose,
}: {
  activityId: string;
  observations: FrictionObservation[];
  heatmap: HeatmapData;
  scaffold: ScaffoldData;
  onClose: () => void;
}) {
  const activity = scaffold.elements.activities[activityId];
  const activityName = activity?.name ?? activityId;

  const bindingObsId = heatmap.bindingConstraint.bindingAnchorObservationId;

  // Sort: binding observation first, then by intensity descending
  const sorted = [...observations].sort((a, b) => {
    if (a.observationId === bindingObsId) return -1;
    if (b.observationId === bindingObsId) return 1;
    return (b.intensity.score ?? 0) - (a.intensity.score ?? 0);
  });

  const execCount = observations.filter(
    (o) => classifyCategory(o.category) === "execution",
  ).length;
  const govCount = observations.filter(
    (o) => classifyCategory(o.category) === "governing",
  ).length;

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-vcc-900">
            {activityName}
          </h3>
          <p className="mt-0.5 flex gap-2 text-[10px] text-gray-500">
            {execCount > 0 && (
              <span className="rounded bg-amber-100 px-1 text-amber-700">
                {execCount} execution
              </span>
            )}
            {govCount > 0 && (
              <span className="rounded bg-red-100 px-1 text-red-700">
                {govCount} governing
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Binding constraint callout */}
      {heatmap.bindingConstraint.bindingAnchor.anchorType === "Activity" &&
        heatmap.bindingConstraint.bindingAnchor.anchorId === activityId && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
              Binding Constraint
            </p>
            <p className="mt-1 text-xs leading-relaxed text-red-800">
              {heatmap.bindingConstraint.justification}
            </p>
            {heatmap.bindingConstraint.confidence != null && (
              <p className="mt-1 text-[10px] text-red-600">
                Confidence:{" "}
                {(heatmap.bindingConstraint.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        )}

      {/* Observations list */}
      <div className="flex-1 space-y-2 overflow-auto p-4">
        {sorted.map((obs) => (
          <ObservationCard
            key={obs.observationId}
            obs={obs}
            isBindingObs={obs.observationId === bindingObsId}
            scaffold={scaffold}
          />
        ))}
      </div>
    </div>
  );
}
