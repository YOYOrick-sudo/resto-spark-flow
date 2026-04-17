
# Verwijder dubbele "Geen leverancier" badge

## Wijziging
In `src/pages/Ingredienten.tsx`, in de `naam` kolom render-functie:
- Verwijder de `showGeenLevBadge` berekening
- Verwijder de `NestoBadge "Geen leverancier"` naast de ingrediëntnaam
- Naam-cell wordt weer enkel `<p>{naam}</p>` + categorie eronder

De kolom "Leveranciers" toont nog steeds `— Geen leverancier` in grijs — dat blijft de enige indicator.

## File
| Actie | Bestand |
|---|---|
| EDIT | `src/pages/Ingredienten.tsx` (naam-kolom render simpeler maken, ~10 regels weg) |

## Na deploy
R4a definitief af → door naar R4b.
