import { useCallback, useRef, useState } from "react";
import { useCanvasStore } from "../store/canvas-store.ts";
import SALESFORCE_LIB from "../../fixtures/vendor-libraries/salesforce-agentforce.json";
import type { VendorFeatureLibrary, Solution, FrictionObservation, HeatmapData } from "../types.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

const VENDOR_LIBRARIES: (VendorFeatureLibrary & { logoColour: string })[] = [
  { ...(SALESFORCE_LIB as VendorFeatureLibrary), logoColour: "bg-blue-500" },
];

// ─── Pass 3: Run friction assessment ─────────────────────────────────────────

async function runPass3(scaffold: any): Promise<HeatmapData> {
  const vsIds = Object.keys(scaffold.elements.valueStreams);
  const firstVsId = vsIds[0];

  const prompt = `You are a VCC Friction Assessment specialist. Analyse this scaffold and identify friction points.

## Scaffold
${JSON.stringify(scaffold, null, 2)}

## Your Task
Identify 3-6 friction observations across the value stream activities. For each:
- Assign a friction category: ProcessHandoffFriction, DataSignalFriction, TechnologyIntegrationFriction, DecisionAuthorityFriction, GovernanceRiskFriction, or IncentiveCapacityFriction
- Anchor to a specific activity ID from the scaffold
- Score intensity 1-10
- Classify evidence basis: EVIDENCED, INFERRED, or ASSUMED
- Write a specific rationale (1-2 sentences)

Also identify the single binding constraint — the highest-leverage friction point that cascades through the most downstream activities.

Return ONLY valid JSON:
{
  "heatmaps": [{
    "valueStreamId": "${firstVsId}",
    "observations": [
      {
        "observationId": "fr_001_snake_case_description",
        "category": "ProcessHandoffFriction",
        "primaryAnchor": { "anchorType": "Activity", "anchorId": "act-id-from-scaffold" },
        "intensity": { "scale": "0-10", "score": 8.0 },
        "confidence": 0.75,
        "evidenceBasis": "EVIDENCED",
        "rationale": "Specific rationale here"
      }
    ],
    "bindingConstraint": {
      "findingId": "bc_001",
      "bindingAnchor": { "anchorType": "Activity", "anchorId": "act-id-from-scaffold" },
      "bindingAnchorObservationId": "fr_001_snake_case_description",
      "justification": "Why this is the binding constraint",
      "confidence": 0.72
    }
  }]
}`;

  const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
  const result = JSON.parse(text.replace(/```json|```/g, "").trim());
  const hm = result.heatmaps?.[0];
  if (!hm) throw new Error("No heatmap in Pass 3 response");

  return {
    schemaVersion: "1.0",
    heatmapId: `heatmap-vs-${firstVsId}-${Date.now()}`,
    scaffoldId: scaffold.scaffoldId,
    valueStreamId: firstVsId,
    createdAt: new Date().toISOString(),
    observations: hm.observations ?? [],
    bindingConstraint: hm.bindingConstraint ?? null,
  };
}

// ─── Pass 4: Enrich with vendor solutions ─────────────────────────────────────

function buildFeatureCatalogue(lib: VendorFeatureLibrary) {
  return lib.categories.map(cat => ({
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    features: cat.features.map(f => ({ featureId: f.featureId, name: f.name, description: f.description })),
  }));
}

async function runPass4(
  observations: FrictionObservation[],
  lib: VendorFeatureLibrary,
  orgContext: string,
): Promise<FrictionObservation[]> {
  const catalogue = buildFeatureCatalogue(lib);
  const storyIdsByFeature: Record<string, string[]> = {};
  (SALESFORCE_LIB as any).categories?.forEach((cat: any) => {
    cat.features?.forEach((f: any) => {
      if (f.customerStoryIds?.length) storyIdsByFeature[f.featureId] = f.customerStoryIds;
    });
  });

  const obsForPrompt = observations.map(o => ({
    observationId: o.observationId,
    category: o.category,
    rationale: o.rationale,
    intensity: o.intensity.score,
  }));

  const prompt = `You are enriching a VCC diagnostic with solution recommendations.

## Organisation Context
${orgContext}

## Friction Observations
${JSON.stringify(obsForPrompt, null, 2)}

## ${lib.vendorName} Feature Catalogue
${JSON.stringify(catalogue, null, 2)}

## Task
For each observation recommend 1-3 features. Match friction category to feature type:
- DataSignalFriction → data-activation, data-summarisation, knowledge-grounding
- ProcessHandoffFriction → multi-agent, pipeline-management, field-dispatch
- TechnologyIntegrationFriction → data-activation, multi-agent
- DecisionAuthorityFriction → deal-desk-agent, pipeline-management
- GovernanceRiskFriction → knowledge-grounding, rep-assist
- IncentiveCapacityFriction → sales-coach, seller-onboarding, employee-agent

Return ONLY valid JSON:
{
  "enriched": [{
    "observationId": "fr_001_...",
    "solutions": [{
      "solutionId": "sol_001_af-feature-id",
      "type": "Technology",
      "description": "How this feature addresses the friction",
      "vendorFeatureRef": {
        "vendorId": "${lib.vendorId}",
        "vendorName": "${lib.vendorName}",
        "featureId": "af-feature-id",
        "featureName": "Feature Name",
        "categoryName": "Category Name",
        "rationale": "Specific rationale"
      }
    }]
  }]
}`;

  const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
  const result = JSON.parse(text.replace(/```json|```/g, "").trim());

  const solutionsByObs: Record<string, Solution[]> = {};
  (result.enriched ?? []).forEach((e: any) => {
    solutionsByObs[e.observationId] = (e.solutions ?? []).map((s: any) => {
      if (s.vendorFeatureRef?.featureId) {
        return { ...s, customerStoryIds: (storyIdsByFeature[s.vendorFeatureRef.featureId] ?? []).slice(0, 3) };
      }
      return s;
    });
  });

  return observations.map(o => ({
    ...o,
    solutions: solutionsByObs[o.observationId] ?? o.solutions ?? [],
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ small = false }: { small?: boolean }) {
  const sz = small ? "h-3 w-3" : "h-4 w-4";
  return (
    <svg className={`${sz} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function StepBadge({ n, active, complete }: { n: number; active: boolean; complete: boolean }) {
  return (
    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold
      ${complete ? "bg-emerald-500 text-white" : active ? "bg-vcc-600 text-white" : "bg-gray-200 text-gray-400"}`}>
      {complete ? "✓" : n}
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-gray-200" />;
}

// ─── StageWizard ──────────────────────────────────────────────────────────────

export function StageWizard() {
  const {
    scaffoldData,
    canvasViewModel,
    heatmapsByVs,
    enrichVersion,
    loading,
    loadHeatmap,
    selectVs,
  } = useCanvasStore();

  // Step 2 state
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const heatmapInputRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const enrichedInputRef = useRef<HTMLInputElement>(null);

  const currentVsId = canvasViewModel?.valueStreamId ?? null;
  const hasAssessment = currentVsId ? heatmapsByVs.has(currentVsId) : heatmapsByVs.size > 0;
  const isEnriched = (enrichVersion ?? 0) > 0;

  const step1Complete = !!scaffoldData;
  const step2Complete = hasAssessment;
  const step3Complete = isEnriched;

  // ── VS selector ──
  const handleVsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) selectVs(e.target.value);
  };

  // ── Step 2: Load heatmap from file ──
  const handleHeatmapFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as HeatmapData;
      if (!("heatmapId" in json)) throw new Error("Not a valid assessment file");
      await loadHeatmap(json);
    } catch (e: any) {
      setAssessError(e.message ?? "Failed to load assessment");
    }
  }, [loadHeatmap]);

  // ── Step 2: Run Pass 3 ──
  async function handleRunAssessment() {
    if (!scaffoldData) return;
    setAssessing(true);
    setAssessError(null);
    try {
      const heatmap = await runPass3(scaffoldData);
      await loadHeatmap(heatmap);
      if (currentVsId) selectVs(currentVsId);
    } catch (e: any) {
      setAssessError(e?.message ?? "Assessment failed");
    } finally {
      setAssessing(false);
    }
  }

  // ── Step 3: Load enriched heatmap from file ──
  const handleEnrichedFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as HeatmapData;
      if (!("heatmapId" in json)) throw new Error("Not a valid file");
      await loadHeatmap(json);
      if (currentVsId) selectVs(currentVsId);
    } catch (e: any) {
      setEnrichError(e.message ?? "Failed to load file");
    }
  }, [loadHeatmap, currentVsId, selectVs]);

  // ── Step 3: Run Pass 4 ──
  async function handleEnrich(lib: VendorFeatureLibrary) {
    setShowVendorPicker(false);
    setEnriching(true);
    setEnrichError(null);
    try {
      const orgContext = scaffoldData
        ? `Organisation: ${scaffoldData.name}. ${scaffoldData.description ?? ""}`
        : "Organisation context not available.";
      const vsIds = currentVsId && heatmapsByVs.has(currentVsId)
        ? [currentVsId]
        : Array.from(heatmapsByVs.keys());
      for (const vsId of vsIds) {
        const heatmap = heatmapsByVs.get(vsId);
        if (!heatmap?.observations?.length) continue;
        const enrichedObs = await runPass4(heatmap.observations, lib, orgContext);
        await loadHeatmap({ ...heatmap, observations: enrichedObs, bindingConstraint: heatmap.bindingConstraint ?? null });
      }
      if (currentVsId) selectVs(currentVsId);
    } catch (e: any) {
      setEnrichError(e?.message ?? "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  }

  if (!scaffoldData) return null;

  const vsEntries = Object.entries(scaffoldData.elements.valueStreams);
  const obsCount = currentVsId ? (heatmapsByVs.get(currentVsId)?.observations?.length ?? 0) : 0;
  const bindingName = currentVsId
    ? (() => {
        const hm = heatmapsByVs.get(currentVsId);
        const anchor = hm?.bindingConstraint?.bindingAnchor;
        if (!anchor) return null;
        if (anchor.anchorType === "Activity") {
          return scaffoldData.elements.activities[anchor.anchorId]?.name ?? null;
        }
        return null;
      })()
    : null;

  return (
    <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-4">

      {/* ── Step 1: Scaffold ── */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <StepBadge n={1} active={true} complete={step1Complete} />
        <div className="flex flex-col">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Scaffold</span>
          <select
            value={currentVsId ?? ""}
            onChange={handleVsChange}
            className="mt-0.5 rounded border-0 bg-transparent p-0 text-xs font-medium text-gray-700 focus:ring-0"
          >
            {vsEntries.map(([vsId, vs]) => (
              <option key={vsId} value={vsId}>
                {(vs as { name?: string }).name ?? vsId}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Divider />

      {/* ── Step 2: Assess Friction ── */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <StepBadge n={2} active={step1Complete} complete={step2Complete} />
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Assess Friction</span>
          {step2Complete ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-emerald-600">
                {obsCount} observations{bindingName ? ` · Binding: ${bindingName}` : ""}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => heatmapInputRef.current?.click()}
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Load different assessment"
                >↑ Load</button>
                <button
                  onClick={handleRunAssessment}
                  disabled={assessing}
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium text-vcc-500 hover:bg-vcc-50 hover:text-vcc-700 disabled:opacity-40"
                  title="Re-run assessment"
                >↺ Re-run</button>
              </div>
            </div>
          ) : assessing ? (
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600">
              <Spinner small />
              Assessing friction…
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => heatmapInputRef.current?.click()}
                disabled={!step1Complete}
                className="flex items-center gap-1 rounded border border-dashed border-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-40"
              >
                ↑ Load previous
              </button>
              <span className="text-[9px] text-gray-300">or</span>
              <button
                onClick={handleRunAssessment}
                disabled={!step1Complete}
                className="flex items-center gap-1 rounded bg-vcc-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-vcc-700 disabled:opacity-40"
              >
                ▶ Run new
              </button>
            </div>
          )}
          {assessError && <span className="text-[9px] text-red-500">{assessError}</span>}
        </div>
        <input ref={heatmapInputRef} type="file" accept=".json"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleHeatmapFile(f); e.target.value = ""; }}
          className="hidden" />
      </div>

      <Divider />

      {/* ── Step 3: Enrich Solutions ── */}
      <div className="relative flex items-center gap-2 px-4 py-2.5">
        <StepBadge n={3} active={step2Complete} complete={step3Complete} />
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Enrich Solutions</span>
          {step3Complete ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-emerald-600">Solutions loaded</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => enrichedInputRef.current?.click()}
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >↑ Load</button>
                <button
                  onClick={() => setShowVendorPicker(v => !v)}
                  disabled={enriching}
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium text-vcc-500 hover:bg-vcc-50 hover:text-vcc-700 disabled:opacity-40"
                >↺ Re-run</button>
              </div>
            </div>
          ) : enriching ? (
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600">
              <Spinner small />
              Enriching solutions…
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => enrichedInputRef.current?.click()}
                disabled={!step2Complete}
                className="flex items-center gap-1 rounded border border-dashed border-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-40"
              >
                ↑ Load previous
              </button>
              <span className="text-[9px] text-gray-300">or</span>
              <button
                onClick={() => setShowVendorPicker(v => !v)}
                disabled={!step2Complete}
                className="flex items-center gap-1 rounded border border-dashed border-violet-300 px-2 py-0.5 text-[10px] font-medium text-violet-600 hover:border-violet-400 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ▶ Run new
              </button>
            </div>
          )}
          {enrichError && <span className="text-[9px] text-red-500">{enrichError}</span>}
        </div>

        {/* Vendor picker */}
        {showVendorPicker && (
          <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Select vendor library</p>
            </div>
            {VENDOR_LIBRARIES.map(lib => (
              <button key={lib.vendorId} onClick={() => handleEnrich(lib)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50">
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

        <input ref={enrichedInputRef} type="file" accept=".json"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleEnrichedFile(f); e.target.value = ""; }}
          className="hidden" />
      </div>

      {loading && !assessing && !enriching && (
        <div className="ml-2 flex items-center gap-1.5 text-[10px] text-vcc-600">
          <Spinner small />
          Processing…
        </div>
      )}
    </div>
  );
}
