import { useCallback, useRef } from "react";
import { FileLoader } from "./components/FileLoader.tsx";
import { CanvasView } from "./components/CanvasView.tsx";
import { useCanvasStore } from "./store/canvas-store.ts";
import type { HeatmapData } from "./types.ts";

function Sidebar() {
  const { scaffoldData, heatmapData, canvasViewModel, loading, reset, loadHeatmap } =
    useCanvasStore();
  const heatmapInputRef = useRef<HTMLInputElement>(null);

  const handleHeatmapFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as Record<string, unknown>;

        if ("heatmapId" in json && "observations" in json) {
          await loadHeatmap(json as unknown as HeatmapData);
        } else {
          useCanvasStore.setState({
            error:
              "Not a valid heatmap file. Expected heatmapId and observations.",
          });
        }
      } catch {
        useCanvasStore.setState({ error: "Failed to parse heatmap JSON file" });
      }
    },
    [loadHeatmap],
  );

  const handleHeatmapInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleHeatmapFile(file);
      e.target.value = "";
    },
    [handleHeatmapFile],
  );

  if (!scaffoldData) {
    return (
      <div className="flex flex-col gap-3 p-4 text-sm text-gray-500">
        <p>Load a scaffold to begin.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Scaffold
        </h3>
        <p className="mt-1 text-sm font-medium text-vcc-800">
          {scaffoldData.name}
        </p>
        <p className="text-xs text-gray-500">{scaffoldData.scaffoldId}</p>
      </div>

      {canvasViewModel?.summary && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Summary
          </h3>
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-gray-500">Activities</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalActivities}
            </dd>
            <dt className="text-gray-500">Roles</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalRoles}
            </dd>
            <dt className="text-gray-500">Capabilities</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalCapabilities}
            </dd>
            <dt className="text-gray-500">Metrics</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalMetrics}
            </dd>
            <dt className="text-gray-500">Controls</dt>
            <dd className="font-medium text-vcc-800">
              {canvasViewModel.summary.totalControls}
            </dd>
          </dl>
        </div>
      )}

      {/* Heatmap section */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Friction Heatmap
        </h3>
        {heatmapData ? (
          <div className="mt-1">
            <p className="text-xs font-medium text-vcc-800">
              {heatmapData.heatmapId}
            </p>
            <p className="text-[10px] text-gray-500">
              {heatmapData.observations.length} observations
            </p>
          </div>
        ) : (
          <button
            onClick={() => heatmapInputRef.current?.click()}
            disabled={loading}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-vcc-400 hover:bg-gray-50 hover:text-vcc-600 disabled:opacity-50"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Load Heatmap
          </button>
        )}
        <input
          ref={heatmapInputRef}
          type="file"
          accept=".json"
          onChange={handleHeatmapInput}
          className="hidden"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-vcc-600">
          <svg
            className="h-3 w-3 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Processing...
        </div>
      )}

      <button
        onClick={reset}
        className="mt-auto rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
      >
        Load different scaffold
      </button>
    </div>
  );
}

export default function App() {
  const { canvasViewModel, error } = useCanvasStore();

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-vcc-900 px-6 py-3">
        <h1 className="text-base font-semibold tracking-tight text-white">
          Value Cognition Canvas
        </h1>
        <span className="text-xs text-vcc-300">v0.1.0</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 overflow-auto border-r border-gray-200 bg-white">
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {error && !canvasViewModel && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {canvasViewModel ? (
            <CanvasView />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FileLoader />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
