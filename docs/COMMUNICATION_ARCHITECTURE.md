# Nesto Communicatie Architectuur

> Dit document definieert waar alle communicatie-instellingen thuishoren in Nesto.
> Raadpleeg dit bij elke sessie die settings pagina's, emails, notificaties, of messaging raakt.

## Kernprincipe

Groepeer op **ontvanger + doel**, niet op technologie.

- **Communicatie** = naar gasten (transactioneel)
- **Notificaties** = naar operators (intern)
- **Marketing** = promotioneel naar gasten (opt-in)

---

## Huidige situatie (februari 2026)

| Settings pagina | Huidige inhoud | Status |
|---|---|---|
| INSTELLINGEN > Communicatie | Brand Kit: logo, kleuren, tone of voice, sender naam/email | ✅ Gebouwd |
| INSTELLINGEN > Marketing | GDPR, Templates, Automation, Social Accounts, Popup, Review Platforms | ✅ Gebouwd |
| INSTELLINGEN > Reserveringen > Notificaties | Placeholder met redirect naar Communicatie | ⏳ Placeholder |

---

## Doelstructuur

### INSTELLINGEN > Communicatie

Doel: Alles wat bepaalt hoe het restaurant communiceert met gasten. De "stem" en de kanalen.

| Tab | Inhoud | Status |
|---|---|---|
| Huisstijl | Logo, kleuren, tone of voice, sender naam, sender email | ✅ Gebouwd |
| Gastberichten | Transactionele templates + timing + kanaalvoorkeur | 📋 Bij Fase 4.14 |
| WhatsApp | WhatsApp Business setup wizard, template status, telefoonnummer | 📋 Bij Fase 4.14 |

#### Tab: Gastberichten (nieuw bij Fase 4.14)

Templates die automatisch worden verstuurd bij reserveringsgebeurtenissen:

| Template | Trigger | Timing | Kanalen |
|---|---|---|---|
| Bevestiging | Reservering aangemaakt | Direct | Email + WhatsApp |
| Reminder | Cron job | T-24h | Email + WhatsApp |
| Korte reminder | Cron job | T-3h | Alleen WhatsApp |
| Herbevestiging | Cron job | T-48h (bij hoog risico) | Email + WhatsApp |
| Optie bevestiging | Optie aangemaakt | Direct | Email + WhatsApp |
| Waitlist uitnodiging | Slot vrijgekomen | Direct | Email + WhatsApp |
| Betaalverzoek | Operator actie | Direct | Email + WhatsApp |
| Review verzoek | Reservering afgerond | T+2h na eindtijd | Email + WhatsApp |

Per template instelbaar:
- Aan/uit toggle
- Timing aanpassen (waar van toepassing)
- Tekst aanpassen (met variabelen: `{guest_name}`, `{date}`, `{time}`, `{party_size}`, `{restaurant_name}`)
- Preview knop
- Kanaal: auto (WhatsApp preferred bij opt-in) / alleen email / alleen WhatsApp

Kanaal selectie logica:
- Gast heeft WhatsApp opt-in → WhatsApp voor tijdkritische, email voor formele
- Gast heeft alleen email → email
- T-3h reminder → alleen WhatsApp (email te laat)
- Betaalverzoek → email primair (formeel), WhatsApp als notificatie

#### Tab: WhatsApp (nieuw bij Fase 4.14)

Setup wizard:
1. Meta Business verificatie status
2. Telefoonnummer registreren
3. Webhook URL kopiëren + verify token
4. Test bericht versturen
5. Template status overzicht (goedgekeurd/pending/afgewezen)

---

### INSTELLINGEN > Reserveringen

Doel: Module-specifieke configuratie voor het reserveringssysteem.

De huidige "Notificaties" tab onder Reserveringen wordt verwijderd bij Fase 4.14. Gastberichten verhuizen naar INSTELLINGEN > Communicatie > Gastberichten.

Wat overblijft onder INSTELLINGEN > Reserveringen:
- Shifts
- Tafels & Gebieden
- Tickets & Policies
- Pacing
- Waitlist regels
- Widget configuratie
- Check-in regels

**Waarom niet onder Reserveringen?** Gastberichten raken meerdere modules (reserveringen, waitlist, opties, payments, reviews). Als je de reminder email wilt aanpassen, verwacht je dat niet onder "Reserveringen > Notificaties" te vinden — je verwacht het bij communicatie.

---

### INSTELLINGEN > Marketing

Doel: Promotionele marketing configuratie. Alles wat met opt-in marketing te maken heeft.

Blijft zoals gebouwd:

| Tab | Inhoud |
|---|---|
| Algemeen | GDPR/privacy instellingen |
| Templates | Marketing email templates (campagne templates) |
| Automation | Automation regels (welkom serie, verjaardag, etc.) |
| Social Accounts | Instagram, Facebook, Google Business koppeling |
| Popup | Website popup & sticky bar configuratie |
| Review Platforms | Google Place ID, review sync instellingen |

**Belangrijk verschil:**
- **Marketing Templates** = campagne emails die je handmatig of via automation verstuurt aan opted-in contacten
- **Gastberichten Templates** = transactionele berichten die automatisch getriggerd worden door het systeem

---

### INSTELLINGEN > Notificaties (nieuw bij Fase 4.14)

Doel: Wanneer en hoe krijgt de **operator** zelf meldingen. Puur operator-gericht.

Dit is een nieuwe top-level settings pagina (niet onder een module).

| Sectie | Inhoud |
|---|---|
| In-app | Per event type: toon badge / toon toast / uit. Events: nieuwe reservering, annulering, no-show, waitlist entry, nieuwe review, hoog-risico reservering |
| Push | Per event type: push notificatie aan/uit (toekomstig, bij mobile app) |
| Email | Ochtend-briefing: aan/uit + tijdstip. Weekrapport: aan/uit. Kritieke alerts: aan/uit (bijv. payment failure, system error) |

Per gebruiker instelbaar, niet per locatie.

---

## Migratie plan

Bij Fase 4.14 Messaging:

### Stap 1: Communicatie pagina uitbreiden
- Huidige Brand Kit wordt tab "Huisstijl" ✅ (al gedaan)
- Nieuwe tab "Gastberichten" met template configuratie
- Nieuwe tab "WhatsApp" met setup wizard

### Stap 2: Reserveringen > Notificaties verwijderen
- Verwijder de placeholder pagina
- Verwijder het menu-item uit de Reserveringen settings navigatie
- Redirect eventuele deeplinks naar INSTELLINGEN > Communicatie > Gastberichten

### Stap 3: Notificaties pagina bouwen
- Nieuwe route: `/instellingen/notificaties`
- Nieuw menu-item onder INSTELLINGEN (na Marketing, voor HRM)
- Operator-gerichte meldingen configuratie
- Koppeling met briefing settings (AI Feature 2)

---

## Overzicht: waar vind ik wat?

| "Ik wil..." | Ga naar |
|---|---|
| De tone of voice van mijn restaurant instellen | Communicatie > Huisstijl |
| Aanpassen wat er in de bevestigingsemail staat | Communicatie > Gastberichten |
| WhatsApp koppelen | Communicatie > WhatsApp |
| De timing van de reminder email aanpassen | Communicatie > Gastberichten |
| Een review-verzoek email instellen na bezoek | Communicatie > Gastberichten |
| Een marketing campagne email ontwerpen | Marketing > Templates |
| Instellen wie marketing emails ontvangt | Marketing > GDPR |
| Een Instagram automation opzetten | Marketing > Automation |
| Instellen dat ik een push melding krijg bij annuleringen | Notificaties > Push |
| De ochtend-briefing uitzetten | Notificaties > Email |
| Pacing regels aanpassen | Reserveringen > Pacing |
| Google Place ID instellen voor review sync | Marketing > Review Platforms |
| Social media accounts koppelen | Marketing > Social Accounts |

---

## Technische implicaties

### Gedeelde Resend instance

Alle emails (transactioneel + marketing + briefing) gebruiken dezelfde Resend API key en hetzelfde geverifieerde domein. Het verschil zit in:
- `from`: altijd `{sender_name} <{sender_email}>` uit brand_kit
- `reply-to`: per locatie instelbaar
- Template rendering: transactioneel via edge function, marketing via campaign builder

### Template opslag

- **Marketing templates**: `marketing_email_templates` tabel (bestaand)
- **Transactionele templates**: nieuwe `messaging_templates` tabel (bij Fase 4.14)
- Twee aparte tabellen omdat de lifecycle anders is (marketing = operator maakt, transactioneel = systeem templates met variabelen)

### WhatsApp vs Email routing

Channel selectie logica zit in een `resolve-channel` utility function, niet in individuele edge functions. Elke messaging edge function roept `resolveChannel(customerId, messageType)` aan die bepaalt: WhatsApp, email, of beide.

---

## Relatie met bestaande documenten

| Document | Relevantie |
|---|---|
| `AI_FEATURE_6_WHATSAPP.md` | WhatsApp tab configuratie, templates, channel selectie |
| `AI_FEATURE_2_BRIEFING.md` | Briefing settings in Notificaties > Email |
| `WHATSAPP_INTEGRATION_CHANGES.md` | Fase 4.14 scope uitbreiding |
| `AI_LEARNING_CYCLE.md` | guest_communication_profile voor WhatsApp personalisatie |
| `nesto-pre-launch-checklist.md` | Resend domein verificatie, email configuratie |
