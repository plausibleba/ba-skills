/**
 * Conflict Banner (D-109: Optimistic locking UX)
 *
 * Shown when an auto-save fails due to a revision mismatch — another user
 * (or another tab) modified the project since it was last loaded.
 *
 * Offers two clear actions:
 *  1. Reload — discard local changes and pull the latest version
 *  2. Overwrite — force-save local changes (bumps revision, discards remote)
 */
import { useState } from "react";
import { useProjectStore } from "../store/project-store.ts";
import { useCanvasStore } from "../store/canvas-store.ts";

export function ConflictBanner() {
  const { conflict, reloadProject, saveProject, currentProjectId, clearConflict } =
    useProjectStore();
  const [busy, setBusy] = useState<"reload" | "overwrite" | null>(null);

  if (!conflict) return null;

  const handleReload = async () => {
    setBusy("reload");
    await reloadProject();
    setBusy(null);
  };

  const handleOverwrite = async () => {
    if (!currentProjectId) return;
    setBusy("overwrite");

    // Build the current bundle from canvas state
    const canvasState = useCanvasStore.getState();
    const { scaffoldData, heatmapsByVs, userStoriesByActivity } = canvasState;
    if (!scaffoldData) {
      setBusy(null);
      return;
    }

    const bundle = {
      bundleVersion: "2.0",
      updatedAt: new Date().toISOString(),
      scaffold: scaffoldData,
      heatmaps: Array.from(heatmapsByVs.values()),
      userStoriesByActivity,
    };

    const result = await saveProject(currentProjectId, bundle, { force: true });
    if (result.ok) {
      useCanvasStore.setState({ scaffoldDirty: false });
    }
    setBusy(null);
  };

  return (
    <div className="flex flex-shrink-0 items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 shadow-sm">
      {/* Warning icon */}
      <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      <p className="flex-1 text-xs text-amber-800">
        This project was modified by another user while you were editing.
        Auto-save is paused until you resolve this.
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={handleReload}
          disabled={busy !== null}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
        >
          {busy === "reload" ? "Reloading…" : "Reload latest"}
        </button>
        <button
          onClick={handleOverwrite}
          disabled={busy !== null}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy === "overwrite" ? "Saving…" : "Overwrite with mine"}
        </button>
        <button
          onClick={clearConflict}
          disabled={busy !== null}
          className="text-xs text-amber-400 hover:text-amber-600"
          title="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
