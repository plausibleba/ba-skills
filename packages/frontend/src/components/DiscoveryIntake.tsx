import { useState, useCallback, useRef, useEffect } from "react";
import { useProjectStore } from "../store/project-store.ts";
import { useGateCheck } from "../hooks/useGateCheck.ts";
import { runPipeline, continuePipeline } from "../domain/pipeline/pipeline-orchestrator";
import type { PipelineProgress } from "../domain/pipeline/pipeline-orchestrator";
import { buildDiscoveryIR, makeId, type LayoutZone } from "../domain/pipeline/discovery-ir";
import { LAYER_SCHEMES, DEFAULT_SCHEME, type LayerDef } from "../lib/layer-schemes";
import WaitPuzzle from "./WaitPuzzle";
import EnrichmentWizard from "./EnrichmentWizard";
import * as XLSX from "xlsx";

// ─── Colour palette matching VCC design ───────────────────────────────────
const INDUSTRY_OPTIONS = [
  "Financial Services","Healthcare","Retail","Technology","Manufacturing",
  "Education","Nonprofit","Travel","Communications","Energy",
  "Consumer Goods","Professional Services","Public Sector","Transportation",
  "Real Estate","Automotive","Media","Life Sciences","Hospitality",
];

const SIZE_OPTIONS = [
  "0–500","500–1k","1k–5k","5k–10k","10k–50k","50k–100k","100k–200k","200k+",
];

const FRICTION_CATEGORIES = [
  { value: "DataSignalFriction",        label: "Data / Signal" },
  { value: "ProcessHandoffFriction",    label: "Process Handoff" },
  { value: "GovernanceRiskFriction",    label: "Governance / Risk" },
  { value: "IncentiveCapacityFriction", label: "Incentive / Capacity" },
  { value: "DecisionAuthorityFriction", label: "Decision Authority" },
];

const TECH_TYPES = ["CRM","ERP","Comms","Analytics","Field","Custom","Other"];
const ROLE_TYPES = ["Internal","External","System"];
// ─── Scoring weights ────────────────────────────────────────────────────────
function calcReadiness(form: FormState) {
  let score = 0;
  // Org: 10%
  if (form.org.name && form.org.industry) score += 10;
  // Value streams + stages: 35%
  const vsWithStages = form.valueStreams.filter(vs => vs.name && vs.stages.length >= 2);
  score += Math.min(35, vsWithStages.length * 12);
  // Roles: 10%
  score += Math.min(10, form.roles.filter(r => r.name).length * 3);
  // Tech: 10%
  score += Math.min(10, form.tech.filter(t => t.name).length * 4);
  // Pain points: 25%
  const richPP = form.painPoints.filter(p => p.description && p.category && p.affectedStage);
  score += Math.min(25, richPP.length * 9);
  // Metrics: 10%
  score += Math.min(10, form.metrics.filter(m => m.name).length * 5);
  return Math.min(100, Math.round(score));
}

function readinessLabel(score: number) {
  if (score < 41) return { label: "Insufficient", colour: "text-red-600", bg: "bg-red-500" };
  if (score < 61) return { label: "Draft", colour: "text-amber-600", bg: "bg-amber-500" };
  if (score < 81) return { label: "Viable", colour: "text-blue-600", bg: "bg-blue-500" };
  return { label: "Rich", colour: "text-emerald-600", bg: "bg-emerald-500" };
}

// Layer Schemes — imported from lib/layer-schemes.ts (R-011)

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stage { name: string; confidence?: string }
interface VS { id: number; name: string; description: string; zone: string; stages: Stage[]; stakeholder: string; trigger?: string; terminalOutcome?: string; confidence?: string; extractedCapabilities?: any[] }
interface Role { id: number; name: string; type: string; vsRefs?: string[]; notes: string; confidence?: string }
interface Tech { id: number; name: string; type: string; friction: boolean; notes: string; confidence?: string }
interface PainPoint { id: number; description: string; category: string; intensity: number; affectedStage: string; binding: boolean; confidence?: string }
interface Metric { id: number; name: string; current: string; target: string; stage: string; confidence?: string }
interface Gap { severity: string; prompt: string; response?: string }
interface FormState {
  org: { name: string; industry: string; companySize: string; description: string; stakeholder: string; confidence?: string };
  layerSchemeId: string;
  customLayers: LayerDef[];
  valueStreams: VS[];
  roles: Role[];
  tech: Tech[];
  painPoints: PainPoint[];
  metrics: Metric[];
  gaps: Gap[];
  source: string;
  extractionMeta: { extractedAt: string; passes?: number } | null;
  /** Preserved from A2 — full L1/L2/L3/L4 hierarchy so Pass B gets proper domain names */
  capabilityMap?: any;
  /** Preserved from A2 — stage → capability assignments */
  stageCapabilities?: any[];
}

// ─── Initial state ──────────────────────────────────────────────────────────
const EMPTY_FORM: FormState = {
  org: { name: "", industry: "", companySize: "", description: "", stakeholder: "" },
  layerSchemeId: DEFAULT_SCHEME.id,
  customLayers: [],
  valueStreams: [{ id: 1, name: "", description: "", zone: DEFAULT_SCHEME.layers[0].id, stages: [], stakeholder: "" }],
  roles: [],
  tech: [],
  painPoints: [],
  metrics: [],
  gaps: [],
  source: "structured_form",
  extractionMeta: null,
};

// ─── Small atoms ────────────────────────────────────────────────────────────

function ConfidenceDot({ level }: { level: string }) {
  const c = level === "high" ? "bg-emerald-400" : level === "medium" ? "bg-amber-400" : "bg-red-400";
  const tip = level === "high" ? "High confidence" : level === "medium" ? "Medium — verify" : "Low — needs review";
  return (
    <span title={tip} className={`inline-block h-1.5 w-1.5 rounded-full ${c} flex-shrink-0 mt-1`} />
  );
}

function SectionHeader({ number, title, count }: { number: string | number; title: string; count?: string | number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex-shrink-0">
        {number}
      </span>
      <h2 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto text-xs text-slate-400">{count}</span>
      )}
    </div>
  );
}

function Field({ label, required, gap, confidence, children }: { label: string; required?: boolean; gap?: string; confidence?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        {required && <span className="text-red-400 text-xs">*</span>}
        {confidence && <ConfidenceDot level={confidence} />}
        {gap && <span className="text-[10px] text-amber-600 font-medium ml-1">← {gap}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all";
const textareaCls = `${inputCls} resize-none`;

// ─── Stage tag input ─────────────────────────────────────────────────────────
function StageTagInput({ stages, onChange }: { stages: Stage[]; onChange: (stages: Stage[]) => void }) {
  const [draft, setDraft] = useState("");
  function addStage(name: string) {
    const n = name.trim();
    if (!n) return;
    if (!stages.find(s => s.name.toLowerCase() === n.toLowerCase())) {
      onChange([...stages, { name: n, confidence: "user" }]);
    }
    setDraft("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {stages.map((s, i) => (
          <span key={i} className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
            <span className="text-slate-400 text-[10px] font-mono">{i + 1}</span>
            {s.name}
            {s.confidence && s.confidence !== "user" && <ConfidenceDot level={s.confidence} />}
            <button onClick={() => onChange(stages.filter((_, j) => j !== i))}
              className="ml-0.5 text-slate-400 hover:text-red-400 leading-none">×</button>
          </span>
        ))}
      </div>
      <input
        className={inputCls}
        value={draft}
        placeholder="Type a stage name, press Enter or comma"
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addStage(draft); }
        }}
        onBlur={() => addStage(draft)}
      />
    </div>
  );
}

// ─── Gap Prompter ─────────────────────────────────────────────────────────
function GapPrompter({
  gaps,
  onDismiss,
  onResponse,
}: {
  gaps: Gap[];
  onDismiss: (i: number) => void;
  onResponse: (i: number, text: string) => void;
}) {
  if (!gaps || gaps.length === 0) return null;
  const req = gaps.filter(g => g.severity === "required");
  const answered = gaps.filter(g => g.response?.trim()).length;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-800">
          {req.length > 0 ? `${req.length} gap${req.length > 1 ? "s" : ""} to fill for richer output` : "Recommendations"}
        </p>
        {answered > 0 && (
          <span className="text-[10px] text-emerald-600 font-medium">{answered}/{gaps.length} answered</span>
        )}
      </div>
      {gaps.map((g, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-start gap-2">
            <span className={`mt-0.5 text-[10px] font-bold px-1 py-0.5 rounded shrink-0 ${
              g.severity === "required" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
            }`}>{g.severity === "required" ? "REQ" : "REC"}</span>
            <p className="text-xs text-amber-900 leading-relaxed flex-1">{g.prompt}</p>
            <button onClick={() => onDismiss(i)} className="text-amber-400 hover:text-amber-600 text-sm mt-0.5 shrink-0">×</button>
          </div>
          <div className="ml-7">
            <textarea
              value={g.response ?? ""}
              onChange={(e) => onResponse(i, e.target.value)}
              placeholder="Your answer (optional — improves scaffold quality)…"
              rows={1}
              className="w-full rounded border border-amber-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 resize-y"
              style={{ minHeight: 32 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Readiness Bar ────────────────────────────────────────────────────────
function ReadinessBar({ score }: { score: number }) {
  const { label, colour, bg } = readinessLabel(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Discovery Readiness</span>
        <span className={`text-xs font-bold ${colour}`}>{score}% — {label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bg}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex text-[9px] text-slate-300 justify-between">
        <span>Insufficient</span>
        <span>Draft</span>
        <span>Viable</span>
        <span>Rich</span>
      </div>
    </div>
  );
}

// ─── Extraction Summary ──────────────────────────────────────────────────
function ExtractionSummary({ meta, form }: { meta: FormState["extractionMeta"]; form: FormState }) {
  if (!meta) return null;
  const fields = [
    { label: "Organisation", ok: !!form.org.name },
    { label: "Industry", ok: !!form.org.industry },
    { label: `Value streams (${form.valueStreams.filter(v=>v.name).length})`, ok: form.valueStreams.some(v=>v.name) },
    { label: `Stages`, ok: form.valueStreams.some(v=>v.stages.length > 0) },
    { label: `Roles (${form.roles.length})`, ok: form.roles.length > 0 },
    { label: `Tech stack (${form.tech.length})`, ok: form.tech.length > 0 },
    { label: `Pain points (${form.painPoints.length})`, ok: form.painPoints.length > 0 },
    { label: `Metrics (${form.metrics.length})`, ok: form.metrics.length > 0 },
  ];
  const ok = fields.filter(f => f.ok).length;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-600">Extraction result</p>
        <span className="text-xs text-slate-500">{ok}/{fields.length} fields populated</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className={f.ok ? "text-emerald-500" : "text-slate-300"}>
              {f.ok ? "✓" : "○"}
            </span>
            <span className={f.ok ? "text-slate-700" : "text-slate-400"}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function DiscoveryIntake({ onComplete }: { onComplete?: (bundle: any) => void }) {
  const [mode, setMode] = useState("freeform"); // "freeform" | "structured"
  const setIntakeTab = useProjectStore((s) => s.setIntakeTab);
  useEffect(() => {
    setIntakeTab(mode === "freeform" ? "provide" : "form");
    return () => setIntakeTab(null);
  }, [mode, setIntakeTab]);
  const [scope, setScope] = useState<"business" | "initiative">("business");
  const [transcript, setTranscript] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [extracting, setExtracting] = useState(false);
  const [extractPass, setExtractPass] = useState(0); // 1 = VS & stages, 2 = roles & capabilities
  const [extractDone, setExtractDone] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateStep, setGenerateStep] = useState(""); // "scaffold" | "validating" | "enriching" | ""
  const [generated, setGenerated] = useState(false);
  const [generatedBundle, setGeneratedBundle] = useState<any>(null);
  const [lastDiscoveryIR, setLastDiscoveryIR] = useState<any>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const readiness = calcReadiness(form);
  const { gate } = useGateCheck();

  // ─── Active layer scheme ────────────────────────────────────────────────
  const activeScheme = LAYER_SCHEMES.find(s => s.id === form.layerSchemeId) ?? DEFAULT_SCHEME;
  const activeLayers = form.layerSchemeId === "custom" ? form.customLayers : activeScheme.layers;

  // ─── Form updaters ───────────────────────────────────────────────────────
  const setOrg = (patch: Partial<FormState["org"]>) => setForm(f => ({ ...f, org: { ...f.org, ...patch } }));
  const setVS = (id: number, patch: Partial<VS>) => setForm(f => ({
    ...f,
    valueStreams: f.valueStreams.map(vs => vs.id === id ? { ...vs, ...patch } : vs)
  }));
  const addVS = () => setForm(f => {
    const scheme = LAYER_SCHEMES.find(s => s.id === f.layerSchemeId) ?? DEFAULT_SCHEME;
    const layers = f.layerSchemeId === "custom" ? f.customLayers : scheme.layers;
    return { ...f, valueStreams: [...f.valueStreams, { id: Date.now(), name: "", description: "", zone: layers[0]?.id ?? "ecosystem", stages: [], stakeholder: "" }] };
  });
  const removeVS = (id: number) => setForm(f => ({ ...f, valueStreams: f.valueStreams.filter(vs => vs.id !== id) }));

  const addRole = () => setForm(f => ({ ...f, roles: [...f.roles, { id: Date.now(), name: "", type: "Internal", vsRefs: [], notes: "" }] }));
  const setRole = (id: number, patch: Partial<Role>) => setForm(f => ({ ...f, roles: f.roles.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const removeRole = (id: number) => setForm(f => ({ ...f, roles: f.roles.filter(r => r.id !== id) }));

  const addTech = () => setForm(f => ({ ...f, tech: [...f.tech, { id: Date.now(), name: "", type: "CRM", friction: false, notes: "" }] }));
  const setTech = (id: number, patch: Partial<Tech>) => setForm(f => ({ ...f, tech: f.tech.map(t => t.id === id ? { ...t, ...patch } : t) }));
  const removeTech = (id: number) => setForm(f => ({ ...f, tech: f.tech.filter(t => t.id !== id) }));

  const addPP = () => setForm(f => ({ ...f, painPoints: [...f.painPoints, { id: Date.now(), description: "", category: "", intensity: 7, affectedStage: "", binding: false }] }));
  const setPP = (id: number, patch: Partial<PainPoint>) => setForm(f => ({ ...f, painPoints: f.painPoints.map(p => p.id === id ? { ...p, ...patch } : p) }));
  const removePP = (id: number) => setForm(f => ({ ...f, painPoints: f.painPoints.filter(p => p.id !== id) }));

  const addMetric = () => setForm(f => ({ ...f, metrics: [...f.metrics, { id: Date.now(), name: "", current: "", target: "", stage: "" }] }));
  const setMetric = (id: number, patch: Partial<Metric>) => setForm(f => ({ ...f, metrics: f.metrics.map(m => m.id === id ? { ...m, ...patch } : m) }));
  const removeMetric = (id: number) => setForm(f => ({ ...f, metrics: f.metrics.filter(m => m.id !== id) }));

  const dismissGap = (idx: number) => setForm(f => ({ ...f, gaps: f.gaps.filter((_, i) => i !== idx) }));
  const respondToGap = (idx: number, text: string) => setForm(f => ({
    ...f,
    gaps: f.gaps.map((g, i) => i === idx ? { ...g, response: text } : g),
  }));

  // ─── LLM Extraction — Phase A Discovery (Passes 1 & 2) ──────────────────
  // Delegates to pipeline-orchestrator.ts — SINGLE SOURCE OF TRUTH for prompts.
  //
  async function runExtraction() {
    if (!transcript.trim()) return;
    setExtracting(true);
    setExtractPass(1);
    setPipelineError(null);

    await runPipeline(transcript, (progress: PipelineProgress) => {
      if (progress.status === "pass-a1") {
        setExtractPass(1);
      } else if (progress.status === "pass-a2") {
        setExtractPass(2);
      } else if (progress.status === "pass-a-done" && progress.discoveryIR) {
        // Merge DiscoveryIR back into form state for user editing
        const ir = progress.discoveryIR;
        const mergedVS = ir.valueStreams.map((vs, i) => ({
          id: vs.vsId ? i + 1 : Date.now() + i,
          name: vs.name,
          description: vs.description,
          zone: vs.zone,
          trigger: vs.trigger,
          terminalOutcome: vs.terminalOutcome,
          stakeholder: vs.stakeholder ?? "",
          stages: vs.stages.map(s => ({ name: s.name, confidence: "high" as string })),
          extractedCapabilities: [] as any[],
        }));

        // Attach capabilities from capability map via stageCapabilities
        // Handle both 3-level (l2.capabilities) and 4-level (l2.capabilityGroups → l3.capabilities)
        const capMap: Record<string, any> = {};
        for (const l1 of (ir.capabilityMap?.l1Areas ?? [])) {
          for (const l2 of (l1.domains ?? [])) {
            // 4-level format: L2 > L3 capabilityGroups > L4 capabilities
            for (const l3 of (l2.capabilityGroups ?? [])) {
              for (const cap of (l3.capabilities ?? [])) {
                capMap[cap.name] = { id: makeId("cap", cap.name), name: cap.name, description: cap.description ?? "" };
              }
            }
            // 3-level format: L2 > capabilities (leaf)
            for (const cap of (l2.capabilities ?? [])) {
              capMap[cap.name] = { id: makeId("cap", cap.name), name: cap.name, description: cap.description ?? "" };
            }
          }
        }
        for (const sc of (ir.stageCapabilities ?? [])) {
          const vsIdx = mergedVS.findIndex(vs => vs.name === sc.vsName);
          if (vsIdx >= 0) {
            const allCaps = new Set<string>();
            for (const s of (sc.stages ?? [])) {
              for (const cn of (s.capabilityNames ?? [])) {
                allCaps.add(cn);
              }
            }
            mergedVS[vsIdx].extractedCapabilities = Array.from(allCaps)
              .map(n => capMap[n])
              .filter(Boolean);
          }
        }

        // Normalise pain points with VS → stage format
        const normalisedPainPoints = ir.painPoints.map((p, i) => ({
          id: Date.now() + i,
          description: p.description,
          category: p.category ?? "",
          intensity: p.intensity ?? 7,
          affectedStage: p.affectedStage ?? "",
          binding: p.binding ?? false,
        }));

        const normalisedMetrics = ir.metrics.map((m, i) => ({
          id: Date.now() + i,
          name: m.name,
          current: m.current ?? "",
          target: m.target ?? "",
          stage: "",
        }));

        setForm(f => ({
          ...f,
          org: { ...f.org, name: ir.org.name ?? f.org.name, industry: ir.org.industry ?? f.org.industry, stakeholder: ir.org.stakeholder ?? f.org.stakeholder },
          valueStreams: mergedVS,
          roles: ir.roles.map((r, i) => ({ id: Date.now() + i, name: r.name, type: "Internal", notes: r.description ?? "", })),
          tech: ir.tech.map((t, i) => ({ id: Date.now() + i, name: t.name, type: t.type ?? "Other", friction: false, notes: "" })),
          painPoints: normalisedPainPoints,
          metrics: normalisedMetrics,
          gaps: ir.gaps ?? [],
          capabilityMap: ir.capabilityMap,
          stageCapabilities: ir.stageCapabilities,
          source: "freeform_extraction",
          extractionMeta: { extractedAt: new Date().toISOString(), passes: 2 },
        }));
        setExtractDone(true);
        setMode("structured");
        setExtracting(false);
        setExtractPass(0);
      } else if (progress.status === "error") {
        console.error("Extraction failed:", progress.errorMessage);
        setPipelineError(progress.errorMessage ?? "Extraction failed");
        setExtracting(false);
        setExtractPass(0);
      }
    });
  }

  // ─── Generate Scaffold (Pass B) — delegates to pipeline ────────────────────
  // Builds a DiscoveryIR from the current form state and runs Pass B
  // (scaffold formalisation with Gate 1/2 validation and repair loop).
  //
  async function generateIR() {
    setGenerating(true);
    setGenerateStep("scaffold");
    setPipelineError(null);

    // Track discovery start (anonymous + authenticated)
    try {
      const { trackEvent } = await import("../utils/analytics.ts");
      trackEvent("discovery_started", { org: form.org.name || "unknown" });
    } catch { /* analytics should never break the app */ }

    // Build DiscoveryIR from form state
    const id = (prefix: string, name: string) =>
      `${prefix}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

    const pass1Shape = {
      org: form.org,
      valueStreams: form.valueStreams.filter(vs => vs.name),
    };

    const pass2Shape = {
      roles: form.roles.filter(r => r.name).map(r => ({ name: r.name, description: r.notes ?? "" })),
      // Pass the preserved A2 capabilityMap (proper L1/L2/L3/L4 hierarchy) if available;
      // fall back to capabilitiesByVS for backward compat
      ...(form.capabilityMap
        ? { capabilityMap: form.capabilityMap, stageCapabilities: form.stageCapabilities ?? [] }
        : {
            capabilitiesByVS: form.valueStreams.filter(vs => vs.name).map(vs => ({
              vsName: vs.name,
              capabilities: (vs.extractedCapabilities ?? []).map((c: any) => ({
                id: c.id ?? id("cap", c.name),
                name: c.name,
                description: c.description ?? `Ability to ${c.name.toLowerCase()}`,
              })),
            })),
          }
      ),
      tech: form.tech.filter(t => t.name).map(t => ({ name: t.name, type: t.type ?? "Other" })),
      painPoints: form.painPoints.filter(p => p.description).map(p => ({
        description: p.description,
        category: p.category,
        intensity: p.intensity,
        affectedStage: p.affectedStage,
        binding: p.binding,
      })),
      metrics: form.metrics.filter(m => m.name).map(m => ({
        name: m.name,
        current: m.current,
        target: m.target,
      })),
      gaps: form.gaps,
    };

    const confirmedVS = pass1Shape.valueStreams.map(vs => ({
      ...vs,
      stages: vs.stages.map(s => ({ name: s.name })),
    }));

    // Build layoutZones from the active layer scheme
    const formLayers = form.layerSchemeId === "custom" ? form.customLayers : (LAYER_SCHEMES.find(s => s.id === form.layerSchemeId) ?? DEFAULT_SCHEME).layers;
    const layoutZones: LayoutZone[] = formLayers.map((l, i) => ({ id: l.id, label: l.label, row: i, description: l.description }));

    const discoveryIR = buildDiscoveryIR(pass1Shape, pass2Shape, confirmedVS, layoutZones);
    setLastDiscoveryIR(discoveryIR);

    // Run Pass B via the pipeline — delivers lean scaffold immediately
    // Enrichments (sub-activities, PPIT, cards) are now opt-in from the results view
    await continuePipeline(discoveryIR, (progress: PipelineProgress) => {
      if (progress.status === "pass-b") {
        setGenerateStep("scaffold");
      } else if (progress.status === "pass-b-repairing") {
        setGenerateStep("validating");
      } else if (progress.status === "pass-b-failed") {
        console.error("Scaffold generation failed:", progress.errorMessage);
        setPipelineError(progress.errorMessage ?? "Scaffold generation failed validation");
        setGenerating(false);
        setGenerateStep("");
      } else if (progress.status === "done" && progress.bundle) {
        setGeneratedBundle(progress.bundle);
        setGenerating(false);
        setGenerateStep("");
        setGenerated(true);
      } else if (progress.status === "error") {
        console.error("Scaffold generation error:", progress.errorMessage);
        setPipelineError(progress.errorMessage ?? "Scaffold generation failed");
        setGenerating(false);
        setGenerateStep("");
      }
    });
  }


  // ─── File reading helper (supports txt, md, csv, xlsx, docx, pdf) ────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsText = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    // Text-based formats
    if (["txt", "md", "csv", "tsv", "text", "log"].includes(ext)) {
      return file.text();
    }

    // Excel — extract all sheets as text
    if (["xlsx", "xls", "xlsm"].includes(ext)) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const lines: string[] = [];
      for (const sheetName of wb.SheetNames) {
        lines.push(`--- ${sheetName} ---`);
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
        lines.push(csv);
      }
      return lines.join("\n");
    }

    // Word (.docx) — dynamic import of mammoth
    if (ext === "docx") {
      try {
        const mammoth = await import("mammoth");
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        return result.value;
      } catch (e) {
        console.error("DOCX parse error:", e);
        throw new Error("Failed to parse .docx file. Check console for details.");
      }
    }

    // PDF — dynamic import of pdfjs-dist with CDN worker
    if (ext === "pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // Use CDN worker matching installed pdfjs-dist major version
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" "));
        }
        return pages.join("\n\n");
      } catch (e) {
        console.error("PDF parse error:", e);
        throw new Error("Failed to parse PDF. Check console for details.");
      }
    }

    // JSON — could be a bundle, read as text
    if (ext === "json") {
      return file.text();
    }

    // Fallback — try reading as text
    return file.text();
  }, []);

  const handleFileUpload = useCallback(async (files: File[]) => {
    const parts: string[] = [];
    for (const file of files) {
      try {
        const text = await readFileAsText(file);
        parts.push(files.length > 1 ? `--- ${file.name} ---\n${text}` : text);
      } catch (err) {
        alert(err instanceof Error ? err.message : `Failed to read ${file.name}`);
      }
    }
    if (parts.length > 0) {
      setTranscript((prev) => prev ? prev + "\n\n" + parts.join("\n\n") : parts.join("\n\n"));
    }
  }, [readFileAsText]);

  // ─── Drag-drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void handleFileUpload(files);
  }, [handleFileUpload]);

  // ─── All stage names for pain point linking ─────────────────────────────
  const allStages = form.valueStreams.flatMap(vs =>
    vs.stages.map(s => `${vs.name} → ${s.name}`)
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  if (generated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Scaffold generated</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your lean operating model is ready — {form.valueStreams.filter(v=>v.name).length} value streams,{" "}
              {form.valueStreams.reduce((n, vs) => n + vs.stages.length, 0)} stages,{" "}
              {form.painPoints.length} friction observations.
              Open it now or enrich it first with deeper structure, PPIT mappings, and cards.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-left space-y-2">
            {form.org.name && <p className="text-sm font-semibold text-slate-800">{form.org.name}</p>}
            <p className="text-xs text-slate-500">{form.org.industry} · {form.org.companySize}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {form.valueStreams.filter(v=>v.name).map(vs => (
                <span key={vs.id} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{vs.name}</span>
              ))}
            </div>
            {form.painPoints.some(p => p.binding) && (
              <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1">
                <p className="text-xs text-red-700">Binding: {form.painPoints.find(p=>p.binding)?.description?.slice(0,60)}…</p>
              </div>
            )}
          </div>
          {/* ── Enrichment Wizard ── */}
          <EnrichmentWizard
            bundle={generatedBundle}
            discoveryIR={lastDiscoveryIR}
            onBundleUpdate={(updated) => setGeneratedBundle(updated)}
          />
          <div className="flex gap-3 justify-center">
            <button onClick={() => setGenerated(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              ← Edit &amp; Regenerate
            </button>
            <button onClick={async () => { setGenerated(false); setForm(EMPTY_FORM); setTranscript(""); setExtractDone(false); }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
              New discovery
            </button>
            <button onClick={async () => {
              if (!generatedBundle) return;
              const orgSlug = (form.org.name || "discovery").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              const filename = `${orgSlug}-vcc-bundle.json`;
              const blob = new Blob([JSON.stringify(generatedBundle, null, 2)], { type: "application/json" });
              try {
                if ('showSaveFilePicker' in window) {
                  const fileHandle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'VCC Bundle', accept: { 'application/json': ['.json'] } }],
                  });
                  const writable = await fileHandle.createWritable();
                  await writable.write(blob);
                  await writable.close();
                } else {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              } catch (e: any) {
                if (e.name !== 'AbortError') {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }
            }} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
              ↓ Download Bundle
            </button>
            <button
              onClick={() => onComplete?.(generatedBundle)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
              Open in Canvas →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Header ── */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <span className="text-sm font-semibold text-slate-800 tracking-tight">Discovery Intake</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">Value Cognition Canvas</span>
          </div>
          <div className="flex items-center gap-4">
            <ReadinessBar score={readiness} />
            <button
              onClick={() => gate("run_discovery", generateIR, "generating scaffold")}
              disabled={readiness < 41 || generating}
              className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {generating
                ? generateStep === "validating" ? "Validating scaffold…" : "Generating scaffold…"
                : "Generate →"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Pipeline error banner ── */}
        {pipelineError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-red-800">Pipeline Error</p>
                <p className="text-xs text-red-700 mt-1 whitespace-pre-wrap">{pipelineError}</p>
              </div>
              <button onClick={() => setPipelineError(null)} className="text-red-400 hover:text-red-600 text-sm">×</button>
            </div>
          </div>
        )}

        {/* ── Puzzle game during generation ── */}
        {generating && (
          <div className="py-4">
            <p className="text-center text-[11px] text-slate-400 mb-3">
              This will take a minute or two. Here's a puzzle while you wait!
            </p>
            <WaitPuzzle step={generateStep} />
          </div>
        )}

        {/* ── Mode toggle ── */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 w-fit">
          {[["freeform","Provide Content"], ["structured","Fill form"]].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                mode === m ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Mode A: Freeform drop ── */}
        {mode === "freeform" && (
          <div className="space-y-4">
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center hover:border-slate-400 transition-colors"
            >
              <div className="text-2xl mb-3">📋</div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                Describe the {scope === "business" ? "business or business unit" : "initiative"}
                <br />
                you are building a model for
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Paste in any content that describes what you're modelling —
                <br />
                meeting notes, call transcripts, strategy documents, process descriptions, or just a written summary.
              </p>

              {/* Scope toggle */}
              <div className="flex items-center justify-center gap-1 mb-3">
                <span className="text-[10px] text-slate-400 mr-1">Scope:</span>
                {([["business", "Business"], ["initiative", "Initiative"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setScope(val); }}
                    className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${
                      scope === val
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Upload files (.txt, .md, .xlsx, .docx, .pdf, .csv)
              </button>
              <p className="text-xs text-slate-500 italic mb-3">Providing just the right amount of content yields the best model.<br />This is where the art lies.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.tsv,.xlsx,.xls,.xlsm,.docx,.pdf,.json,.text,.log"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) void handleFileUpload(files);
                  e.target.value = "";
                }}
              />
              <textarea
                className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                placeholder={scope === "business"
                  ? `Or paste here…

Example: 'We met with the head of tech at Acme Corp. They have 4000+ SKUs and recurring subscription revenue. Main problem is reps going into customer visits with no consolidated account brief — spending 3 days a week on admin. Their ERP and CRM don't talk to each other properly, 9-month overrun on the integration…'`
                  : `Or paste here…

Example: 'We're launching a new customer onboarding programme. Currently takes 45 days from contract signing to first value. Three handoffs between sales, implementation and customer success — each one drops context. The implementation team has no visibility into what was promised during the sales cycle…'`}
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
              />
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => gate("run_discovery", runExtraction, "extracting from transcript")}
                  disabled={!transcript.trim() || extracting}
                  className="rounded-lg bg-slate-800 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {extracting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {extractPass === 1 ? "Pass 1 — value streams & stages…" : "Pass 2 — roles & capabilities…"}
                    </span>
                  ) : "Extract → Fill form"}
                </button>
              </div>
            </div>
            {extractDone && (
              <ExtractionSummary meta={form.extractionMeta} form={form} />
            )}
          </div>
        )}

        {/* ── Form (both modes after extraction / direct) ── */}
        {(mode === "structured" || extractDone) && (
          <div className="space-y-6">

            {/* Gap prompts */}
            <GapPrompter gaps={form.gaps} onDismiss={dismissGap} onResponse={respondToGap} />

            {/* ── Section 1: Organisation ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <SectionHeader number="1" title="Organisation" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company name" required
                  confidence={form.extractionMeta && form.org.name ? (form.org.confidence ?? "high") : undefined}>
                  <input className={inputCls} value={form.org.name}
                    onChange={e => setOrg({ name: e.target.value })} placeholder="e.g. Acme Corp" />
                </Field>
                <Field label="Industry" required>
                  <select className={inputCls} value={form.org.industry}
                    onChange={e => setOrg({ industry: e.target.value })}>
                    <option value="">— select —</option>
                    {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Company size">
                  <select className={inputCls} value={form.org.companySize}
                    onChange={e => setOrg({ companySize: e.target.value })}>
                    <option value="">— select —</option>
                    {SIZE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Accountable stakeholder">
                  <input className={inputCls} value={form.org.stakeholder}
                    onChange={e => setOrg({ stakeholder: e.target.value })} placeholder="Head of Technology" />
                </Field>
                <div className="col-span-2">
                  <Field label="Organisation description">
                    <textarea className={textareaCls} rows={2} value={form.org.description}
                      onChange={e => setOrg({ description: e.target.value })}
                      placeholder="Brief description of what the organisation does, its market, and key products or services…" />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Section 2: Value Streams ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <SectionHeader number="2" title="Value Streams" count={`${form.valueStreams.filter(v=>v.name).length} defined`} />

              {/* Layer Scheme selector */}
              <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500">Layer scheme</span>
                  <div className="flex gap-1 flex-wrap">
                    {LAYER_SCHEMES.map(scheme => (
                      <button
                        key={scheme.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, layerSchemeId: scheme.id }))}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                          form.layerSchemeId === scheme.id
                            ? "bg-slate-800 text-white"
                            : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {scheme.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        layerSchemeId: "custom",
                        customLayers: f.customLayers.length ? f.customLayers : [{ id: "layer_1", label: "Layer 1", description: "" }],
                      }))}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                        form.layerSchemeId === "custom"
                          ? "bg-slate-800 text-white"
                          : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  How value streams are grouped into layers on the network view.
                  Current: {activeLayers.map(l => l.label).join(" / ")}
                </p>

                {/* Custom layer editor */}
                {form.layerSchemeId === "custom" && (
                  <div className="mt-3 space-y-1.5">
                    {form.customLayers.map((layer, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className={`${inputCls} flex-1`}
                          value={layer.label}
                          onChange={e => {
                            const updated = [...form.customLayers];
                            updated[i] = { ...updated[i], label: e.target.value, id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `layer_${i}` };
                            setForm(f => ({ ...f, customLayers: updated }));
                          }}
                          placeholder={`Layer ${i + 1} name`}
                        />
                        {form.customLayers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, customLayers: f.customLayers.filter((_, j) => j !== i) }))}
                            className="text-xs text-slate-400 hover:text-red-400"
                          >×</button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        customLayers: [...f.customLayers, { id: `layer_${f.customLayers.length + 1}`, label: "", description: "" }],
                      }))}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >+ Add layer</button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {form.valueStreams.map((vs, idx) => (
                  <div key={vs.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">VS {idx + 1}</span>
                      {form.valueStreams.length > 1 && (
                        <button onClick={() => removeVS(vs.id)} className="text-xs text-slate-400 hover:text-red-400">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Stream name" required>
                        <input className={inputCls} value={vs.name}
                          onChange={e => setVS(vs.id, { name: e.target.value })} placeholder="Channel Sales" />
                      </Field>
                      <Field label="Layer" required>
                        <select className={inputCls} value={vs.zone}
                          onChange={e => setVS(vs.id, { zone: e.target.value })}>
                          {activeLayers.map(layer => (
                            <option key={layer.id} value={layer.id}>{layer.label}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Stages (ordered — press Enter after each)">
                      <StageTagInput stages={vs.stages}
                        onChange={(stages: Stage[]) => setVS(vs.id, { stages })} />
                    </Field>
                  </div>
                ))}
                <button onClick={addVS}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
                  + Add value stream
                </button>
              </div>
            </div>

            {/* ── Section 3: Roles ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <SectionHeader number="3" title="Roles" count={`${form.roles.length} added`} />
              <div className="space-y-2">
                {form.roles.map(r => (
                  <div key={r.id} className="grid grid-cols-3 gap-2 items-start">
                    <input className={inputCls} value={r.name}
                      onChange={e => setRole(r.id, { name: e.target.value })} placeholder="Field Sales Rep" />
                    <select className={inputCls} value={r.type}
                      onChange={e => setRole(r.id, { type: e.target.value })}>
                      {ROLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input className={inputCls + " flex-1"} value={r.notes ?? ""}
                        onChange={e => setRole(r.id, { notes: e.target.value })} placeholder="Notes" />
                      <button onClick={() => removeRole(r.id)} className="text-slate-400 hover:text-red-400 text-sm px-1">×</button>
                    </div>
                  </div>
                ))}
                <button onClick={addRole}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
                  + Add role
                </button>
              </div>
            </div>

            {/* ── Section 4: Tech Stack ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <SectionHeader number="4" title="Technology Stack" count={`${form.tech.length} systems`} />
              <div className="space-y-2">
                {form.tech.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <input className={inputCls + " flex-1"} value={t.name}
                      onChange={e => setTech(t.id, { name: e.target.value })} placeholder="Salesforce" />
                    <select className={`${inputCls} w-32`} value={t.type}
                      onChange={e => setTech(t.id, { type: e.target.value })}>
                      {TECH_TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={t.friction ?? false}
                        onChange={e => setTech(t.id, { friction: e.target.checked })}
                        className="rounded border-slate-300" />
                      Friction source
                    </label>
                    <button onClick={() => removeTech(t.id)} className="text-slate-400 hover:text-red-400 text-sm">×</button>
                  </div>
                ))}
                <button onClick={addTech}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
                  + Add system
                </button>
              </div>
            </div>

            {/* ── Section 5: Pain Points ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <SectionHeader number="5" title="Pain Points & Friction" count={`${form.painPoints.length} identified`} />
              <div className="space-y-3">
                {form.painPoints.map(p => (
                  <div key={p.id}
                    className={`rounded-lg border p-4 space-y-3 transition-all ${
                      p.binding ? "border-red-200 bg-red-50/40" : "border-slate-100 bg-slate-50"
                    }`}>
                    <div className="flex items-start gap-3">
                      <textarea className={textareaCls + " flex-1"} rows={2} value={p.description}
                        onChange={e => setPP(p.id, { description: e.target.value })}
                        placeholder="Describe the friction or pain point…" />
                      <button onClick={() => removePP(p.id)} className="text-slate-400 hover:text-red-400 text-sm mt-1">×</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Category">
                        <select className={inputCls} value={p.category}
                          onChange={e => setPP(p.id, { category: e.target.value })}>
                          <option value="">— select —</option>
                          {FRICTION_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </Field>
                      <Field label={`Intensity: ${p.intensity}/10`}>
                        <input type="range" min={1} max={10} step={0.5} value={p.intensity}
                          onChange={e => setPP(p.id, { intensity: parseFloat(e.target.value) })}
                          className="w-full mt-2 accent-slate-700" />
                      </Field>
                      {allStages.length > 0 && (
                        <Field label="Affected stage">
                          <select className={inputCls} value={p.affectedStage}
                            onChange={e => setPP(p.id, { affectedStage: e.target.value })}>
                            <option value="">— select —</option>
                            {allStages.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </Field>
                      )}
                      <Field label="Binding constraint?">
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <div onClick={() => {
                            // toggle — only one binding at a time
                            const newVal = !p.binding;
                            setForm(f => ({
                              ...f,
                              painPoints: f.painPoints.map(pp =>
                                pp.id === p.id ? { ...pp, binding: newVal } : { ...pp, binding: false }
                              )
                            }));
                          }}
                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${p.binding ? "bg-red-500" : "bg-slate-200"}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${p.binding ? "left-4" : "left-0.5"}`} />
                          </div>
                          <span className={`text-xs font-medium ${p.binding ? "text-red-600" : "text-slate-400"}`}>
                            {p.binding ? "Binding — this is the bottleneck" : "Not binding"}
                          </span>
                        </label>
                      </Field>
                    </div>
                  </div>
                ))}
                <button onClick={addPP}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
                  + Add pain point
                </button>
              </div>
            </div>

            {/* ── Section 6: Metrics ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <SectionHeader number="6" title="Metrics" count={form.metrics.length > 0 ? `${form.metrics.length} added` : "optional"} />
              <div className="space-y-2">
                {form.metrics.map(m => (
                  <div key={m.id} className="grid grid-cols-4 gap-2 items-start">
                    <input className={inputCls} value={m.name}
                      onChange={e => setMetric(m.id, { name: e.target.value })} placeholder="Admin hours / week" />
                    <input className={inputCls} value={m.current}
                      onChange={e => setMetric(m.id, { current: e.target.value })} placeholder="Current: 3 days" />
                    <input className={inputCls} value={m.target}
                      onChange={e => setMetric(m.id, { target: e.target.value })} placeholder="Target: < 1 day" />
                    <div className="flex gap-2">
                      <input className={inputCls + " flex-1"} value={m.stage}
                        onChange={e => setMetric(m.id, { stage: e.target.value })} placeholder="Stage" />
                      <button onClick={() => removeMetric(m.id)} className="text-slate-400 hover:text-red-400 text-sm">×</button>
                    </div>
                  </div>
                ))}
                <button onClick={addMetric}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
                  + Add metric
                </button>
              </div>
            </div>

            {/* ── Generate footer ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <ReadinessBar score={readiness} />
                  {readiness < 41 && (
                    <p className="text-xs text-red-500 mt-1.5">Add at least one value stream with stages and one pain point to generate.</p>
                  )}
                </div>
                <button
                  onClick={() => gate("run_discovery", generateIR, "generating scaffold")}
                  disabled={readiness < 41 || generating}
                  className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                >
                  {generating
                    ? generateStep === "validating" ? "Validating scaffold…" : "Generating scaffold…"
                    : `Generate scaffold →`}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
