import { useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { useModuleFeatures } from "../hooks/useModuleFeatures.ts";
import { useProjectStore } from "../store/project-store.ts";
import { useThemeStore } from "../store/theme-store.ts";

type GuideState = "empty" | "network" | "workbench" | "stage-no-assessment" | "stage-assessed" | "stage-enriched";

function deriveGuideState(
  viewMode: string,
  isLoaded: boolean,
  hasAssessment: boolean,
  isEnriched: boolean,
): GuideState {
  if (!isLoaded) return "empty";
  if (viewMode === "workbench") return "workbench";
  if (viewMode === "network") return "network";
  if (viewMode === "stage" && !hasAssessment) return "stage-no-assessment";
  if (viewMode === "stage" && hasAssessment && !isEnriched) return "stage-assessed";
  if (viewMode === "stage" && isEnriched) return "stage-enriched";
  return "empty";
}

interface GuideContent {
  where: string;
  what: string;
  next: string[];
}

/** Build the guide content based on current state and active module features */
function getGuideContent(
  state: GuideState,
  features: { friction: boolean; solutions: boolean; userStories: boolean; mvcCards: boolean },
  moduleName: string | null,
): GuideContent {
  const moduleLabel = moduleName
    ? ({
        "sales-discovery": "Solution Engineering",
        "board-diagnostic": "Board Diagnostic",
        "transformation": "Transformation Planning",
        "mvc": "Agentic Governance",
      }[moduleName] ?? moduleName)
    : null;

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
function getProgressSteps(features: { solutions: boolean; userStories: boolean; mvcCards: boolean }) {
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

/** Guide content for the Create New Project flow */
const CREATING_PROJECT_CONTENT: GuideContent = {
  where: "Creating a New Project",
  what: "You're setting up a new project. Follow the three steps above to give it a name, choose a use case module, and create it.",
  next: [
    "Step 1: Enter a name that describes the business or engagement you're modelling",
    "Step 2: Pick the module that matches your goal — each one enables different tools and outputs",
    "Step 3: Hit 'Create Project' to begin, or 'Import Bundle' if you have an existing file to load",
  ],
};

/** Guide content for Discovery Intake — Provide Content tab */
const INTAKE_PROVIDE_CONTENT: GuideContent = {
  where: "Discovery Intake — Provide Content",
  what: "This is where you feed the model its raw material. Paste in or upload any content that describes the business you're modelling — the richer the input, the better the generated operating model.",
  next: [
    "Choose Business or Initiative scope to tailor the model",
    "Paste text directly, or upload files (.docx, .pdf, .xlsx, .csv, .txt, .md)",
    "Hit 'Extract → Fill form' to let the AI parse your content into structured fields",
  ],
};

/** Guide content for Discovery Intake — Fill Form tab */
const INTAKE_FORM_CONTENT: GuideContent = {
  where: "Discovery Intake — Fill Form",
  what: "The structured form captures the key dimensions of the business: organisation details, value streams with stages, roles, and friction observations. You can fill this manually or let the extraction populate it for you.",
  next: [
    "Review and complete the Organisation section — company name, industry, and description",
    "Define at least one Value Stream with its stages and zone",
    "Add Roles and any known Friction observations, then hit Generate to build your model",
  ],
};

export function UserGuidePanel() {
  const { viewMode, scaffoldData, heatmapsByVs, canvasViewModel, enrichVersion } = useCanvasStore();
  const features = useModuleFeatures();
  const currentModule = useProjectStore((s) => s.currentModule);
  const isCreatingProject = useProjectStore((s) => s.isCreatingProject);
  const intakeTab = useProjectStore((s) => s.intakeTab);
  const [collapsed, setCollapsed] = useState(true);

  const isLoaded = !!scaffoldData;
  const isIntake = viewMode === "intake";
  const currentVsId = canvasViewModel?.valueStreamId ?? null;
  const hasAssessment = currentVsId
    ? heatmapsByVs.has(currentVsId)
    : heatmapsByVs.size > 0;
  const isEnriched = (enrichVersion ?? 0) > 0;

  const state = deriveGuideState(viewMode, isLoaded, hasAssessment, isEnriched);
  const content = isCreatingProject
    ? CREATING_PROJECT_CONTENT
    : isIntake && intakeTab === "form"
      ? INTAKE_FORM_CONTENT
      : isIntake && intakeTab === "provide"
        ? INTAKE_PROVIDE_CONTENT
        : getGuideContent(state, features, currentModule);
  const progressSteps = getProgressSteps(features);
  const isDark = useThemeStore((s) => s.mode) === "dark";

  return (
    <div className={`fixed bottom-4 z-40 w-64 rounded-xl border shadow-lg ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`} style={{ left: 56 }}>
      {/* Header */}
      <div
        className={`flex cursor-pointer items-center justify-between rounded-t-xl border-b px-3 py-2 ${isDark ? "border-slate-700 bg-slate-700/80" : "border-gray-100 bg-gray-50/80"}`}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-vcc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}>Guide</span>
        </div>
        <svg
          className={`h-3 w-3 ${isDark ? "text-slate-500" : "text-gray-400"} transition-transform ${collapsed ? "" : "rotate-180"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* Where you are */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-vcc-500 mb-1">
              Where you are
            </p>
            <p className={`text-[11px] font-semibold ${isDark ? "text-slate-200" : "text-vcc-800"}`}>{content.where}</p>
          </div>

          {/* What you're looking at */}
          <div>
            <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"} mb-1`}>
              What you see
            </p>
            <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-gray-600"}`}>{content.what}</p>
          </div>

          {/* Next steps */}
          {content.next.length > 0 && (
            <div>
              <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"} mb-1.5`}>
                Next steps
              </p>
              <ul className="space-y-1.5">
                {content.next.map((step, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 flex-shrink-0 text-[9px] font-bold text-vcc-400">{"\u2192"}</span>
                    <span className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-gray-600"}`}>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step progress dots */}
          <div className={`flex items-center justify-center gap-1.5 pt-1 border-t ${isDark ? "border-slate-700" : "border-gray-100"}`}>
            {progressSteps.map(({ label, state: stepState }, i) => {
              const allStates: GuideState[] = progressSteps.map(s => s.state);
              const currentIdx = allStates.indexOf(state) !== -1 ? allStates.indexOf(state) : -1;
              const isActive = state === stepState ||
                (state === "stage-no-assessment" && stepState === "stage-assessed");
              const isPast = currentIdx > i;
              return (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors
                    ${isPast ? "bg-emerald-400" : isActive ? "bg-vcc-500" : isDark ? "bg-slate-600" : "bg-gray-200"}`} />
                  <span className={`text-[8px] ${isActive ? "text-vcc-500 font-semibold" : isPast ? "text-emerald-500" : isDark ? "text-slate-500" : "text-gray-300"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
