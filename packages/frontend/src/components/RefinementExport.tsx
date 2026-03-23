/**
 * RefinementExport — Architectural Review & Regeneration handoff.
 *
 * After a Business Architect reviews and refines a model in VCC,
 * this component exports the refined bundle with a tailored prompt
 * that instructs PlausibleBA to regenerate around the architect's edits.
 *
 * The Business Architect's role is enterprise alignment — ensuring the
 * project-level model produced by a Business Analyst conforms to
 * organisational standards, governance structures, and strategic intent.
 *
 * Five refinement types, each with a distinct quality contribution:
 *
 * 1. Capability Map     — foundational; cascades to everything
 * 2. Concept Model      — ontological; fixes what the org manages
 * 3. Value Stream        — delivery narrative; fixes how value flows
 * 4. Stage–Cap Mapping   — cross-reference accuracy; most common AI error
 * 5. Full Model Review   — comprehensive architectural sign-off
 */

import { useState, useCallback } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";

// ─── Refinement type definitions ─────────────────────────────────────────────

interface RefinementType {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  role: string;        // What the architect was doing
  contribution: string; // Quality impact on the model
  rebuilds: string[];   // What gets regenerated
  preserves: string;    // What the AI must NOT change
}

const REFINEMENT_TYPES: RefinementType[] = [
  {
    id: "capability_map",
    label: "Capability Map Alignment",
    shortLabel: "Capabilities",
    icon: "🏛",
    role: "Aligned capability hierarchy to enterprise standards — corrected naming conventions, Execution/Governance classification, L1/L2/L3 structure, and MECE compliance.",
    contribution: "Foundational — capabilities are the backbone of the operating model. Every other artefact references them. Correcting capability names to match the organisation's actual language is the single highest-impact refinement.",
    rebuilds: [
      "Re-ground business objects against corrected capabilities",
      "Re-map stage requiresCapabilityIds to corrected cap IDs",
      "Rebuild PPIT decomposition per corrected capability",
      "Realign metrics and KPIs to corrected capability boundaries",
    ],
    preserves: "Do not rename, reorder, add, or remove any capabilities. The capability map is the architect's ground truth.",
  },
  {
    id: "concept_model",
    label: "Concept Model Review",
    shortLabel: "Concepts",
    icon: "🔷",
    role: "Reviewed business object taxonomy — corrected Party/Record/Resource classification, lifecycle states, and inter-object relationships to match enterprise ontology.",
    contribution: "Ontological — fixes what the organisation manages. Correcting object classification (e.g. moving something from Resource to Record) ripples through capability grounding and value stream stage objects.",
    rebuilds: [
      "Re-check businessObject references on each capability",
      "Update stage objects arrays to match corrected object IDs",
      "Rebuild concept graph relationships",
    ],
    preserves: "Do not rename, reclassify, add, or remove any business objects. The concept model is the architect's ground truth.",
  },
  {
    id: "value_stream",
    label: "Value Stream & Stage Refinement",
    shortLabel: "Value Stream",
    icon: "🔄",
    role: "Refined the delivery narrative — corrected stage sequencing, stage names, entry/exit criteria, and value object states to match actual business operations.",
    contribution: "Delivery narrative — fixes how the organisation delivers value. Correcting stage sequencing ensures transformation roadmaps are grounded in operational reality, not AI assumptions.",
    rebuilds: [
      "Re-assign capabilities to corrected stages",
      "Rebuild PPIT decomposition per corrected stage structure",
      "Regenerate outcome chain from corrected exit criteria",
      "Invalidate previous friction assessments (stages changed)",
    ],
    preserves: "Do not change stage names, ordering, entry/exit criteria, or value object states. The value stream is the architect's ground truth.",
  },
  {
    id: "stage_capability_mapping",
    label: "Stage-to-Capability Mapping",
    shortLabel: "Stage Mapping",
    icon: "🔗",
    role: "Corrected which capabilities appear in which stages — the most common error in AI-generated models. Domain experts know instinctively that certain capabilities don't belong in certain stages.",
    contribution: "Cross-reference accuracy — fixing the linkage between delivery stages and capabilities without changing either artefact independently. Directly improves friction assessment accuracy and throughput modelling.",
    rebuilds: [
      "Rebuild PPIT decomposition per corrected mapping",
      "Recalculate friction scores with correct stage/capability alignment",
      "Update throughput model dependency chains",
    ],
    preserves: "Do not change any capabilities or stage structure. Only the mapping between them has been corrected by the architect.",
  },
  {
    id: "full_review",
    label: "Full Architectural Review",
    shortLabel: "Full Review",
    icon: "✅",
    role: "Conducted a comprehensive architectural review — corrected capabilities, concepts, value stream stages, and all cross-references to align with enterprise standards and strategic intent.",
    contribution: "Comprehensive — the architect has reviewed and corrected the entire model. This is the highest-quality input possible and represents architectural sign-off on the project model.",
    rebuilds: [
      "Run full cross-validation (every cap referenced by ≥1 stage, every object grounds ≥1 cap, every stage has ≥1 cap)",
      "Report coverage gaps without changing the architect's model",
      "Rebuild PPIT and metrics to align with corrected model",
      "Update bundle metadata with review timestamp and version",
    ],
    preserves: "Do not change anything the architect has set. Only add missing linkages where obvious gaps exist, and flag them for the architect's confirmation.",
  },
];

// ─── Prompt generation ───────────────────────────────────────────────────────

function generatePrompt(
  selected: string[],
  bundleName: string,
): string {
  const types = REFINEMENT_TYPES.filter((t) => selected.includes(t.id));
  const isFull = selected.includes("full_review");

  const header = `# Architectural Refinement — Regenerate from Expert Review

You are receiving a PlausibleBA operating model that has been reviewed and refined
by a Business Architect in the Value Cognition Canvas (VCC). The architect's edits
represent domain expertise and enterprise alignment — they are ground truth.

**Model:** ${bundleName}
**Review type:** ${types.map((t) => t.label).join(", ")}
**Date:** ${new Date().toISOString().split("T")[0]}

---

## What the Architect Did
${types.map((t) => `\n### ${t.label}\n${t.role}`).join("\n")}

## Quality Contribution
${types.map((t) => `\n**${t.shortLabel}:** ${t.contribution}`).join("\n")}

## What You Must Rebuild
${types.flatMap((t) => t.rebuilds).map((r) => `- ${r}`).join("\n")}

## What You Must NOT Change
${types.map((t) => `- **${t.shortLabel}:** ${t.preserves}`).join("\n")}

---

## Instructions

1. Load the attached \`ba-skills-bundle.json\` — this is the architect's refined model.
2. Preserve every edit the architect has made (as specified above).
3. Rebuild the dependent artefacts listed under "What You Must Rebuild."
4. Run cross-validation:
   - Every capability should be referenced by at least one value stream stage.
   - Every business object should ground at least one capability.
   - Every stage should require at least one capability.
5. Report any gaps found, but do NOT fix them silently — flag them for the architect.
6. Export the regenerated model as a new \`ba-skills-bundle.json\`.

${isFull ? `## Architectural Sign-Off Note
This model has received full architectural review. Treat ALL elements as ground truth.
Your role is cross-validation and gap reporting, not correction.` : ""}

The attached JSON file is the refined bundle. Please proceed.`;

  return header;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RefinementExportModal({ onClose }: { onClose: () => void }) {
  const scaffoldData = useCanvasStore((s) => s.scaffoldData);
  const [selected, setSelected] = useState<string[]>([]);
  const [exported, setExported] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy prompt to clipboard");

  const toggleType = useCallback((id: string) => {
    setSelected((prev) => {
      if (id === "full_review") return ["full_review"];
      const without = prev.filter((s) => s !== "full_review");
      return without.includes(id)
        ? without.filter((s) => s !== id)
        : [...without, id];
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (!scaffoldData || selected.length === 0) return;

    // Generate the prompt
    const prompt = generatePrompt(selected, scaffoldData.name ?? "Operating Model");

    // Copy prompt to clipboard
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy prompt to clipboard"), 2000);
    } catch {
      setCopyLabel("Copy failed — see below");
    }

    // Download the bundle JSON
    const bundleExport = {
      meta: {
        bundleVersion: "1.0.0",
        name: scaffoldData.name,
        scaffoldId: scaffoldData.scaffoldId,
        refinedAt: new Date().toISOString(),
        refinementTypes: selected,
        generatedBy: "VCC Architectural Review Export",
      },
      elements: scaffoldData.elements,
    };

    const blob = new Blob([JSON.stringify(bundleExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(scaffoldData.name ?? "model").replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-")}-refined.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExported(true);
  }, [scaffoldData, selected]);

  if (!scaffoldData) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Architectural Review Export</h3>
            <p className="text-xs text-gray-500">Hand off your refined model for regeneration</p>
          </div>
        </div>

        <p className="mb-5 text-sm text-gray-600 leading-relaxed">
          Select what you refined in this model. VCC will export your edited bundle and generate a
          tailored prompt that instructs PlausibleBA to rebuild around your architectural decisions.
        </p>

        {/* Refinement type selection */}
        <div className="mb-5 space-y-2">
          {REFINEMENT_TYPES.map((type) => {
            const isSelected = selected.includes(type.id);
            const isDisabled = type.id !== "full_review" && selected.includes("full_review");

            return (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                disabled={isDisabled}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                    : isDisabled
                      ? "border-gray-100 bg-gray-50 opacity-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">{type.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{type.label}</span>
                      {isSelected && (
                        <svg className="h-4 w-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{type.contribution}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Export actions */}
        {!exported ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={selected.length === 0}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export bundle & copy prompt
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-emerald-800">Export complete</span>
            </div>
            <p className="text-xs text-emerald-700 mb-3">
              Your refined bundle has been downloaded and the regeneration prompt is on your clipboard.
            </p>
            <div className="text-xs text-emerald-600 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">1.</span>
                <span>Open a <strong>new Cowork task</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">2.</span>
                <span><strong>Paste the prompt</strong> from your clipboard (Cmd+V)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">3.</span>
                <span><strong>Attach the downloaded JSON</strong> file</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-700">4.</span>
                <span>Press Enter — PlausibleBA will rebuild around your refinements</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  const prompt = generatePrompt(selected, scaffoldData?.name ?? "Operating Model");
                  try {
                    await navigator.clipboard.writeText(prompt);
                    setCopyLabel("Copied!");
                    setTimeout(() => setCopyLabel("Copy prompt to clipboard"), 2000);
                  } catch { /* */ }
                }}
                className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                {copyLabel}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="mt-4 text-center text-[10px] text-gray-400">
          The regenerated model preserves all your architectural decisions.
        </p>
      </div>
    </div>
  );
}
