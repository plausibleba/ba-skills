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
const ZONE_OPTIONS = ["ecosystem","knowledge"];

// ─── Scoring weights ────────────────────────────────────────────────────────
function calcReadiness(form) {
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

function readinessLabel(score) {
  if (score < 41) return { label: "Insufficient", colour: "text-red-600", bg: "bg-red-500" };
  if (score < 61) return { label: "Draft", colour: "text-amber-600", bg: "bg-amber-500" };
  if (score < 81) return { label: "Viable", colour: "text-blue-600", bg: "bg-blue-500" };
  return { label: "Rich", colour: "text-emerald-600", bg: "bg-emerald-500" };
}

// ─── Initial state ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
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

function ConfidenceDot({ level }) {
  const c = level === "high" ? "bg-emerald-400" : level === "medium" ? "bg-amber-400" : "bg-red-400";
  const tip = level === "high" ? "High confidence" : level === "medium" ? "Medium — verify" : "Low — needs review";
  return (
    <span title={tip} className={`inline-block h-1.5 w-1.5 rounded-full ${c} flex-shrink-0 mt-1`} />
  );
}

function SectionHeader({ number, title, count, completion }) {
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

function Field({ label, required, gap, confidence, children }) {
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
function StageTagInput({ stages, onChange }) {
  const [draft, setDraft] = useState("");
  function addStage(name) {
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
function GapPrompter({ gaps, onDismiss }) {
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
function ReadinessBar({ score }) {
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
function ExtractionSummary({ meta, form }) {
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
export default function DiscoveryIntake() {
  const [mode, setMode] = useState("freeform"); // "freeform" | "structured"
  const [transcript, setTranscript] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [extracting, setExtracting] = useState(false);
  const [extractDone, setExtractDone] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const dropRef = useRef();

  const readiness = calcReadiness(form);
  const { label: rLabel, colour: rColour } = readinessLabel(readiness);

  // ─── Form updaters ───────────────────────────────────────────────────────
  const setOrg = patch => setForm(f => ({ ...f, org: { ...f.org, ...patch } }));
  const setVS = (id, patch) => setForm(f => ({
    ...f,
    valueStreams: f.valueStreams.map(vs => vs.id === id ? { ...vs, ...patch } : vs)
  }));
  const addVS = () => setForm(f => ({
    ...f,
    valueStreams: [...f.valueStreams, { id: Date.now(), name: "", description: "", zone: "ecosystem", stages: [], stakeholder: "" }]
  }));
  const removeVS = id => setForm(f => ({ ...f, valueStreams: f.valueStreams.filter(vs => vs.id !== id) }));

  const addRole = () => setForm(f => ({ ...f, roles: [...f.roles, { id: Date.now(), name: "", type: "Internal", vsRefs: [], notes: "" }] }));
  const setRole = (id, patch) => setForm(f => ({ ...f, roles: f.roles.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const removeRole = id => setForm(f => ({ ...f, roles: f.roles.filter(r => r.id !== id) }));

  const addTech = () => setForm(f => ({ ...f, tech: [...f.tech, { id: Date.now(), name: "", type: "CRM", friction: false, notes: "" }] }));
  const setTech = (id, patch) => setForm(f => ({ ...f, tech: f.tech.map(t => t.id === id ? { ...t, ...patch } : t) }));
  const removeTech = id => setForm(f => ({ ...f, tech: f.tech.filter(t => t.id !== id) }));

  const addPP = () => setForm(f => ({ ...f, painPoints: [...f.painPoints, { id: Date.now(), description: "", category: "", intensity: 7, affectedStage: "", binding: false }] }));
  const setPP = (id, patch) => setForm(f => ({ ...f, painPoints: f.painPoints.map(p => p.id === id ? { ...p, ...patch } : p) }));
  const removePP = id => setForm(f => ({ ...f, painPoints: f.painPoints.filter(p => p.id !== id) }));

  const addMetric = () => setForm(f => ({ ...f, metrics: [...f.metrics, { id: Date.now(), name: "", current: "", target: "", stage: "" }] }));
  const setMetric = (id, patch) => setForm(f => ({ ...f, metrics: f.metrics.map(m => m.id === id ? { ...m, ...patch } : m) }));
  const removeMetric = id => setForm(f => ({ ...f, metrics: f.metrics.filter(m => m.id !== id) }));

  const dismissGap = idx => setForm(f => ({ ...f, gaps: f.gaps.filter((_, i) => i !== idx) }));

  // ─── LLM Extraction ─────────────────────────────────────────────────────
  async function runExtraction() {
    if (!transcript.trim()) return;
    setExtracting(true);

    const prompt = `You are a business analyst extracting discovery signal from a sales or consulting call transcript or meeting notes.

Extract information into this exact JSON structure. For each field, include a "confidence" property: "high", "medium", or "low".
Mark isFrictionSource: true for any technology system mentioned as a problem or bottleneck.
Return ONLY valid JSON with no markdown fences.

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
      "name": "",
      "description": "",
      "zone": "ecosystem|knowledge",
      "stages": [{"name": "", "confidence": "high|medium|low"}],
      "stakeholder": "",
      "confidence": "high|medium|low"
    }
  ],
  "roles": [
    {"id": 1, "name": "", "type": "Internal|External|System", "notes": "", "confidence": "high|medium|low"}
  ],
  "tech": [
    {"id": 1, "name": "", "type": "CRM|ERP|Comms|Analytics|Field|Custom|Other", "friction": true|false, "notes": "", "confidence": "high|medium|low"}
  ],
  "painPoints": [
    {
      "id": 1,
      "description": "",
      "category": "DataSignalFriction|ProcessHandoffFriction|GovernanceRiskFriction|IncentiveCapacityFriction|DecisionAuthorityFriction",
      "intensity": 7,
      "affectedStage": "",
      "binding": true|false,
      "confidence": "high|medium|low"
    }
  ],
  "metrics": [
    {"id": 1, "name": "", "current": "", "target": "", "stage": "", "confidence": "high|medium|low"}
  ],
  "gaps": [
    {"severity": "required|recommended", "prompt": "Specific question for consultant to fill"}
  ]
}

Zone rules: ecosystem = externally-facing (sales, service, marketing); knowledge = internally-facing (risk, operations, reporting).
Intensity: rate 1-10 based on urgency/impact implied in transcript. Binding = the single biggest bottleneck.
Generate 2-4 gap prompts for missing important fields.

Transcript:
${transcript}`;

    try {
      const res = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text ?? "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const extracted = JSON.parse(clean);

      setForm(f => ({
        ...f,
        org: { ...f.org, ...extracted.org },
        valueStreams: extracted.valueStreams?.length
          ? extracted.valueStreams.map((vs, i) => ({ ...vs, id: vs.id ?? Date.now() + i }))
          : f.valueStreams,
        roles: (extracted.roles ?? []).map((r, i) => ({ ...r, id: r.id ?? Date.now() + i })),
        tech: (extracted.tech ?? []).map((t, i) => ({ ...t, id: t.id ?? Date.now() + i })),
        painPoints: (extracted.painPoints ?? []).map((p, i) => ({ ...p, id: p.id ?? Date.now() + i })),
        metrics: (extracted.metrics ?? []).map((m, i) => ({ ...m, id: m.id ?? Date.now() + i })),
        gaps: extracted.gaps ?? [],
        source: "freeform_extraction",
        extractionMeta: { extractedAt: new Date().toISOString() },
      }));
      setExtractDone(true);
      setMode("structured");
    } catch (e) {
      console.error("Extraction failed", e);
    } finally {
      setExtracting(false);
    }
  }

  // ─── Generate IR ─────────────────────────────────────────────────────────
  async function generateIR() {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1500)); // simulate pipeline
    setGenerating(false);
    setGenerated(true);
  }

  // ─── Drag-drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback(e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setTranscript(ev.target.result);
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
            <button onClick={() => { setGenerated(false); setForm(EMPTY_FORM); setTranscript(""); setExtractDone(false); }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
              New discovery
            </button>
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
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
              {generating ? "Generating…" : "Generate →"}
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
                      Extracting…
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
                        onChange={stages => setVS(vs.id, { stages })} />
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
