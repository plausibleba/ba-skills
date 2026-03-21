// ─── Scaffold Formaliser — Pass B Runtime ────────────────────────────────────
// Pure plumbing — prompt logic lives in prompts/pass-b-scaffold-formalisation.ts
// This file handles: LLM call, Gate 1, bounded repair, Gate 2.

import type { DiscoveryIR } from "./discovery-ir";
import { runGate1, runGate2 } from "./scaffold-gates";
import type { GateResult } from "./scaffold-gates";
import { callLLM } from "./llm-client";
import { buildScaffoldPrompt, buildRepairPrompt } from "./prompts/pass-b-scaffold-formalisation";

export interface FormaliseResult {
  scaffold: any;
  gate1: GateResult;
  gate2: GateResult;
  repairAttempted: boolean;
  error?: string;
}

/** Estimate a reasonable max_tokens ceiling based on input complexity.
 *  Each VS with ~4 stages generates roughly 3-4k tokens of scaffold output
 *  (activities, outcomes, capabilityPPIT, info objects, lifecycle states, DAGs).
 *  We add headroom for registries and the JSON envelope. */
function estimateMaxTokens(ir: DiscoveryIR): number {
  const totalStages = ir.valueStreams.reduce((sum, vs) => sum + (vs.stages?.length ?? 0), 0);
  // ~4k per activity (with PPIT, lifecycle states, DAG), + 2k for registries/envelope
  const estimate = totalStages * 4000 + 2000;
  // Clamp between 8k (minimum viable) and 32k (Sonnet limit)
  return Math.max(8000, Math.min(32000, estimate));
}

export async function runPassB(
  ir: DiscoveryIR,
): Promise<FormaliseResult> {
  const scaffoldPrompt = buildScaffoldPrompt(ir);
  const maxTokens = estimateMaxTokens(ir);
  console.log(`Pass B: ${ir.valueStreams.length} VS, ${ir.valueStreams.reduce((s, v) => s + (v.stages?.length ?? 0), 0)} stages → max_tokens=${maxTokens}`);

  let scaffold: any = null;
  let repairAttempted = false;

  // First attempt
  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: scaffoldPrompt }],
    });
    if (llmRes.stopReason === "max_tokens") {
      console.warn("Pass B response truncated at max_tokens — output may be incomplete");
    }
    scaffold = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Pass B failed:", msg);
    return {
      scaffold: null,
      gate1: { passed: false, errors: [`Pass B LLM call failed: ${msg}`], warnings: [] },
      gate2: { passed: false, errors: [`Pass B LLM call failed: ${msg}`], warnings: [] },
      repairAttempted: false,
      error: msg,
    };
  }

  // Gate 1 check
  let gate1 = runGate1(scaffold);

  // One bounded repair attempt if Gate 1 fails
  if (!gate1.passed) {
    repairAttempted = true;
    const repairPrompt = buildRepairPrompt(scaffoldPrompt, gate1.errors);
    try {
      const llmRes = await callLLM({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        temperature: 0,
        messages: [{ role: "user", content: repairPrompt }],
      });
      scaffold = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());
      gate1 = runGate1(scaffold);
    } catch (e) {
      return {
        scaffold,
        gate1,
        gate2: { passed: false, errors: ["Repair attempt failed"], warnings: [] },
        repairAttempted: true,
        error: `Repair call failed: ${String(e)}`,
      };
    }
  }

  // Gate 2 (only if Gate 1 passed)
  const gate2 = gate1.passed ? runGate2(scaffold) : { passed: false, errors: ["Gate 1 failed — Gate 2 not run"], warnings: [] };

  return { scaffold, gate1, gate2, repairAttempted };
}
