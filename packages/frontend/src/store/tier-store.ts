/**
 * Tier store — manages user tier, trial status, and use case access.
 *
 * Fetches the user's profile from Supabase (tier, trial_ends_at, active_use_cases)
 * and provides reactive state for the gate check hook.
 *
 * In local mode (no Supabase), defaults to 'individual' — all features unlocked.
 */
import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "../lib/supabase.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Tier = "free" | "trial" | "starter" | "individual" | "team_5" | "team_10";

export type UseCase =
  | "solution_engineering"
  | "board_diagnostic"
  | "transformation_planning"
  | "agentic_governance";

export type GatedAction =
  | "friction_analysis"
  | "solution_enrichment"
  | "add_observation"
  | "edit_observation"
  | "delete_observation"
  | "save_survey"
  | "edit_signals"
  | "upload_vendor_library"
  | "upload_stories"
  | "create_project"
  | "run_discovery"
  | "load_bundle"
  | "export_pdf"
  | "edit_field"
  | "save_assessment"
  | "card_generation"
  | "workshop_session"
  | "scenario_planning";

// Maps gated actions to the use case they belong to (if applicable)
const ACTION_USE_CASE_MAP: Partial<Record<GatedAction, UseCase>> = {
  solution_enrichment: "solution_engineering",
  upload_vendor_library: "solution_engineering",
  upload_stories: "solution_engineering",
  export_pdf: "solution_engineering",
  card_generation: "agentic_governance",
  workshop_session: "transformation_planning",
  scenario_planning: "board_diagnostic",
};

// Actions that are always available to any paid tier (not use-case-specific)
const UNIVERSAL_PAID_ACTIONS: GatedAction[] = [
  "add_observation",
  "edit_observation",
  "delete_observation",
  "save_survey",
  "edit_signals",
  "edit_field",
  "save_assessment",
];

// Actions with special free-tier allowances
const FREE_TIER_ALLOWANCES: Partial<Record<GatedAction, number>> = {
  friction_analysis: 1,   // 1 full run
  load_bundle: 3,          // 3 uploads
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface TierState {
  tier: Tier;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  activeUseCases: UseCase[];
  usageCounts: Record<string, number>; // operation → count
  loaded: boolean;

  // Actions
  initialize: (userId: string) => Promise<void>;
  refreshUsage: (userId: string) => Promise<void>;
  isTrialActive: () => boolean;
  canPerformAction: (action: GatedAction) => boolean;
  getRequiredTier: (action: GatedAction) => { allowed: boolean; reason: string; requiredUseCase?: UseCase };
  logUsage: (userId: string, operation: string, projectId?: string) => Promise<void>;
}

export const useTierStore = create<TierState>((set, get) => ({
  tier: isSupabaseConfigured ? "free" : "individual", // local mode = full access
  trialStartedAt: null,
  trialEndsAt: null,
  activeUseCases: isSupabaseConfigured ? [] : [
    "solution_engineering",
    "board_diagnostic",
    "transformation_planning",
    "agentic_governance",
  ],
  usageCounts: {},
  loaded: !isSupabaseConfigured,

  initialize: async (userId: string) => {
    if (!isSupabaseConfigured) {
      set({ loaded: true });
      return;
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, trial_started_at, trial_ends_at, active_use_cases")
      .eq("id", userId)
      .single();

    if (profile) {
      // Check if trial has expired
      let effectiveTier = profile.tier as Tier;
      if (effectiveTier === "trial" && profile.trial_ends_at) {
        const endsAt = new Date(profile.trial_ends_at);
        if (endsAt < new Date()) {
          effectiveTier = "free";
          // Update server-side too
          await supabase.from("profiles").update({ tier: "free" }).eq("id", userId);
        }
      }

      set({
        tier: effectiveTier,
        trialStartedAt: profile.trial_started_at,
        trialEndsAt: profile.trial_ends_at,
        activeUseCases: (profile.active_use_cases || []) as UseCase[],
        loaded: true,
      });
    } else {
      set({ loaded: true });
    }

    // Fetch usage counts
    await get().refreshUsage(userId);
  },

  refreshUsage: async (userId: string) => {
    if (!isSupabaseConfigured) return;

    const { data } = await supabase
      .from("usage_log")
      .select("operation")
      .eq("user_id", userId);

    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.operation] = (counts[row.operation] || 0) + 1;
      }
      set({ usageCounts: counts });
    }
  },

  isTrialActive: () => {
    const { tier, trialEndsAt } = get();
    if (tier !== "trial") return false;
    if (!trialEndsAt) return false;
    return new Date(trialEndsAt) > new Date();
  },

  canPerformAction: (action: GatedAction) => {
    return get().getRequiredTier(action).allowed;
  },

  getRequiredTier: (action: GatedAction) => {
    const { tier, activeUseCases, usageCounts } = get();

    // Individual/Team: everything allowed
    if (["individual", "team_5", "team_10"].includes(tier)) {
      return { allowed: true, reason: "" };
    }

    // Active trial: everything allowed
    if (tier === "trial" && get().isTrialActive()) {
      return { allowed: true, reason: "" };
    }

    // Starter: check use case
    if (tier === "starter") {
      const requiredUseCase = ACTION_USE_CASE_MAP[action];
      if (requiredUseCase) {
        if (activeUseCases.includes(requiredUseCase)) {
          return { allowed: true, reason: "" };
        }
        return {
          allowed: false,
          reason: `This feature requires the ${formatUseCase(requiredUseCase)} use case.`,
          requiredUseCase,
        };
      }
      // Universal paid actions are allowed for any Starter
      if (UNIVERSAL_PAID_ACTIONS.includes(action)) {
        return { allowed: true, reason: "" };
      }
      // Project creation: always allowed for Starter
      if (action === "create_project" || action === "run_discovery") {
        return { allowed: true, reason: "" };
      }
    }

    // Free tier (or expired trial): check allowances
    const allowance = FREE_TIER_ALLOWANCES[action];
    if (allowance !== undefined) {
      const operationKey = action === "friction_analysis" ? "friction_analysis_run" : action;
      const used = usageCounts[operationKey] || 0;
      if (used < allowance) {
        return { allowed: true, reason: "" };
      }
      return {
        allowed: false,
        reason: action === "friction_analysis"
          ? "You've used your free friction analysis. Start a free trial to run unlimited assessments."
          : "You've reached the free tier limit for this action.",
      };
    }

    // Second project check
    if (action === "create_project") {
      return {
        allowed: false,
        reason: "Free accounts are limited to one project. Start a free trial to create unlimited projects.",
      };
    }

    // Default: blocked on free tier
    return {
      allowed: false,
      reason: tier === "trial"
        ? "Your 15-day trial has ended. Upgrade to continue using this feature."
        : "This feature is available with a VCC subscription. Start your free 15-day trial.",
    };
  },

  logUsage: async (userId: string, operation: string, projectId?: string) => {
    if (!isSupabaseConfigured) return;

    await supabase.from("usage_log").insert({
      user_id: userId,
      project_id: projectId || null,
      operation,
    });

    // Refresh counts
    await get().refreshUsage(userId);
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUseCase(uc: UseCase): string {
  const labels: Record<UseCase, string> = {
    solution_engineering: "Solution Engineering",
    board_diagnostic: "Board Diagnostic",
    transformation_planning: "Transformation Planning",
    agentic_governance: "Agentic Governance",
  };
  return labels[uc] || uc;
}
