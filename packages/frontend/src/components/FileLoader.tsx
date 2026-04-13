/**
 * File import components (R-004: split from boolean prop)
 *
 * Two components sharing the same file-handling logic:
 *   - FileDropZone  — large drop zone with status feedback (used in App.tsx)
 *   - FileUploadButton — compact inline button (used in ProjectList.tsx)
 *
 * Both delegate to the useFileImport() hook for parsing and loading.
 */

import { useCallback, useRef, useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import type { ScaffoldData, HeatmapData, TransformationUserStory } from "../types.ts";
import type { CardRegistry } from "../types/cards.ts";
import {
  isPlausibleBABundle,
  normaliseBundle,
  detectArtifactType,
  normaliseConceptModelArtifact,
  normaliseCapabilityMapArtifact,
  normaliseValueStreamArtifact,
  mergeScaffolds,
} from "../utils/bundle-import.ts";
import { autoSaveToProject } from "../utils/auto-save.ts";
import PURETEC_CARDS from "../../fixtures/cards/puretec-cards.json";

/** Labels for user feedback on individual artifact imports */
const ARTIFACT_LABELS: Record<string, string> = {
  "concept-model": "Concept Model",
  "capability-map": "Capability Map",
  "value-stream": "Value Stream",
};

// ── Shared hook ─────────────────────────────────────────────────────

function useFileImport() {
  const { loadScaffold, loadHeatmap, loading, error, scaffoldData } =
    useCanvasStore();
  const [dragOver, setDragOver] = useState(false);
  const [importedArtifacts, setImportedArtifacts] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as Record<string, unknown>;

        // Detect file type: bundle, scaffold, individual artifact, or heatmap
        if ("bundleVersion" in json && "scaffold" in json) {
          // VCC Bundle v2.0 — load scaffold, all heatmaps, and user stories
          const bundle = json as unknown as Record<string, unknown>;
          await loadScaffold(bundle.scaffold as ScaffoldData);
          const heatmaps = (bundle.heatmaps as unknown[] ?? Object.values((bundle.heatmapsByVs as Record<string, unknown>) ?? {}));
          for (const heatmap of heatmaps) {
            await loadHeatmap(heatmap as HeatmapData);
          }
          if (bundle.userStoriesByActivity && typeof bundle.userStoriesByActivity === "object") {
            for (const [actId, stories] of Object.entries(bundle.userStoriesByActivity as Record<string, unknown>)) {
              useCanvasStore.getState().setActivityStories(actId, stories as TransformationUserStory[]);
            }
          }
          if (bundle.cardRegistry) {
            useCanvasStore.getState().loadCards(bundle.cardRegistry as CardRegistry);
          } else {
            useCanvasStore.getState().loadCards(PURETEC_CARDS as unknown as CardRegistry);
          }
          setImportedArtifacts([]);
        } else if (isPlausibleBABundle(json)) {
          const scaffold = normaliseBundle(json);
          await loadScaffold(scaffold);
          useCanvasStore.getState().loadCards(PURETEC_CARDS as unknown as CardRegistry);
          setImportedArtifacts([]);
        } else if ("scaffoldId" in json && "elements" in json) {
          await loadScaffold(json as unknown as ScaffoldData);
          useCanvasStore.getState().loadCards(PURETEC_CARDS as unknown as CardRegistry);
          setImportedArtifacts([]);
        } else if ("heatmapId" in json) {
          void loadHeatmap(json as unknown as HeatmapData);
        } else {
          const artifactType = detectArtifactType(json);

          if (artifactType !== "unknown") {
            let partialScaffold: ScaffoldData;

            switch (artifactType) {
              case "concept-model":
                partialScaffold = normaliseConceptModelArtifact(json);
                break;
              case "capability-map":
                partialScaffold = normaliseCapabilityMapArtifact(json);
                break;
              case "value-stream":
                partialScaffold = normaliseValueStreamArtifact(json);
                break;
              default:
                partialScaffold = normaliseBundle(json);
                break;
            }

            const currentScaffold = useCanvasStore.getState().scaffoldData;
            if (currentScaffold) {
              const merged = mergeScaffolds(currentScaffold, partialScaffold);
              await loadScaffold(merged);
            } else {
              await loadScaffold(partialScaffold);
              useCanvasStore.getState().loadCards(PURETEC_CARDS as unknown as CardRegistry);
            }

            const label = ARTIFACT_LABELS[artifactType] ?? artifactType;
            setImportedArtifacts((prev) => {
              const next = prev.includes(label) ? prev : [...prev, label];
              return next;
            });
          } else {
            useCanvasStore.setState({
              error:
                "Unrecognized JSON file. Expected a scaffold, heatmap, VCC bundle, or PlausibleBA artifact (concept model, capability map, or value stream).",
            });
            return;
          }
        }

        await autoSaveToProject();
      } catch (err) {
        console.error("[FileLoader] load error:", err);
        useCanvasStore.setState({
          error:
            err instanceof Error
              ? `Failed to load file: ${err.message}`
              : "Failed to parse JSON file",
        });
      }
    },
    [loadScaffold, loadHeatmap],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        void (async () => {
          for (const file of files) {
            await handleFile(file);
          }
        })();
      }
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
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        void (async () => {
          for (const file of files) {
            await handleFile(file);
          }
        })();
      }
      e.target.value = "";
    },
    [handleFile],
  );

  return {
    dragOver, loading, error, scaffoldData, importedArtifacts,
    fileInputRef, handleDrop, handleDragOver, handleDragLeave, handleClick, handleInputChange,
  };
}

// ── FileUploadButton (compact inline) ───────────────────────────────

export function FileUploadButton() {
  const {
    dragOver, loading,
    fileInputRef, handleDrop, handleDragOver, handleDragLeave, handleClick, handleInputChange,
  } = useFileImport();

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium transition-colors ${
        dragOver
          ? "border-vcc-500 bg-vcc-50 text-vcc-700"
          : "border-gray-300 text-gray-700 hover:border-vcc-400 hover:bg-gray-50"
      }`}
    >
      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      {loading ? "Importing..." : "Import File"}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}

// ── FileDropZone (full mode with status feedback) ───────────────────

export function FileDropZone() {
  const {
    dragOver, loading, error, scaffoldData, importedArtifacts,
    fileInputRef, handleDrop, handleDragOver, handleDragLeave, handleClick, handleInputChange,
  } = useFileImport();

  const hasScaffold = !!scaffoldData && !loading && !error;

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
            : hasScaffold
              ? "border-green-300 bg-green-50 hover:border-green-400 hover:bg-green-100"
              : "border-gray-300 bg-white hover:border-vcc-400 hover:bg-gray-50"
        }`}
      >
        <svg
          className={`mb-3 h-10 w-10 ${hasScaffold ? "text-green-500" : "text-gray-400"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {hasScaffold ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          )}
        </svg>
        {hasScaffold ? (
          <>
            <p className="text-sm font-medium text-green-700">
              Scaffold loaded — drop more artifacts to merge
            </p>
            {importedArtifacts.length > 0 && (
              <p className="mt-1 text-xs text-green-600">
                Imported: {importedArtifacts.join(", ")}
              </p>
            )}
            <p className="mt-1 text-xs text-green-500">
              Drop a Concept Model, Capability Map, or Value Stream to add it
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">
              Drop a scaffold, bundle, or PlausibleBA artifact here
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Accepts VCC Bundle, PlausibleBA Bundle, or individual artifacts — Concept Model, Capability Map, Value Stream (.json)
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          multiple
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

/**
 * @deprecated Use FileDropZone (full) or FileUploadButton (compact) directly.
 * Kept for backward compatibility during migration.
 */
export function FileLoader({ compact = false }: { compact?: boolean }) {
  return compact ? <FileUploadButton /> : <FileDropZone />;
}
