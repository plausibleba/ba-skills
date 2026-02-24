import { useMemo, useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { ScaffoldActivity, ScaffoldElement } from "../types.ts";
import {
  buildActivityFrictionMap,
  resolveBindingActivityIds,
} from "./FrictionOverlay.tsx";
import { FrictionPanel } from "./FrictionPanel.tsx";
import { StageColumn } from "./canvas/StageColumn.tsx";
import { FlowChevron } from "./canvas/FlowChevron.tsx";
import { CanvasToolbar } from "./canvas/CanvasToolbar.tsx";
import { useCanvasControls } from "./canvas/useCanvasControls.ts";

/* ── Canvas View — orchestrator ────────────────────────────────────── */

export function CanvasView() {
  const { canvasViewModel, scaffoldData, heatmapData, validationReport } =
    useCanvasStore();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const {
    structureOpen,
    analyticsOpen,
    ppitToggles,
    toggleStructure,
    toggleAnalytics,
    togglePPIT,
  } = useCanvasControls();

  const frictionMap = useMemo(() => {
    if (!heatmapData || !scaffoldData) return new Map();
    return buildActivityFrictionMap(heatmapData, scaffoldData);
  }, [heatmapData, scaffoldData]);

  const bindingActivityIds = useMemo(() => {
    if (!heatmapData || !scaffoldData) return new Set<string>();
    return resolveBindingActivityIds(heatmapData, scaffoldData);
  }, [heatmapData, scaffoldData]);

  if (!canvasViewModel || !scaffoldData) return null;

  // Calculate max metric badge rows across columns for equal header height
  // Badges are ~120px wide in a ~240px container = 2 per row
  const BADGES_PER_ROW = 2;
  const maxMetricRows = Math.max(
    ...canvasViewModel.columns.map((col) => {
      const act = scaffoldData.elements.activities[col.activityIds[0]];
      const count = act?.metricIds?.length ?? 0;
      return Math.ceil(count / BADGES_PER_ROW);
    }),
    0,
  );

  const vs =
    scaffoldData.elements.valueStreams[canvasViewModel.valueStreamId];
  const vsName = vs?.name ?? canvasViewModel.valueStreamId;
  const vsDescription = (
    vs as ScaffoldElement & { description?: string }
  )?.description;
  const selectedObs = selectedActivityId
    ? (frictionMap.get(selectedActivityId) ?? [])
    : [];

  const bindingActivityName = heatmapData
    ? (() => {
        const a = heatmapData.bindingConstraint.bindingAnchor;
        return a.anchorType === "Activity"
          ? (scaffoldData.elements.activities[a.anchorId]?.name ?? a.anchorId)
          : null;
      })()
    : null;

  /* Derive accountable stakeholder: most frequently occurring role */
  const accountableStakeholder = useMemo(() => {
    const roleCounts = new Map<string, number>();
    for (const act of Object.values(scaffoldData.elements.activities)) {
      for (const rid of (act as ScaffoldActivity).performedByRoleIds ?? []) {
        roleCounts.set(rid, (roleCounts.get(rid) ?? 0) + 1);
      }
    }
    const topRole = [...roleCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    return topRole
      ? (scaffoldData.elements.roles[topRole[0]]?.name ?? topRole[0])
      : "—";
  }, [scaffoldData]);

  // Detect if this is a stub VS in an enterprise scaffold
  const isEnterpriseScaffold = Object.keys(scaffoldData.elements.valueStreams).length > 1;
  const vsActivities = canvasViewModel.columns.flatMap((c) => c.activityIds);
  const totalMetrics = vsActivities.reduce(
    (s, a) => s + (scaffoldData.elements.activities[a]?.metricIds?.length ?? 0), 0,
  );
  const isStub = isEnterpriseScaffold && vsActivities.length <= 5 && totalMetrics <= 2;

  return (
    <div className="flex h-full gap-0">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {/* Stub banner */}
        {isStub && (
          <div className="flex items-center gap-2 rounded-lg border border-vcc-100 bg-vcc-50/50 px-4 py-2">
            <svg className="h-4 w-4 flex-shrink-0 text-vcc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px] text-vcc-600">
              Enterprise topology view — {vsActivities.length} stages modelled. For full stream diagnostics with friction analysis and throughput projections, load the dedicated stream scaffold.
            </p>
          </div>
        )}

        {/* ── Narrative header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-lg font-semibold text-vcc-900">{vsName}</h2>
            {vsDescription && (
              <div className="max-w-4xl rounded-md bg-gray-50 px-3 py-2">
                <p
                  title={vsDescription}
                  className="text-xs leading-relaxed text-gray-500 line-clamp-4"
                >
                  {vsDescription}
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1 text-xs">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Accountable Stakeholder
              </span>
              <span className="rounded-full border border-vcc-200 bg-vcc-50 px-2.5 py-0.5 text-[11px] font-medium text-vcc-700">
                {accountableStakeholder}
              </span>
            </div>
          </div>

          <CanvasToolbar
            structureOpen={structureOpen}
            analyticsOpen={analyticsOpen}
            ppitToggles={ppitToggles}
            onToggleStructure={toggleStructure}
            onToggleAnalytics={toggleAnalytics}
            onTogglePPIT={togglePPIT}
            heatmapData={heatmapData}
            validationReport={validationReport}
          />
        </div>

        {/* ── Diagnosis summary ── */}
        {heatmapData && (
          <DiagnosisSummary
            heatmapData={heatmapData}
            bindingActivityName={bindingActivityName}
            onBindingClick={() => {
              const a = heatmapData.bindingConstraint.bindingAnchor;
              if (a.anchorType === "Activity") setSelectedActivityId(a.anchorId);
            }}
          />
        )}

        {/* ── Stage columns ── */}
        <div className="flex items-stretch overflow-x-auto pb-4">
          {canvasViewModel.columns.map((col, i) => (
            <div key={col.columnId} className="flex items-stretch">
              <StageColumn
                column={col}
                scaffold={scaffoldData}
                index={i}
                total={canvasViewModel.columns.length}
                frictionMap={frictionMap}
                bindingActivityIds={bindingActivityIds}
                selectedActivityId={selectedActivityId}
                hasHeatmap={!!heatmapData}
                ppitToggles={ppitToggles}
                structureOpen={structureOpen}
                analyticsOpen={analyticsOpen}
                onFrictionClick={setSelectedActivityId}
                maxMetricRows={maxMetricRows}
              />
              {i < canvasViewModel.columns.length - 1 && <FlowChevron />}
            </div>
          ))}
        </div>

        {/* ── Validation findings ── */}
        {validationReport && validationReport.findings.length > 0 && (
          <details className="rounded-lg border border-yellow-100 bg-yellow-50/40 p-3">
            <summary className="cursor-pointer text-sm font-medium text-yellow-600">
              {validationReport.findings.length} validation finding
              {validationReport.findings.length !== 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 space-y-1">
              {validationReport.findings.map((f, i) => (
                <li key={i} className="text-xs text-yellow-500">
                  <span className="font-mono font-medium">[{f.ruleId}]</span>{" "}
                  {f.message}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* ── Consequence panel ── */}
      {selectedActivityId && heatmapData && selectedObs.length > 0 && (
        <div className="w-[480px] flex-shrink-0">
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

/* ── Diagnosis Summary Bar ─────────────────────────────────────────── */

function DiagnosisSummary({
  heatmapData,
  bindingActivityName,
  onBindingClick,
}: {
  heatmapData: { observations: unknown[]; bindingConstraint: { confidence?: number | null } };
  bindingActivityName: string | null;
  onBindingClick: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white px-5 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-xs font-medium text-gray-700">
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
            <span className="text-xs text-gray-500">
              Binding:{" "}
              <button
                onClick={onBindingClick}
                className="font-medium text-red-700 underline decoration-red-200 underline-offset-2 hover:text-red-900"
              >
                {bindingActivityName}
              </button>
            </span>
          </div>
          {heatmapData.bindingConstraint.confidence != null && (
            <>
              <div className="h-4 w-px bg-gray-200" />
              <span className="font-mono text-[10px] text-gray-400">
                Confidence:{" "}
                {(heatmapData.bindingConstraint.confidence * 100).toFixed(0)}%
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}
