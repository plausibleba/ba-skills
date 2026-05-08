/**
 * Classification colour palette for AES heatmap and inspector.
 *
 * Five classifications, each with dark-mode and light-mode variants.
 * Designed to harmonise with existing canvas colours (no clash with
 * PPIT chips or friction tints).
 *
 * Design intent:
 *  - AFK Fully Autonomous: emerald — clear "go" signal
 *  - Supervised Autonomous: teal/cyan — autonomous with oversight
 *  - HiTL Assisted: amber — human-in-loop, attention required
 *  - Human-Primary: slate — human-led, agent supports
 *  - Not Yet Viable: grey — defer
 */

import type { AgenticClassification } from "../../domain/agentic-enablement";

export interface ClassPalette {
  bg: string;
  border: string;
  fg: string;
  badge: string;
  badgeFg: string;
}

export const CLASS_PALETTE_DARK: Record<AgenticClassification, ClassPalette> = {
  fully_autonomous_afk: {
    bg: "rgba(16,185,129,0.15)",
    border: "rgba(16,185,129,0.45)",
    fg: "#6ee7b7",
    badge: "rgba(16,185,129,0.30)",
    badgeFg: "#a7f3d0",
  },
  supervised_autonomous: {
    bg: "rgba(20,184,166,0.15)",
    border: "rgba(20,184,166,0.40)",
    fg: "#5eead4",
    badge: "rgba(20,184,166,0.28)",
    badgeFg: "#99f6e4",
  },
  hitl_assisted: {
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.40)",
    fg: "#fbbf24",
    badge: "rgba(245,158,11,0.28)",
    badgeFg: "#fde68a",
  },
  human_primary_agent_supported: {
    bg: "rgba(100,116,139,0.18)",
    border: "rgba(100,116,139,0.45)",
    fg: "#cbd5e1",
    badge: "rgba(100,116,139,0.32)",
    badgeFg: "#e2e8f0",
  },
  not_yet_viable: {
    bg: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.30)",
    fg: "#94a3b8",
    badge: "rgba(148,163,184,0.20)",
    badgeFg: "#cbd5e1",
  },
};

export const CLASS_PALETTE_LIGHT: Record<AgenticClassification, ClassPalette> = {
  fully_autonomous_afk: {
    bg: "rgba(5,150,105,0.10)",
    border: "rgba(5,150,105,0.40)",
    fg: "#047857",
    badge: "rgba(5,150,105,0.22)",
    badgeFg: "#065f46",
  },
  supervised_autonomous: {
    bg: "rgba(13,148,136,0.10)",
    border: "rgba(13,148,136,0.40)",
    fg: "#0f766e",
    badge: "rgba(13,148,136,0.22)",
    badgeFg: "#115e59",
  },
  hitl_assisted: {
    bg: "rgba(217,119,6,0.10)",
    border: "rgba(217,119,6,0.40)",
    fg: "#b45309",
    badge: "rgba(217,119,6,0.22)",
    badgeFg: "#92400e",
  },
  human_primary_agent_supported: {
    bg: "rgba(71,85,105,0.10)",
    border: "rgba(71,85,105,0.40)",
    fg: "#475569",
    badge: "rgba(71,85,105,0.22)",
    badgeFg: "#334155",
  },
  not_yet_viable: {
    bg: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.30)",
    fg: "#64748b",
    badge: "rgba(148,163,184,0.20)",
    badgeFg: "#475569",
  },
};

export const CLASS_SHORT_LABELS: Record<AgenticClassification, string> = {
  fully_autonomous_afk: "AFK",
  supervised_autonomous: "Supervised",
  hitl_assisted: "HiTL",
  human_primary_agent_supported: "Human-Primary",
  not_yet_viable: "Defer",
};
