/**
 * Pass D — Card Generation
 *
 * Generates Concept Cards and Policy Cards from a formalised scaffold.
 * Called after Pass B (scaffold formalisation) is complete.
 */

import type { ScaffoldData } from "../../types.ts";
import type { CardRegistry } from "../../types/cards.ts";
import { callLLM } from "./llm-client";
import { buildCardGenerationPrompt } from "./prompts/pass-d-card-generation";

export interface CardGenerationResult {
  registry: CardRegistry | null;
  error?: string;
}

/**
 * Run Pass D: generate concept cards and policy cards from the scaffold.
 *
 * @param scaffold The formalised scaffold (output of Pass B)
 * @returns CardRegistry with generated concept and policy cards
 */
export async function generateCards(scaffold: ScaffoldData): Promise<CardGenerationResult> {
  try {
    const prompt = buildCardGenerationPrompt(scaffold);

    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = llmRes.text.replace(/`{3}json|`{3}/g, "").trim();
    const parsed = JSON.parse(raw);

    // Validate structure
    const registry: CardRegistry = {
      conceptCards: parsed.conceptCards ?? {},
      policyCards: parsed.policyCards ?? {},
    };

    // Basic validation — ensure all cards have required fields
    const errors: string[] = [];

    for (const [id, card] of Object.entries(registry.conceptCards)) {
      const cc = card as any;
      if (!cc.cardId) cc.cardId = id;
      if (!cc.canonicalName) errors.push(`Concept card ${id} missing canonicalName`);
      if (!cc.senses || cc.senses.length === 0) errors.push(`Concept card ${id} has no senses`);
      if (!cc.anchors) cc.anchors = {};
      if (!cc.tokenBudget) cc.tokenBudget = 300;
      if (!cc.relationships) cc.relationships = [];
    }

    for (const [id, card] of Object.entries(registry.policyCards)) {
      const pc = card as any;
      if (!pc.cardId) pc.cardId = id;
      if (!pc.name) errors.push(`Policy card ${id} missing name`);
      if (!pc.conditions || pc.conditions.length === 0) errors.push(`Policy card ${id} has no conditions`);
      if (!pc.outcomes || pc.outcomes.length === 0) errors.push(`Policy card ${id} has no outcomes`);
      if (!pc.anchors) pc.anchors = {};
      if (!pc.scope) pc.scope = {};
      if (!pc.exceptions) pc.exceptions = [];
      if (!pc.actionBindings) pc.actionBindings = [];
    }

    if (errors.length > 0) {
      console.warn("[card-generator] Validation warnings:", errors);
    }

    const ccCount = Object.keys(registry.conceptCards).length;
    const pcCount = Object.keys(registry.policyCards).length;
    console.log(`[card-generator] Generated ${ccCount} concept cards, ${pcCount} policy cards`);

    return { registry };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[card-generator] Failed:", msg);
    return { registry: null, error: `Card generation failed: ${msg}` };
  }
}
