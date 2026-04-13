/**
 * Unified Module Registry (R-002)
 *
 * Single source of truth for module metadata: label, description, color,
 * and feature flags. Replaces three scattered definitions:
 *   - ProjectList.tsx MODULE_INFO (label, description, color)
 *   - module-features.ts MODULE_FEATURES (feature flags)
 *   - UserGuidePanel.tsx inline label lookup
 */

import type { ProjectModule } from "../types/database.ts";

export interface ModuleFeatures {
  friction: boolean;        // Assess Friction (heatmaps, friction panel)
  solutions: boolean;       // Enrich Solutions (vendor picker, solution cards)
  userStories: boolean;     // User Stories / SBR (transformation pane, Jira export)
  mvcCards: boolean;        // MVC Concept & Policy Cards (card panel, card toggles)
}

export interface ModuleEntry {
  id: ProjectModule;
  label: string;
  description: string;
  color: string;              // Tailwind CSS classes for badge styling
  features: ModuleFeatures;
}

const MODULE_REGISTRY: Record<ProjectModule, ModuleEntry> = {
  "sales-discovery": {
    id: "sales-discovery",
    label: "Solution Engineering",
    description: "Presales discovery — transcript to operating model with vendor solutions",
    color: "bg-blue-100 text-blue-700",
    features: { friction: true, solutions: true, userStories: false, mvcCards: true },
  },
  "board-diagnostic": {
    id: "board-diagnostic",
    label: "Board Diagnostic",
    description: "Operating model analysis — friction assessment and binding constraint identification",
    color: "bg-purple-100 text-purple-700",
    features: { friction: true, solutions: false, userStories: false, mvcCards: true },
  },
  "transformation": {
    id: "transformation",
    label: "Transformation Planning",
    description: "Transformation planning — friction to user stories, Jira export",
    color: "bg-amber-100 text-amber-700",
    features: { friction: true, solutions: false, userStories: true, mvcCards: true },
  },
  "mvc": {
    id: "mvc",
    label: "Agentic Governance",
    description: "Agentic governance — friction assessment with Concept & Policy Cards",
    color: "bg-indigo-100 text-indigo-700",
    features: { friction: true, solutions: false, userStories: false, mvcCards: true },
  },
};

export default MODULE_REGISTRY;

/** All module IDs in display order */
export const MODULE_IDS = Object.keys(MODULE_REGISTRY) as ProjectModule[];

/** Default feature set for unknown modules / Quick Discovery */
const DEFAULT_FEATURES: ModuleFeatures = {
  friction: true,
  solutions: true,
  userStories: false,
  mvcCards: true,
};

/**
 * Get the feature set for a module. Falls back to sales-discovery baseline.
 */
export function getModuleFeatures(module: string | null | undefined): ModuleFeatures {
  if (!module) return DEFAULT_FEATURES;
  return MODULE_REGISTRY[module as ProjectModule]?.features ?? DEFAULT_FEATURES;
}

/**
 * Get the display label for a module. Falls back to the raw ID.
 */
export function getModuleLabel(module: string | null | undefined): string {
  if (!module) return "";
  return MODULE_REGISTRY[module as ProjectModule]?.label ?? module;
}
