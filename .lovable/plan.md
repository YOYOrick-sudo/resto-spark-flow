

# "Yield percentage" → "Bruikbaar percentage" op 3 resterende plekken

## Te wijzigen

| # | Bestand | Regel | Huidige tekst | Nieuwe tekst |
|---|---------|-------|---------------|--------------|
| 1 | `NieuwIngredientModal.tsx` | 198 | `Yield percentage` | `Bruikbaar percentage` |
| 1b | `NieuwIngredientModal.tsx` | 200-201 | `<Info>` zonder button wrapper | Wrap in `<button type="button" className="inline-flex">` |
| 2 | `IngredientStapBevestigen.tsx` | 67 | `label="Yield percentage"` | `label="Bruikbaar percentage"` |
| 3 | `KostprijsTab.tsx` | 119 | `({ingredient.yield_percentage}% yield)` | `({ingredient.yield_percentage}% bruikbaar)` |

Geen database wijzigingen. Variabelnamen (`yieldPct`, `yield_percentage`) blijven ongewijzigd — alleen zichtbare labels worden aangepast.

