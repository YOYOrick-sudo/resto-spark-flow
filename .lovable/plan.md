
# Fase 4.9.5 — Polish: Operator UI

## Overzicht
Puur visuele en UX-verbeteringen over de volledige reserveringen module. Geen functionele wijzigingen, geen database changes.

---

## Stap 1: Status Labels Hernoemen

**Bestanden:** `src/types/reservation.ts`

Wijzig in `STATUS_CONFIG` en `STATUS_LABELS`:
- `seated.label`: "Gezeten" naar **"Ingecheckt"**
- `completed.label`: "Afgerond" naar **"Uitgecheckt"**

Dit propageert automatisch naar List View, Grid View, Detail Panel, Status Filter, Audit Log en Override dialoog (alles leest uit dezelfde config).

---

## Stap 2: Tijdformaten (HH:MM, geen seconden)

**Probleem:** `start_time` en `end_time` komen als `"HH:MM:SS"` uit de database (Postgres `TIME` type). Wordt nu raw getoond.

**Oplossing:** Nieuwe utility in `src/lib/reservationUtils.ts`:

```typescript
export function formatTime(time: string): string {
  return time.slice(0, 5); // "19:00:00" -> "19:00"
}
```

**Toepassen in:**
- `ReservationDetailPanel.tsx` regel 73: `{formatTime(reservation.start_time)}–{formatTime(reservation.end_time)}`
- `ReservationListView.tsx` time slot headers (al HH:MM, check)
- `ReservationBlock.tsx` title attribute
- `AuditLogTimeline.tsx` option_extended expiry display
- `CreateReservationSheet.tsx` overlap waarschuwing en bevestigingsscherm

---

## Stap 3: Datumformaten

**Probleem:** `CustomerCard` toont `reservation_date` als `"2026-02-17"` (ISO).

**Oplossing:** Nieuwe utility in `src/lib/datetime.ts`:

```typescript
export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${date.toLocaleDateString('nl-NL', { month: 'short' })}`;
  // "17 feb"
}
```

**Toepassen in:**
- `CustomerCard.tsx` VisitHistory: `v.reservation_date` -> `formatDateShort(v.reservation_date)`
- `AuditLogTimeline.tsx` timestamps (gebruikt al `formatDateTimeCompact`, OK)
- `CreateReservationSheet.tsx` bevestigingsscherm: datum leesbaar

---

## Stap 4: Detail Panel — Full-Height Side Sheet

**Huidige situatie:** `DetailPanel` op desktop is een inline flex-shrink-0 panel binnen de flex container. Dit werkt, maar het panel leeft binnen het content-blok en heeft geen click-outside-to-close of overlay.

**Gewenste wijzigingen aan `src/components/polar/DetailPanel.tsx`:**

1. **Desktop:** Verander van inline panel naar een **fixed right overlay** met:
   - `fixed top-0 right-0 bottom-0 z-40` positie
   - Subtiele achtergrond-overlay (`bg-black/20`) die bij klik sluit
   - Breedte: `w-[420px]` (was 460px, iets smaller per spec)
   - Shadow: `shadow-xl` voor diepte
   - Animate-in behouden

2. **Click-outside:** Overlay div met `onClick={onClose}`

3. **Header:** Titel "Reservering" met X-knop, consistent met huidige

**Impact:** `Reserveringen.tsx` hoeft niet meer de `detailPanelOpen` conditie te gebruiken voor layout — het panel zweeft er nu overheen.

---

## Stap 5: Detail Panel Content Polish

**Bestand:** `src/components/reservations/ReservationDetailPanel.tsx`

### 5A. Header verbeteringen
- Tijdformaat: `formatTime()` toepassen op start_time/end_time
- Tafelnaam: als `table_label` leeg is, niet "—" tonen maar weglaten

### 5B. Spacing
- Secties: grotere `divide-y` gaps, of `space-y-1` achtergrondkleur verschil
- Consistent `p-5` (was p-4) voor meer ademruimte

---

## Stap 6: CustomerCard Polish

**Bestand:** `src/components/reservations/CustomerCard.tsx`

- **Naam:** Groter: `text-base font-semibold` (was `text-sm font-medium`)
- **Contact:** Houd `text-sm text-muted-foreground`, OK
- **Stats kaartjes:** Verkleinde spacing: `gap-2` (was gap-3), padding `p-1.5` (was p-2)
- **Bezoekhistorie datums:** `formatDateShort()` toepassen
- **Status kleuren:** Gebruikt al `STATUS_CONFIG[v.status].textClass`, OK

---

## Stap 7: RiskScoreSection Polish

**Bestand:** `src/components/reservations/RiskScoreSection.tsx`

- **Factor labels truncatie:** Vergroot `w-24` naar `w-28` of `min-w-fit` met truncate + tooltip
- **Detail tekst:** Vervang `w-20 truncate` door een Tooltip wrapper zodat volledige tekst zichtbaar is op hover
- **Score bars:** Dunner: `h-0.5` (was h-1) voor minder visueel gewicht
- **Overall progress bar:** Houd `h-1.5`, OK

---

## Stap 8: List View — Quick Check-in/out Knoppen

**Bestand:** `src/components/reserveringen/ReservationListView.tsx`

Voeg inline icoon-knoppen toe aan `ReservationRow`:

- Bij `status === 'confirmed'`: toon `UserCheck` icoon-knop (check-in)
  - `onClick` -> `onStatusChange(reservation, 'seated')`
  - Styling: `p-1 rounded-md hover:bg-primary/10 text-primary`

- Bij `status === 'seated'`: toon `LogOut` icoon-knop (check-out/afronden)
  - `onClick` -> `onStatusChange(reservation, 'completed')`
  - Styling: `p-1 rounded-md hover:bg-muted text-muted-foreground`

Positie: voor het dropdown menu, na de status badge.

---

## Stap 9: List View — Ticket Naam Layout

**Bestand:** `src/components/reserveringen/ReservationListView.tsx`

Huidige shift badge (`w-10 justify-center`) is te smal voor langere namen. Wijzig:
- `min-w-[80px] max-w-[120px] truncate` zodat "early dinner" op 1 regel past
- Verwijder `w-10`-restrictie

---

## Stap 10: Status Filter Volgorde

**Bestand:** `src/components/reserveringen/ReservationFilters.tsx`

Huidige volgorde leest uit `STATUS_CONFIG` entries (objectvolgorde). Forceer expliciete volgorde:

```typescript
const statusOrder: ReservationStatus[] = [
  'draft', 'confirmed', 'pending_payment', 'option',
  'seated', 'completed', 'no_show', 'cancelled'
];
```

Labels updaten automatisch door stap 1 (Ingecheckt, Uitgecheckt).

---

## Stap 11: Grid View — Timeline Bereik op Basis van Shifts

**Bestand:** `src/components/reserveringen/ReservationGridView.tsx`

**Huidige situatie:** `defaultGridConfig` is hardcoded: `startHour: 13, endHour: 25`.

**Gewenste:** Dynamisch op basis van actieve shifts voor die dag.

**Aanpak:**
1. In `ReservationGridView`, gebruik de al beschikbare `useShifts(locationId)` of `useEffectiveShiftSchedule(locationId, dateString)` om shift-tijden te laden
2. Bereken `startHour = Math.floor(earliestShiftStart / 60) - 0.5` (30min buffer)
3. Bereken `endHour = Math.ceil(latestShiftEnd / 60) + 0.5` (30min buffer)
4. Als er geen shifts zijn: toon EmptyState ("Geen shifts actief voor deze dag")
5. De shift start/end_time is `"HH:MM:SS"` format — parse met `timeToMinutes()`

**Fallback:** Als er geen shifts data is (loading/error), gebruik `defaultGridConfig`.

---

## Stap 12: Grid View — Dag-afkortingen Compacter

**Bestand:** `src/components/reserveringen/DateNavigator.tsx` (vermoedelijk)

Verander dag-afkortingen van 3 letters (woe, don, vri) naar 2 letters (wo, do, vr). Gebruik `date-fns` format met `'EEEEEE'` (ultra-short) of handmatige mapping.

---

## Stap 13: Create Sheet — Shift/Ticket Vereenvoudiging

**Bestand:** `src/components/reservations/CreateReservationSheet.tsx`

### 13A. Auto-detect shift op basis van tijdslot
1. Na tijdslot wijziging: zoek welke shift `startTime` bevat (shift waar `start_time <= startTime < end_time`)
2. Auto-set `shiftId` op die shift
3. Toon shift naam als **read-only label** (niet als dropdown)
4. Als geen shift matcht: toon waarschuwing "Geen shift voor dit tijdslot"

### 13B. Auto-selecteer ticket
1. Na shift bepaling: laad `shiftTickets`
2. Als er precies 1 actief ticket is: auto-set `ticketId`, toon niet
3. Als meerdere: toon select (toekomstig scenario)

### 13C. Verwijder squeeze toggle
- Verwijder de `Switch` + `Label` voor squeeze (regels 323-326)
- Verwijder `squeeze` state en prop uit `handleSubmit`

### 13D. Stappen polish
- Step indicator: toon 3 cirkels/stappen bovenaan met actieve markering
- Formulier spacing: `space-y-5` (was space-y-4)
- Bevestigingsscherm: netter samenvatting met leesbare datum

---

## Stap 14: Audit Log — Datumformaat

**Bestand:** `src/components/reservations/AuditLogTimeline.tsx`

De `option_extended` actie toont raw `new_expires_at` timestamp. Format met `formatDateTimeCompact()` voor leesbare output.

---

## Bestanden Overzicht

| Bestand | Actie |
|---------|-------|
| `src/types/reservation.ts` | Status labels: seated -> Ingecheckt, completed -> Uitgecheckt |
| `src/lib/reservationUtils.ts` | Nieuwe `formatTime()` utility |
| `src/lib/datetime.ts` | Nieuwe `formatDateShort()` utility |
| `src/components/polar/DetailPanel.tsx` | Fixed overlay ipv inline panel, click-outside, shadow |
| `src/components/reservations/ReservationDetailPanel.tsx` | Tijd formatting, spacing, tafelnaam |
| `src/components/reservations/CustomerCard.tsx` | Naam groter, stats compacter, datumformat |
| `src/components/reservations/RiskScoreSection.tsx` | Factor labels breder/tooltip, bars dunner |
| `src/components/reserveringen/ReservationListView.tsx` | Check-in/out knoppen, ticket naam, shift badge |
| `src/components/reserveringen/ReservationFilters.tsx` | Status volgorde expliciet |
| `src/components/reserveringen/ReservationGridView.tsx` | Dynamisch timeline bereik |
| `src/components/reserveringen/DateNavigator.tsx` | Dag-afkortingen 2 letters |
| `src/components/reservations/CreateReservationSheet.tsx` | Auto shift/ticket, squeeze weg, step indicator |
| `src/components/reservations/AuditLogTimeline.tsx` | Expiry datum formatting |
| `src/pages/Reserveringen.tsx` | Layout aanpassen voor overlay panel |

---

## Implementatievolgorde

1. Status labels (seated/completed) — propageert overal
2. `formatTime()` + `formatDateShort()` utilities
3. Detail Panel: overlay gedrag + click-outside
4. Detail Panel content: spacing, tijd/datum formatting
5. CustomerCard + RiskScoreSection polish
6. List View: check-in/out knoppen + ticket naam
7. Status filter volgorde
8. Grid View: dynamisch timeline bereik
9. DateNavigator: dag-afkortingen
10. Create Sheet: shift/ticket auto-selectie, squeeze weg, stappen polish
11. Audit Log: datum formatting

---

## Technische Notities

### DetailPanel Overlay Pattern
Het huidige inline-panel patroon (flex-shrink-0) wordt vervangen door een fixed overlay. Dit is een **bewuste architectuur-wijziging**: de Reserveringen pagina hoeft de panel-state niet meer te gebruiken om de main content te resizen. Het panel zweeft over de content heen, zoals een Stripe/Linear detail drawer.

De `DetailPanel` component wordt generiek aangepast zodat andere modules het ook gebruiken.

### Shift-based Timeline
De `useShifts` hook retourneert `start_time` en `end_time` als `"HH:MM:SS"`. We gebruiken `timeToMinutes()` (al beschikbaar) om het bereik te berekenen. Buffer van 30 minuten (0.5 uur) aan beide kanten.

### Status Kleur Consistentie
De `STATUS_CONFIG` in `reservation.ts` is de single source of truth. Grid View blocks gebruiken hun eigen `getBlockStyles()` functie — deze moet geverifieerd worden tegen STATUS_CONFIG kleuren. Specifiek:
- `seated` (Ingecheckt): emerald-kleuren in Grid, maar `text-primary / bg-primary/15` in STATUS_CONFIG
- Dit is een bewust verschil (Grid blocks vs badges), maar moet consistent zijn binnen elke view

### Enterprise Design Compliance
Alle wijzigingen volgen:
- Geen hardcoded hex kleuren — alleen design tokens
- `rounded-button` (8px) voor interactieve elementen
- `shadow-xl` voor overlay panels (niet `shadow-sm`)
- `text-label text-muted-foreground` voor form labels
- `tabular-nums` voor numerieke data
- Tooltips voor getrunceerde tekst
