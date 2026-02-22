# Nesto AI — Leercyclus Architectuur

> Dit document beschrijft het universele leerpatroon dat Nesto's AI steeds slimmer maakt per restaurant. Upload als project knowledge naast AI_OVERVIEW.md en AI_INFRASTRUCTURE.md.

---

## Kernprincipe

Nesto's AI wordt de digitale stem van elk restaurant. Niet door één groot model te trainen, maar door **stijlprofielen per communicatiekanaal** op te bouwen die continu verbeteren op basis van operator feedback.

Eén AI model (Gemini Flash / Haiku), meerdere registers. Net als een mens die anders praat tegen klanten dan tegen vrienden: zelfde brein, ander register.

---

## Het Universele Leerpatroon

Dit patroon wordt toegepast bij ELKE AI-feature die content genereert of suggesties doet:

```
┌─────────────────────────────────────────────────┐
│  1. AI genereert suggestie                      │
│     (op basis van stijlprofiel + context)       │
│                                                 │
│  2. Operator past aan (of accepteert)           │
│                                                 │
│  3. Origineel + aanpassing worden bewaard        │
│                                                 │
│  4. Wekelijkse analyse detecteert patronen      │
│     (via marketing-analyze-brand cron)           │
│                                                 │
│  5. Stijlprofiel wordt bijgewerkt              │
│                                                 │
│  6. Volgende suggestie is beter                 │
│     (profiel wordt meegegeven in system prompt)  │
└─────────────────────────────────────────────────┘
```

### Waarom dit werkt

- **Geen fine-tuning nodig** — het profiel is tekst in een system prompt, geen model weights
- **Geen trainingsdata nodig** — 5 aanpassingen is genoeg voor een eerste profiel
- **Per restaurant uniek** — elk restaurant krijgt zijn eigen profielen
- **Transparant** — de operator kan het profiel inzien (toekomstig)
- **Goedkoop** — de analyse draait 1x per week, kost <€0.01 per restaurant

---

## Stijlprofielen

Alle profielen worden opgeslagen in `marketing_brand_intelligence` (per locatie). Elk profiel wordt onafhankelijk geleerd vanuit een specifiek type content.

| Profiel kolom | Geleerd van | Gebruikt voor | Status |
|---|---|---|---|
| `caption_style_profile` | Social post captions (best-performing) | Nieuwe captions, weekplannen | ✅ Actief (Sprint 3.1) |
| `visual_style_profile` | Best-performing foto's (AI vision) | Foto-suggesties in content generatie | ✅ Actief (Sprint 3.1) |
| `review_response_profile` | Operator-aangepaste review responses | Review antwoord suggesties | 🔜 Sprint 3.5b |
| `email_tone_profile` | Operator-aangepaste marketing emails | Email content suggesties | 📋 Gepland |
| `guest_communication_profile` | WhatsApp berichten aanpassingen | Gastcommunicatie (Fase 6B) | 📋 Gepland |
| `briefing_preference_profile` | Welke briefing-items operator leest/skipt | Briefing prioritering | 📋 Toekomstig |

### Hoe een profiel wordt gebouwd

**Fase 1 — Geen data (onboarding):**
De AI gebruikt generieke best practices. "Schrijf een professioneel, warm antwoord."

**Fase 2 — Passief leren (5-15 samples):**
De AI analyseert bestaande content (bijv. geïmporteerde Instagram posts, of eerste handmatige reviews). Er wordt een eerste profiel gegenereerd.

**Fase 3 — Actief leren (15+ samples met operator feedback):**
De AI vergelijkt originele suggesties met operator-aanpassingen. Het profiel wordt verfijnd op basis van wat de operator consequent toevoegt, verwijdert, of herschrijft.

**Fase 4 — Mature (50+ samples):**
Het profiel is stabiel. Suggesties worden zelden aangepast. De AI kent de stem van het restaurant.

### Learning Stage Mapping

De bestaande `learning_stage` in `marketing_brand_intelligence` bepaalt hoeveel de AI leunt op het profiel vs generieke best practices:

| Stage | Posts analyzed | AI gedrag |
|---|---|---|
| `onboarding` | 0 | 100% generiek, best practices |
| `learning` | 1-15 | 70% generiek, 30% profiel |
| `optimizing` | 16-50 | 30% generiek, 70% profiel |
| `mature` | 51+ | 10% generiek, 90% profiel |

Dit wordt in de system prompt meegegeven zodat het AI model weet hoeveel het kan vertrouwen op het profiel.

---

## Data Opslag voor Leren

### Patroon: Bewaar origineel + aanpassing

Bij ELKE AI-gegenereerde content die de operator kan aanpassen:

```sql
-- Voorbeeld: marketing_reviews
ai_original_response TEXT,    -- wat de AI suggereerde (immutable)
response_text TEXT,           -- wat de operator uiteindelijk opslaat
operator_edited BOOLEAN,      -- true als response_text != ai_original_response
```

```sql
-- Voorbeeld: marketing_social_posts (toekomstig)
ai_original_caption TEXT,     -- wat de AI genereerde
content_text TEXT,            -- wat de operator publiceerde
operator_edited BOOLEAN,
```

```sql
-- Voorbeeld: marketing_email_campaigns (toekomstig)
ai_original_body TEXT,
email_body TEXT,
operator_edited BOOLEAN,
```

### Analyse query (wekelijks, in marketing-analyze-brand)

```sql
-- Haal de laatste 20 operator-aangepaste items op
SELECT ai_original_response, response_text, review_text, rating
FROM marketing_reviews
WHERE operator_edited = true AND response_text IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;
```

Dit wordt aan de AI gevoed met de prompt:
"Analyseer hoe deze restaurateur [type content] aanpast. Beschrijf het patroon in max 100 woorden."

---

## Relatie met Bestaande AI Architectuur

### Hoe dit past in de 3-lagen AI architectuur (AI_INFRASTRUCTURE.md)

| Laag | Bestaand gebruik | Leercyclus gebruik |
|---|---|---|
| **Laag 0 (SQL)** | Risicoscores, forecasts | Content performance analyse, posting patronen |
| **Laag 1 (Goedkoop LLM)** | Intent classificatie | Content type classificatie, coaching tips formulering |
| **Laag 2 (Premium LLM)** | WhatsApp conversaties | Stijlprofiel generatie, complexe content generatie |

De leercyclus gebruikt voornamelijk **Laag 0 (gratis SQL) + Laag 1 (goedkoop LLM)**. Alleen de stijlprofiel-analyse gebruikt Laag 2, en dat draait maar 1x per week.

### Hoe dit past in de Assistent architectuur (ASSISTANT_VISION.md)

| Assistent laag | Wat het doet | Leercyclus relatie |
|---|---|---|
| **Signals** | Feitelijke observaties | MarketingSignalProvider levert 6 signals (negatieve review, engagement drop, etc.) |
| **Insights** | Combinatie van signals | Toekomstig: "Engagement daalt + review score daalt → reputatie risico" |
| **Guidance** | AI-suggesties | De leercyclus VERBETERT guidance: "Op basis van je stijl, overweeg..." |
| **Learning** | Patronen + personalisatie | De leercyclus IS de learning laag voor content/communicatie |

De oorspronkelijke Learning fase in ASSISTANT_VISION ging over signaal-personalisatie (welke signals tonen, thresholds aanpassen). De leercyclus voegt daar **communicatie-personalisatie** aan toe. Beide zijn onderdeel van dezelfde Learning laag.

---

## Implementatie Volgorde

### Nu actief (Marketing Sprint 2-3)
1. ✅ `caption_style_profile` — geleerd van social posts
2. ✅ `visual_style_profile` — geleerd van foto's
3. ✅ Content type performance analyse (SQL, gratis)
4. ✅ Optimal post times analyse (SQL, gratis)
5. ✅ MarketingSignalProvider (6 signals)
6. 🔜 `review_response_profile` — geleerd van review aanpassingen

### Bij Fase 4.14 (Messaging / WhatsApp)
7. `guest_communication_profile` — geleerd van WhatsApp aanpassingen
8. WhatsAppSignalProvider (3 signals)
9. Cross-module intelligence: review sentiment → WhatsApp tone aanpassen

### Bij Fase 7.4.3+ (Assistent Insights)
10. Insight combinaties (marketing signals + reservering signals)
11. Guidance met gepersonaliseerde stijl
12. Dismissed/acted feedback loop

### Bij 3+ maanden data
13. Seizoenspatronen herkenning
14. Dag-van-de-week optimalisatie
15. Peer comparison (opt-in, geanonimiseerd)

---

## Kosten

| Component | Frequentie | Kosten/restaurant/maand |
|---|---|---|
| SQL analyse (Laag 0) | Wekelijks | €0 |
| Stijlprofiel analyse (Laag 1) | Wekelijks | €0.02 |
| Content generatie (Laag 1) | 10-30x/maand | €0.05-0.15 |
| Weekplan generatie (Laag 1) | Wekelijks | €0.02 |
| Review response generatie (Laag 1) | 5-20x/maand | €0.01-0.05 |
| Coaching tips (Laag 1) | Wekelijks | €0.01 |
| **Totaal marketing AI** | | **€0.11-0.25** |

Dit is ruim onder de geschatte €2/restaurant/maand uit AI_INFRASTRUCTURE.md, zelfs met alle marketing features actief.

---

## Principes

1. **Leercyclus is universeel** — elk nieuw type AI-content krijgt automatisch een profiel + feedback loop
2. **Profielen zijn tekst, geen model weights** — goedkoop, transparant, uitlegbaar
3. **Operator blijft in control** — suggesties worden nooit automatisch gepubliceerd
4. **Graceful degradation** — zonder profiel werkt alles, alleen minder gepersonaliseerd
5. **Privacy-first** — profielen bevatten stijlbeschrijvingen, geen klantdata
6. **Eén model, meerdere registers** — geen apart model per kanaal, maar apart profiel per kanaal
