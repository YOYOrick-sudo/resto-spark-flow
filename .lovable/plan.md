

# Sprint E.1b — WhatsApp Webhook (Receive)

## Huidige Staat

- **conversations + messages tabellen** bestaan (Sprint E.1a)
- **send-whatsapp** Edge Function bestaat
- **customers** tabel heeft `phone_number` (NIET `phone` zoals sprint spec schrijft) en `whatsapp_opt_in`
- **locations** tabel heeft `whatsapp_phone_number_id`, `whatsapp_enabled`
- **evaluate-signals** heeft 7 providers inline in index.ts (geen aparte bestanden), provider interface: `{ name, evaluate(locationId, orgId), resolveStale(locationId) }`
- **D360_API_KEY** secret is nog niet gezet (komt later)
- **META_APP_SECRET** en **WHATSAPP_VERIFY_TOKEN** secrets moeten nog worden aangevraagd
- `EdgeRuntime.waitUntil()` is beschikbaar in Supabase Edge Functions

## Wat gebouwd wordt

### 1. Edge Function — `whatsapp-webhook/index.ts`

Eén endpoint voor alles:

**GET** — Webhook verificatie challenge (hub.mode + hub.verify_token + hub.challenge)

**POST** — Inkomende events:
- HMAC signature verificatie via `META_APP_SECRET`
- Direct 200 retourneren, verwerking via `EdgeRuntime.waitUntil()`
- Location lookup via `whatsapp_phone_number_id`
- Inbound berichten: idempotency check op `wa_message_id`, find-or-create customer (op `phone_number`, niet `phone`), find-or-create conversation, update service window, increment unread_count
- Status updates: update `wa_status` op messages, zet `read_at` bij read, log `wa_error_code` bij failed
- Content extractie: text, interactive, image, document, audio, video, location, button

Registreer in `config.toml` met `verify_jwt = false`.

### 2. MessagingSignalProvider

Toevoegen als inline provider in `evaluate-signals/index.ts` (conform bestaand pattern — alle providers staan inline, geen aparte bestanden):

- **whatsapp_delivery_failures**: 5+ failed berichten in 24u → warning
- **whatsapp_escalation_waiting**: escalated conversations >30 min zonder antwoord → warning
- **whatsapp_opt_in_low**: <30% opt-in bij 20+ customers → info/insight

Module: `'messaging'`

### 3. Conversation cleanup cron

pg_cron job (elke 4 uur): sluit WhatsApp conversations waar service window verlopen is en >24u geen activiteit.

### 4. Secrets

Vraag `META_APP_SECRET` en `WHATSAPP_VERIFY_TOKEN` aan via add_secret. Zonder deze werkt signature verificatie niet, maar de webhook kan deployed worden.

---

## Aanpassingen t.o.v. sprint spec

| Spec | Werkelijkheid | Aanpassing |
|---|---|---|
| `phone` kolom op customers | `phone_number` | Gebruik `phone_number` |
| Aparte provider file | Alle providers inline in index.ts | Inline toevoegen |
| Provider interface: `evaluate(locationId, supabase)` | `evaluate(locationId, orgId)` + globale `supabaseAdmin` | Volg bestaand pattern |

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | **Nieuw** |
| `supabase/config.toml` | Registratie |
| `supabase/functions/evaluate-signals/index.ts` | MessagingSignalProvider inline toevoegen |
| Cron job (via insert tool) | cleanup-expired-conversations |

## Volgorde

1. whatsapp-webhook Edge Function + config.toml
2. MessagingSignalProvider in evaluate-signals
3. Secrets aanvragen
4. Conversation cleanup cron

