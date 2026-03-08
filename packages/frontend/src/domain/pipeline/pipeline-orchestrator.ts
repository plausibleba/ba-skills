// ─── Pipeline Orchestrator ───────────────────────────────────────────────────
// Three-pass runtime (D-065). DiscoveryIntake.tsx calls this as a thin shell.
//
// Pass A — Discovery IR  (two internal LLM calls: A1 VS+stages, A2 roles+caps)
// Pass B — Scaffold      (one LLM call, Gate 1 with one repair retry, Gate 2)
// Pass C — Heatmap       (one LLM call, null bindingConstraint valid)
//
// Each artefact is persisted via onProgress callbacks so UI can recover
// if a later pass fails.

import { buildDiscoveryIR } from "./discovery-ir";
import type { DiscoveryIR } from "./discovery-ir";
import { runPassB } from "./scaffold-formaliser";
import { runPassC } from "./heatmap-analyser";
import type { GateResult } from "./scaffold-gates";

// ── Progress state fed back to the UI ────────────────────────────────────────

export type PipelineStatus =
  | "idle"
  | "pass-a1"          // extracting VS + stages
  | "pass-a2"          // extracting roles + caps + signals
  | "pass-a-done"      // DiscoveryIR ready — optional review point
  | "pass-b"           // formalising scaffold
  | "pass-b-repairing" // Gate 1 failed, attempting repair
  | "pass-b-failed"    // Gate 1 still failed after repair — surface to user
  | "pass-c"           // generating heatmap
  | "done"
  | "error";

export interface PipelineProgress {
  status: PipelineStatus;
  discoveryIR?: DiscoveryIR;          // available after pass-a-done
  scaffold?: any;                      // available after pass-b
  gate1?: GateResult;
  gate2?: GateResult;
  heatmaps?: any[];                    // available after pass-c
  bundle?: any;                        // available after done
  errorMessage?: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

// ── Pass A prompts (carried over from original DiscoveryIntake.tsx) ───────────

function buildPass1Prompt(transcript: string): string {
  return `You are a business architect conducting a discovery diagnostic for a governance engagement.
Your task is to identify the ValueStreams and their Lifecycle Stages from the source material below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOUNDATIONAL DEFINITIONS (apply these strictly)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A ValueStream is the end-to-end flow of activities that delivers measurable stakeholder value,
triggered by a defined stakeholder need. It must have:
  - A named beneficiary (who receives the value)
  - A trigger (the observable event that starts the stream)
  - A terminal outcome (the state that represents completion)
  - Board-level visibility (a senior executive would recognise this as a meaningful unit of value delivery)

A ValueStream Stage is a major governance-visible phase of progression — where decision authority
is exercised, handoffs occur, and approvals gate progress. Not a task. A phase.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT IS NOT A VALUESTREAM — exclude these entirely
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✗ IT integration projects ("Integrate NetSuite and Salesforce" is a project — record as pain point)
✗ System implementations or infrastructure initiatives
✗ Technology platforms or data management functions
✗ Function-driven groupings ("Sales Activities", "Operations", "Finance")
✗ Business units or departments
✗ Anything without a named external or internal beneficiary receiving value

If you encounter technology integration problems, record them as pain points — NOT value streams.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRACTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Extract only ValueStreams evidenced or plausibly inferable from the source. Do not invent.
2. zone: "ecosystem" = value to external parties (customers, partners, distributors, members)
         "knowledge" = value to internal governance (risk, compliance, reporting)
3. 3-7 stages per ValueStream. Name stages Verb-Noun: "Qualify Partner", "Process Order".
4. Name ValueStreams at board level — concise, outcome-oriented.
   CORRECT: "Channel Partner Distribution"   INCORRECT: "Manage the Channel"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE STRUCTURE — specify all five properties per stage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each stage must include:
  entryCriteria  — objective observable state that must be true to begin (not an action)
  exitCriteria   — objective observable state that signals completion
                   CRITICAL: exit of stage N must logically connect to entry of stage N+1
  stakeholders   — named roles who participate: execution roles AND governance/approval roles
  valueItem      — the concrete output or artefact this stage produces (noun phrase)
  metrics        — performance indicators for this stage; extract from source if mentioned,
                   otherwise include the most plausible indicator and set evidenced: false

Governance lens — actively look for:
  - Decision bottlenecks: where is authority concentrated in few roles?
  - Approval gates: what must be signed off before the stage exits?
  - Handoff points: where does work transfer between teams or roles?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT — return ONLY valid JSON, no markdown fences
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "org": {
    "name": "Organisation name",
    "industry": "Industry sector",
    "size": "SME | Mid-Market | Enterprise",
    "stakeholder": "Primary accountable executive (title, not name)"
  },
  "valueStreams": [
    {
      "name": "ValueStream name — concise, outcome-oriented",
      "description": "1-2 sentences: what value this delivers, to whom, why it matters",
      "zone": "ecosystem | knowledge",
      "trigger": "Observable event that initiates this stream",
      "terminalOutcome": "State representing completion — what the beneficiary now has",
      "stakeholder": "Named beneficiary (role or segment)",
      "stages": [
        {
          "name": "Verb-Noun stage name",
          "entryCriteria": "Objective state that must be true to begin this stage",
          "exitCriteria": "Objective state signalling this stage is complete",
          "stakeholders": ["Role name (execution)", "Role name (approval if applicable)"],
          "valueItem": "Concrete output or artefact this stage produces",
          "metrics": [
            { "name": "Metric name", "current": "value or null", "target": "value or null", "evidenced": true }
          ]
        }
      ]
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE MATERIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${transcript}`;
}

function buildPass2Prompt(transcript: string, confirmedVS: any[]): string {
  const vsRef = JSON.stringify(
    confirmedVS.map((vs: any) => ({
      name: vs.name,
      stages: (vs.stages ?? []).map((s: any) => s.name ?? s),
    })),
    null, 2
  );

  return `You are extracting organisational Roles, building a scoped Capability Map, and capturing
discovery signals for a business architecture diagnostic.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIRMED VALUE STREAMS AND STAGES — anchor all outputs to these exactly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${vsRef}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPABILITY DEFINITIONS — apply these strictly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A Business Capability is the stable, enduring ability of the organisation to perform
a business function, grounded in a core business object, independent of structure.

Rules:
  - Named Verb-Noun: "Manage Trade Partner Agreements" not "Partner Agreement Management"
  - Object-grounded: identify the core business object (Orders, Agreements, Products, etc.)
  - Enduring: persists across projects and restructures — not a task or project
  - NOT a technology: "NetSuite" is a system. "Manage Order Fulfilment" is a capability.
  - NOT an activity: "Manage Orders" is a capability. "Create order in NetSuite" is a task.

Taxonomy — build at three levels:
  L1 = Business Area (broad accountability domain — e.g. "Channel & Partner Management")
  L2 = Business Domain (logical grouping — e.g. "Order Management")
  L3 = Business Capability (operational ability — THIS is the level mapped to VS stages)

All stage assignments must reference L3 capabilities only.
Never mix L1, L2, L3 within a single value stream's assignments.
A capability may appear in multiple stages and multiple value streams — that is expected.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR TASKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ROLES — execution and governance roles from the source. Do not invent.

2. CAPABILITY MAP — scoped L1→L2→L3 taxonomy covering only what is evidenced or inferable.
   For each L3 capability, identify the core business object it is grounded in.
   Flag uncertain or potentially overlapping capabilities with a stabilisationNote.

3. STAGE CAPABILITIES — for each VS stage, list the L3 capability names from your map.
   Reference capability names exactly as defined in capabilityMap. Do not invent new ones here.

4. TECH — named systems only. Do not invent.

5. PAIN POINTS — problems, delays, failures, risks from the source.
   Technology integration problems are pain points here, NOT value streams.

6. METRICS — named KPIs, targets, measures from the source.

7. GAPS — what we couldn't extract; flag as required or recommended.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT — return ONLY valid JSON, no markdown fences
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "roles": [
    { "name": "Role Title", "description": "brief responsibility" }
  ],
  "capabilityMap": {
    "l1Areas": [
      {
        "name": "L1 Business Area",
        "domains": [
          {
            "name": "L2 Business Domain",
            "capabilities": [
              {
                "name": "Verb-Noun L3 Capability",
                "businessObject": "Core business object",
                "description": "What this enables the organisation to do",
                "stabilisationNote": "optional — flag if uncertain or potentially overlapping"
              }
            ]
          }
        ]
      }
    ]
  },
  "stageCapabilities": [
    {
      "vsName": "ValueStream name (must match confirmed VS exactly)",
      "stages": [
        {
          "stageName": "Stage name (must match confirmed stages exactly)",
          "capabilityNames": ["Verb-Noun L3 Capability"]
        }
      ]
    }
  ],
  "tech": [
    { "name": "System Name", "type": "CRM | ERP | Platform | Field | Analytics | Custom | Other" }
  ],
  "painPoints": [
    {
      "description": "Specific pain point",
      "category": "process | data | technology | governance | capacity",
      "intensity": 7,
      "affectedStage": "Stage name or null",
      "binding": false
    }
  ],
  "metrics": [
    { "name": "Metric name", "current": "value or null", "target": "value or null" }
  ],
  "gaps": [
    { "severity": "required | recommended", "prompt": "Specific question to fill this gap" }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE MATERIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${transcript}`;
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runPipeline(
  transcript: string,
  onProgress: ProgressCallback
): Promise<void> {
  const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";

  // ── Pass A1: VS + Stages ──────────────────────────────────────────────────
  onProgress({ status: "pass-a1" });
  let pass1Result: any = null;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        temperature: 0,
        messages: [{ role: "user", content: buildPass1Prompt(transcript) }],
      }),
    });
    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
    pass1Result = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    onProgress({ status: "error", errorMessage: `Pass A1 failed: ${String(e)}` });
    return;
  }

  const confirmedVS = pass1Result.valueStreams ?? [];

  // ── Pass A2: Roles + Capabilities + Signals ───────────────────────────────
  onProgress({ status: "pass-a2" });
  let pass2Result: any = null;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        temperature: 0,
        messages: [{ role: "user", content: buildPass2Prompt(transcript, confirmedVS) }],
      }),
    });
    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
    pass2Result = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    onProgress({ status: "error", errorMessage: `Pass A2 failed: ${String(e)}` });
    return;
  }

  // ── Build DiscoveryIR ─────────────────────────────────────────────────────
  const discoveryIR = buildDiscoveryIR(pass1Result, pass2Result, confirmedVS);

  // Surface DiscoveryIR — optional review point (D-068, D-072)
  // UI can pause here and allow light editing before proceeding to Pass B
  onProgress({ status: "pass-a-done", discoveryIR });

  // Note: the orchestrator returns here. The UI decides whether to proceed
  // immediately to Pass B or show the optional review panel.
  // Call continuePipeline(discoveryIR, onProgress) to proceed.
}

// Called by UI after Pass A — either immediately (skip review) or after review
export async function continuePipeline(
  discoveryIR: DiscoveryIR,
  onProgress: ProgressCallback
): Promise<void> {
  const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";

  // ── Pass B: Scaffold Formalisation ───────────────────────────────────────
  onProgress({ status: "pass-b", discoveryIR });

  const formaliseResult = await runPassB(discoveryIR, apiUrl);

  if (formaliseResult.repairAttempted) {
    onProgress({ status: "pass-b-repairing", discoveryIR });
  }

  if (!formaliseResult.gate1.passed) {
    // Gate 1 still failed after repair — surface to user
    onProgress({
      status: "pass-b-failed",
      discoveryIR,
      scaffold: formaliseResult.scaffold,
      gate1: formaliseResult.gate1,
      errorMessage: `Scaffold formalisation failed validation after repair attempt.\n${formaliseResult.gate1.errors.join("\n")}`,
    });
    return;
  }

  const scaffold = formaliseResult.scaffold;
  onProgress({
    status: "pass-b",
    discoveryIR,
    scaffold,
    gate1: formaliseResult.gate1,
    gate2: formaliseResult.gate2,
  });

  // ── Pass C: Heatmap Analysis ──────────────────────────────────────────────
  onProgress({ status: "pass-c", discoveryIR, scaffold });

  const heatmapResult = await runPassC(discoveryIR, scaffold, apiUrl);

  const now = new Date().toISOString();
  const bundle = {
    bundleVersion: "1.0",
    createdAt: now,
    scaffold,
    heatmaps: heatmapResult.heatmaps,
  };

  onProgress({
    status: "done",
    discoveryIR,
    scaffold,
    gate1: formaliseResult.gate1,
    gate2: formaliseResult.gate2,
    heatmaps: heatmapResult.heatmaps,
    bundle,
  });
}
