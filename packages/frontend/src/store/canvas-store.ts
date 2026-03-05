// @ts-nocheck
import { create } from "zustand";
import type {
  ScaffoldData,
  HeatmapData,
  CanvasViewModel,
  ValidationReport,
  NetworkNode,
  NetworkEdge,
  TransformationUserStory,
} from "../types.ts";
import { resolveScaffoldMeasures } from "./scaffold-resolver.ts";
import { validateThroughputRules } from "./throughput-validator.ts";
import {
  deriveNetworkEdges,
  computeNodePositions,
  buildNetworkNodes,
} from "./network-derivation.ts";

type ViewMode = "network" | "stage" | "intake";

interface CanvasState {
  // View navigation
  viewMode: ViewMode;
  selectedVsId: string | null;

  // Data
  scaffoldData: ScaffoldData | null;
  heatmapData: HeatmapData | null;
  heatmapsByVs: Map<string, HeatmapData>;
  canvasViewModel: CanvasViewModel | null;
  validationReport: ValidationReport | null;
  loading: boolean;
  error: string | null;

  // Network view derived state
  networkNodes: NetworkNode[];
  networkForwardEdges: NetworkEdge[];
  networkFeedbackEdges: NetworkEdge[];

  // Transformation layer
  userStoriesByActivity: Record<string, TransformationUserStory[]>;

  // Actions
  loadScaffold: (json: ScaffoldData) => Promise<void>;
  loadHeatmap: (json: HeatmapData) => Promise<void>;
  generateCanvas: () => Promise<void>;
  generateCanvasForVs: (vsId: string) => Promise<void>;
  validate: () => Promise<void>;
  selectVs: (vsId: string) => void;
  backToNetwork: () => void;
  goToIntake: () => void;
  reset: () => void;
  saveUserStory: (activityId: string, story: TransformationUserStory) => void;
  setActivityStories: (activityId: string, stories: TransformationUserStory[]) => void;
  getAllUserStories: () => TransformationUserStory[];
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  viewMode: "network",
  selectedVsId: null,
  scaffoldData: null,
  heatmapData: null,
  heatmapsByVs: new Map(),
  canvasViewModel: null,
  validationReport: null,
  loading: false,
  error: null,
  networkNodes: [],
  networkForwardEdges: [],
  networkFeedbackEdges: [],
  userStoriesByActivity: {},

  loadScaffold: async (json: ScaffoldData) => {
    const resolved = resolveScaffoldMeasures(json);
    set({ scaffoldData: resolved, error: null, loading: true });

    // Derive network topology immediately (before validation)
    const vsIds = Object.keys(resolved.elements.valueStreams);
    const { forwardEdges, feedbackEdges } = deriveNetworkEdges(resolved);
    const positions = computeNodePositions(vsIds, forwardEdges, resolved);
    const nodes = buildNetworkNodes(resolved, get().heatmapsByVs, positions);

    set({
      networkNodes: nodes,
      networkForwardEdges: forwardEdges,
      networkFeedbackEdges: feedbackEdges,
    });

    // Multi-VS → stay in network view; single-VS → generate canvas
    if (vsIds.length > 1) {
      // Validate in background (non-blocking for network view)
      try {
        await get().validate();
      } catch {
        // Validation failure doesn't block network view
      }
      set({ viewMode: "network", loading: false });
    } else {
      // Single VS — validate then generate canvas
      try {
        await get().validate();
        const report = get().validationReport;
        if (report?.status === "Invalid") {
          set({ loading: false });
          return;
        }
        set({ selectedVsId: vsIds[0], viewMode: "stage" });
        await get().generateCanvasForVs(vsIds[0]);
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to load scaffold",
        });
      }
      set({ loading: false });
    }
  },

  loadHeatmap: async (json: HeatmapData) => {
    const heatmapsByVs = new Map(get().heatmapsByVs);
    heatmapsByVs.set(json.valueStreamId, json);

    // Set as active heatmap if we're viewing this VS
    const isActiveVs = get().selectedVsId === json.valueStreamId;
    set({
      heatmapsByVs,
      heatmapData: isActiveVs ? json : get().heatmapData,
      error: null,
      loading: true,
    });

    try {
      // Re-validate with both scaffold + heatmap
      if (isActiveVs) await get().validate();

      // Refresh network nodes with updated heatmap data
      const { scaffoldData } = get();
      if (scaffoldData) {
        const vsIds = Object.keys(scaffoldData.elements.valueStreams);
        const { forwardEdges } = deriveNetworkEdges(scaffoldData);
        const positions = computeNodePositions(vsIds, forwardEdges, scaffoldData);
        const nodes = buildNetworkNodes(scaffoldData, heatmapsByVs, positions);
        set({ networkNodes: nodes });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load heatmap",
      });
    } finally {
      set({ loading: false });
    }
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

    await get().generateCanvasForVs(valueStreamId);
  },

  validate: async () => {
    const { scaffoldData, heatmapData } = get();
    if (!scaffoldData) {
      set({ error: "No scaffold loaded" });
      return;
    }

    try {
      // Client-side validation only — no backend dependency
      const report: ValidationReport = {
        status: "Valid",
        findings: [],
        summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
      };

      // Run client-side throughput semantic validation
      const { scaffoldData: currentScaffold } = get();
      if (currentScaffold) {
        const throughputFindings = validateThroughputRules(
          currentScaffold.elements as Record<string, Record<string, unknown>>,
        );
        if (throughputFindings.length > 0) {
          report.findings = [...report.findings, ...throughputFindings];
          const newErrors = throughputFindings.filter((f) => f.severity === "Error").length;
          const newWarnings = throughputFindings.filter((f) => f.severity === "Warning").length;
          report.summary.errorCount += newErrors;
          report.summary.warningCount += newWarnings;
          if (newErrors > 0 && report.status === "Valid") {
            report.status = "Invalid";
          } else if (newWarnings > 0 && report.status === "Valid") {
            report.status = "ValidWithWarnings";
          }
        }
      }

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

  generateCanvasForVs: async (vsId: string) => {
    const { scaffoldData } = get();
    if (!scaffoldData) {
      set({ error: "No scaffold loaded" });
      return;
    }

    const vs = scaffoldData.elements.valueStreams[vsId];
    if (!vs) {
      set({ error: `Value stream ${vsId} not found` });
      return;
    }

    // Build CanvasViewModel client-side from scaffold data
    // Each activity becomes a column (stage)
    const columns = vs.activityIds.map((actId, idx) => {
      const act = scaffoldData.elements.activities[actId];
      return {
        columnId: `col_${idx}`,
        label: act?.name ?? actId,
        activityIds: [actId],
        aggregates: {
          roleIds: act?.performedByRoleIds ?? [],
          capabilityIds: act?.requiresCapabilityIds ?? [],
          metricIds: act?.metricIds ?? [],
          controlIds: act?.controlIds ?? [],
          constraintIds: act?.constraintIds ?? [],
        },
      };
    });

    const vm: CanvasViewModel = {
      schemaVersion: scaffoldData.schemaVersion,
      viewId: `canvas_${vsId}`,
      scaffoldId: scaffoldData.scaffoldId,
      scaffoldIntegrityHash: "",
      valueStreamId: vsId,
      groupingMode: "activity",
      generatedAt: new Date().toISOString(),
      columns,
      summary: {
        totalActivities: vs.activityIds.length,
        totalRoles: new Set(vs.activityIds.flatMap(
          (a) => scaffoldData.elements.activities[a]?.performedByRoleIds ?? [],
        )).size,
        totalCapabilities: new Set(vs.activityIds.flatMap(
          (a) => scaffoldData.elements.activities[a]?.requiresCapabilityIds ?? [],
        )).size,
        totalMetrics: new Set(vs.activityIds.flatMap(
          (a) => scaffoldData.elements.activities[a]?.metricIds ?? [],
        )).size,
        totalControls: new Set(vs.activityIds.flatMap(
          (a) => scaffoldData.elements.activities[a]?.controlIds ?? [],
        )).size,
        totalConstraints: 0,
      },
    };

    // Load VS-specific heatmap if available
    const vsHeatmap = get().heatmapsByVs.get(vsId) ?? null;

    set({
      canvasViewModel: vm,
      heatmapData: vsHeatmap,
      selectedVsId: vsId,
      viewMode: "stage",
      error: null,
    });
  },

  selectVs: (vsId: string) => {
    set({ loading: true });
    get().generateCanvasForVs(vsId).finally(() => set({ loading: false }));
  },

  backToNetwork: () => {
    set({
      viewMode: "network",
      selectedVsId: null,
      canvasViewModel: null,
      heatmapData: null,
    });
  },

  goToIntake: () => {
    set({ viewMode: "intake" });
  },

  reset: () => {
    set({
      viewMode: "network",
      selectedVsId: null,
      scaffoldData: null,
      heatmapData: null,
      heatmapsByVs: new Map(),
      canvasViewModel: null,
      validationReport: null,
      loading: false,
      error: null,
      networkNodes: [],
      networkForwardEdges: [],
      networkFeedbackEdges: [],
      userStoriesByActivity: {},
    });
  },

  saveUserStory: (activityId, story) => {
    const current = get().userStoriesByActivity;
    const existing = current[activityId] ?? [];
    const idx = existing.findIndex((s) => s.storyId === story.storyId);
    const updated =
      idx >= 0
        ? existing.map((s) => (s.storyId === story.storyId ? story : s))
        : [...existing, story];
    set({ userStoriesByActivity: { ...current, [activityId]: updated } });
  },

  setActivityStories: (activityId, stories) => {
    set({
      userStoriesByActivity: {
        ...get().userStoriesByActivity,
        [activityId]: stories,
      },
    });
  },

  getAllUserStories: () => {
    return Object.values(get().userStoriesByActivity).flat();
  },
}));
