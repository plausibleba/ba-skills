# /capability-map

Produce a Business Capability Map from any input — transcript, charter, existing spreadsheet,
industry reference model, or a verbal description. Guided two-checkpoint elicitation with MECE
validation.

> **Tip:** If you want the full business architecture stack (Capability Map + Concept Model +
> Value Stream) delivered as a single bundle, use `/plausibleba` instead.

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
2. **ba-capability-mapping** — runs the guided elicitation:
   - Establishes context and identifies core business objects
   - Drafts L1/L2 hierarchy → **Checkpoint 1** (waits for your confirmation)
   - Derives L3 capabilities with MECE validation → **Checkpoint 2** (waits for your confirmation)
   - Renders interactive treemap (primary deliverable)
   - Offers XLSX and JSON exports on request

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

- Interactive treemap (inline, rendered after Checkpoint 2)
- `[organisation]_capability_map.xlsx` — Capability Register, Validation Summary, Legend (on request)
- `[organisation]_capability_map.json` — VCC pipeline format (on request)
