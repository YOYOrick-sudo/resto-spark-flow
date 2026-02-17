
# Fase 4.8 — Check-in/Seat Flow met Regels

## Overzicht
Configureerbare check-in regels, automatische no-show marking, tafel wijzigen, en quick check-in interacties.

---

## Stap 1: Database Migratie

Eén migratie met alle schema-wijzigingen:

### 1A. Nieuwe kolommen op `reservation_settings`
```sql
ALTER TABLE public.reservation_settings
  ADD COLUMN checkin_window_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN no_show_after_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN auto_no_show_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN move_to_now_on_checkin BOOLEAN NOT NULL DEFAULT false;
```

### 1B. `checked_in_at` op `reservations`
```sql
ALTER TABLE public.reservations
  ADD COLUMN checked_in_at TIMESTAMPTZ;
```

### 1C. Partial index voor no-show candidates
```sql
CREATE INDEX idx_reservations_noshow_candidates
  ON reservations (reservation_date, status, start_time)
  WHERE status = 'confirmed';
```

### 1D. `fn_auto_mark_no_shows` SQL functie

Met timezone-correctie via JOIN op `locations` en correcte `changes` + `actor_type` kolommen op `audit_log`:

```sql
CREATE OR REPLACE FUNCTION fn_auto_mark_no_shows()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _count INTEGER := 0; _r RECORD;
BEGIN
  FOR _r IN
    SELECT r.id, r.location_id, r.start_time, r.reservation_date,
           rs.no_show_after_minutes
    FROM reservations r
    JOIN reservation_settings rs ON rs.location_id = r.location_id
    JOIN locations l ON l.id = r.location_id
    WHERE r.status = 'confirmed'
      AND rs.auto_no_show_enabled = true
      AND r.reservation_date <= CURRENT_DATE
      AND (r.reservation_date + r.start_time
           + (rs.no_show_after_minutes || ' minutes')::INTERVAL)
          < (NOW() AT TIME ZONE l.timezone)
  LOOP
    UPDATE reservations
    SET status = 'no_show', updated_at = NOW()
    WHERE id = _r.id AND status = 'confirmed';

    INSERT INTO audit_log (
      entity_type, entity_id, location_id,
      action, actor_id, actor_type,
      changes, metadata
    ) VALUES (
      'reservation', _r.id, _r.location_id,
      'status_change', NULL, 'system',
      jsonb_build_object('old_status','confirmed','new_status','no_show'),
      jsonb_build_object('reason',
        'Automatisch na ' || _r.no_show_after_minutes || ' minuten')
    );
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END; $$;
```

### 1E. pg_cron job
```sql
SELECT cron.schedule('auto-no-show','* * * * *',
  $$SELECT fn_auto_mark_no_shows()$$);
```

### 1F. `move_reservation_table` RPC

```sql
CREATE OR REPLACE FUNCTION move_reservation_table(
  _reservation_id UUID,
  _new_table_id UUID,
  _actor_id UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _r reservations%ROWTYPE; _actor UUID; _old_table_id UUID;
BEGIN
  _actor := COALESCE(_actor_id, auth.uid());
  SELECT * INTO _r FROM reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservering niet gevonden'; END IF;
  IF _r.status NOT IN ('seated','confirmed') THEN
    RAISE EXCEPTION 'Tafel wijzigen alleen bij seated of confirmed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM tables t JOIN areas a ON a.id = t.area_id
    WHERE t.id = _new_table_id AND a.location_id = _r.location_id
      AND t.is_active = true
  ) THEN RAISE EXCEPTION 'Tafel niet gevonden of niet actief'; END IF;
  _old_table_id := _r.table_id;
  UPDATE reservations SET table_id = _new_table_id, updated_at = NOW()
  WHERE id = _reservation_id;
  INSERT INTO audit_log (
    entity_type, entity_id, location_id,
    action, actor_id, actor_type, changes, metadata
  ) VALUES (
    'reservation', _reservation_id, _r.location_id,
    'table_moved', _actor, 'user',
    jsonb_build_object('old_table_id',_old_table_id,'new_table_id',_new_table_id),
    '{}'::jsonb
  );
END; $$;
```

### 1G. Update `transition_reservation_status` RPC

Uitbreiding met:
- Check-in window validatie bij `_new_status = 'seated'` en `_is_override = false`
- `checked_in_at = NOW()` bij transitie naar `seated`
- `move_to_now_on_checkin` logica: update `start_time` + log originele tijd
- `updated_at = NOW()` bij alle updates

Pseudo-code voor de seated-specifieke logica (toe te voegen na `_allowed` check, voor de UPDATE):

```sql
IF _new_status = 'seated' THEN
  -- Check-in window validatie (alleen als geen override)
  IF NOT _is_override THEN
    SELECT checkin_window_minutes INTO _checkin_window
    FROM reservation_settings WHERE location_id = _r.location_id;
    
    SELECT timezone INTO _tz FROM locations WHERE id = _r.location_id;
    
    IF (NOW() AT TIME ZONE COALESCE(_tz,'Europe/Amsterdam'))
       < (_r.reservation_date + _r.start_time
          - (_checkin_window || ' minutes')::INTERVAL) THEN
      RAISE EXCEPTION 'Te vroeg om in te checken. Reservering begint om %',
        _r.start_time;
    END IF;
  END IF;

  -- Move-to-now logica
  SELECT move_to_now_on_checkin INTO _move_to_now
  FROM reservation_settings WHERE location_id = _r.location_id;
  
  IF _move_to_now THEN
    _original_start := _r.start_time;
    UPDATE reservations SET
      status = _new_status,
      checked_in_at = NOW(),
      start_time = (NOW() AT TIME ZONE COALESCE(_tz,'Europe/Amsterdam'))::TIME,
      updated_at = NOW()
    WHERE id = _reservation_id;
    _metadata := _metadata || jsonb_build_object(
      'move_to_now', true, 'original_start_time', _original_start::text);
  ELSE
    UPDATE reservations SET
      status = _new_status,
      checked_in_at = NOW(),
      updated_at = NOW()
    WHERE id = _reservation_id;
  END IF;
ELSE
  UPDATE reservations SET status = _new_status, updated_at = NOW()
  WHERE id = _reservation_id;
END IF;
```

---

## Stap 2: TypeScript Types

### `src/types/reservation.ts`
- Voeg `checked_in_at?: string | null` toe aan `Reservation` interface (regel ~46)

### `src/types/reservations.ts`
- Voeg 4 kolommen toe aan `ReservationSettings` interface:
  ```typescript
  checkin_window_minutes: number;
  no_show_after_minutes: number;
  auto_no_show_enabled: boolean;
  move_to_now_on_checkin: boolean;
  ```

### `src/hooks/useReservationSettings.ts`
- Voeg de 4 nieuwe velden toe aan `defaultReservationSettings`:
  ```typescript
  checkin_window_minutes: 15,
  no_show_after_minutes: 15,
  auto_no_show_enabled: false,
  move_to_now_on_checkin: false,
  ```

---

## Stap 3: Nieuwe Hook — `useMoveTable`

**Nieuw bestand**: `src/hooks/useMoveTable.ts`

```typescript
// RPC wrapper voor move_reservation_table
// Invalideert: reservation, reservations, customerReservations, auditLog
```

---

## Stap 4: Settings UI — Check-in Instellingen Sectie

**Nieuw bestand**: `src/components/settings/checkin/CheckinSettingsCard.tsx`

Volgt het bestaande `LocationSettingsCard` patroon (autosave, debounced number inputs, immediate toggles):

- **Check-in window** (nummer, minuten, default 15)
- **Automatisch no-show** (toggle, default uit)
- **No-show na** (nummer, minuten, default 15) — conditioneel zichtbaar als toggle aan
- **Verplaats naar nu** (toggle, default uit)

Integratie in `SettingsReserveringenTafelsLocatie.tsx`:
- Importeer `CheckinSettingsCard`
- Render onder de bestaande `LocationSettingsCard`
- Geen nieuwe route nodig

---

## Stap 5: `TableMoveDialog` Component

**Nieuw bestand**: `src/components/reservations/TableMoveDialog.tsx`

- Trigger: "Tafel wijzigen" knop in `ReservationActions`
- Toont beschikbare tafels via `useAreasWithTables`, gegroepeerd per area
- Huidige tafel gemarkeerd
- Bij selectie: roep `useMoveTable` aan
- Audit log entry automatisch via RPC

---

## Stap 6: `ReservationActions` Update

In `src/components/reservations/ReservationActions.tsx`:

- Verwijder de disabled placeholder `move_ph` bij status `seated` (regel 74)
- Voeg werkende "Tafel wijzigen" knop toe die `TableMoveDialog` opent
- Voeg `useState` toe voor dialog open/close state

---

## Stap 7: Quick Check-in — Grid View

### `ReservationBlock.tsx`
- Wijzig `canCheckIn` (regel ~55): verwijder `draft` — alleen `confirmed`:
  ```typescript
  const canCheckIn = reservation.status === "confirmed" && onCheckIn;
  ```
- Long-press threshold blijft 500ms (bestaande code)
- Double-click handler bestaat al en roept `onCheckIn` aan

### `ReservationGridView.tsx`
- Vervang de placeholder `handleCheckIn` (regel 367-369):
  ```typescript
  const handleCheckIn = useCallback((reservation: Reservation) => {
    transition.mutate({
      reservation_id: reservation.id,
      new_status: 'seated',
      location_id: reservation.location_id,
      customer_id: reservation.customer_id,
    }, {
      onSuccess: () => nestoToast.success('Ingecheckt'),
      onError: (err) => nestoToast.error(err.message),
    });
  }, [transition]);
  ```
- Voeg `useTransitionStatus` import + instantie toe

---

## Stap 8: ListView Update

In `src/components/reserveringen/ReservationListView.tsx`:

- De dropdown toont al "Inchecken" (status "Gezeten") via `ALLOWED_TRANSITIONS` voor confirmed reserveringen
- De `onStatusChange` handler in `Reserveringen.tsx` roept al `transition.mutate` aan
- Check-in window validatie gebeurt server-side — bij "te vroeg" toont de bestaande `onError` handler de foutmelding als toast
- **Geen code wijziging nodig** — werkt al correct

---

## Stap 9: AuditLogTimeline Update

In `src/components/reservations/AuditLogTimeline.tsx`:

- Voeg `table_moved` action type toe aan `formatAction`:
  ```typescript
  case 'table_moved': {
    const oldId = changes?.old_table_id as string;
    const newId = changes?.new_table_id as string;
    return `Tafel gewijzigd`;
  }
  ```
- Bij `status_change` naar `seated`: toon `checked_in_at` als die in metadata staat
- Toon `move_to_now` info: "(oorspronkelijk: XX:XX)" als `metadata.move_to_now === true`

---

## Stap 10: Detail Panel Update

In `src/components/reservations/ReservationDetailPanel.tsx`:

- Bij status `seated`: toon `checked_in_at` timestamp in de header samenvatting
- Als `move_to_now` actief was (zichtbaar via audit log metadata of door `start_time` vergelijking): toon "(oorspronkelijk: XX:XX)" naast de starttijd

---

## Bestanden Overzicht

| Bestand | Actie |
|---------|-------|
| SQL migratie | Nieuw — 4 kolommen settings + checked_in_at + index + fn_auto_mark_no_shows + move_reservation_table + transition RPC update + pg_cron |
| `src/types/reservation.ts` | Update — `checked_in_at` |
| `src/types/reservations.ts` | Update — 4 settings kolommen |
| `src/hooks/useReservationSettings.ts` | Update — `defaultReservationSettings` |
| `src/hooks/useMoveTable.ts` | Nieuw |
| `src/components/settings/checkin/CheckinSettingsCard.tsx` | Nieuw |
| `src/pages/settings/reserveringen/SettingsReserveringenTafelsLocatie.tsx` | Update — CheckinSettingsCard toevoegen |
| `src/components/reservations/TableMoveDialog.tsx` | Nieuw |
| `src/components/reservations/ReservationActions.tsx` | Update — tafel wijzigen werkend |
| `src/components/reserveringen/ReservationBlock.tsx` | Update — canCheckIn alleen confirmed |
| `src/components/reserveringen/ReservationGridView.tsx` | Update — handleCheckIn werkend |
| `src/components/reservations/AuditLogTimeline.tsx` | Update — table_moved + move_to_now |
| `src/components/reservations/ReservationDetailPanel.tsx` | Update — checked_in_at weergave |

---

## Implementatievolgorde

1. Database migratie (alle schema + RPC's + cron in 1 migratie)
2. TypeScript types updaten
3. `defaultReservationSettings` updaten
4. `useMoveTable` hook
5. `CheckinSettingsCard` + integratie in settings pagina
6. `TableMoveDialog` + `ReservationActions` update
7. `ReservationBlock` canCheckIn fix
8. `ReservationGridView` handleCheckIn werkend
9. `AuditLogTimeline` + `ReservationDetailPanel` updates
