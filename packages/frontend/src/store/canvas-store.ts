import { create } from "zustand";
import type {
  ScaffoldData,
  CanvasViewModel,
  ValidationReport,
} from "../types.ts";

interface CanvasState {
  scaffoldData: ScaffoldData | null;
  heatmapData: unknown | null;
  canvasViewModel: CanvasViewModel | null;
  validationReport: ValidationReport | null;
  loading: boolean;
  error: string | null;

  loadScaffold: (json: ScaffoldData) => Promise<void>;
  loadHeatmap: (json: unknown) => void;
  generateCanvas: () => Promise<void>;
  validate: () => Promise<void>;
  reset: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  scaffoldData: null,
  heatmapData: null,
  canvasViewModel: null,
  validationReport: null,
  loading: false,
  error: null,

  loadScaffold: async (json: ScaffoldData) => {
    set({ scaffoldData: json, error: null, loading: true });

    try {
      // Validate first
      await get().validate();
      const report = get().validationReport;

      if (report?.status === "Invalid") {
        set({ loading: false });
        return;
      }

      // Generate canvas
      await get().generateCanvas();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load scaffold",
      });
    } finally {
      set({ loading: false });
    }
  },

  loadHeatmap: (json: unknown) => {
    set({ heatmapData: json });
  },

  generateCanvas: async () => {
    const { scaffoldData } = get();
    if (!scaffoldData) {
      set({ error: "No scaffold loaded" });
      return;
    }

    // Pick the first value stream
    const valueStreamIds = Object.keys(
      scaffoldData.elements.valueStreams,
    );
    if (valueStreamIds.length === 0) {
      set({ error: "Scaffold has no value streams" });
      return;
    }

    const valueStreamId = valueStreamIds[0];

    try {
      const res = await fetch("/v1/canvas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scaffold: scaffoldData, valueStreamId }),
      });

      if (!res.ok) {
        const body = await res.json();
        set({
          error:
            body.error ?? `Canvas generation failed (${res.status})`,
        });
        return;
      }

      const vm = (await res.json()) as CanvasViewModel;
      set({ canvasViewModel: vm, error: null });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Canvas generation request failed",
      });
    }
  },

  validate: async () => {
    const { scaffoldData, heatmapData } = get();
    if (!scaffoldData) {
      set({ error: "No scaffold loaded" });
      return;
    }

    try {
      const res = await fetch("/v1/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaffold: scaffoldData,
          ...(heatmapData ? { heatmap: heatmapData } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        set({ error: body.error ?? `Validation failed (${res.status})` });
        return;
      }

      const report = (await res.json()) as ValidationReport;
      set({ validationReport: report });

      if (report.status === "Invalid") {
        set({
          error: `Validation failed: ${report.summary.errorCount} error(s)`,
        });
      }
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Validation request failed",
      });
    }
  },

  reset: () => {
    set({
      scaffoldData: null,
      heatmapData: null,
      canvasViewModel: null,
      validationReport: null,
      loading: false,
      error: null,
    });
  },
}));
