# Test: automatische pakbon-instroom

Doel: bewijzen of de keten email → intake → AI-parse → goods_receipt → iPad-inbox autonoom werkt voor Pura Vida. Géén fixes, alleen rapportage.

## Aanpak

### 1. Baseline-snapshot (queries vóór injectie)
- `pakbon_email_intake` laatste 5 rijen (datum, status, location, goods_receipt_id)
- `goods_receipts` laatste 5 rijen voor Pura Vida
- Bevestig dat de keten al ≥30 dagen stil ligt (audit-claim verifiëren)
- Lookup `pakbon_slug` + `location_id` voor Pura Vida Daily
- Lookup een bekende leverancier met `email_domains` config (bv. Sligro/Bidfood) of pak `generic`

### 2. Injectie-methode (realistisch, geen externe afhankelijkheid)
Twee opties, ik kies A tenzij A niet werkbaar blijkt:

**A. Echte Svix-webhook simuleren naar `receive-pakbon-email`** met een `email.received` payload die:
- `to: pakbon+{slug}@mail.shouf.ai` (echte slug van Pura Vida)
- `from: orders@{leverancier-domein}` (matched op `email_domains`)
- attachment-metadata wijst naar een test-PDF

Probleem: Svix-signature + Resend Attachments-API call gaan falen → schakel 1 zal struikelen op verificatie/fetch. Dat is op zich al een bewijs (instroom faalt zonder echte mail), maar zegt niets over schakels 2–5.

**B. Direct injecteren op intake-niveau (overslaan van schakel 1)** — handmatig een `pakbon_email_intake` rij + een geüploade test-PDF in storage maken, dan `parse-pakbon` invoken met die intake_id. Dit test schakels 2→5 isoleerd.

→ Ik voer **beide** uit:
- A om te zien hoe ver de echte webhook komt (en wáár hij struikelt: Svix, slug-match, Resend-fetch?)
- B om te bewijzen of de rest van de keten autonoom doorloopt zodra een geldige intake bestaat

Test-PDF: zoek bestaande in `storage.pakbonnen` van een eerdere echte levering; hergebruik die bytes voor een nieuwe `[TEST]` upload.

### 3. Per-schakel verificatie
Voor elke schakel queries draaien en WERKT/KAPOT vaststellen met bewijs (row-counts, status-veld, edge-function logs van `receive-pakbon-email` en `parse-pakbon`):

1. **Email binnen** — HTTP-status van webhook-call + logs
2. **Intake-rij** — `pakbon_email_intake` row aangemaakt? `ai_parse_status`?
3. **AI-parse** — parse-pakbon logs: tier-stats, regels herkend, candidate_rows
4. **goods_receipt** — `goods_receipts` + `goods_receipt_lines` rows; matching-tiers
5. **Op iPad** — query op view `goods_receipts_chef_inbox` (gebruikt door `useGoodsReceipts`) voor Pura Vida; bevestig dat de test-receipt erin verschijnt

### 4. Parse-kwaliteit beoordelen
- Regels herkend vs verwacht (handmatig PDF tellen)
- Match-tier per regel (Tier-1/2/3/4 of unmatched)
- Hoeveelheid + eenheid sanity-check

### 5. Compliance-status uit eerdere audit
Kort hercheck (read-only) van de drie open punten:
- Schijn-vinkjes (welke?)
- Hardcoded template-id (in welke functie?)
- Dubbele runs (idempotency op `resend_message_id`)

### 6. Cleanup
- Markeer test-intake: `notities = '[TEST - genegeerd]'` of test-leverancier-flag
- Markeer test-receipt idem
- Verwijder test-PDF uit storage (of laat staan onder `/test/` prefix)
- Géén voorraad-mutaties (chef bevestigt niet) → niets terug te draaien

## Deliverable
Rapport in het format dat je opgaf: schakel-voor-schakel, parse-kwaliteit, breekpunt, eindoordeel + compliance-status. Geen code-wijzigingen.

## Wat ik nodig heb om te starten
GO. Eén open vraag: als A (echte Svix-webhook) struikelt op Svix-signature (verwacht), accepteer je dat als "schakel 1 niet testbaar zonder echte Resend-email" en gaan we door op B? Of wil je dat ik Svix-verify tijdelijk omzeil via een service-role-direct-call op een intern endpoint (zo bestaand)?
