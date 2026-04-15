

# MEP Favorieten vereenvoudigen

## Wat verandert

De chips-strip boven de zoekbalk verdwijnt. In plaats daarvan:

1. **Alles wat je toevoegt wordt automatisch onthouden** — na elke succesvolle taak-creatie via Quick Add wordt automatisch een favoriet aangemaakt (upsert). Geen handmatige ster-knop meer nodig.

2. **Favorieten verschijnen als zoekresultaten** — wanneer je begint te typen, worden favorieten als eerste sectie getoond in de dropdown (vóór halffabricaten/ingrediënten). Ze matchen op titel.

3. **Verwijderen via prullenbak-icoon** — favoriet-resultaten in de dropdown krijgen een `Trash2` icoon. Klik = verwijderd.

4. **Geen chips, geen sterren** — de `MepFavorieten` chip-component en alle `Star` iconen in de dropdown verdwijnen.

## Visueel voorbeeld

```text
🔍 Zout...
┌──────────────────────────────────────────────┐
│ RECENT                                       │
│  Zout aanvullen · Overig              🗑️    │
│  Zoutkorst bereiden · Prep            🗑️    │
├──────────────────────────────────────────────┤
│ HALFFABRICATEN                               │
│  Zoutdeeg                              +     │
├──────────────────────────────────────────────┤
│ + "Zout..." als vrije taak toevoegen         │
└──────────────────────────────────────────────┘
```

## Bestanden

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `src/components/mep/MepQuickAdd.tsx` | Verwijder `<MepFavorieten />` render + verwijder `onAddFavoriet` prop. Auto-save favoriet na elke createTask. |
| 2 | `src/components/mep/MepQuickAddDropdown.tsx` | Verwijder alle `Star`/`onAddFavoriet` logica. Voeg `favorieten` prop toe + "Recent" sectie met `Trash2` verwijder-icoon. |
| 3 | `src/components/mep/MepFavorieten.tsx` | Verwijderen (niet meer nodig) |
| 4 | `src/components/mep/MepCompletionModal.tsx` | Verwijder "Onthouden" knop + favoriet imports |
| 5 | `src/hooks/useMepFavorieten.ts` | Behouden (hooks worden nog steeds gebruikt voor fetch/add/remove) |

Geen database wijzigingen.

