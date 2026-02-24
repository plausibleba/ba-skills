/* ── Canvas-level PPIT types and constants ──────────────────────────── */

export type PPITLayer = "roles" | "activities" | "concepts" | "applications";

export const PPIT_LABELS: Record<PPITLayer, { short: string }> = {
  roles: { short: "Roles" },
  activities: { short: "Activities" },
  concepts: { short: "Info" },
  applications: { short: "Tech" },
};

export const PPIT_LAYERS: PPITLayer[] = [
  "roles",
  "activities",
  "concepts",
  "applications",
];
