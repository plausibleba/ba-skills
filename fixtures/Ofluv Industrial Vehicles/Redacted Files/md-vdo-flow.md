# Process: Vehicle Delivery Order (VDO) Flow

## Syfte
Beskriver processen för att skapa och hantera Vehicle Delivery Orders (VDO) i systemet BM (internt orderhanteringssystem), inklusive kundhantering, VIN-skapande, produktkonfiguration och ändringshantering.

## Källa
Mural-whiteboard — Bolag1 Digital Transformation. Sessions: 25 feb & 26 feb 2026.

## System och integrationer
| System | Roll i flödet |
|---|---|
| Post | Externt försäljningssystem — källa för kundorder och kunddata |
| BM (BusMaster) | Internt system för Vehicle Delivery Orders |
| SAP Prevost | SAP-instans för kundmaster och synkronisering |
| Excel | Manuellt verktyg för VIN-skapande (övergångslösning) |

## Entiteter
| Entitet | Beskrivning |
|---|---|
| Customer Vehicle Sales Order | Kundorder från Post |
| Vehicle Delivery Order (VDO) | Intern leveransorder i BM |
| VIN Number | Fordonets unika identitetsnummer |
| Product VC incl. Warranties | Produktkonfiguration med garantier |

## Processflöde

### Kundhantering
1. Kund skapas i Post och synkas med SAP Prevost
2. Bolag1 bygger interface mellan Post och SAP Prevost
3. Customer ID skapas i BM baserat på SAP Prevost-kund
4. → **Customer in BM** (utgående tillstånd)

### VDO-skapande (två parallella spår)
**Spår A — Automatiskt:**
1. Customer Vehicle Sales Order från Post
2. Create Vehicle Delivery Order in BM (inkl. validering)
   - Säkerställ att ordern är komplett och byggbar
   - Validera att VDO är i linje med Config rules
   - Skapa PO Item No för att identifiera fordonet (skapas i Excel)
   - Ett fordon per Vehicle Delivery Order

**Spår B — Manuellt:**
1. Customer Vehicle Sales Order for Volvo Coach
2. Create Vehicle Delivery Order in BM Manually

3. → **Registered Vehicle Delivery Order in BM** (gemensamt tillstånd)

### VIN-hantering
1. VIN Number Creation Manually in BM (via Excel)
2. → Order with VIN

### Orderbekräftelse
1. Vehicle Delivery Order Confirmation in BM
2. Commit the order for production preparation

### Produktkonfiguration
1. Product VC incl. Warranties
   - Garantidata kommer från Post
   - Extended Warranty hanteras som option
   - Produktkonfiguration replikeras inkl. varianter, regler och restriktioner från SAP Prevost till BM
2. → **2.2.7 Product Configuration Management**

### Ändringshantering
1. Change Request from Customer
2. Change Customer
3. Vehicle Delivery Order Change Management
4. → Återkopplar till VDO-skapande

### Prissättning
- Order Pricing (parallellt spår)
- Manage Change of VIN-number

## Öppna frågor (från workshop)
- Är det möjligt att ha ett enda flöde för både Post och Volvo Coach?
- Hypotes: Flytta inte Customer Master till BM i Package 1
- Behöver Parma ingå i analysen av Customer data flow? (MF 2.0 är baserat på Parma)
- Kan VIN genereras automatiskt i ett senare paket?
- Var skapas Equipment i processen?
- Hur ofta är produktkonfigurationen på 1st level?
- Antagande: 1–2 Vehicle Orders skapas per dag
- Equipment- och Equipment-nummer skapas parallellt med ordern

## Attribut för Vehicle Delivery Order
- Industrial object
- Production-oriented
- VIN-created/assigned
- Production commitment

## Anonymisering
- Bolagsnamn ersatt med Bolag1
- Systemnamnet "BusMaster" ersatt med "BM" genomgående
- Personnamn från Mural-sessionen borttagna
