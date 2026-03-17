/**
 * theme.ts — VCC Theme System
 *
 * Two themes: dark (default) and light.
 * Tokens are applied as CSS custom properties on <html>.
 * Components use var(--vcc-*) in inline styles.
 *
 * Contrast targets: WCAG AA (4.5:1 for normal text, 3:1 for large text).
 */

export type ThemeMode = "dark" | "light";

export interface ThemeTokens {
  // Backgrounds
  bgPrimary: string;       // Main page background
  bgCard: string;          // Card / panel background
  bgCardHover: string;     // Card hover state
  bgSurface: string;       // Slightly raised surfaces (L2 groups, toolbars)
  bgInput: string;         // Input / editing fields

  // Borders
  borderDefault: string;   // Default borders
  borderSubtle: string;    // Very subtle dividers
  borderAccent: string;    // Accent-colored borders (selected states)

  // Text
  textPrimary: string;     // Main readable text — high contrast
  textSecondary: string;   // Secondary text — good contrast
  textDim: string;         // Labels, captions, hints
  textOnAccent: string;    // Text on accent-colored backgrounds

  // Accent (VCC blue)
  accent: string;
  accentMuted: string;     // Lower-opacity accent for backgrounds
  accentBorder: string;    // Accent for borders

  // Capsicum Triad
  partyColor: string;      // Teal
  resourceColor: string;   // Blue
  recordColor: string;     // Pink

  // Governance purple
  govColor: string;
  govMuted: string;

  // Interaction amber
  interactionColor: string;

  // Structural violet
  structuralColor: string;

  // Status
  errorBg: string;
  errorBorder: string;
  errorText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;

  // Overlays
  overlayBg: string;       // Modal/tooltip backgrounds
  tileBg: string;          // Capability tiles, graph nodes
  tileBgHover: string;
  tileSelectedBg: string;
  tileSelectedBorder: string;
}

export const darkTheme: ThemeTokens = {
  // Backgrounds — slightly lighter card bg for better text contrast
  bgPrimary: "#131b2e",
  bgCard: "#1e2b45",
  bgCardHover: "#243352",
  bgSurface: "#1a2236",
  bgInput: "rgba(74,158,218,0.15)",

  // Borders — slightly brighter for definition
  borderDefault: "#364766",
  borderSubtle: "#2e3f5c",
  borderAccent: "#4a9eda",

  // Text — significantly boosted for contrast
  textPrimary: "#f1f5f9",     // ~14:1 on bgCard
  textSecondary: "#cbd5e1",   // ~8.5:1 on bgCard
  textDim: "#8b9ec2",         // ~4.5:1 on bgCard — AA compliant now
  textOnAccent: "#ffffff",

  // Accent
  accent: "#4a9eda",
  accentMuted: "rgba(74,158,218,0.12)",
  accentBorder: "rgba(74,158,218,0.6)",

  // Capsicum Triad
  partyColor: "#2dd4bf",
  resourceColor: "#4a9eda",
  recordColor: "#e05b8a",

  // Governance
  govColor: "#a78bfa",
  govMuted: "rgba(167,139,250,0.12)",

  // Relations
  interactionColor: "#f59e0b",
  structuralColor: "#a78bfa",

  // Status
  errorBg: "rgba(239,68,68,0.1)",
  errorBorder: "rgba(239,68,68,0.3)",
  errorText: "#fca5a5",
  warningBg: "rgba(245,158,11,0.1)",
  warningBorder: "rgba(245,158,11,0.3)",
  warningText: "#fcd34d",

  // Tiles
  overlayBg: "rgba(0,0,0,0.5)",
  tileBg: "rgba(255,255,255,0.06)",
  tileBgHover: "rgba(255,255,255,0.10)",
  tileSelectedBg: "rgba(74,158,218,0.2)",
  tileSelectedBorder: "rgba(74,158,218,0.6)",
};

export const lightTheme: ThemeTokens = {
  // Backgrounds
  bgPrimary: "#f8fafc",
  bgCard: "#ffffff",
  bgCardHover: "#f1f5f9",
  bgSurface: "#f1f5f9",
  bgInput: "rgba(74,158,218,0.08)",

  // Borders
  borderDefault: "#d1d5db",
  borderSubtle: "#e5e7eb",
  borderAccent: "#3b82f6",

  // Text
  textPrimary: "#1e293b",
  textSecondary: "#475569",
  textDim: "#64748b",
  textOnAccent: "#ffffff",

  // Accent
  accent: "#2563eb",
  accentMuted: "rgba(37,99,235,0.08)",
  accentBorder: "rgba(37,99,235,0.4)",

  // Capsicum Triad
  partyColor: "#0d9488",
  resourceColor: "#2563eb",
  recordColor: "#db2777",

  // Governance
  govColor: "#7c3aed",
  govMuted: "rgba(124,58,237,0.08)",

  // Relations
  interactionColor: "#d97706",
  structuralColor: "#7c3aed",

  // Status
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  errorText: "#dc2626",
  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
  warningText: "#b45309",

  // Tiles
  overlayBg: "rgba(0,0,0,0.2)",
  tileBg: "#f8fafc",
  tileBgHover: "#f1f5f9",
  tileSelectedBg: "rgba(37,99,235,0.08)",
  tileSelectedBorder: "rgba(37,99,235,0.4)",
};

/** Apply theme tokens as CSS custom properties on document root */
export function applyTheme(mode: ThemeMode): void {
  const tokens = mode === "dark" ? darkTheme : lightTheme;
  const root = document.documentElement;

  root.setAttribute("data-theme", mode);

  for (const [key, value] of Object.entries(tokens)) {
    // Convert camelCase to kebab-case: bgPrimary → --vcc-bg-primary
    const cssVar = `--vcc-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  }
}

/** Get theme tokens for the given mode (useful for inline styles) */
export function getTheme(mode: ThemeMode): ThemeTokens {
  return mode === "dark" ? darkTheme : lightTheme;
}
