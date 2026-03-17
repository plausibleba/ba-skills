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
// - Session 25: Aligned with BA Value Streams Skill — added Value Object,
//   Recipient, full stage structure (entry/exit criteria, stakeholders, value
//   items, metrics). Stage naming follows "state reached" convention.

export function buildPass1Prompt(transcript: string): string {
  return `You are a business architect defining Value Streams for a governance diagnostic.
A ValueStream is the end-to-end flow that delivers measurable stakeholder value — triggered by a defined need, ending at a verifiable outcome. Work at board level: structural flow of value, not process detail.

## Your Task
From the source material below, identify ALL Value Streams present. Do not cap the number — extract every distinct end-to-end flow the source describes.

## What a Value Stream Is (and Isn't)
- A Value Stream is triggered by a stakeholder need and ends with a delivered outcome to a recipient
- It is decomposed into stages (not steps), each with entry/exit criteria
- It is NOT an internal process, a capability, a technology workflow, or a task list

## Rules
- Each VS is a RECURRING operational flow that delivers value repeatedly — not a one-time project or strategic initiative. "Lead to Customer" and "Order to Delivery" are VS. "Technology Integration" and "Digital Transformation" are projects/initiatives — do NOT include them as VS.
- Each VS is outcome-driven, not function-driven ("Member Certification Lifecycle" not "Certification Team Activities")
- Each VS has a clear trigger event and a clear terminal outcome
- VS names are concise, 2-5 words, title case. Use "<Trigger> to <Outcome>" pattern where natural (e.g. "Lead to Customer", "Order to Delivery", "Issue to Resolution", "Hire to Productive"). Name from the recipient's perspective where possible.
- zone: "ecosystem" = externally-facing (customer, member, partner, market); "knowledge" = internally-facing (operations, reporting, governance)
- valueObject: the primary business object that flows through the stream and changes state at each stage (e.g. "Booking", "Order", "Claim", "Tenancy")
- recipient: who receives the value at the end (e.g. "Guest", "Customer", "Member")
- Stages: 4-8 per VS. Each stage = a governance phase or progression milestone, not a task. MECE — no gaps, no overlaps.
- Stage names describe the state the Value Object reaches, not activities performed. E.g. "Booking Confirmed", "Property Prepared", "Stay Completed" — NOT "Manage Booking" or "Send Confirmation Email".
- Each stage must have entryCriteria (what must be true to enter) and exitCriteria (what must be true to leave — the value created).
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
      "valueObject": "Certification",
      "recipient": "Candidate",
      "trigger": "Candidate submits certification application",
      "terminalOutcome": "Credential issued and maintained in good standing",
      "stakeholder": "Candidate, Employer",
      "confidence": "high|medium|low",
      "stages": [
        {
          "name": "Application Received",
          "entryCriteria": "Candidate submits complete application",
          "exitCriteria": "Application validated and registered in system",
          "stakeholders": ["Candidate", "Registrar"],
          "valueItem": "Validated application",
          "metrics": [
            { "name": "Application Processing Time", "current": "", "target": "", "evidenced": false }
          ],
          "confidence": "high"
        }
      ]
    }
  ]
}

Source material:
${transcript}`;
}
