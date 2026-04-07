/**
 * useGateCheck — centralised gate enforcement hook.
 *
 * Wraps any action that needs tier checking. Returns an object with:
 *   gate(action, callback)  — execute if allowed, else show upsell
 *   check(action)           — returns { allowed, reason } without executing
 *
 * Usage:
 *   const { gate, check } = useGateCheck();
 *
 *   // In an onClick handler:
 *   gate("friction_analysis", () => runFrictionAssessment());
 *
 *   // Or check without executing:
 *   const { allowed, reason } = check("add_observation");
 */
import { useCallback } from "react";
import { useTierStore, type GatedAction } from "../store/tier-store.ts";
import { useUpsellModal } from "../components/UpsellModal.tsx";

interface GateCheckResult {
  allowed: boolean;
  reason: string;
}

export function useGateCheck() {
  const getRequiredTier = useTierStore((s) => s.getRequiredTier);
  const { show: showUpsell } = useUpsellModal();

  /**
   * Execute an action with gate checking.
   * If the action is allowed, executes the callback.
   * If blocked, shows the upsell modal with a contextual message.
   */
  const gate = useCallback(
    (action: GatedAction, callback: () => void, featureLabel?: string) => {
      const result = getRequiredTier(action);
      if (result.allowed) {
        callback();
      } else {
        showUpsell({
          action,
          reason: result.reason,
          featureLabel: featureLabel || ACTION_LABELS[action] || "this feature",
          requiredUseCase: result.requiredUseCase,
        });
      }
    },
    [getRequiredTier, showUpsell]
  );

  /**
   * Check access without executing — returns { allowed, reason }.
   */
  const check = useCallback(
    (action: GatedAction): GateCheckResult => {
      return getRequiredTier(action);
    },
    [getRequiredTier]
  );

  return { gate, check };
}

// Human-readable labels for each gated action (used in upsell modal)
const ACTION_LABELS: Record<GatedAction, string> = {
  friction_analysis: "Friction Assessment",
  solution_enrichment: "Solutions Enrichment",
  add_observation: "adding friction observations",
  edit_observation: "editing observations",
  delete_observation: "deleting observations",
  save_survey: "saving survey responses",
  edit_signals: "customising structural signals",
  upload_vendor_library: "uploading vendor libraries",
  upload_stories: "uploading customer stories",
  create_project: "creating additional projects",
  run_discovery: "running discovery",
  load_bundle: "importing bundles",
  export_pdf: "exporting PDF reports",
  export_stories: "exporting user stories",
  edit_field: "editing model fields",
  save_assessment: "saving assessments",
  run_assessment: "running friction assessments",
  enrich_solutions: "enriching with vendor solutions",
  create_vendor_library: "creating vendor libraries",
  card_generation: "generating Concept & Policy Cards",
  workshop_session: "Workshop Mode",
  scenario_planning: "Scenario Planning",
  import_observations: "importing observations",
  generate_observations: "generating observations",
};
