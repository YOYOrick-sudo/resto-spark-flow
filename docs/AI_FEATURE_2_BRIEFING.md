# AI Feature 2: Ochtend-Briefing & Weekrapport

> Bouw dit na Fase 7.4.2 (Live Signals) en wanneer Resend email is geconfigureerd

## Wat het doet

Elke ochtend ontvangen eigenaren en managers een email met alles wat ze moeten weten voor die dag: verwachte drukte, risico's, actiepunten, en shiftstatus. Op maandag komt er een weekrapport bij met trends en vergelijkingen. Dezelfde informatie is ook als dashboardpagina beschikbaar in de app.

## Waarom dit waarde levert

Het kernprobleem in horeca: managers beginnen hun dag met 15-20 minuten rondklikken in systemen om een beeld te krijgen. "Hoeveel reserveringen vandaag? Zijn er annuleringen? Moet ik extra inkopen?" Dit is precies het werk dat een systeem kan overnemen.

ClearCOGS (een restaurant AI-startup die $3.8M heeft opgehaald) ontdekte dat operators hun chatbot-interface afwezen maar enthousiast werden van dagelijks gepushte antwoorden. De les: **delivery beats dashboards**. Informatie die naar je toekomt is waardevoller dan informatie die je moet opzoeken.

## Wat de briefing bevat

### Ochtend-briefing (dagelijks)

**Blok 1: Covers overzicht**
- Verwachte covers vandaag (uit bevestigde reserveringen + verwachte walk-ins)
- Vergelijking met dezelfde dag vorige week
- Bevestigd / pending / opties die verlopen

**Blok 2: Shifts**
Per shift (lunch, diner, etc.):
- Aantal reserveringen en covers
- Bezettingspercentage
- Status indicator: rustig / normaal / druk / vol

**Blok 3: Actiepunten**
Alleen als er iets te doen is:
- Hoog-risico reserveringen die een bevestiging nodig hebben (vanuit Feature 1)
- Opties die vandaag verlopen
- Ongelezen wachtlijst-entries
- Openstaande configuratie-issues (vanuit config signals)

**Blok 4: Signalen samenvatting**
- Aantal actieve error/warning/info signals uit de Assistant
- Link naar de Assistant-pagina voor details

**Later toe te voegen (wanneer beschikbaar):**
- Weersvoorspelling + verwachte impact op covers
- Prep plan samenvatting (vanuit Feature 3)
- Personeelssuggestie ("1 server minder nodig bij lunch")

### Weekrapport (maandag)

- Totale covers deze week vs. vorige week
- No-show rate en annuleringsrate
- Top-shift (drukste) en rustigste shift
- Trends: stijgend/dalend/stabiel per metric
- Als benchmarks beschikbaar (Feature 4): vergelijking met categorie

## Hoe het technisch werkt

### Nieuwe tabel: `briefings`

Slaat gegenereerde briefings op zodat ze ook in-app bekeken kunnen worden.

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key naar locations)
- `briefing_type` (text: 'morning' of 'weekly')
- `briefing_date` (date)
- `content` (jsonb — gestructureerde briefing data, zie hieronder)
- `email_sent_at` (timestamp — wanneer de email is verstuurd)
- `email_recipients` (text array — wie heeft de email ontvangen)
- `created_at` (timestamp)

Unique constraint op (location_id, briefing_type, briefing_date) zodat er nooit dubbele briefings zijn.

### Content structuur (jsonb)

De content is gestructureerd als JSON zodat zowel de email-template als de dashboard-UI dezelfde data kunnen renderen:

```
{
  "date": "2026-03-15",
  "location_name": "Restaurant De Kas",
  "covers": {
    "expected_today": 127,
    "vs_last_week": "+12%",
    "confirmed": 98,
    "pending": 14,
    "options_expiring": 3
  },
  "risk": {
    "high_risk_count": 4,
    "suggested_overbook": 3
  },
  "shifts": [
    {
      "name": "Lunch",
      "time": "11:30-15:00",
      "covers": 48,
      "capacity_pct": 67,
      "status": "ok"
    }
  ],
  "actions": [
    {
      "type": "confirm_high_risk",
      "message": "4 reserveringen met hoog no-show risico",
      "action_path": "/reserveringen?filter=high_risk"
    }
  ],
  "signals_summary": {
    "error": 0,
    "warning": 2,
    "info": 3
  }
}
```

### Edge Functions

**`generate-morning-briefing`**
- Getriggerd door pg_cron (elke 15 minuten tussen 05:00-08:00 UTC)
- De functie filtert op timezone per locatie — stuurt alleen als het lokaal rond 07:00 is
- Leest: reserveringen voor vandaag, shift_risk_summary, actieve signals
- Schrijft: briefings tabel
- Stuurt: email via Resend naar owners + managers

**`generate-weekly-report`**
- Getriggerd door pg_cron (maandag 07:00 UTC)
- Leest: reserveringen van afgelopen week, vergelijking met week ervoor
- Schrijft: briefings tabel met type 'weekly'
- Stuurt: email via Resend

### pg_cron configuratie

Twee cron jobs:
1. Morning briefing: `*/15 5-8 * * *` (elke 15 min, 05:00-08:00 UTC)
2. Weekly report: `0 7 * * 1` (maandag 07:00 UTC)

De morning briefing draait elke 15 minuten maar de Edge Function checkt per locatie of het de juiste lokale tijd is. Zo worden locaties in verschillende tijdzones correct bediend.

### Integratie met bestaande systemen

**Signal Provider framework:** De briefing leest actieve signals uit de `assistant_signals` tabel. Het is geen nieuwe signal provider zelf — het is een consument van signals.

**Resend:** Staat al in de pre-launch checklist. De briefing gebruikt dezelfde Resend configuratie die al gepland is voor reserveringsbevestigingen en reminders. Email template volgt de Nesto huisstijl.

**Ontvangers:** Leest uit `user_location_roles` — alle users met role 'owner' of 'manager' ontvangen de briefing. Instelbaar via settings.

### Settings uitbreiding

Voeg toe aan reservation_settings (of een nieuwe intelligence_settings tabel):
- `morning_briefing_enabled` (boolean, default true)
- `briefing_time` (time, default '07:00') — gewenste ontvangst-tijd lokaal
- `weekly_report_enabled` (boolean, default true)
- `briefing_recipients` (text: 'owners_only', 'owners_managers', of 'custom')

### UI: Dashboard als Briefing View

Het huidige dashboard is een placeholder. Vervang het door de briefing-view:

De pagina toont de meest recente ochtend-briefing voor de actieve locatie. Layout:
- Bovenaan: drie stat-cards (covers vandaag, bezettingsgraad drukste shift, aantal actiepunten)
- Midden: shifts overzicht als compact lijstje
- Onderaan: actiepunten lijst (alleen als er acties zijn)
- Zijpaneel of tab: weekrapport (als het maandag is of later in de week)

De pagina laadt data uit de `briefings` tabel — het genereert niets zelf. Als er nog geen briefing is voor vandaag (bijvoorbeeld als de cron job nog niet gedraaid heeft), toon een "Briefing wordt om [tijd] gegenereerd" bericht.

## Wat dit NIET doet

- Geen personalisatie per gebruiker (alle owners/managers krijgen dezelfde briefing)
- Geen real-time updates (het is een snapshot, gegenereerd op een vast tijdstip)
- Geen interactieve chat of vragen stellen
- Geen push notificaties in de app (alleen email + dashboard view)

## Later uitbreiden met

- Weer-data integratie (OpenWeatherMap API) met impact-schatting op covers
- Prep plan samenvatting (wanneer Feature 3 actief is)
- Personeelssuggesties (wanneer er roosterdata beschikbaar is)
- WhatsApp als alternatief kanaal naast email
