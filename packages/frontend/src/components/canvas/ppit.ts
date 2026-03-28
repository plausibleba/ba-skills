/* ── Canvas-level PPIT types and constants ──────────────────────────── */

export type PPITLayer = "roles" | "activities" | "concepts" | "applications";

export const PPIT_LABELS: Record<PPITLayer, { short: string }> = {
  roles: { short: "People" },
  activities: { short: "Process" },
  concepts: { short: "Information" },
  applications: { short: "Technology" },
};

export const PPIT_LAYERS: PPITLayer[] = [
  "roles",
  "activities",
  "concepts",
  "applications",
];
