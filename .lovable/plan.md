

# TableSelector Component — Implementatieplan

## Overzicht
Vervang de flat `<Select>` dropdown voor tafels door een enterprise-grade `<TableSelector>` component met zoekbalk, area-groepering, vrij/bezet tellers, en aanbevolen badge. Gebaseerd op Popover + Command (cmdk) pattern.

## Stap 1: TableSelector component bouwen

Nieuw bestand: `src/components/reservations/TableSelector.tsx`

- Radix Popover als wrapper, cmdk Command als content
- Trigger: button met geselecteerde tafel label, ChevronsUpDown icoon
- Vaste opties bovenaan (niet gefilterd door zoekbalk):
  - "Automatisch toewijzen" (Sparkles icoon)
  - "Niet toegewezen"
- CommandInput zoekbalk filtert op display_label en area name (client-side, instant)
- CommandGroup per area met heading: `AREA NAAM · X van Y vrij`
- CommandItem per tafel: `display_label · Xp`, disabled als bezet of niet-passend
- Aanbevolen badge op recommendedTableId
- "Toon alle tafels" toggle onderaan (default: alleen vrije + passende tafels)
- Bezette tafels: disabled + grijs + "bezet HH:MM-HH:MM"

Props interface conform spec (`value`, `onChange`, `tables`, `partySize`, `date`, `startTime`, `effectiveDuration`, `reservationsForDate`, `recommendedTableId`, `autoAssignEnabled`, `shiftAreas`).

Overlap-check logica: client-side berekening met reservationsForDate + effectiveDuration om te bepalen welke tafels bezet zijn en wanneer.

## Stap 2: Integreren in CreateReservationSheet

Regels 546-578 in `CreateReservationSheet.tsx`: vervang de huidige `<Select>` door `<TableSelector>`.

- Pass `areasWithTables` (al beschikbaar), `reservationsForDate` (al beschikbaar), `effectiveDuration`, `partySize`, `date`, `startTime`
- Pass `recommendedTableId` uit de `preview` state
- Pass `autoAssignEnabled` uit `settings?.auto_assign`
- Verwijder de `allTables` useMemo (niet meer nodig, TableSelector doet eigen groepering)
- Preview suggestie tekst blijft onder de selector

## Stap 3: Integreren in ReservationDetailPanel

Regels 223-238: vervang de `<Select>` bij "Handmatig kiezen" door `<TableSelector>`.

- Alleen manual mode (geen auto/none opties nodig, of auto verbergen)
- Pass reservation's party_size, date, start_time, duration
- Nodig: `useReservations` toevoegen voor reservationsForDate

## Stap 4: Integreren in TableMoveDialog

Vervang de huidige grid-layout (regels 71-113) door `<TableSelector>`.

- Geen auto/none opties, alleen tafelselectie
- Pass currentTableId voor "huidige tafel" indicator
- Bij selectie: direct `setSelectedTableId`, submit via bestaande "Wijzigen" knop

---

## Technische details

### Bestanden die aangemaakt worden:
- `src/components/reservations/TableSelector.tsx`

### Bestanden die gewijzigd worden:
- `src/components/reservations/CreateReservationSheet.tsx` (Select -> TableSelector)
- `src/components/reservations/ReservationDetailPanel.tsx` (Select -> TableSelector + useReservations)
- `src/components/reservations/TableMoveDialog.tsx` (grid layout -> TableSelector)
- `src/components/reservations/index.ts` (export TableSelector)

### Dependencies:
- Geen nieuwe packages — gebruikt bestaande `cmdk` (Command), Radix Popover, lucide-react icons

