import type {
  FrictionObservation,
  HeatmapData,
  ScaffoldData,
} from "../types.ts";

// --- Category classification ---

const EXECUTION_CATEGORIES = new Set([
  "ProcessHandoffFriction",
  "TechnologyIntegrationFriction",
  "DataSignalFriction",
]);

const GOVERNING_CATEGORIES = new Set([
  "DecisionAuthorityFriction",
  "GovernanceRiskFriction",
  "IncentiveCapacityFriction",
]);

export type FrictionGroup = "execution" | "governing";

export function classifyCategory(category: string): FrictionGroup {
  if (EXECUTION_CATEGORIES.has(category)) return "execution";
  if (GOVERNING_CATEGORIES.has(category)) return "governing";
  return "governing";
}

export function categoryLabel(category: string): string {
  return category.replace(/Friction$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

// --- Resolve observations to activities ---

/** Map each activity ID to the observations that anchor to it (primary or via element references). */
export function buildActivityFrictionMap(
  heatmap: HeatmapData,
  scaffold: ScaffoldData,
): Map<string, FrictionObservation[]> {
  const map = new Map<string, FrictionObservation[]>();

  // Build reverse indexes: elementId → activityIds that reference it
  const metricToActivities = new Map<string, string[]>();
  const roleToActivities = new Map<string, string[]>();
  const controlToActivities = new Map<string, string[]>();
  const capabilityToActivities = new Map<string, string[]>();
  const constraintToActivities = new Map<string, string[]>();

  for (const [actId, act] of Object.entries(scaffold.elements.activities)) {
    for (const m of act.metricIds ?? []) {
      (metricToActivities.get(m) ?? metricToActivities.set(m, []).get(m)!).push(actId);
    }
    for (const r of act.performedByRoleIds) {
      (roleToActivities.get(r) ?? roleToActivities.set(r, []).get(r)!).push(actId);
    }
    for (const c of act.controlIds ?? []) {
      (controlToActivities.get(c) ?? controlToActivities.set(c, []).get(c)!).push(actId);
    }
    for (const c of act.requiresCapabilityIds ?? []) {
      (capabilityToActivities.get(c) ?? capabilityToActivities.set(c, []).get(c)!).push(actId);
    }
    for (const c of act.constraintIds ?? []) {
      (constraintToActivities.get(c) ?? constraintToActivities.set(c, []).get(c)!).push(actId);
    }
  }

  function resolveAnchorToActivities(anchorType: string, anchorId: string): string[] {
    switch (anchorType) {
      case "Activity":
        return anchorId in scaffold.elements.activities ? [anchorId] : [];
      case "Metric":
        return metricToActivities.get(anchorId) ?? [];
      case "Role":
        return roleToActivities.get(anchorId) ?? [];
      case "Control":
        return controlToActivities.get(anchorId) ?? [];
      case "Capability":
        return capabilityToActivities.get(anchorId) ?? [];
      case "Constraint":
        return constraintToActivities.get(anchorId) ?? [];
      default:
        return [];
    }
  }

  for (const obs of heatmap.observations) {
    const activityIds = resolveAnchorToActivities(
      obs.primaryAnchor.anchorType,
      obs.primaryAnchor.anchorId,
    );
    for (const actId of activityIds) {
      const list = map.get(actId);
      if (list) {
        list.push(obs);
      } else {
        map.set(actId, [obs]);
      }
    }
  }

  return map;
}

/** Resolve the binding constraint anchor to activity IDs. */
export function resolveBindingActivityIds(
  heatmap: HeatmapData,
  scaffold: ScaffoldData,
): Set<string> {
  const anchor = heatmap.bindingConstraint.bindingAnchor;
  const result = new Set<string>();

  if (anchor.anchorType === "Activity") {
    if (anchor.anchorId in scaffold.elements.activities) {
      result.add(anchor.anchorId);
    }
  } else {
    // Resolve non-Activity anchors the same way
    for (const [actId, act] of Object.entries(scaffold.elements.activities)) {
      switch (anchor.anchorType) {
        case "Metric":
          if (act.metricIds?.includes(anchor.anchorId)) result.add(actId);
          break;
        case "Role":
          if (act.performedByRoleIds.includes(anchor.anchorId)) result.add(actId);
          break;
        case "Control":
          if (act.controlIds?.includes(anchor.anchorId)) result.add(actId);
          break;
        case "Capability":
          if (act.requiresCapabilityIds?.includes(anchor.anchorId)) result.add(actId);
          break;
        case "Constraint":
          if (act.constraintIds?.includes(anchor.anchorId)) result.add(actId);
          break;
      }
    }
  }

  return result;
}

// --- Badge components ---

export function FrictionBadge({
  observations,
  isBinding,
  onClick,
}: {
  observations: FrictionObservation[];
  isBinding: boolean;
  onClick: () => void;
}) {
  const execCount = observations.filter(
    (o) => classifyCategory(o.category) === "execution",
  ).length;
  const govCount = observations.filter(
    (o) => classifyCategory(o.category) === "governing",
  ).length;

  // Max intensity score for sizing/urgency
  const maxScore = Math.max(
    ...observations.map((o) => o.intensity.score ?? 0),
  );

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-all hover:scale-105 ${
        isBinding
          ? "animate-pulse-slow border border-red-400 bg-red-50 shadow-sm shadow-red-200"
          : "border border-gray-200 bg-gray-50"
      }`}
      title={`${observations.length} friction observation${observations.length !== 1 ? "s" : ""} (max intensity: ${maxScore.toFixed(1)})`}
    >
      {isBinding && (
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
      )}
      {execCount > 0 && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
          {execCount}
        </span>
      )}
      {govCount > 0 && (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">
          {govCount}
        </span>
      )}
      <span className="text-gray-500">
        {maxScore >= 8 ? "!!!" : maxScore >= 6 ? "!!" : "!"}
      </span>
    </button>
  );
}
