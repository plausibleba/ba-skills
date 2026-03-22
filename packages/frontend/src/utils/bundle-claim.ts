/**
 * bundle-claim.ts — Handles the "Open in VCC" handoff from PlausibleBA Canvas.
 *
 * Flow:
 * 1. User clicks "Open in VCC →" on plausibleba.com/canvas
 * 2. Canvas POSTs bundle to /api/claim-bundle, gets a claim token
 * 3. User is redirected to VCC with ?claim=bndl_xxx&email=...&firstName=...
 * 4. VCC checks URL params on load:
 *    - If authenticated: fetch bundle immediately, import, create project
 *    - If not authenticated: stash token in sessionStorage, show login (pre-filled)
 * 5. After auth completes, VCC checks sessionStorage for pending claim
 * 6. Fetches bundle from claim API, imports it, creates project
 *
 * The claim token is one-time-use and expires after 24 hours.
 */

// ── Configuration ──────────────────────────────────────────────────────────
// The claim API lives on the PlausibleBA website (Vercel edge function).
// In dev, fall back to localhost if VCC is running locally.
const CANVAS_API_BASE = import.meta.env.VITE_CANVAS_API_URL
  ?? "https://www.plausibleba.com";

const CLAIM_STORAGE_KEY = "vcc_pending_claim";
const PREFILL_STORAGE_KEY = "vcc_claim_prefill";

// ── Types ──────────────────────────────────────────────────────────────────
export interface ClaimPrefill {
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface ClaimPayload {
  bundle: Record<string, unknown>;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

// ── URL Parameter Extraction ───────────────────────────────────────────────

/**
 * Check current URL for a claim token. If found, stash it in sessionStorage
 * and clean the URL (replace state). Returns the token if present.
 */
export function extractClaimFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("claim");

  if (!token) return null;

  // Stash token in sessionStorage so it survives the auth redirect
  sessionStorage.setItem(CLAIM_STORAGE_KEY, token);

  // Also stash pre-fill data
  const prefill: ClaimPrefill = {};
  if (params.get("email")) prefill.email = params.get("email")!;
  if (params.get("firstName")) prefill.firstName = params.get("firstName")!;
  if (params.get("lastName")) prefill.lastName = params.get("lastName")!;

  if (Object.keys(prefill).length > 0) {
    sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(prefill));
  }

  // Clean URL — remove claim params so they don't linger
  params.delete("claim");
  params.delete("email");
  params.delete("firstName");
  params.delete("lastName");
  const cleanURL = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, "", cleanURL);

  return token;
}

/**
 * Check if there's a pending claim token in sessionStorage.
 */
export function getPendingClaim(): string | null {
  return sessionStorage.getItem(CLAIM_STORAGE_KEY);
}

/**
 * Get pre-fill data from the claim redirect (for login form).
 */
export function getClaimPrefill(): ClaimPrefill | null {
  const raw = sessionStorage.getItem(PREFILL_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear the pending claim after it's been consumed.
 */
export function clearPendingClaim(): void {
  sessionStorage.removeItem(CLAIM_STORAGE_KEY);
  sessionStorage.removeItem(PREFILL_STORAGE_KEY);
}

// ── Bundle Fetching ────────────────────────────────────────────────────────

/**
 * Fetch the claimed bundle from the PlausibleBA claim API.
 * Returns the bundle and user metadata, or null if the token is expired/invalid.
 */
export async function fetchClaimedBundle(token: string): Promise<ClaimPayload | null> {
  try {
    const res = await fetch(
      `${CANVAS_API_BASE}/api/claim-bundle?token=${encodeURIComponent(token)}`
    );

    if (!res.ok) {
      if (res.status === 404) {
        console.warn("[VCC Claim] Token expired or already claimed:", token);
        return null;
      }
      throw new Error(`Claim API returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("[VCC Claim] Failed to fetch bundle:", err);
    return null;
  }
}

/**
 * Check if there's a pending claim and the user is authenticated.
 * If so, fetch and return the bundle. Returns null if no claim or fetch fails.
 */
export async function consumePendingClaim(): Promise<ClaimPayload | null> {
  const token = getPendingClaim();
  if (!token) return null;

  const payload = await fetchClaimedBundle(token);
  clearPendingClaim();
  return payload;
}
