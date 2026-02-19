
# Tijdindicatie toevoegen aan "Niet toegewezen" header

## Wat verandert
De collapsed header van de "Niet toegewezen" sectie in de Grid View toont naast het aantal ook de starttijden van de reserveringen. Zo ziet de operator in een oogopslag wanneer de unassigned reserveringen zijn, zonder te hoeven scrollen.

## Visueel resultaat

```text
1 reservering:   Niet toegew. 1 · 19:30
3 reserveringen: Niet toegew. 3 · 18:00, 19:30, 20:00
5 reserveringen: Niet toegew. 5 · 18:00, 19:30, 20:00 +2
```

- Het count getal blijft visueel dominant (bestaande styling: `font-bold text-warning`)
- De tijden worden in `text-muted-foreground` weergegeven zodat ze ondergeschikt zijn
- Een `·` scheidt het count van de tijden

## Technische wijziging

### `src/components/reserveringen/ReservationGridView.tsx`

1. **Helper toevoegen** (boven de component): Een kleine functie die de unassigned reserveringen sorteert op starttijd, de eerste 3 tijden toont (geformatteerd als HH:MM), en bij meer dan 3 een "+N" suffix toevoegt.

2. **Header tekst uitbreiden** (regels 315-316): Na de bestaande count badge een extra `span` toevoegen met de gegenereerde tijdstring in `text-muted-foreground text-xs`.

Geen andere bestanden worden aangepast. De kaartjes op de tijdlijn blijven volledig ongewijzigd.
