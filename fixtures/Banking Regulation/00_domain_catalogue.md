# Prudential Supervision Domain — ValueStream Catalogue

## Domain Definition

**Domain:** Prudential Supervision of Financial Institutions
**Purpose:** Provides structured assurance to depositors, policyholders, and the financial system that regulated institutions operate in a safe and sound manner, through risk-based examination, assessment, and graduated supervisory response.
**Source Regulators:** APRA (Australia), NY Fed (United States), OSFI (Canada), MAS (Singapore)

---

## ValueStream Network

```
                    ┌──────────────────────────┐
                    │  VS-01: Supervisory       │
                    │  Planning &               │
                    │  Prioritisation            │
                    └─────────┬────────────────┘
                              │ cycle plan + resource allocation
                              ▼
         ┌────────────────────────────────────────────┐
         │                                            │
         ▼                                            ▼
┌─────────────────────┐                 ┌──────────────────────────┐
│ VS-02: Supervisory   │                │ VS-03: Supervisory        │
│ Intelligence &       │                │ Examination               │
│ Analysis             │                │                           │
│ (off-site)           │                │ (on-site)                 │
└────────┬────────────┘                 └─────────┬────────────────┘
         │ findings + risk signals                │ findings + ratings input
         │                                        │
         └──────────────┬─────────────────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │  VS-04: Risk         │◄──────── THE HUB
              │  Assessment &        │
              │  Response            │
              └──┬───────┬───────┬──┘
                 │       │       │
        ┌────────┘       │       └────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌───────────────────┐
│ VS-05:        │ │ VS-06:        │ │ VS-07: Regulatory  │
│ Supervisory   │ │ Enforcement & │ │ Approvals &        │
│ Engagement    │ │ Remediation   │ │ Interpretations    │
│               │ │               │ │                    │
│ (relationship)│ │ (corrective)  │ │ (entity requests)  │
└──────────────┘ └──────────────┘ └───────────────────┘
                        │
                        │ all processes feed back
                        ▼
              ┌──────────────────────┐
              │  VS-08: Governance,  │
              │  Reporting &         │
              │  Escalation          │
              │  (cross-cutting)     │
              └──────────────────────┘
```

---

## ValueStream Definitions

### VS-01: Supervisory Planning & Prioritisation

**Description:** Determines which institutions receive what level of supervisory attention in a given cycle, based on risk profile, systemic importance, and available resources. Produces the supervisory plan that drives resource allocation across all other value streams.

**Trigger:** Annual/semi-annual planning cycle initiation OR significant risk event requiring reallocation
**Terminal Outcome:** Approved supervisory plan with institution-level priorities and resource commitments

**Cross-regulator patterns:**
- APRA: SOARS stance determines baseline activity levels per entity
- NY Fed: LISCC designation drives dedicated teams for systemically important firms; portfolio approach for community/regional banks
- OSFI: Risk-tiered supervisory intensity framework
- MAS: Risk-based supervision framework (CRAFT — Common Risk Assessment Framework and Techniques)

**Key flows:**
- Receives from: VS-04 (current risk ratings), VS-08 (governance directives)
- Sends to: VS-02, VS-03, VS-05 (activity mandates and schedules)

---

### VS-02: Supervisory Intelligence & Analysis

**Description:** Ongoing off-site surveillance and analysis of regulated institutions using financial returns, market data, exception reports, and external intelligence. Produces risk signals and analytical findings that feed the risk assessment hub.

**Trigger:** Quarterly return submission OR market event OR threshold breach in exception reporting
**Terminal Outcome:** Quarterly Risk Assessment completed, risk signals communicated to RA&R

**Cross-regulator patterns:**
- APRA: Quarterly Risk Review (QRR) — exception-based analysis of financial returns, threshold monitoring
- NY Fed: Off-site monitoring and financial analysis, horizontal surveillance across portfolios
- OSFI: Ongoing monitoring through financial data analysis and early warning indicators
- MAS: Off-site review and analysis of prudential returns

**Key flows:**
- Receives from: VS-01 (monitoring priorities), regulated entities (financial returns, submissions)
- Sends to: VS-04 (findings, risk signals, exception flags)

---

### VS-03: Supervisory Examination

**Description:** Targeted, intensive assessment of a regulated institution through on-site review, document inspection, and structured engagement with institution personnel. Produces examination findings and ratings input.

**Trigger:** Scheduled examination per supervisory plan OR risk-triggered targeted review
**Terminal Outcome:** Examination report completed with findings, recommendations, and required actions

**Cross-regulator patterns:**
- APRA: Prudential Review — multi-day on-site workshop examining specific risk themes
- NY Fed: On-site examinations (full scope or targeted), CCAR/stress testing horizontal reviews
- OSFI: On-site supervisory reviews and targeted examinations
- MAS: On-site inspections and thematic reviews

**Key flows:**
- Receives from: VS-01 (examination schedule), VS-04 (scope informed by current risk assessment)
- Sends to: VS-04 (findings and ratings input), regulated entities (examination report and required actions)

---

### VS-04: Risk Assessment & Response ← DEEP DIVE TARGET

**Description:** The central hub of all supervisory activities. Maintains and updates the risk model for each regulated entity, consolidates findings from all supervisory activities, determines risk ratings, and selects the appropriate supervisory response stance. All other value streams feed into and are driven by RA&R.

**Trigger:** New findings from any supervisory activity OR scheduled risk model review OR material change in entity circumstances
**Terminal Outcome:** Updated risk ratings and supervisory response stance confirmed, Supervisory Action Plan approved

**Cross-regulator patterns:**
- APRA: PAIRS (Probability and Impact Rating System) → SOARS (Supervisory Oversight and Response System) → SAP (Supervisory Action Plan)
- NY Fed: Risk assessment consolidated through supervisory teams → CAMELS/RFI ratings → supervisory programme adjustments
- OSFI: Composite risk rating → intervention stage determination → supervisory letter
- MAS: CRAFT assessment → risk rating → supervisory action

**Key flows:**
- Receives from: VS-02 (off-site findings), VS-03 (examination findings), VS-06 (remediation status), VS-07 (approval outcomes)
- Sends to: VS-01 (updated ratings for next cycle planning), VS-05 (engagement triggers), VS-06 (enforcement triggers), VS-08 (escalation triggers)

---

### VS-05: Supervisory Engagement

**Description:** Formal senior-level relationship management between the regulator and regulated institution. Focuses on communicating supervisory concerns, building mutual understanding, and ensuring institution boards understand regulatory expectations. Distinct from examination (investigative) and enforcement (corrective).

**Trigger:** Scheduled engagement per supervisory plan OR risk-triggered senior communication
**Terminal Outcome:** Engagement assessment completed, observations communicated to institution

**Cross-regulator patterns:**
- APRA: Prudential Consultation — formal meeting with entity senior management/board
- NY Fed: Supervisory meetings with boards of directors, MOU discussions
- OSFI: Supervisory letters and staged intervention meetings
- MAS: Supervisory engagement and dialogue with senior management

**Key flows:**
- Receives from: VS-04 (engagement triggers and briefing context)
- Sends to: VS-04 (observations and entity commitments)

---

### VS-06: Enforcement & Remediation

**Description:** Formal corrective measures applied when supervisory concerns are not adequately addressed through engagement, or when regulatory violations require direct action. Ranges from informal commitments through formal enforcement orders to sanctions and penalties.

**Trigger:** Supervisory response determination requiring formal action OR regulatory violation detected
**Terminal Outcome:** Enforcement action resolved — entity compliant or escalated to resolution

**Cross-regulator patterns:**
- APRA: SOARS escalation (Oversight → Mandated Improvement → Restructure), formal directions, licence conditions
- NY Fed: Matters Requiring Attention (MRA), Matters Requiring Immediate Attention (MRIA), consent orders, cease and desist orders
- OSFI: Staged intervention (Early Warning → Risk to Financial Viability → Future Financial Viability in Serious Doubt → Non-Viability)
- MAS: Supervisory actions ranging from moral suasion through directions to revocation

**Key flows:**
- Receives from: VS-04 (enforcement triggers), VS-08 (governance authorisation for formal actions)
- Sends to: VS-04 (remediation status updates), VS-08 (enforcement reporting)

---

### VS-07: Regulatory Approvals & Interpretations

**Description:** Processing of formal requests from regulated entities requiring regulatory decision — including applications for approval of corporate actions, requests for legislative interpretation, and waivers or exemptions from prudential requirements.

**Trigger:** Entity submission of request for approval or interpretation
**Terminal Outcome:** Formal decision communicated to entity with any conditions or instruments

**Cross-regulator patterns:**
- APRA: Approvals and Interpretations — entity requests processed through Supervisory Support Division, may require Treasury involvement
- NY Fed: Applications for mergers, acquisitions, changes in control; regulatory interpretations
- OSFI: Regulatory approvals for transactions, ownership changes, new activities
- MAS: Licensing approvals, exemption requests, corporate action approvals

**Key flows:**
- Receives from: Regulated entities (applications), VS-04 (risk context for decision-making)
- Sends to: VS-04 (approval outcomes that may affect risk profile), regulated entities (formal decision)

---

### VS-08: Governance, Reporting & Escalation

**Description:** Cross-cutting governance layer that ensures quality, consistency, and appropriate authority across all supervisory activities. Includes the review and approval workflow, management reporting, escalation procedures, and delegation authority frameworks.

**Trigger:** Any supervisory artifact requiring review/approval OR reporting cycle OR escalation threshold
**Terminal Outcome:** Governance action completed (approved, escalated, or reported)

**Cross-regulator patterns:**
- APRA: Review and Approval process — delegation authorities from Treasury, bundled review/approval requests, escalation procedures
- NY Fed: LISCC governance structure, System-wide committees, three lines of defence (business line, risk management, internal audit)
- OSFI: Internal governance and quality assurance frameworks
- MAS: Internal governance committees and escalation protocols

**Key flows:**
- Receives from: All value streams (artifacts for review/approval, escalation triggers, reporting data)
- Sends to: All value streams (governance decisions, approved artifacts), external stakeholders (published reports)

---

## Future Direction

### ValueStream Network View
An introductory visualisation showing flows between all 8 ValueStreams as the entry point to deeper dives. This would be the "board-level" view before drilling into any specific ValueStream scaffold.

### Deep Dive Sequence
1. **VS-04: Risk Assessment & Response** ← CURRENT
2. VS-03: Supervisory Examination (highest interaction with RA&R)
3. VS-01: Supervisory Planning & Prioritisation (drives the whole cycle)
4. Others as engagement demand requires
