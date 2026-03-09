// ─── Pass A1: Value Stream Extraction ─────────────────────────────────────────
// Input:  Raw transcript/notes from discovery session
// Output: VS definitions with stages, zones, triggers, terminal outcomes
//
// This is the first LLM call in the pipeline. It works at board level —
// identifying structural flows of value, not process detail.
//
// DECISION LOG:
// - D-075: VS naming uses "<Trigger> to <Outcome>" pattern
// - Session 16: Added initiative-vs-VS exclusion rules
// - Session 17: Extracted to standalone prompt file

export function buildPass1Prompt(transcript: string): string {
  return `You are a business architect defining Value Streams for a governance diagnostic.
A ValueStream is the end-to-end flow that delivers measurable stakeholder value — triggered by a defined need, ending at a verifiable outcome. Work at board level: structural flow of value, not process detail.

## Your Task
From the source material below, identify ALL Value Streams present. Do not cap the number — extract every distinct end-to-end flow the source describes.

## Rules
- Each VS is a RECURRING operational flow that delivers value repeatedly — not a one-time project or strategic initiative. "Lead to Customer" and "Order to Delivery" are VS. "Technology Integration" and "Digital Transformation" are projects/initiatives — do NOT include them as VS.
- Each VS is outcome-driven, not function-driven ("Member Certification Lifecycle" not "Certification Team Activities")
- Each VS has a clear trigger event and a clear terminal outcome
- VS names are concise, 2-5 words, title case. Use "<Trigger> to <Outcome>" pattern where natural (e.g. "Lead to Customer", "Order to Delivery", "Issue to Resolution", "Hire to Productive").
- zone: "ecosystem" = externally-facing (customer, member, partner, market); "knowledge" = internally-facing (operations, reporting, governance)
- Stages: 4-8 per VS. Each stage = a governance phase or progression milestone, not a task. MECE — no gaps, no overlaps.
- If the source contains tab names, sheet names, section headings, or column groupings that map to distinct end-to-end flows — each one is likely a separate VS. Extract them all.

Return ONLY valid JSON, no markdown fences:
{
  "org": {
    "name": "",
    "industry": "",
    "companySize": "",
    "description": "",
    "stakeholder": "",
    "confidence": "high|medium|low"
  },
  "valueStreams": [
    {
      "id": 1,
      "name": "Member Certification Lifecycle",
      "description": "End-to-end flow from application through credential maintenance",
      "zone": "ecosystem",
      "trigger": "Candidate submits certification application",
      "terminalOutcome": "Credential issued and maintained in good standing",
      "stakeholder": "Candidate, Employer",
      "confidence": "high|medium|low",
      "stages": [
        { "name": "Application Processing", "confidence": "high" },
        { "name": "Exam Preparation", "confidence": "high" }
      ]
    }
  ]
}

Source material:
${transcript}`;
}
