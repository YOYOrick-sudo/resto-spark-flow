
# Restaurantnaam naar footer met dynamische tekstgrootte

## Wat verandert

De restaurantnaam wordt verwijderd uit beide headers (embed + standalone) en verplaatst naar een vaste footer onderin de widget. De tekstgrootte past zich automatisch aan op basis van de naamlengte.

## Dynamische grootte-logica

```text
< 15 tekens   -->  text-xl    bijv. "Nesto"
15-24 tekens   -->  text-lg    bijv. "De Proeverij"
25-34 tekens   -->  text-base  bijv. "Restaurant de Proeverij"
35+ tekens     -->  text-sm    bijv. "Restaurant de Proeverij Amsterdam"
```

## Technische wijzigingen in `src/pages/BookingWidget.tsx`

1. **Helper-functie toevoegen** bovenaan `BookingWidgetInner`:
   - `getNameSize(name: string)` retourneert de juiste Tailwind text-class op basis van `name.length`

2. **Naam verwijderen uit embed header** (regels 126-128):
   - De `config.location_name` span wordt verwijderd, alleen logo blijft

3. **Naam verwijderen uit standalone header** (regels 142-144):
   - De `config.location_name` h1 wordt verwijderd, alleen logo blijft

4. **Nieuwe footer toevoegen** na de content div (regel 156), voor de bestaande "Powered by" footer:
   - Altijd zichtbaar (alle stappen, embed + standalone)
   - `shrink-0 px-5 pb-3 pt-2 text-center`
   - Tekst: `font-semibold text-gray-400 tracking-wide` met dynamische grootte
   - "Powered by Nesto" branding verplaatst direct eronder (als actief)
