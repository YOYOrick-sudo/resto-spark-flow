# Signal Architecture

## Overzicht

Het signal systeem vervangt mock data op de Assistent-pagina met server-side gegenereerde signalen. Signals worden opgeslagen in een centrale `signals` tabel, gegenereerd door providers via een Edge Function, en real-time geleverd via Supabase Realtime.

## Database Schema

### `signals` tabel

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid PK | Auto-generated |
| organization_id | uuid FK → organizations | Tenant isolatie |
| location_id | uuid FK → locations | Locatie scope |
| module | text | 'reserveringen', 'keuken', 'revenue', 'configuratie', 'onboarding' |
| signal_type | text | Unieke type key (bv. 'unassigned_tables') |
| kind | text | 'signal' of 'insight' |
| severity | text | 'info', 'warning', 'error', 'ok' |
| title | text | Leesbare titel |
| message | text | Optionele toelichting |
| action_path | text | Frontend route voor actie |
| payload | jsonb | Extra data |
| dedup_key | text | Fingerprint voor deduplicatie |
| cooldown_until | timestamptz | Voorkomt herhaalde firing |
| status | text | 'active', 'resolved', 'dismissed' |
| actionable | boolean | Vereist actie? |
| priority | int | Lagere waarde = hogere prioriteit |

### Indexes

- **Composite**: `(location_id, status, created_at DESC)` — primaire query
- **Partial unique**: `(dedup_key) WHERE status = 'active'` — deduplicatie
- **Cooldown**: `(location_id, signal_type, cooldown_until)`

### `signal_preferences` tabel

Per-user muting van specifieke signal types per locatie.

## Permission Cascade

```
1. Tenant    → organization_id match (RLS)
2. Location  → user_has_location_access() (RLS)
3. Module    → location_entitlements enabled check (RLS + client-side)
4. Preference → signal_preferences.muted (client-side)
```

## Provider Pattern

Elke provider implementeert:

```typescript
interface SignalProvider {
  name: string;
  evaluate(locationId, orgId): Promise<SignalDraft[]>;
  resolveStale(locationId): Promise<string[]>;
}
```

### Huidige providers

| Provider | Signal Types | Trigger |
|----------|-------------|---------|
| ConfigSignalProvider | unassigned_tables, empty_table_groups, shifts_without_pacing | DB triggers + cron |
| OnboardingSignalProvider | stalled_candidate, overdue_tasks | Cron |

### Nieuwe provider toevoegen

1. Implementeer het `SignalProvider` interface in `evaluate-signals/index.ts`
2. Voeg toe aan de `providers` array
3. Voeg eventueel DB triggers toe voor real-time evaluatie

## Dedup / Cooldown / Auto-resolve

1. **Dedup**: Partial unique index op `dedup_key WHERE status = 'active'` voorkomt duplicaten
2. **Cooldown**: `cooldown_until` timestamp voorkomt rapid-fire na resolve
3. **Auto-resolve**: `resolveStale()` draait bij elke evaluatie en resolved signals waarvan de conditie niet meer geldt

## Trigger vs Cron

| Type | Trigger | Voorbeeld |
|------|---------|-----------|
| Config signals | DB triggers op tables/areas/shifts/table_groups/table_group_members | Tafel verwijderd, shift gedeactiveerd |
| Periodieke checks | pg_cron (elke 5 min) | Stalled candidates, overdue tasks |

## Frontend

- `useSignals()` — haalt actieve signals op met realtime subscription
- `useDismissSignal()` — dismissed een signal (status → 'dismissed')
- Filters zijn dynamisch gebaseerd op beschikbare modules
