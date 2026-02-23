import { useMemo, useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { CanvasColumn, FrictionObservation, ScaffoldData } from "../types.ts";
import {
  buildActivityFrictionMap,
  resolveBindingActivityIds,
  FrictionBadge,
} from "./FrictionOverlay.tsx";
import { FrictionPanel } from "./FrictionPanel.tsx";

function ActivityCard({
  activityId,
  scaffold,
  frictionObs,
  isBinding,
  isSelected,
  hasHeatmap,
  onFrictionClick,
}: {
  activityId: string;
  scaffold: ScaffoldData;
  frictionObs: FrictionObservation[];
  isBinding: boolean;
  isSelected: boolean;
  hasHeatmap: boolean;
  onFrictionClick: (activityId: string) => void;
}) {
  const activity = scaffold.elements.activities[activityId];
  const name = activity?.name ?? activityId;
  const roles = (activity?.performedByRoleIds ?? [])
    .map((rid) => scaffold.elements.roles[rid]?.name ?? rid)
    .slice(0, 3);

  // Max confidence across observations for this activity
  const maxConfidence =
    frictionObs.length > 0
      ? Math.max(...frictionObs.map((o) => o.confidence ?? 0))
      : null;

  return (
    <div
      onClick={() => {
        if (hasHeatmap && frictionObs.length > 0) onFrictionClick(activityId);
      }}
      className={`rounded border bg-white p-3 transition-all ${
        hasHeatmap && frictionObs.length > 0
          ? "cursor-pointer hover:shadow-md"
          : "shadow-sm"
      } ${
        isSelected
          ? "ring-2 ring-vcc-500 ring-offset-1"
          : ""
      } ${
        isBinding
          ? "border-red-400 shadow-sm shadow-red-100"
          : "border-gray-200"
      }`}
    >
      {isBinding && (
        <div className="mb-1.5 flex items-center gap-1.5">
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
      <p className="text-sm font-medium text-vcc-800">{name}</p>
      {roles.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {roles.map((r) => (
            <span
              key={r}
              className="inline-block rounded-full bg-vcc-100 px-2 py-0.5 text-[10px] font-medium text-vcc-700"
            >
              {r}
            </span>
          ))}
        </div>
      )}
      {frictionObs.length > 0 && (
        <div className="mt-1.5 flex items-center justify-between">
          <FrictionBadge
            observations={frictionObs}
            isBinding={isBinding}
            onClick={() => onFrictionClick(activityId)}
          />
          {maxConfidence != null && (
            <span className="font-mono text-[9px] text-gray-400">
              {(maxConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Column({
  column,
  scaffold,
  index,
  total,
  frictionMap,
  bindingActivityIds,
  selectedActivityId,
  hasHeatmap,
  onFrictionClick,
}: {
  column: CanvasColumn;
  scaffold: ScaffoldData;
  index: number;
  total: number;
  frictionMap: Map<string, FrictionObservation[]>;
  bindingActivityIds: Set<string>;
  selectedActivityId: string | null;
  hasHeatmap: boolean;
  onFrictionClick: (activityId: string) => void;
}) {
  const metrics = column.aggregates?.metricIds?.length ?? 0;
  const controls = column.aggregates?.controlIds?.length ?? 0;

  // Column-level friction count
  const columnFrictionCount = column.activityIds.reduce(
    (sum, actId) => sum + (frictionMap.get(actId)?.length ?? 0),
    0,
  );

  // Does this column contain the binding constraint?
  const hasBinding = column.activityIds.some((actId) =>
    bindingActivityIds.has(actId),
  );

  return (
    <div className="flex min-w-[220px] max-w-[280px] flex-shrink-0 flex-col">
      {/* Column header */}
      <div
        className={`rounded-t-lg border border-b-0 px-3 py-2 ${
          hasBinding
            ? "border-red-300 bg-red-800"
            : "border-vcc-200 bg-vcc-700"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">
            Stage {index + 1} of {total}
          </span>
          {columnFrictionCount > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {columnFrictionCount} obs
            </span>
          )}
        </div>
        <h3 className="mt-0.5 text-sm font-semibold text-white">
          {column.label}
        </h3>
      </div>

      {/* Activities */}
      <div
        className={`flex flex-1 flex-col gap-2 rounded-b-lg border bg-gray-50 p-2 ${
          hasBinding ? "border-red-200" : "border-vcc-200"
        }`}
      >
        {column.activityIds.map((actId) => (
          <ActivityCard
            key={actId}
            activityId={actId}
            scaffold={scaffold}
            frictionObs={frictionMap.get(actId) ?? []}
            isBinding={bindingActivityIds.has(actId)}
            isSelected={selectedActivityId === actId}
            hasHeatmap={hasHeatmap}
            onFrictionClick={onFrictionClick}
          />
        ))}

        {/* Column footer stats */}
        {(metrics > 0 || controls > 0) && (
          <div className="mt-auto flex gap-3 border-t border-gray-200 pt-2 text-[10px] text-gray-500">
            {metrics > 0 && (
              <span>
                {metrics} metric{metrics !== 1 ? "s" : ""}
              </span>
            )}
            {controls > 0 && (
              <span>
                {controls} control{controls !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Flow arrow between columns */
function FlowArrow() {
  return (
    <div className="flex flex-shrink-0 items-center px-0.5 text-vcc-300">
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </div>
  );
}

export function CanvasView() {
  const { canvasViewModel, scaffoldData, heatmapData, validationReport } =
    useCanvasStore();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );

  // Build friction map from heatmap
  const frictionMap = useMemo(() => {
    if (!heatmapData || !scaffoldData) return new Map<string, FrictionObservation[]>();
    return buildActivityFrictionMap(heatmapData, scaffoldData);
  }, [heatmapData, scaffoldData]);

  const bindingActivityIds = useMemo(() => {
    if (!heatmapData || !scaffoldData) return new Set<string>();
    return resolveBindingActivityIds(heatmapData, scaffoldData);
  }, [heatmapData, scaffoldData]);

  if (!canvasViewModel || !scaffoldData) {
    return null;
  }

  const vsName =
    scaffoldData.elements.valueStreams[canvasViewModel.valueStreamId]
      ?.name ?? canvasViewModel.valueStreamId;

  const selectedObs =
    selectedActivityId ? (frictionMap.get(selectedActivityId) ?? []) : [];

  // Resolve binding constraint activity name for summary bar
  const bindingActivityName = heatmapData
    ? (() => {
        const anchor = heatmapData.bindingConstraint.bindingAnchor;
        if (anchor.anchorType === "Activity") {
          return scaffoldData.elements.activities[anchor.anchorId]?.name ?? anchor.anchorId;
        }
        return null;
      })()
    : null;

  return (
    <div className="flex h-full gap-0">
      {/* Canvas area */}
      <div className={`flex flex-1 flex-col gap-4 ${selectedActivityId ? "pr-0" : ""}`}>
        {/* Canvas header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-vcc-900">{vsName}</h2>
            <p className="text-xs text-gray-500">
              {canvasViewModel.groupingMode} view
              {canvasViewModel.summary &&
                ` \u00b7 ${canvasViewModel.summary.totalActivities} activities \u00b7 ${canvasViewModel.summary.totalRoles} roles \u00b7 ${canvasViewModel.summary.totalCapabilities} capabilities`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {heatmapData && (
              <div className="flex gap-1 text-[10px]">
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
                  Execution
                </span>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">
                  Governing
                </span>
              </div>
            )}
            {validationReport && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  validationReport.status === "Valid"
                    ? "bg-green-100 text-green-700"
                    : validationReport.status === "ValidWithWarnings"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {validationReport.status}
              </span>
            )}
          </div>
        </div>

        {/* Heatmap summary bar — orientation before diving in */}
        {heatmapData && (
          <div className="flex items-center gap-4 rounded-md border border-gray-200 bg-white px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-vcc-800">
                {heatmapData.observations.length} friction observations
              </span>
            </div>
            {bindingActivityName && (
              <>
                <div className="h-4 w-px bg-gray-200" />
                <div className="flex items-center gap-1.5">
                  <svg
                    className="h-3.5 w-3.5 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs text-gray-600">
                    Binding:{" "}
                    <button
                      onClick={() => {
                        const anchor = heatmapData.bindingConstraint.bindingAnchor;
                        if (anchor.anchorType === "Activity") {
                          setSelectedActivityId(anchor.anchorId);
                        }
                      }}
                      className="font-medium text-red-700 underline decoration-red-300 underline-offset-2 transition-colors hover:text-red-900"
                    >
                      {bindingActivityName}
                    </button>
                  </span>
                </div>
                {heatmapData.bindingConstraint.confidence != null && (
                  <>
                    <div className="h-4 w-px bg-gray-200" />
                    <span className="font-mono text-[10px] text-gray-500">
                      Confidence: {(heatmapData.bindingConstraint.confidence * 100).toFixed(0)}%
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Horizontal scrolling column layout with flow arrows */}
        <div className="flex items-start gap-0 overflow-x-auto pb-4">
          {canvasViewModel.columns.map((col, i) => (
            <div key={col.columnId} className="flex items-start">
              <Column
                column={col}
                scaffold={scaffoldData}
                index={i}
                total={canvasViewModel.columns.length}
                frictionMap={frictionMap}
                bindingActivityIds={bindingActivityIds}
                selectedActivityId={selectedActivityId}
                hasHeatmap={!!heatmapData}
                onFrictionClick={setSelectedActivityId}
              />
              {i < canvasViewModel.columns.length - 1 && <FlowArrow />}
            </div>
          ))}
        </div>

        {/* Validation warnings */}
        {validationReport &&
          validationReport.findings.length > 0 && (
            <details className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-yellow-800">
                {validationReport.findings.length} validation finding
                {validationReport.findings.length !== 1 ? "s" : ""}
              </summary>
              <ul className="mt-2 space-y-1">
                {validationReport.findings.map((f, i) => (
                  <li key={i} className="text-xs text-yellow-700">
                    <span className="font-mono font-medium">
                      [{f.ruleId}]
                    </span>{" "}
                    {f.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
      </div>

      {/* Friction detail panel — wider to accommodate throughput */}
      {selectedActivityId && heatmapData && selectedObs.length > 0 && (
        <div className="w-96 flex-shrink-0">
          <FrictionPanel
            activityId={selectedActivityId}
            observations={selectedObs}
            heatmap={heatmapData}
            scaffold={scaffoldData}
            onClose={() => setSelectedActivityId(null)}
          />
        </div>
      )}
    </div>
  );
}
