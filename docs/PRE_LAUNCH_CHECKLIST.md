# Nesto Pre-Launch Checklist

Alles wat gedaan moet worden voordat Nesto live gaat met echte klanten.
**Werk dit document bij tijdens het bouwen — vink af wat klaar is, voeg toe wat je tegenkomt.**

---

## Email & Communicatie

- [ ] Eigen domein verifiëren in Resend (bijv. `nesto.app`) — DNS records toevoegen (SPF, DKIM, DMARC)
- [ ] `RESEND_FROM_EMAIL` secret instellen: `Nesto <noreply@nesto.app>`
- [ ] Test-email versturen en checken dat het in inbox aankomt (niet spam)
- [ ] Reply-to adres configureren per locatie
- [ ] Bounce/complaint handling configureren in Resend

## Beveiliging

- [ ] Alle backend secrets reviewen (geen test-keys meer)
- [ ] RLS policies testen met verschillende rollen (owner, manager, service, kitchen)
- [ ] "Leaked password protection" auth-instelling aanzetten
- [ ] Rate limiting op backend functions configureren
- [ ] CORS origins beperken tot productie-domein (nu `*`)
- [ ] `notify_onboarding_agent()` trigger: hardcoded anon key vervangen door vault/config
- [ ] Service role key NIET gebruiken in client-side code (controleren)
- [ ] Content Security Policy (CSP) headers instellen

## Betalingen (wanneer Stripe live)

- [ ] Stripe live keys instellen (geen test keys)
- [ ] Webhook endpoint configureren voor productie
- [ ] Test-transactie uitvoeren
- [ ] Subscription lifecycle testen (upgrade, downgrade, cancel)

## Database

- [ ] Seed data verwijderen (test-locatie `22222222-...`, test-kandidaten)
- [ ] Backup strategie configureren (point-in-time recovery)
- [ ] Database performance reviewen (indexes, query plans)
- [ ] Orphaned data opruimen (workflow_executions, onboarding_events)
- [ ] Connection pooling reviewen

## Domein & Hosting

- [ ] Custom domein instellen (nesto.app) — A record naar 185.158.133.1
- [ ] www subdomain toevoegen
- [ ] SSL certificaat actief (automatisch via Lovable)
- [ ] DNS propagatie bevestigen

## Monitoring & Observability

- [ ] Error logging opzetten (Sentry of vergelijkbaar)
- [ ] Backend function logs monitoren
- [ ] Uptime monitoring (bijv. BetterStack)
- [ ] Cron job monitoring — draaien ze? Falen ze?
- [ ] Email delivery monitoring via Resend dashboard
- [ ] Database query performance monitoren

## Juridisch & Compliance

- [ ] Privacybeleid op website
- [ ] Verwerkersovereenkomst beschikbaar voor klanten
- [ ] GDPR: data export en verwijdering mogelijk
- [ ] Cookie consent (als van toepassing)
- [ ] Terms of Service / Gebruikersvoorwaarden

## Onboarding Module Specifiek

- [ ] `onboarding@resend.dev` vervangen door eigen domein
- [ ] Email templates reviewen op taalgebruik en branding
- [ ] Reminder timing configureerbaar gemaakt (stap 8)
- [ ] Test: volledige kandidaat-flow doorlopen (fase 1 t/m 10)
- [ ] Idempotency keys opruimstrategie (oude workflow_executions)

## Frontend & UX

- [ ] Loading states overal aanwezig (geen lege flashes)
- [ ] Error boundaries op route-niveau
- [ ] Mobile responsiveness testen (alle modules)
- [ ] Accessibility check (keyboard nav, screen reader, contrast)
- [ ] Favicon en meta tags (OG image, description)

## Performance

- [ ] Code splitting / lazy loading voor routes
- [ ] Bundle size analyseren
- [ ] Image optimalisatie
- [ ] First Contentful Paint < 1.5s

---

## Gaandeweg toegevoegd

_(Voeg hier items toe die je tegenkomt tijdens het bouwen)_

---

*Laatst bijgewerkt: 9 februari 2026*
