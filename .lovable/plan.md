

# Signal Architecture: Fase 1 (met 5 verfijningen)

## Overzicht

De Assistent-pagina draait nu op mock data. Dit plan vervangt dat door een server-side signal systeem met echte database, permission-scoped delivery, en realtime updates.

---

## De 5 aangescherpte punten

### 1. Module-check in permission filtering
- RLS policy op `signals` tabel filtert via `location_entitlements` -- signals worden alleen zichtbaar als de module enabled is voor die locatie
- Client-side dubbele check: `useSignals` filtert op `userContext.entitlements` zodat disabled modules nooit in de UI komen

### 2. Onboarding als module
- `module` kolom is `text`, geen enum -- vrij uitbreidbaar
- Frontend `SignalModule` type wordt een union die 'onboarding' bevat naast 'reserveringen', 'keuken', 'revenue', 'configuratie'
- `AssistantFilters` krijgt 'Onboarding' als extra pill

### 3. Dedup key: partial unique index
- `CREATE UNIQUE INDEX ... ON signals(dedup_key) WHERE status = 'active'`
- Wanneer een signal resolved wordt, kan dezelfde `dedup_key` opnieuw gebruikt worden voor een nieuw signal
- De Edge Function test dit expliciet: resolve een signal, verifieer dat dezelfde key opnieuw inserted kan worden

### 4. Auto-resolve in evaluate-signals
- Elke provider implementeert twee methoden: `evaluate()` (genereert nieuwe signals) en `resolveStale()` (markeert signals als resolved als de conditie niet meer geldt)
- De Edge Function draait beide bij elke run: eerst `resolveStale()`, dan `evaluate()`

### 5. Trigger vs cron per signal type
- **Database triggers (real-time):** Configuratie-signals (tafel verwijderd uit area, shift gedeactiveerd, tafelgroep leeggemaakt)
- **Cron (elke 5 min):** Periodieke checks zoals annuleringscount, pacing vs capaciteit, omzetafwijking

---

## Database migratie

### Tabel: `signals`

```text
id                uuid PK default gen_random_uuid()
organization_id   uuid FK -> organizations NOT NULL
location_id       uuid FK -> locations NOT NULL
module            text NOT NULL          -- vrij veld, geen enum
signal_type       text NOT NULL          -- bv. 'unassigned_tables'
kind              text NOT NULL DEFAULT 'signal'  -- 'signal' | 'insight'
severity          text NOT NULL DEFAULT 'info'     -- 'info' | 'warning' | 'error' | 'ok'
title             text NOT NULL
message           text
action_path       text
payload           jsonb DEFAULT '{}'
dedup_key         text NOT NULL
cooldown_until    timestamptz
status            text NOT NULL DEFAULT 'active'   -- 'active' | 'resolved' | 'dismissed'
source_signal_ids uuid[]
actionable        boolean DEFAULT false
priority          int DEFAULT 50
created_at        timestamptz DEFAULT now()
resolved_at       timestamptz
dismissed_by      uuid FK -> profiles
dismissed_at      timestamptz
```

**Indexes:**
- Composite: `(location_id, status, created_at DESC)` -- primaire query
- Partial unique: `(dedup_key) WHERE status = 'active'` -- deduplicatie
- Cooldown: `(location_id, signal_type, cooldown_until)` -- cooldown check

**RLS policies:**
- SELECT: `user_has_location_access(auth.uid(), location_id)` AND module is enabled via subquery op `location_entitlements`
- UPDATE (dismiss only): zelfde access check, alleen `status`, `dismissed_by`, `dismissed_at` kolommen
- INSERT/DELETE: geen (alleen service role via Edge Functions)

### Tabel: `signal_preferences`

```text
id            uuid PK default gen_random_uuid()
user_id       uuid FK -> profiles NOT NULL
location_id   uuid FK -> locations NOT NULL
signal_type   text NOT NULL
muted         boolean DEFAULT false
created_at    timestamptz DEFAULT now()
UNIQUE(user_id, location_id, signal_type)
```

**RLS:** user kan alleen eigen preferences lezen/schrijven.

### Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
```

---

## Edge Function: `evaluate-signals`

Wordt aangeroepen via pg_cron (elke 5 min) en via database triggers voor real-time events.

### Provider interface

Elke provider implementeert:
- `evaluate(locationId)` -- checkt condities, retourneert nieuwe signals
- `resolveStale(locationId)` -- checkt actieve signals waarvan de conditie niet meer geldt

### Eerste providers

**ConfigSignalProvider (via cron + triggers):**

| Signal type | Conditie | Severity | Actie |
|-------------|----------|----------|-------|
| `unassigned_tables` | Actieve tafels zonder area | warning | `/instellingen/reserveringen/tafels` |
| `empty_table_groups` | Actieve groepen zonder leden | warning | `/instellingen/reserveringen/tafels/groepen` |
| `shifts_without_pacing` | Actieve shifts waar arrival_interval_minutes NULL | info | `/instellingen/reserveringen/shifts` |

**resolveStale:** Als alle tafels een area hebben, resolve `unassigned_tables`.

**OnboardingSignalProvider (via triggers op ob_tasks/candidates):**

| Signal type | Conditie | Severity | Actie |
|-------------|----------|----------|-------|
| `overdue_tasks` | ob_tasks ouder dan fase-deadline | warning | `/onboarding/{candidate_id}` |
| `stalled_candidate` | Kandidaat langer dan X dagen in zelfde fase | warning | `/onboarding/{candidate_id}` |

### Dedup en cooldown flow

```text
1. Provider genereert signal met dedup_key
   bv. "unassigned_tables:{location_id}"

2. Check: EXISTS signal met dezelfde dedup_key AND status = 'active'?
   -> Ja: skip (dedup)

3. Check: cooldown_until > now() voor dit signal_type + location?
   -> Ja: skip (cooldown)

4. INSERT nieuw signal

5. resolveStale(): voor elke actieve signal van dit type,
   check of conditie nog geldt. Zo niet:
   UPDATE status = 'resolved', resolved_at = now()
```

### Database triggers voor real-time config signals

Triggers op `tables`, `areas`, `shifts`, `table_group_members` die de Edge Function aanroepen wanneer relevante data wijzigt. Dezelfde `notify_signal_evaluation()` pattern als `notify_onboarding_agent()`.

---

## Frontend wijzigingen

### Nieuwe types: `src/types/signals.ts`

```text
SignalModule = 'reserveringen' | 'keuken' | 'revenue' | 'configuratie' | 'onboarding' | string
SignalSeverity = 'info' | 'warning' | 'error' | 'ok'
SignalKind = 'signal' | 'insight'
SignalStatus = 'active' | 'resolved' | 'dismissed'

Signal = database row type (maps 1:1 op tabel)
```

### Nieuwe hook: `src/hooks/useSignals.ts`

- Query: `signals` WHERE `location_id` = current AND `status` = 'active', ORDER BY priority, severity, created_at
- Client-side filter: exclude modules waar `hasModule()` false retourneert
- Client-side filter: exclude signal_types die gemuted zijn via `signal_preferences`
- Realtime subscription op `signals` tabel voor live updates

### Nieuwe hook: `src/hooks/useDismissSignal.ts`

- Mutation: UPDATE signal SET status = 'dismissed', dismissed_by = user_id, dismissed_at = now()
- Invalidate signals query

### Updated: `src/pages/Assistent.tsx`

- Vervangt `mockAssistantItems` door `useSignals()` data
- Loading state via `LoadingStates` component
- Zelfde filter/sort logica, maar op `Signal` type

### Updated: `src/components/assistant/AssistantItemCard.tsx`

- Accept `Signal` type i.p.v. `AssistantItem`
- Dismiss knop (X icoon) die `useDismissSignal` aanroept
- Module badge wordt dynamisch (geen hard-coded Record meer)

### Updated: `src/components/assistant/AssistantFilters.tsx`

- Module pills worden dynamisch opgebouwd uit beschikbare modules + 'Alle'
- 'Onboarding' pill verschijnt alleen als die module enabled is

### Verwijderd: `src/data/assistantMockData.ts`

### Query keys: `src/lib/queryKeys.ts`

- Toevoegen: `signals: (locationId) => ['signals', locationId]`
- Toevoegen: `signalPreferences: (userId, locationId) => ['signal-preferences', userId, locationId]`

---

## Documentatie: `docs/SIGNAL_ARCHITECTURE.md`

Bevat:
- Schema referentie
- Provider interface specificatie
- Permission cascade uitleg
- Dedup/cooldown/auto-resolve mechanisme
- Trigger vs cron tabel per signal type
- Instructies voor nieuwe providers toevoegen

---

## Volgorde van implementatie

1. Database migratie (signals + signal_preferences + indexes + RLS + realtime)
2. Edge Function `evaluate-signals` met ConfigSignalProvider + auto-resolve
3. Database triggers voor config-gerelateerde tabelwijzigingen
4. `src/types/signals.ts` + `useSignals` hook + `useDismissSignal` hook
5. Assistent pagina en components verbinden met echte data
6. Mock data verwijderen
7. `docs/SIGNAL_ARCHITECTURE.md` opslaan

