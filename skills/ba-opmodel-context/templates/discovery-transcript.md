# Rendering the Discovery transcript from a Context Document

The PlausibleBA app's Discovery door accepts a pre-synthesised analytical document as source
material: structured rows, tables and headed sections are first-class evidence and do not need
narrative phrasing. `discovery-transcript.md` is the Context Document rewritten for that reader.

## What goes in

| Discovery form section | From Context Document |
|---|---|
| 1 Organisation | §1 (name, industry, size, description, the single accountable stakeholder) |
| 2 Value streams and their stages | §4 — every candidate stream with its stages, entry and exit criteria, value object, recipient, trigger and terminal outcome |
| 3 Roles | §3 role table |
| 4 Technology | §7 systems and standards |
| 5 Pain points | §11, each with a category and the stage it touches |
| 6 Metrics | §10 |
| Controls and directives (Pass A3) | §8 and §9 |

Leave out §0, §5, §6, §12 and §13. The register, the reference map and the concept model are for
the sibling skills and the customer; the unknowns and the score are for the person deciding
whether to run Discovery.

## Rules

- Keep the evidence mark on every line, in brackets after the claim, so Pass A3 can carry
  `evidenceBasis` where it has a field for it and the person reading the scaffold can see what
  was inferred.
- Keep the organisation's own names where the Context Document recorded them beside the
  standard's; put the organisation's name first.
- One stakeholder in §1: the single accountable person or title, not a list.
- Stage names as states reached ("Recovery Plan Activated"), never activities ("Activate the
  plan").
- Pain points carry one of the app's six friction categories — ProcessHandoffFriction,
  TechnologyIntegrationFriction, DataSignalFriction, DecisionAuthorityFriction,
  GovernanceRiskFriction, IncentiveCapacityFriction — and the stage they touch.
- Write plainly. No sentence the customer would not recognise as about them.

## Header

```
# <Organisation> — <Division> — Discovery source
Rendered from CONTEXT-<org>-<date>.md on <date>. Public sources only unless a line says
supplied. Marks: EVIDENCED / INFERRED / ASSUMED.
```
