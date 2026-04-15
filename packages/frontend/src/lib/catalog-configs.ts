// Catalog configuration definitions for the Op Model Workbench
// Each catalog maps to a scaffold element type with specific grid columns

import type { CatalogType } from "../store/workbench-store";

export interface CatalogConfig {
  id: CatalogType;
  label: string;
  icon: string;           // emoji for now, Lucide later
  scaffoldKey: string;     // key in scaffold.elements
  description: string;
  qualityContribution: string;
  columns: CatalogColumnDef[];
}

export interface CatalogColumnDef {
  id: string;
  header: string;
  accessorKey?: string;     // direct field on element
  accessorFn?: string;      // named accessor function (resolved at render time)
  editable: boolean;
  editType?: "text" | "dropdown" | "multi-select" | "number" | "chip-input";
  dropdownOptions?: string[] | "dynamic";
  width?: string;
  pinned?: boolean;
  monospace?: boolean;
}

// ── Catalog Definitions ──

export const CATALOG_CONFIGS: Record<CatalogType, CatalogConfig> = {
  capabilities: {
    id: "capabilities",
    label: "Capabilities",
    icon: "🏛",
    scaffoldKey: "capabilities",
    description: "Business capabilities — what the organisation can do",
    qualityContribution: "Foundational — highest single-edit impact",
    columns: [
      { id: "name", header: "Name", accessorKey: "name", editable: true, editType: "text", width: "30%", pinned: true },
      { id: "level", header: "Level", accessorKey: "level", editable: true, editType: "dropdown", dropdownOptions: ["1", "2", "3", "4"], width: "7%" },
      { id: "parentId", header: "Parent", accessorKey: "parentId", editable: true, editType: "dropdown", dropdownOptions: "dynamic", width: "18%" },
      { id: "type", header: "Type", accessorFn: "capabilityType", editable: true, editType: "dropdown", dropdownOptions: ["Execution", "Governance"], width: "10%" },
      { id: "businessObject", header: "Business Object", accessorKey: "businessObject", editable: true, editType: "text", width: "14%" },
      { id: "stageCount", header: "Stages", accessorFn: "capabilityStageCount", editable: false, width: "8%" },
      { id: "description", header: "Description", accessorKey: "description", editable: true, editType: "text", width: "13%" },
    ],
  },

  valueStreams: {
    id: "valueStreams",
    label: "Value Streams",
    icon: "🔄",
    scaffoldKey: "valueStreams",
    description: "End-to-end delivery flows — how the organisation creates value",
    qualityContribution: "Delivery narrative — fixes how value flows",
    columns: [
      { id: "name", header: "Name", accessorKey: "name", editable: true, editType: "text", width: "25%", pinned: true },
      { id: "description", header: "Description", accessorKey: "description", editable: true, editType: "text", width: "30%" },
      { id: "stageCount", header: "Stages", accessorFn: "vsStageCount", editable: false, width: "8%" },
      { id: "triggerOutcome", header: "Trigger → Outcome", accessorFn: "vsTriggerOutcome", editable: false, width: "22%" },
      { id: "tags", header: "Tags", accessorKey: "tags", editable: true, editType: "chip-input", width: "15%" },
    ],
  },

  activities: {
    id: "activities",
    label: "Stages",
    icon: "📋",
    scaffoldKey: "activities",
    description: "Value stream stages — the ordered steps that transform value",
    qualityContribution: "Cross-reference accuracy — correct cap-to-stage mapping",
    columns: [
      { id: "vsName", header: "Value Stream", accessorFn: "activityVsName", editable: false, width: "15%" },
      { id: "name", header: "Stage Name", accessorKey: "name", editable: true, editType: "text", width: "20%", pinned: true },
      { id: "preOutcome", header: "Entry State", accessorFn: "activityPreOutcome", editable: false, width: "12%" },
      { id: "postOutcome", header: "Exit State", accessorFn: "activityPostOutcome", editable: false, width: "12%" },
      { id: "performedBy", header: "Performed By", accessorFn: "activityPerformedBy", editable: false, width: "15%" },
      { id: "capCount", header: "Capabilities", accessorFn: "activityCapCount", editable: false, width: "10%" },
      { id: "description", header: "Description", accessorKey: "description", editable: true, editType: "text", width: "16%" },
    ],
  },

  concepts: {
    id: "concepts",
    label: "Concepts",
    icon: "🔷",
    scaffoldKey: "concepts",
    description: "Business concepts — the ontological classes the organisation manages",
    qualityContribution: "Ontological — fixes what the org manages and how classes relate",
    columns: [
      { id: "name", header: "Name", accessorKey: "name", editable: true, editType: "text", width: "22%", pinned: true },
      { id: "type", header: "Triad", accessorKey: "type", editable: true, editType: "dropdown", dropdownOptions: ["Party", "Record", "Resource"], width: "9%" },
      { id: "definition", header: "Definition", accessorFn: "conceptDefinition", editable: true, editType: "text", width: "30%" },
      { id: "lifecycleCount", header: "Lifecycle", accessorFn: "conceptLifecycleCount", editable: false, width: "8%" },
      { id: "relCount", header: "Relations", accessorFn: "conceptRelationCount", editable: false, width: "8%" },
      { id: "capCount", header: "Capabilities", accessorFn: "conceptCapabilityCount", editable: false, width: "10%" },
      { id: "elementType", header: "Type", accessorKey: "elementType", editable: false, width: "10%", monospace: true },
    ],
  },

  informationObjects: {
    id: "informationObjects",
    label: "Information Objects",
    icon: "📄",
    scaffoldKey: "informationObjects",
    description: "Data artefacts and records managed across value streams",
    qualityContribution: "Data clarity — what information flows through the model",
    columns: [
      { id: "name", header: "Name", accessorKey: "name", editable: true, editType: "text", width: "25%", pinned: true },
      { id: "description", header: "Description", accessorKey: "description", editable: true, editType: "text", width: "35%" },
      { id: "lifecycleCount", header: "Lifecycle States", accessorFn: "conceptLifecycleCount", editable: false, width: "12%" },
      { id: "activityCount", header: "Activities", accessorFn: "infoObjectActivityCount", editable: false, width: "10%" },
      { id: "elementType", header: "Type", accessorKey: "elementType", editable: false, width: "12%", monospace: true },
    ],
  },

  technologyApps: {
    id: "technologyApps",
    label: "Systems",
    icon: "💻",
    scaffoldKey: "technologyApps",
    description: "Technology applications and systems supporting capabilities",
    qualityContribution: "Technology landscape — what systems enable the operating model",
    columns: [
      { id: "name", header: "Name", accessorKey: "name", editable: true, editType: "text", width: "25%", pinned: true },
      { id: "vendor", header: "Vendor", accessorKey: "vendor", editable: true, editType: "text", width: "15%" },
      { id: "category", header: "Category", accessorKey: "category", editable: true, editType: "text", width: "15%" },
      { id: "description", header: "Description", accessorKey: "description", editable: true, editType: "text", width: "30%" },
      { id: "elementType", header: "Type", accessorKey: "elementType", editable: false, width: "10%", monospace: true },
    ],
  },

  roles: {
    id: "roles",
    label: "Roles",
    icon: "👤",
    scaffoldKey: "roles",
    description: "Performers and stakeholders",
    qualityContribution: "Responsibility clarity — who does what",
    columns: [
      { id: "name", header: "Name", accessorKey: "name", editable: true, editType: "text", width: "25%", pinned: true },
      { id: "description", header: "Description", accessorKey: "description", editable: true, editType: "text", width: "35%" },
      { id: "activityCount", header: "Activities", accessorFn: "roleActivityCount", editable: false, width: "10%" },
      { id: "elementType", header: "Type", accessorKey: "elementType", editable: false, width: "10%", monospace: true },
    ],
  },

  metrics: {
    id: "metrics",
    label: "Metrics",
    icon: "📊",
    scaffoldKey: "metrics",
    description: "KPIs and measurements",
    qualityContribution: "Measurement accuracy — what gets tracked",
    columns: [
      { id: "name", header: "Name", accessorKey: "name", editable: true, editType: "text", width: "25%", pinned: true },
      { id: "unit", header: "Unit", accessorKey: "unit", editable: true, editType: "text", width: "12%" },
      { id: "direction", header: "Direction", accessorKey: "direction", editable: true, editType: "dropdown", dropdownOptions: ["Decrease", "Increase", "Attain", "Maintain"], width: "12%" },
      { id: "currentMeasure", header: "Current", accessorKey: "currentMeasure", editable: true, editType: "number", width: "10%" },
      { id: "targetMeasure", header: "Target", accessorKey: "targetMeasure", editable: true, editType: "number", width: "10%" },
      { id: "description", header: "Description", accessorKey: "description", editable: true, editType: "text", width: "20%" },
    ],
  },
};

export const ALL_CATALOGS: CatalogType[] = [
  "capabilities",
  "valueStreams",
  "activities",
  "concepts",
  "informationObjects",
  "technologyApps",
  "roles",
  "metrics",
];

// ── Accessor functions ──
// These resolve derived fields that aren't direct scaffold properties.
// Called at render time with (element, scaffoldData).

export function resolveAccessor(
  fnName: string,
  element: any,
  scaffoldData: any
): string | number {
  switch (fnName) {
    case "capabilityType": {
      const tags = element.tags || [];
      if (tags.includes("governance")) return "Governance";
      return "Execution";
    }

    case "capabilityStageCount": {
      const activities = Object.values(scaffoldData?.elements?.activities || {}) as any[];
      return activities.filter((a) =>
        a.enabledByCapabilityIds?.includes(element.id) ||
        a.requiresCapabilityIds?.includes(element.id)
      ).length;
    }

    case "vsStageCount":
      return element.activityIds?.length || 0;

    case "vsTriggerOutcome": {
      const acts = element.activityIds || [];
      if (acts.length === 0) return "—";
      const outcomes = scaffoldData?.elements?.outcomes || {};
      const firstAct = scaffoldData?.elements?.activities?.[acts[0]];
      const lastAct = scaffoldData?.elements?.activities?.[acts[acts.length - 1]];
      const trigger = outcomes[firstAct?.preOutcomeId]?.name || "?";
      const outcome = outcomes[lastAct?.postOutcomeId]?.name || "?";
      return `${trigger} → ${outcome}`;
    }

    case "activityVsName": {
      const valueStreams = Object.values(scaffoldData?.elements?.valueStreams || {}) as any[];
      const vs = valueStreams.find((v) => v.activityIds?.includes(element.id));
      return vs?.name || "—";
    }

    case "activityPreOutcome": {
      const outcomes = scaffoldData?.elements?.outcomes || {};
      return outcomes[element.preOutcomeId]?.name || element.preOutcomeId || "—";
    }

    case "activityPostOutcome": {
      const outcomes = scaffoldData?.elements?.outcomes || {};
      return outcomes[element.postOutcomeId]?.name || element.postOutcomeId || "—";
    }

    case "activityPerformedBy": {
      const roles = scaffoldData?.elements?.roles || {};
      return (element.performedByRoleIds || [])
        .map((rid: string) => roles[rid]?.name || rid)
        .join(", ") || "—";
    }

    case "activityCapCount":
      return element.requiresCapabilityIds?.length || 0;

    case "conceptLifecycleCount":
      return element.lifecycleStates?.length || 0;

    case "roleActivityCount": {
      const activities = Object.values(scaffoldData?.elements?.activities || {}) as any[];
      return activities.filter((a) =>
        a.performedByRoleIds?.includes(element.id)
      ).length;
    }

    case "conceptDefinition":
      return element.definition ?? element.description ?? "—";

    case "conceptRelationCount":
      return (element.relationships?.length ?? 0) + (element.relatedConceptIds?.length ?? 0);

    case "conceptCapabilityCount":
      return element.anchorCapabilityIds?.length ?? element.relatedCapabilityIds?.length ?? 0;

    case "infoObjectActivityCount": {
      const acts = Object.values(scaffoldData?.elements?.activities || {}) as any[];
      return acts.filter((a) =>
        a.informationObjectIds?.includes(element.id)
      ).length;
    }

    default:
      return "—";
  }
}
