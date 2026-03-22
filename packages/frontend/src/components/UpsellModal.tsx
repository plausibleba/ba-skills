/**
 * UpsellModal — contextual upgrade prompt.
 *
 * Shown when a free/expired-trial user attempts a gated action.
 * The modal names the specific feature they tried to use and provides
 * a clear path to start a free trial or upgrade.
 *
 * Design principles:
 * - Feels like unlocking a door, not hitting a wall
 * - Contextual — message relates to what they were trying to do
 * - Clean, not aggressive
 * - Single CTA: "Start free trial" auto-activates 15 days
 *
 * Phase 1: Auto-activate trial (updates profile tier in Supabase)
 * Phase 2: Replace expired-trial/upgrade CTAs with Stripe checkout
 */
import { useState, useCallback, createContext, useContext } from "react";
import { useTierStore, type GatedAction, type UseCase } from "../store/tier-store.ts";
import { useAuthStore } from "../store/auth-store.ts";

// ─── Modal state context ──────────────────────────────────────────────────────

interface UpsellConfig {
  action: GatedAction;
  reason: string;
  featureLabel: string;
  requiredUseCase?: UseCase;
}

interface UpsellModalContextValue {
  show: (config: UpsellConfig) => void;
  hide: () => void;
  config: UpsellConfig | null;
  visible: boolean;
}

const UpsellModalContext = createContext<UpsellModalContextValue>({
  show: () => {},
  hide: () => {},
  config: null,
  visible: false,
});

export function useUpsellModal() {
  return useContext(UpsellModalContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UpsellModalProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<UpsellConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback((cfg: UpsellConfig) => {
    setConfig(cfg);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setTimeout(() => setConfig(null), 300); // clear after animation
  }, []);

  return (
    <UpsellModalContext.Provider value={{ show, hide, config, visible }}>
      {children}
      {visible && config && <UpsellModalOverlay config={config} onClose={hide} />}
    </UpsellModalContext.Provider>
  );
}

// ─── Modal component ──────────────────────────────────────────────────────────

const USE_CASE_LABELS: Record<UseCase, string> = {
  solution_engineering: "Solution Engineering",
  board_diagnostic: "Board Diagnostic",
  transformation_planning: "Transformation Planning",
  agentic_governance: "Agentic Governance",
};

function UpsellModalOverlay({
  config,
  onClose,
}: {
  config: UpsellConfig;
  onClose: () => void;
}) {
  const tier = useTierStore((s) => s.tier);
  const trialEndsAt = useTierStore((s) => s.trialEndsAt);
  const activateTrial = useTierStore((s) => s.activateTrial);
  const user = useAuthStore((s) => s.user);

  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpiredTrial =
    tier === "trial" && trialEndsAt && new Date(trialEndsAt) < new Date();
  const isFree = tier === "free";
  const isStarter = tier === "starter";

  // Can we offer a trial? Only for free users (never had a trial) or local mode.
  // Expired trials need to upgrade (they've already used their trial).
  const canStartTrial = isFree && !isExpiredTrial;

  // Determine messaging based on tier
  let headline = "";
  let body = "";
  let ctaText = "";

  if (isExpiredTrial) {
    headline = "Your free trial has ended";
    body = `Upgrade to keep using ${config.featureLabel} and continue building on your operating model.`;
    ctaText = "Contact us to upgrade";
  } else if (isStarter && config.requiredUseCase) {
    const ucLabel = USE_CASE_LABELS[config.requiredUseCase] || config.requiredUseCase;
    headline = `${ucLabel} use case required`;
    body = `${config.featureLabel} is part of the ${ucLabel} module. Contact us to add it to your subscription.`;
    ctaText = "Contact us to upgrade";
  } else if (isFree) {
    headline = `Unlock ${config.featureLabel}`;
    body = `Start your free 15-day trial to access ${config.featureLabel} and all VCC features. No credit card required.`;
    ctaText = "Start free trial";
  } else {
    headline = `Upgrade to access ${config.featureLabel}`;
    body = config.reason || `This feature requires a VCC subscription.`;
    ctaText = "Contact us to upgrade";
  }

  const handleStartTrial = async () => {
    const userId = user?.id;
    if (!userId) {
      setError("You need to be signed in to start a trial.");
      return;
    }

    setActivating(true);
    setError(null);

    const result = await activateTrial(userId);

    if (result.success) {
      setActivated(true);
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
    setActivating(false);
  };

  const handleActivatedClose = () => {
    onClose();
    // The tier store is already updated — the gate check will now pass
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
          <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-900">{headline}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>

        {/* Feature list (free/expired users, before activation) */}
        {(isFree || isExpiredTrial) && !activated && (
          <div className="mt-5 rounded-lg bg-gray-50 p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              What you'll unlock
            </p>
            <div className="space-y-1.5">
              {[
                "Unlimited friction assessments",
                "Add and edit observations",
                "Solutions enrichment with vendor libraries",
                "PDF export and reporting",
                "Unlimited projects",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA area */}
        <div className="mt-6">
          {activated ? (
            /* ── Trial activated success ── */
            <div className="rounded-xl bg-emerald-50 p-5 text-center">
              <svg className="mx-auto mb-2 h-8 w-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-emerald-800">Trial activated</p>
              <p className="mt-1 text-xs text-emerald-600">You have 15 days of full access. No credit card required.</p>
              <button
                onClick={handleActivatedClose}
                className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Continue
              </button>
            </div>
          ) : canStartTrial ? (
            /* ── Free user: start trial ── */
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartTrial}
                disabled={activating}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {activating ? "Activating..." : ctaText}
              </button>

              {error && (
                <p className="text-center text-xs text-red-500">{error}</p>
              )}

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={onClose}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Maybe later
                </button>
                <span className="text-gray-300">&middot;</span>
                <a
                  href="mailto:hello@plausibleba.com?subject=VCC%20Trial"
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Contact us
                </a>
              </div>

              <p className="text-center text-[10px] text-gray-400">
                Free for 15 days &middot; No credit card required
              </p>
            </div>
          ) : (
            /* ── Expired trial / starter / upgrade path ── */
            <div className="flex flex-col gap-3">
              <a
                href="mailto:hello@plausibleba.com?subject=VCC%20Upgrade%20Request"
                className="block w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                {ctaText}
              </a>

              <div className="flex items-center justify-center">
                <button
                  onClick={onClose}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Maybe later
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
