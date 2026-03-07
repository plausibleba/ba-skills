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
  return `You are a business architect defining Value Streams for a governance diagnostic.

Extract value streams and lifecycle stages from the source below.

## Output Format
Return ONLY valid JSON, no markdown fences:
{
  "org": {
    "name": "Organisation name",
    "industry": "Industry sector",
    "size": "SME|Mid-Market|Enterprise",
    "stakeholder": "Primary accountable stakeholder"
  },
  "valueStreams": [
    {
      "name": "Value Stream Name",
      "description": "What value this delivers and for whom",
      "zone": "ecosystem",
      "trigger": "What initiates this value stream",
      "terminalOutcome": "Final outcome when value is delivered",
      "stakeholder": "Accountable stakeholder",
      "stages": [
        { "name": "Stage Name" }
      ]
    }
  ]
}

## Rules
- zone: "ecosystem" = externally-facing (customer, member, partner, market); "knowledge" = internally-facing (operations, reporting, governance)
- 3-7 stages per value stream
- Stage names should be verb-noun (e.g. "Assess Application", "Onboard Member")
- Extract only what is present in the source — do not invent value streams

## Source
${transcript}`;
}

function buildPass2Prompt(transcript: string, confirmedVS: any[]): string {
  const vsRef = JSON.stringify(
    confirmedVS.map((vs: any) => ({ name: vs.name, stages: (vs.stages ?? []).map((s: any) => s.name ?? s) })),
    null, 2
  );

  return `You are extracting Roles and Capabilities for a business architecture diagnostic.

## Confirmed Value Streams and Stages (anchor to these exactly):
${vsRef}

## Extract the following:

### Roles (who participates)
Named roles from the source — job titles, team names, system actors. Do not invent.

### Capabilities (what the organisation must be able to do)
Per value stream. Verb-noun convention (e.g. "Manage Member Credentials", not "Credential Management Execution").
- If no explicit capabilities exist in the source, derive from VS/stage content using Verb-Noun convention
- 1-4 capabilities per value stream

### Tech (systems and tools mentioned)
Named systems only — do not invent.

### Pain Points (diagnostic signals)
Explicit problems, failures, delays, or risks mentioned. These are discovery signals for Phase E friction analysis.

### Metrics (performance indicators)
Named KPIs, targets, or measures. Include baseline/current and target if mentioned.

### Gaps (what we couldn't extract)
Required fields we couldn't find — flag as required or recommended.

Return ONLY valid JSON, no markdown fences:
{
  "roles": [{ "name": "Role Name", "description": "brief" }],
  "capabilitiesByVS": [
    {
      "vsName": "Value Stream Name",
      "capabilities": [{ "name": "Verb Noun Capability", "description": "brief" }]
    }
  ],
  "tech": [{ "name": "System Name", "type": "CRM|ERP|Platform|Other" }],
  "painPoints": [
    {
      "description": "Specific pain point",
      "category": "process|data|technology|governance|capacity",
      "intensity": 7,
      "affectedStage": "Stage name if known",
      "binding": false
    }
  ],
  "metrics": [{ "name": "Metric Name", "current": "current value", "target": "target value" }],
  "gaps": [{ "severity": "required|recommended", "prompt": "Specific question to fill this gap" }]
}

## Source
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
