# PlausibleBA Foundation — Governance Charter Outline

**Working draft for the Founding Agreement**

| | |
|---|---|
| **Filed** | 2026-05-08 |
| **Drafted by** | Terry Roach, with input from VCC SPAR review (DEC-122) |
| **For review by** | Asif Gill (Founding Research Director, UTS); legal counsel; accountant |
| **Status** | Working draft — not for external distribution until reviewed |

---

## Purpose

This document outlines the governance principles that should be committed to in the Founding Agreement of the PlausibleBA Foundation, before any formal partnership commitments to IIBA, the Business Architecture Guild, or Anthropic at the Foundation level, and before any external announcement of the open-source platform.

The principles below are constitutional, not operational. They are the commitments that give the Foundation the structural independence required to be credible as a multi-stakeholder steward of an open-source platform, while preserving the co-founders' protected authority over ontology integrity and intellectual direction. Operational rules (Foundation staffing, billing cycles, marketplace operations) come later, after legal entity formation.

The Foundation is the governing entity for the open-core PlausibleBA platform. The two co-founders' commercial interests — the proprietary VCC scaffold engine and entitlements specification engine — sit outside the Foundation, in a Layer-4 commercial plugin ecosystem that the Foundation operates but does not control on a content basis. The structural separation between Foundation governance and co-founder commercial returns is the credibility-bearing claim of the entire strategy.

## Reference Pattern

The Apptio / Technology Business Management Council model is the explicit reference case. Three structural commitments made that model durable:

The TBM Taxonomy was governed by a Council standards committee whose fifteen voting members were drawn from independent enterprises (MasterCard, ExxonMobil, Northrop Grumman, Cisco, and others). Apptio held a *non-voting* seat alongside other industry advisors (KPMG, ISG). The Council's nonprofit structure was structurally independent of Apptio's commercial entity. When Apptio was acquired — first by Vista Equity Partners in 2018, then by IBM in 2023 — the Council remained intact through both transactions.

The principles below adapt that pattern for PlausibleBA's situation: a smaller founding circle, a richer ontology (formal metamodel rather than management taxonomy), two co-founders rather than one corporate sponsor, and two anchoring associations.

---

## Critical Principles (For the Founding Agreement)

### 1. Founding-Period / Steady-State Governance Distinction

The Founding Agreement names a defined founding period — provisionally **three years from incorporation, or until the Foundation reaches a defined annual revenue threshold (specific number to be set with legal and accounting advice), whichever comes first**.

During the founding period, the co-founders hold their named roles: Terry Roach as Stakeholder Council Chair and Constitutional Guardian of the ontology; Asif Gill as Deputy Chair and Founding Research Director. After the founding period ends, the Stakeholder Council Chair rotates among non-co-founder seats by a defined process. The Constitutional Guardian role may remain with Terry but is reviewed annually by the full Council.

*Rationale.* This signals from day one that the Foundation is built to outlast its founders. Apptio's TBM Council professionalised over time; PlausibleBA should be designed for that arc from incorporation rather than retrofitted later.

### 2. Co-Founder Voting Bloc Defusal

The currently described Stakeholder Council composition gives the co-founders two seats of five. If both consistently vote together, that is a structurally significant bloc. Two commitments neutralise this:

**(a) A third independent seat on the Council.** Either a second elected community representative, a second association-partner seat for a future-onboarded standards body, or an independent academic appointee distinct from UTS. This raises the Council to six seats and drops the co-founder share to two of six.

**(b) Mandatory recusal rules.** Either or both co-founders must recuse from any Council vote in which they have a direct or indirect commercial interest. This includes certification of plugins they have built, marketplace promotion of those plugins, licensing terms that affect plugin revenue, and pricing structures that affect their personal revenue. The same recusal discipline applies to every Council member in their respective domains.

*Rationale.* Demonstrates that the Foundation governs platform interests, not founder interests. The recusal rule is the harder political commitment but it is the one a sceptical IIBA, Guild, or Anthropic representative will explicitly look for.

### 3. Acquisition-Protection Charter Clauses

If either co-founder's commercial entity is acquired by a third party, the Foundation must remain structurally independent. The Founding Agreement should commit to the following clauses:

- **`@context` URL ownership.** The Foundation owns the namespace `https://capsicum.plausibleba.org/ns/` and all sub-paths. This ownership cannot transfer with any acquisition of either co-founder's commercial entity.
- **Certification regime control.** The certification process for plugins (including the co-founders' reference plugins) cannot be reweighted, accelerated, or restructured by an acquiring entity. Any change to certification criteria requires a supermajority of the full Stakeholder Council, with the affected co-founder recused.
- **Stakeholder Council composition stability.** Council composition cannot be amended within 18 months following any acquisition without unanimous consent of the non-acquired parties.
- **Community representative seat protection.** Permanent and non-removable. The election process is administered by the Foundation operations staff under Council oversight, not by any party with a commercial interest in the outcome.
- **Association partner seat protection.** IIBA and Guild seats are similarly permanent and cannot be diluted by acquisition-driven governance changes.

*Rationale.* Apptio's sequential ownership changes (Vista 2018, IBM 2023) created exactly the "complications" the SPAR review identified. The protections need to be in the founding constitution, not retrofitted under acquisition pressure when the founders' negotiating leverage is at its lowest.

---

## Important Principles (For the Platform Launch Charter)

These do not need to be in the Founding Agreement itself but should be drafted before the Layer-1 open core ships publicly.

### 4. Certification Regime Structural Independence

The plugin certification committee is structurally separate from Foundation operations. Composition:

- One Foundation operations representative (non-voting; coordinates the process).
- At least one external advisor drawn from a recognised certification body or an academic institution distinct from UTS, to avoid affiliation concentration.
- One association representative (IIBA or Guild, on rotation).

Certification criteria are published, objective, and amendable only by full Stakeholder Council vote with any party having a commercial interest recused. The co-founders' reference plugins go through this same process with no special treatment, no expedited review, and no preferential pricing.

### 5. Plugin Marketplace Neutrality

The Foundation cannot promote any single plugin — including the co-founders' reference plugins — above others on the basis of relationship. Specifically:

- Featuring, promotion, deprecation, dependency-declaration, and conflict-of-interest disclosure rules are charter-level, not operational discretion.
- Featured-plugin selection criteria are published and objective.
- Conflict-of-interest declarations are mandatory at certification time and visible in every marketplace listing.

*Rationale.* The worst-case ecosystem scenario the SPAR review identified is that the founders' plugins are acquired, the acquirer reduces investment, and the open core remains technically valid but commercially inert because the founders' plugins were doing all the activation work. Marketplace neutrality is what lets the open core survive that scenario — it preserves a level field for third-party plugins to fill the gap.

---

## Useful Principles (For Operational Maturity)

These can wait until after the founding period begins operating.

### 6. Technical Architecture Board

A board distinct from the Stakeholder Council, governing the ontology, the `@context`, the metamodel, and the SHACL shape library. Composition:

- Architect (Terry) chairs as Constitutional Guardian.
- Research Director (Asif) as the academic voice.
- One external technical advisor (e.g., a working RDF/SHACL practitioner from outside the founding circle).
- One Stakeholder Council appointee.

The Council appoints; the architect chairs but does not hold a unilateral casting vote. Decisions require board majority. The architect's Constitutional Guardian role gives a protected voice on metamodel-conformance and architectural-integrity questions but does not override a clear board majority.

### 7. `@context` Release Process Governance

Versioning, release, and deprecation of the published CAPSICUM JSON-LD `@context` go through the Technical Architecture Board, not the architect alone. Old `@context` URLs remain dereferenceable forever. Breaking semantic changes require a new context IRI; backward-compatible additions are released under the same IRI with a version increment.

---

## Open Questions for Legal and Accounting Advice

These need to be resolved before the Founding Agreement is signed.

1. **Legal form.** Nonprofit entity, company limited by guarantee, or another structure. Must support: contracting party for licensing agreements, billing entity for revenue collection and distribution, multi-stakeholder governance, ownership of platform IP, durability beyond co-founder involvement.
2. **Jurisdiction.** Australia (UTS-aligned), US (Anthropic-aligned), or other. Affects certification regime recognition, IP ownership treatment, cross-border revenue distribution, and tax treatment of Stakeholder Council compensation if any.
3. **Founding-period revenue threshold.** Specific annual figure that triggers transition from founding-period governance to steady-state governance.
4. **Recusal enforcement.** Mechanism by which recusal rules are administered, who validates compliance, and what the remedy is for breach (governance breach, not just disclosure breach).
5. **Stakeholder Council compensation.** Whether seats are compensated, and if so, how — kept structurally independent of co-founder commercial interests.
6. **IP contribution mechanics.** How the platform core IP is contributed to the Foundation by the co-founders, with appropriate acknowledgement of the prior CAPSICUM theoretical foundation, and what reversion rights (if any) exist.

---

## Next Steps

1. Review and refine with Asif Gill (UTS Research Director, Foundation co-founder).
2. Engage a technology lawyer with nonprofit and multi-stakeholder governance experience to translate these principles into draft Founding Agreement clauses.
3. Engage an accountant to advise on entity structure, revenue distribution mechanics, and tax treatment.
4. Brief IIBA and Guild representatives on the proposed governance structure once the Founding Agreement is in solid draft form, before formal partnership conversations begin at the Foundation level.
5. Anthropic conversations stay on the IIBA / Guild track (Claude Partner Network certification) until the Foundation has legal form and a signed Founding Agreement; the Foundation only becomes a counterparty to Anthropic once the open-source platform launch is imminent.

---

*This outline draws on the Apptio / TBM Council reference case (per `PlausibleBA Open-Source Strategy v2.1`, §6) and on the four-reviewer SPAR review of DEC-122 (Reviewer 4, OSS-Strategy Sceptic). It supersedes the v2.0 strategy doc's §4 Foundation governance description in spirit but does not replace it formally — that revision happens once the Founding Agreement is drafted with legal counsel.*
