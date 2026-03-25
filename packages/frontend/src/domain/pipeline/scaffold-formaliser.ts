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
 *  Each stage generates roughly 1.2k tokens of lean scaffold output (activity
 *  with FSM chain, basic IO with 2-3 lifecycle states, registry entries).
 *  Sub-activity DAGs and PPIT are generated in separate enrichment passes.
 *  We add headroom for registries, shared capabilities, and the JSON envelope. */
function estimateMaxTokens(ir: DiscoveryIR): number {
  const totalStages = ir.valueStreams.reduce((sum, vs) => sum + (vs.stages?.length ?? 0), 0);
  // ~1.2k per activity (lean scaffold incl. IOs + lifecycle), + 4k for registries/envelope
  const estimate = totalStages * 1200 + 4000;
  // Clamp between 8k (minimum viable) and 32k (generous ceiling — avoids truncation)
  return Math.max(8000, Math.min(32000, estimate));
}

/** Attempt to repair truncated JSON by closing open strings, arrays, and objects.
 *  This handles the common case where the LLM response hits max_tokens mid-output. */
function repairTruncatedJSON(raw: string): any {
  let s = raw.trim();

  // Close any unterminated string (odd number of unescaped quotes)
  const quoteCount = (s.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    s += '"';
  }

  // Remove any trailing comma after our repair
  s = s.replace(/,\s*$/, "");

  // Count open vs close braces/brackets and close them
  const openBraces = (s.match(/{/g) || []).length;
  const closeBraces = (s.match(/}/g) || []).length;
  const openBrackets = (s.match(/\[/g) || []).length;
  const closeBrackets = (s.match(/]/g) || []).length;

  // Close brackets first (inner), then braces (outer)
  s += "]".repeat(Math.max(0, openBrackets - closeBrackets));
  s += "}".repeat(Math.max(0, openBraces - closeBraces));

  return JSON.parse(s);
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
    const wasTruncated = llmRes.stopReason === "max_tokens";
    if (wasTruncated) {
      console.warn(`Pass B response truncated at max_tokens (${maxTokens}) — attempting JSON repair`);
    }
    const raw = llmRes.text.replace(/`{3}json|`{3}/g, "").trim();
    try {
      scaffold = JSON.parse(raw);
    } catch {
      // JSON parse failed — attempt repair (handles truncation + minor issues)
      console.warn("Pass B: direct JSON.parse failed, attempting repair…");
      scaffold = repairTruncatedJSON(raw);
      console.log("Pass B: JSON repair succeeded");
    }
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
      const raw = llmRes.text.replace(/`{3}json|`{3}/g, "").trim();
      try {
        scaffold = JSON.parse(raw);
      } catch {
        console.warn("Pass B repair: direct JSON.parse failed, attempting repair…");
        scaffold = repairTruncatedJSON(raw);
        console.log("Pass B repair: JSON repair succeeded");
      }
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
