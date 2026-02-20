import { useCallback, useRef, useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { ScaffoldData } from "../types.ts";

export function FileLoader() {
  const { loadScaffold, loadHeatmap, loading, error, scaffoldData } =
    useCanvasStore();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as Record<string, unknown>;

        // Detect if this is a scaffold or heatmap by checking for scaffoldId vs heatmapId
        if ("scaffoldId" in json && "elements" in json) {
          await loadScaffold(json as unknown as ScaffoldData);
        } else if ("heatmapId" in json) {
          loadHeatmap(json);
        } else {
          useCanvasStore.setState({
            error:
              "Unrecognized JSON file. Expected a scaffold (scaffoldId) or heatmap (heatmapId).",
          });
        }
      } catch {
        useCanvasStore.setState({ error: "Failed to parse JSON file" });
      }
    },
    [loadScaffold, loadHeatmap],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile],
  );

  if (scaffoldData && !loading && !error) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`flex w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
          dragOver
            ? "border-vcc-500 bg-vcc-50"
            : "border-gray-300 bg-white hover:border-vcc-400 hover:bg-gray-50"
        }`}
      >
        <svg
          className="mb-3 h-10 w-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm font-medium text-gray-600">
          Drop a scaffold JSON file here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Accepts ScaffoldModel (.json)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-vcc-600">
          <svg
            className="h-4 w-4 animate-spin"
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
          Validating and generating canvas...
        </div>
      )}

      {error && (
        <div className="w-full max-w-lg rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
