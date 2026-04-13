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
  | "network"
  | "workbench"
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
