

# Fix Reserveringen: herstel compacte layout

## Probleem

De vorige edit verwijderde alleen de `import` van `PageHeader`, maar het component staat nog op regel 108-119. Dit veroorzaakt een build error EN de layout is niet hersteld naar de compacte versie.

## Wijziging in `src/pages/Reserveringen.tsx`

1. Verwijder het `<PageHeader>` blok (regels 108-119)
2. Verplaats de "+ Reservering" button naar de toolbar-rij, rechts naast de SearchBar
3. Verwijder de extra `pt-4` spacing van de toolbar (was nodig vanwege PageHeader border, nu niet meer)

De resulterende structuur:

```text
Row 1: [ViewToggle] [DateNavigator] ...spacer... [SearchBar] [+ Reservering]
Row 2: [Status] [Shift] [Type] ...spacer... [21 reserveringen]
Row 3+: Content (list/grid/calendar)
Footer: Stats bar
```

Alleen `src/pages/Reserveringen.tsx` wordt aangepast.

