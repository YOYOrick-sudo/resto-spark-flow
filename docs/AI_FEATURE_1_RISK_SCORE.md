# AI Feature 1: No-Show Risicoscore

> Bouw dit bij Fase 4.6 (Reservation Model + Status Machine)

## Wat het doet

Elke reservering krijgt automatisch een risicoscore van 0% tot 100% die aangeeft hoe waarschijnlijk het is dat de gast niet komt opdagen. Shifts krijgen een geaggregeerd risicoprofiel. Bij hoog risico suggereert het systeem strategisch overboeken.

## Waarom dit waarde levert

No-shows kosten een gemiddeld restaurant 5-15% van de potentiële omzet. Een tafel-voor-vier die niet komt opdagen op vrijdagavond is €200-300 gemiste omzet. Door risico te voorspellen kan de operator:
- Bevestigingsberichten sturen naar hoog-risico boekingen
- Slim overboeken bij shifts met veel risico (zoals airlines doen)
- De wachtlijst automatisch activeren voor risicovolle slots

## Hoe de score wordt berekend

De score is een gewogen combinatie van vijf factoren:

| Factor | Gewicht | Logica |
|--------|---------|--------|
| **Gasthistorie** | 40% | Percentage no-shows van deze gast in het verleden. Nieuwe gasten krijgen een default van 15%. |
| **Groepsgrootte** | 20% | Grotere groepen hebben iets hoger risico. 2 pers = laag, 6+ = hoger. |
| **Boekingstermijn** | 20% | Ver van tevoren geboekt = hoger risico. Vandaag/morgen = laag risico. |
| **Kanaal** | 10% | Walk-in/telefoon = laag risico. Online widget = gemiddeld. Third-party = hoger. |
| **Dag van de week** | 10% | Weekend = iets hoger risico dan doordeweeks. |

De score wordt berekend als een PL/pgSQL functie die automatisch wordt aangeroepen via een database trigger bij het aanmaken of wijzigen van een reservering.

Nieuwe gasten zonder historie krijgen een neutrale score (~15%). Naarmate gasten vaker komen, wordt hun score nauwkeuriger.

## Wat er moet worden gebouwd

### Aanpassingen aan bestaande tabellen

**`customers` tabel** (wordt aangemaakt in Fase 4.6)
Voeg deze kolommen toe zodat de tabel AI-ready is:
- `total_visits` (integer, default 0) — automatisch opgehoogd bij status → completed
- `no_show_count` (integer, default 0) — automatisch opgehoogd bij status → no_show
- `cancel_count` (integer, default 0) — automatisch opgehoogd bij status → cancelled
- `avg_spend_per_visit` (numeric) — bijgewerkt bij completed reserveringen met omzetdata
- `last_visit_at` (timestamp) — laatste bezoek
- `first_visit_at` (timestamp) — eerste bezoek
- `tags` (jsonb, default []) — automatisch berekende tags zoals "vip", "frequent_canceller", "new_guest"

Een trigger op de `reservations` tabel werkt deze kolommen automatisch bij bij elke status-overgang. Geen handmatige invoer nodig.

**`reservations` tabel** (wordt aangemaakt in Fase 4.6)
Voeg toe:
- `no_show_risk_score` (float, 0.0–1.0) — de berekende score
- `risk_factors` (jsonb) — breakdown per factor voor transparantie in de UI

### Nieuwe database-objecten

**Functie: `calculate_no_show_risk(reservation_id)`**
- Input: een reservering-ID
- Leest: de reservering + gekoppelde customer stats
- Berekent: gewogen score volgens bovenstaande tabel
- Schrijft: resultaat naar `reservations.no_show_risk_score` en `risk_factors`
- Wordt aangeroepen via trigger bij INSERT of UPDATE van relevante velden (customer_id, party_size, channel, reservation_date)

**Trigger: `trg_update_customer_stats`**
- Luistert naar UPDATE van `reservations.status`
- Bij status → completed: verhoog total_visits, update last_visit_at
- Bij status → no_show: verhoog no_show_count
- Bij status → cancelled: verhoog cancel_count

**View: `shift_risk_summary`**
- Groepeert reserveringen per shift + datum
- Berekent: gemiddeld risico, aantal hoog-risico boekingen, totale covers, suggestie voor overboek-covers
- Suggestie = som van (individuele risicoscores × party_size), afgerond

### Signal Provider

**`NoShowRiskSignalProvider`** — registreer in het bestaande evaluate-signals framework.

Signals die het genereert:
| Signal | Severity | Conditie |
|--------|----------|----------|
| `high_noshow_risk_shift` | warning | Shift heeft gemiddeld risico > 30% |
| `high_risk_reservations_today` | info | 3+ bevestigde reserveringen vandaag met score > 60% |

De shift-level signal is een insight (combineert meerdere datapunten). De individuele hoog-risico signal is een signal (feitelijke observatie).

### Integratie met Availability Engine (Fase 4.5)

De availability engine heeft al een gepland veld `overbooking_tolerance (default 0)`. Breid dit uit:
- Nieuwe locatie-setting: `smart_overbooking_enabled` (boolean, default false)
- Wanneer enabled: de engine leest `shift_risk_summary.suggested_overbook_covers` en voegt dat toe aan de beschikbare capaciteit
- De operator behoudt altijd de controle — de setting is opt-in en het systeem toont altijd waarom extra slots beschikbaar zijn

### UI

**Reservering Detail Panel (Fase 4.7)**
Voeg een risico-sectie toe:
- Visuele balk (0-100%) met kleur (groen/oranje/rood)
- Breakdown per factor ("Gasthistorie: 3 van 8 bezoeken no-show")
- Actieknop: "Bevestiging sturen" bij hoog risico

**Grid/List View**
Badge op reserveringen:
- Score < 30%: geen badge
- Score 30-50%: oranje waarschuwingsbadge
- Score > 50%: rode badge

**Settings**
- Toggle: "Slim overboeken inschakelen"
- Uitleg dat het systeem automatisch extra capaciteit toevoegt bij hoge no-show verwachting

**Ochtend-Briefing integratie (Feature 2)**
De briefing vermeldt: "X reserveringen met hoog no-show risico vandaag" met directe link.

## Wat dit NIET doet

- Geen automatisch annuleren van reserveringen op basis van risico
- Geen strafmaatregelen voor gasten (dat is een bewuste keuze van de operator)
- Geen ML — puur gewogen regels in PL/pgSQL. ML-upgrade is later mogelijk door dezelfde functie te vervangen door een API-call naar een extern model

## Later: ML upgrade pad

Na 6+ maanden en 1000+ historische reserveringen kan de PL/pgSQL functie worden vervangen door een XGBoost classifier die via een externe service (Cloud Run) wordt aangeroepen. De verwachte accuracy-verbetering is van ~70% (regels) naar ~85-90% (ML). De UI en signals veranderen niet — alleen de berekeningslaag.

De `forecast_accuracy` tabel (zie Feature 3) en de `customer_stats` data verzamelen vanaf dag één de trainingsdata die hiervoor nodig is.
