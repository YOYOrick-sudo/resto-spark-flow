# Nesto Assistant — Enterprise Product Vision

> Laatst bijgewerkt: 10 januari 2026

## Kernprincipe

De Nesto Assistant is een **signaal-gedreven beslissingsondersteuner**, geen chatbot. Hij spreekt alleen wanneer er:
1. **Impact** is (iets dat geld, tijd of gasten raakt)
2. **Handelingsruimte** is (de operator kan nog iets doen)
3. **Timing** klopt (niet te vroeg, niet te laat)

---

## 1. Architectuur in Lagen

### Laag 1: Signals (Rule-based)
**Wat het is:** Feitelijke observaties gebaseerd op data en regels.

| Eigenschap | Beschrijving |
|------------|--------------|
| Bron | Live data uit Nesto modules |
| Logica | Deterministische regels, geen AI |
| Voorbeeld | "3 annuleringen vandaag" |
| Actie | Tonen als feit, geen interpretatie |

**Wat het NIET doet:**
- Geen oorzaak-gevolg uitleggen
- Geen advies geven
- Geen prioriteit bepalen

---

### Laag 2: Insights (Gecombineerde signalen)
**Wat het is:** Betekenis en impact door signalen te combineren met context.

| Eigenschap | Beschrijving |
|------------|--------------|
| Bron | Meerdere signals + tijd/context |
| Logica | Weighted rules + thresholds |
| Voorbeeld | "Pacing overschrijdt capaciteit tijdens diner" |
| Actie | Tonen met urgentie-indicator |

**Combinatie-logica:**
```
Signal: pacing_current > seat_capacity
Signal: shift = "diner"
Signal: time_until_shift < 2h
→ Insight: "Overboeking risico voor diner"
```

**Wat het NIET doet:**
- Geen oplossing voorschrijven
- Geen waardeoordeel over operator

---

### Laag 3: Guidance (AI, optioneel)
**Wat het is:** Korte, contextafhankelijke suggestie (max 1 zin).

| Eigenschap | Beschrijving |
|------------|--------------|
| Bron | Insight + historische patronen |
| Logica | LLM met strikte constraints |
| Voorbeeld | "Overweeg extra tafel in terras-zone" |
| Actie | Optioneel tonen, nooit pushen |

**Strikte regels:**
- Alleen bij high-impact insights
- Max 1 suggestie per insight
- Nooit imperatief ("Doe X"), altijd optioneel ("Overweeg X")
- Operator kan guidance permanent uitschakelen

**Wat het NIET doet:**
- Geen uitleg waarom
- Geen alternatieven opsommen
- Geen follow-up vragen

---

## 2. Assistant Modules

### Module: Reserveringen

| Type | Signaal | Wanneer |
|------|---------|---------|
| Signal | "X annuleringen vandaag" | count > 2 |
| Signal | "No-show ratio deze week: X%" | ratio > 10% |
| Signal | "Wachtlijst: X gasten" | count > 0 |
| Insight | "Pacing overschrijdt capaciteit" | pacing > seats × 1.0 |
| Insight | "Lege shift morgen" | bookings < 30% capacity |
| Guidance | "Overweeg pacing-limiet te verlagen" | repeated overboeking |

**Guidance toegestaan:** Alleen bij herhaalde patronen (3+ dagen)

---

### Module: Operatie / Keuken

| Type | Signaal | Wanneer |
|------|---------|---------|
| Signal | "X MEP-taken open" | count > 0, shift start < 2h |
| Signal | "Voorraad [ingredient] laag" | stock < min_threshold |
| Signal | "Halffabricaat [X] verlopen" | expiry < now |
| Insight | "Keuken niet ready voor piek" | open_tasks > 3 AND peak < 1h |
| Insight | "Mise-en-place achterstand" | completion < 70% AND shift < 30min |
| Guidance | — | Geen. Keuken kent eigen proces. |

**Guidance toegestaan:** Nooit. Keuken-operatie is te context-specifiek.

---

### Module: Revenue

| Type | Signaal | Wanneer |
|------|---------|---------|
| Signal | "Omzet vandaag: €X" | Always available |
| Signal | "Gemiddelde besteding: €X/gast" | Always available |
| Signal | "Tafeltijd gemiddeld: Xmin" | deviation > 15% |
| Insight | "Revenue under target" | actual < target × 0.8 |
| Insight | "Hoge no-show impact: €X gemist" | no_show_revenue > €200 |
| Guidance | "Overweeg aanbetaling voor grote groepen" | repeated high no-show |

**Guidance toegestaan:** Alleen bij financiële patronen over 7+ dagen

---

### Module: Configuratie

| Type | Signaal | Wanneer |
|------|---------|---------|
| Signal | "X tafels niet in een area" | unassigned > 0 |
| Signal | "Shift zonder pacing-limiet" | limit = null |
| Signal | "Tafelgroep zonder tafels" | member_count = 0 |
| Insight | "Incomplete setup: reserveringen niet beschikbaar" | blocking issues > 0 |
| Insight | "Capaciteit-configuratie inconsistent" | sum(tables) ≠ location.max |
| Guidance | — | Geen. Setup is eenmalig en bewust. |

**Guidance toegestaan:** Nooit. Configuratie-keuzes zijn bewust.

---

## 3. Concrete Voorbeelden

### Voorbeeld 1: Annuleringen
```
Signal:   "3 annuleringen vandaag"
Insight:  "Annuleringspatroon: 40% via online, 60% telefoon"
Guidance: —
```
*Geen guidance: te weinig context voor advies*

---

### Voorbeeld 2: Overboeking risico
```
Signal:   "Pacing diner: 85 gasten"
Signal:   "Zitcapaciteit: 72 stoelen"
Insight:  "Pacing ligt 18% boven zitcapaciteit voor diner"
Guidance: "Overweeg squeeze-instelling te activeren"
```
*Guidance alleen als squeeze uit staat*

---

### Voorbeeld 3: Keuken achterstand
```
Signal:   "5 MEP-taken open"
Signal:   "Diner start over 45 minuten"
Insight:  "Keuken niet ready voor piek"
Guidance: —
```
*Geen guidance: keuken kent eigen prioriteiten*

---

### Voorbeeld 4: Lege avond
```
Signal:   "Morgen diner: 12 reserveringen"
Signal:   "Normale bezetting: 45 reserveringen"
Insight:  "Bezetting morgen 73% onder gemiddelde"
Guidance: —
```
*Geen guidance: te veel mogelijke oorzaken*

---

### Voorbeeld 5: No-show impact
```
Signal:   "2 no-shows vandaag"
Signal:   "Gemiddelde besteding: €65/gast"
Insight:  "Geschatte gemiste omzet: €260"
Guidance: "Overweeg bevestigingsmail 24h vooraf"
```
*Guidance alleen als bevestiging uit staat*

---

### Voorbeeld 6: Configuratie-gat
```
Signal:   "Tafel 7, 8, 9 niet in een area"
Insight:  "3 tafels niet boekbaar voor reserveringen"
Guidance: —
```
*Geen guidance: operator weet dit bewust of niet*

---

### Voorbeeld 7: Revenue trending
```
Signal:   "Omzet week: €12.400"
Signal:   "Vorige week: €14.200"
Insight:  "Omzet 13% lager dan vorige week"
Guidance: —
```
*Geen guidance: te veel mogelijke oorzaken*

---

### Voorbeeld 8: Positief signaal
```
Signal:   "Alle MEP-taken afgerond"
Signal:   "Diner start over 30 minuten"
Insight:  "Keuken ready voor service"
Guidance: —
```
*Geen guidance: positief signaal, geen actie nodig*

---

## 4. UI & Presentatie

### Waar de Assistant zichtbaar is

| Locatie | Type | Voorbeeld |
|---------|------|-----------|
| **Dashboard widget** | Insights overzicht | Top 3 actieve insights |
| **Module header** | Inline signal | "3 annuleringen" in Reserveringen |
| **Settings aside** | Config signals | "2 tafels niet toegewezen" |
| **Notification (zeldzaam)** | Tijdkritiek | "Overboeking in 30 min" |

### Visuele hiërarchie

| Urgentie | Kleur | Icoon | Gedrag |
|----------|-------|-------|--------|
| Info | Muted | — | Passief, geen aandacht trekken |
| Let op | Orange | ⚠ | Zichtbaar, niet storend |
| Actie vereist | Red | ✗ | Prominent, maar niet blokkerend |
| OK | Green | ✓ | Alleen in overzichten, niet pushen |

### Wanneer de Assistant STIL blijft

| Situatie | Reden |
|----------|-------|
| Alles op orde | Geen nieuws is goed nieuws |
| Buiten openingsuren | Niet relevant |
| Geen handelingsruimte | Te laat om iets te doen |
| Recent getoond | Cooldown van 4 uur per insight-type |
| Operator heeft guidance uit | Respecteer voorkeur |

---

## 5. Wat de Assistant NIET doet

### Expliciet buiten scope

| Niet | Waarom |
|------|--------|
| Chatinterface | Horeca heeft geen tijd voor conversatie |
| Proactieve tips | "Wist je dat..." is noise |
| Uitleg hoe horeca werkt | Operator weet dit beter |
| Automatische acties | Operator blijft in control |
| Vergelijking met concurrentie | Geen externe data |
| Voorspellingen zonder basis | Geen "AI denkt dat..." |

### Bewust niet geautomatiseerd

| Functie | Reden |
|---------|-------|
| Reserveringen afwijzen | Gastenrelatie is menselijk |
| Personeel inroosteren | Te veel onzichtbare factoren |
| Menu aanpassen | Creatieve keuze van kok |
| Prijzen wijzigen | Strategische beslissing |

### Later pas (v2+)

| Functie | Voorwaarde |
|---------|------------|
| Historische patronen | Minimaal 3 maanden data |
| Vergelijking met peers | Opt-in, geanonimiseerd |
| Predictive insights | Gevalideerde modellen |
| Stem/audio alerts | Hardware integratie |

---

## 6. Implementatie Fasen

### Fase 1: Signals Only
- Rule-based signals per module
- Inline weergave in module headers
- Dashboard widget met actieve signals

### Fase 2: Insights
- Combinatie-logica voor insights
- Urgentie-classificatie
- Aparte insights-pagina

### Fase 3: Guidance (AI)
- LLM integratie via Lovable AI
- Strikte prompt constraints
- Opt-out per gebruiker

### Fase 4: Learning
- Historische patronen
- Personalisatie op locatie
- Feedback loop (dismissed/acted)

---

## Samenvatting

| Principe | Implementatie |
|----------|---------------|
| Spreek alleen bij impact | Thresholds per signal |
| Nooit coachen | Geen "je zou moeten" |
| Context is king | Tijd, rol, shift, locatie |
| Rust boven slim | Cooldowns, dismissals |
| Operator in control | Altijd opt-out mogelijk |
