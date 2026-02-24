import { useCallback, useRef } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { HeatmapData } from "../types.ts";

/* ── Content Selectors — Value Stream + Assessment ─────────────────── */

export function ContentSelectors() {
  const { scaffoldData, canvasViewModel, heatmapData, loading, loadHeatmap, selectVs } =
    useCanvasStore();
  const heatmapInputRef = useRef<HTMLInputElement>(null);

  const handleHeatmapFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as Record<string, unknown>;
        if ("heatmapId" in json && "observations" in json) {
          const heatmap = json as unknown as HeatmapData;

          if (scaffoldData && heatmap.scaffoldId && heatmap.scaffoldId !== scaffoldData.scaffoldId) {
            useCanvasStore.setState({
              error: `Heatmap scaffold mismatch: this heatmap was generated for "${heatmap.scaffoldId}" but the loaded scaffold is "${scaffoldData.scaffoldId}".`,
            });
            return;
          }

          if (scaffoldData && heatmap.valueStreamId && !scaffoldData.elements.valueStreams[heatmap.valueStreamId]) {
            useCanvasStore.setState({
              error: `Heatmap references value stream "${heatmap.valueStreamId}" which does not exist in this scaffold.`,
            });
            return;
          }

          await loadHeatmap(heatmap);
        } else {
          useCanvasStore.setState({ error: "Not a valid heatmap file." });
        }
      } catch {
        useCanvasStore.setState({ error: "Failed to parse heatmap JSON." });
      }
    },
    [loadHeatmap, scaffoldData],
  );

  const handleHeatmapInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleHeatmapFile(file);
      e.target.value = "";
    },
    [handleHeatmapFile],
  );

  const handleVsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const vsId = e.target.value;
      if (vsId) selectVs(vsId);
    },
    [selectVs],
  );

  if (!scaffoldData) return null;

  const vsEntries = Object.entries(scaffoldData.elements.valueStreams);
  const currentVsId = canvasViewModel?.valueStreamId;

  return (
    <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-2">
      {/* Value Stream selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Value Stream
        </span>
        <select
          value={currentVsId ?? ""}
          onChange={handleVsChange}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          {vsEntries.map(([vsId, vs]) => (
            <option key={vsId} value={vsId}>
              {(vs as { name?: string }).name ?? vsId}
            </option>
          ))}
        </select>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* Assessment (heatmap) selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Assessment
        </span>
        {heatmapData ? (
          <button
            onClick={() => heatmapInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {heatmapData.heatmapId}
            <svg
              className="h-3 w-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => heatmapInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-vcc-400 hover:text-vcc-600 disabled:opacity-50"
          >
            <svg
              className="h-3 w-3"
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
            Load Assessment
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
        <div className="flex items-center gap-1.5 text-[10px] text-vcc-600">
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
          Processing…
        </div>
      )}
    </div>
  );
}
