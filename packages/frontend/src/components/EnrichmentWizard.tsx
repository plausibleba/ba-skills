import { useState, useCallback } from "react";
import { runEnrichmentStep } from "../domain/pipeline/pipeline-orchestrator";
import type { EnrichmentStep, PipelineProgress } from "../domain/pipeline/pipeline-orchestrator";
import type { DiscoveryIR } from "../domain/pipeline/discovery-ir";
import WaitPuzzle from "./WaitPuzzle";

// ─── Enrichment Step Definitions ──────────────────────────────────────────────

interface StepDef {
  id: EnrichmentStep;
  label: string;
  description: string;
  icon: string;      // emoji stand-in for now
  puzzleStep: string; // WaitPuzzle step label key
  order: number;
}

const ENRICHMENT_STEPS: StepDef[] = [
  {
    id: "subactivities",
    label: "Deepen Structure",
    description: "Generate sub-activity DAGs showing the internal breakdown of each stage — decision gates, handoffs, and work steps.",
    icon: "🔀",
    puzzleStep: "subactivities",
    order: 1,
  },
  {
    id: "ppit",
    label: "Map PPIT",
    description: "Decompose each capability into People, Process, Information, and Technology dimensions per stage.",
    icon: "🧩",
    puzzleStep: "ppit",
    order: 2,
  },
  {
    id: "cards",
    label: "Generate Cards",
    description: "Create Concept Cards and Policy Cards that capture business definitions, rules, and governance.",
    icon: "🃏",
    puzzleStep: "cards",
    order: 3,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface EnrichmentWizardProps {
  bundle: any;
  discoveryIR?: DiscoveryIR;
  onBundleUpdate: (bundle: any) => void;
}

export default function EnrichmentWizard({ bundle, discoveryIR, onBundleUpdate }: EnrichmentWizardProps) {
  const [completed, setCompleted] = useState<Set<EnrichmentStep>>(new Set());
  const [running, setRunning] = useState<EnrichmentStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runStep = useCallback(async (step: EnrichmentStep) => {
    const scaffold = bundle?.scaffold;
    if (!scaffold) return;

    setRunning(step);
    setError(null);

    try {
      await runEnrichmentStep(step, scaffold, discoveryIR, (progress: PipelineProgress) => {
        if (progress.status === "enrichment-done") {
          // Update the bundle with enriched scaffold
          const updatedBundle = { ...bundle, scaffold: progress.scaffold };
          if (progress.cardRegistry) {
            updatedBundle.cardRegistry = progress.cardRegistry;
          }
          onBundleUpdate(updatedBundle);
          setCompleted(prev => new Set([...prev, step]));
          setRunning(null);
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`${step} enrichment failed: ${msg}`);
      setRunning(null);
    }
  }, [bundle, discoveryIR, onBundleUpdate]);

  // Check if scaffold already has enrichment data (e.g. from a re-opened bundle)
  const scaffold = bundle?.scaffold;
  const hasSubActivities = scaffold?.elements?.subActivityGraphs &&
    Object.keys(scaffold.elements.subActivityGraphs).length > 0 &&
    Object.values(scaffold.elements.subActivityGraphs).some((v: any) => v?.nodes?.length > 0);
  const hasPPIT = scaffold?.elements?.activities &&
    Object.values(scaffold.elements.activities).some((a: any) => a.capabilityPPIT && Object.keys(a.capabilityPPIT).length > 0);
  const hasCards = bundle?.cardRegistry &&
    ((bundle.cardRegistry.conceptCards?.length ?? 0) > 0 || (bundle.cardRegistry.policyCards?.length ?? 0) > 0);

  const stepStatus = (step: EnrichmentStep): "done" | "running" | "available" => {
    if (running === step) return "running";
    if (completed.has(step)) return "done";
    // Check pre-existing enrichment data
    if (step === "subactivities" && hasSubActivities) return "done";
    if (step === "ppit" && hasPPIT) return "done";
    if (step === "cards" && hasCards) return "done";
    return "available";
  };

  const allDone = ENRICHMENT_STEPS.every(s => stepStatus(s.id) === "done");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Enrich your model</h3>
        {allDone && (
          <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">All complete</span>
        )}
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Your lean scaffold is ready to explore. Each enrichment step adds depth — run them in any order, or open the canvas now and come back later.
      </p>

      {/* Running step — show puzzle */}
      {running && (
        <div className="py-3">
          <WaitPuzzle step={running} />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-amber-500 hover:text-amber-700 mt-1 underline">Dismiss</button>
        </div>
      )}

      {/* Step cards */}
      {!running && (
        <div className="grid gap-2">
          {ENRICHMENT_STEPS.map((step) => {
            const status = stepStatus(step.id);
            return (
              <div
                key={step.id}
                className={`rounded-lg border px-4 py-3 flex items-center gap-3 transition-all ${
                  status === "done"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="text-lg flex-shrink-0">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${status === "done" ? "text-emerald-700" : "text-slate-700"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{step.description}</p>
                </div>
                {status === "done" ? (
                  <span className="flex-shrink-0 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Done
                  </span>
                ) : (
                  <button
                    onClick={() => runStep(step.id)}
                    className="flex-shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700 transition-all whitespace-nowrap"
                  >
                    Run
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
