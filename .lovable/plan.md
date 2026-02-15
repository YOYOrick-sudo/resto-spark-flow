

# Reserveringen terug naar originele layout

## Verschil huidige vs. gewenste situatie

| Element | Nu (nieuw) | Gewenst (jouw screenshot) |
|---------|-----------|---------------------------|
| Titel "Reserveringen" | Grote PageHeader met border-bottom | Geen titel -- toolbar IS de eerste rij |
| "+ Reservering" button | In PageHeader rechts | Rechts op de toolbar-rij, naast zoekbalk |
| Toolbar | Tweede rij onder PageHeader | Eerste rij: view toggles + datum + zoek + button |
| Filters | Derde rij | Tweede rij (direct onder toolbar) |

## Wijziging

**`src/pages/Reserveringen.tsx`**

1. Verwijder de `<PageHeader>` component en de import
2. Verplaats de "+ Reservering" button naar de toolbar-rij (rechts naast de SearchBar)
3. De toolbar wordt weer de eerste rij in de pagina
4. Filters blijven op de tweede rij

De structuur wordt:

```text
Row 1: [ViewToggle] [DateNavigator] ... [SearchBar] [+ Reservering button]
Row 2: [Status filter] [Shift filter] [Type filter] ... [21 reserveringen]
Row 3+: Content (list/grid/calendar)
Footer: Stats bar
```

Alleen `src/pages/Reserveringen.tsx` wordt aangepast. Geen andere bestanden.
