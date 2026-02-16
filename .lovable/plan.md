
# Fase 4.6 — Reservation Model + Status Machine + AI Feature 1

## Checkpoint Antwoorden

### 1. Mock data die vervangen moet worden
Ja, `src/data/reservations.ts` (1172 regels) bevat mock types, mock data, en helper functies. **10 bestanden** importeren hieruit:
- `src/pages/Reserveringen.tsx` — mockReservations, helpers, types
- `src/pages/Dashboard.tsx` — mockReservations
- `src/pages/settings/reserveringen/SettingsReserveringenShiftTijden.tsx` — mockPacingSettings
- `src/pages/settings/reserveringen/SettingsReserveringenPacing.tsx` — mockPacingSettings, mockTables
- `src/components/reserveringen/ReservationGridView.tsx` — helpers, types
- `src/components/reserveringen/ReservationListView.tsx` — helpers, types
- `src/components/reserveringen/ReservationBlock.tsx` — types, GridTimeConfig
- `src/components/reserveringen/TableRow.tsx` — types, GridTimeConfig
- `src/components/reserveringen/ReservationFilters.tsx` — ReservationStatus type
- `src/components/reserveringen/QuickReservationPanel.tsx` — helpers

**Actie in deze fase**: De mock data wordt NIET verwijderd (UI refactor = 4.7). Wel worden de nieuwe types in `src/types/reservation.ts` aangemaakt. De bestaande UI blijft werken op mock data tot 4.7.

### 2. create_reservation RPC: SECURITY DEFINER
Bevestigd. SECURITY DEFINER is noodzakelijk omdat:
- De audit_log tabel geen directe INSERT RLS policy heeft (append-only via functies)
- De functie moet altijd naar audit_log kunnen schrijven, ongeacht de aanroepende user
- Zelfde patroon als `transition_reservation_status`

### 3. shift_risk_summary view
De query is correct. Eén aanpassing: de view moet `status IN ('confirmed', 'option', 'pending_payment')` filteren, niet 'seated' (seated gasten zijn al aanwezig, geen no-show risico meer).

### 4. walk_in channel
Wordt toegevoegd aan `_shared/availabilityEngine.ts` channel type. De engine hoeft geen speciale logica voor walk_in te hebben — walk-ins gaan niet door de availability check.

### 5. Trigger idempotentie
Alle triggers gebruiken `NEW.status IS DISTINCT FROM OLD.status` guards. Dubbel uitvoeren levert geen foute data op:
- `trg_update_customer_stats`: increment alleen bij statuswijziging (guard)
- `trg_calculate_no_show_risk`: overschrijft score (idempotent)
- `trg_audit_reservation_update`: logt dezelfde wijziging nogmaals (acceptabel, maar guard voorkomt dit)

### 6. pg_trgm extension
**Niet geactiveerd.** Moet via migratie worden geactiveerd (`CREATE EXTENSION IF NOT EXISTS pg_trgm`) voor fuzzy customer search index.

## Implementatieplan

### Deel 1: Database Migratie (SQL)

Eén grote migratie met:

**Extensions**
- `CREATE EXTENSION IF NOT EXISTS pg_trgm`

**Enums**
- `reservation_status` (8 waarden)
- `reservation_channel` (6 waarden incl. walk_in)

**Tabellen**
- `customers` — met partial unique indexes op email en phone, CHECK constraint voor minimaal 1 contactmethode, trigram index op naam
- `reservations` — met alle kolommen uit de specificatie, indexes op location+date, customer, shift+date, status, manage_token, table+date
- `audit_log` — append-only, indexes op entity en location

**Functies**
- `calculate_no_show_risk(_reservation_id UUID)` — PL/pgSQL gewogen score berekening
- `transition_reservation_status(...)` — SECURITY DEFINER, status machine met hardcoded transitiematrix, audit logging
- `create_reservation(...)` — SECURITY DEFINER, berekent end_time, valideert initial_status, audit logging
- `fn_update_customer_stats()` — trigger functie voor customer statistieken
- `fn_calculate_no_show_risk()` — trigger functie die calculate_no_show_risk aanroept
- `fn_audit_reservation_update()` — trigger functie voor audit logging van veldwijzigingen

**Triggers**
- `trg_update_customer_stats` op reservations (AFTER UPDATE, wanneer status wijzigt)
- `trg_calculate_no_show_risk` op reservations (AFTER INSERT of UPDATE van customer_id, party_size, channel, reservation_date)
- `trg_audit_reservation_update` op reservations (AFTER UPDATE, logt veldwijzigingen behalve status en updated_at)
- `trg_reservations_updated_at` op reservations (BEFORE UPDATE, zet updated_at)

**View**
- `shift_risk_summary` — aggregeert risicoscores per shift+datum

**RLS**
- `customers`: SELECT en ALL policies via user_location_roles
- `reservations`: SELECT en ALL policies via user_location_roles
- `audit_log`: SELECT only via user_location_roles, geen INSERT/UPDATE/DELETE policies (via SECURITY DEFINER functies)

**Realtime**
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations` — voor live updates in de UI later

### Deel 2: Availability Engine Update

**`supabase/functions/_shared/availabilityEngine.ts`**
- Voeg `'walk_in'` toe aan channel type
- Vervang reservations stub (lege array op regel 423) door echte query:
  - Query `reservations` tabel met status IN ('confirmed', 'seated', 'option', 'pending_payment')
  - Filter op location_id, reservation_date
  - Map naar ExistingReservation interface

**`supabase/functions/check-availability/index.ts`**
- Geen wijzigingen nodig (gebruikt al data.reservations uit loadEngineData)

**`supabase/functions/diagnose-slot/index.ts`**
- Geen wijzigingen nodig (gebruikt al data.reservations uit loadEngineData)

### Deel 3: NoShowRisk Signal Provider

**`supabase/functions/evaluate-signals/index.ts`**
- Voeg NoShowRiskSignalProvider toe als inline provider (zelfde patroon als configProvider en onboardingProvider)
- Twee signals: `high_noshow_risk_shift` (warning) en `high_risk_reservations_today` (info)
- Entitlement guard: alleen als reservations module enabled

### Deel 4: React Types en Hooks

**`src/types/reservation.ts`** (nieuw)
- ReservationStatus, ReservationChannel types
- Reservation, Customer, AuditLogEntry interfaces
- ALLOWED_TRANSITIONS matrix

**`src/lib/queryKeys.ts`** (update)
- Voeg 7 nieuwe keys toe: reservations, reservation, customers, customer, auditLog, customerReservations, shiftRiskSummary

**Hooks** (allemaal nieuw):
- `src/hooks/useReservations.ts` — useQuery met joins
- `src/hooks/useReservation.ts` — single reservation
- `src/hooks/useCreateReservation.ts` — useMutation op create_reservation RPC
- `src/hooks/useTransitionStatus.ts` — useMutation op transition_reservation_status RPC
- `src/hooks/useCustomers.ts` — useQuery met debounced search
- `src/hooks/useCustomer.ts` — single customer
- `src/hooks/useCreateCustomer.ts` — useMutation
- `src/hooks/useUpdateCustomer.ts` — useMutation
- `src/hooks/useAuditLog.ts` — useQuery voor audit entries
- `src/hooks/useReservationsByCustomer.ts` — bezoekhistorie

### Deel 5: Geen UI wijzigingen

De bestaande reserveringen UI (`src/pages/Reserveringen.tsx` en componenten) blijft ongewijzigd op mock data. Migratie naar echte data gebeurt in Fase 4.7.

## Technische details

### start_time < end_time constraint
De CHECK constraint `start_time < end_time` wordt NIET toegevoegd. Shifts kunnen over middernacht gaan (bijv. 22:00-02:00). De validatie gebeurt in de `create_reservation` RPC die `end_time` berekent.

### Audit log insert pattern
De audit_log heeft geen directe INSERT RLS policy. Inserts gaan uitsluitend via SECURITY DEFINER functies (`create_reservation`, `transition_reservation_status`, en de `fn_audit_reservation_update` trigger functie). Dit garandeert dat de audit log niet te manipuleren is door clients.

### Customer deduplicatie
Partial unique indexes op `(location_id, email) WHERE email IS NOT NULL` en `(location_id, phone_number) WHERE phone_number IS NOT NULL` voorkomen duplicaten per locatie. De `create_reservation` RPC doet GEEN automatische customer-dedup — dat is de verantwoordelijkheid van de UI/caller.

### Risk score bij walk-ins
Walk-ins krijgen ook een risicoscore via de trigger, maar deze is academisch (walk-in gasten zijn al fysiek aanwezig). De score wordt berekend maar niet gebruikt voor walk-ins.

## Implementatievolgorde

1. Database migratie (enums, tabellen, functies, triggers, view, RLS)
2. `_shared/availabilityEngine.ts` — walk_in channel + reservations query
3. `evaluate-signals/index.ts` — NoShowRisk provider
4. `src/types/reservation.ts` — client types
5. `src/lib/queryKeys.ts` — nieuwe keys
6. Alle hooks (10 bestanden)
7. Deploy edge functions

## Bestanden die wijzigen/ontstaan

| Bestand | Actie |
|---------|-------|
| Database migratie | SQL (enums, 3 tabellen, 6 functies, 4 triggers, 1 view, RLS) |
| `supabase/functions/_shared/availabilityEngine.ts` | walk_in channel + reservations query |
| `supabase/functions/evaluate-signals/index.ts` | NoShowRisk signal provider |
| `src/types/reservation.ts` | Nieuw — client types |
| `src/lib/queryKeys.ts` | Update — 7 nieuwe keys |
| `src/hooks/useReservations.ts` | Nieuw |
| `src/hooks/useReservation.ts` | Nieuw |
| `src/hooks/useCreateReservation.ts` | Nieuw |
| `src/hooks/useTransitionStatus.ts` | Nieuw |
| `src/hooks/useCustomers.ts` | Nieuw |
| `src/hooks/useCustomer.ts` | Nieuw |
| `src/hooks/useCreateCustomer.ts` | Nieuw |
| `src/hooks/useUpdateCustomer.ts` | Nieuw |
| `src/hooks/useAuditLog.ts` | Nieuw |
| `src/hooks/useReservationsByCustomer.ts` | Nieuw |
