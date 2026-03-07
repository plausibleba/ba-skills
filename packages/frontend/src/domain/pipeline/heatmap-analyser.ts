// ─── Heatmap Analyser — Pass C ───────────────────────────────────────────────
// Consumes the sealed ScaffoldModel only. Null binding constraint is valid.
// Runs full scaffold+heatmap validation after generation.

import type { DiscoveryIR } from "./discovery-ir";

export interface HeatmapResult {
  heatmaps: any[];
  error?: string;
}

function buildPainPointSummary(ir: DiscoveryIR): string {
  const points = ir.painPoints.filter((p) => p.description);
  if (points.length === 0) return "No pain points recorded — derive observations from scaffold structure and domain heuristics (INFERRED or ASSUMED basis, intensity ≤ 5 for ASSUMED).";
  return points
    .map((p, i) =>
      `${i + 1}. [${p.category || "unclassified"}] ${p.description} (intensity ${p.intensity ?? 7}/10, stage: ${p.affectedStage || "unknown"})${p.binding ? " ← flagged as binding" : ""}`
    )
    .join("\n");
}

// Strip scaffold to activity skeleton — reduces token load (D-040)
function buildScaffoldSkeleton(scaffold: any): any {
  return {
    scaffoldId: scaffold.scaffoldId,
    name: scaffold.name,
    elements: {
      valueStreams: Object.fromEntries(
        Object.entries(scaffold.elements?.valueStreams ?? {}).map(([vsId, vs]: [string, any]) => [
          vsId,
          { name: vs.name, activityIds: vs.activityIds ?? [] },
        ])
      ),
      activities: Object.fromEntries(
        Object.entries(scaffold.elements?.activities ?? {}).map(([actId, act]: [string, any]) => [
          actId,
          {
            name: act.name,
            preOutcomeId: act.preOutcomeId,
            postOutcomeId: act.postOutcomeId,
            nextActivityId: act.nextActivityId,
          },
        ])
      ),
    },
  };
}

function buildHeatmapPrompt(ir: DiscoveryIR, scaffold: any, now: string): string {
  const skeleton = buildScaffoldSkeleton(scaffold);
  const ppSummary = buildPainPointSummary(ir);

  return `You are generating friction observations and a binding constraint assessment for a VCC governance diagnostic.

The scaffold below represents a validated structural model. Every anchorId you reference MUST exist in the scaffold JSON.

## Friction Taxonomy
- ProcessHandoffFriction — work stalls between stages, handoff rework
- TechnologyIntegrationFriction — systems don't interoperate, automation gaps
- DataSignalFriction — information fragmented, decision latency
- DecisionAuthorityFriction — decision rights ambiguous, approval concentration
- GovernanceRiskFriction — control layering, compliance gates multiply
- IncentiveCapacityFriction — performance measures distort behaviour, capacity limits

## Evidence Basis Rules
- EVIDENCED: directly stated in source material
- INFERRED: derived from scaffold structure — requires structuralPattern
- ASSUMED: domain heuristic only — intensity MUST NOT exceed 5

## Binding Constraint Scoring
Score each candidate on: observationFrequency (0-3), authorityCentralisation (0-3), downstreamDependency (0-3), controlLayering (0-3), capacityConstraint (0-3). Total 0-15.
Eligibility: downstreamDependency MUST score ≥ 2. If no candidate qualifies, return null for bindingConstraint.
confidence = totalScore / 15.

Return ONLY valid JSON, no markdown fences:
{
  "heatmaps": [
    {
      "valueStreamId": "vs-id-from-scaffold",
      "observations": [
        {
          "observationId": "fr_001_snake_case_description",
          "category": "DataSignalFriction",
          "evidenceBasis": "EVIDENCED|INFERRED|ASSUMED",
          "primaryAnchor": { "anchorType": "Activity", "anchorId": "act-id-from-scaffold" },
          "contributingAnchors": [],
          "intensity": { "scale": "0-10", "score": 8.0 },
          "rationale": "Specific rationale citing scaffold elements or source evidence",
          "evidence": [],
          "observedAt": "${now}"
        }
      ],
      "bindingConstraint": null
    }
  ]
}

If a binding constraint IS identified:
"bindingConstraint": {
  "findingId": "bc_001",
  "bindingAnchor": { "anchorType": "Activity", "anchorId": "act-id-from-scaffold" },
  "bindingAnchorObservationId": "fr_001_snake_case_description",
  "justification": "Structural reasoning for binding constraint selection",
  "constraintScoring": {
    "candidates": [
      {
        "anchorId": "act-id",
        "eligible": true,
        "scores": { "observationFrequency": 2, "authorityCentralisation": 2, "downstreamDependency": 2, "controlLayering": 1, "capacityConstraint": 1 },
        "totalScore": 8
      }
    ],
    "selectedAnchorId": "act-id",
    "selectionRationale": "Highest score among eligible candidates"
  },
  "confidence": 0.53,
  "observedAt": "${now}"
}

## Discovery Signal (pain points from extraction)
${ppSummary}

## Scaffold JSON
${JSON.stringify(skeleton, null, 2)}`;
}

export async function runPassC(
  ir: DiscoveryIR,
  scaffold: any,
  apiUrl: string
): Promise<HeatmapResult> {
  const now = new Date().toISOString();
  const scaffoldId = scaffold.scaffoldId ?? `scaffold-unknown`;
  const heatmapPrompt = buildHeatmapPrompt(ir, scaffold, now);

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        temperature: 0,
        messages: [{ role: "user", content: heatmapPrompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === "text")?.text ?? "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());

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
