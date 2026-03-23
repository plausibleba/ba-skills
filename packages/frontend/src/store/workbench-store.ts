// Op Model Workbench — Zustand store
// Session 26: Phase 1 foundation (ephemeral state, commit model)

import { create } from "zustand";
import type { ScaffoldData } from "../types";

// ── Catalog types ──

export type CatalogType =
  | "capabilities"
  | "valueStreams"
  | "activities"
  | "concepts"
  | "roles"
  | "metrics";

export type WorkbenchStep = 1 | 2 | 3 | 4 | 5;

// ── Diff operations ──

export interface CascadeUpdate {
  catalog: CatalogType;
  elementId: string;
  field: string;
  before: unknown;
  after: unknown;
}

export type DiffOperation =
  | { action: "add"; catalog: CatalogType; elementId: string; element: Record<string, unknown> }
  | { action: "modify"; catalog: CatalogType; elementId: string; field: string; before: unknown; after: unknown }
  | { action: "delete"; catalog: CatalogType; elementId: string; cascadeUpdates?: CascadeUpdate[] }
  | { action: "merge"; catalog: CatalogType; sourceIds: string[]; targetId: string; mergedElement: Record<string, unknown>; cascadeUpdates?: CascadeUpdate[] }
  | { action: "split"; catalog: CatalogType; sourceId: string; newElements: Record<string, unknown>[]; cascadeUpdates?: CascadeUpdate[] }
  | { action: "move"; catalog: CatalogType; elementId: string; field: string; before: unknown; after: unknown };

// ── Chat messages ──

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  diffs?: DiffOperation[];
  timestamp: number;
}

// ── Validation ──

export interface ValidationIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
  elementIds: string[];
  catalog: CatalogType;
  suggestedFix?: DiffOperation[];
  dismissed?: boolean;
}

// ── Store interface ──

interface WorkbenchState {
  // Session state
  isActive: boolean;
  currentStep: WorkbenchStep;
  selectedCatalogs: CatalogType[];

  // Working copy of scaffold (edits applied here, not to canvas store)
  workingScaffold: ScaffoldData | null;
  originalScaffoldHash: string | null;

  // Edit tracking (per catalog)
  editHistory: DiffOperation[];
  undoStack: DiffOperation[][];
  redoStack: DiffOperation[][];

  // Active catalog tab
  activeCatalog: CatalogType;

  // View mode per catalog
  catalogViewMode: Record<CatalogType, "grid" | "cards">;

  // Agent state (per catalog)
  agentMessages: Record<CatalogType, ChatMessage[]>;

  // Reconciliation
  validationIssues: ValidationIssue[];

  // Derived counts
  dirtyCountByCatalog: Record<CatalogType, number>;

  // ── Actions ──

  // Lifecycle
  enterWorkbench: (scaffold: ScaffoldData) => void;
  exitWorkbench: () => void;

  // Navigation
  setStep: (step: WorkbenchStep) => void;
  setSelectedCatalogs: (catalogs: CatalogType[]) => void;
  setActiveCatalog: (catalog: CatalogType) => void;
  setCatalogViewMode: (catalog: CatalogType, mode: "grid" | "cards") => void;

  // Editing
  applyEdit: (op: DiffOperation) => void;
  applyEdits: (ops: DiffOperation[]) => void;
  undo: () => void;
  redo: () => void;

  // Element-level convenience edits
  updateElement: (catalog: CatalogType, elementId: string, field: string, value: unknown) => void;
  addElement: (catalog: CatalogType, element: Record<string, unknown>) => void;
  deleteElement: (catalog: CatalogType, elementId: string) => void;

  // Agent
  addAgentMessage: (catalog: CatalogType, msg: ChatMessage) => void;

  // Reconciliation
  runValidation: () => void;
  dismissIssue: (issueId: string) => void;
  applyFix: (issueId: string) => void;
}

// ── Catalog key mapping ──

const CATALOG_SCAFFOLD_KEY: Record<CatalogType, string> = {
  capabilities: "capabilities",
  valueStreams: "valueStreams",
  activities: "activities",
  concepts: "informationObjects",  // concepts live as informationObjects in scaffold
  roles: "roles",
  metrics: "metrics",
};

// ── Helpers ──

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function applyDiffToScaffold(scaffold: ScaffoldData, op: DiffOperation): ScaffoldData {
  const clone = deepClone(scaffold);
  const key = CATALOG_SCAFFOLD_KEY[op.catalog];
  const registry = (clone.elements as any)[key] ?? {};

  switch (op.action) {
    case "add":
      registry[op.elementId] = op.element;
      break;

    case "modify":
    case "move":
      if (registry[op.elementId]) {
        (registry[op.elementId] as any)[op.field] = op.after;
      }
      break;

    case "delete":
      delete registry[op.elementId];
      // Apply cascade updates
      if (op.cascadeUpdates) {
        for (const cu of op.cascadeUpdates) {
          const cuKey = CATALOG_SCAFFOLD_KEY[cu.catalog];
          const cuReg = (clone.elements as any)[cuKey];
          if (cuReg?.[cu.elementId]) {
            (cuReg[cu.elementId] as any)[cu.field] = cu.after;
          }
        }
      }
      break;

    case "merge":
      // Remove sources, add target
      for (const sid of op.sourceIds) {
        delete registry[sid];
      }
      registry[op.targetId] = op.mergedElement;
      if (op.cascadeUpdates) {
        for (const cu of op.cascadeUpdates) {
          const cuKey = CATALOG_SCAFFOLD_KEY[cu.catalog];
          const cuReg = (clone.elements as any)[cuKey];
          if (cuReg?.[cu.elementId]) {
            (cuReg[cu.elementId] as any)[cu.field] = cu.after;
          }
        }
      }
      break;

    case "split":
      delete registry[op.sourceId];
      for (const el of op.newElements) {
        if ((el as any).id) {
          registry[(el as any).id] = el;
        }
      }
      if (op.cascadeUpdates) {
        for (const cu of op.cascadeUpdates) {
          const cuKey = CATALOG_SCAFFOLD_KEY[cu.catalog];
          const cuReg = (clone.elements as any)[cuKey];
          if (cuReg?.[cu.elementId]) {
            (cuReg[cu.elementId] as any)[cu.field] = cu.after;
          }
        }
      }
      break;
  }

  (clone.elements as any)[key] = registry;
  return clone;
}

function countEditsForCatalog(edits: DiffOperation[], catalog: CatalogType): number {
  return edits.filter((e) => e.catalog === catalog).length;
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

// ── Initial state ──

const emptyCatalogViewMode: Record<CatalogType, "grid" | "cards"> = {
  capabilities: "grid",
  valueStreams: "grid",
  activities: "grid",
  concepts: "grid",
  roles: "grid",
  metrics: "grid",
};

const emptyDirtyCounts: Record<CatalogType, number> = {
  capabilities: 0,
  valueStreams: 0,
  activities: 0,
  concepts: 0,
  roles: 0,
  metrics: 0,
};

const emptyMessages: Record<CatalogType, ChatMessage[]> = {
  capabilities: [],
  valueStreams: [],
  activities: [],
  concepts: [],
  roles: [],
  metrics: [],
};

// ── Store ──

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  // Initial state
  isActive: false,
  currentStep: 1,
  selectedCatalogs: [],
  workingScaffold: null,
  originalScaffoldHash: null,
  editHistory: [],
  undoStack: [],
  redoStack: [],
  activeCatalog: "capabilities",
  catalogViewMode: { ...emptyCatalogViewMode },
  agentMessages: deepClone(emptyMessages),
  validationIssues: [],
  dirtyCountByCatalog: { ...emptyDirtyCounts },

  // ── Lifecycle ──

  enterWorkbench: (scaffold) => {
    const allCatalogs: CatalogType[] = ["capabilities", "valueStreams", "activities", "concepts", "roles", "metrics"];
    set({
      isActive: true,
      currentStep: 2,
      selectedCatalogs: allCatalogs,
      workingScaffold: deepClone(scaffold),
      originalScaffoldHash: simpleHash(JSON.stringify(scaffold)),
      editHistory: [],
      undoStack: [],
      redoStack: [],
      activeCatalog: "capabilities",
      catalogViewMode: { ...emptyCatalogViewMode },
      agentMessages: deepClone(emptyMessages),
      validationIssues: [],
      dirtyCountByCatalog: { ...emptyDirtyCounts },
    });
  },

  exitWorkbench: () => {
    set({
      isActive: false,
      currentStep: 1,
      selectedCatalogs: [],
      workingScaffold: null,
      originalScaffoldHash: null,
      editHistory: [],
      undoStack: [],
      redoStack: [],
      validationIssues: [],
      dirtyCountByCatalog: { ...emptyDirtyCounts },
    });
  },

  // ── Navigation ──

  setStep: (step) => set({ currentStep: step }),

  setSelectedCatalogs: (catalogs) => set({ selectedCatalogs: catalogs }),

  setActiveCatalog: (catalog) => set({ activeCatalog: catalog }),

  setCatalogViewMode: (catalog, mode) => {
    set((state) => ({
      catalogViewMode: { ...state.catalogViewMode, [catalog]: mode },
    }));
  },

  // ── Editing ──

  applyEdit: (op) => {
    const { workingScaffold, editHistory, undoStack } = get();
    if (!workingScaffold) return;

    const newScaffold = applyDiffToScaffold(workingScaffold, op);
    const newHistory = [...editHistory, op];

    set({
      workingScaffold: newScaffold,
      editHistory: newHistory,
      undoStack: [...undoStack, editHistory],
      redoStack: [], // Clear redo on new edit
      dirtyCountByCatalog: {
        capabilities: countEditsForCatalog(newHistory, "capabilities"),
        valueStreams: countEditsForCatalog(newHistory, "valueStreams"),
        activities: countEditsForCatalog(newHistory, "activities"),
        concepts: countEditsForCatalog(newHistory, "concepts"),
        roles: countEditsForCatalog(newHistory, "roles"),
        metrics: countEditsForCatalog(newHistory, "metrics"),
      },
    });
  },

  applyEdits: (ops) => {
    const { workingScaffold, editHistory, undoStack } = get();
    if (!workingScaffold) return;

    let scaffold = workingScaffold;
    for (const op of ops) {
      scaffold = applyDiffToScaffold(scaffold, op);
    }
    const newHistory = [...editHistory, ...ops];

    set({
      workingScaffold: scaffold,
      editHistory: newHistory,
      undoStack: [...undoStack, editHistory],
      redoStack: [],
      dirtyCountByCatalog: {
        capabilities: countEditsForCatalog(newHistory, "capabilities"),
        valueStreams: countEditsForCatalog(newHistory, "valueStreams"),
        activities: countEditsForCatalog(newHistory, "activities"),
        concepts: countEditsForCatalog(newHistory, "concepts"),
        roles: countEditsForCatalog(newHistory, "roles"),
        metrics: countEditsForCatalog(newHistory, "metrics"),
      },
    });
  },

  undo: () => {
    const { undoStack, redoStack, editHistory, workingScaffold } = get();
    if (undoStack.length === 0 || !workingScaffold) return;

    const previousHistory = undoStack[undoStack.length - 1];
    // Rebuild scaffold from original by replaying previousHistory
    // For simplicity in Phase 1, we store the full scaffold at each undo point
    // This is a placeholder — will optimise if needed
    set({
      editHistory: previousHistory,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, editHistory],
    });
  },

  redo: () => {
    const { undoStack, redoStack, editHistory } = get();
    if (redoStack.length === 0) return;

    const nextHistory = redoStack[redoStack.length - 1];
    set({
      editHistory: nextHistory,
      undoStack: [...undoStack, editHistory],
      redoStack: redoStack.slice(0, -1),
    });
  },

  // ── Convenience edit methods ──

  updateElement: (catalog, elementId, field, value) => {
    const { workingScaffold } = get();
    if (!workingScaffold) return;
    const key = CATALOG_SCAFFOLD_KEY[catalog];
    const registry = (workingScaffold.elements as any)[key];
    const current = registry?.[elementId];
    if (!current) return;

    get().applyEdit({
      action: "modify",
      catalog,
      elementId,
      field,
      before: (current as any)[field],
      after: value,
    });
  },

  addElement: (catalog, element) => {
    const id = (element as any).id || `${catalog.slice(0, 3)}_new_${Date.now()}`;
    get().applyEdit({
      action: "add",
      catalog,
      elementId: id,
      element: { ...element, id },
    });
  },

  deleteElement: (catalog, elementId) => {
    get().applyEdit({
      action: "delete",
      catalog,
      elementId,
    });
  },

  // ── Agent ──

  addAgentMessage: (catalog, msg) => {
    set((state) => ({
      agentMessages: {
        ...state.agentMessages,
        [catalog]: [...(state.agentMessages[catalog] || []), msg],
      },
    }));
  },

  // ── Reconciliation (Phase 1: basic checks) ──

  runValidation: () => {
    const { workingScaffold } = get();
    if (!workingScaffold) return;

    const issues: ValidationIssue[] = [];
    const els = workingScaffold.elements;

    // Check: capabilities referenced by at least one activity
    for (const [capId, cap] of Object.entries(els.capabilities || {})) {
      const referenced = Object.values(els.activities || {}).some(
        (a: any) => a.requiresCapabilityIds?.includes(capId)
      );
      if (!referenced) {
        issues.push({
          id: `orphan-cap-${capId}`,
          severity: "warning",
          message: `Capability "${(cap as any).name || capId}" is not referenced by any stage`,
          elementIds: [capId],
          catalog: "capabilities",
        });
      }
    }

    // Check: activities must have at least one capability
    for (const [actId, act] of Object.entries(els.activities || {})) {
      const a = act as any;
      if (!a.requiresCapabilityIds || a.requiresCapabilityIds.length === 0) {
        issues.push({
          id: `nocap-act-${actId}`,
          severity: "warning",
          message: `Stage "${a.name || actId}" has no capabilities assigned`,
          elementIds: [actId],
          catalog: "activities",
        });
      }
    }

    // Check: roles referenced but missing from registry
    const roleIds = new Set(Object.keys(els.roles || {}));
    for (const [actId, act] of Object.entries(els.activities || {})) {
      const a = act as any;
      for (const rid of a.performedByRoleIds || []) {
        if (!roleIds.has(rid)) {
          issues.push({
            id: `missing-role-${rid}-${actId}`,
            severity: "error",
            message: `Role "${rid}" referenced in stage "${a.name || actId}" but not in roles registry`,
            elementIds: [actId, rid],
            catalog: "roles",
          });
        }
      }
    }

    // Check: broken activity chains
    for (const [actId, act] of Object.entries(els.activities || {})) {
      const a = act as any;
      if (a.nextActivityId && !els.activities[a.nextActivityId]) {
        issues.push({
          id: `broken-chain-${actId}`,
          severity: "error",
          message: `Stage "${a.name || actId}" points to non-existent next stage "${a.nextActivityId}"`,
          elementIds: [actId],
          catalog: "activities",
        });
      }
    }

    // Check: duplicate names within same catalog
    const catalogs: { key: string; catalog: CatalogType; label: string }[] = [
      { key: "capabilities", catalog: "capabilities", label: "Capabilities" },
      { key: "valueStreams", catalog: "valueStreams", label: "Value Streams" },
      { key: "activities", catalog: "activities", label: "Activities" },
      { key: "informationObjects", catalog: "concepts", label: "Concepts" },
      { key: "roles", catalog: "roles", label: "Roles" },
      { key: "metrics", catalog: "metrics", label: "Metrics" },
    ];
    for (const { key, catalog, label } of catalogs) {
      const entries = Object.entries((els as any)[key] || {});
      const nameMap = new Map<string, string[]>();
      for (const [id, el] of entries) {
        const name = ((el as any).name || "").toLowerCase().trim();
        if (!name) continue;
        if (!nameMap.has(name)) nameMap.set(name, []);
        nameMap.get(name)!.push(id);
      }
      for (const [name, ids] of nameMap) {
        if (ids.length > 1) {
          issues.push({
            id: `dup-name-${catalog}-${ids[0]}`,
            severity: "warning",
            message: `Duplicate name "${name}" found ${ids.length} times in ${label}`,
            elementIds: ids,
            catalog,
          });
        }
      }
    }

    // Check: business objects (concepts) not grounding any capability
    const capabilityInfoObjRefs = new Set<string>();
    for (const [, act] of Object.entries(els.activities || {})) {
      for (const ref of (act as any).informationObjectIds || []) {
        capabilityInfoObjRefs.add(ref);
      }
    }
    for (const [ioId, io] of Object.entries(els.informationObjects || {})) {
      if (!capabilityInfoObjRefs.has(ioId)) {
        issues.push({
          id: `ungrounded-io-${ioId}`,
          severity: "warning",
          message: `Concept "${(io as any).name || ioId}" is not referenced by any activity`,
          elementIds: [ioId],
          catalog: "concepts",
        });
      }
    }

    // Check: metric targeting non-existent element
    const allElementIds = new Set<string>();
    for (const [key] of Object.entries(els)) {
      if (typeof (els as any)[key] === "object" && (els as any)[key] !== null) {
        for (const id of Object.keys((els as any)[key])) {
          allElementIds.add(id);
        }
      }
    }
    for (const [metId, met] of Object.entries(els.metrics || {})) {
      const m = met as any;
      if (m.capabilityRef && !allElementIds.has(m.capabilityRef)) {
        issues.push({
          id: `broken-metric-${metId}`,
          severity: "error",
          message: `Metric "${m.name || metId}" targets non-existent element "${m.capabilityRef}"`,
          elementIds: [metId],
          catalog: "metrics",
        });
      }
    }

    // Check: capability references non-existent parent
    const capIds = new Set(Object.keys(els.capabilities || {}));
    for (const [capId, cap] of Object.entries(els.capabilities || {})) {
      const c = cap as any;
      if (c.parentId && !capIds.has(c.parentId)) {
        issues.push({
          id: `broken-parent-${capId}`,
          severity: "error",
          message: `Capability "${c.name || capId}" references non-existent parent "${c.parentId}"`,
          elementIds: [capId],
          catalog: "capabilities",
        });
      }
    }

    set({ validationIssues: issues });
  },

  dismissIssue: (issueId) => {
    set((state) => ({
      validationIssues: state.validationIssues.map((i) =>
        i.id === issueId ? { ...i, dismissed: true } : i
      ),
    }));
  },

  applyFix: (issueId) => {
    const { validationIssues } = get();
    const issue = validationIssues.find((i) => i.id === issueId);
    if (issue?.suggestedFix) {
      get().applyEdits(issue.suggestedFix);
      get().dismissIssue(issueId);
    }
  },
}));
