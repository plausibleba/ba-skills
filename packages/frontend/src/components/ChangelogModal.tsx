import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   Changelog data — newest first
   ═══════════════════════════════════════════════════════════════ */
export const APP_VERSION = "0.4.0";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  details?: string;
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.4.0",
    date: "2026-03-22",
    title: "Concept Model, Capability Inspector & UX Overhaul",
    highlights: [
      "New Concept Model view — ER-style diagram with tree sidebar, draggable nodes, curved edges with cardinality labels, and expandable attribute tables",
      "Enriched Capability Inspector — shows People, Process, Sub-Activities, Information Objects, Technology, and cross-VS usage from scaffold data",
      "Capability table view — toggle between treemap and sortable table with PPIT chip columns",
      "Smarter concept derivation — product/physical Resources inferred from value objects; Records constrained to one subject + one object",
      "Improved network resilience — 3 retries with 55s client-side timeout for dead-connection detection",
      "Fixed capability map bugs — correct domain names, overflow in horizontal layout, missing capabilities in 4-level hierarchy",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-03-10",
    title: "Enterprise Canvas & Multi-VS Support",
    highlights: [
      "Network view for multi-value-stream operating models",
      "Per-level layout toggles on capability map",
      "Split PPIT enrichment into separate Pass C for faster scaffold generation",
      "Inline response fields on gap analysis prompts",
      "Auto-save to Supabase with conflict detection",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-02-20",
    title: "Heatmaps & Value Stream Canvas",
    highlights: [
      "Stage-level canvas with drag-to-reorder activities",
      "Friction heatmap overlay per value stream",
      "MVC card generation (Pass D) with solution recommendations",
      "User story generation per activity",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-01-15",
    title: "Initial Release",
    highlights: [
      "Discovery intake — paste transcript or notes to generate an operating model",
      "AI-powered scaffold generation (Pass A → Pass B pipeline)",
      "Capability map treemap visualisation",
      "Bundle import/export (JSON)",
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   Version badge — clickable, opens the modal
   ═══════════════════════════════════════════════════════════════ */
export function VersionBadge({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "text-[10px] text-vcc-300/50 hover:text-vcc-200 transition-colors cursor-pointer"}
        title="View release notes"
      >
        v{APP_VERSION}
      </button>
      {open && <ChangelogModal onClose={() => setOpen(false)} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Inline link for project list
   ═══════════════════════════════════════════════════════════════ */
export function ChangelogLink() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        v{APP_VERSION} — Release notes
      </button>
      {open && <ChangelogModal onClose={() => setOpen(false)} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Modal
   ═══════════════════════════════════════════════════════════════ */
function ChangelogModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Release Notes</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Value Cognition Canvas</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-6">
          {CHANGELOG.map((entry, i) => (
            <div key={entry.version}>
              {/* Version header */}
              <div className="flex items-center gap-2.5 mb-2">
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  i === 0
                    ? "bg-vcc-50 text-vcc-700 ring-1 ring-vcc-200"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  v{entry.version}
                </span>
                <span className="text-[10px] text-gray-400">{entry.date}</span>
                {i === 0 && (
                  <span className="text-[9px] font-medium text-vcc-500 uppercase tracking-wider">Latest</span>
                )}
              </div>

              <h4 className="text-[13px] font-semibold text-gray-800 mb-1.5">
                {entry.title}
              </h4>

              <ul className="space-y-1">
                {entry.highlights.map((h, j) => (
                  <li key={j} className="flex items-start gap-2 text-[11px] leading-relaxed text-gray-600">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-300 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>

              {i < CHANGELOG.length - 1 && (
                <div className="mt-4 border-b border-gray-100" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            Built by PlausibleBA
          </span>
          <button
            onClick={onClose}
            className="text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
