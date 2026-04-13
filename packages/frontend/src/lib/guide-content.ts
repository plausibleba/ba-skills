/**
 * User Guide Panel Content (R-003)
 *
 * All guide copy lives here — the component just renders.
 * Keyed by AppPhase + GuideState so adding a new page means
 * adding an entry here, not touching UserGuidePanel.tsx.
 */

import type { ModuleFeatures } from "./module-registry.ts";
import { getModuleLabel } from "./module-registry.ts";

export type GuideState =
  | "empty"
  | "import"
  | "network"
  | "workbench"
  | "capabilityMap"
  | "conceptGraph"
  | "friction"
  | "enrich-structure"
  | "enrich-mapping"
  | "enrich-friction"
  | "enrich-assessment"
  | "enrich-custom"
  | "stage-no-assessment"
  | "stage-assessed"
  | "stage-enriched";

export interface GuideContent {
  where: string;
  what: string;
  next: string[];
}

// ── Phase-specific content (before main state machine) ──────────────

export const CREATING_PROJECT_CONTENT: GuideContent = {
  where: "Creating a New Project",
  what: "You're setting up a new project. Follow the three steps above to give it a name, choose a use case module, and create it.",
  next: [
    "Step 1: Enter a name that describes the business or engagement you're modelling",
    "Step 2: Pick the module that matches your goal — each one enables different tools and outputs",
    "Step 3: Hit 'Create Project' to begin, or 'Import Bundle' if you have an existing file to load",
  ],
};

export const INTAKE_PROVIDE_CONTENT: GuideContent = {
  where: "Discovery Intake — Provide Content",
  what: "This is where you feed the model its raw material. Paste in or upload any content that describes the business you're modelling — the richer the input, the better the generated operating model.",
  next: [
    "Choose Business or Initiative scope to tailor the model",
    "Paste text directly, or upload files (.docx, .pdf, .xlsx, .csv, .txt, .md)",
    "Hit 'Extract → Fill form' to let the AI parse your content into structured fields",
  ],
};

export const INTAKE_FORM_CONTENT: GuideContent = {
  where: "Discovery Intake — Fill Form",
  what: "The structured form captures the key dimensions of the business: organisation details, value streams with stages, roles, and friction observations. You can fill this manually or let the extraction populate it for you.",
  next: [
    "Review and complete the Organisation section — company name, industry, and description",
    "Define at least one Value Stream with its stages and zone",
    "Add Roles and any known Friction observations, then hit Generate to build your model",
  ],
};

// ── Main state-driven content ───────────────────────────────────────

/** Build the guide content based on current state and active module features */
export function getGuideContent(
  state: GuideState,
  features: ModuleFeatures,
  moduleName: string | null,
): GuideContent {
  const moduleLabel = moduleName ? getModuleLabel(moduleName) : null;

  switch (state) {
    case "empty":
      return {
        where: "Getting Started",
        what: "You don't have a model loaded yet. You can create one from scratch by pasting in business documentation, or load an existing bundle you've previously saved.",
        next: [
          "Click 'New Project' to start a fresh operating model",
          "Or use 'Quick Discovery' to jump straight in — your work saves automatically",
          "You can also drag and drop a .json bundle file to load previous work",
        ],
      };

    case "network":
      return {
        where: "Network View — Operating Model",
        what: "This is your value stream network — a map of how the business operates end to end. Each node represents a value stream with its stages, roles, and capabilities.",
        next: [
          "Click any value stream node to drill into its stage-by-stage detail",
          "Nodes with a red border have friction observations from a previous assessment",
          "Open the Op Model Workbench to review and refine your operating model catalogs",
          ...(features.mvcCards
            ? ["Look for Concept and Policy Card indicators on each value stream"]
            : []),
        ],
      };

    case "workbench":
      return {
        where: "Op Model Workbench — Refinement Engine",
        what: "The Workbench is where Business Architects review and refine the structural foundations of the operating model. It provides editable catalogs for capabilities, value streams, activities, concepts, roles, and metrics — plus an AI refinement agent that proposes structural changes in response to natural language feedback.",
        next: [
          "Use the Catalog or Graph Explorer view to browse and directly edit elements in each catalog",
          "Switch catalogs with the dropdown — they're sorted alphabetically",
          "Open the Refinement Agent sidebar to describe changes in plain English",
          "The agent proposes structured diffs (add, modify, delete, merge, split, move) you can accept or reject",
          "Use Graph Explorer to visualise cross-catalog relationships",
          "When done editing, click Reconcile to run cross-catalog validation checks",
          "Finally, Apply commits your changes back to the project model",
        ],
      };

    case "import":
      return {
        where: "Import Model",
        what: "Import an existing reference model or PlausibleBA bundle into a new project. You can load a Guild Reference Model, a previously saved VCC bundle, or individual PlausibleBA artifacts (Capability Map, Concept Model, Value Stream).",
        next: [
          "Drag and drop a .json file or click to browse",
          "Individual artifacts can be imported incrementally — each one merges into the current model",
          "After import, you'll be taken to the Network View to explore your model",
        ],
      };

    case "capabilityMap":
      return {
        where: "Capability Map",
        what: "The Capability Map shows what the organisation does, organised by business function. Capabilities are grouped hierarchically — L1 business functions contain L2 capabilities, which may contain L3 detail. This is a structural view of organisational ability, independent of how or where it's performed.",
        next: [
          "Toggle between Grid, Stack, and Row layouts to find the view that suits your model",
          "Click any capability to inspect its detail — PPIT breakdown, linked activities, and governance bindings",
          "Use the enrichment builder to generate deeper PPIT decomposition for selected capabilities",
          "Look for governance capabilities highlighted separately — these often carry policy and compliance implications",
        ],
      };

    case "conceptGraph":
      return {
        where: "Concept Graph",
        what: "The Concept Graph visualises the business objects (concepts) your operating model manages and how they relate to each other. Concepts are classified as Parties (who), Records (what gets transitioned), or Resources (what gets consumed). Relationships show cardinality and dependency.",
        next: [
          "Review the concept nodes — each shows its type, key attributes, and lifecycle states",
          "Trace relationships between concepts to understand how business objects depend on each other",
          "Concepts of type Record are particularly important — they drive the lifecycle coupling in your value streams",
          "Use this view to validate that your model captures all the key business objects before enrichment",
        ],
      };

    case "friction":
      return {
        where: "Friction View",
        what: "The Friction view is where you identify and analyse operational bottlenecks across your value streams. It uses a six-category taxonomy to classify where work slows down: execution, information, decision, handoff, compliance, and technology friction.",
        next: [
          "Review the 'How it works' tab for methodology and category definitions",
          "Switch to Observations to see friction points identified per value stream and stage",
          "Use the Survey tab to capture additional friction data from stakeholders",
          "Check the Signals tab to review structural signals that may indicate hidden friction",
        ],
      };

    case "enrich-structure":
      return {
        where: "Enrich — Structure & Depth",
        what: "Structure enrichment adds internal detail to your high-level model elements. It breaks activities into sub-activities, generates PPIT decomposition (People, Process, Information, Technology) for each capability, and creates governance cards where applicable.",
        next: [
          "Run each enrichment type in sequence — sub-activities first, then PPIT, then cards",
          "Review the generated detail before moving on — you can revert any enrichment that doesn't look right",
          "Once structure is enriched, the Cross-Mapping and Assessment views will have more to work with",
        ],
      };

    case "enrich-mapping":
      return {
        where: "Enrich — Cross-Mapping",
        what: "Cross-mapping defines relationships between different dimensions of your model — for example, which capabilities support which stages, or how roles relate to business objects. These mappings strengthen the structural integrity of the operating model.",
        next: [
          "Add mapping pairs by selecting a source and target from different catalogs",
          "Configure semantic properties — symmetry, transitivity, and cardinality — to define how mappings behave",
          "Use inverse mappings to automatically generate the reverse relationship",
          "Cross-mappings feed into the Constraint DAG and topology coupling analysis",
        ],
      };

    case "enrich-friction":
      return {
        where: "Enrich — Friction Analysis",
        what: "Run a friction assessment against your operating model to identify bottlenecks, binding constraints, and areas of operational drag. The analysis uses your model's structure — stages, capabilities, roles, and information flows — to surface friction points.",
        next: [
          "Click 'Run new' to generate a fresh friction analysis across all value streams",
          "Review observations by category — each friction point is classified and evidenced",
          "The binding constraint (biggest bottleneck) is highlighted in red on the stage view",
          "After friction analysis, consider running Solution enrichment to map technology responses",
        ],
      };

    case "enrich-assessment":
      return {
        where: "Enrich — Assessment & Analysis",
        what: "Assessment enrichment evaluates your model through multiple analytical lenses: metrics alignment, dependency analysis, maturity scoring, gap identification, and risk assessment. These overlay insights onto your model without changing its structure.",
        next: [
          "Run each assessment independently — they analyse different dimensions of your model",
          "Review the results to identify areas that need attention before transformation planning",
          "Assessment findings complement friction analysis — friction shows where things slow down, assessment shows why",
          "Use assessment outputs to build the case for investment priorities",
        ],
      };

    case "enrich-custom":
      return {
        where: "Enrich — Custom Skills",
        what: "Custom enrichments let you create domain-specific analysis skills with your own prompts. Use these for compliance checks, vendor assessments, scoring models, or any specialised analysis that the standard enrichments don't cover.",
        next: [
          "Click 'Add Skill' to create a new custom enrichment with a descriptive name",
          "Write a prompt that describes what the skill should analyse and what output you expect",
          "Select which model elements the skill should operate on (value streams, capabilities, concepts, etc.)",
          "Run the skill and review the results — custom skills can be edited and re-run as you refine them",
        ],
      };

    case "stage-no-assessment": {
      const nextSteps = [
        "Click '\u25B6 Run new' under Assess Friction to identify friction points across stages",
        "Review the stages, capabilities, roles, and activities before assessing",
      ];
      if (features.mvcCards) {
        nextSteps.push("Expand the Concept Cards or Policy Cards panels to view governance bindings for each stage");
      }
      return {
        where: "Stage View" + (moduleLabel ? ` — ${moduleLabel}` : ""),
        what: "You're looking at the stage-by-stage flow for this value stream. Each stage shows its entry and exit criteria, participating roles, capabilities, and metrics. No friction assessment has been run yet.",
        next: nextSteps,
      };
    }

    case "stage-assessed": {
      const nextSteps = [
        "Click any highlighted stage to open the Friction Panel and review observations",
        "The binding constraint stage (the biggest bottleneck) is highlighted in red",
      ];
      if (features.solutions) {
        nextSteps.push("When ready, click '\u25B6 Run new' under Enrich Solutions to map technology features to each friction point");
      }
      if (features.userStories) {
        nextSteps.push("Generate User Stories from friction observations for transformation planning");
      }
      if (features.mvcCards) {
        nextSteps.push("Review how Concept and Policy Cards relate to the friction points identified");
      }
      return {
        where: "Friction Assessed" + (moduleLabel ? ` — ${moduleLabel}` : ""),
        what: "Friction observations have been loaded. Highlighted stages have identified friction — the binding constraint (the most critical bottleneck) is shown in red. Click any highlighted stage to review the detail.",
        next: nextSteps,
      };
    }

    case "stage-enriched": {
      const nextSteps: string[] = [];
      if (features.solutions) {
        nextSteps.push("Expand 'Solutions' under each friction observation to see recommended technology features");
      }
      if (features.userStories) {
        nextSteps.push("Review generated User Stories and export to Jira or CSV");
      }
      if (features.mvcCards) {
        nextSteps.push("Review how Concept and Policy Cards align with the enriched friction points and solutions");
      }
      nextSteps.push("Use the download button to save your complete assessment as a bundle");
      return {
        where: "Enriched" + (moduleLabel ? ` — ${moduleLabel}` : ""),
        what: features.solutions
          ? "Technology feature recommendations have been mapped to each friction observation. Click any highlighted stage and expand the relevant section in the Friction Panel to review."
          : features.userStories
            ? "User stories have been generated from friction observations. Click any highlighted stage to review and export."
            : "Your assessment is complete. Click any highlighted stage to review the full analysis.",
        next: nextSteps,
      };
    }

    default:
      return {
        where: "Getting Started",
        what: "Choose an option above to begin.",
        next: [],
      };
  }
}

/** Progress step labels, adapted to the active module */
export function getProgressSteps(features: { solutions: boolean; userStories: boolean; mvcCards: boolean }) {
  const steps: { label: string; state: GuideState }[] = [
    { label: "Discovery", state: "empty" },
    { label: "Network", state: "network" },
    { label: "Friction", state: "stage-assessed" },
  ];
  if (features.solutions) {
    steps.push({ label: "Solutions", state: "stage-enriched" });
  } else if (features.userStories) {
    steps.push({ label: "Stories", state: "stage-enriched" });
  } else if (features.mvcCards) {
    steps.push({ label: "Cards", state: "stage-enriched" });
  } else {
    steps.push({ label: "Complete", state: "stage-enriched" });
  }
  return steps;
}
