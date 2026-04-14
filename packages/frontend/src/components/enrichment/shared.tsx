/**
 * shared.tsx — Shared components, constants, and hooks for enrichment sub-views.
 *
 * Extracts shared sub-components from EnrichmentView.tsx:
 *   - Constants and type definitions
 *   - Presentational components (SectionHeader, EnrichmentCard, MappingPairRow, etc.)
 *   - useEnrichmentActions hook for orchestrating enrichment runs
 */

import { useState, useCallback } from "react";
import { useCanvasStore } from "../../store/canvas-store.ts";
import { useDiscoverySessionStore } from "../../store/discovery-session-store.ts";
import { useEnrichmentStore } from "../../store/enrichment-store.ts";
import type { EnrichmentSnapshot, ReviewResult, UserContent, InfluenceMode, MappingPair, MappingSemantics, MappableEntity, CustomSkill } from "../../store/enrichment-store.ts";
import { INFLUENCE_MODES } from "../../store/enrichment-store.ts";
import { tv } from "../../theme.ts";
import { runEnrichmentStep } from "../../domain/pipeline/pipeline-orchestrator";
import type { EnrichmentStep, PipelineProgress } from "../../domain/pipeline/pipeline-orchestrator";
import { pushToast } from "../Toast.tsx";
// WaitPuzzle is imported by individual sub-views, not here

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnrichmentCardDef {
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
  /** IDs of enrichment cards that must be completed before this one can run */
  requires?: string[];
}

// ─── Cross-Mapping Types ────────────────────────────────────────────────────

export type { MappableEntity, MappingSemantics, MappingPair, CustomSkill, InfluenceMode, UserContent, EnrichmentSnapshot, ReviewResult };

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAPPABLE_ENTITIES: { value: MappableEntity; label: string; description: string }[] = [
  { value: "capabilities",  label: "Capabilities",            description: "Business capabilities in your capability hierarchy (L1–L4). PPIT decomposes these." },
  { value: "stages",        label: "Value Stream Stages",     description: "Sequential stages within a value stream — the flow from trigger to outcome. Distinct from Activities." },
  { value: "activities",    label: "Activities (Process Steps)", description: "Steps in a Process that operationalise a Capability. Distinct from VS Stages." },
  { value: "valueStreams",  label: "Value Streams",           description: "End-to-end flows that deliver value to a customer or stakeholder" },
  { value: "roles",         label: "Roles / Stakeholders",   description: "People, roles, or organisational units involved in the operating model" },
  { value: "information",   label: "Information Assets",      description: "Data, documents, knowledge, and information objects consumed or produced" },
  { value: "technology",    label: "Technology / Systems",    description: "Applications, platforms, tools, and infrastructure that enable operations" },
  { value: "processes",     label: "Processes",               description: "Defined procedures, workflows, and standard operating procedures" },
];

export const CARDINALITY_OPTIONS: { value: MappingSemantics["cardinality"]; label: string; description: string }[] = [
  { value: "one-to-one",   label: "1:1",  description: "Each source maps to exactly one target, and vice versa" },
  { value: "one-to-many",  label: "1:N",  description: "Each source can map to multiple targets" },
  { value: "many-to-one",  label: "N:1",  description: "Multiple sources can map to a single target" },
  { value: "many-to-many", label: "N:N",  description: "Sources and targets can have multiple relationships" },
];

export const TARGET_LABELS: Record<CustomSkill["target"], string> = {
  capabilities: "Capabilities",
  activities: "Activities",
  valueStreams: "Value Streams",
  roles: "Roles / Stakeholders",
  "full-model": "Full Model",
};

/**
 * Maps each enrichment card ID to the view where the user can see
 * the impact of the enrichment they just ran.
 */
export const IMPACT_DESTINATIONS: Record<string, {
  label: string;
  description: string;
  navigate: (store: any) => void;
}> = {
  subactivities: {
    label: "View in Value Stream Canvas",
    description: "See the sub-activity DAGs inside each stage",
    navigate: (store) => {
      // Navigate to stage view (first VS)
      const vsIds = Object.keys(store.scaffoldData?.elements?.valueStreams ?? {});
      if (vsIds.length) {
        store.selectValueStream(vsIds[0]);
      }
    },
  },
  ppit: {
    label: "View in Capability Map",
    description: "See People, Process, Information & Technology mapped to capabilities",
    navigate: (store) => store.goToCapabilityMap(),
  },
  cards: {
    label: "View in Concept Explorer",
    description: "Browse the Concept and Policy cards that were generated",
    navigate: (store) => store.goToConceptGraph(),
  },
  "cross-mapping": {
    label: "View in Network",
    description: "See relationship topology across your model",
    navigate: (store) => {
      const vsIds = Object.keys(store.scaffoldData?.elements?.valueStreams ?? {});
      if (vsIds.length) store.selectValueStream(vsIds[0]);
    },
  },
  friction: {
    label: "View Friction Heatmap",
    description: "See the friction observations overlaid on your value streams",
    navigate: (store) => store.goToFriction(),
  },
  metrics: {
    label: "View in Value Stream Canvas",
    description: "See performance metrics attached to stages",
    navigate: (store) => {
      const vsIds = Object.keys(store.scaffoldData?.elements?.valueStreams ?? {});
      if (vsIds.length) store.selectValueStream(vsIds[0]);
    },
  },
  dependencies: {
    label: "View in Network",
    description: "See cross-stream dependency connections",
    navigate: (store) => {
      const vsIds = Object.keys(store.scaffoldData?.elements?.valueStreams ?? {});
      if (vsIds.length) store.selectValueStream(vsIds[0]);
    },
  },
  maturity: {
    label: "View in Capability Map",
    description: "See maturity levels across your capability hierarchy",
    navigate: (store) => store.goToCapabilityMap(),
  },
  "gap-analysis": {
    label: "View in Capability Map",
    description: "See current-vs-target gap indicators on capabilities",
    navigate: (store) => store.goToCapabilityMap(),
  },
  risk: {
    label: "View Friction Heatmap",
    description: "See risk observations overlaid on your value streams",
    navigate: (store) => store.goToFriction(),
  },
};

// ─── Built-in Enrichment Definitions ─────────────────────────────────────────

export const ENRICHMENT_CARDS: EnrichmentCardDef[] = [
  // ── Structure & Depth (PPIT first — it's a prerequisite for Activity Flows) ──
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
    id: "subactivities",
    label: "Derive Activity Flows",
    description:
      "Using the activities identified during PPIT Mapping, this enrichment generates a detailed activity flow for each stage — " +
      "showing the sequence of work steps, decision gates, handoffs, and checkpoints that actually happen within it. " +
      "The result is a richer, more granular view of how work really flows through each stage — making it easier to spot inefficiencies, missing steps, or unclear responsibilities.",
    icon: "🔀",
    category: "structure",
    enrichmentStep: "subactivities",
    requires: ["ppit"],
    contentHint: "Paste process steps, standard operating procedures, workflow descriptions, or any documentation that describes how work is done within your stages...",
    checkDone: (scaffold) =>
      scaffold?.elements?.subActivityGraphs &&
      Object.keys(scaffold.elements.subActivityGraphs).length > 0 &&
      Object.values(scaffold.elements.subActivityGraphs).some((v: any) => v?.nodes?.length > 0),
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

// ─── Change Summary Helpers ──────────────────────────────────────────────────

/** Compute a plain-language summary of what changed between before-snapshot and after-state */
export function computeChangeSummary(cardId: string, beforeScaffold: any, afterScaffold: any, beforeCards: any, afterCards: any): string[] {
  const lines: string[] = [];
  const be = beforeScaffold?.elements ?? {};
  const ae = afterScaffold?.elements ?? {};

  const countKeys = (obj: any) => (obj ? Object.keys(obj).length : 0);
  const diff = (before: any, after: any) => countKeys(after) - countKeys(before);

  if (cardId === "subactivities") {
    const beforeGraphs = countKeys(be.subActivityGraphs);
    const afterGraphs = countKeys(ae.subActivityGraphs);
    const newGraphs = afterGraphs - beforeGraphs;
    const totalNodes = Object.values(ae.subActivityGraphs ?? {}).reduce(
      (sum: number, g: any) => sum + (g?.nodes?.length ?? 0), 0
    );
    if (newGraphs > 0) lines.push(`Created ${newGraphs} sub-activity graph${newGraphs !== 1 ? "s" : ""} with ${totalNodes} total work steps`);
    else if (totalNodes > 0) lines.push(`Updated sub-activity graphs — now ${afterGraphs} graphs with ${totalNodes} total work steps`);
  }

  if (cardId === "ppit") {
    const rolesDiff = diff(be.roles, ae.roles);
    const capDiff = diff(be.capabilities, ae.capabilities);
    const infoDiff = diff(be.informationObjects, ae.informationObjects);
    const appDiff = diff(be.applicationFunctions, ae.applicationFunctions);
    const parts: string[] = [];
    if (rolesDiff > 0) parts.push(`${rolesDiff} role${rolesDiff !== 1 ? "s" : ""}`);
    if (capDiff > 0) parts.push(`${capDiff} capabilit${capDiff !== 1 ? "ies" : "y"}`);
    if (infoDiff > 0) parts.push(`${infoDiff} information object${infoDiff !== 1 ? "s" : ""}`);
    if (appDiff > 0) parts.push(`${appDiff} application function${appDiff !== 1 ? "s" : ""}`);
    if (parts.length) lines.push(`Added ${parts.join(", ")}`);
    else lines.push("Updated PPIT mappings across capabilities");
  }

  if (cardId === "cards") {
    const conceptsBefore = countKeys(beforeCards?.conceptCards);
    const conceptsAfter = countKeys(afterCards?.conceptCards);
    const policiesBefore = countKeys(beforeCards?.policyCards);
    const policiesAfter = countKeys(afterCards?.policyCards);
    const newConcepts = conceptsAfter - conceptsBefore;
    const newPolicies = policiesAfter - policiesBefore;
    if (newConcepts > 0) lines.push(`Generated ${newConcepts} Concept Card${newConcepts !== 1 ? "s" : ""}`);
    if (newPolicies > 0) lines.push(`Generated ${newPolicies} Policy Card${newPolicies !== 1 ? "s" : ""}`);
    if (!lines.length) lines.push("Updated concept and policy cards");
  }

  // Generic element-level diffs for any enrichment
  const elementTypes = [
    { key: "activities", label: "stage" },
    { key: "roles", label: "role" },
    { key: "capabilities", label: "capability" },
    { key: "controls", label: "control" },
    { key: "metrics", label: "metric" },
    { key: "constraints", label: "constraint" },
  ];

  if (!["subactivities", "ppit", "cards"].includes(cardId)) {
    for (const { key, label } of elementTypes) {
      const d = diff(be[key], ae[key]);
      if (d > 0) lines.push(`Added ${d} ${label}${d !== 1 ? "s" : ""}`);
    }
  }

  if (!lines.length) lines.push("Enrichment applied successfully — model updated");
  return lines;
}

// ─── useEnrichmentActions Hook ────────────────────────────────────────────────

/**
 * Hook that provides action callbacks for enrichment operations.
 * Abstracts interaction with store and pipeline orchestrator.
 */
export function useEnrichmentActions() {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const cardRegistry = useCanvasStore((s) => s.cardRegistry);
  const discoveryIR = useDiscoverySessionStore((s) => s.discoveryIR);

  // State from enrichment store (for snapshots, review, etc.)
  const running = useEnrichmentStore((s) => s.running);
  const completedThisSession = useEnrichmentStore((s) => s.completedThisSession);
  const snapshots = useEnrichmentStore((s) => s.snapshots);

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

    const enrichmentStore = useEnrichmentStore.getState();
    enrichmentStore.setRunning(card.id);
    enrichmentStore.setError(null);

    try {
      // CRITICAL: Deep-clone the scaffold before passing to enrichers.
      // Enrichers mutate in-place — without this clone, they mutate the live
      // Zustand store object, causing stale references, missed re-renders,
      // and snapshot corruption. The enriched clone is loaded as a fresh
      // object into the store when the enrichment completes.
      const enrichmentCopy = JSON.parse(JSON.stringify(scaffoldData));

      await runEnrichmentStep(card.enrichmentStep, enrichmentCopy, discoveryIR ?? undefined, (progress: PipelineProgress) => {
        if (progress.status === "enrichment-done") {
          // Store the snapshot now that enrichment succeeded
          enrichmentStore.addSnapshot(snapshot);

          // Compute change summary BEFORE updating the store (we have before+after)
          const afterCards = progress.cardRegistry ?? store.cardRegistry;
          let changeSummary: string[] | undefined = undefined;
          if (progress.scaffold) {
            changeSummary = computeChangeSummary(
              card.id,
              snapshot.scaffold,
              progress.scaffold,
              snapshot.cardRegistry,
              afterCards,
            );

            // Update canvas store with enriched scaffold
            const s = useCanvasStore.getState();
            s.loadScaffold(progress.scaffold);
            if (progress.cardRegistry) {
              s.loadCards(progress.cardRegistry);
            }

            // Mark scaffold dirty so auto-save persists enrichment results to Supabase.
            // loadScaffold doesn't set scaffoldDirty (it's designed for initial load),
            // so without this, enrichment data stays in memory but is never saved.
            useCanvasStore.setState({ scaffoldDirty: true });
          }

          // Create review result for the user to review and commit
          if (changeSummary) {
            enrichmentStore.addReviewResult({
              cardId: card.id,
              label: card.label,
              timestamp: Date.now(),
              changeSummary,
              committed: false,
            });
          }

          enrichmentStore.markCompleted(card.id);
          enrichmentStore.setRunning(null);

          // ── Toast + activity log ──
          const changeCount = changeSummary?.length ?? 0;
          pushToast(
            changeCount > 0 ? "success" : "warning",
            `${card.label} complete`,
            changeCount > 0 ? `${changeCount} changes applied` : "No changes detected",
          );
          enrichmentStore.addLogEntry({
            level: changeCount > 0 ? "success" : "warning",
            source: card.id,
            message: changeCount > 0
              ? `${card.label}: ${changeCount} changes applied`
              : `${card.label}: completed with no changes`,
            detail: { changeCount },
          });
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      enrichmentStore.setError(`${card.label} failed: ${msg}`);
      enrichmentStore.setRunning(null);
      pushToast("error", `${card.label} failed`, msg, 8000);
      enrichmentStore.addLogEntry({
        level: "error",
        source: card.id,
        message: `${card.label}: ${msg}`,
      });
    }
  }, [scaffoldData, discoveryIR]);

  // ── Revert an enrichment step ──
  const revertEnrichment = useCallback((cardId: string) => {
    const enrichmentStore = useEnrichmentStore.getState();
    // Find the most recent snapshot for this card
    const snapshot = [...snapshots].reverse().find((s) => s.cardId === cardId);
    if (!snapshot) return;

    const store = useCanvasStore.getState();
    store.loadScaffold(snapshot.scaffold);
    if (snapshot.cardRegistry !== null) {
      store.loadCards(snapshot.cardRegistry);
    }

    // Remove the snapshot, review result, and mark card as no longer completed this session
    enrichmentStore.removeSnapshot(snapshot);
    enrichmentStore.removeReviewResult(cardId);
    enrichmentStore.unmarkCompleted(cardId);
  }, [snapshots]);

  // ── Navigate to assessment view ──
  const navigateTo = useCallback((viewMode: string) => {
    const store = useCanvasStore.getState();
    if (viewMode === "friction") store.goToFriction();
  }, []);

  // ── Commit a review result (accept changes) ──
  const commitReview = useCallback((cardId: string) => {
    const enrichmentStore = useEnrichmentStore.getState();
    enrichmentStore.commitReview(cardId);
  }, []);

  // ── Navigate to impact view ──
  const viewImpact = useCallback((cardId: string) => {
    const dest = IMPACT_DESTINATIONS[cardId];
    if (!dest) return;
    const store = useCanvasStore.getState();
    dest.navigate(store);
  }, []);

  // ── Card status ──
  const getStatus = useCallback((card: EnrichmentCardDef): "done" | "running" | "available" | "coming-soon" => {
    if (card.comingSoon) return "coming-soon";
    if (running === card.id) return "running";
    if (completedThisSession.has(card.id)) return "done";
    if (card.checkDone?.(scaffoldData, cardRegistry)) return "done";
    return "available";
  }, [running, completedThisSession, scaffoldData, cardRegistry]);

  return {
    runBuiltIn,
    revertEnrichment,
    navigateTo,
    commitReview,
    viewImpact,
    getStatus,
  };
}

// ─── Presentational Components ────────────────────────────────────────────────

export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginTop: "8px", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <h3 style={{
          fontSize: "13px",
          fontWeight: "700",
          color: tv.textPrimary,
        }}>
          {title}
        </h3>
        <span style={{
          fontSize: "9px",
          fontWeight: "700",
          padding: "2px 8px",
          borderRadius: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          backgroundColor: title === "Enrichments" ? "rgba(99,102,241,0.12)" : title === "Diagnostics" ? "rgba(139,92,246,0.12)" : "transparent",
          color: title === "Enrichments" ? "var(--vcc-accent)" : title === "Diagnostics" ? "#8b5cf6" : tv.textDim,
        }}>
          {title === "Enrichments" ? "MODIFIES SCAFFOLD" : title === "Diagnostics" ? "READ-ONLY OVERLAY" : ""}
        </span>
      </div>
      <p style={{
        fontSize: "11px",
        color: tv.textDim,
        maxWidth: "600px",
      }}>{subtitle}</p>
    </div>
  );
}

export function EnrichmentCard({
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
  reviewResult,
  onCommitReview,
  onViewImpact,
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
  /** Review result shown after enrichment completes */
  reviewResult?: ReviewResult;
  /** Called when user accepts/commits the changes */
  onCommitReview?: () => void;
  /** Called when user wants to see where the enrichment output appears */
  onViewImpact?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDone = status === "done";
  const isComingSoon = status === "coming-soon";
  const hasContent = (userContent?.text ?? "").trim().length > 0;
  const influence = userContent?.influence ?? "indicative";

  return (
    <div
      style={{
        background: isDone ? "rgba(16,185,129,0.06)" : tv.bgCard,
        border: `1px solid ${isDone ? "rgba(16,185,129,0.25)" : tv.borderSubtle}`,
        borderRadius: "10px",
        opacity: isComingSoon ? 0.5 : 1,
        transition: "all 0.15s ease",
      }}
    >
      {/* Main row */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        padding: "14px 16px",
      }}>
        <span style={{
          flexShrink: 0,
          fontSize: "22px",
          marginTop: "2px",
        }}>{card.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: "13px",
            fontWeight: "600",
            color: isDone ? "#10b981" : tv.textPrimary,
            margin: 0,
          }}>
            {card.label}
          </p>
          <p style={{
            fontSize: "11px",
            lineHeight: 1.5,
            marginTop: "3px",
            color: tv.textDim,
            margin: 0,
          }}>
            {card.description}
          </p>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          marginTop: "2px",
        }}>
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

      {/* Review panel — shows after enrichment completes, before user commits */}
      {reviewResult && !reviewResult.committed && (
        <div className="mx-4 mb-2 rounded-lg p-4"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="#10b981" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] font-semibold" style={{ color: "#059669" }}>
              Review Changes
            </span>
            <span className="text-[10px]" style={{ color: tv.textDim }}>
              — what was added or changed
            </span>
          </div>

          {/* Change summary lines */}
          <div className="mb-3 space-y-1">
            {reviewResult.changeSummary.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-[10px]" style={{ color: "#10b981" }}>✓</span>
                <span className="text-[11px] leading-relaxed" style={{ color: tv.textSecondary }}>{line}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Commit button */}
            <button
              onClick={onCommitReview}
              className="rounded-lg px-4 py-2 text-[11px] font-semibold transition-all"
              style={{
                background: "#10b981",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              ✓ Commit Changes
            </button>

            {/* View Impact button — distinctive styling */}
            {IMPACT_DESTINATIONS[card.id] && (
              <button
                onClick={onViewImpact}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
                }}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {IMPACT_DESTINATIONS[card.id].label}
              </button>
            )}

            {/* Revert option in context */}
            {canRevert && (
              <button
                onClick={onRevertRequest}
                className="rounded-lg px-3 py-2 text-[11px] font-medium transition-colors"
                style={{
                  background: "transparent",
                  color: tv.textDim,
                  border: `1px solid ${tv.borderSubtle}`,
                  cursor: "pointer",
                }}
              >
                ↩ Undo Instead
              </button>
            )}
          </div>

          {/* Impact destination hint */}
          {IMPACT_DESTINATIONS[card.id] && (
            <p className="mt-2 text-[10px]" style={{ color: tv.textDim }}>
              {IMPACT_DESTINATIONS[card.id].description}
            </p>
          )}
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

export function MappingPairRow({
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
            {/* Cardinality — disabled when transitive (transitive relations cannot be cardinality-constrained) */}
            <div style={{ opacity: pair.semantics.transitive ? 0.4 : 1 }}>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: tv.textDim }}>Cardinality</span>
              {pair.semantics.transitive && (
                <p className="text-[9px] mt-0.5 mb-1" style={{ color: "#d97706" }}>
                  Disabled — transitive relations do not support fixed cardinality constraints because the inferred closure can produce any number of relationships.
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {CARDINALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => !pair.semantics.transitive && onUpdateSemantics({ cardinality: opt.value })}
                    disabled={pair.semantics.transitive}
                    className="rounded px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: pair.semantics.cardinality === opt.value && !pair.semantics.transitive ? tv.accent : tv.bgSurface,
                      color: pair.semantics.cardinality === opt.value && !pair.semantics.transitive ? "#fff" : tv.textDim,
                      border: `1px solid ${pair.semantics.cardinality === opt.value && !pair.semantics.transitive ? tv.accent : tv.borderSubtle}`,
                      cursor: pair.semantics.transitive ? "not-allowed" : "pointer",
                    }}
                    title={pair.semantics.transitive ? "Cardinality not applicable for transitive relations" : opt.description}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {!pair.semantics.transitive && (
                <p className="text-[9px] mt-1" style={{ color: tv.textDim }}>
                  {CARDINALITY_OPTIONS.find((o) => o.value === pair.semantics.cardinality)?.description}
                </p>
              )}
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

export function CustomSkillCard({
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

export function SkillEditorModal({
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
