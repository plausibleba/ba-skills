# /capability-map

Produce a Business Capability Map from any input — transcript, charter, existing spreadsheet,
industry reference model, or a verbal description. Guided two-checkpoint elicitation with MECE
validation. Output: inline preview + downloadable XLSX + optional JSON for VCC pipeline.

## Usage

```
/capability-map
/capability-map [brief description of the business or initiative]
```

Attach any supporting files (transcript, charter, existing Excel model) before or after
invoking the command.

## What this command does

Chains the following skills in sequence:

1. **ba-taxonomy-standard** — loads PlausibleBA naming, numbering, and formatting conventions
2. **ba-capability-mapping** — runs the full guided elicitation:
   - Establishes context and identifies core business objects
   - Drafts L1/L2 hierarchy → **Checkpoint 1** (waits for your confirmation)
   - Derives L3 capabilities with MECE validation → **Checkpoint 2** (waits for your confirmation)
   - Produces XLSX register (pre-sorted by Number) + JSON for VCC pipeline
   - Offers next-step suggestions: Concept Model and Value Streams

## Examples

```
/capability-map
[attach: discovery_call_transcript.docx]

/capability-map Puretec Water Filtration — manufactures and services residential
and commercial water filtration systems through a dealer network

/capability-map
[attach: existing_capability_model.xlsx]
Validate this against PlausibleBA standards and restructure to L1/L2/L3 hierarchy
```

## Output

- Inline Checkpoint 1 preview (L1/L2 hierarchy table for your review)
- Inline Checkpoint 2 preview (full L1/L2/L3 map for your review)
- `[organisation]_capability_map.xlsx` — Capability Register, Validation Summary, Legend
- `[organisation]_capability_map.json` — VCC pipeline format (on request)

## Next steps offered after completion

- `/concept-model` — taxonomy of business objects; cross-validates capability coverage
- `/value-stream` — orchestrates capabilities into staged value delivery; validates coverage
  and surfaces unused capabilities
