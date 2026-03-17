// ─── Pipeline Orchestrator ───────────────────────────────────────────────────
// Pure plumbing — no prompt logic lives here.
//
// Pass A — Discovery IR  (two LLM calls: A1 VS+stages, A2 roles+caps+signals)
// Pass B — Scaffold      (one LLM call, Gate 1 + repair + Gate 2)
// Pass D — Cards         (one LLM call: concept cards + policy cards from scaffold)
//
// Prompts are in domain/pipeline/prompts/ — one file per pass.
// Heatmaps (Pass C) are generated separately via "Assess Friction".

import { buildDiscoveryIR, makeId } from "./discovery-ir";
import type { DiscoveryIR } from "./discovery-ir";
import { runPassB } from "./scaffold-formaliser";
import type { GateResult } from "./scaffold-gates";
import { generateCards } from "./card-generator";
import type { CardRegistry } from "../../types/cards";
import { callLLM } from "./llm-client";
import { buildPass1Prompt } from "./prompts/pass-a1-value-streams";
import { buildPass2Prompt } from "./prompts/pass-a2-capability-mapping";

// ── Post-Pass-B enrichment: inject capability hierarchy from DiscoveryIR ────
function injectCapabilityHierarchy(scaffold: any, ir: DiscoveryIR): void {
  if (!scaffold?.elements?.capabilities || !ir.capabilityMap?.l1Areas?.length) return;

  const caps = scaffold.elements.capabilities as Record<string, any>;

  // Build a lookup from capability name → existing cap id
  const nameToId: Record<string, string> = {};
  for (const [id, cap] of Object.entries(caps)) {
    nameToId[(cap as any).name?.toLowerCase()] = id;
  }

  // Walk the DiscoveryIR hierarchy and inject L1/L2 nodes + set level/parentId on L3s
  for (const l1 of ir.capabilityMap.l1Areas) {
    const l1Id = makeId("cap_l1", l1.name);
    caps[l1Id] = {
      id: l1Id, name: l1.name, elementType: "Capability",
      level: 1, type: l1.type ?? "Execution",
    };

    for (const l2 of l1.domains ?? []) {
      const l2Id = makeId("cap_l2", l2.name);
      caps[l2Id] = {
        id: l2Id, name: l2.name, elementType: "Capability",
        level: 2, parentId: l1Id,
      };

      for (const l3 of l2.capabilities ?? []) {
        const existingId = nameToId[l3.name?.toLowerCase()];
        if (existingId && caps[existingId]) {
          caps[existingId].level = 3;
          caps[existingId].parentId = l2Id;
          caps[existingId].businessObject = caps[existingId].businessObject ?? l3.businessObject;
        }
      }
    }
  }
}

// ── Post-Pass-B enrichment: derive concepts from scaffold info objects ───────
function deriveConceptsFromScaffold(scaffold: any): void {
  if (!scaffold?.elements) return;
  const concepts: Record<string, any> = scaffold.elements.concepts ?? {};

  // Derive Party concepts from roles
  const roles = scaffold.elements.roles ?? {};
  for (const [id, role] of Object.entries(roles)) {
    const r = role as any;
    const cId = `concept_party_${id}`;
    if (!concepts[cId]) {
      concepts[cId] = {
        id: cId, name: r.name, type: "Party",
        definition: r.description ?? `Stakeholder role: ${r.name}`,
        lifecycleStates: [], relatedCapabilityIds: [],
        elementType: "Concept",
        relationships: [],
      };
    }
  }

  // Derive Record concepts from information objects
  const infoObjects = scaffold.elements.informationObjects ?? {};
  for (const [id, obj] of Object.entries(infoObjects)) {
    const o = obj as any;
    const cId = `concept_record_${id}`;
    if (!concepts[cId]) {
      concepts[cId] = {
        id: cId, name: o.name, type: "Record",
        definition: o.description ?? `Information object: ${o.name}`,
        lifecycleStates: [], relatedCapabilityIds: [],
        elementType: "Concept",
        relationships: [],
      };
    }
  }

  // Derive Resource concepts from technology applications
  const techApps = scaffold.elements.technologyApplications ?? {};
  for (const [id, app] of Object.entries(techApps)) {
    const a = app as any;
    const cId = `concept_resource_${id}`;
    if (!concepts[cId]) {
      concepts[cId] = {
        id: cId, name: a.name, type: "Resource",
        definition: a.description ?? `Technology application: ${a.name}`,
        lifecycleStates: [], relatedCapabilityIds: [],
        elementType: "Concept",
        relationships: [],
      };
    }
  }

  // Build relationships: Party → Record (roles use info objects)
  // Walk activities to find role→infoObject connections
  const activities = scaffold.elements.activities ?? {};
  for (const act of Object.values(activities)) {
    const a = act as any;
    const ppit = a.capabilityPPIT;
    if (!ppit) continue;
    for (const decomp of Object.values(ppit) as any[]) {
      const roleIds = decomp?.roleIds ?? [];
      const infoIds = decomp?.informationObjectIds ?? [];
      for (const rId of roleIds) {
        const partyCId = `concept_party_${rId}`;
        if (concepts[partyCId]) {
          for (const iId of infoIds) {
            const recordCId = `concept_record_${iId}`;
            if (concepts[recordCId]) {
              const existing = concepts[partyCId].relationships as any[];
              if (!existing.some((r: any) => r.targetId === recordCId)) {
                existing.push({ targetId: recordCId, type: "relates-to", label: "uses" });
              }
            }
          }
        }
      }
    }
  }

  scaffold.elements.concepts = concepts;
}

// ── Progress state fed back to the UI ────────────────────────────────────────

export type PipelineStatus =
  | "idle"
  | "pass-a1"          // extracting VS + stages
  | "pass-a2"          // extracting roles + caps + signals
  | "pass-a-done"      // DiscoveryIR ready — optional review point
  | "pass-b"           // formalising scaffold
  | "pass-b-repairing" // Gate 1 failed, attempting repair
  | "pass-b-failed"    // Gate 1 still failed after repair — surface to user
  | "pass-d"           // generating concept + policy cards
  | "done"
  | "error";

export interface PipelineProgress {
  status: PipelineStatus;
  discoveryIR?: DiscoveryIR;          // available after pass-a-done
  scaffold?: any;                      // available after pass-b
  gate1?: GateResult;
  gate2?: GateResult;
  cardRegistry?: CardRegistry;        // available after pass-d
  bundle?: any;                        // available after done
  errorMessage?: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

// Re-export card generator for standalone use (e.g. "Generate Cards" button on imported scaffolds)
export { generateCards } from "./card-generator";
export type { CardGenerationResult } from "./card-generator";

// ── Main orchestrator — Pass A ──────────────────────────────────────────────

export async function runPipeline(
  transcript: string,
  onProgress: ProgressCallback
): Promise<void> {
  // ── Pass A1: VS + Stages ──────────────────────────────────────────────────
  onProgress({ status: "pass-a1" });
  let pass1Result: any = null;

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      messages: [{ role: "user", content: buildPass1Prompt(transcript) }],
    });
    const raw = llmRes.text.replace(/`{3}json|`{3}/g, "").trim();
    try {
      pass1Result = JSON.parse(raw);
    } catch {
      // LLM may have been truncated — attempt to repair by closing open braces/brackets
      const repaired = raw.replace(/,\s*$/, "") + "}".repeat((raw.match(/{/g) || []).length - (raw.match(/}/g) || []).length);
      pass1Result = JSON.parse(repaired);
    }
  } catch (e) {
    onProgress({ status: "error", errorMessage: `Pass A1 failed: ${e instanceof Error ? e.message : String(e)}` });
    return;
  }

  const confirmedVS = pass1Result.valueStreams ?? [];

  // ── Pass A2: Roles + Capabilities + Signals ───────────────────────────────
  onProgress({ status: "pass-a2" });
  let pass2Result: any = null;

  try {
    const llmRes = await callLLM({
      model: "claude-sonnet-4-20250514",
      max_tokens: 12000,
      temperature: 0,
      messages: [{ role: "user", content: buildPass2Prompt(transcript, confirmedVS) }],
    });
    const raw = llmRes.text.replace(/`{3}json|`{3}/g, "").trim();
    try {
      pass2Result = JSON.parse(raw);
    } catch {
      const repaired = raw.replace(/,\s*$/, "") + "}".repeat((raw.match(/{/g) || []).length - (raw.match(/}/g) || []).length);
      pass2Result = JSON.parse(repaired);
    }
  } catch (e) {
    onProgress({ status: "error", errorMessage: `Pass A2 failed: ${e instanceof Error ? e.message : String(e)}` });
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

  // ── Post-Pass-B enrichment ──────────────────────────────────────────────────
  // Inject L1/L2/L3 capability hierarchy from DiscoveryIR (lost during Pass B flattening)
  injectCapabilityHierarchy(scaffold, discoveryIR);
  // Derive Capsicum Triad concepts (Party/Record/Resource) from scaffold registries
  deriveConceptsFromScaffold(scaffold);

  // Store pain points on the scaffold for later friction assessment
  const ppSummary = discoveryIR.painPoints
    .filter((p) => p.description)
    .map((p, i) =>
      `${i + 1}. [${p.category || "unclassified"}] ${p.description} (intensity ${p.intensity ?? 7}/10, stage: ${p.affectedStage || "unknown"})${p.binding ? " ← flagged as binding" : ""}`
    ).join("\n");

  if (ppSummary) {
    scaffold._discoveryPainPoints = ppSummary;
  }

  // ── Pass D: Generate Concept & Policy Cards ──────────────────────────────
  onProgress({ status: "pass-d", discoveryIR, scaffold });
  let cardRegistry: CardRegistry | undefined;

  try {
    const cardResult = await generateCards(scaffold);
    if (cardResult.registry) {
      cardRegistry = cardResult.registry;
    } else {
      console.warn("[pipeline] Card generation returned no cards:", cardResult.error);
    }
  } catch (e) {
    // Card generation is non-fatal — we still emit the scaffold
    console.warn("[pipeline] Card generation failed (non-fatal):", e);
  }

  const now = new Date().toISOString();
  const bundle: Record<string, unknown> = {
    bundleVersion: "2.0",
    createdAt: now,
    scaffold,
    heatmaps: [] as any[],
  };
  if (cardRegistry) {
    bundle.cardRegistry = cardRegistry;
  }

  onProgress({
    status: "done",
    discoveryIR,
    scaffold,
    gate1: formaliseResult.gate1,
    gate2: formaliseResult.gate2,
    cardRegistry,
    bundle,
  });
}
