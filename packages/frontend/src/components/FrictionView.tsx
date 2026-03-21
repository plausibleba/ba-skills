// @ts-nocheck
import { useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type {
  FrictionObservation,
  HeatmapData,
  ScaffoldData,
  AnchorRef,
} from "../types.ts";
import { classifyCategory, categoryLabel, buildActivityFrictionMap } from "./FrictionOverlay.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Tab type
// ─────────────────────────────────────────────────────────────────────────────

type FrictionTab = "observations" | "howItWorks" | "survey" | "settings";

// ─────────────────────────────────────────────────────────────────────────────
// Friction category metadata
// ─────────────────────────────────────────────────────────────────────────────

const EXECUTION_CATEGORIES = [
  "ProcessHandoffFriction",
  "TechnologyIntegrationFriction",
  "DataSignalFriction",
] as const;

const GOVERNING_CATEGORIES = [
  "DecisionAuthorityFriction",
  "GovernanceRiskFriction",
  "IncentiveCapacityFriction",
] as const;

const ALL_CATEGORIES = [...EXECUTION_CATEGORIES, ...GOVERNING_CATEGORIES];

const CATEGORY_COLOURS: Record<string, { dot: string; bg: string; text: string }> = {
  ProcessHandoffFriction:        { dot: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  TechnologyIntegrationFriction: { dot: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  DataSignalFriction:            { dot: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  DecisionAuthorityFriction:     { dot: "#ef4444", bg: "#fef2f2", text: "#991b1b" },
  GovernanceRiskFriction:        { dot: "#ef4444", bg: "#fef2f2", text: "#991b1b" },
  IncentiveCapacityFriction:     { dot: "#ef4444", bg: "#fef2f2", text: "#991b1b" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Default structural signals (customisable)
// ─────────────────────────────────────────────────────────────────────────────

export interface StructuralSignal {
  id: string;
  category: string;
  label: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_STRUCTURAL_SIGNALS: StructuralSignal[] = [
  { id: "sig-handoff-chain", category: "ProcessHandoffFriction", label: "Long activity chains without branching", description: "Sequential gating pattern — 4+ activities in a linear chain with no parallel paths", enabled: true },
  { id: "sig-handoff-loops", category: "ProcessHandoffFriction", label: "Repeated outcome loops", description: "Rework loops where an activity's post-outcome feeds back to an earlier pre-outcome", enabled: true },
  { id: "sig-tech-multi-cap", category: "TechnologyIntegrationFriction", label: "Single activity requiring multiple capabilities", description: "Integration pressure — one activity needing 3+ capabilities suggests system fragmentation", enabled: true },
  { id: "sig-tech-cap-spread", category: "TechnologyIntegrationFriction", label: "Capability spread across value streams", description: "Same capability appearing in 3+ value streams without shared infrastructure", enabled: true },
  { id: "sig-data-info-repeat", category: "DataSignalFriction", label: "Repeated information objects across sequential activities", description: "Same informationObjectIds appearing in 3+ consecutive activities suggests data dependency chains", enabled: true },
  { id: "sig-auth-single-role", category: "DecisionAuthorityFriction", label: "Single-point approval role in 5+ activities", description: "Role overload — one role appearing in 5+ activities as the sole performer", enabled: true },
  { id: "sig-gov-control-stack", category: "GovernanceRiskFriction", label: "2+ controls per activity", description: "Control layering — multiple governance controls stacked on a single activity", enabled: true },
  { id: "sig-gov-metric-absence", category: "GovernanceRiskFriction", label: "Metric absence where controls exist", description: "Controls without corresponding metrics indicate unmeasured governance", enabled: true },
  { id: "sig-incentive-role-overload", category: "IncentiveCapacityFriction", label: "Role overload across 5+ activities", description: "One role spread across many activities suggests capacity constraint and misaligned incentives", enabled: true },
  { id: "sig-incentive-metric-misalign", category: "IncentiveCapacityFriction", label: "Missing or misaligned metrics", description: "Activities with outcomes but no attached metrics suggest unmeasured performance", enabled: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Survey question types
// ─────────────────────────────────────────────────────────────────────────────

interface SurveyQuestion {
  id: string;
  category: string;
  type: "rating" | "freetext";
  question: string;
  placeholder?: string;
}

const DEFAULT_SURVEY_QUESTIONS: SurveyQuestion[] = [
  // Structured — one per category
  { id: "sq-handoff", category: "ProcessHandoffFriction", type: "rating", question: "How often does work stall or require rework when handed between teams or stages?" },
  { id: "sq-tech", category: "TechnologyIntegrationFriction", type: "rating", question: "How much manual re-entry or workaround is needed because systems don't connect?" },
  { id: "sq-data", category: "DataSignalFriction", type: "rating", question: "How often are decisions delayed because information is fragmented or incomplete?" },
  { id: "sq-authority", category: "DecisionAuthorityFriction", type: "rating", question: "How clear are decision rights? Do approvals bottleneck at specific individuals?" },
  { id: "sq-governance", category: "GovernanceRiskFriction", type: "rating", question: "Do compliance gates or audit requirements slow down value delivery?" },
  { id: "sq-incentive", category: "IncentiveCapacityFriction", type: "rating", question: "Are performance measures aligned with outcomes, or do they create perverse incentives?" },
  // Open-ended
  { id: "sq-bottleneck", category: "general", type: "freetext", question: "What is the single biggest bottleneck in this value stream?", placeholder: "Describe the bottleneck and where it occurs..." },
  { id: "sq-workaround", category: "general", type: "freetext", question: "What workarounds do people use to get things done despite the process?", placeholder: "Describe any informal processes, shadow IT, or manual steps..." },
  { id: "sq-improvement", category: "general", type: "freetext", question: "If you could fix one thing about how work flows through this area, what would it be?", placeholder: "Describe the change and the impact you'd expect..." },
];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export function FrictionView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const heatmapsByVs = useCanvasStore((s) => s.heatmapsByVs);

  const [activeTab, setActiveTab] = useState<FrictionTab>("observations");

  if (!scaffoldData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-400">Load a scaffold to view friction assessments.</p>
      </div>
    );
  }

  const tabs: { id: FrictionTab; label: string; icon: string }[] = [
    { id: "observations", label: "Observations", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { id: "survey", label: "Survey", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "howItWorks", label: "How it works", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "settings", label: "Signals", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-6 pt-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-vcc-500 text-vcc-700 bg-vcc-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "observations" && (
          <ObservationsTab scaffoldData={scaffoldData} heatmapsByVs={heatmapsByVs} />
        )}
        {activeTab === "howItWorks" && <HowItWorksTab />}
        {activeTab === "survey" && <SurveyTab scaffoldData={scaffoldData} />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OBSERVATIONS TAB — aggregate friction manager with CRUD
// ═════════════════════════════════════════════════════════════════════════════

interface AggregatedObservation {
  obs: FrictionObservation;
  vsId: string;
  vsName: string;
  anchorName: string;
  isBinding: boolean;
}

function ObservationsTab({
  scaffoldData,
  heatmapsByVs,
}: {
  scaffoldData: ScaffoldData;
  heatmapsByVs: Map<string, HeatmapData>;
}) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterVs, setFilterVs] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"intensity" | "category" | "vs">("intensity");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Aggregate all observations across value streams
  const aggregated = useMemo(() => {
    const result: AggregatedObservation[] = [];
    const vsMap = scaffoldData.elements.valueStreams;

    for (const [vsId, hm] of heatmapsByVs.entries()) {
      const vsName = vsMap[vsId]?.name || vsId;
      const bindingAnchorId = hm.bindingConstraint?.bindingAnchor?.anchorId;

      for (const obs of hm.observations) {
        const anchorName = resolveAnchorName(obs.primaryAnchor, scaffoldData);
        result.push({
          obs,
          vsId,
          vsName,
          anchorName,
          isBinding: obs.primaryAnchor.anchorId === bindingAnchorId,
        });
      }
    }
    return result;
  }, [heatmapsByVs, scaffoldData]);

  // Filter
  const filtered = useMemo(() => {
    let items = aggregated;
    if (filterCategory !== "all") {
      items = items.filter((a) => a.obs.category === filterCategory);
    }
    if (filterVs !== "all") {
      items = items.filter((a) => a.vsId === filterVs);
    }
    // Sort
    items = [...items].sort((a, b) => {
      if (sortBy === "intensity") return (b.obs.intensity.score ?? 0) - (a.obs.intensity.score ?? 0);
      if (sortBy === "category") return a.obs.category.localeCompare(b.obs.category);
      return a.vsName.localeCompare(b.vsName);
    });
    return items;
  }, [aggregated, filterCategory, filterVs, sortBy]);

  // Value streams for filter dropdown
  const vsOptions = useMemo(() => {
    const vs = scaffoldData.elements.valueStreams;
    return Object.entries(vs).map(([id, v]) => ({ id, name: v.name || id }));
  }, [scaffoldData]);

  // Summary stats
  const stats = useMemo(() => {
    const exec = aggregated.filter((a) => classifyCategory(a.obs.category) === "execution").length;
    const gov = aggregated.filter((a) => classifyCategory(a.obs.category) === "governing").length;
    const binding = aggregated.filter((a) => a.isBinding).length;
    const avgIntensity = aggregated.length > 0
      ? (aggregated.reduce((sum, a) => sum + (a.obs.intensity.score ?? 0), 0) / aggregated.length).toFixed(1)
      : "—";
    return { total: aggregated.length, exec, gov, binding, avgIntensity };
  }, [aggregated]);

  if (aggregated.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-12">
        <div className="rounded-full bg-amber-50 p-4">
          <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">No friction observations yet</p>
          <p className="mt-1 text-xs text-gray-500">Run "Assess Friction" from the Stream view, or add observations manually below.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-vcc-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-vcc-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Observation
        </button>
        {showAddForm && (
          <AddObservationForm
            scaffoldData={scaffoldData}
            onClose={() => setShowAddForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Summary row */}
      <div className="mb-5 flex items-center gap-4">
        <StatCard label="Total" value={stats.total} color="gray" />
        <StatCard label="Execution" value={stats.exec} color="amber" />
        <StatCard label="Governing" value={stats.gov} color="red" />
        <StatCard label="Binding" value={stats.binding} color="blue" />
        <StatCard label="Avg Intensity" value={stats.avgIntensity} color="gray" />
      </div>

      {/* Filters + actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>

          <select
            value={filterVs}
            onChange={(e) => setFilterVs(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
          >
            <option value="all">All Value Streams</option>
            {vsOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
          >
            <option value="intensity">Sort: Intensity</option>
            <option value="category">Sort: Category</option>
            <option value="vs">Sort: Value Stream</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg bg-vcc-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-vcc-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      {showAddForm && (
        <AddObservationForm
          scaffoldData={scaffoldData}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Observations list */}
      <div className="space-y-2">
        {filtered.map((item) => (
          <ObservationRow
            key={item.obs.observationId}
            item={item}
            scaffoldData={scaffoldData}
            isEditing={editingId === item.obs.observationId}
            onEdit={() => setEditingId(editingId === item.obs.observationId ? null : item.obs.observationId)}
            onDelete={() => handleDeleteObservation(item.vsId, item.obs.observationId)}
          />
        ))}
      </div>

      <p className="mt-4 text-[10px] text-gray-400">
        {filtered.length} of {aggregated.length} observations shown
      </p>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colours: Record<string, string> = {
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${colours[color]}`}>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</span>
    </div>
  );
}

// ── Observation row ──────────────────────────────────────────────────────────

function ObservationRow({
  item,
  scaffoldData,
  isEditing,
  onEdit,
  onDelete,
}: {
  item: AggregatedObservation;
  scaffoldData: ScaffoldData;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { obs, vsName, anchorName, isBinding } = item;
  const group = classifyCategory(obs.category);
  const colours = CATEGORY_COLOURS[obs.category] || CATEGORY_COLOURS.ProcessHandoffFriction;
  const score = obs.intensity.score ?? 0;

  // Editable state (local — changes persist to heatmap on save)
  const [editCategory, setEditCategory] = useState(obs.category);
  const [editIntensity, setEditIntensity] = useState(score);
  const [editRationale, setEditRationale] = useState(obs.rationale);

  const handleSave = () => {
    const store = useCanvasStore.getState();
    const hm = store.heatmapsByVs.get(item.vsId);
    if (!hm) return;
    const updated = {
      ...hm,
      observations: hm.observations.map((o) =>
        o.observationId === obs.observationId
          ? { ...o, category: editCategory, intensity: { ...o.intensity, score: editIntensity }, rationale: editRationale }
          : o
      ),
    };
    store.heatmapsByVs.set(item.vsId, updated);
    useCanvasStore.setState({ heatmapsByVs: new Map(store.heatmapsByVs), scaffoldDirty: true });
    onEdit(); // close
  };

  return (
    <div className={`rounded-lg border ${isBinding ? "border-blue-300 bg-blue-50/30" : "border-gray-200 bg-white"} transition-shadow hover:shadow-sm`}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Intensity bar */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: score >= 8 ? "#ef4444" : score >= 6 ? "#f59e0b" : score >= 4 ? "#eab308" : "#9ca3af" }}
          >
            {score}
          </div>
          {isBinding && (
            <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700">BC</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: colours.bg, color: colours.text }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: colours.dot }} />
              {categoryLabel(obs.category)}
            </span>
            <span className="text-[10px] text-gray-400">{vsName}</span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-500 font-medium">{anchorName}</span>
          </div>

          {isEditing ? (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-3">
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs"
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  Intensity:
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={editIntensity}
                    onChange={(e) => setEditIntensity(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="font-bold text-gray-800">{editIntensity}</span>
                </label>
              </div>
              <textarea
                value={editRationale}
                onChange={(e) => setEditRationale(e.target.value)}
                rows={2}
                className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="rounded bg-vcc-600 px-3 py-1 text-xs font-semibold text-white hover:bg-vcc-700">Save</button>
                <button onClick={onEdit} className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed">{obs.rationale}</p>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 pt-0.5">
            <button onClick={onEdit} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Edit">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={onDelete} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add observation form ─────────────────────────────────────────────────────

function AddObservationForm({
  scaffoldData,
  onClose,
}: {
  scaffoldData: ScaffoldData;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(ALL_CATEGORIES[0]);
  const [anchorType, setAnchorType] = useState<string>("Activity");
  const [anchorId, setAnchorId] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [rationale, setRationale] = useState("");
  const [vsId, setVsId] = useState(Object.keys(scaffoldData.elements.valueStreams)[0] || "");

  const anchorOptions = useMemo(() => {
    const elts = scaffoldData.elements;
    if (anchorType === "Activity") return Object.entries(elts.activities).map(([id, a]) => ({ id, name: a.name }));
    if (anchorType === "Role") return Object.entries(elts.roles).map(([id, r]) => ({ id, name: r.name || id }));
    if (anchorType === "Capability") return Object.entries(elts.capabilities).map(([id, c]) => ({ id, name: c.name || id }));
    if (anchorType === "Control") return Object.entries(elts.controls).map(([id, c]) => ({ id, name: c.name || id }));
    if (anchorType === "Metric") return Object.entries(elts.metrics).map(([id, m]) => ({ id, name: m.name || id }));
    return [];
  }, [scaffoldData, anchorType]);

  const handleAdd = () => {
    if (!anchorId || !rationale.trim()) return;
    const store = useCanvasStore.getState();
    const hm = store.heatmapsByVs.get(vsId);
    const obsId = `fr_manual_${Date.now()}`;
    const newObs: FrictionObservation = {
      observationId: obsId,
      category,
      primaryAnchor: { anchorType, anchorId },
      intensity: { scale: "0-10", score: intensity },
      rationale: rationale.trim(),
      observedAt: new Date().toISOString(),
    };

    if (hm) {
      const updated = { ...hm, observations: [...hm.observations, newObs] };
      store.heatmapsByVs.set(vsId, updated);
    } else {
      // Create new heatmap for this VS
      const newHm: HeatmapData = {
        schemaVersion: "1.0",
        heatmapId: `heatmap-${vsId}-${Date.now()}`,
        scaffoldId: scaffoldData.scaffoldId,
        valueStreamId: vsId,
        createdAt: new Date().toISOString(),
        observations: [newObs],
        bindingConstraint: null as any,
      };
      store.heatmapsByVs.set(vsId, newHm);
    }
    useCanvasStore.setState({ heatmapsByVs: new Map(store.heatmapsByVs), scaffoldDirty: true });
    onClose();
  };

  return (
    <div className="mb-4 rounded-lg border border-vcc-200 bg-vcc-50/30 p-4">
      <h4 className="mb-3 text-xs font-semibold text-gray-700">Add Friction Observation</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Value Stream</label>
          <select value={vsId} onChange={(e) => setVsId(e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs">
            {Object.entries(scaffoldData.elements.valueStreams).map(([id, v]) => (
              <option key={id} value={id}>{v.name || id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs">
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Anchor Type</label>
          <select value={anchorType} onChange={(e) => { setAnchorType(e.target.value); setAnchorId(""); }} className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs">
            {["Activity", "Role", "Capability", "Control", "Metric"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Anchor Element</label>
          <select value={anchorId} onChange={(e) => setAnchorId(e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs">
            <option value="">Select...</option>
            {anchorOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 flex items-center gap-2 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Intensity: <span className="text-xs font-bold text-gray-800">{intensity}/10</span>
        </label>
        <input type="range" min={0} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full" />
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Rationale</label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={2}
          placeholder="Describe the friction observation and its impact..."
          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={handleAdd} disabled={!anchorId || !rationale.trim()} className="rounded bg-vcc-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-vcc-700 disabled:opacity-40">
          Add Observation
        </button>
        <button onClick={onClose} className="rounded border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}

// ── Delete handler ───────────────────────────────────────────────────────────

function handleDeleteObservation(vsId: string, observationId: string) {
  const store = useCanvasStore.getState();
  const hm = store.heatmapsByVs.get(vsId);
  if (!hm) return;
  const updated = {
    ...hm,
    observations: hm.observations.filter((o) => o.observationId !== observationId),
  };
  store.heatmapsByVs.set(vsId, updated);
  useCanvasStore.setState({ heatmapsByVs: new Map(store.heatmapsByVs), scaffoldDirty: true });
}

// ── Anchor name resolver ─────────────────────────────────────────────────────

function resolveAnchorName(anchor: AnchorRef, scaffold: ScaffoldData): string {
  const { anchorType, anchorId } = anchor;
  const elts = scaffold.elements;
  if (anchorType === "Activity") return elts.activities[anchorId]?.name || anchorId;
  if (anchorType === "Role") return elts.roles[anchorId]?.name || anchorId;
  if (anchorType === "Capability") return elts.capabilities[anchorId]?.name || anchorId;
  if (anchorType === "Control") return elts.controls[anchorId]?.name || anchorId;
  if (anchorType === "Metric") return elts.metrics[anchorId]?.name || anchorId;
  if (anchorType === "Constraint") return elts.constraints[anchorId]?.name || anchorId;
  return anchorId;
}

// ═════════════════════════════════════════════════════════════════════════════
// HOW IT WORKS TAB — inline methodology content
// ═════════════════════════════════════════════════════════════════════════════

function HowItWorksTab() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-vcc-500">VCC Methodology</span>
        <h2 className="mt-1 text-xl font-bold text-gray-900">Friction Assessment</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          A structured diagnostic that identifies where constraint accumulates in a value stream. Unlike traditional process reviews that list problems, a friction assessment anchors every observation to a specific element in the operating model and classifies it according to a formal taxonomy.
        </p>
      </div>

      {/* Three purposes */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: "Diagnostic", desc: "Surface where operational friction exists and quantify its intensity", colour: "bg-amber-50 border-amber-200 text-amber-800" },
          { label: "Interpretive", desc: "Identify the binding constraint — the single point that most limits throughput", colour: "bg-blue-50 border-blue-200 text-blue-800" },
          { label: "Interventional", desc: "Map friction observations to solution recommendations (People, Process, Information, Technology)", colour: "bg-emerald-50 border-emerald-200 text-emerald-800" },
        ].map((p) => (
          <div key={p.label} className={`rounded-lg border p-4 ${p.colour}`}>
            <h4 className="text-xs font-bold">{p.label}</h4>
            <p className="mt-1 text-[11px] leading-relaxed opacity-80">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* Taxonomy */}
      <Section title="The Friction Taxonomy">
        <p className="mb-3 text-xs text-gray-600">
          Friction observations are classified into six categories, split between execution (operational bottlenecks) and governing (decision and control bottlenecks).
        </p>
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold text-amber-700">Execution Friction (Amber)</h4>
          <div className="space-y-2">
            <TaxonomyCard cat="Process Handoff" def="Work stalls between stages. Rework loops, wait-time queues, and sequential gating without parallelism." signal="Long activity chains without branching; repeated outcome loops" />
            <TaxonomyCard cat="Technology Integration" def="Systems don't interoperate. Manual data re-entry, automation gaps, capability spread across unlinked systems." signal="Single activity requiring multiple capabilities; capability spread across VS" />
            <TaxonomyCard cat="Data Signal" def="Information is fragmented or delayed. Decision latency due to data dependency chains." signal="Repeated informationObjectIds across sequential activities" />
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold text-red-700">Governing Friction (Red)</h4>
          <div className="space-y-2">
            <TaxonomyCard cat="Decision Authority" def="Decision rights are ambiguous. Escalation layers multiply, approval gates concentrate on single roles." signal="Single-point approval; role appearing in 5+ activities" />
            <TaxonomyCard cat="Governance Risk" def="Control layering creates overhead. Compliance gates multiply without clear risk reduction." signal="2+ controls per activity; metric absence where controls exist" />
            <TaxonomyCard cat="Incentive Capacity" def="Performance measures distort behaviour. Budget fragments accountability. Metrics misaligned with outcomes." signal="Role overload (5+ activities); missing or misaligned metrics" />
          </div>
        </div>
      </Section>

      {/* Evidence classification */}
      <Section title="Evidence Classification">
        <p className="mb-3 text-xs text-gray-600">Every observation declares its evidential basis. This determines how much weight the observation carries in scoring.</p>
        <div className="space-y-2">
          <EvidenceCard label="EVIDENCED" desc="Directly stated in source material (transcript, document, or user input)." rule="Must include evidence references. No intensity cap." colour="bg-green-50 border-green-200" />
          <EvidenceCard label="INFERRED" desc="Derived from scaffold structure. The AI identifies structural patterns that typically indicate friction." rule="Must include structuralPattern description. No intensity cap." colour="bg-blue-50 border-blue-200" />
          <EvidenceCard label="ASSUMED" desc="Domain heuristic only. Common friction pattern applied without specific evidence from this context." rule="Intensity capped at 5/10. Requires validation flag. Lowest scoring weight." colour="bg-amber-50 border-amber-200" />
        </div>
      </Section>

      {/* Intensity scoring */}
      <Section title="Intensity Scoring">
        <p className="mb-3 text-xs text-gray-600">Each observation receives an intensity score on a 0–10 scale based on severity and evidence strength.</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { range: "8–10", label: "Critical", colour: "bg-red-100 text-red-800 border-red-200" },
            { range: "6–7", label: "High", colour: "bg-amber-100 text-amber-800 border-amber-200" },
            { range: "4–5", label: "Medium", colour: "bg-yellow-100 text-yellow-800 border-yellow-200" },
            { range: "0–3", label: "Low", colour: "bg-gray-100 text-gray-700 border-gray-200" },
          ].map((s) => (
            <div key={s.range} className={`rounded-lg border p-3 text-center ${s.colour}`}>
              <div className="text-lg font-bold">{s.range}</div>
              <div className="text-[10px] font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Binding constraint */}
      <Section title="The Binding Constraint">
        <p className="mb-3 text-xs text-gray-600">
          The binding constraint is the single point in the value stream that most limits overall throughput. Borrowed from the Theory of Constraints, this ensures the assessment identifies the one place where intervention would have the greatest systemic effect.
        </p>
        <p className="mb-3 text-xs text-gray-600">
          Eligibility is determined by a 5-dimensional scoring model. Each dimension scores 0–3 for a maximum of 15 points:
        </p>
        <div className="space-y-1.5">
          {[
            { dim: "Observation Frequency", desc: "How many friction observations reference this anchor point" },
            { dim: "Authority Centralisation", desc: "Degree to which decision rights concentrate at this point" },
            { dim: "Downstream Dependency", desc: "How many subsequent activities depend on this anchor's output" },
            { dim: "Control Layering", desc: "Number of governance controls stacked at this point" },
            { dim: "Capacity Constraint", desc: "Whether this point is resource-limited (people, systems, budget)" },
          ].map((d) => (
            <div key={d.dim} className="flex items-start gap-3 rounded border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="whitespace-nowrap text-[10px] font-bold text-gray-700 w-40 shrink-0">{d.dim}</span>
              <span className="text-[10px] text-gray-600">{d.desc}</span>
              <span className="ml-auto text-[10px] font-medium text-gray-400 shrink-0">0–3</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-gray-500">
          An anchor is only eligible if its Downstream Dependency score is 2 or higher. Confidence = totalScore / 15.
        </p>
      </Section>

      {/* Anchor model */}
      <Section title="The Anchor Model">
        <p className="mb-3 text-xs text-gray-600">
          Every friction observation is anchored to one or more elements in the scaffold: Activity, Role, Capability, Control, Metric, or Constraint. When anchored to a non-activity element, the system resolves it to the set of activities that reference that element — this is how the heatmap overlay lights up the correct activity columns on the canvas.
        </p>
        <div className="space-y-1">
          {[
            { from: "Role", to: "Activities where performedByRoleIds includes the role" },
            { from: "Capability", to: "Activities where requiresCapabilityIds includes the capability" },
            { from: "Metric", to: "Activities where metricIds includes the metric" },
            { from: "Control", to: "Activities where controlIds includes the control" },
          ].map((r) => (
            <div key={r.from} className="flex items-center gap-2 text-[10px]">
              <span className="font-bold text-gray-700 w-20">{r.from}</span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-600">{r.to}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── How it Works sub-components ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-sm font-bold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function TaxonomyCard({ cat, def, signal }: { cat: string; def: string; signal: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <span className="text-xs font-semibold text-gray-800">{cat}</span>
      <p className="mt-0.5 text-[10px] text-gray-600 leading-relaxed">{def}</p>
      <p className="mt-1 text-[10px] text-gray-400"><span className="font-medium">Signal:</span> {signal}</p>
    </div>
  );
}

function EvidenceCard({ label, desc, rule, colour }: { label: string; desc: string; rule: string; colour: string }) {
  return (
    <div className={`rounded-lg border p-3 ${colour}`}>
      <span className="text-xs font-bold">{label}</span>
      <p className="mt-0.5 text-[10px] leading-relaxed opacity-80">{desc}</p>
      <p className="mt-1 text-[10px] opacity-60">{rule}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SURVEY TAB — structured + open-ended pre-assessment inputs
// ═════════════════════════════════════════════════════════════════════════════

function SurveyTab({ scaffoldData }: { scaffoldData: ScaffoldData }) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [selectedVs, setSelectedVs] = useState(Object.keys(scaffoldData.elements.valueStreams)[0] || "");
  const [submitted, setSubmitted] = useState(false);

  const updateAnswer = (id: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    // Store survey responses as pain points that can feed into Pass C
    // For now we save to sessionStorage as a signal for the pipeline
    const surveyData = {
      valueStreamId: selectedVs,
      timestamp: new Date().toISOString(),
      responses: DEFAULT_SURVEY_QUESTIONS.map((q) => ({
        questionId: q.id,
        category: q.category,
        type: q.type,
        question: q.question,
        answer: answers[q.id] ?? (q.type === "rating" ? 0 : ""),
      })),
    };
    // Persist in memory for now — the pipeline can pick this up
    (window as any).__vcc_friction_survey = surveyData;
    setSubmitted(true);
  };

  const ratingQuestions = DEFAULT_SURVEY_QUESTIONS.filter((q) => q.type === "rating");
  const freetextQuestions = DEFAULT_SURVEY_QUESTIONS.filter((q) => q.type === "freetext");

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-12">
        <div className="rounded-full bg-green-50 p-4">
          <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Survey responses captured</p>
        <p className="text-xs text-gray-500 max-w-md text-center">
          These responses will be used as additional evidence when the next friction assessment is generated. Run "Assess Friction" from the Stream view to incorporate them.
        </p>
        <button
          onClick={() => { setSubmitted(false); setAnswers({}); }}
          className="text-xs text-vcc-600 hover:text-vcc-700 font-medium"
        >
          Fill in again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-vcc-500">Pre-Assessment</span>
        <h2 className="mt-1 text-lg font-bold text-gray-900">Friction Survey</h2>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
          Answer these questions to provide additional context before running a friction assessment. Your responses will be used as evidence signals alongside the structural analysis.
        </p>
      </div>

      {/* VS selector */}
      <div className="mb-6">
        <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Value Stream</label>
        <select
          value={selectedVs}
          onChange={(e) => setSelectedVs(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          {Object.entries(scaffoldData.elements.valueStreams).map(([id, v]) => (
            <option key={id} value={id}>{v.name || id}</option>
          ))}
        </select>
      </div>

      {/* Structured questions */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-bold text-gray-800">Structured Assessment</h3>
        <div className="space-y-4">
          {ratingQuestions.map((q) => {
            const catColour = CATEGORY_COLOURS[q.category];
            return (
              <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start gap-2 mb-2">
                  {catColour && (
                    <span className="mt-0.5 inline-block h-2 w-2 rounded-full shrink-0" style={{ background: catColour.dot }} />
                  )}
                  <p className="text-xs font-medium text-gray-700">{q.question}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">Never</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateAnswer(q.id, n)}
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-all ${
                          answers[q.id] === n
                            ? "bg-vcc-600 text-white shadow-sm"
                            : "border border-gray-200 bg-white text-gray-500 hover:border-vcc-300 hover:text-vcc-600"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">Always</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open-ended questions */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-bold text-gray-800">Open-Ended Discovery</h3>
        <div className="space-y-4">
          {freetextQuestions.map((q) => (
            <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="mb-2 text-xs font-medium text-gray-700">{q.question}</p>
              <textarea
                value={(answers[q.id] as string) || ""}
                onChange={(e) => updateAnswer(q.id, e.target.value)}
                placeholder={q.placeholder}
                rows={3}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full rounded-lg bg-vcc-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-vcc-700"
      >
        Save Survey Responses
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB — customisable structural signals
// ═════════════════════════════════════════════════════════════════════════════

function SettingsTab() {
  const [signals, setSignals] = useState<StructuralSignal[]>(DEFAULT_STRUCTURAL_SIGNALS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleSignal = (id: string) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const updateSignal = (id: string, field: keyof StructuralSignal, value: string) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const deleteSignal = (id: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== id));
  };

  const addSignal = (signal: StructuralSignal) => {
    setSignals((prev) => [...prev, signal]);
    setShowAddForm(false);
  };

  // Group by category
  const grouped = useMemo(() => {
    const groups = new Map<string, StructuralSignal[]>();
    for (const sig of signals) {
      const arr = groups.get(sig.category) || [];
      arr.push(sig);
      groups.set(sig.category, arr);
    }
    return groups;
  }, [signals]);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-vcc-500">Configuration</span>
        <h2 className="mt-1 text-lg font-bold text-gray-900">Structural Signals</h2>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
          Structural signals are patterns the AI looks for when analysing your scaffold. You can enable, disable, edit, or add custom signals to tune the friction assessment to your context.
        </p>
      </div>

      {/* Signal groups */}
      {ALL_CATEGORIES.map((cat) => {
        const catSignals = grouped.get(cat) || [];
        if (catSignals.length === 0) return null;
        const colours = CATEGORY_COLOURS[cat];
        return (
          <div key={cat} className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: colours.dot }} />
              <h3 className="text-xs font-bold text-gray-700">{categoryLabel(cat)}</h3>
            </div>
            <div className="space-y-2">
              {catSignals.map((sig) => (
                <div
                  key={sig.id}
                  className={`rounded-lg border p-3 transition-all ${sig.enabled ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSignal(sig.id)}
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        sig.enabled
                          ? "border-vcc-500 bg-vcc-500 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {sig.enabled && (
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {editingId === sig.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          value={sig.label}
                          onChange={(e) => updateSignal(sig.id, "label", e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs font-medium"
                        />
                        <textarea
                          value={sig.description}
                          onChange={(e) => updateSignal(sig.id, "description", e.target.value)}
                          rows={2}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-[10px]"
                        />
                        <button onClick={() => setEditingId(null)} className="rounded bg-vcc-600 px-3 py-1 text-[10px] font-semibold text-white">Done</button>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-800">{sig.label}</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">{sig.description}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingId(editingId === sig.id ? null : sig.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteSignal(sig.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add signal */}
      {showAddForm ? (
        <AddSignalForm onAdd={addSignal} onCancel={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-500 hover:border-vcc-300 hover:text-vcc-600 w-full justify-center"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Signal
        </button>
      )}

      <p className="mt-6 text-[10px] text-gray-400 leading-relaxed">
        Changes here affect the next friction assessment run. Disabled signals will be excluded from structural analysis. Custom signals will be included in the analysis prompt alongside defaults.
      </p>
    </div>
  );
}

function AddSignalForm({ onAdd, onCancel }: { onAdd: (s: StructuralSignal) => void; onCancel: () => void }) {
  const [category, setCategory] = useState(ALL_CATEGORIES[0]);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="mb-4 rounded-lg border border-vcc-200 bg-vcc-50/30 p-4">
      <h4 className="mb-3 text-xs font-semibold text-gray-700">New Structural Signal</h4>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs">
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Signal Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Duplicate approval chains" className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Describe the pattern the AI should look for..." className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!label.trim()) return;
              onAdd({ id: `sig-custom-${Date.now()}`, category, label: label.trim(), description: description.trim(), enabled: true });
            }}
            disabled={!label.trim()}
            className="rounded bg-vcc-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-vcc-700 disabled:opacity-40"
          >
            Add Signal
          </button>
          <button onClick={onCancel} className="rounded border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}
