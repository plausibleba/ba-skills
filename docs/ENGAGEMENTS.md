# Customer Engagement Status

One section per active engagement. Read this alongside CURRENT-STATE.md at the start of any client-facing session.

---

## IIBA — International Institute of Business Analysis

**Status:** Active — SME validation session tomorrow (5 Mar 2026)
**Contact:** TBC
**Via:** Direct

**What we have:**
- Full scaffold: 6 VS, 28 stages, 70 capabilities, 233 atomic activities
- Two-layer Network View: Ecosystem (4 VS) / Knowledge (2 VS)
- No heatmap — friction assessment not yet run

**Engagement stage:** Structural validation
- SMEs reviewing VS names, stage sequencing, capabilities, roles, metrics
- No friction or solutions work yet — scaffold was built from scratch, not from discovery notes

**Tomorrow's session goal:**
- Walk SMEs through Network View and Stage View
- Validate: are these the right stages? Right capabilities? Right roles and metrics?
- Capture any corrections as notes — apply after session

**Known gaps:**
- No discovery transcript or issue log to anchor Pass 3 friction assessment
- Need a **Friction Elicitation Entry Point** for this type of engagement (SME workshop → structured pain input → Pass 3). Not needed tomorrow, flagged for future build.

**Next steps after tomorrow:**
- Incorporate SME feedback into scaffold
- Run friction elicitation workshop to generate Pass 3 input
- Run Pass 3 + Pass 4 once friction input is available

---

## Puretec Water Filtration

**Status:** Active — Daniel Roach (Salesforce pre-sales) testing production app
**Contact:** Daniel Roach
**Via:** Direct (Daniel is Terry's son)

**What we have:**
- Scaffold: 4 VS, 13 stages (2 fully built, 2 stubs)
- Heatmaps: Channel Sales Execution + Customer Maintenance
- Binding constraints identified on both streams
- Pass 4 enrichment working — Salesforce Agentforce solutions + customer stories

**Engagement stage:** Tool validation / presales prep
- Daniel testing the full four-pass pipeline end-to-end
- QuickStart guide sent (`VCC_QuickStart_Daniel.docx`)

**Known issues in scaffold:**
- Info objects not generated on VS elements (Pass 2 gap — affects all discovery-generated scaffolds)
- Single capability per activity (scaffold builder constraint — Pass 2 / generateIR fix needed)

**Next steps:**
- Daniel feedback from first full run
- Fix info objects + multi-capability issues
- Build 2–3 fictitious demo datasets for Daniel to use with prospects (non-Salesforce industries)
- Customer story filtering by industry/size

---

## Volvo (via Cordial)

**Status:** Upcoming — session tomorrow (5 Mar 2026)
**Contact:** TBC
**Via:** Cordial (partner)

**What we have:**
- Nothing yet — no scaffold, no discovery notes

**Engagement stage:** TBC — need to clarify:
- [ ] Is this a first discovery session or a pre-prepared demo?
- [ ] Who is in the room — Volvo IT, operations, sales leadership, dealer network?
- [ ] Which Volvo division — trucks, cars, financial services, dealer operations?
- [ ] Is Cordial a Salesforce partner? What's their angle?
- [ ] What pain area if any has been surfaced pre-session?

**Options for tomorrow depending on answers:**
- **Live discovery**: run intake during/after session, generate scaffold on the day
- **Pre-built demo**: build a fictitious Volvo-adjacent scaffold tonight as a conversation starter
- **Observation only**: Terry attends, takes notes, builds scaffold after

**Next steps:**
- Terry to brief Claude on Volvo context before session
- Decide: pre-build or live discovery?

---

## Notes on Engagement Patterns

| Engagement Stage | VCC Entry Point | Pass 3 Input |
|-----------------|-----------------|--------------|
| Pre-discovery demo | Fictitious scaffold | Not applicable |
| Live discovery | Discovery Intake (transcript) | Auto from Pass 2 |
| Post-discovery | Discovery Intake (notes) | Auto from Pass 2 |
| SME validation | Pre-built scaffold (file load) | Friction elicitation workshop *(not yet built)* |
| Quarterly review | Load previous bundle | Re-run or load previous assessment |
