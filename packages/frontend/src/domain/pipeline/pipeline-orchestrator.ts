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
import { runCrossMappingEnrichment } from "./cross-mapping-enricher";
import type { GateResult } from "./scaffold-gates";
import { generateCards } from "./card-generator";
import type { CardRegistry } from "../../types/cards";
import { callLLM, DEFAULT_MODEL } from "./llm-client";
import { buildPass1Prompt } from "./prompts/pass-a1-value-streams";
import { buildPass2Prompt } from "./prompts/pass-a2-capability-mapping";
import { ScaffoldData, ScaffoldActivity, ScaffoldCapability, PPITEntry, getCapabilityIds } from "../../types";

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
function injectCapabilityHierarchy(scaffold: ScaffoldData, ir: DiscoveryIR): void {
  if (!scaffold?.elements?.capabilities || !ir.capabilityMap?.l1Areas?.length) return;

  const caps = scaffold.elements.capabilities as Record<string, ScaffoldCapability>;

  // Build lookup from capability name → existing cap id (case-insensitive)
  const nameToId: Record<string, string> = {};
  for (const [id, cap] of Object.entries(caps)) {
    if (cap.name) nameToId[cap.name.toLowerCase()] = id;
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
      level: 1,
    } as ScaffoldCapability;

    for (const l2 of l1.domains ?? []) {
      const l2Id = makeId("cap_l2", l2.name);
      caps[l2Id] = {
        id: l2Id, name: l2.name, elementType: "Capability",
        level: 2, parentId: l1Id,
      };
      l2Ids.push(l2Id);

      // Detect 4-level vs 3-level format
      if (l2.capabilityGroups?.length) {
        // 4-level: L2 > L3 capabilityGroups > L4 capabilities
        for (const l3 of l2.capabilityGroups) {
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
export function deriveConceptsFromScaffold(scaffold: ScaffoldData, ir?: DiscoveryIR): void {
  if (!scaffold?.elements) return;
  const concepts: Record<string, unknown> = (scaffold.elements.concepts ?? {}) as Record<string, unknown>;

  // Derive Party concepts from roles (internal stakeholders)
  const roles = scaffold.elements.roles ?? {};
  for (const [id, role] of Object.entries(roles)) {
    const r = role as unknown as { name?: string; description?: string };
    const cId = `concept_party_${id}`;
    if (!concepts[cId]) {
      concepts[cId] = {
        id: cId, name: r.name, type: "Party", subtype: "Role",
        definition: r.description ?? `Stakeholder role: ${r.name}`,
        lifecycleStates: [], relatedCapabilityIds: [],
        elementType: "Concept", relationships: [],
      };
    }
  }

  // Derive external Party concepts inferred from value stream names, record names,
  // and capability context (e.g. Customer, Supplier, Partner, Vendor, Patient, etc.)
  const EXTERNAL_PARTY_PATTERNS: Array<{ pattern: RegExp; name: string; defn: string }> = [
    { pattern: /customer|client|buyer|consumer|patron|diner|guest|shopper|member/i, name: "Customer", defn: "External party who receives products or services" },
    { pattern: /supplier|vendor|provider|wholesaler|distributor/i, name: "Supplier", defn: "External party who provides goods or materials" },
    { pattern: /partner|affiliate|franchisee/i, name: "Partner", defn: "External party in a business partnership" },
    { pattern: /patient/i, name: "Patient", defn: "External party receiving healthcare services" },
    { pattern: /student|learner|trainee/i, name: "Student", defn: "External party receiving educational services" },
    { pattern: /tenant|resident/i, name: "Tenant", defn: "External party occupying a property" },
  ];
  // Collect all text sources for external party inference
  const textSources: string[] = [];
  for (const io of Object.values(scaffold.elements.informationObjects ?? {})) textSources.push((io as unknown as { name?: string }).name ?? "");
  for (const act of Object.values(scaffold.elements.activities ?? {})) textSources.push((act as unknown as { name?: string }).name ?? "");
  for (const cap of Object.values(scaffold.elements.capabilities ?? {})) textSources.push((cap as unknown as { name?: string }).name ?? "");
  if (ir?.valueStreams?.length) for (const vs of ir.valueStreams) textSources.push(vs.name ?? "", vs.valueObject ?? "");
  const allText = textSources.join(" ");
  const seenExternalParties = new Set(
    Object.values(concepts).filter((c) => (c as Record<string, unknown>).type === "Party" && (c as Record<string, unknown>).subtype === "External").map((c) => ((c as Record<string, unknown>).name ?? "").toString().toLowerCase())
  );
  for (const ep of EXTERNAL_PARTY_PATTERNS) {
    if (ep.pattern.test(allText) && !seenExternalParties.has(ep.name.toLowerCase())) {
      // Check it's not already a role name
      const existingRole = Object.values(concepts).find((c) => (c as Record<string, unknown>).type === "Party" && ((c as Record<string, unknown>).name ?? "").toString().toLowerCase() === ep.name.toLowerCase());
      if (!existingRole) {
        const cId = `concept_party_ext_${makeId("ext", ep.name)}`;
        concepts[cId] = {
          id: cId, name: ep.name, type: "Party", subtype: "External",
          definition: ep.defn,
          lifecycleStates: [], relatedCapabilityIds: [],
          elementType: "Concept", relationships: [],
        };
        seenExternalParties.add(ep.name.toLowerCase());
      }
    }
  }

  // Derive Record concepts — SELECTIVE: only IOs referenced by 2+ activities (key business objects)
  // or those whose names suggest core records (Order, Invoice, Contract, Application, etc.)
  const infoObjects = scaffold.elements.informationObjects ?? {};
  const activities = scaffold.elements.activities ?? {};
  const ioRefCount: Record<string, number> = {};
  for (const act of Object.values(activities)) {
    const a = act as unknown as { informationObjectIds?: string[] };
    for (const ioId of a.informationObjectIds ?? []) {
      ioRefCount[ioId] = (ioRefCount[ioId] ?? 0) + 1;
    }
  }
  const RECORD_KEYWORDS = /order|invoice|contract|application|request|record|report|plan|schedule|profile|account|claim|ticket|brief|quote|specification|model/i;
  for (const [id, obj] of Object.entries(infoObjects)) {
    const o = obj as unknown as { name?: string; description?: string };
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

  // Derive Resource concepts — TWO sources:
  // 1. Technology systems (from DiscoveryIR.tech and scaffold technologyApplications)
  // 2. Product/physical resources inferred from value objects, capability businessObjects,
  //    and domain keywords (inventory, equipment, product, material, etc.)
  if (ir?.tech?.length) {
    for (const t of ir.tech) {
      if (!t.name) continue;
      const tId = makeId("tech", t.name);
      const cId = `concept_resource_${tId}`;
      if (!concepts[cId]) {
        concepts[cId] = {
          id: cId, name: t.name, type: "Resource", subtype: "System",
          definition: `Technology: ${t.name} (${t.type ?? "System"})`,
          lifecycleStates: [], relatedCapabilityIds: [],
          elementType: "Concept", relationships: [],
        };
      }
    }
  }
  for (const key of ["technologyApplications", "technologyApps"]) {
    const techApps = (scaffold.elements as Record<string, Record<string, unknown>>)[key] ?? {};
    for (const [id, app] of Object.entries(techApps)) {
      const a = app as unknown as { name?: string; description?: string };
      const cId = `concept_resource_${id}`;
      if (!concepts[cId]) {
        concepts[cId] = {
          id: cId, name: a.name, type: "Resource", subtype: "System",
          definition: a.description ?? `Technology: ${a.name}`,
          lifecycleStates: [], relatedCapabilityIds: [],
          elementType: "Concept", relationships: [],
        };
      }
    }
  }
  // Infer product/physical Resources from VS valueObjects and capability businessObjects
  const PRODUCT_KW = /product|service|equipment|material|part|component|device|unit|asset|property|vehicle|cartridge|filter|system|machine|tool|supply|good|item/i;
  const seenResourceNames = new Set(
    Object.values(concepts).filter((c) => (c as Record<string, unknown>).type === "Resource").map((c) => ((c as Record<string, unknown>).name ?? "").toString().toLowerCase())
  );
  // From VS valueObjects
  if (ir?.valueStreams?.length) {
    for (const vs of ir.valueStreams) {
      const vo = vs.valueObject;
      if (vo && PRODUCT_KW.test(vo) && !seenResourceNames.has(vo.toLowerCase())) {
        const cId = `concept_resource_${makeId("prod", vo)}`;
        if (!concepts[cId]) {
          concepts[cId] = {
            id: cId, name: vo, type: "Resource", subtype: "Product",
            definition: `Product/service delivered through ${vs.name}`,
            lifecycleStates: [], relatedCapabilityIds: [],
            elementType: "Concept", relationships: [],
          };
          seenResourceNames.add(vo.toLowerCase());
        }
      }
    }
  }
  // From capability businessObjects
  const caps = scaffold.elements.capabilities ?? {};
  for (const cap of Object.values(caps)) {
    const bo = (cap as unknown as { businessObject?: string }).businessObject;
    if (bo && PRODUCT_KW.test(bo) && !seenResourceNames.has(bo.toLowerCase())) {
      const cId = `concept_resource_${makeId("prod", bo)}`;
      if (!concepts[cId]) {
        concepts[cId] = {
          id: cId, name: bo, type: "Resource", subtype: "Product",
          definition: `Business resource: ${bo}`,
          lifecycleStates: [], relatedCapabilityIds: [],
          elementType: "Concept", relationships: [],
        };
        seenResourceNames.add(bo.toLowerCase());
      }
    }
  }

  // ── Build relationships ──────────────────────────────────────────────────
  // Rules:
  //   - Each Record gets exactly ONE subject (Party) and ONE object (Resource/Party)
  //   - Parties can relate to Parties, Resources, and Records
  //   - Resources can relate to Resources, Parties, and Records
  //   - Keep total relationship count low: prefer strongest single link per pair

  // First pass: find which parties interact with which records/resources via PPIT
  const partyToRecords: Record<string, Set<string>> = {};
  const partyToResources: Record<string, Set<string>> = {};
  for (const act of Object.values(activities)) {
    const a = act as unknown as ScaffoldActivity;
    const ppit = a.capabilityPPIT;
    if (!ppit) {
      // Fallback: use activity-level links
      const roleIds = a.performedByRoleIds ?? [];
      const infoIds = a.informationObjectIds ?? [];
      const techIds = (a as unknown as Record<string, unknown>).technologyAppIds as string[] | undefined ?? [];
      for (const rId of roleIds) {
        const pId = `concept_party_${rId}`;
        if (!concepts[pId]) continue;
        if (!partyToRecords[pId]) partyToRecords[pId] = new Set();
        if (!partyToResources[pId]) partyToResources[pId] = new Set();
        for (const iId of infoIds) {
          const rCId = `concept_record_${iId}`;
          if (concepts[rCId]) partyToRecords[pId].add(rCId);
        }
        for (const tId of techIds) {
          const resCId = `concept_resource_${tId}`;
          if (concepts[resCId]) partyToResources[pId].add(resCId);
        }
      }
      continue;
    }
    for (const decomp of Object.values(ppit)) {
      const d = decomp as PPITEntry;
      const roleIds = d.roleIds ?? [];
      const infoIds = d.informationObjectIds ?? [];
      const techIds = d.technologyAppIds ?? [];
      for (const rId of roleIds) {
        const pId = `concept_party_${rId}`;
        if (!concepts[pId]) continue;
        if (!partyToRecords[pId]) partyToRecords[pId] = new Set();
        if (!partyToResources[pId]) partyToResources[pId] = new Set();
        for (const iId of infoIds) {
          const rCId = `concept_record_${iId}`;
          if (concepts[rCId]) partyToRecords[pId].add(rCId);
        }
        for (const tId of techIds) {
          const resCId = `concept_resource_${tId}`;
          if (concepts[resCId]) partyToResources[pId].add(resCId);
        }
      }
    }
  }

  // Assign relationships: each Record gets 1 subject Party, 1 object Resource (if available)
  const recordSubject: Record<string, string> = {};  // recordId → partyId
  const recordObject: Record<string, string> = {};   // recordId → resourceId or partyId
  for (const [partyId, recordSet] of Object.entries(partyToRecords)) {
    for (const recId of recordSet) {
      if (!recordSubject[recId]) recordSubject[recId] = partyId;
    }
  }
  // Assign object: prefer a Resource linked via capability context or party; fall back to name heuristic
  const allResources = Object.keys(concepts).filter(id => (concepts[id] as any).type === "Resource");

  // Build capability→resource map from businessObject field on capabilities
  const capToResource: Record<string, string> = {};
  for (const [capId, cap] of Object.entries(caps)) {
    const bo = (cap as unknown as { businessObject?: string }).businessObject;
    if (!bo) continue;
    // Find the resource concept whose name matches this businessObject
    for (const resId of allResources) {
      const conceptName = (concepts[resId] as Record<string, unknown>)?.name ?? "";
      if ((conceptName as string).toLowerCase() === bo.toLowerCase()) {
        capToResource[capId] = resId;
        break;
      }
    }
  }

  // Build record→capabilities map: which capabilities does each IO appear in?
  const recordToCaps: Record<string, Set<string>> = {};
  for (const act of Object.values(activities)) {
    const a = act as unknown as ScaffoldActivity;
    const actCapIds: string[] = getCapabilityIds(a);
    const infoIds: string[] = a.informationObjectIds ?? [];
    for (const iId of infoIds) {
      const rCId = `concept_record_${iId}`;
      if (!concepts[rCId]) continue;
      if (!recordToCaps[rCId]) recordToCaps[rCId] = new Set();
      for (const cId of actCapIds) recordToCaps[rCId].add(cId);
    }
    // Also check capabilityPPIT for finer-grained links
    const ppit = a.capabilityPPIT;
    if (ppit) {
      for (const [cId, decomp] of Object.entries(ppit)) {
        const d = decomp as PPITEntry;
        for (const iId of d.informationObjectIds ?? []) {
          const rCId = `concept_record_${iId}`;
          if (!concepts[rCId]) continue;
          if (!recordToCaps[rCId]) recordToCaps[rCId] = new Set();
          recordToCaps[rCId].add(cId);
        }
      }
    }
  }

  // Collect all parties (including external) and all resources for semantic matching
  const allParties = Object.entries(concepts).filter(([, c]) => (c as Record<string, unknown>).type === "Party");

  for (const recId of Object.keys(concepts).filter(id => (concepts[id] as Record<string, unknown>).type === "Record")) {
    if (recordObject[recId]) continue; // already assigned
    const recName = ((concepts[recId] as Record<string, unknown>).name ?? "").toString().toLowerCase();

    // Strategy 1: semantic name matching — infer object from the record's name
    // "Customer Profile" → object is "Customer" (a Party)
    // "Customer Order" → object is "Food Item" (a Resource, via capability context)
    // "Loyalty Profile" → object is "Customer" (a Party)
    // "Dispatch Ticket" → object is the product being dispatched

    // 1a: Does the record name reference an external party? (profile/record of someone)
    const PARTY_RECORD_KW = /profile|record|account|membership|enrollment|registration|subscription/i;
    if (PARTY_RECORD_KW.test(recName)) {
      // Find the party whose name best matches the record name prefix
      // e.g. "Customer Profile" → look for a party called "Customer"
      let bestParty: string | null = null;
      let bestScore = 0;
      for (const [pId, p] of allParties) {
        const pName = ((p as Record<string, unknown>).name ?? "").toString().toLowerCase();
        if (recName.includes(pName) && pName.length > bestScore) {
          bestParty = pId;
          bestScore = pName.length;
        }
      }
      if (bestParty) {
        recordObject[recId] = bestParty;
        continue;
      }
    }

    // 1b: Does the record name reference a product/resource?
    // "Kitchen Order" → Food Item, "Dispatch Ticket" → Food Item
    const ORDER_KW = /order|ticket|invoice|receipt|shipment|delivery|dispatch/i;
    if (ORDER_KW.test(recName) && allResources.length > 0) {
      // Strategy 2: shared capability context — record and resource on same capability
      const recCaps = recordToCaps[recId];
      if (recCaps) {
        for (const cId of recCaps) {
          if (capToResource[cId]) {
            recordObject[recId] = capToResource[cId];
            break;
          }
        }
      }
      if (recordObject[recId]) continue;

      // Strategy 3: party→resource — the party that created the record also uses a resource
      const subjectParty = recordSubject[recId];
      const partyResources = subjectParty ? partyToResources[subjectParty] : undefined;
      if (partyResources?.size) {
        recordObject[recId] = [...partyResources][0];
        continue;
      }

      // Strategy 4: if there's a single Product resource, assign it to order-like records only
      const productResources = allResources.filter(id => (concepts[id] as Record<string, unknown>).subtype === "Product");
      if (productResources.length === 1) {
        recordObject[recId] = productResources[0];
        continue;
      }
    }

    // 1c: Fallback — try capability context for any remaining record
    if (!recordObject[recId]) {
      const recCaps = recordToCaps[recId];
      if (recCaps) {
        for (const cId of recCaps) {
          if (capToResource[cId]) {
            recordObject[recId] = capToResource[cId];
            break;
          }
        }
      }
    }
  }

  // Now wire the relationships
  for (const [recId, partyId] of Object.entries(recordSubject)) {
    const concept = concepts[partyId] as Record<string, unknown>;
    const rels = (concept?.relationships as Array<Record<string, unknown>>) ?? [];
    if (!rels.some((r) => r.targetId === recId)) {
      rels.push({ targetId: recId, type: "produces", label: "creates", cardinality: "1:N" });
    }
    concept.relationships = rels;
  }
  for (const [recId, objId] of Object.entries(recordObject)) {
    const concept = concepts[recId] as Record<string, unknown>;
    const rels = (concept?.relationships as Array<Record<string, unknown>>) ?? [];
    if (!rels.some((r) => r.targetId === objId)) {
      const objType = (concepts[objId] as Record<string, unknown>)?.type;
      const label = objType === "Party" ? "about" : "regarding";
      rels.push({ targetId: objId, type: label, label, cardinality: "N:1" });
    }
    concept.relationships = rels;
  }
  // Party → Resource (uses) — limit to max 2 per party
  for (const [partyId, resSet] of Object.entries(partyToResources)) {
    const concept = concepts[partyId] as Record<string, unknown>;
    const rels = (concept?.relationships as Array<Record<string, unknown>>) ?? [];
    let count = 0;
    for (const resId of resSet) {
      if (count >= 2) break;
      if (!rels.some((r) => r.targetId === resId)) {
        rels.push({ targetId: resId, type: "uses", label: "uses", cardinality: "N:N" });
        count++;
      }
    }
    concept.relationships = rels;
  }

  // Type assertion is safe because concepts follow ScaffoldConcept structure
  (scaffold.elements as Record<string, unknown>).concepts = concepts as unknown;
}

// ── Progress state fed back to the UI ────────────────────────────────────────

export type PipelineStatus =
  | "idle"
  | "pass-a1"          // extracting VS + stages
  | "pass-a2"          // extracting roles + caps + signals
  | "pass-a-done"      // DiscoveryIR ready — optional review point
  | "pass-b"           // formalising lean scaffold
  | "pass-b-repairing" // Gate 1 failed, attempting repair
  | "pass-b-failed"    // Gate 1 still failed after repair — surface to user
  | "done"             // lean scaffold delivered — user can browse immediately
  | "error"
  // Enrichment statuses (opt-in, run after scaffold is delivered)
  | "enriching-subactivities"   // Derive Activity Flows
  | "enriching-ppit"            // Map PPIT (legacy — now delegates to cross-mapping)
  | "enriching-cards"           // Generate Cards
  | "enriching-cross-mapping"   // Cross-mapping (includes PPIT compound)
  | "enrichment-done";          // enrichment step completed

export type EnrichmentStep = "subactivities" | "ppit" | "cards" | "cross-mapping";

/** Summarises the outcome of an enrichment step (passed to UI via progress callback) */
export interface EnrichmentOutcome {
  success: boolean;
  instanceCount: number;
  error?: string;
}

export interface PipelineProgress {
  status: PipelineStatus;
  discoveryIR?: DiscoveryIR;          // available after pass-a-done
  scaffold?: ScaffoldData;             // available after pass-b
  gate1?: GateResult;
  gate2?: GateResult;
  cardRegistry?: CardRegistry;        // available after done/enrichment
  bundle?: Record<string, unknown>;   // available after done
  errorMessage?: string;
  enrichmentStep?: EnrichmentStep;    // which enrichment just completed
  enrichmentOutcome?: EnrichmentOutcome; // result summary for the step
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
      model: DEFAULT_MODEL,
      max_tokens: 8000,
      temperature: 0,
      messages: [{ role: "user", content: buildPass1Prompt(transcript) }],
    });
    const raw = llmRes.text.replace(/`{3}json|`{3}/g, "").trim();
    try {
      pass1Result = JSON.parse(raw);
    } catch {
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
      model: DEFAULT_MODEL,
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

// ── Pass B: Lean scaffold generation — delivers immediately ─────────────────
// Post-Pass-B enrichments (sub-activities, PPIT, cards) are now opt-in steps
// triggered by the user from the enrichment wizard. This gives faster time-to-
// value: the user sees their structural model within seconds, then can choose
// to deepen it incrementally.

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

  // ── Post-Pass-B deterministic enrichment ────────────────────────────────────
  // Inject L1/L2/L3 capability hierarchy from DiscoveryIR (lost during Pass B flattening)
  injectCapabilityHierarchy(scaffold, discoveryIR);

  // Derive Capsicum Triad concepts (Party/Record/Resource) from scaffold registries
  // (runs without PPIT — relationships are basic; enriched after PPIT)
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

  // ── Deliver lean scaffold immediately ──────────────────────────────────────
  const now = new Date().toISOString();
  const bundle: Record<string, unknown> = {
    bundleVersion: "2.0",
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

// ── Opt-in enrichment steps ──────────────────────────────────────────────────
// Each step can be triggered independently from the Enrichment Wizard.
// They modify the scaffold in-place and are all non-fatal.

import { runSubActivityEnrichment } from "./subactivity-enricher";

export async function runEnrichmentStep(
  step: EnrichmentStep,
  scaffold: ScaffoldData,
  discoveryIR: DiscoveryIR | undefined,
  onProgress: ProgressCallback,
  /** Required for cross-mapping step — the mapping pairs to execute */
  mappingPairs?: import("../../store/enrichment-store").MappingPair[],
  /** Optional: only run VS-scoped mappings for these value stream IDs */
  vsFilter?: string[],
): Promise<void> {
  switch (step) {
    case "subactivities": {
      onProgress({ status: "enriching-subactivities", scaffold });
      const result = await runSubActivityEnrichment(scaffold);
      if (!result.success) {
        console.warn("[enrichment] Sub-activities failed:", result.error);
      }
      onProgress({ status: "enrichment-done", scaffold, enrichmentStep: "subactivities" });
      break;
    }
    case "ppit": {
      onProgress({ status: "enriching-ppit", scaffold });
      const result = await runPassC(scaffold);
      if (!result.success) {
        console.warn("[enrichment] PPIT failed:", result.error);
      }
      // Re-derive concepts with PPIT data now available
      if (discoveryIR) {
        deriveConceptsFromScaffold(scaffold, discoveryIR);
      }
      onProgress({ status: "enrichment-done", scaffold, enrichmentStep: "ppit" });
      break;
    }
    case "cards": {
      onProgress({ status: "enriching-cards", scaffold });
      let cardRegistry: CardRegistry | undefined;
      try {
        const cardResult = await generateCards(scaffold);
        if (cardResult.registry) {
          cardRegistry = cardResult.registry;
        } else {
          console.warn("[enrichment] Card generation returned no cards:", cardResult.error);
        }
      } catch (e) {
        console.warn("[enrichment] Card generation failed:", e);
      }
      onProgress({ status: "enrichment-done", scaffold, cardRegistry, enrichmentStep: "cards" });
      break;
    }
    case "cross-mapping": {
      if (!mappingPairs || mappingPairs.length === 0) {
        console.warn("[enrichment] cross-mapping called with no mapping pairs");
        onProgress({ status: "enrichment-done", scaffold, enrichmentStep: "cross-mapping" });
        break;
      }
      onProgress({ status: "enriching-cross-mapping", scaffold });
      const result = await runCrossMappingEnrichment(scaffold, mappingPairs, (msg) => {
        onProgress({ status: "enriching-cross-mapping", scaffold, errorMessage: msg });
      }, vsFilter);
      if (!result.success) {
        console.warn("[enrichment] Cross-mapping errors:", result.error);
      }
      console.log(`[enrichment] Cross-mapping complete: ${result.instanceCount} instances`);
      // Re-derive concepts if PPIT compound was included (it writes capabilityPPIT)
      const hasPPIT = mappingPairs.some((p) => p.relationshipTypeId === "ppit-decomposition");
      if (hasPPIT && discoveryIR) {
        deriveConceptsFromScaffold(scaffold, discoveryIR);
      }
      onProgress({
        status: "enrichment-done",
        scaffold,
        enrichmentStep: "cross-mapping",
        enrichmentOutcome: {
          success: result.success,
          instanceCount: result.instanceCount,
          error: result.error,
        },
      });
      break;
    }
  }
}
