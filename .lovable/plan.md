

# Filter dropdowns smaller maken

## Wijziging

**Bestand:** `src/components/reserveringen/ReservationFilters.tsx`

De drie dropdowns zijn nu 160px, 160px en 200px breed. Door de placeholder-tekst korter te houden past een smallere breedte prima:

| Dropdown | Huidig | Nieuw |
|----------|--------|-------|
| Status   | 160px  | 140px |
| Shift    | 160px  | 130px |
| Type     | 200px  | 130px |

Drie regels aanpassen (regels 70, 77, 84): de `className="w-[...]"` waarden verkleinen.

