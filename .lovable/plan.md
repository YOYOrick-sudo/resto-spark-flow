

# Samenvatting Dropdown boven CTA-knop — Mockup A

## Wat wordt gebouwd

Een inklapbare samenvatting-balk die verschijnt op **stap 2** (gegevens invullen), direct boven de "Bevestigen" knop. De balk toont de selecties uit stap 1 in een compacte, klikbare dropdown.

## Visueel

```text
+----------------------------------+
|  [Stap 2: gegevens invullen]     |
|  ...                             |
+----------------------------------+
|                                  |
|  v  Za 22 feb · 2 gasten · 19:00|   <-- ingeklapt (1 rij)
|                                  |
|  [<]  [ Bevestigen ]             |
+----------------------------------+
```

Bij klik op de balk klapt hij open:

```text
|  ^  Je selectie                  |
|  --------------------------------|
|  Kalender  Za 22 feb       [pen] |
|  Gasten    2 gasten        [pen] |
|  Tijd      19:00           [pen] |
|  Ervaring  Diner           [pen] |
+----------------------------------+
```

De [pen] iconen en rijen zijn klikbaar en navigeren terug naar stap 1 (`goTo(1)`).

## Gedrag

- **Stap 1**: dropdown is NIET zichtbaar (selecties worden direct op de pagina gemaakt)
- **Stap 2**: dropdown verschijnt boven de CTA, standaard **ingeklapt** als compacte samenvatting
- **Stap 3 (bevestiging)**: dropdown is NIET zichtbaar (bevestigingskaart toont alles al)
- Klik op de balk togglet open/dicht
- Klik op een individuele rij: navigeert terug naar stap 1

## Technisch

### Bestand: `src/components/widget-mockups/MockWidgetA.tsx`

1. Voeg `ChevronDown`, `ChevronUp`, `Pencil` toe aan lucide-react imports
2. Nieuwe state: `const [summaryOpen, setSummaryOpen] = useState(false)`
3. Bouw een `SummaryDropdown` component (inline) met:
   - Ingeklapte staat: enkele rij met kalender + gasten + tijd, chevron-down
   - Uitgeklapte staat: 4 rijen (datum, gasten, tijd, ervaring) met pen-iconen, chevron-up
4. Plaats de dropdown in de `shrink-0` CTA-sectie, direct **boven** de buttons, alleen wanneer `step === 2`
5. Styling: `bg-white rounded-2xl border border-gray-100 shadow-sm`, consistent met de rest van de widget
6. Datum formattering: gebruik de bestaande `dates`, `dayNames`, `monthNames` arrays om "Za 22 feb" weer te geven
