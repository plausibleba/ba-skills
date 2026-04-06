// ─── PPIT Enricher — Pass C Runtime ───────────────────────────────────────────
// Generates capabilityPPIT decompositions for each activity × capability pair.
// Runs after Pass B (scaffold generation) and merges PPIT data back into the scaffold.
//
// This is a separate pass to keep Pass B's output small and fast. PPIT is the
// densest part of the scaffold — roughly 40% of total token output.

import { callLLM } from "./llm-client";
import { buildPPITPrompt } from "./prompts/pass-c-ppit-enrichment";

export interface PPITResult {
  success: boolean;
  error?: string;
}

/**
 * Runs Pass C: generates PPIT and merges it into the scaffold in-place.
 * Non-fatal — if PPIT generation fails, the scaffold still works (just without PPIT).
 */
export async function runPassC(scaffold: any): Promise<PPITResult> {
  const activities = scaffold?.elements?.activities;
  if (!activities || Object.keys(activities).length === 0) {
    return { success: true }; // nothing to enrich
  }

  // Count activity × capability pairs to estimate tokens
  // Handle both v4 (requiresCapabilityIds) and v5 (enabledByCapabilityIds) field names
  let pairCount = 0;
  for (const act of Object.values(activities)) {
    pairCount += ((act as any).enabledByCapabilityIds ?? (act as any).requiresCapabilityIds ?? []).length;
  }
  // ~200 tokens per PPIT entry + overhead
  const maxTokens = Math.max(4000, Math.min(16000, pairCount * 200 + 1000));
  console.log(`Pass C (PPIT): ${Object.keys(activities).length} activities, ${pairCount} cap pairs → max_tokens=${maxTokens}`);

  const prompt = buildPPITPrompt(scaffold);

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    if (llmRes.stopReason === "max_tokens") {
      console.warn("Pass C response truncated at max_tokens — PPIT may be incomplete");
    }

    const ppitMap = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());

    // Merge PPIT into scaffold activities
    let merged = 0;
    for (const [actId, capPPIT] of Object.entries(ppitMap)) {
      if (activities[actId]) {
        activities[actId].capabilityPPIT = capPPIT;
        merged++;
      }
    }
    console.log(`Pass C: merged PPIT into ${merged}/${Object.keys(activities).length} activities`);

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Pass C (PPIT) failed:", msg);
    return { success: false, error: msg };
  }
}
