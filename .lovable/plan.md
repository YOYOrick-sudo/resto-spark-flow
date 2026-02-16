

# Fase 4.5.B — Availability Hook + Diagnose Slot

## Overzicht

Drie deliverables: (1) gedeelde engine module, (2) diagnose-slot Edge Function, (3) twee React hooks. Geen UI.

## Bevestigingen

- `_shared/availabilityEngine.ts`: Bevestigd. Types, helpers en `loadEngineData` worden geextraheerd uit `check-availability/index.ts` naar dit gedeelde bestand. Beide Edge Functions importeren hieruit.
- `useDiagnoseSlot` als `useMutation`: Bevestigd. On-demand actie, geen auto-fetch.
- `setting_location` in diagnose output: Toegevoegd. Elke blocking constraint krijgt een leesbaar pad zoals `"Shift Diner → Regular Dinner → Pacing: 12 covers"`.

## Wat er gebouwd wordt

| # | Bestand | Type | Beschrijving |
|---|---------|------|-------------|
| 1 | `supabase/functions/_shared/availabilityEngine.ts` | Shared module | Types, time helpers, `loadEngineData`, `mapTicket` -- geextraheerd uit check-availability |
| 2 | `supabase/functions/check-availability/index.ts` | Refactor | Importeert types en data loader uit `_shared/`. Engine logica + HTTP handler blijven hier |
| 3 | `supabase/functions/diagnose-slot/index.ts` | Nieuwe Edge Function | Evalueert ALLE constraints voor een specifiek slot. Output bevat `blocking_constraints` met `setting_location`, plus `all_constraints` en `squeeze_possible` |
| 4 | `src/types/availability.ts` | TypeScript types | Client-side interfaces voor request/response van beide Edge Functions |
| 5 | `src/hooks/useCheckAvailability.ts` | React Hook | `useQuery` wrapper rond `check-availability`. Auto-channel detectie (operator/widget) |
| 6 | `src/hooks/useDiagnoseSlot.ts` | React Hook | `useMutation` wrapper rond `diagnose-slot`. On-demand diagnostiek |
| 7 | `src/lib/queryKeys.ts` | Update | Twee nieuwe keys: `availability` en `diagnoseSlot` |

## Diagnose-slot Output (met setting_location)

```text
{
  available: false,
  blocking_constraints: [
    {
      type: "pacing_full",
      detail: "12/12 covers in dit interval",
      current_value: 12,
      limit_value: 12,
      setting_location: "Shift Diner → Regular Dinner → Pacing"
    },
    {
      type: "tables_full",
      detail: "Geen tafel beschikbaar voor 6 personen",
      tables_checked: 8,
      tables_capacity_match: 2,
      tables_occupied: 2,
      setting_location: "Tafels → Restaurant (area)"
    }
  ],
  all_constraints: [
    { type: "booking_window", passed: true, setting_location: "Ticket Regular Dinner → Boekingsvenster" },
    { type: "party_size", passed: true, setting_location: "Shift Diner → Regular Dinner → Groepsgrootte" },
    { type: "channel_blocked", passed: true, setting_location: "Shift Diner → Regular Dinner → Kanalen" },
    { type: "pacing_full", passed: false, ... },
    { type: "max_covers", passed: true, setting_location: "Shift Diner → Regular Dinner → Zitplaatsen" },
    { type: "tables_full", passed: false, ... }
  ],
  squeeze_possible: true,
  squeeze_duration: 90
}
```

De `setting_location` is een leesbaar pad dat de operator vertelt WAAR de blokkerende instelling staat. Dit wordt opgebouwd uit shift name, ticket name, en constraint type.

## Technische details

### 1. _shared/availabilityEngine.ts

Bevat:
- Alle type interfaces (EffectiveShift, TicketData, ShiftTicketConfig, TableData, TableGroupData, ExistingReservation, EngineData)
- Time helpers (`timeToMinutes`, `minutesToTime`, `generateSlotTimes`, `getNowInTimezone`)
- `loadEngineData()` functie
- `mapTicket()` helper

### 2. check-availability refactor

Importeert types en data loading uit `_shared/availabilityEngine.ts`. Behoudt:
- Engine logica (`checkAvailability`, `evaluateSlot`, `trySqueezeOrFail`)
- Reservation helpers (`getReservationsInInterval`, `getShiftTotalCovers`)
- Table availability checks (`checkTableAvailability`, `isTableFree`)
- HTTP handler

### 3. diagnose-slot Edge Function

Verschil met check-availability:
- Input: specifiek slot (location_id, date, time, party_size, ticket_id) -- ticket_id is verplicht
- Evalueert ALLE 6 constraints, stopt niet bij eerste faal
- Elke constraint rapporteert: type, passed, detail, current_value, limit_value, setting_location
- Berekent squeeze_possible en squeeze_duration
- Auth: JWT verplicht + location access check (alleen operators)
- Hergebruikt `loadEngineData` uit `_shared/`

### 4. React Hooks

**useCheckAvailability:**
- `useQuery` met `supabase.functions.invoke('check-availability', { body })`
- Channel auto-detectie via `useAuth()`: ingelogd = 'operator', anders = 'widget'
- `enabled`: alleen als location_id, date, party_size aanwezig
- `staleTime`: 30 seconden

**useDiagnoseSlot:**
- `useMutation` met `supabase.functions.invoke('diagnose-slot', { body })`
- Retourneert `{ mutate: diagnose, data, isLoading, error }`
- Geen auto-fetch, alleen on-demand

### 5. Config.toml

Toevoegen:
```text
[functions.diagnose-slot]
verify_jwt = false
```

## Implementatievolgorde

1. `_shared/availabilityEngine.ts` -- extract types + data loader
2. Refactor `check-availability/index.ts` -- import uit _shared
3. `diagnose-slot/index.ts` -- nieuwe Edge Function
4. `src/types/availability.ts` -- client types
5. `src/lib/queryKeys.ts` -- nieuwe keys
6. `src/hooks/useCheckAvailability.ts`
7. `src/hooks/useDiagnoseSlot.ts`

