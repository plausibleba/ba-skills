// ─── Discovery Session Store ─────────────────────────────────────────────────
// Zustand store for three-pass pipeline state (D-065).
// Each artefact is recoverable — persisted as it becomes available.

import { create } from "zustand";
import type { DiscoveryIR } from "../domain/pipeline/discovery-ir";
import type { PipelineStatus, PipelineProgress } from "../domain/pipeline/pipeline-orchestrator";
import type { GateResult } from "../domain/pipeline/scaffold-gates";

interface DiscoverySessionState {
  // Pipeline execution state
  status: PipelineStatus;
  errorMessage?: string;

  // Artefacts — each persisted as soon as its pass completes
  discoveryIR: DiscoveryIR | null;
  scaffold: any | null;
  gate1: GateResult | null;
  gate2: GateResult | null;
  heatmaps: any[];
  bundle: any | null;

  // UI state
  showReviewPanel: boolean;  // optional DiscoveryIR review (D-072)

  // Actions
  applyProgress: (progress: PipelineProgress) => void;
  setShowReviewPanel: (show: boolean) => void;
  updateDiscoveryIR: (patch: Partial<DiscoveryIR>) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  status: "idle" as PipelineStatus,
  errorMessage: undefined,
  discoveryIR: null,
  scaffold: null,
  gate1: null,
  gate2: null,
  heatmaps: [],
  bundle: null,
  showReviewPanel: false,
};

export const useDiscoverySessionStore = create<DiscoverySessionState>((set, get) => ({
  ...INITIAL_STATE,

  applyProgress: (progress: PipelineProgress) => {
    set({
      status: progress.status,
      ...(progress.errorMessage !== undefined && { errorMessage: progress.errorMessage }),
      ...(progress.discoveryIR !== undefined && { discoveryIR: progress.discoveryIR }),
      ...(progress.scaffold !== undefined && { scaffold: progress.scaffold }),
      ...(progress.gate1 !== undefined && { gate1: progress.gate1 }),
      ...(progress.gate2 !== undefined && { gate2: progress.gate2 }),
      ...(progress.heatmaps !== undefined && { heatmaps: progress.heatmaps }),
      ...(progress.bundle !== undefined && { bundle: progress.bundle }),
    });
  },

  setShowReviewPanel: (show: boolean) => set({ showReviewPanel: show }),

  // Allow light editing of DiscoveryIR before Pass B (D-068, D-072)
  updateDiscoveryIR: (patch: Partial<DiscoveryIR>) => {
    const current = get().discoveryIR;
    if (!current) return;
    set({ discoveryIR: { ...current, ...patch } });
  },

  reset: () => set(INITIAL_STATE),
}));
