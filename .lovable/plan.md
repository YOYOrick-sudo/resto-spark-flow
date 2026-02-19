

# Restaurantnaam in Plus Jakarta Sans

## Wat verandert

Alleen de restaurantnaam onderin de widget krijgt het lettertype **Plus Jakarta Sans** (extrabold, 800). Dit font is al geladen via Google Fonts in `index.html`. De rest van de widget blijft Inter.

Plus Jakarta Sans heeft rondere, warmere vormen dan Inter en is ideaal voor display-tekst zoals een restaurantnaam.

## Technische wijziging

### `src/pages/BookingWidget.tsx`

De `<p>` tag van de restaurantnaam in de footer (rond regel 162) krijgt een inline `style` met `fontFamily`:

- Huidige styling: `font-semibold text-gray-400 tracking-wide`
- Toevoegen: `style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}` en `font-extrabold` (weight 800) in plaats van `font-semibold`
- `tracking-wide` eventueel aanpassen naar `tracking-normal` omdat Plus Jakarta Sans van zichzelf al ruimer oogt

Geen andere bestanden worden gewijzigd. Inter blijft het standaard font voor alle andere widget-elementen.
