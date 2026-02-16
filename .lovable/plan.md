
# Fase 4.7a — Plumbing: Database + Type Mapping + Data Layer Swap

## Overzicht

Deze fase vervangt alle mock data imports voor reserveringen door echte database queries. Na afloop draait de reserveringen pagina (Grid View, List View, Pacing row, filters) volledig op Supabase data. Het detail panel en create flow volgen in 4.7b.

---

## Deel 0: Scope Inventarisatie

### 10 bestanden die importeren uit `src/data/reservations.ts`

| # | Bestand | Wat het importeert | Actie in 4.7a |
|---|---------|-------------------|---------------|
| 1 | `Reserveringen.tsx` (pagina) | `mockReservations`, `getReservationsForDate`, `getTotalGuestsForDate`, `getGuestDisplayName`, type `Reservation` | Vervang door `useReservations` hook + adapter helpers |
| 2 | `ReservationGridView.tsx` | 16 functies (zie breakdown) | Grootste refactor: split in pure utils vs hook-backed |
| 3 | `ReservationBlock.tsx` | `getGuestDisplayName`, `calculateBlockPosition`, `timeToMinutes`, `minutesToTime`, `GridTimeConfig`, `defaultGridConfig` | Verplaats pure utils, vervang naam helper |
| 4 | `TableRow.tsx` | `Table`, `Reservation`, `getReservationsForTableMutable`, `GridTimeConfig`, `defaultGridConfig` | Ontvang reservations via props i.p.v. interne fetch |
| 5 | `ReservationListView.tsx` | `Reservation`, `reservationStatusConfig`, `getTableNumbers`, `getGuestDisplayName` | Vervang door adapter helpers + nieuwe statusConfig |
| 6 | `ReservationFilters.tsx` | type `ReservationStatus` | Vervang import naar `src/types/reservation.ts` |
| 7 | `QuickReservationPanel.tsx` | `Table`, `getTablesByZone`, `getActiveZones`, `checkTimeConflict`, `timeToMinutes`, `minutesToTime` | Disable/placeholder -- panel krijgt "coming soon" state |
| 8 | `Dashboard.tsx` | `mockReservations` | Vervang door `useReservations` hook |
| 9 | `SettingsReserveringenPacing.tsx` | `mockPacingSettings`, `updatePacingSettings`, `mockTables` | Verplaats pacing mock naar apart bestand |
| 10 | `SettingsReserveringenShiftTijden.tsx` | `mockPacingSettings`, `updatePacingSettings` | Verplaats pacing mock naar apart bestand |

### Grid View 16 functies -- categorisering

| Functie | Categorie | Actie |
|---------|-----------|-------|
| `timeToMinutes` | Pure utility | Verplaats naar `src/lib/reservationUtils.ts` |
| `minutesToTime` | Pure utility | Verplaats naar `src/lib/reservationUtils.ts` |
| `GridTimeConfig` (type) | Pure utility | Verplaats naar `src/lib/reservationUtils.ts` |
| `defaultGridConfig` | Pure utility | Verplaats naar `src/lib/reservationUtils.ts` |
| `getHourLabels` | Pure utility | Verplaats naar `src/lib/reservationUtils.ts` |
| `calculateBlockPosition` | Pure utility | Verplaats naar `src/lib/reservationUtils.ts` |
| `getTimeSlots` | Pure utility | Verplaats naar `src/lib/reservationUtils.ts` |
| `getActiveZones` | Mock-specifiek | Vervang door `useAreasForGrid` hook |
| `getTablesByZone` | Mock-specifiek | Vervang door areas[].tables uit hook |
| `getSeatedCountAtTime` | Mock-specifiek | Bereken client-side uit hook data |
| `getPacingLimitForTime` | Mock-specifiek | Verplaats naar pacing mock (voorlopig) |
| `getShiftForTime` | Mock-specifiek | Vervang door shift data uit `useShifts` |
| `getTableById` | Mock-specifiek | Vervang door lookup in areas data |
| `getReservationsForDate` | Mock-specifiek | Vervang door `useReservations` hook |
| `getReservationsForTableMutable` | Mock-specifiek | Vervang door client-side filter op hook data |
| `checkTimeConflict` | Mock-specifiek | Verplaats pure logica naar utils, data komt van hook |
| `updateReservationPosition` | Mutatie (DnD) | **Disable in 4.7a** -- DnD wordt read-only |
| `updateReservationDuration` | Mutatie (DnD) | **Disable in 4.7a** -- resize wordt read-only |
| `checkInReservation` | Mutatie | **Disable in 4.7a** -- komt in 4.7b via RPC |
| `addReservation` | Mutatie | **Disable in 4.7a** -- komt in 4.7b via create flow |
| `updateReservationStatus` | Mutatie | **Disable in 4.7a** -- komt in 4.7b via RPC |

### Kritieke bug: Grid View dubbele data-fetch

`ReservationGridView` ontvangt `reservations` als prop maar negeert die volledig. Intern roept het `getReservationsForDate(dateString)` aan (regel 422-424) en geeft die door aan alle child components. Dit betekent:

1. Filters van de parent pagina hebben geen effect op de Grid View
2. Data wordt dubbel opgehaald
3. Na de mock-swap zou de Grid View alsnog mock data tonen

**Fix:** Grid View moet `reservations` prop gebruiken als single source of truth. `TableRow` moet reservations via props krijgen, niet intern ophalen.

---

## Deel 1: Database Migratie

### 1.1 `risk_factors` kolom toevoegen

```text
ALTER TABLE public.reservations
ADD COLUMN risk_factors JSONB;
```

### 1.2 `calculate_no_show_risk` functie herschrijven

De bestaande functie berekent een totaalscore. Die logica wordt gesplitst in individuele variabelen zodat per factor een jsonb entry kan worden geschreven.

De score-logica (gewichten, ranges) verandert NIET -- alleen de opslag wordt uitgebreid:

```text
UPDATE public.reservations
SET
  no_show_risk_score = LEAST(_score, 100),
  risk_factors = jsonb_build_object(
    'guest_history', jsonb_build_object('score', _guest_score, 'weight', 40, 'detail', ...),
    'party_size',    jsonb_build_object('score', _party_score, 'weight', 20, 'detail', ...),
    'booking_lead',  jsonb_build_object('score', _lead_score,  'weight', 20, 'detail', ...),
    'channel',       jsonb_build_object('score', _chan_score,   'weight', 10, 'detail', ...),
    'day_of_week',   jsonb_build_object('score', _day_score,   'weight', 10, 'detail', ...)
  )
WHERE id = _reservation_id;
```

### 1.3 AFTER INSERT trigger bijwerken

De trigger `fn_calculate_no_show_risk_after_insert` moet dezelfde risk_factors logica bevatten.

---

## Deel 2: Pure Utilities Extractie

### Nieuw bestand: `src/lib/reservationUtils.ts`

Bevat alleen pure functies zonder data-afhankelijkheden:

```text
// Types
export interface GridTimeConfig { startHour, endHour, intervalMinutes, pixelsPerMinute }
export const defaultGridConfig: GridTimeConfig

// Time helpers
export function timeToMinutes(time: string): number
export function minutesToTime(totalMinutes: number): string

// Grid helpers
export function getHourLabels(config: GridTimeConfig): string[]
export function getTimeSlots(config: GridTimeConfig): string[]
export function calculateBlockPosition(startTime, endTime, config): { left, width }

// Conflict check (pure -- data wordt meegegeven, niet intern opgehaald)
export function checkTimeConflict(
  reservations: Reservation[],
  tableId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): { hasConflict: boolean; conflictingReservation?: Reservation }

// Seated count (pure -- berekent uit meegegeven reserveringen)
export function getSeatedCountAtTime(
  reservations: Reservation[],
  time: string
): number
```

---

## Deel 3: Adapter Layer + Type Constants

### 3.1 Status visuele config verplaatsen naar `src/types/reservation.ts`

De mock heeft een uitgebreide `reservationStatusConfig` met dotColor, textClass, bgClass, borderClass. Deze wordt gekopieerd en aangepast:

- `pending` wordt `draft` (label: "Concept")
- `checked_in` wordt verwijderd (mapped naar `seated`)
- Nieuwe statussen toegevoegd: `option`, `pending_payment`
- Labels worden Nederlands

```text
export const STATUS_CONFIG: Record<ReservationStatus, {
  label: string;
  dotColor: string;
  showDot: boolean;
  textClass: string;
  bgClass: string;
  borderClass: string;
}> = { ... }
```

### 3.2 Label constants (al in vorig plan besproken)

```text
export const STATUS_LABELS: Record<ReservationStatus, string>
export const CHANNEL_LABELS: Record<ReservationChannel, string>
export const CHANNEL_ICONS: Record<ReservationChannel, string>
```

### 3.3 Display helpers in `src/lib/reservationUtils.ts`

```text
// Naam weergave
export function getDisplayName(r: Reservation): string {
  if (r.channel === 'walk_in' && !r.customer) return 'Walk-in';
  if (!r.customer) return 'Onbekende gast';
  return [r.customer.first_name, r.customer.last_name].filter(Boolean).join(' ') || 'Onbekende gast';
}

// Tafel label
export function getTableLabel(r: Reservation): string {
  return r.table_label || '--';
}
```

### 3.4 Mock-to-DB veld mapping (referentie)

| Mock veld | Database veld | Notitie |
|-----------|--------------|---------|
| `guestFirstName` + `guestLastName` | `customer.first_name` + `customer.last_name` | Via join |
| `phone` | `customer.phone_number` | Via join |
| `email` | `customer.email` | Via join |
| `date` | `reservation_date` | Format identiek (YYYY-MM-DD) |
| `startTime` | `start_time` | Format identiek (HH:mm) |
| `endTime` | `end_time` | Format identiek (HH:mm) |
| `guests` | `party_size` | |
| `tableIds[]` | `table_id` (single) | DB = single table, multi-table later |
| `shift` ('ED'/'LD') | `shift_name` (via join) | |
| `status` | `status` | `pending`->`draft`, `checked_in`->`seated` |
| `notes` | `guest_notes` + `internal_notes` | Twee velden i.p.v. een |
| `isVip` | Geen equivalent | Komt via customer tags later |
| `isWalkIn` | `channel === 'walk_in'` | |
| `ticketType` | `ticket_name` (via join) | |
| `zone` / `zoneId` | `area` (via table -> area join) | |

---

## Deel 4: Component Refactoring (per bestand)

### 4.1 `Reserveringen.tsx` (pagina)

**Wat verandert:**
- Import `useReservations` i.p.v. mock functies
- Gebruik `useReservations({ date: dateString })` voor data
- Voeg loading/error states toe
- Bereken `totalGuests` en `waitingCount` uit hook data
- Geef gefilterde reservations als prop door aan Grid/List views
- Status filter opties: gebruik `STATUS_CONFIG` keys
- Zoekfunctie: gebruik `getDisplayName()` + `customer.phone_number` + `customer.email`

**Wat NIET verandert:**
- Layout, toolbar, date navigator, view toggle, footer
- Filter UX en gedrag

### 4.2 `ReservationGridView.tsx` (grootste wijziging)

**Wat verandert:**

1. **Data source:** Verwijder interne `getReservationsForDate` call (de dubbele-fetch bug). Gebruik `reservations` prop als single source of truth.

2. **Zones/Areas:** Vervang `getActiveZones()` + `getTablesByZone()` door `useAreasForGrid(locationId)`. Component krijgt `locationId` als nieuwe prop, of areas data wordt van parent doorgegeven.

3. **Pacing row (`SeatedCountRow`):** `getSeatedCountAtTime` wordt een pure functie die reservations als parameter krijgt. `getPacingLimitForTime` blijft voorlopig mock-based (via apart pacing bestand).

4. **DnD mutaties disablen:**
   - `handleDragEnd`: toon toast "Verplaatsen wordt binnenkort beschikbaar" i.p.v. `updateReservationPosition`
   - `handleResize`: toon toast "Aanpassen wordt binnenkort beschikbaar" i.p.v. `updateReservationDuration`
   - `handleCheckIn`: toon toast "Inchecken wordt binnenkort beschikbaar" i.p.v. `checkInReservation`
   - DnD framework (sensors, ghost, drop animation) blijft intact voor visuele feedback, maar de mutatie wordt niet uitgevoerd

5. **Quick reservation:** `handleQuickReservationSubmit` toont toast "Aanmaken wordt binnenkort beschikbaar" i.p.v. `addReservation`. Panel blijft openbaar maar submit is disabled.

6. **Import cleanup:** Alle 16+ imports uit `data/reservations` worden vervangen door imports uit `lib/reservationUtils` + hooks.

### 4.3 `TableRow.tsx`

**Wat verandert:**
- Verwijder interne `getReservationsForTableMutable(date, table.id)` call
- Ontvang `reservations` als prop (gefilterd op table_id door parent)
- Import types en utils uit `lib/reservationUtils` i.p.v. `data/reservations`

**Nieuwe prop:**
```text
interface TableRowProps {
  ...bestaand...
  reservations: Reservation[];  // <-- nieuw, gefilterd op deze tafel
}
```

### 4.4 `ReservationBlock.tsx`

**Wat verandert:**
- Import `calculateBlockPosition`, `timeToMinutes`, `minutesToTime`, `GridTimeConfig`, `defaultGridConfig` uit `lib/reservationUtils`
- Import `getDisplayName` uit `lib/reservationUtils`
- Status styling: `checked_in` case verwijderen (mapped naar `seated`)
- `pending` case verwijderen (mapped naar `draft`)
- Type `Reservation` importeren uit `types/reservation`
- `reservation.phone` check wordt `reservation.customer?.phone_number`
- `reservation.isVip` wordt tijdelijk verwijderd (VIP indicator) -- geen database equivalent
- `reservation.isWalkIn` wordt `reservation.channel === 'walk_in'`
- `reservation.guests` wordt `reservation.party_size`
- `reservation.shift` badge wordt `reservation.shift_name` (of verborgen als null)

### 4.5 `ReservationListView.tsx`

**Wat verandert:**
- Import `STATUS_CONFIG` uit `types/reservation` i.p.v. `reservationStatusConfig` uit mock
- Import `getDisplayName` uit `lib/reservationUtils`
- `getTableNumbers(reservation.tableIds)` wordt `reservation.table_label || '--'`
- Status dropdown menu: vervang `checked_in` door database statussen, gebruik `ALLOWED_TRANSITIONS` om alleen geldige opties te tonen
- `reservation.guests` wordt `reservation.party_size`
- `reservation.phone` wordt `reservation.customer?.phone_number`
- `reservation.isVip` tijdelijk verwijderd
- `reservation.isWalkIn` wordt `reservation.channel === 'walk_in'`
- `reservation.notes` wordt `reservation.guest_notes`
- `reservation.shift` badge wordt `reservation.shift_name`

### 4.6 `ReservationFilters.tsx`

**Wat verandert:**
- Import `ReservationStatus` uit `types/reservation` i.p.v. `data/reservations`
- Status opties: gebruik `STATUS_CONFIG` keys + labels
- Shift opties: hardcoded 'ED'/'LD' wordt dynamisch via `useShifts` (of voorlopig hardcoded met shift names)
- Ticket type opties: hardcoded lijst wordt dynamisch via `useTickets` (of voorlopig vereenvoudigd)
- Filter logica in parent past aan: `r.shift` wordt `r.shift_name`, `r.ticketType` wordt `r.ticket_name`

### 4.7 `QuickReservationPanel.tsx`

**Wat verandert:**
- Functionaliteit wordt tijdelijk disabled
- Submit knop toont "Binnenkort beschikbaar" en is disabled
- Pure time utils (`timeToMinutes`, `minutesToTime`) importeren uit `lib/reservationUtils`
- `getActiveZones`/`getTablesByZone`/`checkTimeConflict` worden verwijderd -- tafel selectie is placeholder
- Component blijft renderen (geen visuele breuk) maar kan niet submitten

### 4.8 `Dashboard.tsx`

**Wat verandert:**
- Vervang `mockReservations` import door `useReservations` hook
- `mockReservations.filter(r => r.date === today)` wordt `useReservations({ date: today })`
- Toon loading state tijdens laden
- Pas ReservationsTile aan om database `Reservation` type te accepteren

### 4.9 `SettingsReserveringenPacing.tsx` + `SettingsReserveringenShiftTijden.tsx`

**Wat verandert:**
- Import `mockPacingSettings`, `updatePacingSettings`, `mockTables` uit **nieuw** bestand `src/data/pacingMockData.ts`
- Geen functionele wijzigingen -- pacing settings blijven mock-based tot een latere fase

---

## Deel 5: Pacing Mock Isolatie

### Nieuw bestand: `src/data/pacingMockData.ts`

Bevat alleen pacing-gerelateerde exports verplaatst uit `data/reservations.ts`:

```text
export interface PacingSettings { ... }
export let mockPacingSettings: PacingSettings
export function updatePacingSettings(...)
export function getPacingLimitForTime(time: string): number
```

Dit bestand is expliciet tijdelijk en wordt vervangen wanneer pacing settings naar de database verhuizen.

---

## Deel 6: `data/reservations.ts` opruiming

Na alle bovenstaande wijzigingen zou `data/reservations.ts` geen imports meer hebben. Het bestand wordt **niet verwijderd** in 4.7a maar gemarkeerd als deprecated:

```text
// @deprecated -- alle exports zijn verplaatst.
// Pacing: src/data/pacingMockData.ts
// Utils: src/lib/reservationUtils.ts
// Types: src/types/reservation.ts
// Data: useReservations hook
```

Verwijdering volgt in 4.7b na bevestiging dat niets meer importeert.

---

## Implementatievolgorde

1. Database migratie: `risk_factors` kolom + functie update
2. `src/lib/reservationUtils.ts` -- pure utilities extractie
3. `src/types/reservation.ts` -- STATUS_CONFIG, labels, channel maps toevoegen
4. `src/data/pacingMockData.ts` -- pacing mock isolatie
5. `ReservationFilters.tsx` -- simpelste wijziging, type import swap
6. `ReservationBlock.tsx` -- util imports + veld mapping
7. `TableRow.tsx` -- reservations via props, verwijder interne fetch
8. `ReservationListView.tsx` -- veld mapping + statusConfig swap
9. `ReservationGridView.tsx` -- areas hook, dubbele-fetch fix, DnD disable, prop passthrough
10. `QuickReservationPanel.tsx` -- disable submit, clean imports
11. `Reserveringen.tsx` -- useReservations hook, loading/error, filter logica
12. `Dashboard.tsx` -- useReservations hook
13. Settings pacing pages -- import swap naar pacingMockData

---

## Bestanden overzicht

| Bestand | Actie |
|---------|-------|
| SQL migratie | Nieuw -- `risk_factors` kolom + functie updates |
| `src/lib/reservationUtils.ts` | Nieuw -- pure grid/time utilities + display helpers |
| `src/data/pacingMockData.ts` | Nieuw -- geisoleerde pacing mock data |
| `src/types/reservation.ts` | Update -- STATUS_CONFIG, labels, channel maps |
| `src/components/reserveringen/ReservationGridView.tsx` | Update -- areas hook, prop passthrough, DnD disable |
| `src/components/reserveringen/TableRow.tsx` | Update -- reservations via props |
| `src/components/reserveringen/ReservationBlock.tsx` | Update -- imports + veld mapping |
| `src/components/reserveringen/ReservationListView.tsx` | Update -- imports + veld mapping |
| `src/components/reserveringen/ReservationFilters.tsx` | Update -- type import |
| `src/components/reserveringen/QuickReservationPanel.tsx` | Update -- disable submit |
| `src/pages/Reserveringen.tsx` | Update -- useReservations + loading/error |
| `src/pages/Dashboard.tsx` | Update -- useReservations |
| `src/pages/settings/reserveringen/SettingsReserveringenPacing.tsx` | Update -- import swap |
| `src/pages/settings/reserveringen/SettingsReserveringenShiftTijden.tsx` | Update -- import swap |
| `src/data/reservations.ts` | Deprecated marker (niet verwijderd) |

---

## Wat NIET in 4.7a scope zit

| Feature | Reden | Fase |
|---------|-------|------|
| ReservationDetailPanel | Feature, niet plumbing | 4.7b |
| CreateReservationSheet | Feature, niet plumbing | 4.7b |
| Status transitie acties | Feature | 4.7b |
| Risk score UI | Feature | 4.7b |
| Audit log timeline | Feature | 4.7b |
| DnD mutaties (drag, resize, check-in) | Complex, needs RPCs | 4.7b of 4.8 |
| Realtime subscription | Feature | 4.7b |
| Mock data bestand verwijdering | Veiligheidscheck eerst | 4.7b |
| Pacing naar database | Apart feature | Later |

---

## Acceptance Criteria

- [ ] Grid View toont reserveringen uit database (niet mock)
- [ ] List View toont reserveringen uit database (niet mock)
- [ ] Dashboard toont reserveringsdata uit database
- [ ] Filters werken correct met database velden
- [ ] Grid View bug gefixt: `reservations` prop wordt gebruikt, niet interne fetch
- [ ] DnD is visueel intact maar mutaties tonen "binnenkort beschikbaar" toast
- [ ] QuickReservationPanel submit is disabled
- [ ] Pacing settings pagina's werken ongewijzigd (via geisoleerde mock)
- [ ] `risk_factors` kolom bestaat en wordt gevuld bij nieuwe reserveringen
- [ ] Geen TypeScript build errors
- [ ] Geen runtime imports uit `data/reservations.ts` in reserveringen-gerelateerde componenten
