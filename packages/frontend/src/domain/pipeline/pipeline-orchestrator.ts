// ─── Pipeline Orchestrator ───────────────────────────────────────────────────
// Pure plumbing — no prompt logic lives here.
//
// Pass A — Discovery IR  (two LLM calls: A1 VS+stages, A2 roles+caps+signals)
// Pass B — Scaffold      (one LLM call, Gate 1 + repair + Gate 2)
//
// Prompts are in domain/pipeline/prompts/ — one file per pass.
// Heatmaps (Pass C) are generated separately via "Assess Friction".

import { buildDiscoveryIR } from "./discovery-ir";
import type { DiscoveryIR } from "./discovery-ir";
import { runPassB } from "./scaffold-formaliser";
import type { GateResult } from "./scaffold-gates";
import { buildPass1Prompt } from "./prompts/pass-a1-value-streams";
import { buildPass2Prompt } from "./prompts/pass-a2-capability-mapping";

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
  onProgress({ status: "pass-a-done", discoveryIR });
}

// ── Pass B: Called by UI after form is ready ─────────────────────────────────

export async function continuePipeline(
  discoveryIR: DiscoveryIR,
  onProgress: ProgressCallback
): Promise<void> {
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
