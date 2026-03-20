/**
 * Module Feature Configuration (D-112: Module-Specific UI)
 *
 * Each project module only shows features relevant to its workflow.
 * This prevents cognitive overload by hiding irrelevant tools.
 *
 * Board Diagnostic:  Friction only
 * Sales Discovery:   Friction + Solutions
 * Transformation:    Friction + User Stories / SBR
 * MVC (governance):  Friction + Concept & Policy Cards
 */

import type { ProjectModule } from "../types/database.ts";

export interface ModuleFeatures {
  friction: boolean;        // Assess Friction (heatmaps, friction panel)
  solutions: boolean;       // Enrich Solutions (vendor picker, solution cards)
  userStories: boolean;     // User Stories / SBR (transformation pane, Jira export)
  mvcCards: boolean;        // MVC Concept & Policy Cards (card panel, card toggles)
}

const MODULE_FEATURES: Record<ProjectModule | "mvc", ModuleFeatures> = {
  "board-diagnostic": {
    friction: true,
    solutions: false,
    userStories: false,
    mvcCards: false,
  },
  "sales-discovery": {
    friction: true,
    solutions: true,
    userStories: false,
    mvcCards: false,
  },
  "transformation": {
    friction: true,
    solutions: false,
    userStories: true,
    mvcCards: false,
  },
  "mvc": {
    friction: true,
    solutions: false,
    userStories: false,
    mvcCards: true,
  },
};

// Default: show everything (local mode / unknown module)
const ALL_FEATURES: ModuleFeatures = {
  friction: true,
  solutions: true,
  userStories: true,
  mvcCards: true,
};

/**
 * Get the feature set for the current module.
 * Falls back to all features enabled for unknown modules or local mode.
 */
export function getModuleFeatures(module: string | null | undefined): ModuleFeatures {
  if (!module) return ALL_FEATURES;
  return MODULE_FEATURES[module as keyof typeof MODULE_FEATURES] ?? ALL_FEATURES;
}
