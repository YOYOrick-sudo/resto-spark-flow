

# Polish lijst Reserveringen — Herzien & Enterprise-ready

## Beoordeling van het originele plan

| # | Item | Origineel plan OK? | Aanpassing nodig? |
|---|---|---|---|
| 1 | Dag-afkortingen compacter | Ja, correct | Nee |
| 2 | Walk-in + Reservering knoppen | Ja, maar onvolledig | Ja — ook SearchBar moet mee-krimpen |
| 3 | Dark mode iconen | Te simpel | Ja — color-scheme is fragiel; punt 4 lost dit permanent op |
| 4 | Custom date/time pickers | Goed idee, maar scope was vaag | Ja — concreet uitgewerkt met bestaande patronen |
| 5 | Optimistic update na create | Gevaarlijk zoals voorgesteld | Ja — enterprise-aanpak in plaats van fragiele optimistic cache |
| 6 | Zoekfunctie | Code IS correct, maar niet getest | Ja — verifieer en robuuster maken |

---

## 1. Dag-afkortingen compacter

**Bestand:** `src/components/reserveringen/DateNavigator.tsx`

Huidige code heeft `min-w-[60px]` op elke quick-day knop terwijl de labels maar 2 tekens zijn ("do", "vr"). De min-width forceert onnodige ruimte.

- Verwijder `min-w-[60px]` uit de className van NestoButton (regel 70)
- Knoppen krimpen nu naar hun natuurlijke breedte

---

## 2. Walk-in + Reservering altijd op dezelfde rij

**Bestand:** `src/pages/Reserveringen.tsx`

Huidige toolbar (regel ~107): `flex items-center gap-4 flex-wrap` — het `flex-wrap` veroorzaakt dat knoppen naar een volgende rij wrappen.

- Verwijder `flex-wrap` van de toolbar div
- Voeg `shrink-0` toe aan Walk-in en Reservering knoppen (ze mogen nooit krimpen)
- SearchBar wrapper: verander `flex-1 max-w-xs` naar `flex-1 min-w-0 max-w-xs` zodat de zoekbalk krimpt in plaats van de knoppen weg te duwen
- Gap verkleinen van `gap-4` naar `gap-3` voor compactere toolbar

---

## 3. Dark mode iconen (opgelost door punt 4)

Het probleem met onzichtbare kalender/klok-iconen op native inputs verdwijnt volledig wanneer we de native pickers vervangen door custom componenten (punt 4). Geen aparte fix nodig.

---

## 4. Custom date & time pickers

**Bestand:** `src/components/reservations/CreateReservationSheet.tsx`

### Datumpicker (regels 352-353)
Vervang `<Input type="date">` door een ShadCN Popover + Calendar:
- Trigger-knop toont datum in leesbaar formaat: "wo 18 feb" (via `date-fns/nl` locale)
- CalendarIcon als visuele indicator
- Calendar component met `pointer-events-auto` (vereist voor popover)
- State wijzigt van string `date` naar Date object, format naar string bij submit

### Tijdpicker (regels 356-357)
Vervang `<Input type="time">` door een NestoSelect met 15-minuten intervallen:
- Hergebruik het `generateTimeOptions()` patroon uit `QuickReservationPanel.tsx`
- Tijdbereik: 11:00 t/m 23:45 in stappen van 15 minuten
- Clock icon als visuele context
- Styling identiek aan andere Select componenten in het formulier

### Technische details
- `date` state verandert van `string` naar `Date | undefined`
- Bij submit: `format(date, 'yyyy-MM-dd')` voor de RPC call
- Imports toevoegen: `Calendar`, `Popover`, `PopoverTrigger`, `PopoverContent`, `CalendarIcon`, `Clock`
- `date-fns/nl` locale voor Nederlandse datumweergave (al beschikbaar)

---

## 5. Snellere feedback na aanmaken reservering

**Bestand:** `src/hooks/useCreateReservation.ts`

### Waarom GEEN optimistic update voor create
Een optimistic update vereist het construeren van een compleet `Reservation` object inclusief alle joined velden (`customer`, `shift_name`, `ticket_name`, `table_label`, `end_time`). Dit is fragiel:
- `end_time` wordt server-side berekend (op basis van ticket duration)
- Het tijdelijke object zou flikkeren wanneer de echte data binnenkomt
- Bij een fout moet een complex rollback plaatsvinden

### Enterprise-aanpak: prefix-invalidatie (al deels aanwezig)
De huidige `onSuccess` invalideert al op `['reservations', location_id]` prefix, wat correct is. Het probleem is dat de UI pas update nadat de RPC + refetch klaar zijn.

Verbetering:
- Sheet sluit al onmiddellijk na `mutateAsync` success (dit werkt al correct)
- Voeg `invalidateQueries` toe met `refetchType: 'all'` om actieve en inactieve queries te forceren
- Gebruik React Query's `isFetching` state om een subtiele loading indicator te tonen in de lijst (optioneel, niet blokkerend)

Dit is de juiste balans: de sheet sluit direct, de toast bevestigt, en de lijst ververst op de achtergrond.

---

## 6. Zoekfunctie verbeteren

**Bestand:** `src/pages/Reserveringen.tsx`

### Analyse
De zoeklogica (regels 49-59) IS correct geimplementeerd:
- Filtert op `getDisplayName(r)` (customer naam)
- Filtert op `phone_number` en `email`
- `getDisplayName()` handelt walk-ins en ontbrekende customers correct af

### Verbetering: extra zoekvelden
- Voeg matching toe op `r.guest_name` (direct veld op reservering, voor externe boekingen)
- Voeg matching toe op `r.table_label` (zoeken op tafelnummer)
- Voeg matching toe op `r.internal_notes` (zoeken op interne notities)

Dit maakt de zoekfunctie robuuster zonder de bestaande logica te breken.

---

## Samenvatting wijzigingen per bestand

| Bestand | Wat |
|---|---|
| `DateNavigator.tsx` | min-w verwijderen |
| `Reserveringen.tsx` | flex-wrap weg, shrink-0 knoppen, zoekfilter uitbreiden |
| `CreateReservationSheet.tsx` | Popover+Calendar datumpicker, Select tijdpicker |
| `useCreateReservation.ts` | refetchType: 'all' toevoegen |

