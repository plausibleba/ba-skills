# SAP Transformationsprogram — Roadmap

## Syfte
Beskriver den övergripande programroadmapen för Bolag1:s globala SAP S/4HANA-transformation, inklusive implementationsvågor per region, beslutsstatus och öppna strategiska frågor.

## Källa
Excel-fil: SAP@Bolag1.xlsx — fliken MasterFinance. Session: 15 jan 2026.

## Roadmap-version
Roadmap 4.2

## Tidsspann
2023 Q3 — 2029 Q4

## Implementationsvågor

### Beslutade (Decided)
| Våg | Beskrivning | Antal enheter | Status |
|---|---|---|---|
| C4 Sweden Wave 1 | Region Sverige, omgång 1 | 18 | Deploy → HC |
| C4 Sweden Wave 2 | Region Sverige, omgång 2 | 5 | Deploy → HC |
| C4 Sweden Wave 3 | Region Sverige, omgång 3 | 6 | Deploy → HC |
| C5 Europe East Wave 1 | Östeuropa, omgång 1 | 5 | Realize → Deploy |
| C5 Europe East Wave 2 | Östeuropa, omgång 2 | 8 | Realize → Deploy |
| C5 Europe East Wave 3 | Östeuropa, omgång 3 | 8 | Scope → Realize |
| C3 Wave 1A | Intern enhet, omgång 1 | 11 | Realize → Deploy |
| C3 Wave 1B | Inkl. specifika system (FR54, FR55, FR56) | — | RT DMS Realize |
| C3 Wave 2 | Inkl. specifika system (BE06, FR46) | — | Scope → Deploy |

### Ej beslutade (Not Decided)
| Våg | Beskrivning | Antal enheter |
|---|---|---|
| C8 APAC | Asien-Stillahavsregionen | 15 |
| C7 South America | Sydamerika | 5 |
| C6 North America | Nordamerika | 14 |
| Brazil | Brasilien | 1 |

## Fas-terminologi
| Fas | Beskrivning |
|---|---|
| Initiate | Projektinitiering |
| Prepare | Förberedelse |
| Scope | Scope-definition |
| Realize | Realisering/bygge |
| Deploy | Driftsättning |
| HC | Hypercare (post go-live support) |

## Strategiska beslut (från session)
1. FM for Bolag1 beslutad — godkänd av ledningen
2. Få in Bolag1 i C6 North America
3. Besluta förberedande aktiviteter, t.ex. FrontLoading / FitToStandard (ny informationsmodell, exempelvis kontoplan)

## Att undersöka
- Konsekvenser för SAP@Bolag1 att implementera FM under 2029

## Notering om specifik enhet
- Enhet X = CA06 & US36
- US36 har redan FM 1.0 och är inplanerad i Cluster 6

## Anonymisering
- Bolagsnamn ersatt med Bolag1
- Specifika interna systembeteckningar (FR54 etc.) behållna som generiska koder
- Personnamn från sessionsvyn borttagna
