

# Fase 4.11.5 — Pacing Override per Dag

## Samenvatting

Operators kunnen per dag per shift de pacing overschrijven via de bestaande `shift_exceptions` tabel. Vier nullable kolommen worden toegevoegd. De availability engine, RPC, en widget respecteren deze overrides. Een popover op het Grid laat operators snel aanpassen.

---

## 1. Database migratie

4 kolommen op `shift_exceptions`:

```sql
ALTER TABLE public.shift_exceptions
  ADD COLUMN override_pacing_limit_covers INTEGER,
  ADD COLUMN override_pacing_limit_arrivals INTEGER,
  ADD COLUMN override_max_covers_total INTEGER,
  ADD COLUMN override_online_booking_enabled BOOLEAN;
```

Geen constraints — NULL = gebruik standaard.

---

## 2. RPC: `get_effective_shift_schedule` uitbreiden

Return type krijgt 4 extra kolommen:

| Kolom | Logica |
|---|---|
| `effective_pacing_limit_covers` | `e.override_pacing_limit_covers` (NULL als niet ingesteld) |
| `effective_pacing_limit_arrivals` | `e.override_pacing_limit_arrivals` (NULL als niet ingesteld) |
| `effective_max_covers_total` | `e.override_max_covers_total` (NULL als niet ingesteld) |
| `effective_online_booking_enabled` | `COALESCE(e.override_online_booking_enabled, true)` |

Geen COALESCE met shift-level default — shifts hebben geen pacing kolommen (pacing zit op `shift_tickets.pacing_limit`). De override is een **shift-level cap** die boven de per-ticket pacing zit.

---

## 3. Availability Engine

### `_shared/availabilityEngine.ts`

- `EffectiveShift` type: voeg 4 velden toe (`effective_pacing_limit_covers`, `effective_pacing_limit_arrivals`, `effective_max_covers_total`, `effective_online_booking_enabled`)
- `ReasonCode`: voeg `'shift_capacity_reached'` en `'online_booking_disabled'` toe
- `loadEngineData`: lees de 4 override kolommen uit `shift_exceptions` query en merge in `activeShifts`

### `check-availability/index.ts`

In `checkAvailability()`, vóór de per-ticket loop per shift:

1. **Online booking check**: als `shift.effective_online_booking_enabled === false` en `channel !== 'operator'` → skip gehele shift (geen slots genereren)
2. **Max covers total check**: als `shift.effective_max_covers_total` is ingesteld → tel alle bevestigde covers voor die shift+dag. Als totaal >= max → alle slots unavailable met `shift_capacity_reached`
3. **Per-interval pacing override**: als `shift.effective_pacing_limit_covers` is ingesteld → gebruik als **plafond** naast de bestaande `config.pacing_limit` check (meest restrictieve wint)

### Andere edge functions

Zelfde logica toepassen in `public-booking-api`, `waitlist-invite-engine`, `waitlist-accept` — zij lezen dezelfde `loadEngineData` dus de shift-level overrides komen automatisch mee. Alleen de online_booking_enabled en max_covers checks moeten toegevoegd worden in hun evaluatie loops.

---

## 4. UI — Pacing Override Popover

### Nieuw: `PacingOverridePopover.tsx`

Popover (Radix) met:
- Covers per interval: number input
- Arrivals per interval: number input  
- Max covers totaal: number input (optioneel)
- Online boeken: toggle
- [Opslaan] → **upsert** `shift_exceptions` op `location_id + shift_id + exception_date`
  - Als record al bestaat: UPDATE alleen de 4 override kolommen
  - Als geen record: INSERT met `exception_type = 'modified'`
- [Reset] → zet 4 override kolommen op NULL (verwijder record niet — kan andere exception data bevatten)

### `ReservationGridView.tsx` aanpassen

Boven de bestaande pacing rij, per actieve shift een header balk:
- Toont: `"Diner (17:30-22:00) · Pacing: 40 covers [Aanpassen]"`
- Bij override actief → tekst blauw + indicator bolletje
- Klik "Aanpassen" → opent PacingOverridePopover

Vervang `getPacingLimitForTime()` (mock data) door echte shift exception data.

### Nieuw: `usePacingOverrides.ts`

- Query: `shift_exceptions` voor datum + locatie, select de 4 override kolommen
- Mutation: upsert op `location_id + shift_id + exception_date`
- Audit log bij opslaan/reset

---

## 5. Signals — evaluate-signals

Nieuw `pacingProvider` in providers array:
- "Pacing override actief: [shift] heeft [X] covers (standaard: [Y])" (info)
- "Pacing bereikt 80%: [shift] heeft [X]/[max] covers" (warning)
- "Online boeken uitgeschakeld voor [shift] vandaag" (info)

---

## 6. Audit Log

Bij pacing override upsert/reset → log naar `audit_log`:
- `pacing_override_updated` / `pacing_override_reset`

---

## Kritieke implementatiedetails

1. **Online booking disabled in widget**: `check-availability` skipt de shift voor non-operator channels. De widget ziet die shift niet → geen slots. Dit is de correcte plek — `public-booking-api` hoeft niet apart te checken want die roept `check-availability` aan.

2. **Upsert logica**: match op `location_id + shift_id + exception_date`. Een dag kan al een exception hebben (bijv. aangepaste tijden). De pacing override UPDATE die bestaande record, maakt geen nieuwe aan. Bij geen bestaand record: INSERT met `exception_type = 'modified'`.

3. **Pacing check volgorde**: shift-level override draait VÓÓR per-ticket check. `effective_max_covers_total` en `effective_pacing_limit_covers` worden gecheckt voordat de per-`config.pacing_limit` check draait.

---

## Bestanden

| Bestand | Actie |
|---|---|
| SQL migratie | 4 kolommen op `shift_exceptions` + RPC update |
| `supabase/functions/_shared/availabilityEngine.ts` | Types + loadEngineData uitbreiden |
| `supabase/functions/check-availability/index.ts` | Online booking + max covers + pacing override checks |
| `supabase/functions/public-booking-api/index.ts` | Zelfde checks |
| `supabase/functions/waitlist-invite-engine/index.ts` | Zelfde checks |
| `supabase/functions/waitlist-accept/index.ts` | Zelfde checks |
| `src/components/reserveringen/PacingOverridePopover.tsx` | **Nieuw** |
| `src/components/reserveringen/ReservationGridView.tsx` | Shift pacing header + vervang mock |
| `src/hooks/usePacingOverrides.ts` | **Nieuw** |
| `supabase/functions/evaluate-signals/index.ts` | pacingProvider toevoegen |
| `src/types/shifts.ts` | ShiftException type uitbreiden |

## Volgorde

1. DB migratie (kolommen + RPC)
2. `availabilityEngine.ts` types + data loader
3. `check-availability` + `public-booking-api` + waitlist functions
4. `PacingOverridePopover` + hook + Grid integratie
5. `evaluate-signals` pacingProvider
6. Types bijwerken

