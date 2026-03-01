import { useState } from "react";
import type {
  FrictionObservation,
  HeatmapData,
  ScaffoldData,
} from "../types.ts";
import { classifyCategory, categoryLabel } from "./FrictionOverlay.tsx";
import { ThroughputPanel } from "./ThroughputPanel.tsx";

const CATEGORY_OPTIONS = [
  "DataSignalFriction",
  "ProcessHandoffFriction",
  "GovernanceRiskFriction",
  "IncentiveCapacityFriction",
  "DecisionAuthorityFriction",
];

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
  editMode,
  onUpdate,
}: {
  obs: FrictionObservation;
  isBindingObs: boolean;
  scaffold: ScaffoldData;
  editMode: boolean;
  onUpdate: (patch: Partial<FrictionObservation>) => void;
}) {
  const group = classifyCategory(obs.category);
  const borderColor =
    group === "execution" ? "border-l-amber-500" : "border-l-red-500";

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
      className={`rounded-md border border-gray-100 border-l-4 ${borderColor} bg-white p-3 ${
        isBindingObs ? "ring-1 ring-red-200 ring-offset-1" : ""
      } ${editMode ? "ring-1 ring-violet-200" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {editMode ? (
            <select
              value={obs.category}
              onChange={(e) => onUpdate({ category: e.target.value })}
              className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                group === "execution"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {categoryLabel(obs.category)}
            </span>
          )}
          {isBindingObs && (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              Binding
            </span>
          )}
        </div>
        {editMode ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={obs.intensity.score ?? 0}
              onChange={(e) =>
                onUpdate({ intensity: { ...obs.intensity, score: parseFloat(e.target.value) } })
              }
              className="w-14 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <span className="text-[10px] text-gray-400">/10</span>
          </div>
        ) : (
          obs.intensity.score != null && (
            <IntensityBar score={obs.intensity.score} />
          )
        )}
      </div>

      {editMode ? (
        <textarea
          value={obs.rationale}
          onChange={(e) => onUpdate({ rationale: e.target.value })}
          rows={3}
          className="mt-2 w-full resize-none rounded border border-gray-200 p-1.5 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-gray-700">
          {obs.rationale}
        </p>
      )}

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

function NewObservationForm({
  activityId,
  onSave,
  onCancel,
}: {
  activityId: string;
  onSave: (obs: FrictionObservation) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [rationale, setRationale] = useState("");
  const [score, setScore] = useState(5);

  function handleSave() {
    if (!rationale.trim()) return;
    const newObs: FrictionObservation = {
      observationId: `obs-${Date.now()}`,
      category,
      primaryAnchor: { anchorType: "Activity", anchorId: activityId },
      intensity: { score },
      rationale: rationale.trim(),
      observedAt: new Date().toISOString(),
    };
    onSave(newObs);
  }

  return (
    <div className="rounded-md border border-violet-200 bg-violet-50/40 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
        New Observation
      </p>
      <div className="flex items-center gap-2 mb-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 rounded border border-gray-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabel(cat)}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={score}
          onChange={(e) => setScore(parseFloat(e.target.value))}
          className="w-14 rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
        <span className="text-[10px] text-gray-400">/10</span>
      </div>
      <textarea
        placeholder="Describe the friction observation..."
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={3}
        className="w-full resize-none rounded border border-gray-200 p-1.5 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!rationale.trim()}
          className="rounded bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function FrictionPanel({
  activityId,
  observations: initialObservations,
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
  const [justificationExpanded, setJustificationExpanded] = useState(false);

  // F-001: Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [observations, setObservations] = useState<FrictionObservation[]>(initialObservations);
  const [savedObservations, setSavedObservations] = useState<FrictionObservation[]>(initialObservations);
  const [showNewForm, setShowNewForm] = useState(false);

  const bindingObsId = heatmap.bindingConstraint.bindingAnchorObservationId;

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

  function handleUpdate(observationId: string, patch: Partial<FrictionObservation>) {
    setObservations((prev) =>
      prev.map((o) => (o.observationId === observationId ? { ...o, ...patch } : o))
    );
  }

  function handleSave() {
    setSavedObservations(observations);
    setEditMode(false);
    setShowNewForm(false);
  }

  function handleCancel() {
    setObservations(savedObservations);
    setEditMode(false);
    setShowNewForm(false);
  }

  function handleAddObservation(obs: FrictionObservation) {
    setObservations((prev) => [...prev, obs]);
    setShowNewForm(false);
  }

  function handleExport() {
    const exportedHeatmap = {
      ...heatmap,
      observations: [
        ...heatmap.observations.filter(
          (o) => !observations.find((eo) => eo.observationId === o.observationId)
        ),
        ...observations,
      ],
    };
    const blob = new Blob([JSON.stringify(exportedHeatmap, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${heatmap.heatmapId}-edited-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col border-l border-gray-100 bg-gray-50/30">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-vcc-900">
            {activityName}
          </h3>
          <p className="mt-0.5 flex gap-2 text-[10px] text-gray-500">
            {execCount > 0 && (
              <span className="rounded bg-amber-50 px-1 text-amber-700">
                {execCount} execution
              </span>
            )}
            {govCount > 0 && (
              <span className="rounded bg-red-50 px-1 text-red-700">
                {govCount} governing
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Export button — always visible when heatmap loaded */}
          <button
            onClick={handleExport}
            title="Download edited heatmap"
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Edit / Save / Cancel */}
          {editMode ? (
            <>
              <button
                onClick={handleCancel}
                className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-violet-700"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              title="Edit observations"
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Edit mode indicator */}
      {editMode && (
        <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-1.5">
          <p className="text-[10px] font-medium text-violet-600">
            Editing — changes are in-memory only until exported
          </p>
        </div>
      )}

      {/* Binding constraint callout */}
      {heatmap.bindingConstraint.bindingAnchor.anchorType === "Activity" &&
        heatmap.bindingConstraint.bindingAnchor.anchorId === activityId && (
          <>
            <div className="border-b border-red-100 bg-red-50/60 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
                Binding Constraint
              </p>
              <p className={`mt-1 text-xs leading-relaxed text-red-800 ${
                !justificationExpanded ? "line-clamp-3" : ""
              }`}>
                {heatmap.bindingConstraint.justification}
              </p>
              {heatmap.bindingConstraint.justification.length > 150 && (
                <button
                  onClick={() => setJustificationExpanded(!justificationExpanded)}
                  className="mt-1 text-[10px] font-medium text-red-500 hover:text-red-700"
                >
                  {justificationExpanded ? "Show less" : "Show more"}
                </button>
              )}
              {heatmap.bindingConstraint.confidence != null && (
                <p className="mt-1 text-[10px] text-red-600">
                  Confidence:{" "}
                  {(heatmap.bindingConstraint.confidence * 100).toFixed(0)}%
                </p>
              )}
            </div>

            <ThroughputPanel
              activityId={activityId}
              heatmap={heatmap}
              scaffold={scaffold}
            />
          </>
        )}

      {/* Observations list */}
      <div className="flex-1 space-y-2 overflow-auto p-4">
        {sorted.map((obs) => (
          <ObservationCard
            key={obs.observationId}
            obs={obs}
            isBindingObs={obs.observationId === bindingObsId}
            scaffold={scaffold}
            editMode={editMode}
            onUpdate={(patch) => handleUpdate(obs.observationId, patch)}
          />
        ))}

        {/* Add new observation */}
        {editMode && (
          showNewForm ? (
            <NewObservationForm
              activityId={activityId}
              onSave={handleAddObservation}
              onCancel={() => setShowNewForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-violet-300 py-2 text-[10px] font-medium text-violet-500 hover:border-violet-400 hover:bg-violet-50/40"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add observation
            </button>
          )
        )}
      </div>
    </div>
  );
}
