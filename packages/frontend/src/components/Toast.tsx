/**
 * Toast.tsx — Lightweight toast notification system for VCC.
 *
 * Uses a Zustand store for a dismissible toast queue. Toasts auto-dismiss
 * after a configurable duration and can also be manually dismissed.
 *
 * Mount <ToastContainer /> once at the app root (e.g., inside App.tsx).
 * Push notifications from anywhere via `useToastStore.getState().addToast(...)`.
 */

import { create } from "zustand";
import { useEffect, useCallback, type CSSProperties } from "react";
import { tv } from "../theme";

// ─── Store ──────────────────────────────────────────────────────────────────

export type ToastLevel = "success" | "warning" | "error" | "info";

export interface ToastItem {
  id: string;
  level: ToastLevel;
  title: string;
  detail?: string;
  /** Duration in ms before auto-dismiss. 0 = persistent. Default 5000. */
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id" | "duration"> & { duration?: number }) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          ...toast,
          id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          duration: toast.duration ?? 5000,
        },
      ].slice(-8), // max 8 visible
    })),

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ─── Convenience push function ──────────────────────────────────────────────

/** Push a toast from anywhere (no hook required) */
export function pushToast(
  level: ToastLevel,
  title: string,
  detail?: string,
  duration?: number,
): void {
  useToastStore.getState().addToast({ level, title, detail, duration });
}

// ─── Visual constants ───────────────────────────────────────────────────────

const LEVEL_STYLES: Record<ToastLevel, { bg: string; border: string; icon: string }> = {
  success: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.4)", icon: "✓" },
  warning: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.4)", icon: "⚠" },
  error:   { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)", icon: "✕" },
  info:    { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)", icon: "ℹ" },
};

// ─── Single Toast ───────────────────────────────────────────────────────────

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismissToast);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  const ls = LEVEL_STYLES[toast.level];

  const cardStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${ls.border}`,
    backgroundColor: ls.bg,
    backdropFilter: "blur(12px)",
    color: tv.textPrimary,
    fontSize: 13,
    lineHeight: 1.4,
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    maxWidth: 380,
    minWidth: 260,
    animation: "toast-slide-in 0.25s ease-out",
    cursor: "pointer",
  };

  return (
    <div style={cardStyle} onClick={() => dismiss(toast.id)} role="status">
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{ls.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{toast.title}</div>
        {toast.detail && (
          <div style={{ color: tv.textSecondary, fontSize: 12, marginTop: 2, wordBreak: "break-word" }}>
            {toast.detail}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Container (mount once at app root) ─────────────────────────────────────

const containerStyle: CSSProperties = {
  position: "fixed",
  bottom: 20,
  right: 20,
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  pointerEvents: "none",
};

const itemStyle: CSSProperties = {
  pointerEvents: "auto",
};

// Inject keyframes once
const KEYFRAMES_ID = "vcc-toast-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes toast-slide-in {
      from { opacity: 0; transform: translateX(40px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  useEffect(() => ensureKeyframes(), []);

  const handleDismiss = useCallback(() => {}, []);
  void handleDismiss; // silence unused

  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {toasts.map((t) => (
        <div key={t.id} style={itemStyle}>
          <ToastCard toast={t} />
        </div>
      ))}
    </div>
  );
}
