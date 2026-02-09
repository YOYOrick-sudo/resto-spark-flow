

# Edge Function: Onboarding Agent

Bouw een `onboarding-agent` edge function met shared helpers voor idempotency, email (stub), en template rendering. De agent verwerkt events (`candidate_created`, `phase_changed`, `candidate_rejected`, `task_completed`) en voert automatische taken uit.

---

## Nieuwe bestanden

| Bestand | Doel |
|---------|------|
| `supabase/functions/_shared/supabaseAdmin.ts` | Admin Supabase client (service_role, bypassed RLS) |
| `supabase/functions/_shared/idempotency.ts` | Claim/complete/fail via `workflow_executions` tabel |
| `supabase/functions/_shared/email.ts` | Email stub -- logt naar console + `onboarding_events` |
| `supabase/functions/_shared/templateRenderer.ts` | Placeholder-vervanging + ophalen templates uit `onboarding_settings` |
| `supabase/functions/onboarding-agent/index.ts` | Hoofd edge function met event routing en handlers |

---

## Hoe het werkt

1. Agent ontvangt een POST met `{ type, candidate_id, location_id }`.
2. Op basis van `type` wordt de juiste handler aangeroepen.
3. Idempotency via `workflow_executions`: unieke key per event voorkomt dubbele verwerking.
4. Handlers voeren taken uit: automated tasks afronden, email events loggen (stub).
5. Resultaat wordt teruggegeven als `{ success: true }`.

---

## Config

`supabase/config.toml` krijgt JWT verificatie uit voor deze function (webhooks sturen geen user JWT):

```text
[functions.onboarding-agent]
verify_jwt = false
```

---

## Technische details

### supabaseAdmin.ts
Supabase client met `SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY` (automatisch beschikbaar in edge functions). Geen secrets toe te voegen.

### idempotency.ts
- `claimIdempotencyLock(key)`: insert in `workflow_executions`, vangt unique constraint violation (code `23505`) op als "al verwerkt".
- `completeExecution(key, result?)`: update status naar `completed`.
- `failExecution(key, error)`: update status naar `failed`.

### email.ts
Stub: logt `[EMAIL STUB]` naar console en insert een `email_sent` event in `onboarding_events` met `stub: true`. Wordt in een latere stap vervangen door echte Resend integratie.

### templateRenderer.ts
- `renderTemplate(template, context)`: vervangt `[voornaam]`, `[achternaam]`, `[vestiging]`, `[functie]`, `[datum]` placeholders.
- `getEmailTemplates(locationId)`: haalt `email_templates` JSONB op uit `onboarding_settings`.

### onboarding-agent/index.ts
- CORS headers voor OPTIONS preflight.
- Input validatie (type, candidate_id, location_id verplicht).
- Event routing via switch: `candidate_created`, `phase_changed`, `candidate_rejected`, `task_completed`.
- `handleCandidateCreated`: claimt lock, haalt kandidaat + locatie op, stuurt bevestigingsmail (stub), rondt automated taken af.
- `handlePhaseChanged`: claimt lock, rondt automated taken in nieuwe fase af.
- `handleCandidateRejected`: claimt lock, stuurt afwijsmail (stub).
- `handleTaskCompleted`: alleen logging (database trigger doet het zware werk).
- `completeAutomatedTasks(candidateId, locationId)`: update `ob_tasks` waar `is_automated=true` en `status=pending` naar `completed`, logt events.

### Belangrijk: geen nieuwe database tabellen nodig
De `workflow_executions` tabel bestaat al en heeft de juiste kolommen (`idempotency_key`, `status`, `result`, `error`, `completed_at`). De `onboarding_events` tabel bestaat ook al.

### Na deploy: handmatig testen
De agent kan getest worden via een POST request met een test candidate_id en location_id. Controles: response `{ success: true }`, events in `onboarding_events`, idempotency bij herhaalde aanroep.

