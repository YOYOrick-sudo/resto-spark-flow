# AI Feature 5: Menu Engineering AI

> Bouw dit bij Fase 6 (Kaartbeheer), wanneer er 3+ maanden verkoopdata en ingevulde kostprijzen zijn.

## Wat het doet

Elk gerecht op de menukaart krijgt automatisch een performance score en een classificatie. Het systeem identificeert welke gerechten geld opleveren, welke populair zijn maar marge kosten, welke onbenut potentieel hebben, en welke je beter kunt schrappen. Bij excess ingrediënten (te veel geprept) suggereert het automatisch daily specials die die ingrediënten gebruiken.

## Waarom dit waarde levert

De meeste restaurants gebruiken een statische menukaart die 2-4 keer per jaar verandert op basis van gevoel. De traditionele menu engineering matrix (stars, puzzles, plow horses, dogs) is 40 jaar oud en wordt zelden bijgewerkt.

Intussen veranderen ingrediëntprijzen, seizoenen, en klantvoorkeuren continu. Een gerecht dat in januari een star was, kan in maart een plow horse zijn omdat de lamskosten met 15% zijn gestegen. Zonder continue monitoring ziet de operator dit pas als de kwartaalcijfers binnenkomen — maanden te laat.

De impact is direct financieel:
- Een plow horse (populair, lage marge) met €1.50 prijsverhoging op 400 bestellingen per maand = €600 extra marge
- Een dog (onpopulair, lage marge) die wordt vervangen door een nieuw gerecht met betere marge kan €200-500/maand opleveren
- Waste-reductie door specials bij overstock bespaart €100-300/maand

## De classificatie: vier categorieën

Het systeem gebruikt de BCG matrix, de industriestandaard voor menu engineering:

| Categorie | Populariteit | Marge | Actie |
|-----------|-------------|-------|-------|
| **Star** ⭐ | Hoog | Hoog | Behouden, prominent op menukaart |
| **Plow Horse** 🐴 | Hoog | Laag | Kandidaat voor prijsverhoging of ingrediënt-optimalisatie |
| **Puzzle** 🧩 | Laag | Hoog | Meer promoten, betere positie op kaart |
| **Dog** 🐕 | Laag | Laag | Overweeg verwijdering of complete herziening |

"Hoog" en "laag" zijn relatief: boven of onder het gemiddelde van alle items op de kaart.

## Hoe de scoring werkt

Elk gerecht krijgt een **performance score** (0-100) gebaseerd op:

| Factor | Gewicht | Wat het meet |
|--------|---------|--------------|
| Bruto marge percentage | 40% | (verkoopprijs - ingrediëntkosten) / verkoopprijs |
| Populariteitstrend | 30% | Stijgend / stabiel / dalend over de afgelopen 4 weken |
| Prep-efficiëntie | 20% | Opbrengst per minuut bereidingstijd (indien beschikbaar) |
| Waste-factor | 10% | Hoeveel van dit gerecht wordt weggegooid (indien bijgehouden) |

De score wordt wekelijks herberekend. De classificatie (star/plow horse/puzzle/dog) volgt automatisch uit de positie ten opzichte van het menu-gemiddelde.

De **populariteitstrend** wordt bepaald door de orders van de afgelopen 2 weken te vergelijken met de 2 weken daarvoor:
- Stijging >10% = "rising"
- Daling >10% = "declining"
- Anders = "stable"

## Wat er moet worden gebouwd

### Nieuwe tabellen

**`menu_item_performance`**
Wekelijkse performance metrics per gerecht.

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key)
- `menu_item_id` (uuid, foreign key naar menu_items)
- `period` (text — '2026-W10')
- `orders_count` (integer) — aantal keer besteld deze periode
- `revenue` (numeric) — totale omzet
- `food_cost` (numeric) — totale ingrediëntkosten
- `gross_margin` (numeric) — omzet minus kosten
- `margin_pct` (float) — marge als percentage
- `popularity_pct` (float) — percentage van totale orders
- `popularity_trend` (text: 'rising', 'stable', 'declining')
- `performance_score` (float, 0-100) — gewogen totaalscore
- `classification` (text: 'star', 'plow_horse', 'puzzle', 'dog')
- `created_at` (timestamp)

Unique constraint op (location_id, menu_item_id, period).

**`menu_recommendations`**
Automatisch gegenereerde suggesties.

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key)
- `menu_item_id` (uuid, foreign key)
- `recommendation_type` (text):
  - `price_increase` — populair genoeg om prijsverhoging te dragen
  - `price_decrease` — prijs verlagen om volume te verhogen
  - `promote` — meer zichtbaarheid geven (betere positie op kaart)
  - `consider_removing` — overweeg verwijdering
  - `ingredient_swap` — goedkoper ingrediënt met vergelijkbaar resultaat
  - `portion_adjust` — portiegrootte aanpassen
  - `daily_special` — gebruik als special bij overstock
- `title` (text) — korte omschrijving
- `rationale` (text) — uitleg waarom
- `estimated_impact` (jsonb) — geschatte financiële impact
  - monthly_revenue_change, margin_improvement_pct
- `status` (text: 'pending', 'accepted', 'dismissed', 'implemented')
- `created_at` (timestamp)

**`waste_special_suggestions`**
Suggesties voor daily specials op basis van overstock.

Kolommen:
- `id` (uuid, primary key)
- `location_id` (uuid, foreign key)
- `suggestion_date` (date)
- `ingredient_id` (uuid, foreign key)
- `ingredient_name` (text)
- `excess_qty` (numeric) — hoeveel teveel
- `unit` (text)
- `expiry_date` (date, nullable)
- `suggested_dishes` (jsonb array) — welke gerechten dit ingrediënt gebruiken
- `status` (text: 'pending', 'used', 'wasted', 'dismissed')
- `created_at` (timestamp)

### Database functie

**`calculate_menu_scores(location_id, period)`**
- Berekent het menu-gemiddelde voor populariteit en marge
- Classificeert elk item als star/plow_horse/puzzle/dog
- Berekent de performance_score per item
- Genereert recommendations voor plow horses (prijsverhoging) en dogs (overweeg verwijdering)
- Slaat alles op in menu_item_performance en menu_recommendations

### Edge Function en cron

**`score-menu-items`** — Edge Function
- Getriggerd door pg_cron, wekelijks (zondag 04:00 UTC)
- Draait voor alle locaties met kitchen + kaartbeheer modules enabled
- Roept calculate_menu_scores aan per locatie
- Genereert ook waste_special_suggestions door prep plan actuals te vergelijken met verbruik

### Signal Provider

**`MenuPerformanceSignalProvider`** — registreer in evaluate-signals.

Signals:
| Signal | Severity | Conditie | Cooldown |
|--------|----------|----------|----------|
| `menu_plow_horses` | info | 2+ plow horses gedetecteerd — prijsverhoging overwegen | 1 week |
| `menu_declining_items` | info | 3+ gerechten met dalende populariteitstrend | 1 week |
| `menu_dogs_detected` | warning | Items met lage populariteit én lage marge | 2 weken |
| `waste_special_opportunity` | info | Overstock ingrediënt gevonden, special mogelijk | 1 dag |

### UI

**Menu Engineering Dashboard** — route: `/kaartbeheer/engineering`

**Hoofdview: BCG Matrix**
Een visueel kwadrant (2×2 grid) waar elk gerecht als een cirkel wordt getoond:
- X-as: populariteit (laag → hoog)
- Y-as: marge (laag → hoog)
- Cirkelgrootte: omzet volume
- Kleur: trend (groen = stijgend, grijs = stabiel, rood = dalend)
- Klik op een gerecht voor detail

**Per-item detail card**
Bij klik op een gerecht:
- Performance score (0-100) met visuele balk
- Classificatie badge (star/plow horse/puzzle/dog)
- Marge: bedrag en percentage
- Populariteit: percentage van orders, trend pijl
- Kostprijs breakdown (ingrediënten)
- Aanbevelingen (indien beschikbaar)

**Recommendations panel**
Lijst van openstaande aanbevelingen:
- Per aanbeveling: type icoon, titel, rationale, geschatte impact
- Acties: "Toepassen" (zet status op implemented), "Later" (dismiss)
- Filter op type (prijsverhoging, verwijdering, etc.)

**Waste Specials** (apart tab of integratie in keukenmodule)
- Lijst van overstock-ingrediënten met suggesties welke gerechten je als special kunt draaien
- "Vandaag: 3 kg zalm over → overweeg als lunch special"

**Integratie met kaartbeheer-overzicht**
Op de bestaande gerechten-overzichtspagina (Fase 6.1):
- Kleine indicator per gerecht: ⭐🐴🧩🐕
- Sorteerbaar op performance score
- Trend-pijl (↑ stijgend, → stabiel, ↓ dalend)

## Wat dit NIET doet

- Geen automatische prijswijzigingen — het suggereert, operator beslist
- Geen menukaart-design of layout suggesties
- Geen receptaanpassingen — het signaleert, de kok beslist
- Geen dynamic pricing op de menukaart (wel later mogelijk voor delivery)
- Geen vergelijking met andere restaurants (dat doet Feature 4)

## Data vereisten

De feature is afhankelijk van goede inputdata:

| Data | Bron | Verplicht? |
|------|------|-----------|
| Verkoopdata per gerecht | POS of handmatige invoer | Ja |
| Ingrediëntkosten per gerecht | Recepten + ingrediëntprijzen (Fase 5) | Ja |
| Bereidingstijd per gerecht | Handmatige invoer in recepten | Nee (verbetert score) |
| Waste per gerecht | Handmatige invoer of prep plan actuals | Nee (verbetert score) |

Zonder verkoopdata en kostprijzen kan de feature niet functioneren. Dit is een harde afhankelijkheid van Fase 5 (Keuken) en Fase 6 (Kaartbeheer).

## Later uitbreiden met

- **Prijselasticiteit** — schat hoeveel volume je verliest bij een prijsverhoging (vereist 6+ maanden data met enige prijsvariatie)
- **Kannibalisatie-analyse** — detecteer welke gerechten elkaars orders afpakken (vereist gedetailleerde orderdata)
- **Seizoenspatronen** — automatisch seizoensgerechten identificeren en timing voorstellen
- **Ingredient-overlap optimalisatie** — gerechten die dezelfde ingrediënten delen scoren hoger (minder waste, eenvoudiger inkoop)
- **Dynamic pricing voor delivery** — automatische prijsaanpassingen op bezorgplatforms (waar prijsfluctuaties minder opvallen)
- **A/B testing op digitale menu's** — test gerechtnamen, beschrijvingen, en volgorde op QR-code menu's
