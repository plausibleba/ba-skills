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
  forcePricing?: boolean; // Skip trial offer, go straight to pricing tiers
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

  // Can we offer a trial? Any user who hasn't already used their trial.
  // Expired trials must upgrade — they've already had their chance.
  const hasHadTrial = !!trialEndsAt; // if trialEndsAt is set, they've had a trial
  const canStartTrial = !hasHadTrial;

  // Determine messaging based on tier
  let headline = "";
  let body = "";
  let ctaText = "";

  if (isExpiredTrial) {
    headline = "Your free trial has ended";
    body = `Upgrade to keep using ${config.featureLabel} and continue building on your operating model.`;
    ctaText = "Contact us to upgrade";
  } else if (canStartTrial) {
    // Any user who hasn't had a trial yet (free, starter, etc.) gets the trial offer
    headline = `Unlock ${config.featureLabel}`;
    body = `Start your free 15-day trial to access ${config.featureLabel} and all VCC features. No credit card required.`;
    ctaText = "Start free trial";
  } else if (isStarter && config.requiredUseCase) {
    const ucLabel = USE_CASE_LABELS[config.requiredUseCase] || config.requiredUseCase;
    headline = `${ucLabel} use case required`;
    body = `${config.featureLabel} is part of the ${ucLabel} module. Contact us to add it to your subscription.`;
    ctaText = "Contact us to upgrade";
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

  // Show pricing tiers view (no icon/headline/feature-list — PricingTiers handles it)
  const showPricing = (config.forcePricing || !canStartTrial) && !activated;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — wider when showing pricing tiers */}
      <div className={`relative w-full rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 ${showPricing ? "max-w-3xl" : "max-w-md"}`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!showPricing && (
          <>
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

            {/* Feature list (free users, before activation) */}
            {isFree && !activated && (
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
          </>
        )}

        {/* CTA area */}
        <div className={showPricing ? "" : "mt-6"}>
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
          ) : canStartTrial && !config.forcePricing ? (
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
            /* ── Expired trial / upgrade: show pricing tiers ── */
            <PricingTiers onClose={onClose} isExpiredTrial={!!isExpiredTrial} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pricing tiers (shown for expired trial / upgrade path) ──────────────────

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number | null; // null = no annual option (Starter)
  monthlyPriceId: string;
  annualPriceId: string | null;
  perSeat: string | null; // e.g. "$40/seat" for teams
  features: string[];
  highlight: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    description: "One use case, fully unlocked",
    monthlyPrice: 20,
    annualPrice: null,
    monthlyPriceId: "price_1TDnMEIU846dhWU8Dm8fiVAD",
    annualPriceId: null,
    perSeat: null,
    features: [
      "Pick any use case",
      "Unlimited projects",
      "Full analytical access",
      "Signature feature included",
      "Add use cases at $20 each",
    ],
    highlight: false,
  },
  {
    id: "individual",
    name: "Individual",
    description: "Every use case, every feature",
    monthlyPrice: 50,
    annualPrice: 500,
    monthlyPriceId: "price_1TDnMDIU846dhWU8QpfWlWUr",
    annualPriceId: "price_1TDnMEIU846dhWU8S4zKG6io",
    perSeat: null,
    features: [
      "All 4 use cases included",
      "Unlimited projects",
      "All assessments & enrichment",
      "PDF export & reporting",
      "Priority support",
    ],
    highlight: true,
  },
  {
    id: "team_5",
    name: "Team 5",
    description: "5 seats, full collaboration",
    monthlyPrice: 200,
    annualPrice: 2000,
    monthlyPriceId: "price_1TDnMGIU846dhWU812XEZqHH",
    annualPriceId: "price_1TDnMDIU846dhWU8FG5rm9W9",
    perSeat: "$40/seat",
    features: [
      "Everything in Individual",
      "5 team member seats",
      "Shared project library",
      "Team analytics",
      "Dedicated onboarding",
    ],
    highlight: false,
  },
  {
    id: "team_10",
    name: "Team 10",
    description: "10 seats, best per-seat value",
    monthlyPrice: 350,
    annualPrice: 3500,
    monthlyPriceId: "price_1TDnMEIU846dhWU8042hddzU",
    annualPriceId: "price_1TDnMDIU846dhWU8qznOqHc3",
    perSeat: "$35/seat",
    features: [
      "Everything in Individual",
      "10 team member seats",
      "Shared project library",
      "Team analytics",
      "Dedicated onboarding",
    ],
    highlight: false,
  },
];

function PricingTiers({ onClose, isExpiredTrial }: { onClose: () => void; isExpiredTrial: boolean }) {
  const [annual, setAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  const handleCheckout = async (tier: PricingTier) => {
    const priceId = annual && tier.annualPriceId ? tier.annualPriceId : tier.monthlyPriceId;

    setLoadingTier(tier.id);
    setCheckoutError(null);

    try {
      const apiUrl = import.meta.env.DEV ? "/api/checkout" : "/api/checkout";
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          userId: user?.id || "",
          email: user?.email || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setCheckoutError(data.error || "Failed to start checkout");
        setLoadingTier(null);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError("Network error — please try again");
      setLoadingTier(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 text-center">
        <h3 className="text-lg font-bold text-gray-900">
          {isExpiredTrial ? "Your trial has ended — choose a plan" : "Choose a plan to continue"}
        </h3>
        <p className="mt-1.5 text-sm text-gray-500">
          Keep building on your operating model with full access to VCC.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mb-5 flex items-center justify-center gap-2.5">
        <span className={`text-xs font-medium ${!annual ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${annual ? "bg-indigo-600" : "bg-gray-300"}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${annual ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
        <span className={`text-xs font-medium ${annual ? "text-gray-900" : "text-gray-400"}`}>
          Annual
        </span>
        <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
          Pay 10, get 12 months
        </span>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-4 gap-2.5">
        {PRICING_TIERS.map((tier) => {
          const showAnnual = annual && tier.annualPrice !== null;
          const displayPrice = showAnnual ? Math.round(tier.annualPrice! / 12) : tier.monthlyPrice;
          const isLoading = loadingTier === tier.id;

          return (
            <div
              key={tier.id}
              className={`relative rounded-xl border p-3.5 flex flex-col ${
                tier.highlight
                  ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200"
                  : "border-gray-200 bg-white"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white whitespace-nowrap">
                  Most popular
                </div>
              )}

              <div className="mb-2.5">
                <h4 className="text-sm font-bold text-gray-900">{tier.name}</h4>
                <p className="mt-0.5 text-[10px] text-gray-500">{tier.description}</p>
              </div>

              <div className="mb-2.5">
                <span className="text-xl font-bold text-gray-900">${displayPrice}</span>
                <span className="text-[10px] text-gray-500">/ mo</span>
                {showAnnual && (
                  <div className="text-[9px] text-emerald-600 font-medium">
                    ${tier.annualPrice}/yr (billed annually)
                  </div>
                )}
                {!showAnnual && tier.annualPrice === null && (
                  <div className="text-[9px] text-gray-400">per use case</div>
                )}
                {tier.perSeat && (
                  <div className="text-[9px] text-gray-400">{tier.perSeat}/mo</div>
                )}
              </div>

              <div className="mb-3 space-y-1 flex-1">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-start gap-1.5">
                    <svg className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-[10px] text-gray-600 leading-tight">{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA — Stripe Checkout */}
              <button
                onClick={() => handleCheckout(tier)}
                disabled={isLoading || !!loadingTier}
                className={`block w-full rounded-lg py-2 text-center text-xs font-semibold transition-colors disabled:opacity-50 ${
                  tier.highlight
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isLoading ? "Redirecting..." : `Get ${tier.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {checkoutError && (
        <p className="mt-3 text-center text-xs text-red-500">{checkoutError}</p>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">
          Maybe later
        </button>
        <span className="text-gray-300">&middot;</span>
        <a
          href="mailto:hello@plausibleba.com?subject=VCC%20Custom%20Plan"
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Need something custom?
        </a>
      </div>
    </div>
  );
}
