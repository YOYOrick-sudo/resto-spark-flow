# AI Feature 3: Auto-Prep Engine

> Bouw dit bij Fase 5 (Keukenmodule), wanneer recepten en ingrediënten data beschikbaar is en er minimaal 4 weken reserveringsdata is.

## Wat het doet

Het systeem berekent elke nacht hoeveel covers er morgen verwacht worden, vertaalt dat via de menukaart en recepten naar een ingrediëntlijst, en presenteert dat als een concrete prep-werklijst. Optioneel genereert het ook een bestelvoorstel voor leveranciers.

De chef opent 's ochtends de app en ziet: "Vandaag: prep 14 kg kipfilet, 8 kg pasta, 6 kg zalm. Geschatte kosten: €342." Geen spreadsheets, geen buikgevoel — een berekend plan.

## Waarom dit waarde levert

Food waste kost een gemiddeld restaurant 4-10% van de ingekochte voeding. De belangrijkste oorzaak is over-preppen op basis van buikgevoel. Restaurants die demand forecasting gebruiken zien 40-55% reductie in food waste. Bij een restaurant met €500K jaarlijkse inkoopkosten is 5% besparing €25.000 per jaar.

De auto-prep engine lost drie problemen tegelijk op:
1. **Te veel prep** → food waste (geld in de prullenbak)
2. **Te weinig prep** → 86'd items, teleurgestelde gasten, gemiste omzet
3. **Tijdverspilling** → manager hoeft niet meer handmatig te berekenen

## Hoe de forecast werkt

### MVP: Gewogen gemiddelde (geen ML nodig)

De forecast gebruikt een simpele maar effectieve methode:

1. **Pak de afgelopen 4 weken** op dezelfde dag van de week (bijv. alle dinsdagen)
2. **Bereken het gewogen gemiddelde** (recent telt zwaarder: 70% afgelopen 4 weken, 30% afgelopen 8 weken)
3. **Corrigeer voor trend** (als de afgelopen 4 weken drukker waren dan de 4 weken daarvoor, schaal op)
4. **Neem het maximum** van de forecast en de reeds bevestigde reserveringen (nooit lager voorspellen dan wat al geboekt is)

Dit levert in de praktijk een forecast met 80-85% accuracy (binnen 15% van werkelijk). Dat is voldoende voor prep planning met een buffer.

### Later: upgrade mogelijkheden

Als de accuracy onvoldoende blijkt (>15% afwijking structureel), kan de berekeningsfunctie worden vervangen door een API-call naar een extern model (Prophet of LightGBM) dat ook rekening houdt met weer, evenementen, en seizoenspatronen. De rest van het systeem (prep plan, UI, signals) verandert niet.

## De keten: forecast → dish mix → ingrediënten → prep plan

```
Stap 1: Hoeveel covers morgen?
  → Forecast: 127 covers

Stap 2: Welke gerechten worden besteld?
  → Menu mix: 15% bestelt de kipgerecht, 10% de zalm, 8% de risotto...
  → Bron: historische verkoopdata per gerecht, of handmatig ingestelde percentages

Stap 3: Hoeveel van elk ingrediënt?
  → Kipgerecht: 200g kipfilet per portie
  → 127 covers × 15% kip × 200g = 3.8 kg kipfilet
  → Herhaal voor elk ingrediënt via de recepten-database

Stap 4: Voeg buffer toe
  → 15% buffer standaard (instelbaar per locatie)
  → 3.8 kg + 15% = 4.4 kg kipfilet

Stap 5: Presenteer als werklijst
  → "Prep vandaag: 4.4 kg kipfilet, 9.2 kg pasta, 7.5 kg zalm..."
```

## Wat er moet worden gebouwd

### Aanpassingen aan Fase 5 tabellen

De keukenmodule-tabellen die al gepland zijn moeten AI-ready zijn:

**`ingredients` tabel** — voeg toe:
- `price_per_unit` (numeric) — prijs per eenheid (kg, liter, stuk)
- `unit` (text, default 'kg') — standaard eenheid
- `min_stock_qty` (numeric) — minimale voorraad voor inkoop-signalen

**`recipe_ingredients` tabel** (koppeling recept → ingrediënt) — voeg toe:
- `quantity` (numeric, verplicht) — hoeveelheid per 1 portie in de eenheid van het ingrediënt

**`menu_items` tabel** (Fase 6, maar referentie al nodig) — voeg toe:
- `popularity_pct` (float, default 0.10) — welk percentage van gasten dit gerecht bestelt
- Dit wordt later automatisch berekend uit verkoopdata, maar start handmatig (operator vult schattingen in)

### Nieuwe tabellen

**`daily_forecasts`**
Slaat de voorspelling per locatie per dag op.

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key)
- `forecast_date` (date)
- `method` (text: 'weighted_average', later 'prophet' of 'lightgbm')
- `predicted_covers` (integer)
- `confidence_low` (integer) — ondergrens 80% interval
- `confidence_high` (integer) — bovengrens
- `predicted_dish_mix` (jsonb) — percentage per menu item
- `factors` (jsonb) — welke factoren meewogen (dag, trend, etc.)
- `actual_covers` (integer, nullable) — wordt achteraf ingevuld voor accuracy tracking
- `created_at` (timestamp)

Unique constraint op (location_id, forecast_date).

**`daily_prep_plans`**
Het concrete prep plan per dag.

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key)
- `prep_date` (date)
- `forecast_id` (uuid, foreign key naar daily_forecasts)
- `plan_items` (jsonb array) — lijst van ingrediënten met hoeveelheden:
  - ingredient_id, ingredient_name, unit
  - predicted_qty (berekend), buffer_qty, total_qty
  - cost_estimate
- `status` (text: 'generated', 'reviewed', 'in_progress', 'completed')
- `reviewed_by` (uuid, nullable — wie heeft het goedgekeurd)
- `reviewed_at` (timestamp)
- `notes` (text)
- `created_at` (timestamp)

Unique constraint op (location_id, prep_date).

**`purchase_suggestions`**
Optioneel bestelvoorstel op basis van het prep plan.

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key)
- `suggestion_date` (date)
- `supplier_id` (uuid, nullable — referentie naar toekomstige suppliers tabel)
- `items` (jsonb array) — ingredient_id, ingredient_name, suggested_qty, days_coverage, estimated_cost
- `status` (text: 'pending', 'approved', 'ordered', 'skipped')
- `created_at` (timestamp)

**`forecast_accuracy`**
Tracking van voorspelkwaliteit voor model-evaluatie.

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key)
- `forecast_date` (date)
- `method` (text)
- `predicted_covers` (integer)
- `actual_covers` (integer)
- `error_pct` (float, generated/computed — absolute afwijking als percentage)
- `created_at` (timestamp)

### Database functies

**`generate_covers_forecast(location_id, target_date)`**
- Berekent verwachte covers via gewogen gemiddelde
- Leest historische reserveringen (afgelopen 4 en 8 weken, zelfde dag)
- Corrigeert voor trend en neemt maximum met bevestigde boekingen
- Retourneert een integer (verwachte covers)

**`generate_prep_plan(location_id, target_date, buffer_pct)`**
- Roept generate_covers_forecast aan
- Schrijft forecast naar daily_forecasts
- Vermenigvuldigt covers × dish mix × recepthoeveelheden per ingrediënt
- Voegt buffer toe (standaard 15%)
- Schrijft resultaat naar daily_prep_plans

### Edge Functions en cron

**`generate-daily-forecast`** — Edge Function
- Getriggerd door pg_cron, dagelijks om 02:00 UTC
- Draait voor alle actieve locaties met kitchen module enabled
- Roept de PL/pgSQL forecast-functie aan per locatie
- Slaat resultaat op in daily_forecasts

**`generate-prep-plan`** — Edge Function
- Getriggerd door pg_cron, dagelijks om 02:30 UTC (na de forecast)
- Alleen voor locaties die recepten en ingrediënten hebben ingevuld
- Roept de PL/pgSQL prep-plan-functie aan
- Slaat resultaat op in daily_prep_plans

**Dagelijks achteraf: actual_covers bijwerken**
- Een extra cron job (bijv. 03:00 UTC) die de vorige dag evalueert
- Telt completed reserveringen van gisteren
- Schrijft actual_covers naar daily_forecasts
- Maakt een forecast_accuracy record aan

### Signal Provider

**`ForecastSignalProvider`** — registreer in evaluate-signals.

Signals:
| Signal | Severity | Conditie |
|--------|----------|----------|
| `prep_plan_missing` | warning | Geen prep plan voor morgen terwijl er reserveringen zijn |
| `forecast_deviation` | info | Forecast wijkt >25% af van het gemiddelde (drukker of rustiger dan normaal) |
| `low_stock_alert` | warning | Ingrediënt voorraad onder min_stock_qty na prep plan berekening |

### UI

**Prep Planning pagina** — route: `/keuken/prep`

Layout:
- Bovenaan: forecast card (verwachte covers, vergelijking met vorige week, confidence range)
- Hoofdtabel: ingrediëntenlijst met kolommen: Ingrediënt, Nodig, Buffer, Totaal, Geschatte kosten
- Sorteerbaar op hoeveelheid of kosten
- Acties: "Plan goedkeuren" (zet status op 'reviewed'), "Aanpassen" (inline editing van hoeveelheden)
- Onderaan: totale geschatte kosten

**Forecast accuracy grafiek** — beschikbaar via een tab of apart scherm
- Lijndiagram: voorspeld vs werkelijk over de afgelopen 4 weken
- MAPE percentage getoond (mean absolute percentage error)
- Doel: <15% gemiddelde afwijking

**Integratie met ochtend-briefing (Feature 2)**
Zodra Feature 3 actief is, wordt het prep plan samengevat in de ochtend-briefing: "Prep plan gegenereerd: 12 ingrediënten, geschatte kosten €342."

### Settings

- `prep_buffer_pct` (float, default 0.15) — buffer percentage
- `auto_generate_prep_plan` (boolean, default true) — automatisch plan genereren
- `prep_plan_notification` (boolean, default true) — melding wanneer plan klaar is

## Wat dit NIET doet

- Geen directe koppeling met leverancierssystemen (dat is een toekomstige integratie)
- Geen voorraadmanagement (het berekent wat er nodig is, niet wat er al is — tenzij voorraad handmatig wordt bijgehouden)
- Geen automatische bestellingen plaatsen — het genereert suggesties die de operator goedkeurt
- Geen ML in de eerste versie — puur statistisch (gewogen gemiddelde + trend)

## Later uitbreiden met

- Weer-data als forecast-factor (regen → meer soep, minder salade)
- Evenementen-data (feestdagen, lokale evenementen → hogere/lagere covers)
- Automatische popularity_pct berekening uit POS/verkoopdata
- Voorraad-integratie (huidige voorraad aftrekken van prep hoeveelheid)
- Leverancier-integratie (bestelvoorstel direct doorsturen)
- ML-upgrade: Prophet of LightGBM voor nauwkeurigere forecasts
