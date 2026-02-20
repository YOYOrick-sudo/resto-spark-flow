

# Widget Sfeer-upgrade: Van Formulier naar Uitnodiging

Sterke visie. Hier is het plan om de drie concrete ideeeen door te voeren in beide mockups.

---

## 1. Ambient achtergrond uit ticket foto

Wanneer een gast een ticket selecteert, verschijnt de ticket-foto als subtiele blurred achtergrond achter de hele widget. De sfeer verandert per keuze.

**Hoe het werkt:**
- Een absoluut gepositioneerde `<img>` achter alle content, met `blur(40px)`, `opacity: 0.08`, `scale(1.2)` (om blur-randen te verbergen)
- Smooth CSS transition (600ms) bij wisselen van ticket
- Alleen zichtbaar na ticket-selectie (step >= 1 met selectedTicket)
- Blijft zichtbaar in stap 2, 3, 4 -- de sfeer draagt door de hele flow
- Op de bevestigingspagina (step 5) fade naar 0 zodat de kaart schoon leesbaar is

## 2. Dag-level drukte-indicator in de kalenderstap

Elke dag in de datumkiezer krijgt een subtiele kleur-dot die aangeeft hoe druk die dag wordt verwacht.

**Mock data toevoegen:**
- `DAY_AVAILABILITY` map in mockData.ts: index 0-13 met waarden `'quiet'`, `'normal'`, `'busy'`, `'almost_full'`
- Weekenddagen (vr/za) standaard `'busy'` of `'almost_full'`, doordeweeks meer `'quiet'`/`'normal'`

**Visueel (beide mockups):**
- Onder het datum-getal verschijnt een kleine dot (w-1.5 h-1.5)
- Groen = rustig, geen dot = normaal, oranje = populair, rood = bijna vol
- Bij geselecteerde staat: dot wordt wit/semi-transparant
- Geen tekst in de buttons, legenda onderaan: "Rustig / Populair / Bijna vol"

## 3. Prominentere prijsindicatie

Tickets met een prijs tonen deze prominenter:
- "vanaf" prefix voor prix-fixe tickets (Mockup A: in de foto-overlay als groter, duidelijker badge)
- Mockup B: prijs rechts in de kaart, iets groter en bold
- Diner-ticket zonder prijs: geen wijziging

---

## Technisch overzicht

### Bestanden die wijzigen:

1. **`src/components/widget-mockups/mockData.ts`**
   - Toevoegen: `DAY_AVAILABILITY` array met 14 entries voor drukte per dag

2. **`src/components/widget-mockups/MockWidgetA.tsx`**
   - Ambient background layer toevoegen (absoluut gepositioneerd, blurred ticket-image)
   - Step 2: dag-dots toevoegen in de datum-buttons
   - Step 2: legenda onder de kalenderstap
   - Step 1: prijs-badge aanpassen met "vanaf" prefix

3. **`src/components/widget-mockups/MockWidgetB.tsx`**
   - Ambient background layer toevoegen (zelfde techniek)
   - Step 2: dag-dots toevoegen in de grid-cellen
   - Step 2: legenda onder de kalender
   - Step 1: prijs prominenter stylen

### Ambient background implementatie (pseudo-code):

```text
<div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
  <img
    src={selectedTicketImageUrl}
    class="w-full h-full object-cover scale-120 blur-[40px]
           opacity-8 transition-all duration-600"
  />
</div>
```

De rest van de content krijgt `relative z-10` zodat alles erboven blijft.

