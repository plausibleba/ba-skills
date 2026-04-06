/**
 * d118-store.ts — D-118 Phase 1: Enrichment & Diagnostic State
 *
 * Zustand store that bridges the D-118 domain modules into the React layer.
 * Manages:
 *   - Diagnostic artefact collection (with staleness detection)
 *   - External input artefacts (provided + generated, with provenance)
 *   - Deterministic scaffold hash (replaces Date.now()-based hash)
 *   - Computed readiness state (never stored, derived on read)
 *   - NBA recommendation (computed on demand)
 *   - Model checkpoint integration
 *
 * This store is ADDITIVE — it does NOT replace canvas-store or enrichment-store.
 * It introduces the new D-118 domain concepts alongside the existing stores,
 * allowing incremental migration of the EnrichmentView.
 *
 * @see docs/DECISIONS.md D-118, D-118a
 */

import { create } from "zustand";
import type {
  DiagnosticArtefact,
  DiagnosticArtefactStore,
  ExternalInputArtefact,
  ExternalInputStore,
  ExternalInputType,
  ReadinessState,
  StalenessDelta,
} from "../domain/enrichment-taxonomy";
import {
  countScaffoldElements,
} from "../domain/enrichment-taxonomy";
import { computeScaffoldHash } from "../domain/scaffold-hash";
import { computeReadiness, nextReadinessHint } from "../domain/readiness-engine";
import { computeNBA } from "../domain/nba-engine";
import type { NBARecommendation } from "../domain/nba-engine";
import {
  createCheckpoint,
  listCheckpoints,
  restoreCheckpoint,
  togglePin,
  labelCheckpoint,
} from "../domain/model-checkpoints";
import type { CheckpointSummary } from "../domain/model-checkpoints";
import { useCanvasStore } from "./canvas-store";

// ─── Types ──────────────────────────────────────────────────────────────────

interface D118State {
  // ── Diagnostic Artefacts ──
  diagnosticArtefacts: DiagnosticArtefactStore;

  // ── External Inputs ──
  externalInputs: ExternalInputStore;

  // ── Scaffold Hash ──
  currentScaffoldHash: string | null;
  currentElementCounts: Record<string, number>;

  // ── Checkpoints ──
  checkpoints: CheckpointSummary[];
  checkpointsLoading: boolean;

  // ── Actions: Scaffold Hash ──
  refreshScaffoldHash: () => void;

  // ── Actions: Diagnostic Artefacts ──
  storeDiagnostic: (artefact: DiagnosticArtefact) => void;
  removeDiagnostic: (diagnosticId: string) => void;
  refreshStaleness: () => void;

  // ── Actions: External Inputs ──
  upsertExternalInput: (artefact: ExternalInputArtefact) => void;
  removeExternalInput: (id: string) => void;

  // ── Actions: Checkpoints ──
  checkpoint: (beforeOperation: string) => Promise<string | null>;
  restore: (checkpointId: string) => Promise<boolean>;
  refreshCheckpoints: () => Promise<void>;
  pinCheckpoint: (id: string) => Promise<void>;
  setCheckpointLabel: (id: string, label: string) => Promise<void>;

  // ── Derived (computed on call, not stored) ──
  getReadiness: () => ReadinessState | null;
  getNBA: (completedIds: Set<string>) => NBARecommendation;
  getStalenessDelta: (diagnosticId: string) => StalenessDelta | null;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useD118Store = create<D118State>((set, get) => ({
  // ── Initial State ──
  diagnosticArtefacts: {},
  externalInputs: {},
  currentScaffoldHash: null,
  currentElementCounts: {},
  checkpoints: [],
  checkpointsLoading: false,

  // ── Scaffold Hash ──
  refreshScaffoldHash: () => {
    const scaffold = useCanvasStore.getState().scaffoldData;
    if (!scaffold) {
      set({ currentScaffoldHash: null, currentElementCounts: {} });
      return;
    }
    const hash = computeScaffoldHash(scaffold);
    const counts = countScaffoldElements(scaffold);

    // Batch hash update + staleness refresh into a single set() to avoid
    // triggering subscriber re-renders between the two updates (React #185).
    const diagnosticArtefacts = get().diagnosticArtefacts;
    const updatedDiagnostics: DiagnosticArtefactStore = {};
    for (const [id, artefact] of Object.entries(diagnosticArtefacts)) {
      const isStale = artefact.scaffoldHash !== hash;
      updatedDiagnostics[id] = { ...artefact, stale: isStale };
    }
    set({
      currentScaffoldHash: hash,
      currentElementCounts: counts,
      diagnosticArtefacts: Object.keys(updatedDiagnostics).length > 0
        ? updatedDiagnostics
        : diagnosticArtefacts,
    });
  },

  // ── Diagnostic Artefacts ──
  storeDiagnostic: (artefact) => {
    set((s) => ({
      diagnosticArtefacts: {
        ...s.diagnosticArtefacts,
        [artefact.diagnosticId]: artefact,
      },
    }));
  },

  removeDiagnostic: (diagnosticId) => {
    set((s) => {
      const next = { ...s.diagnosticArtefacts };
      delete next[diagnosticId];
      return { diagnosticArtefacts: next };
    });
  },

  refreshStaleness: () => {
    const { currentScaffoldHash, diagnosticArtefacts } = get();
    if (!currentScaffoldHash) return;

    const updated: DiagnosticArtefactStore = {};
    for (const [id, artefact] of Object.entries(diagnosticArtefacts)) {
      const isStale = artefact.scaffoldHash !== currentScaffoldHash;
      updated[id] = { ...artefact, stale: isStale };
    }
    set({ diagnosticArtefacts: updated });
  },

  // ── External Inputs ──
  upsertExternalInput: (artefact) => {
    set((s) => ({
      externalInputs: { ...s.externalInputs, [artefact.id]: artefact },
    }));
  },

  removeExternalInput: (id) => {
    set((s) => {
      const next = { ...s.externalInputs };
      delete next[id];
      return { externalInputs: next };
    });
  },

  // ── Checkpoints ──
  checkpoint: async (beforeOperation) => {
    const scaffold = useCanvasStore.getState().scaffoldData;
    const hash = get().currentScaffoldHash;
    if (!scaffold || !hash) return null;

    const readiness = get().getReadiness();
    try {
      const id = await createCheckpoint(
        scaffold,
        beforeOperation,
        readiness ?? "skeleton",
        hash ?? "main"
      );
      await get().refreshCheckpoints();
      return id;
    } catch (e) {
      console.error("[d118-store] checkpoint failed:", e);
      return null;
    }
  },

  restore: async (checkpointId) => {
    try {
      const scaffoldJson = await restoreCheckpoint(checkpointId);
      if (!scaffoldJson) return false;

      const canvasStore = useCanvasStore.getState();
      await canvasStore.loadScaffold(scaffoldJson);

      get().refreshScaffoldHash();
      await get().refreshCheckpoints();
      return true;
    } catch (e) {
      console.error("[d118-store] restore failed:", e);
      return false;
    }
  },

  refreshCheckpoints: async () => {
    set({ checkpointsLoading: true });
    try {
      const all = await listCheckpoints();
      set({ checkpoints: all, checkpointsLoading: false });
    } catch (e) {
      console.error("[d118-store] refreshCheckpoints failed:", e);
      set({ checkpointsLoading: false });
    }
  },

  pinCheckpoint: async (id) => {
    const cp = get().checkpoints.find((c) => c.id === id);
    await togglePin(id, !(cp?.pinned ?? false));
    await get().refreshCheckpoints();
  },

  setCheckpointLabel: async (id, label) => {
    await labelCheckpoint(id, label);
    await get().refreshCheckpoints();
  },

  // ── Derived Computations (never stored) ──

  getReadiness: () => {
    const scaffold = useCanvasStore.getState().scaffoldData;
    const diagnostics = get().diagnosticArtefacts;
    return computeReadiness(scaffold, diagnostics);
  },

  getNBA: (completedIds) => {
    const scaffold = useCanvasStore.getState().scaffoldData;
    const cardRegistry = useCanvasStore.getState().cardRegistry;
    const diagnostics = get().diagnosticArtefacts;
    const externalInputs = get().externalInputs;
    // Import mapping pair count dynamically to avoid circular dependency
    let mappingPairCount = 0;
    try {
      const { useEnrichmentStore } = require("./enrichment-store");
      mappingPairCount = useEnrichmentStore.getState().mappingPairs?.length ?? 0;
    } catch { /* enrichment store not available — default to 0 */ }
    return computeNBA(scaffold, completedIds, diagnostics, cardRegistry, externalInputs, mappingPairCount);
  },

  getStalenessDelta: (diagnosticId) => {
    const artefact = get().diagnosticArtefacts[diagnosticId];
    if (!artefact || !artefact.stale) return null;

    if (artefact.stalenessDelta) {
      return artefact.stalenessDelta;
    }

    const currentCounts = get().currentElementCounts;
    return {
      atProduction: {},
      atCurrent: currentCounts,
      summary: "Model structure has changed since this diagnostic was produced.",
    };
  },
}));

// ─── React Hooks (convenience selectors) ────────────────────────────────────

/** Hook: current readiness state. Recomputes when d118 store changes. */
export function useReadiness(): ReadinessState | null {
  return useD118Store((s) => s.getReadiness());
}

/** Hook: readiness hint for the next level. */
export function useReadinessHint(): string | null {
  const readiness = useReadiness();
  return readiness ? nextReadinessHint(readiness) : null;
}

/** Hook: current scaffold hash. */
export function useScaffoldHash(): string | null {
  return useD118Store((s) => s.currentScaffoldHash);
}

/** Hook: external inputs grouped by type. */
export function useExternalInputsByType(): Record<ExternalInputType, ExternalInputArtefact | null> {
  const inputs = useD118Store((s) => s.externalInputs);
  const allTypes: ExternalInputType[] = [
    "swot", "strategic-plan", "initiative-charter", "risk-register",
    "regulatory-framework", "metrics-library", "maturity-assessment", "custom",
  ];
  const result: Record<string, ExternalInputArtefact | null> = {};
  for (const type of allTypes) {
    const found = Object.values(inputs).find((i) => i.type === type);
    result[type] = found ?? null;
  }
  return result as Record<ExternalInputType, ExternalInputArtefact | null>;
}

/** Hook: diagnostic artefact for a specific operation, with staleness. */
export function useDiagnosticArtefact(diagnosticId: string): DiagnosticArtefact | null {
  return useD118Store((s) => s.diagnosticArtefacts[diagnosticId] ?? null);
}

/** Hook: all checkpoints, sorted by sequence descending. */
export function useCheckpoints(): CheckpointSummary[] {
  return useD118Store((s) => s.checkpoints);
}
