import { useState } from "react";
import type {
  FrictionObservation,
  HeatmapData,
  ScaffoldData,
  Solution,
  SolutionType,
  VendorFeatureLibrary,
  VendorFeatureRef,
} from "../types.ts";
import { classifyCategory, categoryLabel } from "./FrictionOverlay.tsx";
import { ThroughputPanel } from "./ThroughputPanel.tsx";
import SALESFORCE_LIB from "../../fixtures/vendor-libraries/salesforce-agentforce.json";
import CUSTOMER_STORIES_RAW from "../../fixtures/vendor-libraries/agentforce-customer-stories.json";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CustomerStory {
  storyId: string;
  company: string;
  industry: string;
  companySize: string;
  status: string;
  useCase: string;
  challenge: string;
  solution: string;
  keyMetric: string;
  productsUsed: string[];
  featureTags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  "DataSignalFriction",
  "ProcessHandoffFriction",
  "GovernanceRiskFriction",
  "IncentiveCapacityFriction",
  "DecisionAuthorityFriction",
];

const SOLUTION_TYPES: SolutionType[] = ["People", "Process", "Information", "Technology"];

const SOLUTION_COLOURS: Record<SolutionType, { badge: string; bg: string; border: string }> = {
  People:      { badge: "bg-blue-100 text-blue-700",       bg: "bg-blue-50/40",    border: "border-blue-200" },
  Process:     { badge: "bg-violet-100 text-violet-700",   bg: "bg-violet-50/40",  border: "border-violet-200" },
  Information: { badge: "bg-amber-100 text-amber-700",     bg: "bg-amber-50/40",   border: "border-amber-200" },
  Technology:  { badge: "bg-emerald-100 text-emerald-700", bg: "bg-emerald-50/40", border: "border-emerald-200" },
};

const VENDOR_LIBRARIES: VendorFeatureLibrary[] = [SALESFORCE_LIB as VendorFeatureLibrary];

const ALL_STORIES: CustomerStory[] =
  (CUSTOMER_STORIES_RAW as { stories: CustomerStory[] }).stories ?? [];

// Extended feature type with optional customerStoryIds
type FeatureWithStories = {
  featureId: string;
  name: string;
  description: string;
  customerStoryIds?: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStoriesForFeature(vendorId: string, featureId: string): CustomerStory[] {
  const lib = VENDOR_LIBRARIES.find((l) => l.vendorId === vendorId);
  if (!lib) return [];
  for (const cat of lib.categories) {
    const feat = cat.features.find((f) => f.featureId === featureId) as FeatureWithStories | undefined;
    if (!feat?.customerStoryIds?.length) return [];
    return feat.customerStoryIds
      .map((id) => ALL_STORIES.find((s) => s.storyId === id))
      .filter((s): s is CustomerStory => !!s)
      .slice(0, 3);
  }
  return [];
}

function statusBadgeClass(status: string): string {
  if (status === "Agentforce LIVE")      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Agentforce Visionary") return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function statusLabel(status: string): string {
  if (status === "Agentforce LIVE")      return "LIVE";
  if (status === "Agentforce Visionary") return "VISIONARY";
  return "PILOT";
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerStoryCard
// ─────────────────────────────────────────────────────────────────────────────

function CustomerStoryCard({ story }: { story: CustomerStory }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-[#b3d9f5] bg-[#f0f8ff] overflow-hidden">
      {/* Salesforce brand bar */}
      <div className="h-0.5 bg-[#0070d2]" />

      <div className="p-2.5">
        {/* Company + status */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#0070d2] leading-tight truncate">
              {story.company}
            </p>
            <p className="text-[9px] text-[#3a7fc1] mt-0.5">
              {story.industry} · {story.companySize}
            </p>
          </div>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold tracking-wide ${statusBadgeClass(story.status)}`}>
            {statusLabel(story.status)}
          </span>
        </div>

        {/* Key metric — always visible, this is the hook */}
        <div className="rounded bg-[#0070d2]/10 border border-[#0070d2]/20 px-2 py-1.5 mb-1.5">
          <p className="text-[10px] font-semibold text-[#004fa3] leading-snug">
            {story.keyMetric}
          </p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-[9px] font-medium text-[#1a6aaa] hover:text-[#0070d2] transition-colors"
        >
          <svg
            className={`h-2.5 w-2.5 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? "Hide detail" : "How they did it"}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-2 space-y-2 border-t border-[#b3d9f5] pt-2">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#3a7fc1] mb-0.5">
                Challenge
              </p>
              <p className="text-[10px] leading-relaxed text-gray-700">{story.challenge}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#3a7fc1] mb-0.5">
                Solution
              </p>
              <p className="text-[10px] leading-relaxed text-gray-700">{story.solution}</p>
            </div>
            {/* Products used */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {story.productsUsed.slice(0, 5).map((p) => (
                <span
                  key={p}
                  className="rounded bg-[#0070d2]/10 px-1.5 py-0.5 text-[8px] font-medium text-[#0070d2]"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerStoriesPanel — rendered under a vendor feature block
// ─────────────────────────────────────────────────────────────────────────────

function CustomerStoriesPanel({ vendorId, featureId }: { vendorId: string; featureId: string }) {
  const stories = getStoriesForFeature(vendorId, featureId);
  const [open, setOpen] = useState(false);

  if (stories.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded bg-[#0070d2]/8 px-2 py-1.5 text-[9px] font-semibold text-[#0070d2] hover:bg-[#0070d2]/14 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {/* bookmark icon */}
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Customer Stories ({stories.length})
        </span>
        <svg
          className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5">
          {stories.map((story) => (
            <CustomerStoryCard key={story.storyId} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IntensityBar
// ─────────────────────────────────────────────────────────────────────────────

function IntensityBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 8 ? "bg-red-500" :
    score >= 6 ? "bg-amber-500" :
    score >= 4 ? "bg-yellow-400" :
    "bg-green-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600">{score.toFixed(1)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VendorFeatureSelector
// ─────────────────────────────────────────────────────────────────────────────

function VendorFeatureSelector({
  value,
  onChange,
}: {
  value: VendorFeatureRef | undefined;
  onChange: (ref: VendorFeatureRef | undefined) => void;
}) {
  const [vendorId, setVendorId] = useState(value?.vendorId ?? VENDOR_LIBRARIES[0].vendorId);
  const library = VENDOR_LIBRARIES.find((l) => l.vendorId === vendorId) ?? VENDOR_LIBRARIES[0];

  function handleFeatureChange(featureId: string) {
    if (!featureId) { onChange(undefined); return; }
    for (const cat of library.categories) {
      const feat = cat.features.find((f) => f.featureId === featureId);
      if (feat) {
        onChange({
          vendorId: library.vendorId,
          vendorName: library.vendorName,
          featureId: feat.featureId,
          featureName: feat.name,
          categoryName: cat.categoryName,
          rationale: value?.rationale ?? "",
        });
        return;
      }
    }
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      <select
        value={vendorId}
        onChange={(e) => setVendorId(e.target.value)}
        className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[10px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      >
        {VENDOR_LIBRARIES.map((l) => (
          <option key={l.vendorId} value={l.vendorId}>{l.vendorName}</option>
        ))}
      </select>
      <select
        value={value?.featureId ?? ""}
        onChange={(e) => handleFeatureChange(e.target.value)}
        className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[10px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      >
        <option value="">— Select feature —</option>
        {library.categories.map((cat) => (
          <optgroup key={cat.categoryId} label={cat.categoryName}>
            {cat.features.map((feat) => (
              <option key={feat.featureId} value={feat.featureId}>{feat.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {value?.featureId && (
        <textarea
          placeholder="Why does this feature address this friction? (1–2 sentences)"
          value={value.rationale}
          onChange={(e) => onChange({ ...value, rationale: e.target.value })}
          rows={2}
          className="w-full resize-none rounded border border-gray-200 p-1.5 text-[10px] leading-relaxed text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SolutionCard
// ─────────────────────────────────────────────────────────────────────────────

function SolutionCard({
  solution,
  editMode,
  onUpdate,
}: {
  solution: Solution;
  editMode: boolean;
  onUpdate: (patch: Partial<Solution>) => void;
}) {
  const c = SOLUTION_COLOURS[solution.type];

  return (
    <div className={`rounded border ${c.border} ${c.bg} p-2`}>
      {/* Type badge */}
      <div className="mb-1.5">
        {editMode ? (
          <select
            value={solution.type}
            onChange={(e) => onUpdate({ type: e.target.value as SolutionType })}
            className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-violet-400"
          >
            {SOLUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.badge}`}>
            {solution.type}
          </span>
        )}
      </div>

      {/* Description */}
      {editMode ? (
        <textarea
          value={solution.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={2}
          className="w-full resize-none rounded border border-gray-200 p-1 text-[10px] leading-relaxed text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      ) : (
        <p className="text-[10px] leading-relaxed text-gray-700">{solution.description}</p>
      )}

      {/* Technology: feature selector in edit mode */}
      {solution.type === "Technology" && editMode && (
        <VendorFeatureSelector
          value={solution.vendorFeatureRef}
          onChange={(ref) => onUpdate({ vendorFeatureRef: ref })}
        />
      )}

      {/* Technology: vendor block + customer stories in read mode */}
      {solution.type === "Technology" && !editMode && solution.vendorFeatureRef && (
        <>
          <div className="mt-1.5 rounded border border-[#b3d9f5] bg-[#e8f4fd] px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#0070d2]">
              {solution.vendorFeatureRef.vendorName} · {solution.vendorFeatureRef.categoryName}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#0070d2]">
              {solution.vendorFeatureRef.featureName}
            </p>
            {solution.vendorFeatureRef.rationale && (
              <p className="mt-0.5 text-[10px] leading-relaxed text-gray-600">
                {solution.vendorFeatureRef.rationale}
              </p>
            )}
          </div>

          {/* ← Customer stories land here */}
          <CustomerStoriesPanel
            vendorId={solution.vendorFeatureRef.vendorId}
            featureId={solution.vendorFeatureRef.featureId}
          />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NewSolutionForm
// ─────────────────────────────────────────────────────────────────────────────

function NewSolutionForm({
  onSave,
  onCancel,
}: {
  onSave: (s: Solution) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<SolutionType>("Technology");
  const [description, setDescription] = useState("");
  const [vendorFeatureRef, setVendorFeatureRef] = useState<VendorFeatureRef | undefined>();

  return (
    <div className="rounded border border-dashed border-violet-300 bg-violet-50/30 p-2 space-y-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-600">New Solution</p>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SolutionType)}
        className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
      >
        {SOLUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <textarea
        placeholder="Describe the solution action..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full resize-none rounded border border-gray-200 p-1.5 text-[10px] leading-relaxed text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
      />
      {type === "Technology" && (
        <VendorFeatureSelector value={vendorFeatureRef} onChange={setVendorFeatureRef} />
      )}
      <div className="flex justify-end gap-2 pt-0.5">
        <button onClick={onCancel} className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!description.trim()) return;
            onSave({
              solutionId: `sol-${Date.now()}`,
              type,
              description: description.trim(),
              vendorFeatureRef: type === "Technology" ? vendorFeatureRef : undefined,
            });
          }}
          disabled={!description.trim()}
          className="rounded bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SolutionsSection
// ─────────────────────────────────────────────────────────────────────────────

function SolutionsSection({
  solutions,
  editMode,
  onUpdate,
  onAdd,
}: {
  solutions: Solution[];
  editMode: boolean;
  onUpdate: (solutionId: string, patch: Partial<Solution>) => void;
  onAdd: (s: Solution) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const count = solutions.length;

  if (count === 0 && !editMode) return null;

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-[10px] font-semibold text-gray-500 hover:text-gray-700"
      >
        <span>Solutions{count > 0 ? ` (${count})` : ""}</span>
        <svg
          className={`h-3 w-3 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          {solutions.map((sol) => (
            <SolutionCard
              key={sol.solutionId}
              solution={sol}
              editMode={editMode}
              onUpdate={(patch) => onUpdate(sol.solutionId, patch)}
            />
          ))}
          {editMode && (
            showNewForm ? (
              <NewSolutionForm
                onSave={(s) => { onAdd(s); setShowNewForm(false); }}
                onCancel={() => setShowNewForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-gray-300 py-1.5 text-[10px] text-gray-400 hover:border-violet-300 hover:text-violet-500"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add solution
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ObservationCard
// ─────────────────────────────────────────────────────────────────────────────

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
  const borderColor = group === "execution" ? "border-l-amber-500" : "border-l-red-500";

  function anchorName(anchorType: string, anchorId: string): string {
    const map =
      anchorType === "Activity"   ? scaffold.elements.activities :
      anchorType === "Metric"     ? scaffold.elements.metrics :
      anchorType === "Role"       ? scaffold.elements.roles :
      anchorType === "Control"    ? scaffold.elements.controls :
      anchorType === "Capability" ? scaffold.elements.capabilities : null;
    return (map?.[anchorId] as { name?: string } | undefined)?.name ?? anchorId;
  }

  return (
    <div
      className={[
        "rounded-md border border-gray-100 border-l-4 bg-white p-3",
        borderColor,
        isBindingObs ? "ring-1 ring-red-200 ring-offset-1" : "",
        editMode ? "ring-1 ring-violet-200" : "",
      ].join(" ")}
    >
      {/* Category + score row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {editMode ? (
            <select
              value={obs.category}
              onChange={(e) => onUpdate({ category: e.target.value })}
              className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>{categoryLabel(cat)}</option>
              ))}
            </select>
          ) : (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              group === "execution" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
            }`}>
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
              type="number" min={0} max={10} step={0.5}
              value={obs.intensity.score ?? 0}
              onChange={(e) => onUpdate({ intensity: { ...obs.intensity, score: parseFloat(e.target.value) } })}
              className="w-14 rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <span className="text-[10px] text-gray-400">/10</span>
          </div>
        ) : obs.intensity.score != null ? (
          <IntensityBar score={obs.intensity.score} />
        ) : null}
      </div>

      {/* Rationale */}
      {editMode ? (
        <textarea
          value={obs.rationale}
          onChange={(e) => onUpdate({ rationale: e.target.value })}
          rows={3}
          className="mt-2 w-full resize-none rounded border border-gray-200 p-1.5 text-xs leading-relaxed text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-gray-700">{obs.rationale}</p>
      )}

      {/* Anchors */}
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

      {/* Solutions */}
      <SolutionsSection
        solutions={obs.solutions ?? []}
        editMode={editMode}
        onUpdate={(solId, patch) => {
          const solutions = (obs.solutions ?? []).map((s) =>
            s.solutionId === solId ? { ...s, ...patch } : s
          );
          onUpdate({ solutions });
        }}
        onAdd={(sol) => onUpdate({ solutions: [...(obs.solutions ?? []), sol] })}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NewObservationForm
// ─────────────────────────────────────────────────────────────────────────────

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
            <option key={cat} value={cat}>{categoryLabel(cat)}</option>
          ))}
        </select>
        <input
          type="number" min={0} max={10} step={0.5} value={score}
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
        <button onClick={onCancel} className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!rationale.trim()) return;
            onSave({
              observationId: `obs-${Date.now()}`,
              category,
              primaryAnchor: { anchorType: "Activity", anchorId: activityId },
              intensity: { scale: "0-10", score },
              rationale: rationale.trim(),
              observedAt: new Date().toISOString(),
              solutions: [],
            });
          }}
          disabled={!rationale.trim()}
          className="rounded bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FrictionPanel (root export)
// ─────────────────────────────────────────────────────────────────────────────

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
  const [editMode, setEditMode] = useState(false);
  const [observations, setObservations] = useState<FrictionObservation[]>(initialObservations);
  const [savedObservations, setSavedObservations] = useState<FrictionObservation[]>(initialObservations);
  const [showNewForm, setShowNewForm] = useState(false);

  const bindingObsId = heatmap.bindingConstraint?.bindingAnchorObservationId ?? null;
  const sorted = [...observations].sort((a, b) => {
    if (a.observationId === bindingObsId) return -1;
    if (b.observationId === bindingObsId) return 1;
    return (b.intensity.score ?? 0) - (a.intensity.score ?? 0);
  });

  const execCount = observations.filter((o) => classifyCategory(o.category) === "execution").length;
  const govCount  = observations.filter((o) => classifyCategory(o.category) === "governing").length;

  function handleUpdate(observationId: string, patch: Partial<FrictionObservation>) {
    setObservations((prev) =>
      prev.map((o) => (o.observationId === observationId ? { ...o, ...patch } : o))
    );
  }

  function handleExport() {
    const exported = {
      ...heatmap,
      observations: [
        ...heatmap.observations.filter(
          (o) => !observations.find((eo) => eo.observationId === o.observationId)
        ),
        ...observations,
      ],
    };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${heatmap.heatmapId}-edited-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isBindingActivity =
    heatmap.bindingConstraint?.bindingAnchor?.anchorType === "Activity" &&
    heatmap.bindingConstraint?.bindingAnchor?.anchorId === activityId;

  return (
    <div className="flex h-full flex-col border-l border-gray-100 bg-gray-50/30">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-vcc-900">{activityName}</h3>
          <p className="mt-0.5 flex gap-2 text-[10px] text-gray-500">
            {execCount > 0 && (
              <span className="rounded bg-amber-50 px-1 text-amber-700">{execCount} execution</span>
            )}
            {govCount > 0 && (
              <span className="rounded bg-red-50 px-1 text-red-700">{govCount} governing</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Export */}
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
                onClick={() => { setObservations(savedObservations); setEditMode(false); setShowNewForm(false); }}
                className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => { setSavedObservations(observations); setEditMode(false); setShowNewForm(false); }}
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

          {/* Close */}
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Edit mode banner ── */}
      {editMode && (
        <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-1.5">
          <p className="text-[10px] font-medium text-violet-600">
            Editing — changes are in-memory only until exported
          </p>
        </div>
      )}

      {/* ── Binding constraint ── */}
      {isBindingActivity && (
        <>
          <div className="border-b border-red-100 bg-red-50/60 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
              Binding Constraint
            </p>
            <p className={`mt-1 text-xs leading-relaxed text-red-800 ${
              !justificationExpanded ? "line-clamp-3" : ""
            }`}>
              {heatmap.bindingConstraint?.justification ?? ""}
            </p>
            {(heatmap.bindingConstraint?.justification?.length ?? 0) > 150 && (
              <button
                onClick={() => setJustificationExpanded((e) => !e)}
                className="mt-1 text-[10px] font-medium text-red-500 hover:text-red-700"
              >
                {justificationExpanded ? "Show less" : "Show more"}
              </button>
            )}
            {heatmap.bindingConstraint?.confidence != null && (
              <p className="mt-1 text-[10px] text-red-600">
                Confidence: {((heatmap.bindingConstraint?.confidence ?? 0) * 100).toFixed(0)}%
              </p>
            )}
          </div>
          <ThroughputPanel activityId={activityId} heatmap={heatmap} scaffold={scaffold} />
        </>
      )}

      {/* ── Observations ── */}
      <div className="flex-1 space-y-2 overflow-auto p-4">
        {sorted.map((obs) => (
          <ObservationCard
            key={obs.observationId}
            obs={obs}
            isBindingObs={bindingObsId !== null && obs.observationId === bindingObsId}
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
              onSave={(obs) => { setObservations((prev) => [...prev, obs]); setShowNewForm(false); }}
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
