// ─── Scaffold Formaliser — Pass B Runtime ────────────────────────────────────
// Pure plumbing — prompt logic lives in prompts/pass-b-scaffold-formalisation.ts
// This file handles: LLM call, Gate 1, bounded repair, Gate 2.

import type { DiscoveryIR } from "./discovery-ir";
import { runGate1, runGate2 } from "./scaffold-gates";
import type { GateResult } from "./scaffold-gates";
import { buildScaffoldPrompt, buildRepairPrompt } from "./prompts/pass-b-scaffold-formalisation";

export interface FormaliseResult {
  scaffold: any;
  gate1: GateResult;
  gate2: GateResult;
  repairAttempted: boolean;
  error?: string;
}

export async function runPassB(
  ir: DiscoveryIR,
): Promise<FormaliseResult> {
  const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";
  const scaffoldPrompt = buildScaffoldPrompt(ir);

  let scaffold: any = null;
  let repairAttempted = false;

  // First attempt
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        temperature: 0,
        messages: [{ role: "user", content: scaffoldPrompt }],
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error("Pass B API error:", res.status, errBody);
      throw new Error(`API ${res.status}: ${errBody.slice(0, 300)}`);
    }
    const data = await res.json();
    if (data.error) {
      console.error("Pass B API returned error:", data.error);
      throw new Error(`API error: ${JSON.stringify(data.error).slice(0, 300)}`);
    }
    if (data.stop_reason === "max_tokens") {
      console.warn("Pass B response truncated at max_tokens — output may be incomplete");
    }
    const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
    scaffold = JSON.parse(text.replace(/`{3}json|`{3}/g, "").trim());
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
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16000,
          temperature: 0,
          messages: [{ role: "user", content: repairPrompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
      scaffold = JSON.parse(text.replace(/`{3}json|`{3}/g, "").trim());
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
