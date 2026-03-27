/**
 * EnrichmentView — Dedicated page for iteratively enriching a loaded model.
 *
 * Accessible from SideNav at any time after a scaffold is loaded.
 * Contains three sections:
 *   1. Built-in enrichment passes (Deepen Structure, Map PPIT, Generate Cards)
 *   2. Assessment & analysis actions (Friction Assessment, Gate Validation, etc.)
 *   3. Custom enrichment skills (user-editable prompts applied to the model)
 */

import { useState, useCallback, useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useDiscoverySessionStore } from "../store/discovery-session-store.ts";
import { tv } from "../theme.ts";
import { runEnrichmentStep } from "../domain/pipeline/pipeline-orchestrator";
import type { EnrichmentStep, PipelineProgress } from "../domain/pipeline/pipeline-orchestrator";
import WaitPuzzle from "./WaitPuzzle";

// ─── Types ───────────────────────────────────────────────────────────────────

/** How user-supplied content should influence the enrichment */
type InfluenceMode = "indicative" | "include" | "exclude" | "restrict-to";

const INFLUENCE_MODES: { value: InfluenceMode; label: string; description: string }[] = [
  { value: "indicative",  label: "Indicative",  description: "Use as guidance — the AI may adapt, extend, or supplement" },
  { value: "include",     label: "Include",      description: "Must be included alongside AI-generated content" },
  { value: "exclude",     label: "Exclude",      description: "Explicitly exclude these items from the output" },
  { value: "restrict-to", label: "Restrict to",  description: "Only use the items provided — do not add others" },
];

/** Per-card user content input */
interface UserContent {
  text: string;
  influence: InfluenceMode;
}

/** Snapshot captured before an enrichment run — enables rollback */
interface EnrichmentSnapshot {
  cardId: string;
  label: string;
  timestamp: number;
  scaffold: any;          // deep-cloned scaffold before the run
  cardRegistry: any;      // deep-cloned card registry before the run
}

interface EnrichmentCardDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "structure" | "assessment" | "custom";
  /** Hint for what kind of content the user might provide */
  contentHint?: string;
  /** Built-in enrichment step ID (if wired to pipeline) */
  enrichmentStep?: EnrichmentStep;
  /** For assessment actions that navigate elsewhere */
  navigateTo?: string;
  /** Check function: is this enrichment already done? */
  checkDone?: (scaffold: any, cardRegistry: any) => boolean;
  /** Placeholder — coming soon */
  comingSoon?: boolean;
}

// ─── Built-in Enrichment Definitions ─────────────────────────────────────────

const ENRICHMENT_CARDS: EnrichmentCardDef[] = [
  // ── Structure & Depth ──
  {
    id: "subactivities",
    label: "Deepen Structure",
    description: "Generate sub-activity DAGs showing the internal breakdown of each stage — decision gates, handoffs, and work steps.",
    icon: "🔀",
    category: "structure",
    enrichmentStep: "subactivities",
    contentHint: "Paste process steps, SOP fragments, or workflow descriptions to guide sub-activity generation...",
    checkDone: (scaffold) =>
      scaffold?.elements?.subActivityGraphs &&
      Object.keys(scaffold.elements.subActivityGraphs).length > 0 &&
      Object.values(scaffold.elements.subActivityGraphs).some((v: any) => v?.nodes?.length > 0),
  },
  {
    id: "ppit",
    label: "Map PPIT",
    description: "Decompose each capability into People, Process, Information, and Technology dimensions per stage.",
    icon: "🧩",
    category: "structure",
    enrichmentStep: "ppit",
    contentHint: "Paste role names, team structures, system lists, or technology stack details...",
    checkDone: (scaffold) =>
      scaffold?.elements?.activities &&
      Object.values(scaffold.elements.activities).some((a: any) => a.capabilityPPIT && Object.keys(a.capabilityPPIT).length > 0),
  },
  {
    id: "cards",
    label: "Generate Cards",
    description: "Create Concept Cards and Policy Cards that capture business definitions, rules, and governance.",
    icon: "🃏",
    category: "structure",
    enrichmentStep: "cards",
    contentHint: "Paste glossary terms, business definitions, policy documents, or governance rules...",
    checkDone: (_scaffold, cardRegistry) =>
      cardRegistry &&
      ((Object.keys(cardRegistry.conceptCards ?? {}).length > 0) || (Object.keys(cardRegistry.policyCards ?? {}).length > 0)),
  },

  // ── Assessment & Analysis ──
  {
    id: "friction",
    label: "Assess Friction",
    description: "Identify friction observations, binding constraints, and structural bottlenecks across value streams.",
    icon: "⚡",
    category: "assessment",
    navigateTo: "friction",
    contentHint: "Paste known pain points, customer complaints, or operational bottleneck descriptions...",
    checkDone: () => {
      const store = useCanvasStore.getState();
      return store.heatmapsByVs.size > 0;
    },
  },
  {
    id: "metrics",
    label: "Generate Metrics",
    description: "Derive KPIs and performance metrics for each stage and capability, aligned to business outcomes.",
    icon: "📊",
    category: "assessment",
    contentHint: "Paste existing KPIs, SLAs, performance targets, or metric definitions...",
    comingSoon: true,
  },
  {
    id: "dependencies",
    label: "Map Dependencies",
    description: "Identify and visualize cross-value-stream dependencies, shared capabilities, and integration points.",
    icon: "🔗",
    category: "assessment",
    contentHint: "Paste integration maps, system dependency lists, or API contract details...",
    comingSoon: true,
  },
  {
    id: "maturity",
    label: "Maturity Assessment",
    description: "Evaluate capability maturity levels across your operating model using industry-standard frameworks.",
    icon: "📈",
    category: "assessment",
    contentHint: "Paste maturity framework criteria, current-state assessments, or benchmark data...",
    comingSoon: true,
  },
  {
    id: "gap-analysis",
    label: "Gap Analysis",
    description: "Compare current-state capabilities against target-state requirements to identify gaps and investment areas.",
    icon: "🎯",
    category: "assessment",
    contentHint: "Paste target-state requirements, strategic objectives, or capability wish-lists...",
    comingSoon: true,
  },
  {
    id: "risk",
    label: "Risk Assessment",
    description: "Identify operational risks by analysing control coverage, single points of failure, and governance gaps.",
    icon: "🛡️",
    category: "assessment",
    contentHint: "Paste risk registers, audit findings, incident reports, or compliance requirements...",
    comingSoon: true,
  },
];

// ─── Custom Enrichment Skill ─────────────────────────────────────────────────

interface CustomSkill {
  id: string;
  name: string;
  prompt: string;
  target: "capabilities" | "activities" | "valueStreams" | "roles" | "full-model";
  createdAt: number;
}

const TARGET_LABELS: Record<CustomSkill["target"], string> = {
  capabilities: "Capabilities",
  activities: "Activities / Stages",
  valueStreams: "Value Streams",
  roles: "Roles / Stakeholders",
  "full-model": "Full Model",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function EnrichmentView() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const cardRegistry = useCanvasStore((s) => s.cardRegistry);
  const discoveryIR = useDiscoverySessionStore((s) => s.discoveryIR);

  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedThisSession, setCompletedThisSession] = useState<Set<string>>(new Set());

  // Per-card user content (persists while on the page)
  const [userContentByCard, setUserContentByCard] = useState<Record<string, UserContent>>({});
  const updateUserContent = useCallback((cardId: string, patch: Partial<UserContent>) => {
    setUserContentByCard((prev) => ({
      ...prev,
      [cardId]: {
        text: prev[cardId]?.text ?? "",
        influence: prev[cardId]?.influence ?? "indicative",
        ...patch,
      },
    }));
  }, []);

  // Enrichment snapshots for rollback
  const [snapshots, setSnapshots] = useState<EnrichmentSnapshot[]>([]);
  const [revertConfirm, setRevertConfirm] = useState<string | null>(null);

  // Custom skills state
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [showSkillEditor, setShowSkillEditor] = useState(false);
  const [editingSkill, setEditingSkill] = useState<CustomSkill | null>(null);

  // ── Run a built-in enrichment step ──
  const runBuiltIn = useCallback(async (card: EnrichmentCardDef) => {
    if (!card.enrichmentStep || !scaffoldData) return;

    // Snapshot current state before enrichment for rollback
    const store = useCanvasStore.getState();
    const snapshot: EnrichmentSnapshot = {
      cardId: card.id,
      label: card.label,
      timestamp: Date.now(),
      scaffold: JSON.parse(JSON.stringify(scaffoldData)),
      cardRegistry: store.cardRegistry ? JSON.parse(JSON.stringify(store.cardRegistry)) : null,
    };

    setRunning(card.id);
    setError(null);

    try {
      await runEnrichmentStep(card.enrichmentStep, scaffoldData, discoveryIR ?? undefined, (progress: PipelineProgress) => {
        if (progress.status === "enrichment-done") {
          // Store the snapshot now that enrichment succeeded
          setSnapshots((prev) => [...prev, snapshot]);

          // Update canvas store with enriched scaffold
          const s = useCanvasStore.getState();
          s.loadScaffold(progress.scaffold);
          if (progress.cardRegistry) {
            s.loadCards(progress.cardRegistry);
          }
          setCompletedThisSession((prev) => new Set([...prev, card.id]));
          setRunning(null);
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`${card.label} failed: ${msg}`);
      setRunning(null);
    }
  }, [scaffoldData, discoveryIR]);

  // ── Revert an enrichment step ──
  const revertEnrichment = useCallback((cardId: string) => {
    // Find the most recent snapshot for this card
    const snapshot = [...snapshots].reverse().find((s) => s.cardId === cardId);
    if (!snapshot) return;

    const store = useCanvasStore.getState();
    store.loadScaffold(snapshot.scaffold);
    if (snapshot.cardRegistry !== null) {
      store.loadCards(snapshot.cardRegistry);
    }

    // Remove the snapshot and mark card as no longer completed this session
    setSnapshots((prev) => prev.filter((s) => s !== snapshot));
    setCompletedThisSession((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
    setRevertConfirm(null);
  }, [snapshots]);

  // ── Navigate to assessment view ──
  const navigateTo = useCallback((viewMode: string) => {
    const store = useCanvasStore.getState();
    if (viewMode === "friction") store.goToFriction();
  }, []);

  // ── Card status ──
  const getStatus = useCallback((card: EnrichmentCardDef): "done" | "running" | "available" | "coming-soon" => {
    if (card.comingSoon) return "coming-soon";
    if (running === card.id) return "running";
    if (completedThisSession.has(card.id)) return "done";
    if (card.checkDone?.(scaffoldData, cardRegistry)) return "done";
    return "available";
  }, [running, completedThisSession, scaffoldData, cardRegistry]);

  // ── Group cards by category ──
  const structureCards = ENRICHMENT_CARDS.filter((c) => c.category === "structure");
  const assessmentCards = ENRICHMENT_CARDS.filter((c) => c.category === "assessment");

  // ── Enrichment stats ──
  const stats = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const card of ENRICHMENT_CARDS) {
      if (card.comingSoon) continue;
      total++;
      if (getStatus(card) === "done") done++;
    }
    return { done, total };
  }, [getStatus]);

  if (!scaffoldData) return null;

  return (
    <div className="h-full overflow-auto" style={{ background: tv.bgPrimary, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-[900px] p-6">

        {/* Header */}
        <div className="mb-6">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: tv.textDim }}>
            Model Enrichment
          </div>
          <div className="mb-1 text-lg font-bold" style={{ color: tv.textPrimary }}>
            {scaffoldData.name}
          </div>
          <div className="text-[11px]" style={{ color: tv.textSecondary }}>
            Iteratively add depth, assessment, and analysis layers to your operating model. Each enrichment can be run independently and re-run at any time.
          </div>
          {stats.done > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full" style={{ background: tv.borderSubtle }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.done / stats.total) * 100}%`, background: "#10b981" }}
                />
              </div>
              <span className="text-[10px] font-medium" style={{ color: tv.textDim }}>
                {stats.done}/{stats.total}
              </span>
            </div>
          )}
        </div>

        {/* Running step — show puzzle */}
        {running && (
          <div className="mb-4 rounded-lg p-4" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
            <WaitPuzzle step={running} />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg border px-4 py-3" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)" }}>
            <p className="text-[12px]" style={{ color: "#d97706" }}>{error}</p>
            <button onClick={() => setError(null)} className="mt-1 text-[11px] underline" style={{ color: "#b45309" }}>Dismiss</button>
          </div>
        )}

        {/* ── Section 1: Structure & Depth ── */}
        <SectionHeader
          title="Structure & Depth"
          subtitle="Add internal detail to your model's stages, capabilities, and business concepts."
        />
        <div className="grid gap-3 mb-8">
          {structureCards.map((card) => (
            <EnrichmentCard
              key={card.id}
              card={card}
              status={getStatus(card)}
              onRun={() => runBuiltIn(card)}
              onNavigate={() => card.navigateTo && navigateTo(card.navigateTo)}
              disabled={!!running}
              userContent={userContentByCard[card.id]}
              onUserContentChange={(patch) => updateUserContent(card.id, patch)}
              canRevert={snapshots.some((s) => s.cardId === card.id)}
              revertConfirmActive={revertConfirm === card.id}
              onRevertRequest={() => setRevertConfirm(card.id)}
              onRevertConfirm={() => revertEnrichment(card.id)}
              onRevertCancel={() => setRevertConfirm(null)}
            />
          ))}
        </div>

        {/* ── Section 2: Assessment & Analysis ── */}
        <SectionHeader
          title="Assessment & Analysis"
          subtitle="Evaluate, score, and diagnose your operating model against best practices."
        />
        <div className="grid gap-3 mb-8">
          {assessmentCards.map((card) => (
            <EnrichmentCard
              key={card.id}
              card={card}
              status={getStatus(card)}
              onRun={() => runBuiltIn(card)}
              onNavigate={() => card.navigateTo && navigateTo(card.navigateTo)}
              disabled={!!running}
              userContent={userContentByCard[card.id]}
              onUserContentChange={(patch) => updateUserContent(card.id, patch)}
              canRevert={snapshots.some((s) => s.cardId === card.id)}
              revertConfirmActive={revertConfirm === card.id}
              onRevertRequest={() => setRevertConfirm(card.id)}
              onRevertConfirm={() => revertEnrichment(card.id)}
              onRevertCancel={() => setRevertConfirm(null)}
            />
          ))}
        </div>

        {/* ── Section 3: Custom Enrichments ── */}
        <SectionHeader
          title="Custom Enrichments"
          subtitle="Create your own enrichment skills with editable prompts to apply domain-specific analysis to your model."
        />
        <div className="grid gap-3 mb-4">
          {customSkills.map((skill) => (
            <CustomSkillCard
              key={skill.id}
              skill={skill}
              onEdit={() => { setEditingSkill(skill); setShowSkillEditor(true); }}
              onDelete={() => setCustomSkills((prev) => prev.filter((s) => s.id !== skill.id))}
              disabled={!!running}
            />
          ))}
        </div>
        <button
          onClick={() => { setEditingSkill(null); setShowSkillEditor(true); }}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium transition-colors"
          style={{
            background: tv.bgCard,
            border: `1.5px dashed ${tv.borderSubtle}`,
            color: tv.textSecondary,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16 }}>+</span>
          Create Custom Enrichment
        </button>

        {/* ── Skill Editor Modal ── */}
        {showSkillEditor && (
          <SkillEditorModal
            skill={editingSkill}
            onSave={(skill) => {
              setCustomSkills((prev) => {
                const existing = prev.findIndex((s) => s.id === skill.id);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = skill;
                  return updated;
                }
                return [...prev, skill];
              });
              setShowSkillEditor(false);
              setEditingSkill(null);
            }}
            onClose={() => { setShowSkillEditor(false); setEditingSkill(null); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: tv.accent }}>
        {title}
      </h3>
      <p className="mt-0.5 text-[11px]" style={{ color: tv.textDim }}>{subtitle}</p>
    </div>
  );
}

function EnrichmentCard({
  card,
  status,
  onRun,
  onNavigate,
  disabled,
  userContent,
  onUserContentChange,
  canRevert,
  revertConfirmActive,
  onRevertRequest,
  onRevertConfirm,
  onRevertCancel,
}: {
  card: EnrichmentCardDef;
  status: "done" | "running" | "available" | "coming-soon";
  onRun: () => void;
  onNavigate: () => void;
  disabled: boolean;
  userContent?: UserContent;
  onUserContentChange: (patch: Partial<UserContent>) => void;
  canRevert?: boolean;
  revertConfirmActive?: boolean;
  onRevertRequest?: () => void;
  onRevertConfirm?: () => void;
  onRevertCancel?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDone = status === "done";
  const isComingSoon = status === "coming-soon";
  const hasContent = (userContent?.text ?? "").trim().length > 0;
  const influence = userContent?.influence ?? "indicative";

  return (
    <div
      className="rounded-lg transition-all"
      style={{
        background: isDone ? "rgba(16,185,129,0.06)" : tv.bgCard,
        border: `1px solid ${isDone ? "rgba(16,185,129,0.25)" : tv.borderSubtle}`,
        opacity: isComingSoon ? 0.5 : 1,
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-shrink-0 text-lg">{card.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium" style={{ color: isDone ? "#10b981" : tv.textPrimary }}>
            {card.label}
          </p>
          <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: tv.textDim }}>
            {card.description}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Add Content toggle — only for non-coming-soon cards */}
          {!isComingSoon && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors"
              style={{
                background: hasContent ? "rgba(212,160,83,0.12)" : tv.bgSurface,
                color: hasContent ? tv.accent : tv.textDim,
                border: `1px solid ${hasContent ? "rgba(212,160,83,0.3)" : tv.borderSubtle}`,
                cursor: "pointer",
              }}
              title="Add discovery content to guide this enrichment"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {hasContent ? "Content" : "Add"}
              {hasContent && (
                <span className="ml-0.5 rounded-full px-1 text-[8px]" style={{ background: tv.accent, color: "#fff" }}>
                  {INFLUENCE_MODES.find((m) => m.value === influence)?.label}
                </span>
              )}
            </button>
          )}

          {/* Revert button — shown for done cards with a snapshot */}
          {isDone && canRevert && !revertConfirmActive && (
            <button
              onClick={onRevertRequest}
              className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
              style={{
                background: tv.bgSurface,
                color: tv.textDim,
                border: `1px solid ${tv.borderSubtle}`,
                cursor: "pointer",
              }}
              title="Revert this enrichment to restore the previous model state"
            >
              ↩ Revert
            </button>
          )}

          {/* Status / Action button */}
          {isDone ? (
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
              Done
            </span>
          ) : isComingSoon ? (
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
              style={{ background: tv.bgSurface, color: tv.textDim }}>
              Soon
            </span>
          ) : card.navigateTo ? (
            <button
              onClick={onNavigate}
              disabled={disabled}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all whitespace-nowrap"
              style={{
                background: tv.accent,
                color: "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              Open
            </button>
          ) : (
            <button
              onClick={onRun}
              disabled={disabled}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all whitespace-nowrap"
              style={{
                background: tv.textPrimary,
                color: tv.bgPrimary,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              Run
            </button>
          )}
        </div>
      </div>

      {/* Revert confirmation banner */}
      {revertConfirmActive && (
        <div className="mx-4 mb-2 rounded-lg px-3 py-2.5 flex items-center gap-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium" style={{ color: "#dc2626" }}>
              Revert "{card.label}"?
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "#b91c1c" }}>
              This will restore the model to its state before this enrichment was applied. Any data added by this step will be removed.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onRevertCancel}
              className="rounded px-2.5 py-1 text-[10px] font-medium"
              style={{ background: tv.bgCard, color: tv.textSecondary, border: `1px solid ${tv.borderSubtle}`, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={onRevertConfirm}
              className="rounded px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: "#ef4444", color: "#fff", cursor: "pointer" }}
            >
              Confirm Revert
            </button>
          </div>
        </div>
      )}

      {/* Expandable content input */}
      {expanded && (
        <div className="px-4 pb-3 pt-0">
          <div className="rounded-lg p-3" style={{ background: tv.bgPrimary, border: `1px solid ${tv.borderSubtle}` }}>
            {/* Influence mode selector */}
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[9px] font-semibold uppercase tracking-wider mr-1" style={{ color: tv.textDim }}>
                Influence:
              </span>
              {INFLUENCE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => onUserContentChange({ influence: mode.value })}
                  className="rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                  style={{
                    background: influence === mode.value ? tv.accent : tv.bgSurface,
                    color: influence === mode.value ? "#fff" : tv.textDim,
                    border: `1px solid ${influence === mode.value ? tv.accent : tv.borderSubtle}`,
                    cursor: "pointer",
                  }}
                  title={mode.description}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] mb-2" style={{ color: tv.textDim }}>
              {INFLUENCE_MODES.find((m) => m.value === influence)?.description}
            </p>

            {/* Content textarea */}
            <textarea
              value={userContent?.text ?? ""}
              onChange={(e) => onUserContentChange({ text: e.target.value })}
              rows={4}
              placeholder={card.contentHint ?? "Paste your content here..."}
              className="block w-full rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none resize-y"
              style={{
                background: tv.bgCard,
                border: `1px solid ${tv.borderSubtle}`,
                color: tv.textPrimary,
              }}
            />
            {hasContent && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px]" style={{ color: tv.textDim }}>
                  {(userContent?.text ?? "").split("\n").filter((l) => l.trim()).length} lines
                </span>
                <button
                  onClick={() => onUserContentChange({ text: "" })}
                  className="text-[10px] underline"
                  style={{ color: tv.textDim, cursor: "pointer" }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomSkillCard({
  skill,
  onEdit,
  onDelete,
}: {
  skill: CustomSkill;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-3"
      style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}
    >
      <span className="flex-shrink-0 text-lg">🧪</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium" style={{ color: tv.textPrimary }}>{skill.name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: tv.textDim }}>
          Target: {TARGET_LABELS[skill.target]} · Custom prompt
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onEdit}
          className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
          style={{ background: tv.bgSurface, color: tv.textSecondary, border: `1px solid ${tv.borderSubtle}`, cursor: "pointer" }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
          style={{ background: tv.bgSurface, color: tv.textDim, border: `1px solid ${tv.borderSubtle}`, cursor: "pointer" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Skill Editor Modal ──────────────────────────────────────────────────────

function SkillEditorModal({
  skill,
  onSave,
  onClose,
}: {
  skill: CustomSkill | null;
  onSave: (skill: CustomSkill) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(skill?.name ?? "");
  const [prompt, setPrompt] = useState(skill?.prompt ?? "");
  const [target, setTarget] = useState<CustomSkill["target"]>(skill?.target ?? "capabilities");

  const canSave = name.trim().length > 0 && prompt.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: skill?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      prompt: prompt.trim(),
      target,
      createdAt: skill?.createdAt ?? Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-lg rounded-xl p-6 shadow-2xl"
        style={{ background: tv.bgSurface, border: `1px solid ${tv.borderSubtle}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold" style={{ color: tv.textPrimary }}>
            {skill ? "Edit Enrichment Skill" : "Create Enrichment Skill"}
          </h3>
          <button onClick={onClose} className="rounded p-1 transition-colors" style={{ color: tv.textDim, cursor: "pointer" }}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Name */}
        <label className="block mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Regulatory Compliance Check"
            className="mt-1 block w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}`, color: tv.textPrimary }}
          />
        </label>

        {/* Target */}
        <label className="block mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>Apply to</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as CustomSkill["target"])}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}`, color: tv.textPrimary }}
          >
            {Object.entries(TARGET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        {/* Prompt */}
        <label className="block mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>Prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder={"Analyze each {{target}} and assess...\n\nFor each item, provide:\n- Score (1-5)\n- Key findings\n- Recommendations"}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none resize-y"
            style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}`, color: tv.textPrimary }}
          />
          <p className="mt-1 text-[10px]" style={{ color: tv.textDim }}>
            Use {"{{target}}"} as a placeholder for the selected element type. The prompt will be applied to your model data.
          </p>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[12px] font-medium transition-colors"
            style={{ background: tv.bgCard, color: tv.textSecondary, border: `1px solid ${tv.borderSubtle}`, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors"
            style={{
              background: canSave ? tv.accent : tv.borderSubtle,
              color: canSave ? "#fff" : tv.textDim,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {skill ? "Save Changes" : "Create Skill"}
          </button>
        </div>
      </div>
    </div>
  );
}
