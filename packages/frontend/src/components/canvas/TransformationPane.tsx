import { useState } from "react";
import type {
  ScaffoldData,
  ScaffoldActivity,
  FrictionObservation,
  TransformationUserStory,
} from "../../types.ts";
import { humanizeId } from "../../lib/humanize-id.ts";
import { callLLM } from "../../domain/pipeline/llm-client";

/* ── Category label map ─────────────────────────────────────────────── */
const CATEGORY_LABELS: Record<string, { label: string; colour: string }> = {
  DataSignalFriction:           { label: "Data Signal",       colour: "bg-blue-50 text-blue-700 ring-blue-200" },
  ProcessHandoffFriction:       { label: "Process Handoff",   colour: "bg-violet-50 text-violet-700 ring-violet-200" },
  GovernanceRiskFriction:       { label: "Governance Risk",   colour: "bg-amber-50 text-amber-700 ring-amber-200" },
  IncentiveCapacityFriction:    { label: "Incentive/Capacity",colour: "bg-orange-50 text-orange-700 ring-orange-200" },
  DecisionAuthorityFriction:    { label: "Decision Authority",colour: "bg-rose-50 text-rose-700 ring-rose-200" },
  TechnologyIntegrationFriction:{ label: "Tech Integration",  colour: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

const STORY_STATUS_META: Record<
  TransformationUserStory["status"],
  { label: string; colour: string }
> = {
  draft:  { label: "Draft",     colour: "bg-gray-100 text-gray-500" },
  ready:  { label: "Ready",     colour: "bg-blue-50 text-blue-600" },
  sprint: { label: "In Sprint", colour: "bg-violet-50 text-violet-700" },
  done:   { label: "Done",      colour: "bg-emerald-50 text-emerald-700" },
};

/* ── Score bar ──────────────────────────────────────────────────────── */
function ScoreBar({ score }: { score: number }) {
  const pct = Math.round((score / 10) * 100);
  const colour = score >= 8 ? "bg-red-400" : score >= 5 ? "bg-amber-400" : "bg-yellow-300";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-500">{score.toFixed(1)}</span>
    </div>
  );
}

/* ── Inline story editor ────────────────────────────────────────────── */
function StoryEditor({
  story,
  onSave,
  onCancel,
}: {
  story: TransformationUserStory;
  onSave: (updated: TransformationUserStory) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TransformationUserStory>({ ...story });
  const [acText, setAcText] = useState(story.acceptanceCriteria.join("\n"));

  function save() {
    onSave({
      ...draft,
      acceptanceCriteria: acText.split("\n").map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-white px-2.5 py-2 space-y-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-indigo-500">Edit Story</p>

      {[
        { label: "As a…",      key: "asA"    as const, rows: 1 },
        { label: "I want to…", key: "iWant"  as const, rows: 2 },
        { label: "So that…",   key: "soThat" as const, rows: 2 },
      ].map(({ label, key, rows }) => (
        <div key={key} className="space-y-0.5">
          <label className="text-[9px] text-gray-400">{label}</label>
          <textarea
            rows={rows}
            className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
            value={draft[key]}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          />
        </div>
      ))}

      <div className="space-y-0.5">
        <label className="text-[9px] text-gray-400">Acceptance Criteria (one per line)</label>
        <textarea
          rows={3}
          className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
          value={acText}
          onChange={(e) => setAcText(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <select
          value={draft.status}
          onChange={(e) =>
            setDraft({ ...draft, status: e.target.value as TransformationUserStory["status"] })
          }
          className="rounded border border-gray-200 px-1 py-0.5 text-[10px] text-gray-600 focus:outline-none"
        >
          {(["draft", "ready", "sprint", "done"] as const).map((s) => (
            <option key={s} value={s}>{STORY_STATUS_META[s].label}</option>
          ))}
        </select>
        <select
          value={draft.priority ?? "medium"}
          onChange={(e) =>
            setDraft({ ...draft, priority: e.target.value as TransformationUserStory["priority"] })
          }
          className="rounded border border-gray-200 px-1 py-0.5 text-[10px] text-gray-600 focus:outline-none"
        >
          {(["critical", "high", "medium", "low"] as const).map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={40}
          placeholder="pts"
          value={draft.storyPoints ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, storyPoints: e.target.value ? Number(e.target.value) : undefined })
          }
          className="w-12 rounded border border-gray-200 px-1 py-0.5 text-[10px] text-gray-600 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Epic ID"
          value={draft.epicId ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, epicId: e.target.value || undefined })
          }
          className="w-20 rounded border border-gray-200 px-1 py-0.5 text-[10px] font-mono text-gray-600 focus:outline-none"
        />
      </div>

      <div className="flex gap-2 pt-0.5">
        <button
          onClick={save}
          className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── User Story Card ────────────────────────────────────────────────── */
function UserStoryCard({
  story,
  onStatusChange,
  onEdit,
}: {
  story: TransformationUserStory;
  onStatusChange: (storyId: string, status: TransformationUserStory["status"]) => void;
  onEdit: (story: TransformationUserStory) => void;
}) {
  const statusMeta = STORY_STATUS_META[story.status];
  const statusOrder: TransformationUserStory["status"][] = ["draft", "ready", "sprint", "done"];

  function cycleStatus() {
    const next = statusOrder[(statusOrder.indexOf(story.status) + 1) % statusOrder.length];
    onStatusChange(story.storyId, next);
  }

  const priorityColour =
    story.priority === "critical" ? "text-red-500"
    : story.priority === "high"   ? "text-amber-600"
    : story.priority === "medium" ? "text-blue-500"
    : "text-gray-400";

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 px-2.5 py-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[9px] font-mono text-gray-400">ID: {story.storyId}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={cycleStatus}
            title="Cycle status"
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset cursor-pointer ${statusMeta.colour}`}
          >
            {statusMeta.label}
          </button>
          <button
            onClick={() => onEdit(story)}
            title="Edit story"
            className="text-[10px] text-gray-300 hover:text-indigo-500 transition-colors"
          >
            ✎
          </button>
        </div>
      </div>

      {/* Story body — line-broken format */}
      <div className="space-y-0.5 text-[11px] leading-snug text-gray-700">
        <p><span className="font-medium text-gray-400">As a </span>{story.asA},</p>
        <p><span className="font-medium text-gray-400">I want to </span>{story.iWant},</p>
        <p><span className="font-medium text-gray-400">So that </span>{story.soThat}.</p>
      </div>

      {/* Acceptance criteria */}
      {story.acceptanceCriteria.length > 0 && (
        <div className="mt-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
            Acceptance Criteria
          </span>
          <ul className="mt-0.5 space-y-0.5 list-disc list-inside">
            {story.acceptanceCriteria.map((ac, i) => (
              <li key={i} className="text-[10px] text-gray-600">{ac}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta: points, priority, epic */}
      <div className="mt-1.5 flex items-center gap-2.5">
        {story.storyPoints != null && (
          <span className="text-[9px] text-gray-400">{story.storyPoints} pts</span>
        )}
        {story.priority && (
          <span className={`text-[9px] font-semibold ${priorityColour}`}>
            {story.priority.charAt(0).toUpperCase() + story.priority.slice(1)}
          </span>
        )}
        {story.epicId && (
          <span className="text-[9px] text-gray-400 font-mono">{story.epicId}</span>
        )}
      </div>
    </div>
  );
}

/* ── SBR card: observation + its user stories + generate button ─────── */
function SBRCard({
  obs,
  isBinding,
  stories,
  activityName,
  roleNames,
  capabilityId,
  capabilityName,
  onFrictionClick,
  onGenerateStory,
  onSaveStory,
  onStatusChange,
}: {
  obs: FrictionObservation;
  isBinding: boolean;
  stories: TransformationUserStory[];
  activityName: string;
  roleNames: string[];
  capabilityId?: string;
  capabilityName?: string;
  onFrictionClick: () => void;
  onGenerateStory: (
    obs: FrictionObservation,
    activityName: string,
    roleNames: string[],
    capabilityId?: string,
    capabilityName?: string
  ) => Promise<TransformationUserStory | null>;
  onSaveStory: (story: TransformationUserStory) => void;
  onStatusChange: (storyId: string, status: TransformationUserStory["status"]) => void;
}) {
  const cat = CATEGORY_LABELS[obs.category] ?? {
    label: obs.category,
    colour: "bg-gray-50 text-gray-600 ring-gray-200",
  };
  const [generating, setGenerating] = useState(false);
  const [editingStory, setEditingStory] = useState<TransformationUserStory | null>(null);
  const hasStories = stories.length > 0;

  async function handleGenerate() {
    setGenerating(true);
    const story = await onGenerateStory(obs, activityName, roleNames, capabilityId, capabilityName);
    if (story) onSaveStory(story);
    setGenerating(false);
  }

  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        isBinding ? "border-red-200 bg-red-50/40" : "border-gray-100 bg-white"
      }`}
    >
      {/* SBR header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${cat.colour}`}
        >
          {isBinding && <span className="mr-1">⚠</span>}
          {cat.label}
        </span>
        <div className="flex items-center gap-1.5">
          <ScoreBar score={obs.intensity?.score ?? 0} />
          <button
            onClick={onFrictionClick}
            title="Inspect in Friction Panel"
            className="text-[9px] text-gray-300 hover:text-vcc-600 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Rationale */}
      <p className="text-[11px] leading-snug text-gray-600 line-clamp-3 mb-1.5">
        {obs.rationale}
      </p>

      {/* User stories nested under this SBR */}
      {hasStories && (
        <div className="space-y-1.5 mb-1.5">
          {stories.map((story) =>
            editingStory?.storyId === story.storyId ? (
              <StoryEditor
                key={story.storyId}
                story={editingStory}
                onSave={(updated) => {
                  onSaveStory(updated);
                  setEditingStory(null);
                }}
                onCancel={() => setEditingStory(null)}
              />
            ) : (
              <UserStoryCard
                key={story.storyId}
                story={story}
                onStatusChange={onStatusChange}
                onEdit={setEditingStory}
              />
            )
          )}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className={`flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold transition-colors ${
          generating
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 ring-1 ring-indigo-200"
        }`}
      >
        {generating ? (
          <>
            <span className="animate-spin inline-block">⟳</span>
            <span>Generating…</span>
          </>
        ) : (
          <>
            <span>+</span>
            <span>{hasStories ? "Add Story" : "Generate User Story"}</span>
          </>
        )}
      </button>
    </div>
  );
}

/* ── Claude API call ────────────────────────────────────────────────── */
async function callGenerateUserStory(
  obs: FrictionObservation,
  activityName: string,
  roleNames: string[],
  capabilityId?: string,
  capabilityName?: string
): Promise<TransformationUserStory | null> {
  const score = obs.intensity?.score ?? 5;

  const system = `You are a business analyst generating Agile user stories for an enterprise transformation programme.
You receive a Strategic Business Requirement (SBR) — a friction observation from a value stream model — and return a single, well-formed user story.

Rules:
- "asA": the primary role(s) affected by this friction. Use the job titles provided. Be specific, not generic.
- "iWant": the capability or change that resolves the friction. Start with a verb. 1-2 sentences.
- "soThat": the business outcome enabled. Quantify where possible.
- "acceptanceCriteria": 3-5 testable, binary conditions in plain present-tense assertions.
- "storyPoints": Fibonacci estimate (1,2,3,5,8,13) based on scope implied by friction score and category.
- "priority": derive from friction score — ≥8.5=critical, ≥7=high, ≥5=medium, <5=low.

Respond ONLY with a raw JSON object. No markdown, no code fences, no prose.
Schema: { "asA": string, "iWant": string, "soThat": string, "acceptanceCriteria": string[], "storyPoints": number, "priority": "critical"|"high"|"medium"|"low" }`;

  const user = `Activity: ${activityName}
Roles: ${roleNames.length > 0 ? roleNames.join(", ") : "unspecified"}
Friction category: ${obs.category}
Friction score: ${score}/10
SBR rationale: ${obs.rationale}

Generate the user story.`;

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 0,
      messages: [{ role: "user", content: `${system}\n\n${user}` }],
    });
    const parsed = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());

    return {
      storyId: `US-${obs.observationId.slice(-8)}-${Date.now().toString(36)}`,
      observationId: obs.observationId,
      capabilityId,
      capabilityName,
      asA: parsed.asA,
      iWant: parsed.iWant,
      soThat: parsed.soThat,
      acceptanceCriteria: parsed.acceptanceCriteria ?? [],
      storyPoints: parsed.storyPoints,
      priority: parsed.priority ?? (score >= 8.5 ? "critical" : score >= 7 ? "high" : score >= 5 ? "medium" : "low"),
      status: "draft",
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/* ── Transformation Pane (main export) ─────────────────────────────── */
export function TransformationPane({
  activity,
  scaffold,
  frictionObs,
  isBinding,
  isVisible,
  summaryOnly,
  onFrictionClick,
  userStories,
  onStoriesChange,
}: {
  activity: ScaffoldActivity;
  scaffold: ScaffoldData;
  frictionObs: FrictionObservation[];
  isBinding: boolean;
  isVisible: boolean;
  summaryOnly: boolean;
  onFrictionClick: () => void;
  /** All user stories scoped to this activity (filtered by caller) */
  userStories: TransformationUserStory[];
  /** Caller receives the full updated stories array for this activity */
  onStoriesChange: (stories: TransformationUserStory[]) => void;
}) {
  const fCnt = frictionObs.length;
  const cCnt = activity.controlIds?.length ?? 0;
  const sCnt = userStories.length;

  if (fCnt + cCnt === 0 || !isVisible) return null;

  const parts: string[] = [];
  if (fCnt > 0) parts.push(`${fCnt} SBR${fCnt !== 1 ? "s" : ""}`);
  if (sCnt > 0) parts.push(`${sCnt} Stor${sCnt !== 1 ? "ies" : "y"}`);
  if (cCnt > 0) parts.push(`${cCnt} Control${cCnt !== 1 ? "s" : ""}`);

  if (summaryOnly) {
    return (
      <div className="border-t border-gray-100 px-3 py-1.5">
        <span className="text-[10px] text-gray-400">{parts.join(" · ")}</span>
      </div>
    );
  }

  const roleNames = (activity.performedByRoleIds ?? []).map(
    (rid) => scaffold.elements.roles[rid]?.name ?? humanizeId(rid)
  );

  // Binding observation = highest score in this activity's observations
  const maxScore = Math.max(...frictionObs.map((o) => o.intensity?.score ?? 0));

  function handleSaveStory(story: TransformationUserStory) {
    const idx = userStories.findIndex((s) => s.storyId === story.storyId);
    if (idx >= 0) {
      const next = [...userStories];
      next[idx] = story;
      onStoriesChange(next);
    } else {
      onStoriesChange([...userStories, story]);
    }
  }

  function handleStatusChange(storyId: string, status: TransformationUserStory["status"]) {
    onStoriesChange(userStories.map((s) => (s.storyId === storyId ? { ...s, status } : s)));
  }

  return (
    <div className="overflow-y-auto border-t border-gray-100 bg-gray-50/30 px-3 py-2 scrollbar-thin">
      <div className="space-y-2">

        {/* SBRs with inline user stories */}
        {fCnt > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                Strategic Requirements ({fCnt})
              </span>
              {sCnt > 0 && (
                <span className="text-[9px] text-indigo-400">
                  {sCnt} stor{sCnt !== 1 ? "ies" : "y"}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {frictionObs.map((obs) => {
                // Resolve capability: direct anchor takes priority, else first cap on activity
                const anchor = obs.primaryAnchor;
                let resolvedCapId: string | undefined;
                let resolvedCapName: string | undefined;
                if (anchor.anchorType === "Capability") {
                  resolvedCapId = anchor.anchorId;
                  resolvedCapName = scaffold.elements.capabilities?.[anchor.anchorId]?.name;
                } else {
                  resolvedCapId = activity.requiresCapabilityIds?.[0];
                  resolvedCapName = resolvedCapId
                    ? scaffold.elements.capabilities?.[resolvedCapId]?.name
                    : undefined;
                }
                return (
                  <SBRCard
                    key={obs.observationId}
                    obs={obs}
                    isBinding={isBinding && (obs.intensity?.score ?? 0) === maxScore}
                    stories={userStories.filter((s) => s.observationId === obs.observationId)}
                    activityName={activity.name}
                    roleNames={roleNames}
                    capabilityId={resolvedCapId}
                    capabilityName={resolvedCapName}
                    onFrictionClick={onFrictionClick}
                    onGenerateStory={callGenerateUserStory}
                    onSaveStory={handleSaveStory}
                    onStatusChange={handleStatusChange}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Controls */}
        {cCnt > 0 && (
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
              Controls ({cCnt})
            </span>
            <div className="mt-1 space-y-0.5">
              {(activity.controlIds ?? []).map((cid: string) => (
                <p key={cid} className="text-[11px] text-gray-600">
                  · {scaffold.elements.controls[cid]?.name ?? humanizeId(cid)}
                </p>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
