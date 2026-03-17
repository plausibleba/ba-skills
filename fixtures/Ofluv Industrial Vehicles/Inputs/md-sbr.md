# Strategic Business Requirements (SBR) — Bolag1 SAP S/4HANA

## Syfte
Beskriver strukturen och innehållet i det strategiska kravdokumentet (SBR) som används för att prioritera och spåra affärskrav inom SAP-transformationsprogrammet.

## Källa
Excel-fil: Strategic Business Requirements — flikar SBR, Packets, Dependencies, Estimate Summary. Session: 4 mars 2026.

## Dokumentstruktur (kolumner i SBR-fliken)

| Kolumn | Beskrivning |
|---|---|
| Cluster | Affärsområdeskluster (ex. Regulatory, Material Planning, Finance) |
| Transformation Need | Övergripande transformationsbehov |
| Ref ID | Unikt referensnummer |
| Strategic Business Requirement | Kravbeskrivning i "The possibility to..." format |
| Pant | Prioritetsvikt |
| Status | OK / Review / NIS (Not In Scope) |
| Packets | Kopplat implementationspaket |
| Comments | Kommentarer och förtydliganden |

## Kravkategorier (Cluster)

| Cluster | Exempel på krav |
|---|---|
| Adhere to regulatory standards | Compliance-spårning, emissionsrapportering, cybersäkerhetsöversikt, VIN-dokumentation |
| Better monitoring for invoicing and revenue | Automatisk AP-fakturering, trepartsavstämning, kundbetalningshantering |
| Efficient Material Planning | Förbrukningsspårning för delar, leverantörskommunikation, inköpsschemaläggning |
| [Övriga kluster från Packets-fliken] | Vehicle Sales Order, Production Planning, Customer Data Quality, m.fl. |

## Exempel på kravformuleringar
- "The possibility to govern and monitor data privacy compliance aligned with group standards"
- "The possibility to have a clear regulation tracking tool in place, with a dashboard"
- "The possibility to get a vehicle 360° view on basic vehicle information and changes throughout the lifecycle"
- "The possibility to create VIN numbers in a secure and structured way"
- "The possibility to have better standard models used for consumption planning"
- "The possibility to manage purchasing scheduling to suppliers on forecast in a more efficient way"

## Packets-struktur (andra fliken)

| Fält | Beskrivning |
|---|---|
| Packet | Implementationspaketnamn |
| Business Focus | Affärsfokus för paketet |
| Description | Detaljerad beskrivning |
| Capability | Kopplad förmåga |
| Business Outcome | Förväntat affärsresultat |
| Transformation Cost (M€) | Estimerad kostnad uppdelat på Business & Change resp. Systems & Integration |
| Transformation Duration | Genomförandetid |
| Start/End Date | Planerade datum |
| Status | RAG-status (Röd/Gul/Grön) |

## Exempel på paket (anonymiserade)
| Paket | Fokus | Status |
|---|---|---|
| Vehicle Sales Order | Operations — förbättra orderflödet | Röd |
| Master Schedule in SCOPE | Operations — streamlining med subject | Röd |
| Bolag1 Connect | Operations/Digital — kundupplevelse | Röd |
| Customer Data Quality | Operations/Digital — kundinsikt | Röd |
| Time Management | HR | Grön |
| Product Preparation in BM | Operations/Engineering | Röd |
| Production Planning | Operations — förbättra planering | Röd |
| Material Procurement | Operations — effektivare inköp | Röd |

## Observationer om datakvalitet
- Flera krav markerade med "Needs to be clarified (use comment as input)"
- Phantom parts-hantering identifierad som smärtpunkt (SAP-kodning stödjer ej dynamisk produktionsplanering)
- Retrofit parts saknar processtöd — delar tas direkt från hylla utan systemspårning

## Anonymisering
- Bolagsnamn ersatt med Bolag1
- Specifika leverantörsnamn borttagna
- Interna systemnamn (ex. Kestaar, CAPBUS, CDP) ersatta med generiska beskrivningar
- Personnamn borttagna
- Specifika kostnadstal borttagna
