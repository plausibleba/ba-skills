/**
 * ImportView — dedicated page for importing reference models.
 *
 * Shows import cards (Guild Reference Model, future formats) with
 * drag-drop zones, file pickers, and import result summaries.
 *
 * Session 29 — Import page.
 */
import { useState, useRef, useCallback } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import { tv } from "../theme.ts";
import { autoSaveToProject } from "../utils/auto-save.ts";

/* ── Types ────────────────────────────────────────────────── */

interface ImportStats {
  valueStreams: number;
  activities: number;
  capabilities: number;
  roles: number;
  informationObjects: number;
  concepts?: number;
}

/* ── Main component ──────────────────────────────────────── */

export function ImportView() {
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ stats: ImportStats; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backToNetwork = useCanvasStore((s) => s.backToNetwork);

  const doImport = useCallback(async (file: File) => {
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const { importReferenceModelFile } = await import(
        "../utils/reference-model-import.ts"
      );
      const { scaffold, stats } = await importReferenceModelFile(file);

      // Count concepts if present
      const conceptCount = scaffold.elements.concepts
        ? Object.keys(scaffold.elements.concepts as Record<string, unknown>).length
        : 0;

      const store = useCanvasStore.getState();
      await store.loadScaffold(scaffold);
      await autoSaveToProject({});

      setResult({
        stats: { ...stats, concepts: conceptCount },
        name: scaffold.name,
      });

      console.log(
        `[ImportView] Reference model imported: ${stats.valueStreams} VS, ${stats.activities} activities, ${stats.capabilities} capabilities, ${stats.roles} roles, ${stats.informationObjects} IOs, ${conceptCount} concepts`,
      );
    } catch (err) {
      console.error("[ImportView] Reference model import failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) doImport(file);
      e.target.value = "";
    },
    [doImport],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && /\.xlsx?$/i.test(file.name)) {
        doImport(file);
      } else {
        setError("Please drop an Excel file (.xlsx or .xls)");
      }
    },
    [doImport],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div
      className="h-full overflow-auto p-8"
      style={{ background: tv.bgPrimary }}
    >
      {/* Page header */}
      <div className="mb-8 max-w-3xl">
        <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: tv.textDim }}>
          Import
        </div>
        <h1 className="mt-1 text-xl font-bold" style={{ color: tv.textPrimary }}>
          Import Reference Model
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: tv.textSecondary }}>
          Upload a reference model workbook to bootstrap your operating model with
          pre-built value streams, capabilities, and information concepts.
        </p>
      </div>

      {/* Import cards grid */}
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">

        {/* ── Guild Reference Model card ─────────────────── */}
        <div
          className="rounded-xl border p-6"
          style={{
            background: tv.bgCard,
            borderColor: tv.borderDefault,
          }}
        >
          {/* Card header */}
          <div className="mb-4 flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(74,158,218,0.12)" }}
            >
              <svg className="h-5 w-5" style={{ color: "#4a9eda" }} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: tv.textPrimary }}>
                Business Architecture Guild
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: tv.textDim }}>
                Reference Model workbook (.xlsx) with Capability Map, Value Streams,
                Stakeholder Map, and Information Map.
              </p>
            </div>
          </div>

          {/* Drag/drop zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            disabled={importing}
            className="group w-full cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all duration-150"
            style={{
              borderColor: dragOver
                ? "#4a9eda"
                : importing
                  ? tv.borderSubtle
                  : tv.borderDefault,
              background: dragOver
                ? "rgba(74,158,218,0.06)"
                : "transparent",
            }}
          >
            {importing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: tv.textDim, borderTopColor: "transparent" }} />
                <span className="text-xs font-medium" style={{ color: tv.textSecondary }}>
                  Importing reference model...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="h-8 w-8" style={{ color: tv.textDim }} fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-xs font-medium" style={{ color: tv.textSecondary }}>
                  Drop .xlsx file here or click to browse
                </span>
                <span className="text-[10px]" style={{ color: tv.textDim }}>
                  Supports Guild Reference Model format
                </span>
              </div>
            )}
          </button>

          {/* Error message */}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-xs text-red-300">{error}</span>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: tv.textPrimary }}>
                  {result.name} imported successfully
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Value Streams", value: result.stats.valueStreams, color: "#4a9eda" },
                  { label: "Activities", value: result.stats.activities, color: "#6366f1" },
                  { label: "Capabilities", value: result.stats.capabilities, color: "#f59e0b" },
                  { label: "Stakeholders", value: result.stats.roles, color: "#10b981" },
                  { label: "Info Objects", value: result.stats.informationObjects, color: "#ec4899" },
                  { label: "Concepts", value: result.stats.concepts ?? 0, color: "#8b5cf6" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg px-3 py-2"
                    style={{ background: `${stat.color}10` }}
                  >
                    <div className="text-base font-bold" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <div className="text-[10px]" style={{ color: tv.textDim }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigate to views */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={backToNetwork}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                  style={{ background: "#4a9eda" }}
                >
                  View Network
                </button>
                <button
                  onClick={() => useCanvasStore.getState().goToCapabilityMap()}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: tv.borderDefault, color: tv.textSecondary }}
                >
                  Capabilities
                </button>
                <button
                  onClick={() => useCanvasStore.getState().goToConceptGraph()}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: tv.borderDefault, color: tv.textSecondary }}
                >
                  Concepts
                </button>
              </div>
            </div>
          )}

          {/* What's included */}
          {!result && (
            <div className="mt-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: tv.textDim }}>
                Imports
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Capability Map", "Value Streams", "Stakeholders", "Information Concepts"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "rgba(74,158,218,0.1)",
                        color: "#4a9eda",
                      }}
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Coming soon placeholder ────────────────────── */}
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center"
          style={{
            borderColor: tv.borderSubtle,
            background: "transparent",
          }}
        >
          <svg className="mb-2 h-8 w-8" style={{ color: tv.textDim, opacity: 0.4 }} fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="text-xs font-medium" style={{ color: tv.textDim, opacity: 0.6 }}>
            More formats coming soon
          </span>
          <span className="mt-1 text-[10px]" style={{ color: tv.textDim, opacity: 0.4 }}>
            TOGAF, ArchiMate, custom CSV
          </span>
        </div>
      </div>
    </div>
  );
}
