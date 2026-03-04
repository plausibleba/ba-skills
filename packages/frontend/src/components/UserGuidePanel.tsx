import { useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";

type GuideState = "empty" | "network" | "stage-no-assessment" | "stage-assessed" | "stage-enriched";

function deriveGuideState(
  viewMode: string,
  isLoaded: boolean,
  hasAssessment: boolean,
  isEnriched: boolean,
): GuideState {
  if (!isLoaded) return "empty";
  if (viewMode === "network") return "network";
  if (viewMode === "stage" && !hasAssessment) return "stage-no-assessment";
  if (viewMode === "stage" && hasAssessment && !isEnriched) return "stage-assessed";
  if (viewMode === "stage" && isEnriched) return "stage-enriched";
  return "empty";
}

const GUIDE_CONTENT: Record<GuideState, {
  where: string;
  what: string;
  next: string[];
}> = {
  empty: {
    where: "Welcome",
    what: "No model loaded. Start by running a discovery intake from your notes, or load an existing VCC scaffold.",
    next: ["Click '+ New Discovery' to paste discovery notes", "Or load a saved VCC Bundle JSON file"],
  },
  network: {
    where: "Step 2 — Network View",
    what: "You're looking at the value stream network — how your client's operating model connects end to end. Each node shows the stream name, stage count, and friction signal.",
    next: ["Click any node to enter the Stage view for that stream", "Nodes with a red border have friction observations"],
  },
  "stage-no-assessment": {
    where: "Step 3 — Stage View",
    what: "You're looking at the stage-by-stage flow for this value stream, including entry/exit states, roles, and metrics. No friction assessment has been run yet.",
    next: ["Click '▶ Run new' under Assess Friction to identify friction points", "Or load a previously saved assessment with '↑ Load previous'"],
  },
  "stage-assessed": {
    where: "Step 3 — Friction Assessed",
    what: "Friction observations have been loaded. Stages with observations are highlighted — the binding constraint stage is shown in red. Click any highlighted stage to open the Friction Panel.",
    next: ["Click a highlighted stage to review friction observations and binding constraint", "Edit observations directly in the Friction Panel if needed", "When ready, click '▶ Run new' under Enrich Solutions to map technology features"],
  },
  "stage-enriched": {
    where: "Step 4 — Solutions Enriched",
    what: "Technology feature recommendations have been mapped to each friction observation. Click any highlighted stage and expand the Solutions section in the Friction Panel to review.",
    next: ["Click a highlighted stage to open the Friction Panel", "Expand 'Solutions' under each observation to see feature recommendations", "Download the edited heatmap to save your assessment"],
  },
};

export function UserGuidePanel() {
  const { viewMode, scaffoldData, heatmapsByVs, canvasViewModel, enrichVersion } = useCanvasStore();
  const [collapsed, setCollapsed] = useState(false);

  const isLoaded = !!scaffoldData;
  const currentVsId = canvasViewModel?.valueStreamId ?? null;
  const hasAssessment = currentVsId
    ? heatmapsByVs.has(currentVsId)
    : heatmapsByVs.size > 0;
  const isEnriched = (enrichVersion ?? 0) > 0;

  const state = deriveGuideState(viewMode, isLoaded, hasAssessment, isEnriched);
  const content = GUIDE_CONTENT[state];

  return (
    <div className="fixed bottom-4 left-4 z-40 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between rounded-t-xl border-b border-gray-100 bg-gray-50/80 px-3 py-2"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-vcc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">User Guide</span>
        </div>
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
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
              📍 Where you are
            </p>
            <p className="text-[11px] font-semibold text-vcc-800">{content.where}</p>
          </div>

          {/* What you're looking at */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              👁 What you're looking at
            </p>
            <p className="text-[11px] leading-relaxed text-gray-600">{content.what}</p>
          </div>

          {/* Next steps */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              ▶ Next steps
            </p>
            <ul className="space-y-1.5">
              {content.next.map((step, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 flex-shrink-0 text-[9px] font-bold text-vcc-400">→</span>
                  <span className="text-[11px] leading-relaxed text-gray-600">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step progress dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-gray-100">
            {["Discovery", "Network", "Friction", "Solutions"].map((label, i) => {
              const stepStates: GuideState[] = ["empty", "network", "stage-assessed", "stage-enriched"];
              const isActive = state === stepStates[i];
              const isPast = stepStates.indexOf(state) > i;
              return (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors
                    ${isPast ? "bg-emerald-400" : isActive ? "bg-vcc-500" : "bg-gray-200"}`} />
                  <span className={`text-[8px] ${isActive ? "text-vcc-500 font-semibold" : "text-gray-300"}`}>
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
