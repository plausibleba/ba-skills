/**
 * theme-store.ts — Zustand store for theme mode toggle.
 * Persists to localStorage so the user's preference survives page reloads.
 */

import { create } from "zustand";
import { type ThemeMode, applyTheme } from "../theme.ts";

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "vcc-theme-mode";

function loadSavedMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage unavailable
  }
  return "dark"; // default
}

export const useThemeStore = create<ThemeState>((set, get) => {
  // Apply initial theme immediately
  const initial = loadSavedMode();
  applyTheme(initial);

  return {
    mode: initial,

    toggle: () => {
      const next = get().mode === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      set({ mode: next });
    },

    setMode: (mode: ThemeMode) => {
      applyTheme(mode);
      try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
      set({ mode });
    },
  };
});
