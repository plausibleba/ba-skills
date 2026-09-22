---
name: ba-opmodel-context
description: >
  Use this skill before any discovery, workshop or model build, when a business analyst or
  architect needs a complete, sourced overview of a business operation assembled from what can
  be read about it — annual reports, regulator and industry material, statistics agencies,
  trade press, the organisation's own published documents, and whatever the customer has
  handed over. Trigger on phrases like: "what do we know about this business before we start",
  "prepare a context document", "operating model context", "pre-discovery brief", "desk
  research on the customer", "build the picture from public information", "what would their
  industry standard say", or when someone has a folder of downloaded PDFs about an organisation
  and wants it turned into something the customer can correct. The skill produces a Context
  Document every line of which says where it came from, and a Discovery transcript rendered
  from it. Load ba-taxonomy-standard alongside this skill.
---

# BA OpModel-Context Skill

## Purpose

Produce a Context Document: the written account of a business operation assembled from public
and supplied sources, before any of it is turned into a model. It is written to be put in front
of the customer and corrected, and every line in it says where it came from and how sure we are.

It sits before the other PlausibleBA skills:

```
OpModel-Context   — what can be known about the operation before anyone is asked (this skill)
    ↓  validated by the customer
Capability Map    — what the organisation can do
Concept Model     — what the organisation manages
Value Stream      — how the organisation delivers value
    ↓
Discovery / Import Model — the scaffold
```

Two things it is not. It is not a scaffold: it proposes candidates for the three skills above
and for Discovery, it does not decide them. And it is not a pitch document: it is honest about
what is inferred, what is assumed and what is not known, because the customer's correction of
it is the point.

---

## The rule

**Nothing is written without an evidence mark and a source.** Every factual line carries one of
three marks:

| Mark | Meaning | Example |
|---|---|---|
| **EVIDENCED** | A named source says it | "OTP above 81% for the year to June — Annual Report FY26, CEO's message" |
| **INFERRED** | A reasonable reading of sources, stated as a reading | "Turnaround coordination sits with the station rather than the operations centre — inferred from role titles on the careers site" |
| **ASSUMED** | Industry-typical, not yet found for this organisation | "Delay causes are coded to IATA AHM 730 — assumed; standard practice, not confirmed here" |

A line that cannot be marked is not written. Where two sources disagree, both lines are kept
and the disagreement goes in §12.

Something a person said is EVIDENCED as a statement, never as a fact about the organisation's
records: write who said it, when, and where the statement lives ("named by a station manager on
9 September in an illustrative model built from her experience — not a customer record"). The
customer's own words are the strongest material in the document, which is exactly why their
provenance has to be stated precisely.

Public facts that are sore — litigation, penalties, fatalities, industrial disputes — are
included, marked, and flagged "handle with care in the room". They are never left out to be
polite; the customer knows them and will notice the omission. A standard says what an operation *should* do; only a source
about this organisation says what it *does*, so standard-derived lines stay ASSUMED until a
source about the organisation upgrades them.

Supplied documents (anything the customer or an insider gave you) are marked as supplied in the
source register and their content is never presented as public. If the document will be shown
to the customer as "what we built this from", §0 must be readable by them without objection.

---

## Input Handling

| Input | What to take from it |
|---|---|
| Annual report, investor presentation | Structure and segments, leadership and portfolios, scale numbers with dates, stated strategy and targets, scorecard measures, named programs, risks the board lists |
| Constitution, board and committee charters, governance statement | Internal governance instruments, delegation at the level disclosed, risk oversight structure |
| Regulator publications, legislation, standards outlines | External controls; the industry's own names for disciplines, stages and objects |
| Statistics agency data | Public performance numbers with the standard definitions behind them |
| Trade press (last 18 months) | Announced programs, executive statements, incidents, technology partners named |
| Careers pages, team pages, site lists | Role titles and sites as the organisation names them — usually the most precise public source for roles |
| Supplied documents (org chart, portfolio, model, procedures) | Whatever they settle — replacing INFERRED and ASSUMED lines, marked as supplied |
| An existing PlausibleBA model or bundle | What is already modelled, and which buckets are empty |

Read every source once for the register (§0) before reading any for content. If input is
sparse, say so in §13 rather than filling gaps with assumptions dressed as findings.

---

## The document — fourteen sections

Each section names the door in the PlausibleBA app that it feeds. Section templates are in
`templates/context-document.md`.

| # | Section | Holds | Feeds |
|---|---|---|---|
| 0 | Source register | Every document used: what, date, public or supplied, what it gave, confidence | The engagement record; the first page shown to the customer |
| 1 | Organisation frame | What the business is and does, for whom; group structure and the segment in scope; scale with dates; sponsor; the posture sentence a board would recognise | Discovery §1 · workshop context `businessSnapshot`, `operatingPosture` |
| 2 | Operating landscape | Sites, fleet or plant, network, seasonality; the ecosystem — outsourced functions, regulators, infrastructure providers, standards bodies | Discovery §1 · PPIT ecosystem roles |
| 3 | Structure and roles | Divisions to the depth known; the division in scope; operational roles at the level the work is done; who holds which decision | Discovery §3 · Enrich PPIT (roles) |
| 4 | The value stream inventory | EVERY end-to-end flow of the operation in scope — not a sample — each with trigger, outcome, value object, recipient and stages named as states reached with entry and exit, anchored to a standard where one names the stages; one may be worked deeper than the rest | Discovery §2 · `/value-stream` |
| 5 | The complete capability map | L1 from the industry standard's disciplines, L2 and the leaf capabilities beneath them, complete for the operation in scope (a hundred or two for a division is normal); the organisation's own names where public documents give them; a note that the customer's map replaces this | `/capability-map` · Import Model |
| 6 | Concept model | The business objects that move through the streams in the industry's vocabulary; the ones the customer calls something else | `/concept-model` · Enrich PPIT (information) |
| 7 | Technology and data landscape | Systems named in public record and what they do; data exchange standards the industry uses; what is not known | Discovery §4 · PPIT technology axis |
| 8 | Governance instruments | External: legislation, regulator rules, standards and audits. Internal: constitution, charters, published policies. Each with what it constrains and at which stage | Enrich Policies · Discovery controls |
| 9 | Directives and pressures | What the board and executive have said they want, in their words, with the source | Discovery directives |
| 10 | Metrics and public performance | The numbers the operation is measured on, published values and trend, the standard definitions | Discovery §6 |
| 11 | Friction signals | Where the operation is known to hurt: regulator and ombudsman findings, published incident material, trade press, anything the customer has said — each with who said it and where it lives | Enrich Friction |
| 12 | Known unknowns | What could not be established, each paired with the document that would settle it, in the order they matter | The validation conversation |
| 13 | Readiness | The Discovery readiness weights applied to §§1–11 — Company and industry 10 · Value streams with stages 35 · Roles 10 · Technology 10 · Pain points 25 · Metrics 10 — and a plain verdict: Rich, Adequate or Thin, and where | The decision to run Discovery now or gather first |

Sections 4, 5 and 6 are complete inventories, not samples: the customer corrects a whole picture,
and a reader who runs the operation will look first for the stream or capability that is missing.
The three sibling skills then produce the structured bundle from the corrected sections; do not run
them from inside this skill.

Author §§4–6 once as structured data (a small typed module or JSON: streams with stages, the
capability tree, roles, records) and render both the document's tables and any model file from it.
The first run learnt this the hard way: a hand-written §4 and a separately built model drift within
a day. One source, two renderings.

---

## Method

Six steps, in order. Do not skip Frame or Anchor; they are what make the document correctable.

### Step 1 — Gather

Public first. In this order, because it is the order of return per hour: annual report and
investor materials; governance statement, constitution, charters; the regulator's publications
about this kind of operation; the industry body's standards for the function in scope (outlines
and tables of contents — the manuals are usually paid, say so); the statistics agency; the
careers and team pages; trade press for the last eighteen months. Then the supplied documents,
kept separate and marked.

Every item lands in §0 with its date before it is read for content.

Gathering splits cleanly into three research passes that can run in parallel, and the first
run showed each returns a different kind of line: (a) the regulatory and infrastructure frame —
legislation, the regulator, the ANSP and airports, the statistics agency, the consumer body;
(b) the organisation's own public record — filings, leadership, careers pages, trade press,
incidents, complaints; (c) the industry standards' published outlines. Ask each pass for one
line per fact with a URL and a mark, and a list of what it looked for and could not find — the
could-not-find list is the first draft of §12.

### Step 2 — Frame

Write §1 and §2 first and settle the scope: which division, which sites, which flows. A Context
Document for a whole group is too thin to correct; one for a division is the unit. State the
scope in one sentence at the top of the document. It is the first thing the customer corrects.

### Step 3 — Anchor

Find the industry standard that already names the disciplines, stages and objects for the
function in scope. `references/industry-standards.md` holds the table, one row per sector, and
grows by one row each time a sector is done for real. Where a standard exists, use its names in
§§4–6 and cite it; where the organisation's public documents use different names, record both.
The customer then argues with their own industry's names rather than with ours.

### Step 4 — Extract

Fill §§3–11 from the sources, one claim per line, each with its mark and source. Keep the
organisation's own words where the source gives them — a scorecard measure, a stated target, a
program name — and quote them. Do not smooth a contradiction; list it in §12.

### Step 5 — Question and score

Write §12 as questions, each paired with the document that would answer it and what it would
replace in the model. Order them by how much they would change. Then score §13 against the
readiness weights and say plainly whether the input is Rich, Adequate or Thin. Provisional
bands, to be corrected as runs accumulate: below 41 is Thin (the app's Discovery door will not
generate a scaffold below 41); 41 to 85 is Adequate; above 85 is Rich. A public-only input
scoring Rich is not believable; do not inflate it. The first real run, from 24 public sources
on a large listed company, scored 75.5 — thin on roles and technology, which is where public
record always runs out.

### Step 6 — Checkpoint, then render

Present the scope line, §0 and §12 inline and ask:

> *"This is what could be established from [N] public sources and [M] supplied documents. The
> scope is [one sentence]. Before I render the document — is the scope right, and is there
> anything in the source register you would not want shown to the customer?"*

Then render two files. Rendering rules are in `templates/discovery-transcript.md`.

| File | For | Notes |
|---|---|---|
| `CONTEXT-<org>-<date>.md` | The customer and the room | The whole document, readable top to bottom, marks visible on every line |
| `discovery-transcript.md` | Elaborate → Discovery in the PlausibleBA app | §§1–4, 7, 9–11 rewritten in the analytical voice the Discovery prompts accept (structured rows are first-class evidence); marks preserved so the pipeline can carry evidence basis |

A third rendering, the workshop-context seed, is deliberately not produced by this version:
its stage ids come from a scaffold that does not exist yet, and it would be completed by hand.
Say so if asked.

---

## Quality bars

- Every factual line marked and sourced. Read the finished document once looking only for
  unmarked claims.
- §0 readable by the customer without objection when the document is to be shown as input.
- The scope sentence at the top, and the document scoped to a division or function, not a group.
- §§4–6 cite the standard they were anchored to, and say where the organisation's names differ.
- §12 ordered by how much each answer would change the model, not by how easy it is to ask.
- §13 scored against the weights and stated plainly. Thin is a legitimate result.
- The organisation's own words quoted where the source gives them; nothing paraphrased into
  our vocabulary that the customer would not recognise.
- Plain prose. The test for any sentence is whether you would say it aloud to the person it is
  for.

## Common failure modes

- Writing what the industry standard says an operation does as if this organisation does it.
  The mark for that line is ASSUMED, and it stays ASSUMED until a source upgrades it.
- Presenting a supplied document's content as public, or presenting something an insider said
  as something the organisation's systems hold. Say where the observation lives.
- Scoping to the group because the annual report is about the group. Frame first.
- Inflating readiness to justify running Discovery. The whole point of scoring before Discovery
  is to know how thin the input is.
- Running the sibling skills from inside this one. This skill proposes; they produce, after the
  customer has corrected the proposal.

---

## Next steps offered after rendering

1. Send `CONTEXT-<org>-<date>.md` to the customer for correction; record corrections in §0 as
   supplied material.
2. Load `discovery-transcript.md` at Elaborate → Discovery to build the scaffold — before or
   after correction depending on what the model is for (a demonstration of what public input
   produces runs it before).
3. `/capability-map`, `/concept-model`, `/value-stream` on the corrected §§4–6 for the
   structured bundle.
4. Ask for the documents in §12, in the order listed.

---

*Part of the PlausibleBA Skills Library | www.plausibleba.com | First run: Qantas Airport
Operations, 22 September 2026 — four corrections came out of it: statements are evidenced as
statements, sore facts stay in, the three parallel research passes, and §§4–6 are complete
inventories authored once as data and rendered into the document and the model.*
