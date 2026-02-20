

# Twee Interactieve Widget Mockups

## Doel

Een aparte demopagina (`/widget-mockups`) met twee naast-elkaar geplaatste, volledig interactieve widget-mockups. Beide zijn puur frontend (geen API calls) met hardcoded mock-data, zodat je direct kunt klikken, scrollen en vergelijken.

---

## Mockup A: "Current" -- de huidige stijl, opgepoetst

De huidige widget-stijl maar dan net wat meer afgewerkt en consistent. Dit is het referentiepunt.

- Warm gebroken wit achtergrond (`#FAFAF8`)
- Ticket cards met `rounded-[28px]`, layered shadows, gradient fallback
- Ronde gastenteller knoppen
- `rounded-[10px]` CTA-buttons
- Progress dots (pill-stijl)
- Restaurant naam in footer (Plus Jakarta Sans)
- Alle stappen interactief doorloopbaar met mock-data

## Mockup B: "Nesto Enterprise" -- nieuw concept

Een strakker, meer enterprise-achtig alternatief dat subtiel aansluit bij het Nesto Polar design system.

**Kernverschillen:**

| Aspect | Mockup A (Current) | Mockup B (Enterprise) |
|---|---|---|
| Lettertype | System / Plus Jakarta Sans | Inter |
| Achtergrond | `#FAFAF8` warm wit | `#FAFAFA` koel neutraal |
| Ticket cards | Grote afbeelding + tekst eronder | Horizontale kaart: kleine afbeelding links, tekst rechts |
| Card radius | 28px | 16px (`rounded-2xl`) |
| CTA-buttons | `rounded-[10px]` | `rounded-xl` (12px), iets smaller (h-11) |
| Progress | Dots/pills | Genummerde stappen met lijn ("stepper") |
| Shadows | Layered + hover lift | Subtielere `shadow-sm`, geen lift |
| Gastenteller | Ronde knoppen met +/- | Compact inline stepper, strakker |
| Kalender | Standaard met ronde selectie | Iets compacter, vierkantere dag-cellen |
| Formulier | Labels boven velden | Floating labels of compactere layout |
| Bevestiging | Grote geanimeerde cirkel checkmark | Subtielere checkmark, meer focus op samenvatting |

**Enterprise kenmerken:**
- Inter font (via Google Fonts import)
- Meer whitespace, minder visueel "luid"
- Dunne 1px borders in plaats van dikke shadows
- Gedemptere kleuren (minder saturatie)
- Compactere, professionelere uitstraling

---

## Pagina-opzet

De demopagina toont beide widgets naast elkaar in een split-view:

```text
+--------------------------------------------------+
|  Widget Mockups                    [A/B labels]   |
+------------------------+-------------------------+
|                        |                         |
|   [iPhone frame A]     |   [iPhone frame B]      |
|   "Current"            |   "Enterprise"          |
|                        |                         |
|   - Ticket select      |   - Ticket select       |
|   - Datum & gasten     |   - Datum & gasten      |
|   - Tijdslots          |   - Tijdslots           |
|   - Gegevens           |   - Gegevens            |
|   - Bevestiging        |   - Bevestiging         |
|                        |                         |
+------------------------+-------------------------+
```

- Beide widgets in een gesimuleerde telefoon-frame (375x812)
- Elke mockup is volledig klikbaar -- je kunt alle stappen doorlopen
- Mock-data: 2 tickets ("Diner" en "Chef's Table"), datum/tijd knoppen, formuliervelden
- Geen echte API calls -- alles lokaal state

---

## Technische aanpak

### Nieuwe bestanden

1. **`src/pages/WidgetMockups.tsx`** -- De hoofd demopagina met split-view en telefoon-frames
2. **`src/components/widget-mockups/MockWidgetA.tsx`** -- Mockup A (huidige stijl)
3. **`src/components/widget-mockups/MockWidgetB.tsx`** -- Mockup B (enterprise stijl)
4. **`src/components/widget-mockups/mockData.ts`** -- Gedeelde mock-data (tickets, tijdslots)
5. **`src/components/widget-mockups/PhoneFrame.tsx`** -- Herbruikbare telefoon-frame wrapper

### Route toevoegen

In `App.tsx`: publieke route `/widget-mockups` (naast `/widget-preview`)

### Geen dependencies nodig

Alles wordt gebouwd met bestaande Tailwind classes en React state. Inter font via een `<link>` tag in de component.

### Interactiviteit per mockup

Elke mockup heeft eigen lokale state:
- `step` (1-5)
- `selectedTicket`
- `selectedDate`
- `partySize`
- `selectedTime`
- `formData`

Navigatie via Volgende/Terug knoppen door alle 5 stappen.

