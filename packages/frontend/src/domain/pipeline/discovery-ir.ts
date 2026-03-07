// ─── Discovery IR — Pass A output artefact ────────────────────────────────
// Produced by two internal LLM calls (A1: VS+stages, A2: roles+caps+signals).
// This is the committed discovery basis for formalisation.
// Discovery is generative — determinism is NOT required here.

export interface DiscoveryVS {
  vsId: string;
  name: string;
  description: string;
  zone: "ecosystem" | "knowledge";
  trigger?: string;
  terminalOutcome?: string;
  stakeholder?: string;
  stages: string[];
  extractedCapabilities: Array<{ id: string; name: string; description: string }>;
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
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function makeId(prefix: string, name: string): string {
  return `${prefix}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

// Build the DiscoveryIR from raw extraction form state
// (used by the orchestrator to persist after Pass A2 completes)
export function buildDiscoveryIR(
  pass1Result: any,
  pass2Result: any,
  confirmedVS: any[]
): DiscoveryIR {
  const now = new Date().toISOString();

  const valueStreams: DiscoveryVS[] = confirmedVS.map((vs1: any, i: number) => {
    const capEntry =
      (pass2Result.capabilitiesByVS ?? []).find((c: any) => c.vsName === vs1.name) ??
      (pass2Result.capabilitiesByVS ?? [])[i];
    return {
      vsId: makeId("vs", vs1.name),
      name: vs1.name,
      description: vs1.description ?? "",
      zone: vs1.zone ?? "ecosystem",
      trigger: vs1.trigger,
      terminalOutcome: vs1.terminalOutcome,
      stakeholder: vs1.stakeholder ?? pass1Result.org?.stakeholder ?? "",
      stages: (vs1.stages ?? []).map((s: any) => s.name ?? s),
      extractedCapabilities: (capEntry?.capabilities ?? []).map((c: any) => ({
        id: c.id ?? makeId("cap", c.name),
        name: c.name,
        description: c.description ?? `Ability to ${c.name.toLowerCase()}`,
      })),
    };
  });

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
  };
}
