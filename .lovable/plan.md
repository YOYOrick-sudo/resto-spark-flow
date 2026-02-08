

## Dashboard Verbetering

### Samenvatting

Het Dashboard wordt opgebouwd met drie secties: verbeterde stat cards (4 stuks), een "Aandacht vereist" sectie met urgente signalen uit de Assistent data, en een "Reserveringen vandaag" sectie met een compacte lijst.

### Wijzigingen

**Bestand: `src/pages/Dashboard.tsx` - volledig herschrijven**

Het huidige placeholder-dashboard wordt vervangen door een volwaardig dashboard met drie secties.

**1. Stat Cards (4 stuks in grid)**

Grid layout: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`

Elke card is een `NestoCard` met `p-5`:
- Header: label links (`text-[13px] font-medium text-muted-foreground`), icoon container rechts (`w-9 h-9 rounded-lg bg-primary/5` met icoon `h-4 w-4 text-primary`)
- Waarde 0: em-dash in `text-2xl font-semibold text-muted-foreground` + beschrijving in `text-xs text-muted-foreground`
- Waarde > 0: getal in `text-2xl font-semibold text-foreground` + sub-label in `text-xs text-muted-foreground`

Cards:
| Card | Icoon | Zero label | Sub label |
|---|---|---|---|
| Reserveringen vandaag | CalendarDays | Geen reserveringen | vandaag |
| Open taken | CheckSquare | Geen open taken | open |
| Actieve recepten | BookOpen | Geen actieve recepten | actief |
| Bezetting | Users | Geen data | % |

Reserveringen en bezetting worden berekend uit `mockReservations` (gefilterd op vandaag) en `mockTables`.

**2. Aandacht vereist sectie**

- Sectie label: `AlertTriangle` icoon (`h-4 w-4 text-orange-500`) + "Aandacht vereist" (`text-sm font-semibold text-foreground`)
- Filtert `mockAssistantItems` op severity `error` of `warning`, gesorteerd op severity dan datum, max 3 items
- Elk item: urgentie-icoon, titel (`text-sm font-medium`), beschrijving (`text-sm text-muted-foreground`), module badge (zelfde config als Assistent pagina)
- Items staan direct op de pagina met `divide-y divide-border`, geen NestoCard wrapper
- Klikbaar met `hover:bg-muted/30 rounded-lg transition-colors`
- Link onderaan: "Alle signalen bekijken (pijl)" naar `/assistent`
- Als er GEEN urgente signalen zijn: hele sectie wordt niet gerenderd

**3. Reserveringen vandaag sectie**

- In een `NestoCard` met `p-0 overflow-hidden`
- Header: "Reserveringen vandaag" links (`text-base font-medium`), rechts totaal aantal + "Bekijk alle (pijl)" link naar `/reserveringen`
- Max 5 reserveringen, gesorteerd op startTime
- Per rij: tijd (`text-sm font-medium w-14`), naam (`text-sm flex-1 truncate`), gasten + tafel (`text-sm text-muted-foreground`), status dot (kleur uit `reservationStatusConfig`)
- Rijen: `hover:bg-muted/30 transition-colors duration-150 cursor-pointer`
- Leeg: "Geen reserveringen vandaag" in `text-sm text-muted-foreground text-center py-8`

**Imports:**
- `CalendarDays, CheckSquare, BookOpen, Users, AlertTriangle, AlertCircle, ChevronRight` uit lucide-react
- `NestoCard, NestoBadge` uit polar components
- `mockAssistantItems` uit assistant mock data
- `mockReservations, mockTables, reservationStatusConfig` uit reservations data
- `Link, useNavigate` uit react-router-dom

De welkomsttekst wordt verwijderd. Alleen een `h1` "Dashboard" blijft bovenaan.

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/Dashboard.tsx` | Volledig herschrijven met 3 secties |

