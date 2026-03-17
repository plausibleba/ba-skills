// ─── Discovery IR — Pass A output artefact ────────────────────────────────
// Produced by two internal LLM calls (A1: VS+stages, A2: roles+caps+signals).
// This is the committed discovery basis for formalisation.
// Discovery is generative — determinism is NOT required here.

// Full VSS structure — all five properties per stage (VCC_PROMPT_DEFINITIONS.md §2)
export interface DiscoveryStageMetric {
  name: string;
  current?: string;
  target?: string;
  evidenced: boolean; // false = inferred/plausible, not from source
}

export interface DiscoveryStage {
  name: string;
  entryCriteria?: string;
  exitCriteria?: string;
  stakeholders?: string[];
  valueItem?: string;         // concrete output produced by this stage
  metrics?: DiscoveryStageMetric[];
}

// Scoped Capability Map — L1 → L2 → L3 taxonomy (VCC_PROMPT_DEFINITIONS.md §3)
export interface DiscoveryCapabilityL3 {
  name: string;               // Verb-Noun, e.g. "Manage Trade Partner Orders"
  number?: string;            // Taxonomy position e.g. "1.2.3"
  businessObject: string;     // core object e.g. "Orders"
  description?: string;
  stabilisationNote?: string; // ⚑ flagged inconsistencies for architect review
}

export interface DiscoveryCapabilityL2 {
  name: string;               // Business Domain e.g. "Order Management"
  number?: string;            // Taxonomy position e.g. "1.2"
  capabilities: DiscoveryCapabilityL3[];
}

export interface DiscoveryCapabilityL1 {
  name: string;               // Business Area e.g. "Channel & Partner Management"
  number?: string;            // Taxonomy position e.g. "1"
  type?: "Execution" | "Governance";  // L1 classification
  domains: DiscoveryCapabilityL2[];
}

export interface DiscoveryCapabilityMap {
  l1Areas: DiscoveryCapabilityL1[];
}

// Stage-to-capability assignments — references L3 names from the map
export interface DiscoveryStageCapabilities {
  vsName: string;
  stages: Array<{
    stageName: string;
    capabilityNames: string[];  // must match L3 names in capabilityMap
  }>;
}

export interface DiscoveryVS {
  vsId: string;
  name: string;
  description: string;
  zone: "ecosystem" | "knowledge";
  valueObject?: string;       // primary business object flowing through the stream
  recipient?: string;         // who receives value at stream end
  trigger?: string;
  terminalOutcome?: string;
  stakeholder?: string;
  stages: DiscoveryStage[];   // enriched — was string[]
}

export interface DiscoveryRole {
  id: string;
  name: string;
  description: string;
}

export interface DiscoveryTech {
  id: string;
  name: string;
  type: string;
}

export interface DiscoveryPainPoint {
  id: string;
  description: string;
  category?: string;
  intensity?: number;
  affectedStage?: string;
  binding?: boolean;
}

export interface DiscoveryMetric {
  id: string;
  name: string;
  current?: string;
  target?: string;
}

export interface DiscoveryGap {
  severity: "required" | "recommended";
  prompt: string;
}

export interface DiscoveryOrg {
  name: string;
  industry?: string;
  size?: string;
  stakeholder?: string;
}

// The committed discovery artefact — persisted after Pass A completes
export interface DiscoveryIR {
  extractedAt: string;
  org: DiscoveryOrg;
  valueStreams: DiscoveryVS[];
  roles: DiscoveryRole[];
  tech: DiscoveryTech[];
  painPoints: DiscoveryPainPoint[];
  metrics: DiscoveryMetric[];
  gaps: DiscoveryGap[];
  capabilityMap: DiscoveryCapabilityMap;           // scoped L1/L2/L3 taxonomy
  stageCapabilities: DiscoveryStageCapabilities[]; // stage → L3 capability assignments
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function makeId(prefix: string, name: string): string {
  return `${prefix}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

// Build the DiscoveryIR from raw extraction results
// pass1Result: A1 output (VS + stages with full VSS structure)
// pass2Result: A2 output (roles, capabilityMap, stageCapabilities, tech, painPoints, metrics, gaps)
export function buildDiscoveryIR(
  pass1Result: any,
  pass2Result: any,
  confirmedVS: any[]
): DiscoveryIR {
  const now = new Date().toISOString();

  const valueStreams: DiscoveryVS[] = confirmedVS.map((vs1: any) => ({
    vsId: makeId("vs", vs1.name),
    name: vs1.name,
    description: vs1.description ?? "",
    zone: vs1.zone ?? "ecosystem",
    valueObject: vs1.valueObject,
    recipient: vs1.recipient,
    trigger: vs1.trigger,
    terminalOutcome: vs1.terminalOutcome,
    stakeholder: vs1.stakeholder ?? pass1Result.org?.stakeholder ?? "",
    // Preserve full VSS structure from A1
    stages: (vs1.stages ?? []).map((s: any) => {
      // A1 now returns objects with all five VSS properties
      // Graceful fallback: if A1 returned plain strings (old format), wrap them
      if (typeof s === "string") return { name: s };
      return {
        name: s.name ?? s,
        entryCriteria: s.entryCriteria,
        exitCriteria: s.exitCriteria,
        stakeholders: s.stakeholders ?? [],
        valueItem: s.valueItem,
        metrics: (s.metrics ?? []).map((m: any) => ({
          name: m.name,
          current: m.current ?? null,
          target: m.target ?? null,
          evidenced: m.evidenced ?? false,
        })),
      };
    }),
  }));

  // Capability map — L1/L2/L3 structure from A2 (aligned with BA Capability Mapping Skill)
  // Graceful fallback: if A2 returned old capabilitiesByVS format, build minimal map
  const capabilityMap: DiscoveryCapabilityMap = pass2Result.capabilityMap
    ? {
        l1Areas: (pass2Result.capabilityMap.l1Areas ?? []).map((l1: any) => ({
          name: l1.name,
          number: l1.number,
          type: l1.type,
          domains: (l1.domains ?? []).map((l2: any) => ({
            name: l2.name,
            number: l2.number,
            capabilities: (l2.capabilities ?? []).map((cap: any) => ({
              name: cap.name,
              number: cap.number,
              businessObject: cap.businessObject ?? "",
              description: cap.description ?? "",
            })),
          })),
        })),
      }
    : {
        l1Areas: (pass2Result.capabilitiesByVS ?? []).map((entry: any) => ({
          name: "Extracted Capabilities",
          domains: [{
            name: entry.vsName ?? "General",
            capabilities: (entry.capabilities ?? []).map((c: any) => ({
              name: c.name,
              businessObject: "",
              description: c.description ?? "",
            })),
          }],
        })),
      };

  // Stage capability assignments — new structure from A2
  const stageCapabilities: DiscoveryStageCapabilities[] =
    pass2Result.stageCapabilities ?? [];

  return {
    extractedAt: now,
    org: { ...pass1Result.org },
    valueStreams,
    roles: (pass2Result.roles ?? []).map((r: any, i: number) => ({
      id: r.id ?? String(Date.now() + i),
      name: r.name,
      description: r.description ?? "",
    })),
    tech: (pass2Result.tech ?? []).map((t: any) => ({
      id: makeId("tech", t.name),
      name: t.name,
      type: t.type ?? "Other",
    })),
    painPoints: (pass2Result.painPoints ?? []).map((p: any, i: number) => ({
      id: `pp_${String(i + 1).padStart(3, "0")}`,
      description: p.description,
      category: p.category,
      intensity: p.intensity,
      affectedStage: p.affectedStage,
      binding: p.binding,
    })),
    metrics: (pass2Result.metrics ?? []).map((m: any) => ({
      id: makeId("metric", m.name),
      name: m.name,
      current: m.current,
      target: m.target,
    })),
    gaps: pass2Result.gaps ?? [],
    capabilityMap,
    stageCapabilities,
  };
}
