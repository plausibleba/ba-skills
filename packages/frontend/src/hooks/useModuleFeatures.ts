/**
 * Hook: useModuleFeatures
 *
 * Returns the feature flags for the current project module.
 * In local mode (no project), all features are enabled.
 */
import { useProjectStore } from "../store/project-store.ts";
import { getModuleFeatures, type ModuleFeatures } from "../lib/module-features.ts";

export function useModuleFeatures(): ModuleFeatures {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);

  if (!currentProjectId) return getModuleFeatures(null);

  const project = projects.find((p) => p.id === currentProjectId);
  return getModuleFeatures(project?.module);
}
