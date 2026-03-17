import { useMemo, useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { tv } from "../theme.ts";
import type { TransformationUserStory, ScaffoldElement, ScaffoldActivity } from "../types.ts";
import { toJiraExport } from "../types.ts";
import { humanizeId } from "../lib/humanize-id.ts";
import { InlineEdit } from "./canvas/InlineEdit.tsx";
import {
  buildActivityFrictionMap,
  resolveBindingActivityIds,
} from "./FrictionOverlay.tsx";
import { FrictionPanel } from "./FrictionPanel.tsx";
import { CardPanel } from "./CardPanel.tsx";
import { StageColumn } from "./canvas/StageColumn.tsx";
import { FlowChevron } from "./canvas/FlowChevron.tsx";
import { CanvasToolbar } from "./canvas/CanvasToolbar.tsx";
import { ConstraintDAGOverlay } from "./canvas/ConstraintDAGOverlay.tsx";
import { ConflictBanner } from "./ConflictBanner.tsx";
import { useCanvasControls } from "./canvas/useCanvasControls.ts";

/* ── Canvas View — orchestrator ────────────────────────────────────── */

export function CanvasView() {
  const { canvasViewModel, scaffoldData, heatmapData, validationReport, getAllUserStories, updateVsName, updateVsDescription, addActivity, removeActivity, cardRegistry, topologyView, capabilityInstanceView } =
    useCanvasStore();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [selectedCardActivityId, setSelectedCardActivityId] = useState<string | null>(null);
  const {
    structureOpen,
    analyticsOpen,
    constraintDAGOpen,
    ppitToggles,
    cardToggles,
    toggleStructure,
    toggleAnalytics,
    toggleConstraintDAG,
    togglePPIT,
    toggleCard,
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
  const vsName = vs?.name ?? humanizeId(canvasViewModel.valueStreamId);
  const vsDescription = (
    vs as ScaffoldElement & { description?: string }
  )?.description;
  const selectedObs = selectedActivityId
    ? (frictionMap.get(selectedActivityId) ?? [])
    : [];

  const bindingActivityName = heatmapData
    ? (() => {
        const a = heatmapData.bindingConstraint?.bindingAnchor;
        if (!a) return null;
        return a.anchorType === "Activity"
          ? (scaffoldData.elements.activities[a.anchorId]?.name ?? humanizeId(a.anchorId))
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
    <div className="flex h-full gap-0" style={{ background: tv.bgSurface, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="flex h-full flex-1 flex-col gap-4 overflow-hidden pl-6 pt-4">
        {/* Conflict banner — optimistic lock failure */}
        <ConflictBanner />

        {/* Stub banner */}
        {isStub && (
          <div className="flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2" style={{ border: `1px solid ${tv.borderSubtle}`, background: tv.bgCard }}>
            <svg className="h-4 w-4 flex-shrink-0" style={{ color: tv.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px]" style={{ color: tv.textDim }}>
              Enterprise topology view — {vsActivities.length} stages modelled. For full stream diagnostics with friction analysis and throughput projections, load the dedicated stream scaffold.
            </p>
          </div>
        )}

        {/* ── Narrative header ── */}
        <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-[280px] flex-1 space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: tv.textPrimary }}>
              <InlineEdit
                value={vsName}
                onSave={(name) => updateVsName(canvasViewModel.valueStreamId, name)}
                className="text-lg font-semibold"
                inputClassName="text-lg font-semibold text-gray-900 bg-white"
                style={{ color: tv.textPrimary }}
              />
            </h2>
            <div className="min-w-[200px] max-w-4xl rounded-md px-3 py-2" style={{ background: tv.bgCard }}>
              <InlineEdit
                value={vsDescription ?? ""}
                onSave={(desc) => updateVsDescription(canvasViewModel.valueStreamId, desc)}
                className="text-xs leading-relaxed"
                inputClassName="text-xs text-gray-900 bg-white"
                style={{ color: tv.textDim }}
                placeholder="Add a description…"
                multiline
              />
            </div>
            <div className="flex items-center gap-3 pt-1 text-xs">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: tv.textDim }}>
                Accountable Stakeholder
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ color: tv.textPrimary, background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
                {accountableStakeholder}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CanvasToolbar
              structureOpen={structureOpen}
              analyticsOpen={analyticsOpen}
              constraintDAGOpen={constraintDAGOpen}
              ppitToggles={ppitToggles}
              cardToggles={cardToggles}
              onToggleStructure={toggleStructure}
              onToggleAnalytics={toggleAnalytics}
              onToggleConstraintDAG={toggleConstraintDAG}
              onTogglePPIT={togglePPIT}
              onToggleCard={toggleCard}
              heatmapData={heatmapData}
              validationReport={validationReport}
            />
            <ExportStoriesButton getAllUserStories={getAllUserStories} />
          </div>
        </div>

        {/* ── Diagnosis summary ── */}
        {heatmapData && (
          <DiagnosisSummary
            heatmapData={heatmapData}
            bindingActivityName={bindingActivityName}
            onBindingClick={() => {
              const a = heatmapData.bindingConstraint?.bindingAnchor;
              if (a?.anchorType === "Activity") setSelectedActivityId(a.anchorId);
            }}
          />
        )}

        {/* ── Constraint DAG modal ── */}
        {constraintDAGOpen && topologyView && (
          <ConstraintDAGOverlay
            columns={canvasViewModel.columns}
            topologyView={topologyView}
            bindingActivityIds={bindingActivityIds}
            scaffoldData={scaffoldData}
            capabilityInstanceView={capabilityInstanceView}
            onClose={toggleConstraintDAG}
          />
        )}

        {/* ── Stage columns ── */}
        <div className="flex flex-1 min-h-0 items-stretch overflow-x-auto pb-4">
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
                cardToggles={cardToggles}
                cardRegistry={cardRegistry}
                structureOpen={structureOpen}
                analyticsOpen={analyticsOpen}
                onFrictionClick={setSelectedActivityId}
                onCardClick={setSelectedCardActivityId}
                maxMetricRows={maxMetricRows}
                onRemoveActivity={canvasViewModel.columns.length > 1
                  ? () => removeActivity(canvasViewModel.valueStreamId, col.activityIds[0])
                  : undefined}
              />
              {i < canvasViewModel.columns.length - 1 && <FlowChevron />}
            </div>
          ))}
          {/* Add Stage button */}
          <div className="flex w-[120px] flex-shrink-0 items-start justify-center pt-8">
            <button
              onClick={() => {
                const lastCol = canvasViewModel.columns[canvasViewModel.columns.length - 1];
                const afterId = lastCol?.activityIds[0];
                addActivity(canvasViewModel.valueStreamId, "New Stage", afterId);
              }}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors"
              style={{ borderColor: tv.borderSubtle, color: tv.textDim }}
              title="Add a new stage"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] font-medium">Add Stage</span>
            </button>
          </div>
        </div>

        {/* ── Validation findings ── */}
        {validationReport && validationReport.findings.length > 0 && (
          <details className="flex-shrink-0 rounded-lg p-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <summary className="cursor-pointer text-sm font-medium" style={{ color: "#fbbf24" }}>
              {validationReport.findings.length} validation finding
              {validationReport.findings.length !== 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 space-y-1">
              {validationReport.findings.map((f, i) => (
                <li key={i} className="text-xs" style={{ color: "rgba(251,191,36,0.7)" }}>
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
            key={selectedActivityId}
            activityId={selectedActivityId}
            observations={selectedObs}
            heatmap={heatmapData}
            scaffold={scaffoldData}
            onClose={() => setSelectedActivityId(null)}
          />
        </div>
      )}

      {/* ── MVC Card panel ── */}
      {selectedCardActivityId && cardRegistry && (
        <div className="w-[480px] flex-shrink-0">
          <CardPanel
            key={selectedCardActivityId}
            activityId={selectedCardActivityId}
            registry={cardRegistry}
            scaffold={scaffoldData}
            onClose={() => setSelectedCardActivityId(null)}
          />
        </div>
      )}
    </div>
  );
}

/* ── Export Stories Button ─────────────────────────────────────────── */

function ExportStoriesButton({
  getAllUserStories,
}: {
  getAllUserStories: () => TransformationUserStory[];
}) {
  const stories = getAllUserStories();
  if (stories.length === 0) return null;

  function handleExport() {
    const rows = stories.map(toJiraExport);
    const headers = ["Story ID", "Summary", "Description", "SBR ID", "Capability", "Story Points", "Priority", "Epic Link", "Labels", "Issue Type"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => {
          const val = r[h as keyof typeof r] ?? "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vcc-user-stories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      title={`Export ${stories.length} user stor${stories.length !== 1 ? "ies" : "y"} to Jira CSV`}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
      style={{ border: `1px solid rgba(74,158,218,0.3)`, background: "rgba(74,158,218,0.15)", color: tv.accent }}
    >
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export {stories.length} Stor{stories.length !== 1 ? "ies" : "y"}
    </button>
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
    <div className="flex items-center gap-4 rounded-lg px-5 py-2.5" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-xs font-medium" style={{ color: tv.textSecondary }}>
          {heatmapData.observations.length} friction observations
        </span>
      </div>
      {bindingActivityName && (
        <>
          <div className="h-4 w-px" style={{ background: tv.borderSubtle }} />
          <div className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs" style={{ color: tv.textDim }}>
              Binding:{" "}
              <button
                onClick={onBindingClick}
                className="font-medium text-red-400 underline decoration-red-400/30 underline-offset-2 hover:text-red-300"
              >
                {bindingActivityName}
              </button>
            </span>
          </div>
          {heatmapData.bindingConstraint.confidence != null && (
            <>
              <div className="h-4 w-px" style={{ background: tv.borderSubtle }} />
              <span className="font-mono text-[10px]" style={{ color: tv.textDim }}>
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
