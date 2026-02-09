

# Database Webhooks — Agent automatisch triggeren

## Situatie

De `onboarding-agent` Edge Function is deployed en werkt via HTTP POST, maar wordt nergens automatisch aangeroepen. We moeten database triggers instellen die de agent aanroepen bij INSERT/UPDATE op `onboarding_candidates`.

**pg_net extensie** is momenteel niet geinstalleerd -- die moet eerst worden geactiveerd.

## Aanpak

We gebruiken `pg_net` (PostgreSQL HTTP client) om vanuit triggers de Edge Function aan te roepen. Omdat `ALTER DATABASE` niet beschikbaar is op Lovable Cloud, hardcoden we de project-URL en gebruiken we de anon key (de function heeft `verify_jwt = false`).

## Stappen

### 1. Database migratie

Een enkele SQL-migratie die drie dingen doet:

**a) pg_net extensie activeren**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

**b) Trigger function aanmaken**

`notify_onboarding_agent()` die:
- Bij INSERT: stuurt `candidate_created` event
- Bij UPDATE met gewijzigde `current_phase_id`: stuurt `phase_changed` event
- Bij UPDATE met status naar `rejected`: stuurt `candidate_rejected` event
- Anders: doet niets (RETURN NEW)

De function roept `net.http_post()` aan met:
- URL: `https://igqcfxizgtdkwnajvers.supabase.co/functions/v1/onboarding-agent`
- Headers: `Content-Type: application/json` + `Authorization: Bearer <anon_key>`
- Body: JSON payload met type, candidate_id, location_id, en optioneel phase IDs

**c) Twee triggers aanmaken**

| Trigger | Event | Tabel |
|---------|-------|-------|
| `trg_notify_agent_candidate_created` | AFTER INSERT | `onboarding_candidates` |
| `trg_notify_agent_candidate_updated` | AFTER UPDATE | `onboarding_candidates` |

### 2. Geen code-wijzigingen

De Edge Function en frontend hooks blijven ongewijzigd. De idempotency-laag in de agent voorkomt dubbele verwerking als een event zowel via trigger als via client binnenkomt.

## Infinite loop analyse

- De agent schrijft naar `ob_tasks` en `onboarding_events` -- deze tabellen hebben GEEN `notify_onboarding_agent` trigger
- De `check_onboarding_phase_completion` trigger op `ob_tasks` kan `current_phase_id` wijzigen op `onboarding_candidates`, wat opnieuw de agent triggert voor `phase_changed` -- dit is **gewenst gedrag** en de idempotency key (`phase_changed:<candidate>:<phase>`) voorkomt dubbele verwerking
- De trigger function filtert irrelevante updates weg (alleen `current_phase_id` of `status` changes)

## Risico's en mitigatie

| Risico | Mitigatie |
|--------|----------|
| pg_net niet beschikbaar | Fallback: client-side calls (al deels aanwezig in useCreateCandidate/useRejectCandidate) |
| Edge Function down | pg_net is fire-and-forget; failures verschijnen in function logs |
| Rapid successive updates | Idempotency keys in workflow_executions voorkomen dubbele verwerking |

## Wijzigingen samenvatting

| Wat | Actie |
|-----|-------|
| Database migratie | 1x SQL: extensie + function + 2 triggers |
| Edge Function code | Geen wijzigingen |
| Frontend code | Geen wijzigingen |

