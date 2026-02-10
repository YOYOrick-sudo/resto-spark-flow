# NESTO AI — OVERZICHT & STRATEGIE

Laatst bijgewerkt: 10 februari 2026

---

## Visie

Nesto wordt geen platform dat data toont — het wordt een platform dat vertelt wat je moet doen. De AI-laag is geen chatbot of dashboard, maar een prescriptieve engine die dagelijks concrete acties levert: "prep 14 kg kip vandaag", "stuur bevestiging naar 3 risicoboekingen", "verhoog de prijs van de risotto met €1.50."

Het verschil met concurrenten: Nesto heeft als enige platform alle data onder één dak (reserveringen, keuken, menu, financiën). Daardoor kan het verbanden leggen die standalone tools niet kunnen. Bijvoorbeeld: een no-show op vrijdagavond → lege tafel → gemiste omzet → koppeling naar food waste omdat er teveel is geprept. Dat hele verhaal zit in Nesto, nergens anders.

---

## De vijf features

| # | Feature | Kern | Primaire waarde |
|---|---------|------|-----------------|
| 1 | No-Show Risicoscore | Elke reservering krijgt automatisch een risicoscore (0–100%) | Minder lege stoelen door slim overboeken |
| 2 | Ochtend-Briefing | Dagelijks gepushte samenvatting met actiepunten | Operator bespaart 15-20 min dagelijkse voorbereiding |
| 3 | Auto-Prep Engine | Verwachte covers → ingrediëntlijst → bestelvoorstel | 2-5% minder food waste, betere prep planning |
| 4 | Cross-Restaurant Benchmarks | Geanonimiseerde vergelijking met vergelijkbare restaurants | Afwijkingen in kosten/performance worden zichtbaar |
| 5 | Menu Engineering AI | Automatische performance-scoring per gerecht | Marge-optimalisatie door betere menusamenstelling |

---

## Bouwvolgorde en afhankelijkheden

**Fase A (na reserveringen-launch):**
- Feature 1: No-Show Risicoscore ← vereist: customers + reservations tabel (Fase 4.6 moet AF zijn)
- Feature 2: Ochtend-Briefing ← vereist: signal engine + Resend (Fase 7.4.2 moet AF zijn)

**Fase B (3-6 maanden live data):**
- Feature 3: Auto-Prep Engine ← vereist: recepten + ingrediënten + 4 weken data

**Fase C (6-12 maanden, 20+ locaties):**
- Feature 4: Benchmarks ← vereist: schaal + opt-in
- Feature 5: Menu Engineering ← vereist: verkoopdata + kostprijzen

De features bouwen op elkaar: risicoscores voeden de briefing, forecasts voeden het prep plan, het prep plan voedt de waste-detectie die weer de menu engineering voedt.

---

## Architectuurprincipes

### Regelgebaseerd eerst
Alles start als SQL/PL/pgSQL logica. Geen ML tot de regelgebaseerde versie aantoonbaar onvoldoende is (forecast accuracy <85%, risicoscore AUC <0.70).

### Batch boven realtime
Forecasts en prep plannen worden 's nachts berekend via pg_cron + Edge Functions. Risicoscores worden berekend bij het aanmaken van een reservering via een database trigger. Geen live ML inference nodig.

### Push boven pull
De belangrijkste output is de ochtend-briefing (email via Resend). De operator hoeft niet zelf in de app te zoeken naar inzichten.

### Dezelfde data-structuur voor regels en ML
Alle voorspellingen worden opgeslagen in vaste tabellen (`daily_forecasts`, `reservations.no_show_risk_score`). Als we later upgraden naar ML, verandert alleen de berekening — niet de opslag, niet de UI, niet de signals.

### Integratie via het bestaande Signal Provider pattern
Elke AI-feature levert signals via het bestaande `evaluate-signals` framework. Geen parallelle systemen.

---

## Impact op bestaande architectuur

### Wat niet verandert
- Multi-tenant structuur
- RLS
- `get_user_context()`
- Permission systeem
- Bestaande tabellen
- SignalProvider interface
- Device modes

### Wat wel verandert
- `module_key` enum: uitbreiden met `'intelligence'`
- `customers` tabel: extra kolommen voor bezoekstatistieken
- `reservations` tabel: risicoscore kolom
- `locations` tabel: restaurant profiel kolommen (type, prijsklasse)
- `briefings` tabel: opslag voor in-app weergave van briefings
- `daily_prep_plans` tabel: ingrediëntenlijst per dag
- Nieuwe permissions: `intelligence.view`, `intelligence.manage`
- 4-7 nieuwe Edge Functions
- 5-7 pg_cron jobs

---

## Pricing integratie

De AI-features worden onderdeel van pricing tiers, geen credits:

| Tier | Inhoud |
|------|--------|
| **Starter** | Reserveringen (geen AI) |
| **Professional** | + risicoscores + briefing + prep planning |
| **Enterprise** | + benchmarks + menu engineering |

---

## ML upgrade pad

Alle features zijn zo ontworpen dat de berekening later kan worden vervangen door een ML-model (via een FastAPI service op Cloud Run) zonder dat de rest van de applicatie verandert. De `forecast_accuracy` tabel verzamelt vanaf dag één de data die nodig is om later te evalueren of ML meerwaarde biedt.

---

## Feature-documenten

Zie de individuele feature-documenten voor gedetailleerde specificaties:

- `AI_FEATURE_1_RISK_SCORE.md`
- `AI_FEATURE_2_BRIEFING.md`
- `AI_FEATURE_3_PREP_ENGINE.md`
- `AI_FEATURE_4_BENCHMARKS.md`
- `AI_FEATURE_5_MENU_ENGINEERING.md`
