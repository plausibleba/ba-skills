import { useMemo, useState, useCallback, useRef } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useGateCheck } from "../hooks/useGateCheck.ts";
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
import { InspectorPanel, type InspectorTarget } from "./canvas/InspectorPanel.tsx";
import { useCanvasControls } from "./canvas/useCanvasControls.ts";
import { useModuleFeatures } from "../hooks/useModuleFeatures.ts";
import { NBABanner } from "./NBABanner";
import { useAgenticEnablementStore } from "../store/agentic-enablement-store.ts";
import { useEffect } from "react";

/* ── Canvas View — orchestrator ────────────────────────────────────── */

export function CanvasView() {
  const { canvasViewModel, scaffoldData, heatmapData, validationReport, getAllUserStories, updateVsName, updateVsDescription, addActivity, removeActivity, moveActivity, cardRegistry, topologyView, capabilityInstanceView } =
    useCanvasStore();
  const { gate } = useGateCheck();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [selectedCardActivityId, setSelectedCardActivityId] = useState<string | null>(null);
  const [inspectorTarget, setInspectorTarget] = useState<InspectorTarget | null>(null);
  const {
    structureOpen,
    analyticsOpen,
    constraintDAGOpen,
    ppitToggles,
    cardToggles,
    agenticOpen,
    toggleStructure,
    toggleConstraintDAG,
    togglePPIT,
    toggleCard,
    toggleAgentic,
  } = useCanvasControls();
  const features = useModuleFeatures();
  const seedAES = useAgenticEnablementStore((s) => s.seedFromScaffold);
  const aesScoreCount = useAgenticEnablementStore((s) => Object.keys(s.scores).length);

  // Lazy seed: when the Agentic toggle is opened and the store has no scores
  // yet, populate from the loaded scaffold using the deterministic heuristic.
  useEffect(() => {
    if (agenticOpen && aesScoreCount === 0 && scaffoldData) {
      seedAES(scaffoldData);
    }
  }, [agenticOpen, aesScoreCount, scaffoldData, seedAES]);

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

  /* ── Drag-to-reorder state ── */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const dragCounterRef = useRef(0);  // track nested dragenter/leave

  const handleDragStart = useCallback((colIndex: number) => (e: React.DragEvent) => {
    setDragIdx(colIndex);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(colIndex));
    // Slight delay so the browser captures the element as a ghost image
    requestAnimationFrame(() => {
      (e.target as HTMLElement).style.opacity = "0.4";
    });
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "";
    setDragIdx(null);
    setDropIdx(null);
    dragCounterRef.current = 0;
  }, []);

  const handleDragOver = useCallback((colIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx === null) return;
    // Determine which side of the column we're closest to
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const insertBefore = e.clientX < midX;
    const targetIdx = insertBefore ? colIndex : colIndex + 1;
    if (targetIdx !== dropIdx) setDropIdx(targetIdx);
  }, [dragIdx, dropIdx]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dropIdx === null) return;
    // Adjust target index: if dragging right, the removal shifts indices
    let toIndex = dropIdx > dragIdx ? dropIdx - 1 : dropIdx;
    if (toIndex < 0) toIndex = 0;
    if (toIndex !== dragIdx) {
      const actId = canvasViewModel.columns[dragIdx]?.activityIds[0];
      if (actId) moveActivity(canvasViewModel.valueStreamId, actId, toIndex);
    }
    setDragIdx(null);
    setDropIdx(null);
    dragCounterRef.current = 0;
  }, [dragIdx, dropIdx, canvasViewModel, moveActivity]);

  return (
    <div className="flex h-full gap-0" style={{ background: tv.bgSurface, fontFamily: "'DM Sans', system-ui, sans-serif", position: "relative" }}>
      {/* D-118: NBA Banner for canvas view */}
      <NBABanner style={{ top: 56 }} />

      <div className="flex h-full flex-1 flex-col gap-4 overflow-hidden pl-6 pt-4">
        {/* Conflict banner — optimistic lock failure */}
        <ConflictBanner />

        {/* Stub banner removed — not useful for end users */}

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
              constraintDAGOpen={constraintDAGOpen}
              ppitToggles={ppitToggles}
              cardToggles={cardToggles}
              agenticOpen={agenticOpen}
              onToggleConstraintDAG={toggleConstraintDAG}
              onTogglePPIT={togglePPIT}
              onToggleCard={toggleCard}
              onToggleAgentic={toggleAgentic}
              heatmapData={heatmapData}
              features={features}
            />
            {features.userStories && <ExportStoriesButton getAllUserStories={getAllUserStories} />}
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

        {/* ── Stage columns (drag-to-reorder) ── */}
        <div className="flex flex-1 min-h-0 items-start overflow-auto pb-4" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          {canvasViewModel.columns.map((col, i) => (
            <div key={col.columnId} className="flex items-stretch">
              {/* Drop indicator — left edge */}
              {dropIdx === i && dragIdx !== null && dragIdx !== i && dragIdx !== i - 1 && (
                <div className="flex w-1 flex-shrink-0 self-stretch rounded-full mx-0.5" style={{ background: tv.accent }} />
              )}
              <div
                draggable
                onDragStart={handleDragStart(i)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver(i)}
                className="cursor-grab active:cursor-grabbing"
              >
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
                  agenticOpen={agenticOpen}
                  cardRegistry={cardRegistry}
                  structureOpen={structureOpen}
                  onToggleStructure={toggleStructure}
                  analyticsOpen={analyticsOpen}
                  onFrictionClick={setSelectedActivityId}
                  onCardClick={setSelectedCardActivityId}
                  onInspect={setInspectorTarget}
                  maxMetricRows={maxMetricRows}
                  onRemoveActivity={canvasViewModel.columns.length > 1
                    ? () => removeActivity(canvasViewModel.valueStreamId, col.activityIds[0])
                    : undefined}
                />
              </div>
              {i < canvasViewModel.columns.length - 1 && <FlowChevron />}
              {/* Drop indicator — right edge of last column */}
              {i === canvasViewModel.columns.length - 1 && dropIdx === canvasViewModel.columns.length && dragIdx !== null && dragIdx !== i && (
                <div className="flex w-1 flex-shrink-0 self-stretch rounded-full mx-0.5" style={{ background: tv.accent }} />
              )}
            </div>
          ))}
          {/* Add Stage button */}
          <div className="flex w-[120px] flex-shrink-0 items-start justify-center pt-8">
            <button
              onClick={() => gate("edit_field", () => {
                const lastCol = canvasViewModel.columns[canvasViewModel.columns.length - 1];
                const afterId = lastCol?.activityIds[0];
                addActivity(canvasViewModel.valueStreamId, "New Stage", afterId);
              }, "adding a stage")}
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

      {/* ── Inspector panel ── */}
      {inspectorTarget && (
        <div className="w-[360px] flex-shrink-0">
          <InspectorPanel
            key={JSON.stringify(inspectorTarget)}
            target={inspectorTarget}
            scaffold={scaffoldData}
            onClose={() => setInspectorTarget(null)}
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
  const { gate } = useGateCheck();
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
      onClick={() => gate("export_stories", handleExport, "exporting user stories")}
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
  heatmapData: { observations: unknown[]; bindingConstraint: { confidence?: number | null } | null };
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
          {heatmapData.bindingConstraint?.confidence != null && (
            <>
              <div className="h-4 w-px" style={{ background: tv.borderSubtle }} />
              <span className="font-mono text-[10px]" style={{ color: tv.textDim }}>
                Confidence:{" "}
                {(heatmapData.bindingConstraint?.confidence * 100).toFixed(0)}%
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}
