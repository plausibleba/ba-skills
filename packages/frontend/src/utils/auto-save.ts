// ── Auto-save loaded content to Supabase project ──────────────────────────
// Shared by all import paths: drag-drop, Import Bundle button, onComplete
//
// Creates a project with the full bundle if none exists, or saves to the
// existing project. Uses force-save to avoid optimistic lock conflicts on
// newly created projects.

import { useAuthStore } from "../store/auth-store.ts";
import { useProjectStore } from "../store/project-store.ts";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { ProjectModule } from "../types/database.ts";

function buildBundle(extra?: { cardRegistry?: any }): Record<string, unknown> {
  const canvas = useCanvasStore.getState();
  const saveable: Record<string, unknown> = {
    bundleVersion: "2.0",
    updatedAt: new Date().toISOString(),
    scaffold: canvas.scaffoldData,
    heatmaps: Array.from(canvas.heatmapsByVs.values()),
  };
  if (extra?.cardRegistry) saveable.cardRegistry = extra.cardRegistry;
  else if (canvas.cardRegistry) saveable.cardRegistry = canvas.cardRegistry;

  const stories = canvas.getAllUserStories?.() ?? [];
  if (stories.length > 0) {
    const byActivity: Record<string, any[]> = {};
    for (const s of stories) {
      (byActivity[(s as any).activityId] ??= []).push(s);
    }
    saveable.userStoriesByActivity = byActivity;
  }
  return saveable;
}

export async function autoSaveToProject(extra?: { cardRegistry?: any }): Promise<void> {
  const { isLocalMode } = useAuthStore.getState();
  if (isLocalMode) return;

  const projectStore = useProjectStore.getState();
  let projectId = projectStore.currentProjectId;
  const bundle = buildBundle(extra);

  if (!projectId) {
    // Create project with the full bundle already included — no separate save needed
    const canvas = useCanvasStore.getState();
    const name = canvas.scaffoldData?.name ?? "Imported Bundle";
    const vsCount = canvas.scaffoldData
      ? Object.keys(canvas.scaffoldData.elements?.valueStreams ?? {}).length
      : 0;
    const module: ProjectModule = vsCount > 2 ? "transformation" : "sales-discovery";
    projectId = await projectStore.createProject(name, module, bundle);
    // createProject sets the project in the list but not as current — fix that
    if (projectId) {
      projectStore.setCurrentProject(projectId, 1);
    }
  } else {
    // Save to existing project
    await projectStore.saveProject(projectId, bundle);
  }
}
