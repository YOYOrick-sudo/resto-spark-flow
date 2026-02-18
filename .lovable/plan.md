

# Fase 4.5B — Auto-Assign + UI Integratie (implementatieplan)

De v3 spec is goedgekeurd met 4 kleine toevoegingen. Dit plan beschrijft de implementatievolgorde.

---

## Stap 1: Database migratie

Eén migratie met drie wijzigingen:

**1a.** `table_group_id` kolom toevoegen aan `reservations`:
- `ALTER TABLE reservations ADD COLUMN table_group_id UUID REFERENCES table_groups(id) DEFAULT NULL;`

**1b.** `move_reservation_table` RPC aanpassen:
- Parameter `_new_table_id UUID` wordt `_new_table_id UUID DEFAULT NULL`
- Status check verbreden: `IF _r.status IN ('cancelled', 'no_show', 'completed') THEN RAISE`
- NULL-branch toevoegen: als `_new_table_id IS NULL`, dan `table_id = NULL, table_group_id = NULL` + audit log entry "table_unassigned"
- Bij niet-NULL: ook `table_group_id = NULL` resetten (handmatige verplaatsing verwijdert groep-toewijzing)

**1c.** `assign_best_table` RPC aanmaken:
- Volledige functie conform v3 spec
- Scoring constanten: `WEIGHT_CAPACITY = 60`, `WEIGHT_AREA_ORDER = 40`
- Twee modes: preview (zonder reservation_id) en commit (met reservation_id + advisory lock + hercheck)
- Overlap check inclusief tafelgroep-members via CTE
- Buffer uit `COALESCE(shift_tickets.override_buffer_minutes, tickets.buffer_minutes, 0)`
- Area filtering via `shift_tickets.areas`
- Audit log bij commit met scores en alternatieven

---

## Stap 2: TypeScript types + hook

**2a.** `src/types/reservation.ts` — `AssignTableParams` en `AssignTableResult` interfaces toevoegen

**2b.** `src/hooks/useAssignTable.ts` — nieuwe hook:
- `useMutation` die `supabase.rpc('assign_best_table', ...)` aanroept
- Bij commit mode: invalidate `['reservations', location_id]` en `['audit-log']`
- Toast feedback: succes/warning/error
- Preview mode: geen cache invalidatie

---

## Stap 3: CreateReservationSheet aanpassen

**3a.** Tafel dropdown uitbreiden:
- Eerste optie: "Automatisch toewijzen" (met Sparkles icoon)
- Default selectie op basis van `reservation_settings.auto_assign`
- Filtering: `min_capacity <= party_size <= max_capacity`
- Filtering: alleen tafels in areas van actieve shift/ticket (via `shift_tickets.areas`)
- Bezette tafels disabled met "(bezet HH:MM-HH:MM)"
- `effectiveDuration` berekenen via useMemo

**3b.** Preview suggestie:
- Debounced (500ms) `assign_best_table` preview call
- Stale response check via `latestRequestRef`
- Toon "Suggestie: Tafel X (Area)" of "Geen tafel beschikbaar"

**3c.** Submit flow:
- Auto-assign: aanmaken zonder table_id, dan `assign_best_table` commit mode
- Handmatig: aanmaken met gekozen table_id (ongewijzigd)
- Toast feedback

---

## Stap 4: WalkInSheet fixen + auto-assign

**4a.** Shift detectie fix:
- Huidige code `shifts.find(s => s.is_active)` vervangen door tijdgebaseerde matching
- Check `days_of_week.includes(currentDow)` + `currentTime >= start_time && currentTime <= end_time`
- Melding als geen actieve shift

**4b.** Auto-assign na aanmaken:
- Na succesvolle insert: `assign_best_table` commit mode aanroepen
- Toast feedback

---

## Stap 5: Unassigned indicators

**5a.** Grid View — collapsible badge-list:
- Boven area-headers een "Niet toegewezen" sectie tonen (alleen als er unassigned reserveringen zijn)
- Horizontale kaartjes met oranje border: tijd, party size, gastnaam, "Wijs toe" knop
- Collapsible via Radix Collapsible
- "Wijs toe" roept `assign_best_table` commit mode aan

**5b.** List View — klikbare "Niet toegewezen":
- `tableLabel` kolom: als `table_id` null, toon oranje klikbare "Niet toegewezen" tekst
- Klik roept `assign_best_table` aan

**5c.** Detail Panel — tafel sectie:
- Bij `table_id IS NULL`: oranje InfoAlert + "Automatisch toewijzen" knop + "Handmatig kiezen" knop
- Bij `table_id IS NOT NULL`: tafelnaam + area + "Wijzig tafel" + "Verwijder toewijzing"
- "Verwijder toewijzing" roept `move_reservation_table` aan met NULL

---

## Stap 6: ReservationActions uitbreiden

- "Tafel wijzigen" actie toevoegen bij `draft`, `option`, `pending_payment`, en `confirmed` (niet alleen `seated`)
- TableMoveDialog werkt al correct, alleen de action-button ontbreekt bij andere statussen

---

## Technische details

### Bestanden die aangemaakt worden:
- `src/hooks/useAssignTable.ts`
- `supabase/migrations/[timestamp]_auto_assign.sql`

### Bestanden die gewijzigd worden:
- `src/types/reservation.ts` (AssignTableParams/Result types)
- `src/components/reservations/CreateReservationSheet.tsx` (tafel dropdown, preview, submit flow)
- `src/components/reservations/ReservationDetailPanel.tsx` (tafel sectie toevoegen)
- `src/components/reservations/ReservationActions.tsx` (tafel wijzigen bij meer statussen)
- `src/components/reserveringen/ReservationGridView.tsx` (unassigned badge-list)
- `src/components/reserveringen/ReservationListView.tsx` (klikbare "Niet toegewezen")
- `src/hooks/useMoveTable.ts` (cache invalidatie aanpassen voor table_group_id)

### Dependencies:
- Geen nieuwe packages nodig
- Lucide `Sparkles` icoon al beschikbaar

