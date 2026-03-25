/**
 * Account Settings panel — profile, security, subscription.
 *
 * Opens as a modal/overlay from the user avatar in the header.
 * Reads user info from auth-store, tier info from tier-store.
 */
import { useState } from "react";
import { useAuthStore } from "../store/auth-store.ts";
import { useTierStore, type Tier } from "../store/tier-store.ts";
import { supabase, isSupabaseConfigured } from "../lib/supabase.ts";

type Tab = "profile" | "security" | "subscription";

interface AccountSettingsProps {
  onClose: () => void;
}

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  trial: "Trial (15 days)",
  starter: "Starter",
  individual: "Individual",
  team_5: "Team (5 seats)",
  team_10: "Team (10 seats)",
};

export function AccountSettings({ onClose }: AccountSettingsProps) {
  const { user, signOut, updatePassword } = useAuthStore();
  const { tier, trialEndsAt, isTrialActive, activateTrial } = useTierStore();
  const [tab, setTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Security tab state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Profile tab state
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? "");

  const handleSaveProfile = async () => {
    if (!isSupabaseConfigured || !user) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      });
      if (error) throw error;
      setMessage({ type: "success", text: "Profile updated" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: "error", text: "Passwords don't match" });
      return;
    }
    setSaving(true);
    const result = await updatePassword(newPassword);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Password updated" });
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setSaving(false);
  };

  const handleActivateTrial = async () => {
    if (!user?.id) return;
    setSaving(true);
    setMessage(null);
    const result = await activateTrial(user.id);
    if (result.success) {
      setMessage({ type: "success", text: "15-day trial activated! All features are now unlocked." });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to activate trial" });
    }
    setSaving(false);
  };

  const handleManageSubscription = async () => {
    // Opens Stripe Customer Portal
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      setMessage({ type: "error", text: "Could not open billing portal. Please try again." });
    }
  };

  const authProvider = user?.app_metadata?.provider ?? "email";
  const hasPassword = authProvider === "email";
  const trialActive = isTrialActive();
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Account Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {(["profile", "security", "subscription"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null); }}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-vcc-600 text-vcc-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "profile" ? "Profile" : t === "security" ? "Security" : "Subscription"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[240px]">
          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <div className="space-y-4">
              <Field label="Email">
                <p className="text-sm text-gray-900">{user?.email ?? "—"}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Signed in via {authProvider === "google" ? "Google" : authProvider === "email" ? "email" : authProvider}
                </p>
              </Field>
              <Field label="Display name">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-vcc-500 focus:outline-none focus:ring-1 focus:ring-vcc-500"
                />
              </Field>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="rounded-lg bg-vcc-600 px-4 py-2 text-xs font-semibold text-white hover:bg-vcc-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          )}

          {/* ── Security Tab ── */}
          {tab === "security" && (
            <div className="space-y-4">
              {hasPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <Field label="New password">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-vcc-500 focus:outline-none focus:ring-1 focus:ring-vcc-500"
                    />
                  </Field>
                  <Field label="Confirm new password">
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-vcc-500 focus:outline-none focus:ring-1 focus:ring-vcc-500"
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-vcc-600 px-4 py-2 text-xs font-semibold text-white hover:bg-vcc-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Updating..." : "Update password"}
                  </button>
                </form>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-600">
                    You signed in with Google. Password management is handled through your Google account.
                  </p>
                </div>
              )}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={async () => { await signOut(); onClose(); }}
                  className="rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          {/* ── Subscription Tab ── */}
          {tab === "subscription" && (
            <div className="space-y-4">
              <Field label="Current plan">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{TIER_LABELS[tier] ?? tier}</span>
                  {tier === "trial" && trialActive && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left
                    </span>
                  )}
                  {tier === "trial" && !trialActive && (
                    <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      Expired
                    </span>
                  )}
                </div>
              </Field>

              {tier === "free" && (
                <div className="rounded-lg border border-vcc-200 bg-vcc-50 p-4">
                  <p className="text-xs text-vcc-800 font-medium mb-1">Start your free trial</p>
                  <p className="text-xs text-vcc-600 mb-3">
                    Get 15 days of full access to all features — friction analysis, solution enrichment, PPIT mapping, and more.
                  </p>
                  <button
                    onClick={handleActivateTrial}
                    disabled={saving}
                    className="rounded-lg bg-vcc-600 px-4 py-2 text-xs font-semibold text-white hover:bg-vcc-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Activating..." : "Start 15-day trial"}
                  </button>
                </div>
              )}

              {(tier === "trial" && !trialActive) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs text-amber-800 font-medium mb-1">Trial expired</p>
                  <p className="text-xs text-amber-600 mb-3">
                    Your trial has ended. Upgrade to continue using premium features.
                  </p>
                </div>
              )}

              {["starter", "individual", "team_5", "team_10"].includes(tier) && (
                <button
                  onClick={handleManageSubscription}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Manage subscription
                </button>
              )}

              {tier !== "individual" && tier !== "team_5" && tier !== "team_10" && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-[11px] text-gray-400">
                    Need a paid plan? Contact us at support@plausibleba.com
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Message banner */}
          {message && (
            <div className={`mt-4 rounded-lg px-3 py-2 text-xs ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}
