/**
 * Login page (D-108: Backend Architecture)
 *
 * Simple auth page with Google OAuth and magic link email.
 */
import { useState } from "react";
import { useAuthStore } from "../store/auth-store.ts";

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await signInWithEmail(email);
    if (result.error) {
      setError(result.error);
    } else {
      setEmailSent(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex rounded-full bg-vcc-100 p-3">
            <svg className="h-8 w-8 text-vcc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-vcc-900">Value Cognition Canvas</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to access your projects</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {emailSent ? (
            <div className="text-center">
              <div className="mb-2 text-2xl">📧</div>
              <h2 className="mb-1 text-sm font-semibold text-gray-900">Check your email</h2>
              <p className="text-xs text-gray-500">
                We sent a magic link to <strong>{email}</strong>. Click it to sign in.
              </p>
              <button
                onClick={() => setEmailSent(false)}
                className="mt-4 text-xs text-vcc-600 hover:text-vcc-700"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button
                onClick={signInWithGoogle}
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

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Magic link email */}
              <form onSubmit={handleEmailSubmit}>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-vcc-500 focus:outline-none focus:ring-1 focus:ring-vcc-500"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-vcc-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-vcc-700"
                >
                  Send magic link
                </button>
              </form>

              {error && (
                <p className="mt-3 text-xs text-red-600">{error}</p>
              )}
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
