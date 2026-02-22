
# Sessie 1.5 — Email Verzending + Automation Engine

## Status: ✅ AFGEROND

### Wat is gebouwd:

#### Database
- [x] `marketing_email_log` tabel met indexen voor suppressie en webhook lookups
- [x] `increment_marketing_analytics` RPC voor atomische analytics updates
- [x] Unique index op `marketing_campaign_analytics(campaign_id, channel)` voor upsert
- [x] `pg_cron` en `pg_net` extensies geactiveerd

#### Edge Functions
- [x] `marketing-send-email` — campagne verzending met:
  - Batch modus (chunks van 100 via Resend batch API)
  - Scheduled check modus (vindt due scheduled campaigns automatisch)
  - Consent filtering (marketing_contact_preferences)
  - Suppressie filtering (max_email_frequency_days uit brand_kit)
  - Personalisatie ({{first_name}}, {{last_name}}, {{restaurant_name}})
  - Unsubscribe link in elke email (verschil met transactionele emails)
  - Stub fallback voor development
  - Analytics update na verzending

- [x] `marketing-email-webhook` — Resend webhook tracking:
  - Events: delivered, opened, clicked, bounced, complained
  - Hard bounce: customer email op NULL gezet
  - Complained/unsubscribe: opted_in=false in contact preferences
  - Direct unsubscribe link handling (GET request)
  - Analytics counters increment via RPC

- [x] `marketing-process-automation` — automation engine:
  - Welcome flow (total_visits=1, created < 1d)
  - Birthday flow (7 dagen voor verjaardag)
  - Winback flow (configurable days_threshold: 30/60/90)
  - Post-visit review: geregistreerd maar skip tot sessie 1.5b
  - Consent + suppressie filtering per flow
  - Dedup: check marketing_email_log.flow_id
  - Template laden + personalisatie
  - Flow stats update na verwerking

#### pg_cron Jobs
- [x] `marketing-send-scheduled` — elke 5 min, vindt due scheduled campaigns
- [x] `marketing-process-automation` — elke 15 min, verwerkt automation flows

### Tests
Alle 3 edge functions getest en succesvol:
- `marketing-send-email`: "No scheduled campaigns due" ✅
- `marketing-process-automation`: `{"processed": 0}` ✅  
- `marketing-email-webhook`: "OK" ✅

### Notities
- Resend webhook URL voor dashboard configuratie: `https://igqcfxizgtdkwnajvers.supabase.co/functions/v1/marketing-email-webhook`
- `list_segment_customers` RPC bestaat maar gebruikt auth.uid() check — edge functions queryen customers direct met service role
- Hard bounce → email=NULL is v1 keuze, later te verfijnen met email_status veld
- Webhook signature verificatie (svix) is een toekomstige verbetering

---

## Sessie 1.5b — Reserveringen ↔ Marketing Integratie

Status: Nog te starten

Deliverables:
1. DB trigger: notify_marketing_on_reservation_change
2. DB trigger: notify_marketing_on_customer_milestone  
3. pg_cron: detect_empty_shifts
4. Widget opt-in checkbox + public-booking-api update
5. Edge Function: marketing-confirm-optin
6. Update marketing-process-automation voor cross_module_events
7. pg_cron: cross-module-events-cleanup
