// ─── Pipeline Orchestrator ───────────────────────────────────────────────────
// Pure plumbing — no prompt logic lives here.
//
// Pass A — Discovery IR  (two LLM calls: A1 VS+stages, A2 roles+caps+signals)
// Pass B — Scaffold      (one LLM call, Gate 1 + repair + Gate 2)
// Pass C — PPIT          (one LLM call: People/Process/Info/Tech per activity×capability)
// Pass D — Cards         (one LLM call: concept cards + policy cards from scaffold)
//
// Prompts are in domain/pipeline/prompts/ — one file per pass.
// Heatmaps are generated separately via "Assess Friction".

import { buildDiscoveryIR, makeId } from "./discovery-ir";
import type { DiscoveryIR } from "./discovery-ir";
import { runPassB } from "./scaffold-formaliser";
import { runPassC } from "./ppit-enricher";
import type { GateResult } from "./scaffold-gates";
import { generateCards } from "./card-generator";
import type { CardRegistry } from "../../types/cards";
import { callLLM } from "./llm-client";
import { buildPass1Prompt } from "./prompts/pass-a1-value-streams";
import { buildPass2Prompt } from "./prompts/pass-a2-capability-mapping";

// ── Post-Pass-B enrichment: inject capability hierarchy from DiscoveryIR ────
// Pass B generates flat L4 capabilities. This function adds L1/L2/L3 hierarchy
// nodes from the DiscoveryIR and parents L4s under L3 groups.
//
// Handles two formats:
//   1. New 4-level: L1 > L2.capabilityGroups (L3) > capabilities (L4)
//   2. Old 3-level: L1 > L2.capabilities (leaf L3, treated as L4 under synthetic L3)
//
// Pass B often renames capabilities — exact name matching fails. Instead we:
// 1. Add L1/L2/L3 nodes from the hierarchy
// 2. Try exact name match first for L4s
// 3. Fall back: assign unmatched scaffold capabilities to their best-fit L3 group
function injectCapabilityHierarchy(scaffold: any, ir: DiscoveryIR): void {
  if (!scaffold?.elements?.capabilities || !ir.capabilityMap?.l1Areas?.length) return;

  const caps = scaffold.elements.capabilities as Record<string, any>;

  // Build lookup from capability name → existing cap id (case-insensitive)
  const nameToId: Record<string, string> = {};
  for (const [id, cap] of Object.entries(caps)) {
    if ((cap as any).name) nameToId[(cap as any).name.toLowerCase()] = id;
  }

  // Track which scaffold caps get matched
  const matched = new Set<string>();

  // Phase 1: Add L1/L2/L3 nodes and match L4 leaves
  const l3Ids: string[] = [];
  const l2Ids: string[] = [];
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
      l2Ids.push(l2Id);

      // Detect 4-level vs 3-level format
      const l2Any = l2 as any;
      if (l2Any.capabilityGroups?.length) {
        // 4-level: L2 > L3 capabilityGroups > L4 capabilities
        for (const l3 of l2Any.capabilityGroups) {
          const l3Id = makeId("cap_l3", l3.name);
          caps[l3Id] = {
            id: l3Id, name: l3.name, elementType: "Capability",
            level: 3, parentId: l2Id, businessObject: l3.businessObject ?? "",
            description: l3.description ?? "",
          };
          l3Ids.push(l3Id);

          for (const l4 of (l3.capabilities ?? [])) {
            const existingId = nameToId[l4.name?.toLowerCase()];
            if (existingId && caps[existingId]) {
              caps[existingId].level = 4;
              caps[existingId].parentId = l3Id;
              caps[existingId].businessObject = caps[existingId].businessObject ?? l4.businessObject;
              matched.add(existingId);
            } else {
              const l4Id = makeId("cap", l4.name);
              if (!caps[l4Id]) {
                caps[l4Id] = {
                  id: l4Id, name: l4.name, elementType: "Capability",
                  level: 4, parentId: l3Id, businessObject: l4.businessObject ?? "",
                  description: l4.description ?? "",
                };
              } else {
                caps[l4Id].level = 4;
                caps[l4Id].parentId = l3Id;
              }
              matched.add(l4Id);
            }
          }
        }
      } else {
        // 3-level fallback: L2.capabilities are leaf — treat as L4 under L2 directly
        // (no L3 groups in old format, so parent to L2)
        for (const leaf of (l2.capabilities ?? [])) {
          const existingId = nameToId[leaf.name?.toLowerCase()];
          if (existingId && caps[existingId]) {
            caps[existingId].level = 4;
            caps[existingId].parentId = l2Id;
            caps[existingId].businessObject = caps[existingId].businessObject ?? leaf.businessObject;
            matched.add(existingId);
          } else {
            const leafId = makeId("cap", leaf.name);
            if (!caps[leafId]) {
              caps[leafId] = {
                id: leafId, name: leaf.name, elementType: "Capability",
                level: 4, parentId: l2Id, businessObject: leaf.businessObject ?? "",
                description: leaf.description ?? "",
              };
            } else {
              caps[leafId].level = 4;
              caps[leafId].parentId = l2Id;
            }
            matched.add(leafId);
          }
        }
      }
    }
  }

  // Phase 2: Assign unmatched scaffold capabilities to best-fit parent
  // Prefer L3 groups if available, fall back to L2 domains
  const parentPool = l3Ids.length > 0 ? l3Ids : l2Ids;
  const unmatchedIds = Object.keys(caps).filter(id => {
    const c = caps[id];
    return !matched.has(id) && !id.startsWith("cap_l1_") && !id.startsWith("cap_l2_") && !id.startsWith("cap_l3_")
      && c.level !== 1 && c.level !== 2 && c.level !== 3;
  });

  if (unmatchedIds.length > 0 && parentPool.length > 0) {
    for (const capId of unmatchedIds) {
      const cap = caps[capId];
      const capWords = (cap.name ?? "").toLowerCase().split(/\s+/);

      // Score each parent by word overlap
      let bestParent = parentPool[0];
      let bestScore = 0;
      for (const pId of parentPool) {
        const pName = (caps[pId]?.name ?? "").toLowerCase();
        const score = capWords.filter((w: string) => w.length > 3 && pName.includes(w)).length;
        if (score > bestScore) { bestScore = score; bestParent = pId; }
      }

      cap.level = 4;
      cap.parentId = bestParent;
    }
  }
}

// ── Post-Pass-B enrichment: derive concepts from scaffold + DiscoveryIR ──────
// Uses DiscoveryIR for Resources (tech) since scaffold often doesn't have them.
// Selective about Records — only key business objects, not every IO.
function deriveConceptsFromScaffold(scaffold: any, ir?: DiscoveryIR): void {
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
        elementType: "Concept", relationships: [],
      };
    }
  }

  // Derive Record concepts — SELECTIVE: only IOs referenced by 2+ activities (key business objects)
  // or those whose names suggest core records (Order, Invoice, Contract, Application, etc.)
  const infoObjects = scaffold.elements.informationObjects ?? {};
  const activities = scaffold.elements.activities ?? {};
  const ioRefCount: Record<string, number> = {};
  for (const act of Object.values(activities)) {
    for (const ioId of (act as any).informationObjectIds ?? []) {
      ioRefCount[ioId] = (ioRefCount[ioId] ?? 0) + 1;
    }
  }
  const RECORD_KEYWORDS = /order|invoice|contract|application|request|record|report|plan|schedule|profile|account|claim|ticket|brief|quote|specification|model/i;
  for (const [id, obj] of Object.entries(infoObjects)) {
    const o = obj as any;
    const isKeyRecord = (ioRefCount[id] ?? 0) >= 2 || RECORD_KEYWORDS.test(o.name ?? "");
    if (!isKeyRecord) continue;
    const cId = `concept_record_${id}`;
    if (!concepts[cId]) {
      concepts[cId] = {
        id: cId, name: o.name, type: "Record",
        definition: o.description ?? `Business record: ${o.name}`,
        lifecycleStates: [], relatedCapabilityIds: [],
        elementType: "Concept", relationships: [],
      };
    }
  }

  // Derive Resource concepts from DiscoveryIR tech (scaffold rarely has technologyApplications)
  if (ir?.tech?.length) {
    for (const t of ir.tech) {
      if (!t.name) continue;
      const tId = makeId("tech", t.name);
      const cId = `concept_resource_${tId}`;
      if (!concepts[cId]) {
        concepts[cId] = {
          id: cId, name: t.name, type: "Resource",
          definition: `Technology: ${t.name} (${t.type ?? "System"})`,
          lifecycleStates: [], relatedCapabilityIds: [],
          elementType: "Concept", relationships: [],
        };
      }
    }
  }
  // Also check scaffold technologyApplications (in case they exist)
  for (const key of ["technologyApplications", "technologyApps"]) {
    const techApps = scaffold.elements[key] ?? {};
    for (const [id, app] of Object.entries(techApps)) {
      const a = app as any;
      const cId = `concept_resource_${id}`;
      if (!concepts[cId]) {
        concepts[cId] = {
          id: cId, name: a.name, type: "Resource",
          definition: a.description ?? `Technology: ${a.name}`,
          lifecycleStates: [], relatedCapabilityIds: [],
          elementType: "Concept", relationships: [],
        };
      }
    }
  }

  // Build relationships from PPIT: Party --creates/uses--> Record, Party --uses--> Resource
  for (const act of Object.values(activities)) {
    const a = act as any;
    const ppit = a.capabilityPPIT;
    if (!ppit) continue;
    for (const decomp of Object.values(ppit) as any[]) {
      const roleIds = decomp?.roleIds ?? [];
      const infoIds = decomp?.informationObjectIds ?? [];
      const techIds = decomp?.technologyAppIds ?? [];
      for (const rId of roleIds) {
        const partyCId = `concept_party_${rId}`;
        if (!concepts[partyCId]) continue;
        const rels = concepts[partyCId].relationships as any[];
        // Party → Record relationships
        for (const iId of infoIds) {
          const recordCId = `concept_record_${iId}`;
          if (concepts[recordCId] && !rels.some((r: any) => r.targetId === recordCId)) {
            rels.push({ targetId: recordCId, type: "produces", label: "produces" });
          }
        }
        // Party → Resource relationships
        for (const tId of techIds) {
          const resCId = `concept_resource_${tId}`;
          if (concepts[resCId] && !rels.some((r: any) => r.targetId === resCId)) {
            rels.push({ targetId: resCId, type: "uses", label: "uses" });
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
  | "pass-c"           // PPIT enrichment (People/Process/Info/Tech per capability)
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

  // ── Pass C: PPIT Enrichment ────────────────────────────────────────────────
  onProgress({ status: "pass-c", discoveryIR, scaffold });
  const ppitResult = await runPassC(scaffold);
  if (!ppitResult.success) {
    console.warn("[pipeline] Pass C (PPIT) failed — continuing without PPIT:", ppitResult.error);
  }

  // Derive Capsicum Triad concepts (Party/Record/Resource) from scaffold registries
  // (runs after PPIT so concept relationships can use PPIT data)
  deriveConceptsFromScaffold(scaffold, discoveryIR);

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
