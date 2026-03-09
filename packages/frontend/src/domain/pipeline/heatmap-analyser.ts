// ─── Heatmap Analyser — Pass C Runtime ────────────────────────────────────────
// Pure plumbing — prompt logic lives in prompts/pass-c-friction-analysis.ts
// This file handles: LLM call, response parsing, heatmap assembly.

import type { DiscoveryIR } from "./discovery-ir";
import { callLLM } from "./llm-client";
import { buildHeatmapPrompt } from "./prompts/pass-c-friction-analysis";

export interface HeatmapResult {
  heatmaps: any[];
  error?: string;
}

export async function runPassC(
  ir: DiscoveryIR,
  scaffold: any,
): Promise<HeatmapResult> {
  const now = new Date().toISOString();
  const scaffoldId = scaffold.scaffoldId ?? `scaffold-unknown`;
  const heatmapPrompt = buildHeatmapPrompt(ir, scaffold, now);

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      messages: [{ role: "user", content: heatmapPrompt }],
    });
    const result = JSON.parse(llmRes.text.replace(/`{3}json|`{3}/g, "").trim());

    const heatmaps = (result.heatmaps ?? []).map((h: any) => ({
      heatmapId: `heatmap-${h.valueStreamId}-${Date.now()}`,
      scaffoldId,
      valueStreamId: h.valueStreamId,
      observations: h.observations ?? [],
      // null bindingConstraint is valid (D-067) — only include if present
      ...(h.bindingConstraint != null && { bindingConstraint: h.bindingConstraint }),
      schemaVersion: "1.0.0",
      createdAt: now,
    }));

    return { heatmaps };
  } catch (e) {
    console.error("Pass C heatmap analysis failed", e);
    // Return empty heatmaps — an empty heatmap is better than a wrong one
    return { heatmaps: [], error: String(e) };
  }
}
