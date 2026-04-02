

# Fix: Dieet-kolom leest verkeerde property-namen

## Probleem

`getDietaryAbbreviations()` in `ReservationListView.tsx` gebruikt verkeerde keys:

| Code verwacht | Database heeft |
|---|---|
| `prefs.is_vegetarian` | `prefs.vegetarian` |
| `prefs.is_vegan` | `prefs.vegan` |
| `prefs.allergens` | `prefs.allergies` |

Hierdoor worden allergieën van klanten zoals Yorick (gluten, vis, lactose) niet getoond.

## Oplossing

Drie regels aanpassen in `getDietaryAbbreviations()`:
- `prefs.is_vegetarian` → `prefs.vegetarian`
- `prefs.is_vegan` → `prefs.vegan`
- `prefs.allergens` → `prefs.allergies`

## Bestand

| Bestand | Wijziging |
|---|---|
| `src/components/reserveringen/ReservationListView.tsx` | Fix 3 property-namen in `getDietaryAbbreviations()` |

