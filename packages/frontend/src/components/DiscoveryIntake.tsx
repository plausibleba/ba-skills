import { useState, useCallback, useRef } from "react";

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

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stage { name: string; confidence?: string }
interface VS { id: number; name: string; description: string; zone: string; stages: Stage[]; stakeholder: string; trigger?: string; terminalOutcome?: string; confidence?: string }
interface Role { id: number; name: string; type: string; vsRefs?: string[]; notes: string; confidence?: string }
interface Tech { id: number; name: string; type: string; friction: boolean; notes: string; confidence?: string }
interface PainPoint { id: number; description: string; category: string; intensity: number; affectedStage: string; binding: boolean; confidence?: string }
interface Metric { id: number; name: string; current: string; target: string; stage: string; confidence?: string }
interface Gap { severity: string; prompt: string }
interface FormState {
  org: { name: string; industry: string; companySize: string; description: string; stakeholder: string; confidence?: string };
  valueStreams: VS[];
  roles: Role[];
  tech: Tech[];
  painPoints: PainPoint[];
  metrics: Metric[];
  gaps: Gap[];
  source: string;
  extractionMeta: { extractedAt: string; passes?: number } | null;
}

// ─── Initial state ──────────────────────────────────────────────────────────
const EMPTY_FORM: FormState = {
  org: { name: "", industry: "", companySize: "", description: "", stakeholder: "" },
  valueStreams: [{ id: 1, name: "", description: "", zone: "ecosystem", stages: [], stakeholder: "" }],
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
function GapPrompter({ gaps, onDismiss }: { gaps: Gap[]; onDismiss: (i: number) => void }) {
  if (!gaps || gaps.length === 0) return null;
  const req = gaps.filter(g => g.severity === "required");
  const rec = gaps.filter(g => g.severity === "recommended");
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
      <p className="text-xs font-semibold text-amber-800">
        {req.length > 0 ? `${req.length} gap${req.length > 1 ? "s" : ""} to fill for richer output` : "Recommendations"}
      </p>
      {[...req, ...rec].map((g, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={`mt-0.5 text-[10px] font-bold px-1 py-0.5 rounded ${
            g.severity === "required" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
          }`}>{g.severity === "required" ? "REQ" : "REC"}</span>
          <p className="text-xs text-amber-900 leading-relaxed flex-1">{g.prompt}</p>
          <button onClick={() => onDismiss(i)} className="text-amber-400 hover:text-amber-600 text-sm mt-0.5">×</button>
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
  const [transcript, setTranscript] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [extracting, setExtracting] = useState(false);
  const [extractPass, setExtractPass] = useState(0); // 1 = VS & stages, 2 = roles & capabilities
  const [extractDone, setExtractDone] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [, setGenerateStep] = useState(""); // kept for future multi-step UI
  const [generated, setGenerated] = useState(false);
  const [generatedBundle, setGeneratedBundle] = useState<any>(null);
  // bundleSaved gate removed (D-033) — Open in Canvas available immediately on generation
  const dropRef = useRef<HTMLDivElement>(null);

  const readiness = calcReadiness(form);
  // ─── Form updaters ───────────────────────────────────────────────────────
  const setOrg = (patch: Partial<FormState["org"]>) => setForm(f => ({ ...f, org: { ...f.org, ...patch } }));
  const setVS = (id: number, patch: Partial<VS>) => setForm(f => ({
    ...f,
    valueStreams: f.valueStreams.map(vs => vs.id === id ? { ...vs, ...patch } : vs)
  }));
  const addVS = () => setForm(f => ({
    ...f,
    valueStreams: [...f.valueStreams, { id: Date.now(), name: "", description: "", zone: "ecosystem", stages: [], stakeholder: "" }]
  }));
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

  // ─── LLM Extraction — Phase A Discovery (Passes 1 & 2) ──────────────────
  //
  // Pass 1 (Steps 01-02): VS Definition + Lifecycle Stages
  //   Board-level. No VS cap — extract all that the source warrants.
  //   Output: confirmed VS list with stages. Anchors all downstream naming.
  //
  // Pass 2 (Steps 03-04): Roles + Capabilities
  //   Extracted from source, anchored to confirmed VS/stage names.
  //   Capabilities are domain-specific from source — never keyword-derived.
  //   Output: roles{}, capabilities{} keyed by confirmed VS name.
  //
  async function runExtraction() {
    if (!transcript.trim()) return;
    setExtracting(true);
    setExtractPass(1);

    const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";

    // ── Pass 1: VS Definition + Lifecycle Stages (Steps 01-02) ──────────────
    const pass1Prompt = `You are a business architect defining Value Streams for a governance diagnostic.
A ValueStream is the end-to-end flow that delivers measurable stakeholder value — triggered by a defined need, ending at a verifiable outcome. Work at board level: structural flow of value, not process detail.

## Your Task
From the source material below, identify ALL Value Streams present. Do not cap the number — extract every distinct end-to-end flow the source describes.

## Rules
- Each VS is outcome-driven, not function-driven ("Member Certification Lifecycle" not "Certification Team Activities")
- Each VS has a clear trigger event and a clear terminal outcome
- VS names are concise, 2-6 words, title case
- zone: "ecosystem" = externally-facing (customer, member, partner, market); "knowledge" = internally-facing (operations, reporting, governance)
- Stages: 4-8 per VS. Each stage = a governance phase or progression milestone, not a task. MECE — no gaps, no overlaps.
- If the source contains tab names, sheet names, section headings, or column groupings that map to distinct end-to-end flows — each one is likely a separate VS. Extract them all.

Return ONLY valid JSON, no markdown fences:
{
  "org": {
    "name": "",
    "industry": "",
    "companySize": "",
    "description": "",
    "stakeholder": "",
    "confidence": "high|medium|low"
  },
  "valueStreams": [
    {
      "id": 1,
      "name": "Member Certification Lifecycle",
      "description": "End-to-end flow from application through credential maintenance",
      "zone": "ecosystem",
      "trigger": "Candidate submits certification application",
      "terminalOutcome": "Credential issued and maintained in good standing",
      "stakeholder": "Candidate, Employer",
      "confidence": "high|medium|low",
      "stages": [
        { "name": "Application Processing", "confidence": "high" },
        { "name": "Exam Preparation", "confidence": "high" }
      ]
    }
  ]
}

Source material:
${transcript}`;

    let pass1Result: any = null;
    try {
      const res1 = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          temperature: 0,
          messages: [{ role: "user", content: pass1Prompt }]
        })
      });
      const data1 = await res1.json();
      const text1 = data1.content?.find((b: any) => b.type === "text")?.text ?? "{}";
      pass1Result = JSON.parse(text1.replace(/`{3}json|`{3}/g, "").trim());
    } catch (e) {
      console.error("Pass 1 extraction failed", e);
      setExtracting(false);
      return;
    }

    const confirmedVS = pass1Result.valueStreams ?? [];
    setExtractPass(2);

    // Build VS+stage reference for Pass 2 — model must anchor to these exactly
    const vsStageRef = confirmedVS.map((vs: any) =>
      `VS: "${vs.name}"\n  Stages: ${(vs.stages ?? []).map((s: any) => `"${s.name}"`).join(", ")}`
    ).join("\n\n");

    // ── Pass 2: Roles + Capabilities (Steps 03-04) ───────────────────────────
    // Capabilities are extracted from the source — not derived from stage names.
    // If the source contains a capability map, register, or column — use those names verbatim.
    const pass2Prompt = `You are extracting Roles and Capabilities for a business architecture diagnostic.

The following Value Streams and their stages are CONFIRMED. Do not rename, add, or remove them:
${vsStageRef}

## Roles (Step 03)
Identify all roles that participate in these value streams. Roles are responsibility-bearing positions, not people or departments.
- Include both execution roles (doing work) and governing roles (approving, overseeing)
- 4-10 roles total across all value streams
- Names are title-case position names

## Capabilities (Step 04)
Identify the Capabilities required. Capabilities are enduring organisational abilities — persistent, deployable, investment-relevant.
- CRITICAL: If the source material contains a capability map, capability register, named capabilities, or column headers that describe organisational abilities — extract those names VERBATIM. Do not rename, generalise, or replace them with generic alternatives.
- If no explicit capabilities exist in the source, derive them from the VS/stage content using Verb-Noun convention (e.g. "Manage Member Credentials", not "Credential Management Execution")
- Assign capabilities to the VS they primarily support
- 3-8 capabilities per VS

Return ONLY valid JSON, no markdown fences:
{
  "roles": [
    { "id": "role_credit_analyst", "name": "Credit Analyst", "type": "Internal", "description": "Responsible for quantitative credit assessment" }
  ],
  "capabilitiesByVS": [
    {
      "vsName": "MUST MATCH confirmed VS name exactly",
      "capabilities": [
        { "id": "cap_member_onboarding", "name": "Member Onboarding", "description": "Ability to onboard and orient new members" }
      ]
    }
  ],
  "tech": [
    { "id": 1, "name": "", "type": "CRM|ERP|Comms|Analytics|Custom|Other", "friction": true, "notes": "" }
  ],
  "painPoints": [
    {
      "id": 1,
      "description": "",
      "category": "DataSignalFriction|ProcessHandoffFriction|GovernanceRiskFriction|IncentiveCapacityFriction|TechnologyIntegrationFriction",
      "intensity": 7,
      "affectedVsName": "MUST be one of the confirmed VS names above",
      "affectedStage": "Stage name only",
      "binding": false,
      "confidence": "high|medium|low"
    }
  ],
  "metrics": [
    { "id": 1, "name": "", "current": "", "target": "", "affectedVsName": "confirmed VS name", "stage": "stage name only" }
  ],
  "gaps": [
    { "severity": "required|recommended", "prompt": "Specific question to fill this gap" }
  ]
}

Source material:
${transcript}`;

    try {
      const res2 = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 6000,
          temperature: 0,
          messages: [{ role: "user", content: pass2Prompt }]
        })
      });
      const data2 = await res2.json();
      const text2 = data2.content?.find((b: any) => b.type === "text")?.text ?? "{}";
      const pass2Result = JSON.parse(text2.replace(/`{3}json|`{3}/g, "").trim());

      // Merge: Pass 1 is authoritative for VS structure; Pass 2 adds capabilities per VS
      const mergedVS = confirmedVS.map((vs1: any, i: number) => {
        const capEntry = (pass2Result.capabilitiesByVS ?? []).find((c: any) => c.vsName === vs1.name)
          ?? (pass2Result.capabilitiesByVS ?? [])[i];
        return {
          ...vs1,
          id: vs1.id ?? Date.now() + i,
          stages: vs1.stages ?? [],
          extractedCapabilities: capEntry?.capabilities ?? [],
        };
      });

      // Normalise pain points with VS → stage format
      const normalisedPainPoints = (pass2Result.painPoints ?? []).map((p: any, i: number) => {
        const vsName = p.affectedVsName ?? confirmedVS[0]?.name ?? "";
        const stageName = p.affectedStage ?? "";
        return {
          ...p,
          id: p.id ?? Date.now() + i,
          affectedStage: vsName && stageName ? `${vsName} → ${stageName}` : stageName,
        };
      });

      const normalisedMetrics = (pass2Result.metrics ?? []).map((m: any, i: number) => {
        const vsName = m.affectedVsName ?? confirmedVS[0]?.name ?? "";
        const stageName = m.stage ?? "";
        return {
          ...m,
          id: m.id ?? Date.now() + i,
          stage: vsName && stageName ? `${vsName} → ${stageName}` : stageName,
        };
      });

      setForm(f => ({
        ...f,
        org: { ...f.org, ...pass1Result.org },
        valueStreams: mergedVS,
        roles: (pass2Result.roles ?? []).map((r: any, i: number) => ({ ...r, id: r.id ?? Date.now() + i })),
        tech: (pass2Result.tech ?? []).map((t: any, i: number) => ({ ...t, id: t.id ?? Date.now() + i })),
        painPoints: normalisedPainPoints,
        metrics: normalisedMetrics,
        gaps: pass2Result.gaps ?? [],
        source: "freeform_extraction",
        extractionMeta: { extractedAt: new Date().toISOString(), passes: 2 },
      }));
      setExtractDone(true);
      setMode("structured");
    } catch (e) {
      console.error("Pass 2 extraction failed", e);
    } finally {
      setExtracting(false);
      setExtractPass(0);
    }
  }

  // ─── Generate IR → Scaffold + Heatmap (Passes 3 & 4) ─────────────────────
  //
  // Pass 3 (Steps 05-06-10): LLM formalisation → full ScaffoldModel.json
  //   Receives confirmed VS, stages, roles, capabilities from extraction.
  //   Produces deterministic scaffold: outcomes, activities (FSM chain), assembly.
  //   Replaces the old keyword-deriveCapabilities JS function entirely.
  //
  // Pass 4 (Steps 11-13): Friction assessment → heatmaps[]
  //   Unchanged from previous implementation — already well-designed.
  //
  async function generateIR() {
    setGenerating(true);
    setGenerateStep("scaffold");

    const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";

    const id = (prefix: string, name: string) =>
      `${prefix}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

    // ── Pass 3: Scaffold Formalisation (Steps 05-06-10) ──────────────────────
    // Build the VS+stage+role+capability context for the formalisation prompt
    const vsContext = form.valueStreams.filter((vs: any) => vs.name).map((vs: any) => ({
      vsName: vs.name,
      vsId: id("vs", vs.name),
      description: vs.description ?? "",
      zone: vs.zone ?? "ecosystem",
      trigger: vs.trigger ?? "",
      terminalOutcome: vs.terminalOutcome ?? "",
      stakeholder: vs.stakeholder ?? form.org.stakeholder ?? "",
      stages: (vs.stages ?? []).map((s: any) => s.name ?? s),
      capabilities: (vs.extractedCapabilities ?? []).map((c: any) => ({
        id: c.id ?? id("cap", c.name),
        name: c.name,
        description: c.description ?? `Ability to ${c.name.toLowerCase()}`,
      })),
    }));

    const roleContext = form.roles.filter((r: any) => r.name).map((r: any) => ({
      id: r.id ?? id("role", r.name),
      name: r.name,
      description: r.description ?? "",
    }));

    const techContext = form.tech.filter((t: any) => t.name).map((t: any) => ({
      id: id("tech", t.name),
      name: t.name,
      type: t.type ?? "Other",
    }));

    const pass3Prompt = `You are a business architect formalising a value stream model into a VCC ScaffoldModel.

## Determinism Requirement
This is a structural formalisation step — a pure function. Given these inputs, produce the same output every time. IDs are derived mechanically from element names (snake_case with type prefix). No creative variation.

## ID Convention
- vs_<snake_case_name>     e.g. vs_lead_to_customer
- outcome_<snake_case>     e.g. outcome_lead_qualified
- act_<snake_case_name>    e.g. act_qualify_lead  (SHORT — 2-4 words max)
- cap_<snake_case_name>    e.g. cap_lead_qualification
- role_<snake_case_name>   e.g. role_credit_analyst
- metric_<snake_case_name>

## Naming Rules (CRITICAL)
- Activity names: SHORT verb phrases, 2-5 words max. E.g. "Qualify lead", "Conduct discovery call", "Prepare proposal". Do NOT repeat the full stage description.
- VS names: Use EXACTLY the names provided in the inputs. Do not embellish or reword them.
- Outcome names: Short noun phrases derived from stage entry/exit criteria. E.g. "Lead Qualified", "Requirements Understood".

## FSM Chain Rules (CRITICAL — violations fail validation)
Each Value Stream is a single linear activity chain:
1. Each activity has preOutcomeId !== postOutcomeId (no no-ops)
2. activity[i].postOutcomeId === activity[i+1].preOutcomeId (adjacent consistency)
3. nextActivityId chain has no breaks, no cycles — last activity has nextActivityId: null
4. All activities reachable from chain head
5. One activity per stage. Chain length = number of stages.
6. performedByRoleIds: at least one role per activity

## Registry Population (CRITICAL — empty registries fail validation)
You MUST populate the elements registries for EVERY ID referenced in activities:
- For each unique role ID in any activity's performedByRoleIds → create an entry in elements.roles with { name, description, elementType: "Role" }
- For each unique capability ID in any activity's requiresCapabilityIds → create an entry in elements.capabilities with { name, description, elementType: "Capability" }
- For each unique control ID in any activity's controlIds → create an entry in elements.controls with { name, description, elementType: "Control" }
- For each metric → create an entry in elements.metrics with { name, elementType: "Metric" }
- For each outcome → create an entry in elements.outcomes with { name, elementType: "Outcome" }
DO NOT leave capabilities, roles, or controls as empty objects. Every referenced ID must have a registry entry.

## Value Stream Fields (CRITICAL)
Each VS must include: name, description, activityIds, layoutZone (use the zone from inputs), accountableStakeholder (from inputs).

## Your Task
Given the confirmed VS definitions, stages, roles, and capabilities below, produce a complete ScaffoldModel.json.

For each VS:
- Create one Outcome per stage boundary (n stages → n+1 outcomes)
- Create one Activity per stage (pre/post outcomes, roles, capabilities from the lists provided)
- Assign capabilities to activities based on stage semantics — use the provided capabilities, do not invent new ones
- Distribute roles across activities sensibly based on stage content

Confirmed inputs:
${JSON.stringify({ valueStreams: vsContext, roles: roleContext, tech: techContext }, null, 2)}

Also include these metrics (from discovery):
${JSON.stringify(form.metrics.filter((m: any) => m.name).map((m: any) => ({ id: id("metric", m.name), name: m.name, current: m.current, target: m.target })), null, 2)}

Return ONLY valid JSON — the complete ScaffoldModel — no markdown fences:
{
  "schemaVersion": "1.0.0",
  "scaffoldId": "scaffold_<org_name_snake>",
  "name": "<Org Name> — Operating Model",
  "description": "<brief>",
  "createdAt": "<ISO timestamp>",
  "modelIntegrityHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "elements": {
    "valueStreams": { "<vs_id>": { "name": "...", "description": "...", "activityIds": [], "layoutZone": "ecosystem|knowledge", "accountableStakeholder": "role_...", "elementType": "ValueStream" } },
    "activities": {},
    "outcomes": { "<outcome_id>": { "name": "...", "elementType": "Outcome" } },
    "roles": { "<role_id>": { "name": "...", "description": "...", "elementType": "Role" } },
    "capabilities": { "<cap_id>": { "name": "...", "description": "...", "elementType": "Capability" } },
    "controls": {},
    "constraints": {},
    "directives": {},
    "deonticLogic": {},
    "flowLogic": {},
    "concepts": {},
    "properties": {},
    "metrics": {},
    "measures": {},
    "conditions": {},
    "informationObjects": {}
  }
}

CRITICAL: All element maps must be present, even if empty. Every ID referenced in activities MUST have a corresponding registry entry.`;

    let scaffold: any = null;
    const now = new Date().toISOString();

    try {
      const res3 = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16000,
          temperature: 0,
          messages: [{ role: "user", content: pass3Prompt }]
        })
      });
      const data3 = await res3.json();
      const text3 = data3.content?.find((b: any) => b.type === "text")?.text ?? "{}";
      scaffold = JSON.parse(text3.replace(/`{3}json|`{3}/g, "").trim());
    } catch (e) {
      console.error("Pass 3 scaffold formalisation failed", e);
      setGenerating(false);
      setGenerateStep("");
      return;
    }

    // ── Pass 4 (Friction Assessment) removed ──────────────────────────────────
    // Friction heatmaps are now loaded separately via "Assess Friction" on the
    // Network/Stage views. This halves generation time.

    // Store pain points on the scaffold for later friction assessment
    const ppSummary = form.painPoints
      .filter((p: any) => p.description)
      .map((p: any, i: number) =>
        `${i + 1}. [${p.category || "unclassified"}] ${p.description} (intensity ${p.intensity ?? 7}/10, stage: ${p.affectedStage || "unknown"})${p.binding ? " ← flagged as binding" : ""}`
      ).join("\n");

    if (ppSummary) {
      scaffold._discoveryPainPoints = ppSummary;
    }

    const bundle = {
      bundleVersion: "1.0",
      createdAt: now,
      scaffold,
      heatmaps: [] as any[],
    };

    setGeneratedBundle(bundle);
    setGenerating(false);
    setGenerateStep("");
    setGenerated(true);
  }


  // ─── Drag-drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setTranscript((ev.target as FileReader).result as string);
    reader.readAsText(file);
  }, []);

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
              Discovery IR compiled and passed to scaffold generator.
              Your value stream canvas is ready — {form.valueStreams.filter(v=>v.name).length} value streams,{" "}
              {form.valueStreams.reduce((n, vs) => n + vs.stages.length, 0)} stages,{" "}
              {form.painPoints.length} friction observations.
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
              ↓ Save Bundle
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
              onClick={generateIR}
              disabled={readiness < 41 || generating}
              className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {generating ? "Generating scaffold…" : "Generate →"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Mode toggle ── */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 w-fit">
          {[["freeform","Drop transcript"], ["structured","Fill form"]].map(([m, label]) => (
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
              <p className="text-sm font-medium text-slate-700 mb-1">Drop your transcript or notes</p>
              <p className="text-xs text-slate-400 mb-4">Meeting notes · Call transcript · Email thread · Voice memo text</p>
              <textarea
                className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                placeholder="Or paste here…

Example: 'We met with the head of tech at Puretec. They have 4000+ SKUs and 12-month cartridge replacement revenue. Main problem is reps going into customer visits with no consolidated account brief — spending 3 days a week on admin. NetSuite and Salesforce don't talk to each other properly, 9-month overrun on the integration…'"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
              />
              <div className="mt-4 flex justify-center">
                <button
                  onClick={runExtraction}
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
            <GapPrompter gaps={form.gaps} onDismiss={dismissGap} />

            {/* ── Section 1: Organisation ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <SectionHeader number="1" title="Organisation" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company name" required
                  confidence={form.extractionMeta && form.org.name ? (form.org.confidence ?? "high") : undefined}>
                  <input className={inputCls} value={form.org.name}
                    onChange={e => setOrg({ name: e.target.value })} placeholder="Puretec Water Filtration" />
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
                      placeholder="Adelaide-based manufacturer and distributor of water filtration products…" />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Section 2: Value Streams ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <SectionHeader number="2" title="Value Streams" count={`${form.valueStreams.filter(v=>v.name).length} defined`} />
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
                      <Field label="Zone" required>
                        <select className={inputCls} value={vs.zone}
                          onChange={e => setVS(vs.id, { zone: e.target.value })}>
                          <option value="ecosystem">Ecosystem (external-facing)</option>
                          <option value="knowledge">Knowledge (internal-facing)</option>
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
                  onClick={generateIR}
                  disabled={readiness < 41 || generating}
                  className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                >
                  {generating ? "Generating scaffold…" : `Generate scaffold →`}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
