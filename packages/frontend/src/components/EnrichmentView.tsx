/**
 * EnrichmentView — Dedicated page for iteratively enriching a loaded model.
 *
 * Accessible from SideNav at any time after a scaffold is loaded.
 * Contains five sections:
 *   1. Built-in enrichment passes (Deepen Structure, Map PPIT, Generate Cards)
 *   2. Cross-Mapping (build relationships between model elements)
 *   3. Friction & Bottleneck Analysis (elevated from Assessment — full FrictionView embedded)
 *   4. Assessment & analysis actions (Metrics, Dependencies, Maturity, etc.)
 *   5. Custom enrichment skills (user-editable prompts applied to the model)
 */

import { useState, useCallback, useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useDiscoverySessionStore } from "../store/discovery-session-store.ts";
import { tv } from "../theme.ts";
import { runEnrichmentStep } from "../domain/pipeline/pipeline-orchestrator";
import type { EnrichmentStep, PipelineProgress } from "../domain/pipeline/pipeline-orchestrator";
import WaitPuzzle from "./WaitPuzzle";
import { FrictionView } from "./FrictionView";

// ─── Types ───────────────────────────────────────────────────────────────────

/** How user-supplied content should influence the enrichment */
type InfluenceMode = "indicative" | "include" | "exclude" | "restrict-to";

const INFLUENCE_MODES: { value: InfluenceMode; label: string; description: string }[] = [
  { value: "indicative",  label: "Indicative",  description: "Use as guidance — the AI may adapt, extend, or supplement your content with its own analysis" },
  { value: "include",     label: "Include",      description: "Your content must be included in the output alongside anything the AI generates" },
  { value: "exclude",     label: "Exclude",      description: "Explicitly exclude these items — the AI will omit anything matching your content" },
  { value: "restrict-to", label: "Restrict to",  description: "Only use the items you provide — the AI will not add anything beyond your list" },
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
  category: "structure" | "friction" | "assessment" | "mapping" | "custom";
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
  /** If true, this card uses a custom UI instead of the standard Run button */
  customUI?: boolean;
}

// ─── Cross-Mapping Types ────────────────────────────────────────────────────

/** Entity types that can participate in cross-mapping.
 *
 * Stages and Activities are broken out separately despite both being subclasses
 * of Activity in the domain model, because their relationship semantics to other
 * elements (especially Capabilities) are fundamentally different:
 *
 *   - **Stages** represent sequential steps in a Value Stream flow. A Capability → Stage
 *     mapping answers "which stages in the value stream does this capability participate in?"
 *     — it is about flow position and sequencing.
 *
 *   - **Activities** are PPIT-level items that underpin/enable a Capability. A Capability →
 *     Activity mapping answers "what operational activities does this capability rely on?"
 *     — it is about enablement and decomposition.
 *
 * Conflating them into a single "Activities / Stages" entity would produce semantically
 * ambiguous mappings, so they must be mapped independently.
 */
type MappableEntity = "capabilities" | "stages" | "activities" | "valueStreams" | "roles" | "information" | "technology" | "processes";

const MAPPABLE_ENTITIES: { value: MappableEntity; label: string; description: string }[] = [
  { value: "capabilities",  label: "Capabilities",            description: "Business capabilities in your capability hierarchy (L1–L4)" },
  { value: "stages",        label: "Value Stream Stages",     description: "Sequential steps within a value stream that illustrate the flow of work from trigger to outcome" },
  { value: "activities",    label: "Activities",              description: "Operational activities that underpin and enable capabilities — part of the PPIT decomposition" },
  { value: "valueStreams",  label: "Value Streams",           description: "End-to-end flows that deliver value to a customer or stakeholder" },
  { value: "roles",         label: "Roles / Stakeholders",   description: "People, roles, or organisational units involved in the operating model" },
  { value: "information",   label: "Information Assets",      description: "Data, documents, knowledge, and information objects consumed or produced" },
  { value: "technology",    label: "Technology / Systems",    description: "Applications, platforms, tools, and infrastructure that enable operations" },
  { value: "processes",     label: "Processes",               description: "Defined procedures, workflows, and standard operating procedures" },
];

/** Semantic properties for a mapping relationship */
interface MappingSemantics {
  symmetrical: boolean;    // A→B implies B→A
  functional: boolean;     // Each source maps to at most one target
  transitive: boolean;     // A→B and B→C implies A→C
  cardinality: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
}

const CARDINALITY_OPTIONS: { value: MappingSemantics["cardinality"]; label: string; description: string }[] = [
  { value: "one-to-one",   label: "1:1",  description: "Each source maps to exactly one target, and vice versa" },
  { value: "one-to-many",  label: "1:N",  description: "Each source can map to multiple targets" },
  { value: "many-to-one",  label: "N:1",  description: "Multiple sources can map to a single target" },
  { value: "many-to-many", label: "N:N",  description: "Sources and targets can have multiple relationships" },
];

/** A requested cross-mapping pair */
interface MappingPair {
  id: string;
  from: MappableEntity;
  to: MappableEntity;
  includeInverse: boolean;
  semantics: MappingSemantics;
}

// ─── Built-in Enrichment Definitions ─────────────────────────────────────────

const ENRICHMENT_CARDS: EnrichmentCardDef[] = [
  // ── Structure & Depth ──
  {
    id: "subactivities",
    label: "Deepen Structure",
    description:
      "Each stage in your value streams currently shows a high-level step (e.g. \"Review Application\" or \"Onboard Customer\"). " +
      "This enrichment looks inside each stage and breaks it down into the detailed work steps, decision points, handoffs, and checkpoints that actually happen within it. " +
      "The result is a richer, more granular view of how work really flows through each stage — making it easier to spot inefficiencies, missing steps, or unclear responsibilities.",
    icon: "🔀",
    category: "structure",
    enrichmentStep: "subactivities",
    contentHint: "Paste process steps, standard operating procedures, workflow descriptions, or any documentation that describes how work is done within your stages...",
    checkDone: (scaffold) =>
      scaffold?.elements?.subActivityGraphs &&
      Object.keys(scaffold.elements.subActivityGraphs).length > 0 &&
      Object.values(scaffold.elements.subActivityGraphs).some((v: any) => v?.nodes?.length > 0),
  },
  {
    id: "ppit",
    label: "Map People, Process, Information & Technology",
    description:
      "For every capability in your model, this enrichment identifies the four foundational dimensions that support it: " +
      "the People (roles, teams, skills) involved, the Processes (procedures, workflows) that execute it, " +
      "the Information (data, documents, knowledge) it consumes or produces, and the Technology (systems, tools, platforms) that enables it. " +
      "This gives you a complete picture of what underpins each capability, which is essential for impact analysis, transformation planning, and investment decisions.",
    icon: "🧩",
    category: "structure",
    enrichmentStep: "ppit",
    contentHint: "Paste role names, team structures, system inventories, application lists, data dictionaries, or any documentation about who does what with which tools...",
    checkDone: (scaffold) =>
      scaffold?.elements?.activities &&
      Object.values(scaffold.elements.activities).some((a: any) => a.capabilityPPIT && Object.keys(a.capabilityPPIT).length > 0),
  },
  {
    id: "cards",
    label: "Generate Concept & Policy Cards",
    description:
      "This enrichment scans your model and generates two types of reference cards: Concept Cards capture the key business terms, " +
      "definitions, and domain concepts that your operating model relies on (e.g. \"What exactly is a 'Customer Segment'?\"), while " +
      "Policy Cards document the business rules, governance constraints, and regulatory requirements that govern how work is done. " +
      "Together they form a living glossary and rule book for your organisation that keeps everyone aligned on meaning and compliance.",
    icon: "🃏",
    category: "structure",
    enrichmentStep: "cards",
    contentHint: "Paste glossary terms, business definitions, policy documents, regulatory requirements, governance rules, or any reference material that defines how your organisation operates...",
    checkDone: (_scaffold, cardRegistry) =>
      cardRegistry &&
      ((Object.keys(cardRegistry.conceptCards ?? {}).length > 0) || (Object.keys(cardRegistry.policyCards ?? {}).length > 0)),
  },

  // ── Cross-Mapping ──
  {
    id: "cross-mapping",
    label: "Cross-Map Relationships",
    description:
      "Your model contains many different types of elements — capabilities, value stream stages, activities, roles, information assets, and technologies. " +
      "This enrichment builds explicit relationship maps between any two element types you choose. For example, you might map " +
      "Capabilities → Technology to see which systems support which capabilities, or Roles → Stages to clarify who is responsible at each step in the flow. " +
      "Note that Stages and Activities are listed separately: Stages represent the sequential steps in a value stream flow (\"where in the process\"), " +
      "while Activities are the operational tasks that underpin capabilities (\"what work enables this capability\"). " +
      "Mapping them independently preserves these distinct semantics. " +
      "By default, the inverse mapping (e.g. Technology → Capabilities) is also generated. You can also define the semantics of each mapping — " +
      "whether the relationship is symmetrical, transitive, functional, and what cardinality applies.",
    icon: "🔄",
    category: "mapping",
    contentHint: "Paste any existing mapping documentation, RACI matrices, system-capability registers, or relationship data you already have...",
    customUI: true,
    comingSoon: false,
  },

  // ── Friction & Bottleneck Analysis (elevated — own section) ──
  {
    id: "friction",
    label: "Assess Friction & Bottlenecks",
    description:
      "This assessment analyses every stage and handoff across your value streams to identify where friction occurs — " +
      "places where work slows down, errors accumulate, customers experience delays, or teams struggle with manual workarounds. " +
      "It identifies binding constraints (the single biggest blocker in each stream), structural bottlenecks (capacity mismatches), " +
      "and pain points that affect the customer or employee experience. The results appear as a heatmap overlay on your value stream canvas.",
    icon: "⚡",
    category: "friction",
    contentHint: "Paste known pain points, customer complaints, NPS feedback, operational incident reports, or anything that describes where things go wrong or slow down...",
    checkDone: () => {
      const store = useCanvasStore.getState();
      return store.heatmapsByVs.size > 0;
    },
  },

  // ── Assessment & Analysis ──
  {
    id: "metrics",
    label: "Generate Performance Metrics",
    description:
      "Derives a set of meaningful KPIs and performance metrics for each stage and capability in your model. " +
      "These are aligned to business outcomes — not just technical measures — so you get metrics like cycle time, throughput, " +
      "error rate, customer satisfaction impact, and cost per transaction. If you already have metrics or SLAs, you can paste them " +
      "using the Add Content button and the AI will incorporate and build upon them rather than starting from scratch.",
    icon: "📊",
    category: "assessment",
    contentHint: "Paste existing KPIs, SLAs, performance targets, dashboard definitions, or any metric data you already track...",
    comingSoon: true,
  },
  {
    id: "dependencies",
    label: "Map Cross-Stream Dependencies",
    description:
      "Identifies where your value streams share capabilities, hand off work to each other, or depend on the same " +
      "underlying systems and teams. These cross-stream dependencies are often invisible but critical — a change in one stream " +
      "can ripple through others unexpectedly. This enrichment makes those connections explicit so you can plan changes with full " +
      "awareness of downstream impact and avoid breaking shared services or overloading shared teams.",
    icon: "🔗",
    category: "assessment",
    contentHint: "Paste integration maps, system dependency documentation, shared service catalogues, API contract details, or notes about cross-team coordination...",
    comingSoon: true,
  },
  {
    id: "maturity",
    label: "Capability Maturity Assessment",
    description:
      "Evaluates each capability in your model against a maturity scale, from ad-hoc and reactive (Level 1) through to " +
      "optimised and continuously improving (Level 5). The assessment considers factors like process standardisation, automation, " +
      "measurement, governance, and adaptability. This gives you a clear, comparable view of where your organisation is strong " +
      "and where investment in capability uplift would deliver the most value.",
    icon: "📈",
    category: "assessment",
    contentHint: "Paste maturity framework criteria you use (e.g. CMMI, COBIT), current-state self-assessments, audit reports, or benchmark data from industry peers...",
    comingSoon: true,
  },
  {
    id: "gap-analysis",
    label: "Current vs. Target Gap Analysis",
    description:
      "Compares your model's current-state capabilities, processes, and technology against a defined target state to identify " +
      "where the gaps are. This is essential for transformation planning — it tells you exactly what needs to change, where new " +
      "capabilities are needed, which existing capabilities need strengthening, and where you can decommission legacy elements. " +
      "The output is a prioritised gap register that can feed directly into a roadmap or business case.",
    icon: "🎯",
    category: "assessment",
    contentHint: "Paste target-state requirements, strategic objectives, future-state architecture documents, capability wish-lists, or transformation goals...",
    comingSoon: true,
  },
  {
    id: "risk",
    label: "Operational Risk Assessment",
    description:
      "Analyses your operating model to identify operational risks — single points of failure, inadequate controls, " +
      "governance gaps, key-person dependencies, and areas where a disruption would have outsized impact. Each risk is rated " +
      "by likelihood and severity, linked to the specific capabilities and stages it affects, and accompanied by mitigation " +
      "recommendations. This is particularly valuable for regulatory compliance, business continuity planning, and audit preparation.",
    icon: "🛡️",
    category: "assessment",
    contentHint: "Paste risk registers, audit findings, incident reports, compliance requirements, BCP documentation, or any existing risk assessment data...",
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

  // Cross-mapping state
  const [mappingPairs, setMappingPairs] = useState<MappingPair[]>([]);

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

  // ── Cross-mapping helpers ──
  const addMappingPair = useCallback(() => {
    setMappingPairs((prev) => [
      ...prev,
      {
        id: `mp-${Date.now()}`,
        from: "capabilities",
        to: "stages",
        includeInverse: true,
        semantics: { symmetrical: false, functional: false, transitive: false, cardinality: "many-to-many" },
      },
    ]);
  }, []);

  const updateMappingPair = useCallback((id: string, patch: Partial<MappingPair>) => {
    setMappingPairs((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const updateMappingSemantics = useCallback((id: string, semPatch: Partial<MappingSemantics>) => {
    setMappingPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, semantics: { ...p.semantics, ...semPatch } } : p)),
    );
  }, []);

  const removeMappingPair = useCallback((id: string) => {
    setMappingPairs((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Friction view expanded state
  const [frictionExpanded, setFrictionExpanded] = useState(false);

  // ── Group cards by category ──
  const structureCards = ENRICHMENT_CARDS.filter((c) => c.category === "structure");
  const mappingCards = ENRICHMENT_CARDS.filter((c) => c.category === "mapping");
  const frictionCards = ENRICHMENT_CARDS.filter((c) => c.category === "friction");
  const assessmentCards = ENRICHMENT_CARDS.filter((c) => c.category === "assessment");

  // ── Enrichment stats ──
  const stats = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const card of ENRICHMENT_CARDS) {
      if (card.comingSoon || card.customUI) continue;
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
          <div className="text-[12px] leading-relaxed" style={{ color: tv.textSecondary }}>
            This page lets you iteratively add depth, detail, and analysis to your operating model.
            Each enrichment below can be run independently, re-run at any time, and reverted if the results aren't what you expected.
          </div>
        </div>

        {/* How it works explainer */}
        <div className="mb-6 rounded-lg p-4" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
          <p className="text-[11px] font-semibold mb-2" style={{ color: tv.textPrimary }}>How enrichment works</p>
          <div className="grid gap-2 text-[11px] leading-relaxed" style={{ color: tv.textDim }}>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold" style={{ color: tv.accent }}>Run</span>
              <span>Click <b>Run</b> on any enrichment to apply it to your model. The AI will analyse your current model and add the relevant data layer.</span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold" style={{ color: tv.accent }}>+ Add</span>
              <span>
                Before running, you can optionally click <b>+ Add</b> to provide your own content that will guide the enrichment.
                For example, you might paste a list of your actual KPIs before running "Generate Metrics", or paste a team roster before mapping People.
                You also choose an <b>influence mode</b> — whether your content should be treated as guidance, must-include items, exclusions, or the only items to use.
              </span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 font-bold" style={{ color: tv.accent }}>↩ Revert</span>
              <span>
                Every enrichment automatically saves a snapshot of your model before it runs. If the results aren't what you expected,
                click <b>↩ Revert</b> to instantly roll back to the exact state your model was in before that enrichment was applied.
                You can then adjust your input content and try again.
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {stats.done > 0 && (
          <div className="mb-6 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full" style={{ background: tv.borderSubtle }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(stats.done / stats.total) * 100}%`, background: "#10b981" }}
              />
            </div>
            <span className="text-[10px] font-medium" style={{ color: tv.textDim }}>
              {stats.done}/{stats.total} enrichments applied
            </span>
          </div>
        )}

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
          subtitle={
            "These enrichments add internal detail to your model. They break down high-level elements into their constituent parts, " +
            "making your model richer and more useful for analysis, planning, and communication. " +
            "You can run them in any order, and each one builds on the data already in your model."
          }
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

        {/* ── Section 2: Cross-Mapping ── */}
        <SectionHeader
          title="Cross-Mapping"
          subtitle={
            "Build explicit relationship maps between different element types in your model. For example, map which Technologies support " +
            "which Capabilities, or which Roles are responsible for which Activities. These cross-references unlock powerful impact analysis — " +
            "when something changes, you can instantly see everything that's affected."
          }
        />
        <div className="grid gap-3 mb-4">
          {mappingCards.map((card) => (
            <div key={card.id}>
              <EnrichmentCard
                card={card}
                status={getStatus(card)}
                onRun={() => {}}
                onNavigate={() => {}}
                disabled={!!running}
                userContent={userContentByCard[card.id]}
                onUserContentChange={(patch) => updateUserContent(card.id, patch)}
                canRevert={snapshots.some((s) => s.cardId === card.id)}
                revertConfirmActive={revertConfirm === card.id}
                onRevertRequest={() => setRevertConfirm(card.id)}
                onRevertConfirm={() => revertEnrichment(card.id)}
                onRevertCancel={() => setRevertConfirm(null)}
                hideActionButton
              />
            </div>
          ))}
        </div>

        {/* Mapping pair builder */}
        <div className="mb-8 rounded-lg p-4" style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}` }}>
          <p className="text-[11px] font-semibold mb-1" style={{ color: tv.textPrimary }}>
            Configure Mappings
          </p>
          <p className="text-[10px] mb-3" style={{ color: tv.textDim }}>
            Add one or more mapping pairs below. For each pair, choose the source and target element types, and optionally configure
            the relationship semantics. The inverse mapping (target → source) is included by default.
          </p>

          {/* Existing pairs */}
          {mappingPairs.map((pair) => (
            <MappingPairRow
              key={pair.id}
              pair={pair}
              onUpdate={(patch) => updateMappingPair(pair.id, patch)}
              onUpdateSemantics={(sem) => updateMappingSemantics(pair.id, sem)}
              onRemove={() => removeMappingPair(pair.id)}
            />
          ))}

          {/* Add pair button */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={addMappingPair}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors"
              style={{ background: tv.bgSurface, border: `1.5px dashed ${tv.borderSubtle}`, color: tv.textSecondary, cursor: "pointer" }}
            >
              <span style={{ fontSize: 14 }}>+</span>
              Add Mapping Pair
            </button>
            {mappingPairs.length > 0 && (
              <button
                onClick={() => {/* TODO: run cross-mapping enrichment */}}
                disabled={!!running || mappingPairs.length === 0}
                className="rounded-lg px-4 py-2 text-[11px] font-semibold transition-all"
                style={{
                  background: tv.textPrimary,
                  color: tv.bgPrimary,
                  cursor: running ? "not-allowed" : "pointer",
                  opacity: running ? 0.5 : 1,
                }}
              >
                Run {mappingPairs.length} Mapping Set{mappingPairs.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        {/* ── Section 3: Friction & Bottleneck Analysis ── */}
        <SectionHeader
          title="Friction & Bottleneck Analysis"
          subtitle={
            "Friction analysis is a foundational assessment that identifies where work slows down, errors accumulate, and customers or employees " +
            "experience pain across your value streams. Because friction insights inform almost every other assessment and improvement decision, " +
            "it is surfaced here as its own dedicated section. You can provide known pain points as input content, then run the analysis to generate " +
            "a full heatmap of observations, binding constraints, and bottlenecks."
          }
        />
        <div className="grid gap-3 mb-3">
          {frictionCards.map((card) => (
            <EnrichmentCard
              key={card.id}
              card={card}
              status={getStatus(card)}
              onRun={() => {}}
              onNavigate={() => {}}
              disabled={!!running}
              userContent={userContentByCard[card.id]}
              onUserContentChange={(patch) => updateUserContent(card.id, patch)}
              canRevert={snapshots.some((s) => s.cardId === card.id)}
              revertConfirmActive={revertConfirm === card.id}
              onRevertRequest={() => setRevertConfirm(card.id)}
              onRevertConfirm={() => revertEnrichment(card.id)}
              onRevertCancel={() => setRevertConfirm(null)}
              hideActionButton
            />
          ))}
        </div>
        {/* Open / collapse the full friction workspace */}
        <div className="mb-8">
          <button
            onClick={() => setFrictionExpanded(!frictionExpanded)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all"
            style={{
              background: frictionExpanded ? tv.bgSurface : tv.textPrimary,
              color: frictionExpanded ? tv.textSecondary : tv.bgPrimary,
              border: frictionExpanded ? `1px solid ${tv.borderSubtle}` : "none",
              cursor: "pointer",
            }}
          >
            <span>{frictionExpanded ? "▾" : "▸"}</span>
            {frictionExpanded ? "Collapse Friction Workspace" : "Open Friction Workspace"}
          </button>
          {frictionExpanded && (
            <div
              className="mt-3 rounded-xl overflow-hidden"
              style={{ border: `1px solid ${tv.borderSubtle}`, height: "calc(100vh - 200px)" }}
            >
              <FrictionView />
            </div>
          )}
        </div>

        {/* ── Section 4: Assessment & Analysis ── */}
        <SectionHeader
          title="Assessment & Analysis"
          subtitle={
            "These enrichments evaluate your model against various lenses — performance, risk, maturity, dependencies, and gaps. " +
            "They don't add structural detail but instead overlay analytical insights that help you understand the strengths and weaknesses " +
            "of your operating model and where to focus improvement efforts."
          }
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

        {/* ── Section 5: Custom Enrichments ── */}
        <SectionHeader
          title="Custom Enrichments"
          subtitle={
            "Create your own enrichment skills with editable prompts. This is for domain-specific analysis that isn't covered by the built-in " +
            "enrichments above — for example, a regulatory compliance check specific to your industry, a vendor assessment framework your " +
            "organisation uses, or a custom scoring model. Write the prompt, choose what model elements it applies to, and run it like any other enrichment."
          }
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
      <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: tv.textDim }}>{subtitle}</p>
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
  hideActionButton,
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
  hideActionButton?: boolean;
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
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="flex-shrink-0 text-lg mt-0.5">{card.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium" style={{ color: isDone ? "#10b981" : tv.textPrimary }}>
            {card.label}
          </p>
          <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: tv.textDim }}>
            {card.description}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
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
              title="Optionally add your own content to guide this enrichment — paste documents, lists, or data and choose how it should influence the output"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {hasContent ? "Content" : "+ Add"}
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
              title="Undo this enrichment and restore your model to the state it was in before this step was applied"
            >
              ↩ Revert
            </button>
          )}

          {/* Status / Action button */}
          {!hideActionButton && (
            <>
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
            </>
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
              This will restore your model to its exact state before this enrichment was applied. All data added by this step will be removed. You can always re-run the enrichment afterwards.
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

// ─── Cross-Mapping Pair Row ─────────────────────────────────────────────────

function MappingPairRow({
  pair,
  onUpdate,
  onUpdateSemantics,
  onRemove,
}: {
  pair: MappingPair;
  onUpdate: (patch: Partial<MappingPair>) => void;
  onUpdateSemantics: (sem: Partial<MappingSemantics>) => void;
  onRemove: () => void;
}) {
  const [showSemantics, setShowSemantics] = useState(false);

  return (
    <div className="mb-3 rounded-lg p-3" style={{ background: tv.bgPrimary, border: `1px solid ${tv.borderSubtle}` }}>
      {/* From → To row */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={pair.from}
          onChange={(e) => onUpdate({ from: e.target.value as MappableEntity })}
          className="rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
          style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}`, color: tv.textPrimary }}
        >
          {MAPPABLE_ENTITIES.map((e) => (
            <option key={e.value} value={e.value} title={e.description}>{e.label}</option>
          ))}
        </select>

        <span className="text-[12px] font-bold" style={{ color: tv.accent }}>→</span>

        <select
          value={pair.to}
          onChange={(e) => onUpdate({ to: e.target.value as MappableEntity })}
          className="rounded-lg px-2.5 py-1.5 text-[11px] outline-none"
          style={{ background: tv.bgCard, border: `1px solid ${tv.borderSubtle}`, color: tv.textPrimary }}
        >
          {MAPPABLE_ENTITIES.map((e) => (
            <option key={e.value} value={e.value} title={e.description}>{e.label}</option>
          ))}
        </select>

        {/* Include inverse toggle */}
        <label className="flex items-center gap-1.5 ml-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pair.includeInverse}
            onChange={(e) => onUpdate({ includeInverse: e.target.checked })}
            className="rounded"
          />
          <span className="text-[10px]" style={{ color: tv.textDim }}>
            Include inverse ({MAPPABLE_ENTITIES.find((e) => e.value === pair.to)?.label} → {MAPPABLE_ENTITIES.find((e) => e.value === pair.from)?.label})
          </span>
        </label>

        {/* Semantics toggle */}
        <button
          onClick={() => setShowSemantics(!showSemantics)}
          className="ml-auto rounded px-2 py-0.5 text-[10px] font-medium"
          style={{ background: tv.bgSurface, color: tv.textDim, border: `1px solid ${tv.borderSubtle}`, cursor: "pointer" }}
        >
          {showSemantics ? "Hide" : "Semantics"}
        </button>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="rounded p-1 text-[10px]"
          style={{ color: tv.textDim, cursor: "pointer" }}
          title="Remove this mapping pair"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Entity descriptions — helps clarify the distinction between similar types */}
      <div className="mt-1.5 flex gap-4 text-[9px] leading-relaxed" style={{ color: tv.textDim }}>
        <div className="flex-1">
          <span className="font-semibold" style={{ color: tv.textSecondary }}>
            {MAPPABLE_ENTITIES.find((e) => e.value === pair.from)?.label}:
          </span>{" "}
          {MAPPABLE_ENTITIES.find((e) => e.value === pair.from)?.description}
        </div>
        <div className="flex-1">
          <span className="font-semibold" style={{ color: tv.textSecondary }}>
            {MAPPABLE_ENTITIES.find((e) => e.value === pair.to)?.label}:
          </span>{" "}
          {MAPPABLE_ENTITIES.find((e) => e.value === pair.to)?.description}
        </div>
      </div>

      {/* Semantics panel */}
      {showSemantics && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${tv.borderSubtle}` }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: tv.textSecondary }}>
            Relationship Semantics
          </p>
          <p className="text-[10px] mb-2 leading-relaxed" style={{ color: tv.textDim }}>
            Define the mathematical properties of this relationship. These semantics affect how the mapping is interpreted
            during analysis — for example, a transitive mapping means that indirect relationships are automatically inferred.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Cardinality */}
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>Cardinality</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {CARDINALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onUpdateSemantics({ cardinality: opt.value })}
                    className="rounded px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: pair.semantics.cardinality === opt.value ? tv.accent : tv.bgSurface,
                      color: pair.semantics.cardinality === opt.value ? "#fff" : tv.textDim,
                      border: `1px solid ${pair.semantics.cardinality === opt.value ? tv.accent : tv.borderSubtle}`,
                      cursor: "pointer",
                    }}
                    title={opt.description}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] mt-1" style={{ color: tv.textDim }}>
                {CARDINALITY_OPTIONS.find((o) => o.value === pair.semantics.cardinality)?.description}
              </p>
            </div>

            {/* Boolean properties */}
            <div className="grid gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pair.semantics.symmetrical}
                  onChange={(e) => onUpdateSemantics({ symmetrical: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="text-[10px] font-medium" style={{ color: tv.textPrimary }}>Symmetrical</span>
                  <p className="text-[9px]" style={{ color: tv.textDim }}>If A relates to B, then B relates to A in the same way. Example: <em>marriedTo</em> — if Alice is married to Bob, then Bob is married to Alice.</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pair.semantics.functional}
                  onChange={(e) => onUpdateSemantics({ functional: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="text-[10px] font-medium" style={{ color: tv.textPrimary }}>Functional</span>
                  <p className="text-[9px]" style={{ color: tv.textDim }}>Each source element maps to at most one target. Example: <em>motherOf</em> — every person has exactly one biological mother, so the mapping is a function.</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pair.semantics.transitive}
                  onChange={(e) => onUpdateSemantics({ transitive: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <span className="text-[10px] font-medium" style={{ color: tv.textPrimary }}>Transitive</span>
                  <p className="text-[9px]" style={{ color: tv.textDim }}>If A→B and B→C, then A→C is implied automatically. Example: <em>memberOf</em> — if Alice is a member of Team X, and Team X is a member of Division Y, then Alice is a member of Division Y.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom Skill Card ──────────────────────────────────────────────────────

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
