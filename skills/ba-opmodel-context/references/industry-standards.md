# Industry standards to anchor a Context Document

One row per sector, added when a sector has been done for real. Each row names the standard that
already supplies the disciplines (capability L1/L2), the stages, the objects and the controls for
the function in scope, so the customer argues with their own industry's names rather than ours.

Manuals from industry bodies are usually paid publications. Work from their published outlines,
tables of contents, regulator summaries and secondary material, and say so in §0.

Lines derived from a standard are ASSUMED until a source about the organisation upgrades them.

## Airline — ground and airport operations (first used: Qantas, September 2026)

| Layer of the document | Standard | What it supplies |
|---|---|---|
| §5 capabilities, L1 | IATA IOSA Standards Manual (Edition 18 current) — eight sections: ORG Organisation and Management, FLT Flight Operations, DSP Operational Control and Flight Dispatch, MNT Aircraft Engineering and Maintenance, CAB Cabin Operations, GRH Ground Handling Operations, CGO Cargo Operations, SEC Security Management | The disciplines every IOSA-registered airline is audited against |
| §5 capabilities, L2; §4 activities | IATA Ground Operations Manual (IGOM; 14th edition in force for 2026, 15th published for 2027) — six chapters: passenger handling, baggage handling, aircraft safety and servicing on the ramp, aircraft turnaround (arrival, doors, departure, towing), load control, airside safety oversight. IATA Airport Handling Manual (AHM), the policy side of the same pair: AHM 810 Standard Ground Handling Agreement, AHM 730 delay codes. ISAGO audits ground service providers against them | The activity vocabulary of the ramp and the handler's contractual obligations |
| §4 stages of a turnaround stream | Airport Collaborative Decision Making (A-CDM), Eurocontrol's milestone approach — TOBT target off-block, TSAT target start-up approval, TTOT target take-off, AOBT actual off-block, ATOT actual take-off. In Australia implemented by Airservices with the major airports, airlines and ground handlers; staged rollout planned Brisbane and Perth Q2 2025, Sydney Q3 2025, Melbourne Q4 2025 | Stage boundaries the airport, the ANSP, the handler and the airline already share; KPIs already measured (TOBT accuracy, taxi-out time) |
| §6 concepts | IATA Airline Industry Data Model (AIDM) and the messages generated from it — AIDX for flight and airport data exchange; Type B MVT and LDM movement and load messages; Resolution 753 for baggage tracking. For cargo, IATA ONE Record (open JSON-LD/OWL ontology, MIT-licensed, github.com/IATA-Cargo/ONE-Record): Shipment, Piece, Waybill, Transport Movement. For the airport side of the boundary, ACI ACRIS (the airport community's semantic model for flight, facility and operational data) | The industry's names for Flight, Leg, Aircraft, Turnaround, Slot, Delay Code, Bag, Load, Shipment, Stand |
| §4 stages of a cargo stream | Cargo iQ Master Operating Plan (v3.4, public PDF) — the shipment milestones forwarders and carriers measure against: FWB, FOH, RCS, FOW, FFM, DEP, ARR, RCF, AWR, NFD, DLV and the rest | Stage boundaries for accepted-to-delivered that the cargo industry already timestamps |
| §8 controls (Australia) | ICAO Annex 19 (safety management); CASA CASR Parts 119 (AOC), 121 (large aeroplane air transport), 42 (continuing airworthiness), 145 (maintenance organisations), 139 (aerodromes); CAO 48.1 (fatigue, FRMS); Sydney Airport Curfew Act 1995 (23:00–06:00) and Sydney Airport Demand Management Act 1997 (80 movements an hour, slot compliance) with the 2024 reforms (recovery periods after disruption); Aviation Customer Rights Charter and Aviation Consumer Ombuds Scheme (legislation expected 2026) | Crew legality, airworthiness, curfew, slot and passenger-entitlement controls a recovery decision is bound by |
| §10 metrics | BITRE monthly domestic on-time performance (departures and arrivals within 15 minutes, cancellations, by airline, with long-term averages); IATA delay code taxonomy; A-CDM KPIs | Public numbers with standard definitions |

## Contract security services (first used: Sheridan Security Group, September 2026)

No single reference model exists for a contract security business; assemble one from what the trade is
audited and trained against.

| Layer of the document | Standard | What it supplies |
|---|---|---|
| §5 capabilities, L1/L2 | AS 4421:2023 Guard and patrol security services — Section 2 Governance (site review, subcontracting, contract, assignment instructions, quality), Section 3 Terms of employment (vetting, licence, uniform, equipment, training), Section 4 Operations (operations room, communications, records); public preview runs to 4.5. ISO 18788:2015 private security management system (full clause tree public in the ISO sample). APQC PCF 5.0, 7.6.6, 9.0, 11.0 for delivery, scheduling, finance, risk | The governance, workforce and operations spine; service lines then follow the firm's own list |
| §5 service-line L2s | BS 7499:2020 static guarding; BS 7984-1:2016 keyholding and response (BS 7984-3 mobile patrol); BS 8507-1 close protection; AS 2201.2:2022 monitoring centres (grades A1–C3, ASIAL-audited); Crowded Places Strategy and Security Audit for events | Guarding, response, close protection, control room, events |
| §4 activity vocabulary | CPP20218 Cert II Security Operations, CPP31318 Cert III, CPP31418 Close Protection, CPP40719 Cert IV Security Management — unit titles on training.gov.au | Verbs of the work: patrol premises, control access and exit, screen, monitor crowd behaviour, remove persons, escort and protect, respond to alarms, coordinate from control rooms |
| §6 concepts | NSW Security Industry Regulation — the sign-on register and incident register with prescribed fields (3-year retention); licence classes 1A–1F, 2A–2E and master subclasses MA–ME | The nearest thing to a prescribed record; there is no industry data standard |
| §8 controls (NSW) | Security Industry Act 1997 (incl. s 38A subcontracting consent and disclosure) and Security Industry Regulation 2026; Security Services Industry Award 2020 (MA000016); WHS Act and 2026 digital work systems duty; Workplace Surveillance Act 2005; ASIC/MSIC and screener accreditation for airports and ports; SOCI CIRMP rules; NSW Health Protecting People and Property for hospitals | Who may work, how many a firm may supply, how subcontracting must be disclosed, pay |
| §10 metrics | AS 4421:2023 response time chart (values paywalled); BS 7499 6.5 performance evaluation; otherwise contract KPIs with no public definitions (patrol completion, shift fill, report timeliness, turnover) | Few public numbers — expect §10 to be thin |

Check the public licence register first: the master licence subclass caps how many people the firm can
supply, which shapes every delivery stream.

## Higher education (Microsoft engagement, June 2026)

CAUDIT Higher Education Reference Models — capability model and data reference model. Used as the
spine of the pre-demo reference model.

## Finance BPO (Accenture engagement, June 2026)

The published Finance BPO reference model in the engagement folder, with APQC's Process
Classification Framework as the process anchor.

## Rows not yet done for real (candidates, from the capability-mapping skill)

Financial services: BIAN. Insurance: ACORD. Telecoms: eTOM / TM Forum. Retail and supply chain:
SCOR, VRM. Healthcare: HL7 / FHIM. Add the stage and object layers when a sector is first run.
