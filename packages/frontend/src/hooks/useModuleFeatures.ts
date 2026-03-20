/**
 * Hook: useModuleFeatures
 *
 * Returns the feature flags for the current project module.
 * Uses currentModule from the project store (set at project creation/load time)
 * so it works immediately without waiting for fetchProjects to complete.
 * In local mode (no project), all features are enabled.
 */
import { useProjectStore } from "../store/project-store.ts";
import { getModuleFeatures, type ModuleFeatures } from "../lib/module-features.ts";

export function useModuleFeatures(): ModuleFeatures {
  const currentModule = useProjectStore((s) => s.currentModule);
  return getModuleFeatures(currentModule);
}
