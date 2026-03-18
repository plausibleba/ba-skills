// ── Auto-save loaded content to Supabase project ──────────────────────────
// Shared by all import paths: drag-drop, Import Bundle button, onComplete
//
// Creates a project if none exists, then saves the current canvas state.

import { useAuthStore } from "../store/auth-store.ts";
import { useProjectStore } from "../store/project-store.ts";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { ProjectModule } from "../types/database.ts";

export async function autoSaveToProject(bundle?: { cardRegistry?: any }): Promise<void> {
  const { isLocalMode } = useAuthStore.getState();
  if (isLocalMode) return;

  const projectStore = useProjectStore.getState();
  let projectId = projectStore.currentProjectId;

  // Auto-create project if none exists
  if (!projectId) {
    const canvas = useCanvasStore.getState();
    const name = canvas.scaffoldData?.name ?? "Imported Bundle";
    const vsCount = canvas.scaffoldData
      ? Object.keys(canvas.scaffoldData.elements?.valueStreams ?? {}).length
      : 0;
    const module: ProjectModule = vsCount > 2 ? "transformation" : "sales-discovery";
    projectId = await projectStore.createProject(name, module, {});
  }

  if (projectId) {
    const canvas = useCanvasStore.getState();
    const saveable: Record<string, unknown> = {
      bundleVersion: "2.0",
      updatedAt: new Date().toISOString(),
      scaffold: canvas.scaffoldData,
      heatmaps: Array.from(canvas.heatmapsByVs.values()),
    };
    if (bundle?.cardRegistry) saveable.cardRegistry = bundle.cardRegistry;
    else if (canvas.cardRegistry) saveable.cardRegistry = canvas.cardRegistry;

    const stories = canvas.getAllUserStories?.() ?? [];
    if (stories.length > 0) {
      const byActivity: Record<string, any[]> = {};
      for (const s of stories) {
        (byActivity[(s as any).activityId] ??= []).push(s);
      }
      saveable.userStoriesByActivity = byActivity;
    }
    await projectStore.saveProject(projectId, saveable);
  }
}
