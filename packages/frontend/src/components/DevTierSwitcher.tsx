// @ts-nocheck
/**
 * DevTierSwitcher — development-only tier simulation panel.
 *
 * Floats in the bottom-left corner. Lets you flip between tiers and
 * test use case toggles to see the upsell modal in action.
 *
 * Only renders when import.meta.env.DEV is true (Vite dev mode).
 * Stripped from production builds automatically.
 */
import { useState } from "react";
import { useTierStore, type Tier, type UseCase } from "../store/tier-store.ts";
import { useGateCheck } from "../hooks/useGateCheck.ts";

const TIERS: { value: Tier; label: string; desc: string }[] = [
  { value: "free", label: "Free", desc: "Read-only, 1 project, 1 friction run" },
  { value: "trial", label: "Trial", desc: "Full access, 15 days" },
  { value: "starter", label: "Starter", desc: "$20/mo per use case" },
  { value: "individual", label: "Individual", desc: "$50/mo all features" },
  { value: "team_5", label: "Team 5", desc: "$200/mo, 5 seats" },
  { value: "team_10", label: "Team 10", desc: "$350/mo, 10 seats" },
];

const USE_CASES: { value: UseCase; label: string }[] = [
  { value: "solution_engineering", label: "Solution Engineering" },
  { value: "board_diagnostic", label: "Board Diagnostic" },
  { value: "transformation_planning", label: "Transformation Planning" },
  { value: "agentic_governance", label: "Agentic Governance" },
];

const TEST_ACTIONS: { action: string; label: string }[] = [
  { action: "friction_analysis", label: "Run Friction Assessment" },
  { action: "solution_enrichment", label: "Enrich Solutions" },
  { action: "add_observation", label: "Add Observation" },
  { action: "edit_field", label: "Edit Field" },
  { action: "create_project", label: "Create Project" },
  { action: "export_pdf", label: "Export PDF" },
  { action: "card_generation", label: "Generate Cards" },
  { action: "workshop_session", label: "Workshop Mode" },
];

export function DevTierSwitcher() {
  // Only render in dev mode
  if (!import.meta.env.DEV) return null;

  const [expanded, setExpanded] = useState(false);
  const tier = useTierStore((s) => s.tier);
  const trialEndsAt = useTierStore((s) => s.trialEndsAt);
  const activeUseCases = useTierStore((s) => s.activeUseCases);
  const { gate } = useGateCheck();

  const setTier = (newTier: Tier) => {
    useTierStore.setState({
      tier: newTier,
      // If trial, set ends_at to future; if simulating expired, set to past
      trialEndsAt: newTier === "trial"
        ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        : trialEndsAt,
      // Individual/Team get all use cases
      activeUseCases: ["individual", "team_5", "team_10"].includes(newTier)
        ? ["solution_engineering", "board_diagnostic", "transformation_planning", "agentic_governance"]
        : activeUseCases,
    });
  };

  const toggleUseCase = (uc: UseCase) => {
    const current = useTierStore.getState().activeUseCases;
    if (current.includes(uc)) {
      useTierStore.setState({ activeUseCases: current.filter((u) => u !== uc) });
    } else {
      useTierStore.setState({ activeUseCases: [...current, uc] });
    }
  };

  const simulateExpiredTrial = () => {
    useTierStore.setState({
      tier: "trial",
      trialEndsAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    });
  };

  const isTrialExpired = tier === "trial" && trialEndsAt && new Date(trialEndsAt) < new Date();

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 left-4 z-[9000] flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1.5 text-[10px] font-medium text-white shadow-lg hover:bg-gray-800"
        title="Dev: Tier switcher"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        {tier}{isTrialExpired ? " (expired)" : ""}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9000] w-72 rounded-xl border border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Dev Tier Switcher</span>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Tier selector */}
        <div>
          <label className="mb-1 block text-[9px] font-semibold uppercase tracking-widest text-gray-400">Tier</label>
          <div className="grid grid-cols-3 gap-1">
            {TIERS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTier(t.value)}
                className={`rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  tier === t.value && !isTrialExpired
                    ? "bg-indigo-600 text-white"
                    : tier === t.value && isTrialExpired
                    ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={t.desc}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Expired trial toggle */}
          <button
            onClick={simulateExpiredTrial}
            className="mt-1 w-full rounded-md bg-red-50 px-2 py-1 text-[9px] font-medium text-red-600 hover:bg-red-100"
          >
            Simulate expired trial
          </button>
        </div>

        {/* Use cases (only relevant for Starter) */}
        {tier === "starter" && (
          <div>
            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-widest text-gray-400">
              Active Use Cases (Starter)
            </label>
            <div className="space-y-1">
              {USE_CASES.map((uc) => (
                <label
                  key={uc.value}
                  className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5 cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={activeUseCases.includes(uc.value)}
                    onChange={() => toggleUseCase(uc.value)}
                    className="h-3 w-3 rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-[10px] text-gray-700">{uc.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Test actions */}
        <div>
          <label className="mb-1 block text-[9px] font-semibold uppercase tracking-widest text-gray-400">
            Test Gated Actions
          </label>
          <div className="grid grid-cols-2 gap-1">
            {TEST_ACTIONS.map((ta) => (
              <button
                key={ta.action}
                onClick={() => gate(ta.action as any, () => {
                  console.log(`[Dev] Action "${ta.action}" was ALLOWED`);
                })}
                className="rounded-md bg-gray-50 px-2 py-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 text-left"
              >
                {ta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current state summary */}
        <div className="rounded-md bg-gray-50 p-2">
          <p className="text-[9px] text-gray-500">
            <span className="font-bold">Tier:</span> {tier}
            {isTrialExpired ? " (EXPIRED)" : ""}
            {tier === "trial" && !isTrialExpired ? ` (ends ${new Date(trialEndsAt!).toLocaleDateString()})` : ""}
          </p>
          {tier === "starter" && (
            <p className="text-[9px] text-gray-500">
              <span className="font-bold">Use cases:</span>{" "}
              {activeUseCases.length > 0 ? activeUseCases.join(", ") : "none"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
