// @ts-nocheck
/**
 * UpsellModal — contextual upgrade prompt.
 *
 * Shown when a free/expired-trial user attempts a gated action.
 * The modal names the specific feature they tried to use and provides
 * a clear path to start a trial or upgrade.
 *
 * Design principles:
 * - Feels like unlocking a door, not hitting a wall
 * - Contextual — message relates to what they were trying to do
 * - Clean, not aggressive
 * - Single CTA with secondary link
 */
import { useState, useCallback, createContext, useContext } from "react";
import { useTierStore, type GatedAction, type UseCase } from "../store/tier-store.ts";

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

  const isExpiredTrial =
    tier === "trial" && trialEndsAt && new Date(trialEndsAt) < new Date();
  const isFree = tier === "free";
  const isStarter = tier === "starter";

  // Determine CTA text and messaging
  let headline = "";
  let body = "";
  let ctaText = "";
  let ctaAction = "trial"; // 'trial' | 'upgrade' | 'add_use_case'

  if (isExpiredTrial) {
    headline = "Your free trial has ended";
    body = `Upgrade to keep using ${config.featureLabel} and continue building on your operating model.`;
    ctaText = "Upgrade now";
    ctaAction = "upgrade";
  } else if (isStarter && config.requiredUseCase) {
    const ucLabel = USE_CASE_LABELS[config.requiredUseCase] || config.requiredUseCase;
    headline = `${ucLabel} use case required`;
    body = `${config.featureLabel} is part of the ${ucLabel} plan. Add it to your subscription for $20/month, or upgrade to Individual ($50/month) for all use cases.`;
    ctaText = `Add ${ucLabel} — $20/month`;
    ctaAction = "add_use_case";
  } else if (isFree) {
    headline = `Unlock ${config.featureLabel}`;
    body =
      config.reason ||
      `Start your free 15-day trial to access ${config.featureLabel} and all VCC features. No credit card required.`;
    ctaText = "Start free trial";
    ctaAction = "trial";
  } else {
    headline = `Upgrade to access ${config.featureLabel}`;
    body = config.reason || `This feature requires a VCC subscription.`;
    ctaText = "Upgrade now";
    ctaAction = "upgrade";
  }

  const handleCTA = () => {
    // TODO: wire to actual signup/upgrade flow
    // For now, log the intent and close
    console.log(`[VCC Upsell] CTA clicked: ${ctaAction}`, config);
    if (ctaAction === "trial") {
      // Redirect to signup or activate trial
      window.location.href = "/signup?intent=trial";
    } else if (ctaAction === "upgrade") {
      window.location.href = "/pricing";
    } else if (ctaAction === "add_use_case") {
      window.location.href = `/pricing?add=${config.requiredUseCase}`;
    }
    onClose();
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

        {/* Tier badges (show what they'd get) */}
        {(isFree || isExpiredTrial) && (
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

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleCTA}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            {ctaText}
          </button>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Maybe later
            </button>
            <span className="text-gray-300">·</span>
            <a
              href="/pricing"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              See all plans
            </a>
          </div>

          {(isFree || isExpiredTrial) && ctaAction === "trial" && (
            <p className="text-center text-[10px] text-gray-400">
              Free for 15 days · No credit card required
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
