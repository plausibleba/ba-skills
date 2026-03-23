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
import type { CardRegistry } from "../types/cards.ts";
import { resolveScaffoldMeasures } from "./scaffold-resolver.ts";
import { validateThroughputRules } from "./throughput-validator.ts";
import {
  deriveNetworkEdges,
  computeNodePositions,
  buildNetworkNodes,
  deriveCapabilityInstances,
  deriveTopologyView,
} from "./network-derivation.ts";

type ViewMode = "network" | "stage" | "intake" | "capabilityMap" | "conceptGraph" | "friction" | "workbench";

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
  topologyView: any;
  capabilityInstanceView: any;

  // Enrichment tracking
  enrichVersion: number;

  // Transformation layer
  userStoriesByActivity: Record<string, TransformationUserStory[]>;

  // MVC Card Registry (D-099: Eric Broda integration)
  cardRegistry: CardRegistry | null;

  // Dirty flag — set when scaffold is mutated locally (D-092)
  scaffoldDirty: boolean;

  // Actions
  loadScaffold: (json: ScaffoldData) => Promise<void>;
  loadHeatmap: (json: HeatmapData) => Promise<void>;
  generateCanvas: () => Promise<void>;
  generateCanvasForVs: (vsId: string) => Promise<void>;
  validate: () => Promise<void>;
  selectVs: (vsId: string) => void;
  backToNetwork: () => void;
  goToIntake: () => void;
  goToCapabilityMap: () => void;
  goToConceptGraph: () => void;
  goToFriction: () => void;
  goToWorkbench: () => void;
  reset: () => void;
  saveUserStory: (activityId: string, story: TransformationUserStory) => void;
  setActivityStories: (activityId: string, stories: TransformationUserStory[]) => void;
  getAllUserStories: () => TransformationUserStory[];

  // Scaffold mutation actions (D-092: Editable Canvas)
  updateActivityName: (activityId: string, name: string) => void;
  updateCapabilityName: (capabilityId: string, name: string) => void;
  updateRoleName: (roleId: string, name: string) => void;
  updateVsName: (vsId: string, name: string) => void;
  updateVsDescription: (vsId: string, description: string) => void;
  updateOutcomeName: (outcomeId: string, name: string) => void;

  // Add/remove actions (D-093: Phase 2 Editable Canvas)
  addCapabilityToActivity: (activityId: string, capabilityName: string) => string;
  removeCapabilityFromActivity: (activityId: string, capabilityId: string) => void;
  addActivity: (vsId: string, activityName: string, afterActivityId?: string) => string;
  removeActivity: (vsId: string, activityId: string) => void;
  moveActivity: (vsId: string, activityId: string, toIndex: number) => void;
  addRole: (roleName: string) => string;
  removeRoleFromActivity: (activityId: string, roleId: string) => void;
  addRoleToActivity: (activityId: string, roleId: string) => void;
  addInfoObjectToCapability: (activityId: string, capabilityId: string, name: string) => string;
  removeInfoObjectFromCapability: (activityId: string, capabilityId: string, infoId: string) => void;
  addTechAppToCapability: (activityId: string, capabilityId: string, name: string) => string;
  removeTechAppFromCapability: (activityId: string, capabilityId: string, techId: string) => void;

  // PPIT sub-activity actions (D-094: granular process activities)
  updatePpitActivity: (activityId: string, capabilityId: string, index: number, newText: string) => void;
  addPpitActivity: (activityId: string, capabilityId: string, text: string) => void;
  removePpitActivity: (activityId: string, capabilityId: string, index: number) => void;

  // Per-capability role actions (D-094: roles at capability level in PPIT)
  addRoleToCapability: (activityId: string, capabilityId: string, roleId: string) => void;
  removeRoleFromCapability: (activityId: string, capabilityId: string, roleId: string) => void;

  // MVC Card Registry (D-099)
  loadCards: (cards: CardRegistry) => void;

  // Bundle save/load (D-092)
  saveFullBundle: () => Promise<void>;

  // Backend persistence (D-108: Supabase integration)
  saveToProject: () => Promise<void>;
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
  cardRegistry: null,
  scaffoldDirty: false,

  loadScaffold: async (json: ScaffoldData) => {
    // Normalise pipeline-generated scaffolds: ensure every metric has a measures block
    // and elements.measures exists, so downstream validators don't crash on undefined.
    // Auto-derive layoutZones from VS layoutZone values if not present
    let derivedLayoutZones = (json as any).layoutZones;
    if (!derivedLayoutZones) {
      const zoneIds = new Set<string>();
      for (const vs of Object.values(json.elements.valueStreams) as any[]) {
        const z = vs.layoutZone ?? vs.zone;
        if (z) zoneIds.add(z);
      }
      if (zoneIds.size > 0) {
        const ZONE_LABELS: Record<string, string> = {
          ecosystem: "Ecosystem (external-facing)",
          knowledge: "Knowledge (internal-facing)",
          "front-office": "Front Office",
          "back-office": "Back Office",
          strategic: "Strategic",
          core: "Core",
          enabling: "Enabling",
          genesis: "Genesis",
          custom: "Custom-built",
          product: "Product",
          commodity: "Commodity",
        };
        derivedLayoutZones = [...zoneIds].map((id, i) => ({
          id,
          label: ZONE_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1),
          row: i,
        }));
      }
    }

    const normalised = {
      ...json,
      ...(derivedLayoutZones ? { layoutZones: derivedLayoutZones } : {}),
      elements: {
        ...json.elements,
        measures: json.elements.measures ?? {},
        metrics: Object.fromEntries(
          Object.entries(json.elements.metrics ?? {}).map(([id, m]: [string, any]) => [
            id,
            m.measures ? m : { ...m, measures: {} },
          ])
        ),
      },
    } as ScaffoldData;
    const resolved = resolveScaffoldMeasures(normalised);
    set({ scaffoldData: resolved, error: null, loading: true });

    // Derive network topology immediately (before validation)
    const vsIds = Object.keys(resolved.elements.valueStreams);
    const { forwardEdges, feedbackEdges } = deriveNetworkEdges(resolved);
    const positions = computeNodePositions(vsIds, forwardEdges, resolved);
    const nodes = buildNetworkNodes(resolved, get().heatmapsByVs, positions);

    // Derive topology mesh (D-052) — activity-level coupling edges
    const scaffoldHash = `${resolved.name ?? "scaffold"}-${Date.now()}`;
    const capabilityInstanceView = deriveCapabilityInstances(resolved, scaffoldHash);
    const topologyView = deriveTopologyView(resolved, capabilityInstanceView, scaffoldHash);

    set({
      networkNodes: nodes,
      networkForwardEdges: forwardEdges,
      networkFeedbackEdges: feedbackEdges,
      topologyView,
      capabilityInstanceView,
    });

    // Route to the best view based on what data is available
    if (vsIds.length > 1) {
      // Multi-VS → stay in network view
      // Validate in background (non-blocking for network view)
      try {
        await get().validate();
      } catch {
        // Validation failure doesn't block network view
      }
      set({ viewMode: "network", loading: false });
    } else if (vsIds.length === 1) {
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
    } else {
      // No value streams — route to best available view
      const capCount = Object.keys(resolved.elements.capabilities ?? {}).length;
      const conceptCount = Object.keys((resolved.elements as any).concepts ?? {}).length;

      if (capCount > 0) {
        set({ viewMode: "capabilityMap", loading: false });
      } else if (conceptCount > 0) {
        set({ viewMode: "conceptGraph", loading: false });
      } else {
        // Bare scaffold with no renderable data yet — stay in discovery
        set({ loading: false });
      }
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

    // Resolve ordered activity IDs — v4 uses activityIds[], v5 uses
    // activityChainHead + nextActivityId chain on each activity.
    const resolveOrderedActivityIds = (): string[] => {
      // v4: activityIds array present and non-empty
      if (Array.isArray((vs as any).activityIds) && (vs as any).activityIds.length > 0) {
        return (vs as any).activityIds as string[];
      }
      // v5: walk nextActivityId chain from activityChainHead
      const startId = (vs as any).activityChainHead;
      if (!startId) return [];
      const ordered: string[] = [];
      const seen = new Set<string>();
      let current: string | null = startId;
      while (current && !seen.has(current)) {
        seen.add(current);
        ordered.push(current);
        const act = scaffoldData.elements.activities[current];
        current = (act as any)?.nextActivityId ?? null;
      }
      return ordered;
    };

    const orderedActivityIds = resolveOrderedActivityIds();

    if (orderedActivityIds.length === 0) {
      set({ error: `Value stream ${vsId} has no resolvable activities` });
      return;
    }

    // Build CanvasViewModel client-side from scaffold data
    // Each activity becomes a column (stage)
    const columns = orderedActivityIds.map((actId, idx) => {
      const act = scaffoldData.elements.activities[actId];
      return {
        columnId: `col_${idx}`,
        label: act?.name ?? actId,
        activityIds: [actId],
        aggregates: {
          roleIds: (act as any)?.performedByRoleIds ?? [],
          capabilityIds: (act as any)?.enabledByCapabilityIds ?? (act as any)?.requiresCapabilityIds ?? [],
          metricIds: (act as any)?.metricIds ?? [],
          controlIds: (act as any)?.controlIds ?? [],
          constraintIds: (act as any)?.constraintIds ?? [],
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
        totalActivities: orderedActivityIds.length,
        totalRoles: new Set(orderedActivityIds.flatMap(
          (a) => scaffoldData.elements.activities[a]?.performedByRoleIds ?? [],
        )).size,
        totalCapabilities: new Set(orderedActivityIds.flatMap(
          (a) => scaffoldData.elements.activities[a]?.enabledByCapabilityIds ?? scaffoldData.elements.activities[a]?.requiresCapabilityIds ?? [],
        )).size,
        totalMetrics: new Set(orderedActivityIds.flatMap(
          (a) => scaffoldData.elements.activities[a]?.metricIds ?? [],
        )).size,
        totalControls: new Set(orderedActivityIds.flatMap(
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

  goToCapabilityMap: () => {
    set({ viewMode: "capabilityMap" });
  },

  goToConceptGraph: () => {
    set({ viewMode: "conceptGraph" });
  },

  goToFriction: () => {
    set({ viewMode: "friction" });
  },

  goToWorkbench: () => {
    set({ viewMode: "workbench" });
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
      cardRegistry: null,
      scaffoldDirty: false,
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

  // ── Scaffold mutation actions (D-092: Editable Canvas) ──────────────────────

  updateActivityName: (activityId: string, name: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: {
          ...scaffoldData.elements.activities,
          [activityId]: { ...activity, name },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    // Re-derive canvas if viewing a VS
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
    _refreshNetworkNodes(get, set, updated);
  },

  updateCapabilityName: (capabilityId: string, name: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const cap = scaffoldData.elements.capabilities[capabilityId];
    if (!cap) return;
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        capabilities: {
          ...scaffoldData.elements.capabilities,
          [capabilityId]: { ...cap, name },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  updateRoleName: (roleId: string, name: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const role = scaffoldData.elements.roles[roleId];
    if (!role) return;
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        roles: {
          ...scaffoldData.elements.roles,
          [roleId]: { ...role, name },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  updateVsName: (vsId: string, name: string) => {
    const { scaffoldData } = get();
    if (!scaffoldData) return;
    const vs = scaffoldData.elements.valueStreams[vsId];
    if (!vs) return;
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        valueStreams: {
          ...scaffoldData.elements.valueStreams,
          [vsId]: { ...vs, name },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    _refreshNetworkNodes(get, set, updated);
  },

  updateVsDescription: (vsId: string, description: string) => {
    const { scaffoldData } = get();
    if (!scaffoldData) return;
    const vs = scaffoldData.elements.valueStreams[vsId];
    if (!vs) return;
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        valueStreams: {
          ...scaffoldData.elements.valueStreams,
          [vsId]: { ...vs, description },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
  },

  updateOutcomeName: (outcomeId: string, name: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const outcome = scaffoldData.elements.outcomes[outcomeId];
    if (!outcome) return;
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        outcomes: {
          ...scaffoldData.elements.outcomes,
          [outcomeId]: { ...outcome, name },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  // ── Add/remove actions (D-093: Phase 2) ──────────────────────────────────────

  addCapabilityToActivity: (activityId: string, capabilityName: string): string => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return "";
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return "";

    const capId = `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newCap = { id: capId, elementType: "Capability", name: capabilityName };

    // Add to elements registry + activity's capability list
    const capIds = [...((activity as any).requiresCapabilityIds ?? (activity as any).enabledByCapabilityIds ?? []), capId];
    const updatedActivity = { ...activity, requiresCapabilityIds: capIds };

    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        capabilities: { ...scaffoldData.elements.capabilities, [capId]: newCap },
        activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
    return capId;
  },

  removeCapabilityFromActivity: (activityId: string, capabilityId: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const currentCaps = (activity as any).requiresCapabilityIds ?? (activity as any).enabledByCapabilityIds ?? [];
    const capIds = currentCaps.filter((id: string) => id !== capabilityId);
    const updatedActivity = { ...activity, requiresCapabilityIds: capIds };

    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  addActivity: (vsId: string, activityName: string, afterActivityId?: string): string => {
    const { scaffoldData } = get();
    if (!scaffoldData) return "";
    const vs = scaffoldData.elements.valueStreams[vsId];
    if (!vs) return "";

    const actId = `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const preOutId = `out_${actId}_pre`;
    const postOutId = `out_${actId}_post`;

    const newActivity = {
      id: actId,
      elementType: "Activity",
      name: activityName,
      performedByRoleIds: [],
      preOutcomeId: preOutId,
      postOutcomeId: postOutId,
      requiresCapabilityIds: [],
      metricIds: [],
      controlIds: [],
    };
    const newPreOutcome = { id: preOutId, elementType: "Outcome", name: `${activityName} — Entry` };
    const newPostOutcome = { id: postOutId, elementType: "Outcome", name: `${activityName} — Exit` };

    // Insert into VS activityIds at the right position
    const currentIds = [...(vs.activityIds ?? [])];
    if (afterActivityId) {
      const idx = currentIds.indexOf(afterActivityId);
      if (idx >= 0) {
        currentIds.splice(idx + 1, 0, actId);
      } else {
        currentIds.push(actId);
      }
    } else {
      currentIds.push(actId);
    }

    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: { ...scaffoldData.elements.activities, [actId]: newActivity as any },
        outcomes: {
          ...scaffoldData.elements.outcomes,
          [preOutId]: newPreOutcome,
          [postOutId]: newPostOutcome,
        },
        valueStreams: {
          ...scaffoldData.elements.valueStreams,
          [vsId]: { ...vs, activityIds: currentIds },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    get().generateCanvasForVs(vsId);
    _refreshNetworkNodes(get, set, updated);
    return actId;
  },

  removeActivity: (vsId: string, activityId: string) => {
    const { scaffoldData } = get();
    if (!scaffoldData) return;
    const vs = scaffoldData.elements.valueStreams[vsId];
    if (!vs) return;

    const currentIds = vs.activityIds ?? [];
    if (currentIds.length <= 1) return; // Never remove the last activity

    const updatedIds = currentIds.filter((id) => id !== activityId);
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        valueStreams: {
          ...scaffoldData.elements.valueStreams,
          [vsId]: { ...vs, activityIds: updatedIds },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    get().generateCanvasForVs(vsId);
    _refreshNetworkNodes(get, set, updated);
  },

  moveActivity: (vsId: string, activityId: string, toIndex: number) => {
    const { scaffoldData } = get();
    if (!scaffoldData) return;
    const vs = scaffoldData.elements.valueStreams[vsId];
    if (!vs) return;

    const currentIds = [...(vs.activityIds ?? [])];
    const fromIndex = currentIds.indexOf(activityId);
    if (fromIndex < 0 || fromIndex === toIndex) return;

    // Remove from old position and insert at new
    currentIds.splice(fromIndex, 1);
    currentIds.splice(toIndex, 0, activityId);

    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        valueStreams: {
          ...scaffoldData.elements.valueStreams,
          [vsId]: { ...vs, activityIds: currentIds },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    get().generateCanvasForVs(vsId);
    _refreshNetworkNodes(get, set, updated);
  },

  addRole: (roleName: string): string => {
    const { scaffoldData } = get();
    if (!scaffoldData) return "";

    const roleId = `role_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newRole = { id: roleId, elementType: "Role", name: roleName };

    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        roles: { ...scaffoldData.elements.roles, [roleId]: newRole },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    return roleId;
  },

  removeRoleFromActivity: (activityId: string, roleId: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const roleIds = (activity.performedByRoleIds ?? []).filter((id) => id !== roleId);
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: {
          ...scaffoldData.elements.activities,
          [activityId]: { ...activity, performedByRoleIds: roleIds },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  addRoleToActivity: (activityId: string, roleId: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const current = activity.performedByRoleIds ?? [];
    if (current.includes(roleId)) return; // Already assigned
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: {
          ...scaffoldData.elements.activities,
          [activityId]: { ...activity, performedByRoleIds: [...current, roleId] },
        },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  addInfoObjectToCapability: (activityId: string, capabilityId: string, name: string): string => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return "";
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return "";

    const infoId = `io_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newObj = { id: infoId, elementType: "InformationObject", name };

    // Add to elements registry
    const infoObjs = scaffoldData.elements.informationObjects ?? {};
    const updatedElements = {
      ...scaffoldData.elements,
      informationObjects: { ...infoObjs, [infoId]: newObj },
    };

    // Add to capabilityPPIT if it exists on the activity
    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (ppitMap && ppitMap[capabilityId]) {
      const capPpit = ppitMap[capabilityId];
      const updatedPpit = { ...capPpit, informationObjectIds: [...(capPpit.informationObjectIds ?? []), infoId] };
      const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
      updatedElements.activities = { ...updatedElements.activities, [activityId]: updatedActivity };
    } else {
      // Fall back to activity-level informationObjectIds
      const actRec = activity as any;
      const currentIds = actRec.informationObjectIds ?? [];
      const updatedActivity = { ...activity, informationObjectIds: [...currentIds, infoId] };
      updatedElements.activities = { ...updatedElements.activities, [activityId]: updatedActivity as any };
    }

    const updated: ScaffoldData = { ...scaffoldData, elements: updatedElements };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
    return infoId;
  },

  removeInfoObjectFromCapability: (activityId: string, capabilityId: string, infoId: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const updatedElements = { ...scaffoldData.elements };
    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (ppitMap && ppitMap[capabilityId]) {
      const capPpit = ppitMap[capabilityId];
      const updatedPpit = { ...capPpit, informationObjectIds: (capPpit.informationObjectIds ?? []).filter((id: string) => id !== infoId) };
      const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
      updatedElements.activities = { ...updatedElements.activities, [activityId]: updatedActivity };
    } else {
      const actRec = activity as any;
      const currentIds = (actRec.informationObjectIds ?? []).filter((id: string) => id !== infoId);
      const updatedActivity = { ...activity, informationObjectIds: currentIds };
      updatedElements.activities = { ...updatedElements.activities, [activityId]: updatedActivity as any };
    }

    const updated: ScaffoldData = { ...scaffoldData, elements: updatedElements };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  addTechAppToCapability: (activityId: string, capabilityId: string, name: string): string => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return "";
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return "";

    const techId = `tech_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newApp = { id: techId, elementType: "TechnologyApp", name };

    const techApps = (scaffoldData.elements as any).technologyApps ?? {};
    const updatedElements = {
      ...scaffoldData.elements,
      technologyApps: { ...techApps, [techId]: newApp },
    };

    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (ppitMap && ppitMap[capabilityId]) {
      const capPpit = ppitMap[capabilityId];
      const updatedPpit = { ...capPpit, technologyAppIds: [...(capPpit.technologyAppIds ?? []), techId] };
      const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
      updatedElements.activities = { ...updatedElements.activities, [activityId]: updatedActivity };
    } else {
      const actRec = activity as any;
      const currentIds = actRec.technologyAppIds ?? [];
      const updatedActivity = { ...activity, technologyAppIds: [...currentIds, techId] };
      updatedElements.activities = { ...updatedElements.activities, [activityId]: updatedActivity as any };
    }

    const updated: ScaffoldData = { ...scaffoldData, elements: updatedElements };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
    return techId;
  },

  removeTechAppFromCapability: (activityId: string, capabilityId: string, techId: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const updatedElements = { ...scaffoldData.elements };
    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (ppitMap && ppitMap[capabilityId]) {
      const capPpit = ppitMap[capabilityId];
      const updatedPpit = { ...capPpit, technologyAppIds: (capPpit.technologyAppIds ?? []).filter((id: string) => id !== techId) };
      const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
      updatedElements.activities = { ...updatedElements.activities, [activityId]: updatedActivity };
    } else {
      const actRec = activity as any;
      const currentIds = (actRec.technologyAppIds ?? []).filter((id: string) => id !== techId);
      const updatedActivity = { ...activity, technologyAppIds: currentIds };
      updatedElements.activities = { ...updatedElements.activities, [activityId]: updatedActivity as any };
    }

    const updated: ScaffoldData = { ...scaffoldData, elements: updatedElements };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  // ── PPIT sub-activity actions (D-094) ───────────────────────────────────────

  updatePpitActivity: (activityId: string, capabilityId: string, index: number, newText: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (!ppitMap || !ppitMap[capabilityId]) return;

    const capPpit = ppitMap[capabilityId];
    const acts = [...(capPpit.activities ?? [])];
    if (index < 0 || index >= acts.length) return;
    acts[index] = newText;

    const updatedPpit = { ...capPpit, activities: acts };
    const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  addPpitActivity: (activityId: string, capabilityId: string, text: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (!ppitMap) {
      // No capabilityPPIT yet — create it with this first sub-activity
      const newPpit = { roleIds: [], activities: [text], informationObjectIds: [], technologyAppIds: [] };
      const updatedActivity = { ...activity, capabilityPPIT: { [capabilityId]: newPpit } };
      const updated: ScaffoldData = {
        ...scaffoldData,
        elements: {
          ...scaffoldData.elements,
          activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
        },
      };
      set({ scaffoldData: updated, scaffoldDirty: true });
      if (selectedVsId) get().generateCanvasForVs(selectedVsId);
      return;
    }

    const capPpit = ppitMap[capabilityId];
    if (!capPpit) {
      // capabilityPPIT exists but not for this capability — create entry
      const newEntry = { roleIds: [], activities: [text], informationObjectIds: [], technologyAppIds: [] };
      const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: newEntry } };
      const updated: ScaffoldData = {
        ...scaffoldData,
        elements: {
          ...scaffoldData.elements,
          activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
        },
      };
      set({ scaffoldData: updated, scaffoldDirty: true });
      if (selectedVsId) get().generateCanvasForVs(selectedVsId);
      return;
    }

    const acts = [...(capPpit.activities ?? []), text];
    const updatedPpit = { ...capPpit, activities: acts };
    const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  removePpitActivity: (activityId: string, capabilityId: string, index: number) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (!ppitMap || !ppitMap[capabilityId]) return;

    const capPpit = ppitMap[capabilityId];
    const acts = [...(capPpit.activities ?? [])];
    if (index < 0 || index >= acts.length) return;
    acts.splice(index, 1);

    const updatedPpit = { ...capPpit, activities: acts };
    const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  // ── Per-capability role actions (D-094) ────────────────────────────────────

  addRoleToCapability: (activityId: string, capabilityId: string, roleId: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (!ppitMap) {
      // Create capabilityPPIT with this role
      const newPpit = { roleIds: [roleId], activities: [], informationObjectIds: [], technologyAppIds: [] };
      const updatedActivity = { ...activity, capabilityPPIT: { [capabilityId]: newPpit } };
      const updated: ScaffoldData = {
        ...scaffoldData,
        elements: {
          ...scaffoldData.elements,
          activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
        },
      };
      set({ scaffoldData: updated, scaffoldDirty: true });
      if (selectedVsId) get().generateCanvasForVs(selectedVsId);
      return;
    }

    const capPpit = ppitMap[capabilityId];
    const currentRoleIds = capPpit ? (capPpit.roleIds ?? []) : [];
    if (currentRoleIds.includes(roleId)) return; // Already assigned

    const updatedPpit = capPpit
      ? { ...capPpit, roleIds: [...currentRoleIds, roleId] }
      : { roleIds: [roleId], activities: [], informationObjectIds: [], technologyAppIds: [] };
    const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  removeRoleFromCapability: (activityId: string, capabilityId: string, roleId: string) => {
    const { scaffoldData, selectedVsId } = get();
    if (!scaffoldData) return;
    const activity = scaffoldData.elements.activities[activityId];
    if (!activity) return;

    const ppitMap = (activity as any).capabilityPPIT as Record<string, any> | undefined;
    if (!ppitMap || !ppitMap[capabilityId]) return;

    const capPpit = ppitMap[capabilityId];
    const roleIds = (capPpit.roleIds ?? []).filter((id: string) => id !== roleId);
    const updatedPpit = { ...capPpit, roleIds };
    const updatedActivity = { ...activity, capabilityPPIT: { ...ppitMap, [capabilityId]: updatedPpit } };
    const updated: ScaffoldData = {
      ...scaffoldData,
      elements: {
        ...scaffoldData.elements,
        activities: { ...scaffoldData.elements.activities, [activityId]: updatedActivity },
      },
    };
    set({ scaffoldData: updated, scaffoldDirty: true });
    if (selectedVsId) get().generateCanvasForVs(selectedVsId);
  },

  // ── MVC Card Registry (D-099) ──────────────────────────────────────────────

  loadCards: (cards: CardRegistry) => {
    set({ cardRegistry: cards });
  },

  // ── Bundle save (D-092) ─────────────────────────────────────────────────────

  saveFullBundle: async () => {
    const { scaffoldData, heatmapsByVs, userStoriesByActivity } = get();
    if (!scaffoldData) return;

    const bundle = {
      bundleVersion: "2.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scaffold: scaffoldData,
      heatmaps: Array.from(heatmapsByVs.values()),
      userStoriesByActivity,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const filename = `vcc-bundle-${scaffoldData.name?.replace(/\s+/g, "-").toLowerCase() ?? "export"}-${new Date().toISOString().slice(0, 10)}.json`;

    // Try modern File System Access API, fall back to download link
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "JSON Bundle", accept: { "application/json": [".json"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        set({ scaffoldDirty: false });
        return;
      } catch (e: any) {
        // User cancelled or API not supported — fall through to blob download
        if (e?.name === "AbortError") return;
      }
    }
    // Blob fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    set({ scaffoldDirty: false });
  },

  // Save current scaffold + heatmaps to the active Supabase project (D-108)
  saveToProject: async () => {
    // Lazy import to avoid circular dependency
    const { useProjectStore } = await import("./project-store.ts");
    const projectStore = useProjectStore.getState();
    const { currentProjectId } = projectStore;
    if (!currentProjectId) return;

    const { scaffoldData, heatmapsByVs, userStoriesByActivity, cardRegistry } = get();
    if (!scaffoldData) return;

    const bundle: Record<string, unknown> = {
      bundleVersion: "2.0",
      updatedAt: new Date().toISOString(),
      scaffold: scaffoldData,
      heatmaps: Array.from(heatmapsByVs.values()),
      userStoriesByActivity,
    };
    if (cardRegistry) bundle.cardRegistry = cardRegistry;

    const result = await projectStore.saveProject(currentProjectId, bundle);
    if (result.ok) {
      set({ scaffoldDirty: false });
    }
    // On conflict, auto-save will be paused until user resolves it
    // (the subscription checks conflict flag before scheduling)
  },
}));

// ── Auto-save: debounced save to Supabase when scaffold changes ─────────
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _prevDirty = false;
useCanvasStore.subscribe((state) => {
  const dirty = state.scaffoldDirty;
  if (dirty && !_prevDirty) {
    // Scaffold just became dirty — schedule auto-save
    import("./project-store.ts").then(({ useProjectStore }) => {
      const projectState = useProjectStore.getState();
      const { currentProjectId } = projectState;
      if (!currentProjectId) return;
      // Don't auto-save while a conflict is unresolved
      if (projectState.conflict) return;
      if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
      _autoSaveTimer = setTimeout(() => {
        useCanvasStore.getState().saveToProject();
      }, 2000);
    });
  }
  _prevDirty = dirty;
});

// ── Helper: refresh network nodes after scaffold mutation ──────────────────
function _refreshNetworkNodes(
  get: () => CanvasState,
  set: (state: Partial<CanvasState>) => void,
  scaffold: ScaffoldData,
) {
  const vsIds = Object.keys(scaffold.elements.valueStreams);
  const { forwardEdges } = deriveNetworkEdges(scaffold);
  const positions = computeNodePositions(vsIds, forwardEdges, scaffold);
  const nodes = buildNetworkNodes(scaffold, get().heatmapsByVs, positions);
  set({ networkNodes: nodes, networkForwardEdges: forwardEdges });
}
