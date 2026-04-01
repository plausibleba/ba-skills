# Process: MOM Transactional Flow — Make to Order Sales

## Syfte
Beskriver det grundläggande transaktionsflödet i MOM (Manufacturing Operations Management) för Make-to-Order-försäljning från kundportal via försäljningsregion till fabrikssystem.

## Källa
Intern presentationsbild — MOM/Factory Master Project. Session: feb 2026.

## System och integrationer
| System | Roll i flödet |
|---|---|
| Dealer Portal | Kundgränssnitt för orderläggning och statuspåverkan |
| Sub-Region SAP (FS SAP R/3) | Regional orderhantering och inköpsordrar |
| Production Company | Försäljningsorder, ATP, orderbekräftelse |
| Factory System SAP R/3 | Tillgänglighetskontroll, MRP, produktionsorder, leverans |
| DMS | Återförsäljarens inköp och fakturakvitto |
| Local SAP FI/CO | Lokal ekonomihantering per enhet |

## Processflöde

### Dealer Portal
1. Choose Model
2. Preliminary Delivery Date Check
3. Configure Order
4. Create Order
5. Assign End-Customer / Retail Reporting
6. Order and Machine Statuses
7. → Order Acknowledgement (utgående)

### Sub-Region
1. Customer Order
2. Text Check & Release
3. Credit Check & Release
4. Purchase Order

### Production Company
1. Sales Order
2. Match & Assign Availability Check
3. Order Confirmation / Set Freezing Dates
4. Purchase Order

### Factory System
1. Availability Check
2. Sales Order costing
3. MRP Run
4. Serial Number Assign / Prod. order release
5. Prod. order start
6. Prod. order finish
7. Goods Receipt Machine Card Info
8. Delivery
9. Pick/Pack
10. Goods Issue

### DMS (Återförsäljare)
1. Purchase Order
2. Goods Receipt
3. Invoice Receipt

### Centralt objekt
- **Vehicle Table** — central datatabell som kopplar samman Production Company och Factory System

## Roller
| Roll | Enhet |
|---|---|
| Återförsäljare | Dealer Portal / DMS |
| Regionansvarig | Sub-Region |
| Orderadministratör | Production Company |
| Produktionsplanerare | Factory System |

## Öppna frågor / anmärkningar
- Flödet är MTO (Make to Order) — inga lagerordrar ingår i denna bild
- Local SAP FI/CO finns på både Sub-Region och Factory-sidan
- Ship Doc skapas i anslutning till Delivery-steget i Factory

## Anonymisering
- Bolagsnamn ersatt med Bolag1-kontext
- Systemnamn (SAP R/3, MOM) är generiska och behålls
