

# Sparkles-icoon voor tafeltoewijzing in lijstweergave

## Wat verandert
De oranje dot + streepje in de Tafel-kolom wordt vervangen door een duidelijker patroon: een streepje (geen tafel) met daarnaast een Sparkles-icoon (auto-assign knop). Zo snapt de gebruiker meteen:
- Het streepje = er is geen tafel toegewezen
- Het icoon = klik hier om automatisch een tafel toe te wijzen

## Visueel resultaat

```text
TAFEL
Tafel 1          (normale reservering)
— [sparkles]     (geen tafel, klik sparkles om toe te wijzen)
```

- Het streepje is muted tekst (niet klikbaar)
- Het Sparkles-icoon is een kleine klikbare knop met hover-effect
- Tooltip op het icoon: "Automatisch tafel toewijzen"

## Technische wijziging

### `src/components/reserveringen/ReservationListView.tsx`

1. **Import toevoegen**: `Sparkles` uit `lucide-react` (regel 2)
2. **Tafel-kolom aanpassen** (regels 191-205): Vervang de huidige oranje dot + dash button door:
   - Een muted `—` tekst (niet klikbaar, puur informatief)
   - Een Sparkles-icoon als aparte klikbare button met `onClick` die `onAssignTable` triggert
   - Tooltip "Automatisch tafel toewijzen" op het icoon
   - Styling: `text-warning hover:text-warning/80` voor het icoon, `p-1 rounded-md hover:bg-warning/10`
3. **Dubbele comment opruimen**: De dubbele `{/* Tafel */}` op regels 187-188 wordt opgeschoond naar een enkele comment

