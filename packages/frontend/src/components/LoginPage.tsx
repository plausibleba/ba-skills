/**
 * Login page (D-108: Backend Architecture)
 *
 * Full auth page with:
 *   - Email/password sign-in (primary)
 *   - Sign-up with email/password
 *   - Google OAuth
 *   - Magic link fallback
 *   - Password reset
 *
 * Supports pre-fill from PlausibleBA Canvas claim redirect.
 */
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/auth-store.ts";
import { getClaimPrefill, getPendingClaim } from "../utils/bundle-claim.ts";

type AuthMode = "signin" | "signup" | "magic" | "reset" | "reset-sent" | "magic-sent";

export function LoginPage() {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUp,
    signInWithPassword,
    resetPasswordForEmail,
    loading,
  } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const hasPendingClaim = !!getPendingClaim();

  useEffect(() => {
    const prefill = getClaimPrefill();
    if (prefill?.email) setEmail(prefill.email);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await signInWithPassword(email, password);
    if (result.error) setError(result.error);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    const result = await signUp(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      setSignUpSuccess(true);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await signInWithEmail(email);
    if (result.error) {
      setError(result.error);
    } else {
      setMode("magic-sent");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await resetPasswordForEmail(email);
    if (result.error) {
      setError(result.error);
    } else {
      setMode("reset-sent");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  // Sign-up confirmation
  if (signUpSuccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <Logo />
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-2 text-2xl">&#9989;</div>
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Check your email</h2>
            <p className="text-xs text-gray-500">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
            </p>
            <button
              onClick={() => { setSignUpSuccess(false); setMode("signin"); setPassword(""); }}
              className="mt-4 text-xs text-vcc-600 hover:text-vcc-700 font-medium"
            >
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <Logo />

        {hasPendingClaim && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs font-medium text-emerald-800">
              Your operating model is ready to import
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-600">
              Sign in or create an account to continue
            </p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Magic link sent */}
          {mode === "magic-sent" && (
            <div className="text-center">
              <div className="mb-2 text-2xl">&#128231;</div>
              <h2 className="mb-1 text-sm font-semibold text-gray-900">Check your email</h2>
              <p className="text-xs text-gray-500">
                We sent a magic link to <strong>{email}</strong>. Click it to sign in.
              </p>
              <button onClick={() => setMode("signin")} className="mt-4 text-xs text-vcc-600 hover:text-vcc-700">
                Back to sign in
              </button>
            </div>
          )}

          {/* Password reset sent */}
          {mode === "reset-sent" && (
            <div className="text-center">
              <div className="mb-2 text-2xl">&#128231;</div>
              <h2 className="mb-1 text-sm font-semibold text-gray-900">Check your email</h2>
              <p className="text-xs text-gray-500">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link.
              </p>
              <button onClick={() => setMode("signin")} className="mt-4 text-xs text-vcc-600 hover:text-vcc-700">
                Back to sign in
              </button>
            </div>
          )}

          {/* Sign in form */}
          {mode === "signin" && (
            <>
              <GoogleButton onClick={signInWithGoogle} />
              <Divider />
              <form onSubmit={handleSignIn}>
                <EmailField value={email} onChange={setEmail} />
                <label className="mb-1.5 block text-xs font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className={inputCls}
                />
                <div className="mt-1 mb-3 text-right">
                  <button type="button" onClick={() => setMode("reset")} className="text-[11px] text-vcc-600 hover:text-vcc-700">
                    Forgot password?
                  </button>
                </div>
                <SubmitButton label={hasPendingClaim ? "Sign in & import model" : "Sign in"} />
              </form>
              {error && <ErrorMsg msg={error} />}
              <div className="mt-4 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  Don't have an account?{" "}
                  <button onClick={() => { setMode("signup"); setError(null); }} className="font-medium text-vcc-600 hover:text-vcc-700">
                    Sign up
                  </button>
                </p>
                <button onClick={() => { setMode("magic"); setError(null); }} className="text-[11px] text-gray-400 hover:text-gray-600">
                  Sign in with magic link instead
                </button>
              </div>
            </>
          )}

          {/* Sign up form */}
          {mode === "signup" && (
            <>
              <GoogleButton onClick={signInWithGoogle} />
              <Divider />
              <form onSubmit={handleSignUp}>
                <EmailField value={email} onChange={setEmail} />
                <label className="mb-1.5 block text-xs font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className={inputCls}
                />
                <label className="mt-3 mb-1.5 block text-xs font-medium text-gray-700">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className={`${inputCls} mb-3`}
                />
                <SubmitButton label="Create account" />
              </form>
              {error && <ErrorMsg msg={error} />}
              <p className="mt-4 text-center text-xs text-gray-500">
                Already have an account?{" "}
                <button onClick={() => { setMode("signin"); setError(null); }} className="font-medium text-vcc-600 hover:text-vcc-700">
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* Magic link form */}
          {mode === "magic" && (
            <>
              <form onSubmit={handleMagicLink}>
                <p className="mb-3 text-xs text-gray-500">We'll send a sign-in link to your email — no password needed.</p>
                <EmailField value={email} onChange={setEmail} />
                <SubmitButton label="Send magic link" />
              </form>
              {error && <ErrorMsg msg={error} />}
              <button onClick={() => { setMode("signin"); setError(null); }} className="mt-4 block mx-auto text-xs text-vcc-600 hover:text-vcc-700">
                Back to sign in
              </button>
            </>
          )}

          {/* Password reset form */}
          {mode === "reset" && (
            <>
              <form onSubmit={handleReset}>
                <p className="mb-3 text-xs text-gray-500">Enter your email and we'll send a password reset link.</p>
                <EmailField value={email} onChange={setEmail} />
                <SubmitButton label="Send reset link" />
              </form>
              {error && <ErrorMsg msg={error} />}
              <button onClick={() => { setMode("signin"); setError(null); }} className="mt-4 block mx-auto text-xs text-vcc-600 hover:text-vcc-700">
                Back to sign in
              </button>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-gray-400">
          By signing in you agree to the VCC terms of use.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

const inputCls = "mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-vcc-500 focus:outline-none focus:ring-1 focus:ring-vcc-500";

function Logo() {
  return (
    <div className="mb-8 text-center">
      <div className="mb-3 inline-flex rounded-full bg-vcc-100 p-3">
        <svg className="h-8 w-8 text-vcc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-vcc-900">Value Cognition Canvas</h1>
      <p className="mt-1 text-sm text-gray-500">Sign in to access your projects</p>
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Continue with Google
    </button>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs text-gray-400">or</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">Email address</label>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@company.com"
        required
        className={inputCls}
      />
    </>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-vcc-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-vcc-700"
    >
      {label}
    </button>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="mt-3 text-xs text-red-600">{msg}</p>;
}
