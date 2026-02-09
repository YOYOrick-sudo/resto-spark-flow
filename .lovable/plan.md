
# Stap 6: Email via Resend

## Vereiste voorbereiding (door jou)

Voordat de code-wijzigingen worden doorgevoerd:

1. Ga naar https://resend.com en maak een account aan (gratis: 3.000 emails/maand)
2. Verifieer je domein op https://resend.com/domains (DNS records toevoegen)
3. Maak een API key aan op https://resend.com/api-keys
4. Lovable slaat de key veilig op als backend secret (wordt gevraagd na goedkeuring)

Optioneel: een `RESEND_FROM_EMAIL` secret voor het afzenderadres (bijv. `Nesto <noreply@jouwdomein.nl>`). Zonder deze wordt `Nesto <onboarding@resend.dev>` gebruikt (Resend test-domein).

---

## Wat er verandert

### 1. `supabase/functions/_shared/email.ts` -- stub wordt Resend

De huidige stub (console.log + event met `stub: true`) wordt vervangen door:

- Check of `RESEND_API_KEY` beschikbaar is
- **Ja**: HTTP POST naar `https://api.resend.com/emails` met Authorization header
  - Bij succes: log Resend email ID, sla `email_sent` event op met `stub: false` en `resend_id`
  - Bij fout: log `email_failed` event met error details, maar crash NIET (agent werkt door)
- **Nee**: fallback naar huidige stub-gedrag (console log + `stub: true` event)

Geen Resend SDK nodig -- het is een simpele `fetch()` call.

### 2. `supabase/functions/onboarding-agent/index.ts` -- fase-emails

`handlePhaseChanged` wordt uitgebreid:

1. Na het afronden van automated tasks, haal de nieuwe fase op (sort_order)
2. Map sort_order naar template key:

| sort_order | Template key |
|------------|-------------|
| 20 | `additional_questions` |
| 30 | `interview_invite` |
| 50 | `trial_day_invite` |
| 80 | `offer_and_form` |

3. Als de template bestaat in `onboarding_settings.email_templates`: render met candidate context en verstuur
4. Geen template? Skip (niet elke fase heeft een email)

### 3. Database seed -- extra email templates

Huidige templates in `onboarding_settings`:
- `confirmation` -- aanwezig
- `rejection` -- aanwezig
- `interview_invite` -- aanwezig
- `welcome` -- aanwezig

Toe te voegen via SQL update:
- `additional_questions` (Screening fase)
- `trial_day_invite` (Meeloopdag fase)
- `offer_and_form` (Pre-boarding fase)
- `internal_reminder` (voorbereiding stap 7)
- `internal_reminder_urgent` (voorbereiding stap 7)

---

## Technische details

### email.ts (nieuw)

```text
sendEmail(params)
  |
  +-- RESEND_API_KEY beschikbaar?
  |     |
  |     +-- Ja: fetch POST https://api.resend.com/emails
  |     |     +-- 200 OK: log event (stub: false, resend_id)
  |     |     +-- Error: log event (email_failed), NIET crashen
  |     |
  |     +-- Nee: console.log + event (stub: true)
```

### Phase-email mapping in agent

```text
handlePhaseChanged(event)
  |
  +-- completeAutomatedTasks()
  +-- Haal phase.sort_order op via new_phase_id
  +-- Lookup template key in PHASE_EMAIL_MAP
  +-- Template gevonden in onboarding_settings?
        +-- Ja: renderTemplate() + sendEmail()
        +-- Nee: skip
```

---

## Wijzigingen samenvatting

| Bestand | Actie |
|---------|-------|
| `RESEND_API_KEY` secret | Toevoegen (wordt gevraagd na goedkeuring) |
| `supabase/functions/_shared/email.ts` | Herschrijven: stub naar Resend met fallback |
| `supabase/functions/onboarding-agent/index.ts` | `handlePhaseChanged` uitbreiden met fase-specifieke emails |
| Database (onboarding_settings) | SQL update: 5 extra email templates toevoegen |

## Geen wijzigingen aan

- Frontend code
- Andere Edge Functions
- templateRenderer.ts (werkt al correct)
- Bestaande handlers (candidateCreated / candidateRejected werken al met sendEmail)
