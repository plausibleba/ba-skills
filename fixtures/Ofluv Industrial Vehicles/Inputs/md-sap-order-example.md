# SAP: Coach Order — Exempelpost med Serienummer

## Syfte
Dokumenterar strukturen för en Coach Order i SAP SD, inklusive serienummerhantering per orderrad. Används som referens för hur fordonsordern ser ut i SAP före S/4HANA-migrering.

## Källa
SAP-skärmbild från SAP Roadmap Workshop. Session: 25 feb 2026.

## Transaktionskontext
| Fält | Exempelvärde (anonymiserat) |
|---|---|
| Transaktionskod | Display Coach Order |
| Ordertyp | Coach Order |
| Industry | [Intern branschkod] |
| Segment | All Coaches |

## Orderstruktur (header)
| Fält | Beskrivning |
|---|---|
| Coach Order | Unikt ordernummer |
| Net Value | Ordervärde i USD |
| Sold-To Party | Kundnummer + namn (köpande enhet) |
| Ship-To Party | Leveransadress (kan skilja från Sold-To) |
| PO Number | Kundens inköpsordernummer |
| Req. Delivery Date | Begärt leveransdatum |
| Deliver Plant | Leveransanläggning |
| Payment Terms | Betalningsvillkor (ex. Payable Immediate) |
| Incoterms | Leveransvillkor (ex. FOB + plats) |

## Orderrad (item)
| Fält | Beskrivning |
|---|---|
| Item | Radnummer |
| Material | Materialnummer (produktkod) |
| Quantity | 1 EA (styck) |
| Currency | USD |
| Catalog | Produktkatalogkod |
| POItem | Kopplat inköpsordernummer |

## Serienummerhantering
Serienummer hanteras per orderrad via popup "Display Serial Numbers":

| Fält | Beskrivning |
|---|---|
| Sales Document | Kopplad till Coach Order |
| Item | Orderradnummer |
| Material | Materialkod för fordonet |
| No. Serial No | Antal serienummer / tilldelade (ex. 1/1) |
| Serial Number | Fordonets unika serienummer (VIN-kopplat) |

### Observationer
- Ett serienummer per orderrad (ett fordon per rad)
- Serienumret är kopplat till materialet och utgör spårbarhetsobjektet
- Serienumret motsvarar VIN-numret i den affärsmässiga processen

## Flikar i ordertransaktionen
- Sales
- Item overview
- Item detail
- Ordering party
- Procurement
- Shipping
- Reason for rejection

## Relevans för S/4HANA-transformation
- Serienummerlogiken behöver migreras och valideras i S/4HANA SD
- Kopplingen mellan Coach Order → Serial Number → VIN är kritisk för spårbarhet
- PO Number-fältet används för koppling till kundens inköpsprocess

## Anonymisering
- Ordernummer, kundnummer och kundnamn ersatta
- Serienummer ersatt med generiskt format
- Personnamn borttagna
