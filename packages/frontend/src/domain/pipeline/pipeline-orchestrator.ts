// ─── Pipeline Orchestrator ───────────────────────────────────────────────────
// Three-pass runtime (D-065). DiscoveryIntake.tsx calls this as a thin shell.
//
// Pass A — Discovery IR  (two LLM calls: A1 VS+stages, A2 roles+caps+signals)
// Pass B — Scaffold      (one LLM call, Gate 1 with one repair retry, Gate 2)
//
// Heatmaps (former Pass C) are generated separately via "Assess Friction" on
// the Network/Stage views. This halves initial generation time.
//
// Each artefact is persisted via onProgress callbacks so UI can recover
// if a later pass fails.

import { buildDiscoveryIR } from "./discovery-ir";
import type { DiscoveryIR } from "./discovery-ir";
import { runPassB } from "./scaffold-formaliser";
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
  | "done"
  | "error";

export interface PipelineProgress {
  status: PipelineStatus;
  discoveryIR?: DiscoveryIR;          // available after pass-a-done
  scaffold?: any;                      // available after pass-b
  gate1?: GateResult;
  gate2?: GateResult;
  bundle?: any;                        // available after done
  errorMessage?: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

// ── Pass A1 prompt — VS Definition + Lifecycle Stages ────────────────────────
// SINGLE SOURCE OF TRUTH — all VS extraction logic lives here.

function buildPass1Prompt(transcript: string): string {
  return `You are a business architect defining Value Streams for a governance diagnostic.
A ValueStream is the end-to-end flow that delivers measurable stakeholder value — triggered by a defined need, ending at a verifiable outcome. Work at board level: structural flow of value, not process detail.

## Your Task
From the source material below, identify ALL Value Streams present. Do not cap the number — extract every distinct end-to-end flow the source describes.

## Rules
- Each VS is a RECURRING operational flow that delivers value repeatedly — not a one-time project or strategic initiative. "Lead to Customer" and "Order to Delivery" are VS. "Technology Integration" and "Digital Transformation" are projects/initiatives — do NOT include them as VS.
- Each VS is outcome-driven, not function-driven ("Member Certification Lifecycle" not "Certification Team Activities")
- Each VS has a clear trigger event and a clear terminal outcome
- VS names are concise, 2-5 words, title case. Use "<Trigger> to <Outcome>" pattern where natural (e.g. "Lead to Customer", "Order to Delivery", "Issue to Resolution", "Hire to Productive").
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
}

// ── Pass A2 prompt — Roles + Capabilities + Signals ──────────────────────────
// SINGLE SOURCE OF TRUTH — all role/capability extraction lives here.

function buildPass2Prompt(transcript: string, confirmedVS: any[]): string {
  const vsStageRef = confirmedVS.map((vs: any) =>
    `VS: "${vs.name}"\n  Stages: ${(vs.stages ?? []).map((s: any) => `"${s.name}"`).join(", ")}`
  ).join("\n\n");

  return `You are extracting Roles and Capabilities for a business architecture diagnostic.

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
- IMPORTANT: Capabilities are SHARED across activities and value streams. The same capability should appear in multiple VS where relevant. Do not create one capability per activity.

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
}

// ── Main orchestrator — Pass A ──────────────────────────────────────────────

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
    pass1Result = JSON.parse(text.replace(/`{3}json|`{3}/g, "").trim());
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
    pass2Result = JSON.parse(text.replace(/`{3}json|`{3}/g, "").trim());
  } catch (e) {
    onProgress({ status: "error", errorMessage: `Pass A2 failed: ${String(e)}` });
    return;
  }

  // ── Build DiscoveryIR ─────────────────────────────────────────────────────
  const discoveryIR = buildDiscoveryIR(pass1Result, pass2Result, confirmedVS);

  // Return Pass A results — DiscoveryIntake merges these into the form
  onProgress({ status: "pass-a-done", discoveryIR });

  // Note: the orchestrator returns here. The UI decides whether to proceed
  // immediately to Pass B or show the form for editing.
  // Call continuePipeline(discoveryIR, onProgress) to proceed.
}

// ── Pass B: Called by UI after form is ready ─────────────────────────────────

export async function continuePipeline(
  discoveryIR: DiscoveryIR,
  onProgress: ProgressCallback
): Promise<void> {
  // ── Pass B: Scaffold Formalisation (with Gate 1 + repair + Gate 2) ────────
  onProgress({ status: "pass-b", discoveryIR });

  const formaliseResult = await runPassB(discoveryIR);

  if (formaliseResult.repairAttempted) {
    onProgress({ status: "pass-b-repairing", discoveryIR });
  }

  if (!formaliseResult.gate1.passed) {
    onProgress({
      status: "pass-b-failed",
      discoveryIR,
      scaffold: formaliseResult.scaffold,
      gate1: formaliseResult.gate1,
      errorMessage: `Scaffold validation failed after repair attempt.\n${formaliseResult.gate1.errors.join("\n")}`,
    });
    return;
  }

  const scaffold = formaliseResult.scaffold;

  // Store pain points on the scaffold for later friction assessment
  const ppSummary = discoveryIR.painPoints
    .filter((p) => p.description)
    .map((p, i) =>
      `${i + 1}. [${p.category || "unclassified"}] ${p.description} (intensity ${p.intensity ?? 7}/10, stage: ${p.affectedStage || "unknown"})${p.binding ? " ← flagged as binding" : ""}`
    ).join("\n");

  if (ppSummary) {
    scaffold._discoveryPainPoints = ppSummary;
  }

  const now = new Date().toISOString();
  const bundle = {
    bundleVersion: "1.0",
    createdAt: now,
    scaffold,
    heatmaps: [] as any[],
  };

  onProgress({
    status: "done",
    discoveryIR,
    scaffold,
    gate1: formaliseResult.gate1,
    gate2: formaliseResult.gate2,
    bundle,
  });
}
