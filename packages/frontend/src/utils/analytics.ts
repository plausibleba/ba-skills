/**
 * analytics.ts — Unified event tracking for VCC.
 *
 * Dual-layer:
 *   1. Plausible  — anonymous, privacy-friendly, works for ALL visitors
 *   2. Supabase   — authenticated users only, richer metadata, usage gating
 *
 * Session heartbeats track active usage time for authenticated users.
 *
 * Session 29 — Usage tracking.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabase.ts";
import { useAuthStore } from "../store/auth-store.ts";
import { useProjectStore } from "../store/project-store.ts";

/* ═══════════════════════════════════════════════════════════════
   Plausible custom events (anonymous, all visitors)
   ═══════════════════════════════════════════════════════════════ */

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

/** Fire a Plausible custom event. No-ops if Plausible isn't loaded. */
function plausibleEvent(
  name: string,
  props?: Record<string, string | number | boolean>,
) {
  try {
    if (window.plausible) {
      window.plausible(name, props ? { props } : undefined);
    }
  } catch {
    // Silently fail — analytics should never break the app
  }
}

/* ═══════════════════════════════════════════════════════════════
   Supabase usage_log (authenticated users only)
   ═══════════════════════════════════════════════════════════════ */

async function logToSupabase(
  operation: string,
  metadata?: Record<string, unknown>,
) {
  if (!isSupabaseConfigured) return;

  const user = useAuthStore.getState().user;
  if (!user) return; // Anonymous — skip Supabase logging

  const projectId = useProjectStore.getState().currentProjectId ?? null;

  try {
    await supabase.from("usage_log").insert({
      user_id: user.id,
      project_id: projectId,
      operation,
      metadata: metadata ?? {},
    });
  } catch (err) {
    console.warn("[analytics] Supabase log failed:", err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   Public tracking API — fires both layers
   ═══════════════════════════════════════════════════════════════ */

export type TrackableEvent =
  | "discovery_started"
  | "discovery_completed"
  | "import_model"
  | "import_model_completed"
  | "view_network"
  | "view_valuestream"
  | "view_capabilities"
  | "view_concepts"
  | "view_friction"
  | "view_workbench"
  | "view_import"
  | "view_enrich"
  | "upload_stories"
  | "upload_library"
  | "export_pdf"
  | "sign_up"
  | "sign_in"
  | "session_heartbeat";

/**
 * Track a user action. Fires to both Plausible (anonymous) and
 * Supabase usage_log (authenticated).
 */
export function trackEvent(
  event: TrackableEvent,
  props?: Record<string, string | number | boolean>,
) {
  // Plausible: all visitors (anonymous)
  plausibleEvent(event, props);

  // Supabase: authenticated users only (with full metadata)
  logToSupabase(event, props as Record<string, unknown>);
}

/* ═══════════════════════════════════════════════════════════════
   Session heartbeat — tracks active usage time
   ═══════════════════════════════════════════════════════════════ */

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let lastActivity = Date.now();

/** Reset the idle timer on any user interaction */
function onActivity() {
  lastActivity = Date.now();
}

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes
const IDLE_THRESHOLD_MS = 10 * 60 * 1000; // Consider idle after 10 minutes

/**
 * Start the session heartbeat. Call once on app mount.
 * Only logs heartbeats for authenticated users who are actively using the app.
 */
export function startHeartbeat() {
  if (heartbeatInterval) return; // Already running

  // Listen for activity
  window.addEventListener("mousemove", onActivity, { passive: true });
  window.addEventListener("keydown", onActivity, { passive: true });
  window.addEventListener("click", onActivity, { passive: true });
  window.addEventListener("scroll", onActivity, { passive: true });

  heartbeatInterval = setInterval(() => {
    const idleMs = Date.now() - lastActivity;
    if (idleMs < IDLE_THRESHOLD_MS) {
      // User is active — send heartbeat (Supabase only, not Plausible)
      logToSupabase("session_heartbeat", {
        idle_seconds: Math.round(idleMs / 1000),
      });
    }
  }, HEARTBEAT_INTERVAL_MS);
}

/** Stop the heartbeat (call on unmount or sign-out). */
export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  window.removeEventListener("mousemove", onActivity);
  window.removeEventListener("keydown", onActivity);
  window.removeEventListener("click", onActivity);
  window.removeEventListener("scroll", onActivity);
}

/* ═══════════════════════════════════════════════════════════════
   View tracking helper — call when viewMode changes
   ═══════════════════════════════════════════════════════════════ */

const VIEW_EVENT_MAP: Record<string, TrackableEvent> = {
  network: "view_network",
  stage: "view_valuestream",
  capabilityMap: "view_capabilities",
  conceptGraph: "view_concepts",
  friction: "view_friction",
  workbench: "view_workbench",
  import: "view_import",
  enrich: "view_enrich",
};

export function trackViewChange(viewMode: string) {
  const event = VIEW_EVENT_MAP[viewMode];
  if (event) trackEvent(event);
}
