import { useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { AppPhase } from "../store/canvas-store.ts";
import { useModuleFeatures } from "../hooks/useModuleFeatures.ts";
import { useProjectStore } from "../store/project-store.ts";
import { useThemeStore } from "../store/theme-store.ts";
import type { GuideState } from "../lib/guide-content.ts";
import {
  CREATING_PROJECT_CONTENT,
  INTAKE_FORM_CONTENT,
  INTAKE_PROVIDE_CONTENT,
  getGuideContent,
  getProgressSteps,
} from "../lib/guide-content.ts";

/** R-001: Derive guide state from AppPhase (single source of truth) */
function deriveGuideState(
  phase: AppPhase,
  isLoaded: boolean,
  hasAssessment: boolean,
  isEnriched: boolean,
): GuideState {
  if (!isLoaded) return "empty";

  switch (phase.phase) {
    case "workbench":      return "workbench";
    case "network":        return "network";
    case "import":         return "import";
    case "capabilityMap":  return "capabilityMap";
    case "conceptGraph":   return "conceptGraph";
    case "friction":       return "friction";
    case "enrich": {
      const sec = phase.section;
      if (sec === "structure")  return "enrich-structure";
      if (sec === "mapping")    return "enrich-mapping";
      if (sec === "friction")   return "enrich-friction";
      if (sec === "assessment") return "enrich-assessment";
      if (sec === "custom")     return "enrich-custom";
      return "enrich-structure"; // fallback for null section
    }
    case "stage": {
      if (!hasAssessment) return "stage-no-assessment";
      if (!isEnriched)    return "stage-assessed";
      return "stage-enriched";
    }
    default:
      return "empty";
  }
}

export function UserGuidePanel() {
  const { appPhase, scaffoldData, heatmapsByVs, canvasViewModel, enrichVersion } = useCanvasStore();
  const features = useModuleFeatures();
  const currentModule = useProjectStore((s) => s.currentModule);
  const [collapsed, setCollapsed] = useState(true);

  const isLoaded = !!scaffoldData;
  const currentVsId = canvasViewModel?.valueStreamId ?? null;
  const hasAssessment = currentVsId
    ? heatmapsByVs.has(currentVsId)
    : heatmapsByVs.size > 0;
  const isEnriched = (enrichVersion ?? 0) > 0;

  // R-001: Content selection driven by appPhase (single source of truth)
  const state = deriveGuideState(appPhase, isLoaded, hasAssessment, isEnriched);
  const content = appPhase.phase === "creatingProject"
    ? CREATING_PROJECT_CONTENT
    : appPhase.phase === "intake" && appPhase.tab === "form"
      ? INTAKE_FORM_CONTENT
      : appPhase.phase === "intake" && appPhase.tab === "provide"
        ? INTAKE_PROVIDE_CONTENT
        : getGuideContent(state, features, currentModule);
  const progressSteps = getProgressSteps(features);
  const isDark = useThemeStore((s) => s.mode) === "dark";

  return (
    <div className={`fixed bottom-4 z-40 w-64 rounded-xl border shadow-lg ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`} style={{ left: 192 }}>
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
