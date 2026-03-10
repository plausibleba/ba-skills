import { useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import SALESFORCE_LIB from "../../fixtures/vendor-libraries/salesforce-agentforce.json";
import type { VendorFeatureLibrary, Solution, FrictionObservation } from "../types.ts";
import { humanizeId } from "../lib/humanize-id.ts";
import { callLLM } from "../domain/pipeline/llm-client";

// ─── Vendor catalogue ─────────────────────────────────────────────────────────

const VENDOR_LIBRARIES: (VendorFeatureLibrary & { logoColour: string })[] = [
  { ...(SALESFORCE_LIB as VendorFeatureLibrary), logoColour: "bg-blue-500" },
];

function buildFeatureCatalogue(lib: VendorFeatureLibrary) {
  return lib.categories.map(cat => ({
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    features: cat.features.map(f => ({
      featureId: f.featureId,
      name: f.name,
      description: f.description,
    })),
  }));
}

// ─── Pass 4: Enrich observations with vendor solutions ────────────────────────

const BATCH_SIZE = 8; // max observations per LLM call to stay within 30s edge timeout

async function runPass4(
  observations: FrictionObservation[],
  lib: VendorFeatureLibrary,
  orgContext: string,
): Promise<FrictionObservation[]> {
  const catalogue = buildFeatureCatalogue(lib);

  // Build story lookup: featureId → storyIds from the full lib
  const storyIdsByFeature: Record<string, string[]> = {};
  (SALESFORCE_LIB as any).categories?.forEach((cat: any) => {
    cat.features?.forEach((f: any) => {
      if (f.customerStoryIds?.length) {
        storyIdsByFeature[f.featureId] = f.customerStoryIds;
      }
    });
  });

  // Batch observations to avoid exceeding the 30s Edge Runtime timeout on large bundles
  const solutionsByObs: Record<string, Solution[]> = {};
  for (let i = 0; i < observations.length; i += BATCH_SIZE) {
    const batch = observations.slice(i, i + BATCH_SIZE);
    const obsForPrompt = batch.map(o => ({
      observationId: o.observationId,
      category: o.category,
      rationale: o.rationale,
      intensity: o.intensity.score,
      evidenceBasis: (o as any).evidenceBasis ?? "ASSUMED",
    }));

    const prompt = `You are enriching a VCC governance diagnostic with solution recommendations.

Given friction observations from a discovery engagement, recommend which ${lib.vendorName} features best address each friction point.

## Organisation Context
${orgContext}

## Friction Observations
${JSON.stringify(obsForPrompt, null, 2)}

## ${lib.vendorName} Feature Catalogue
${JSON.stringify(catalogue, null, 2)}

## Your Task
For each observation, recommend 1-3 features that directly address the friction. Be specific — match the friction rationale to a feature that solves the described problem. Do not recommend generic features where specific ones exist.

Friction category guidance:
- DataSignalFriction → data-activation, data-summarisation, knowledge-grounding
- ProcessHandoffFriction → multi-agent, pipeline-management, field-dispatch
- TechnologyIntegrationFriction → data-activation, multi-agent
- DecisionAuthorityFriction → deal-desk-agent, pipeline-management
- GovernanceRiskFriction → knowledge-grounding, rep-assist
- IncentiveCapacityFriction → sales-coach, seller-onboarding, employee-agent

## Output Format
Return ONLY valid JSON with no markdown fences:
{
  "enriched": [
    {
      "observationId": "fr_001_...",
      "solutions": [
        {
          "solutionId": "sol_001_af-feature-id",
          "type": "Technology",
          "description": "1-2 sentences on how this feature addresses the specific friction",
          "vendorFeatureRef": {
            "vendorId": "${lib.vendorId}",
            "vendorName": "${lib.vendorName}",
            "featureId": "af-feature-id",
            "featureName": "Feature Name",
            "categoryName": "Category Name",
            "rationale": "Specific rationale linking this feature to the observed friction"
          }
        }
      ]
    }
  ]
}`;

    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });
    const result = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());

    // Map solutions back, attaching customer story IDs from the fixture
    (result.enriched ?? []).forEach((e: any) => {
      solutionsByObs[e.observationId] = (e.solutions ?? []).map((s: any) => {
        if (s.vendorFeatureRef?.featureId) {
          const storyIds = (storyIdsByFeature[s.vendorFeatureRef.featureId] ?? []).slice(0, 3);
          return { ...s, customerStoryIds: storyIds };
        }
        return s;
      });
    });
  }

  return observations.map(o => ({
    ...o,
    solutions: solutionsByObs[o.observationId] ?? o.solutions ?? [],
  }));
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── ContentSelectors ─────────────────────────────────────────────────────────

export function ContentSelectors() {
  const { scaffoldData, canvasViewModel, heatmapsByVs, loading, loadHeatmap, selectVs } =
    useCanvasStore();

  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const handleVsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) selectVs(e.target.value);
    setEnriched(false);
    setEnrichError(null);
  };

  async function handleEnrich(lib: VendorFeatureLibrary) {
    setShowVendorPicker(false);
    setEnriching(true);
    setEnrichError(null);

    try {
      const currentVsId = canvasViewModel?.valueStreamId;
      if (!currentVsId) throw new Error("No value stream selected");

      const orgContext = scaffoldData
        ? `Organisation: ${scaffoldData.name}. ${scaffoldData.description ?? ""}`
        : "Organisation context not available.";

      // Enrich the current VS heatmap; if none, enrich all loaded
      const vsIds = heatmapsByVs.has(currentVsId)
        ? [currentVsId]
        : Array.from(heatmapsByVs.keys());

      for (const vsId of vsIds) {
        const heatmap = heatmapsByVs.get(vsId);
        if (!heatmap?.observations?.length) continue;
        const enrichedObs = await runPass4(heatmap.observations, lib, orgContext);
        await loadHeatmap({
          ...heatmap,
          observations: enrichedObs,
          bindingConstraint: heatmap.bindingConstraint ?? null,
        });
      }

      // Force heatmapData refresh by re-selecting the current VS
      if (currentVsId) selectVs(currentVsId);
      setEnriched(true);
    } catch (e: any) {
      setEnrichError(e?.message ?? "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  }

  if (!scaffoldData) return null;

  const vsEntries = Object.entries(scaffoldData.elements.valueStreams);
  const currentVsId = canvasViewModel?.valueStreamId;
  const hasHeatmap = heatmapsByVs.size > 0;

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
              {(vs as { name?: string }).name ?? humanizeId(vsId)}
            </option>
          ))}
        </select>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* Enrich */}
      <div className="relative flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Enrich
        </span>

        {enriched ? (
          <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">Solutions loaded</span>
            <button
              onClick={() => setShowVendorPicker(v => !v)}
              className="ml-1 text-[10px] text-emerald-500 hover:text-emerald-700"
            >
              re-run ↓
            </button>
          </div>
        ) : enriching ? (
          <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5">
            <Spinner />
            <span className="text-xs font-medium text-blue-600">Enriching with {VENDOR_LIBRARIES[0].vendorName}…</span>
          </div>
        ) : (
          <button
            onClick={() => setShowVendorPicker(v => !v)}
            disabled={!hasHeatmap || loading}
            title={!hasHeatmap ? "Complete a discovery first to enable enrichment" : "Enrich with vendor solutions"}
            className="flex items-center gap-1.5 rounded-md border border-dashed border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-600 transition-colors hover:border-violet-400 hover:bg-violet-50/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Enrich with solutions →
          </button>
        )}

        {/* Vendor picker dropdown */}
        {showVendorPicker && (
          <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Select vendor library
              </p>
            </div>
            {VENDOR_LIBRARIES.map(lib => (
              <button
                key={lib.vendorId}
                onClick={() => handleEnrich(lib)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <div className={`flex h-4 w-4 items-center justify-center rounded ${lib.logoColour}`}>
                  <span className="text-[8px] font-bold text-white">{lib.vendorName[0]}</span>
                </div>
                {lib.vendorName}
                <span className="ml-auto text-[10px] text-gray-400">
                  {lib.categories.reduce((n, c) => n + c.features.length, 0)} features
                </span>
              </button>
            ))}
            <div className="border-t border-gray-100 px-3 py-2">
              <p className="text-[10px] italic text-gray-400">More vendors coming soon</p>
            </div>
          </div>
        )}
      </div>

      {enrichError && (
        <span className="text-[10px] text-red-500">{enrichError}</span>
      )}

      {loading && !enriching && (
        <div className="flex items-center gap-1.5 text-[10px] text-vcc-600">
          <Spinner />
          Processing…
        </div>
      )}
    </div>
  );
}
