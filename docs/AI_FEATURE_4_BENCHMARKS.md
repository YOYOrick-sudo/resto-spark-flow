# AI Feature 4: Cross-Restaurant Benchmarks

> Bouw dit wanneer er 20+ actieve locaties op het platform zijn en minimaal 3 maanden data per locatie.

## Wat het doet

Het systeem vergelijkt de prestaties van een restaurant met geanonimiseerde gemiddelden van vergelijkbare restaurants op het Nesto-platform. "Je food cost is 33%. Vergelijkbare casual dining restaurants zitten op 28%. Grootste afwijking: rundvlees." Dit maakt onzichtbare problemen zichtbaar die een operator zelf niet kan detecteren.

## Waarom dit waarde levert

Een restaurateur heeft geen referentiekader. Is 4% no-show veel of weinig? Is een food cost van 31% goed voor een bistro? Zonder vergelijking weet je het niet. Benchmark-data maakt afwijkingen zichtbaar:

- **Food cost drift** — leveranciersprijzen stijgen geleidelijk, portiegrootte kruipt op, maar het valt niet op omdat er geen vergelijking is
- **No-show patronen** — sommige restaurants hebben structureel meer no-shows dan vergelijkbaar, wat wijst op een beleidsprobleem (geen aanbetaling, verkeerd kanaal)
- **Revenue per stoel** — een restaurant met 50 stoelen dat minder omzet per stoel draait dan vergelijkbare restaurants heeft een pacing of turnover probleem

Het verschil met een analytics dashboard: benchmarks vertellen je niet alleen hoe je presteert, maar **hoe je presteert ten opzichte van wat normaal is**. Dat is het verschil tussen "je food cost is 33%" en "je food cost is 33%, dat is 5 procentpunt boven het gemiddelde van vergelijkbare restaurants."

## Hoe het werkt

### Categorisering

Restaurants worden gematcht op basis van:
- **Restaurant type** (fine dining, casual dining, bistro, brasserie, fast casual, café, hotel restaurant)
- **Prijsklasse** (budget, mid-range, upscale, fine dining)

Dit maakt de vergelijking eerlijk. Een fine dining restaurant met 30% food cost is prima; een fast casual met 30% heeft een probleem. De combinatie van type + prijsklasse creëert vergelijkingsgroepen.

### Metrics die worden vergeleken

| Metric | Beschrijving | Bron |
|--------|-------------|------|
| `food_cost_pct` | Totale ingrediëntkosten als % van omzet | Keukenmodule |
| `no_show_rate` | Percentage no-shows van totale reserveringen | Reserveringen |
| `cancellation_rate` | Percentage annuleringen | Reserveringen |
| `avg_spend_pp` | Gemiddelde besteding per gast | Reserveringen + Finance |
| `covers_per_seat_day` | Gemiddelde covers per stoel per dag | Reserveringen + Tafels |
| `table_turn_time_min` | Gemiddelde tafeltijd in minuten | Reserveringen |

### Privacy en opt-in

**Kritisch principe: geen individuele data kruist location-grenzen.**

- Benchmarks werken alleen met **geaggregeerde, geanonimiseerde data**
- Een locatie moet expliciet opt-in geven via een setting: `benchmark_sharing_enabled`
- De benchmark-tabel bevat geen location_id — alleen categorie-gemiddelden
- Minimum sample size: benchmarks worden pas getoond als er minimaal 5 locaties in een categorie zitten
- De operator ziet alleen: "jouw waarde" vs "categorie p25/p50/p75" — nooit specifieke andere restaurants

## Wat er moet worden gebouwd

### Aanpassingen aan bestaande tabellen

**`locations` tabel** — voeg toe:
- `restaurant_type` (text) — type restaurant (fine_dining, casual_dining, etc.)
- `price_range` (text) — prijsklasse (budget, mid_range, upscale, fine_dining)
- `seat_count` (integer) — totaal aantal zitplaatsen
- `city` (text) — stad (voor toekomstige regionale benchmarks)
- `benchmark_sharing_enabled` (boolean, default false) — opt-in voor benchmarking

Deze velden worden ingevuld bij onboarding of in de locatie-settings.

### Nieuwe tabellen

**`benchmark_aggregates`**
Geaggregeerde benchmark-data per categorie per periode.

Kolommen:
- `id` (uuid, primary key)
- `restaurant_type` (text)
- `price_range` (text)
- `metric_key` (text — de metric naam)
- `period` (text — '2026-W10', '2026-03', etc.)
- `p25` (numeric — 25e percentiel)
- `p50` (numeric — mediaan)
- `p75` (numeric — 75e percentiel)
- `sample_size` (integer — hoeveel locaties in deze groep)
- `created_at` / `updated_at` (timestamps)

Unique constraint op (restaurant_type, price_range, metric_key, period).

**Belangrijk:** deze tabel bevat GEEN location_id. Het zijn puur categorie-aggregaties.

**`location_metrics`**
Per-locatie metrics per periode (alleen zichtbaar voor de eigen locatie).

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key)
- `period` (text)
- `metrics` (jsonb — alle metrics als key-value pairs)
- `created_at` (timestamp)

Unique constraint op (location_id, period).

### View: `location_benchmark_comparison`

Een database view die per locatie automatisch de vergelijking maakt:
- Jointed location_metrics met benchmark_aggregates op basis van restaurant_type + price_range + period
- Berekent per metric of de locatie 'below_average' (onder p25), 'average' (p25-p75), of 'above_average' (boven p75) zit
- RLS: alleen zichtbaar voor users met toegang tot de locatie

### Edge Function en cron

**`update-benchmarks`** — Edge Function
- Getriggerd door pg_cron, wekelijks (zondag 03:00 UTC)
- Stap 1: Berekent location_metrics voor alle locaties (uit reserveringen, keuken, finance data)
- Stap 2: Aggregeert naar benchmark_aggregates per categorie (alleen locaties met opt-in)
- Gebruikt `PERCENTILE_CONT` in SQL voor p25/p50/p75 berekeningen
- Vereist minimum 5 locaties per categorie; categorieën met minder worden overgeslagen

### RLS

- `benchmark_aggregates`: leesbaar voor iedereen (bevat geen gevoelige data)
- `location_metrics`: alleen eigen locatie (standaard location-gebaseerde RLS)
- Inserts in benchmark_aggregates: alleen via service_role (Edge Function) — niet door gebruikers

### Signal Provider

**`BenchmarkSignalProvider`** — registreer in evaluate-signals.

Signals:
| Signal | Severity | Conditie | Cooldown |
|--------|----------|----------|----------|
| `benchmark_food_cost_high` | warning | Food cost boven p75 van categorie | 1 week |
| `benchmark_noshow_high` | info | No-show rate boven p75 | 1 week |
| `benchmark_revenue_low` | info | Revenue per stoel onder p25 | 1 week |

De signals worden alleen gegenereerd voor locaties met `benchmark_sharing_enabled = true`.

### UI

**Onboarding uitbreiding**
Bij het aanmaken van een locatie (of in settings):
- Restaurant type selectie (dropdown)
- Prijsklasse selectie (dropdown)
- Stoelen-aantal (numeriek veld)
- Benchmark opt-in toggle met privacy-uitleg

**Benchmark dashboard** — beschikbaar als tab op de Insights/Dashboard pagina

Layout per metric:
- Metric naam en huidige waarde
- Visuele indicator: balk of meter die toont waar je zit t.o.v. p25/p50/p75
- Kleur: groen (goed), oranje (aandacht), rood (actie nodig)
- Toelichting: "Je food cost is 5 procentpunt boven de mediaan van vergelijkbare restaurants"

**Integratie met ochtend-briefing (Feature 2)**
Als er benchmark-afwijkingen zijn, worden die meegenomen in het weekrapport.

## Wat dit NIET doet

- Geen specifieke concurrentie-vergelijking (je ziet nooit data van een specifiek ander restaurant)
- Geen automatische acties op basis van benchmarks
- Geen benchmarks bij minder dan 5 locaties in een categorie
- Geen regionale vergelijking in de eerste versie (alleen op type + prijsklasse)
- Geen real-time benchmarks (wekelijks bijgewerkt)

## Later uitbreiden met

- Regionale benchmarks (Amsterdam vs. Rotterdam vs. rest van NL)
- Seizoenscorrectie (vergelijking met dezelfde periode vorig jaar)
- Trend-vergelijking ("je food cost daalt sneller dan het categorie-gemiddelde")
- Ingredient-level benchmarks (als genoeg locaties kostprijsdata delen)
- ML-gebaseerde clustering (automatisch vergelijkbare restaurants matchen i.p.v. handmatige categorieën)
