
# Fix AI Kleursuggesties + Clean Color Picker

## Probleem

1. **"Nieuwe suggesties" werkt niet** -- de edge function krijgt een 500 error terug van de AI gateway. Het model `google/gemini-3-flash-preview` geeft een interne fout.
2. **De kleurenkiezer is te druk** -- 32 swatch-bolletjes zonder native color picker (kleurenwiel).

## Oplossing: twee wijzigingen

### 1. Edge function: model wisselen

**Bestand:** `supabase/functions/suggest-widget-colors/index.ts`

- Model wijzigen van `google/gemini-3-flash-preview` naar `google/gemini-2.5-flash` (stabiel, snel, en bewezen werkend)
- Geen andere wijzigingen nodig -- de rest van de functie is correct

### 2. ColorPaletteSelector: swatch-grid vervangen door native picker

**Bestand:** `src/components/settings/widget/ColorPaletteSelector.tsx`

Wat verdwijnt:
- De `SWATCH_COLORS` array (16 kleuren)
- De volledige swatch-grid met 16 bolletjes per kleur (32 totaal)

Wat komt ervoor in de plaats per kleur:
- Een **native `<input type="color">`** gestyled als rond bolletje (h-9 w-9, rounded-full) dat het OS kleurenwiel opent
- Het **hex invoerveld** direct ernaast
- Beide zijn bidirectioneel gesynchroniseerd

Nieuwe layout per kleur:

```text
Hoofdkleur
Knoppen & CTA's

[O kleurenwiel]  [#1d979e____]
```

Wat blijft ongewijzigd:
- Palette chips bovenaan (AI-suggesties of curated fallback)
- "Nieuwe suggesties" knop
- Custom chip als geen palette actief is

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `supabase/functions/suggest-widget-colors/index.ts` | Model naar `google/gemini-2.5-flash` |
| `src/components/settings/widget/ColorPaletteSelector.tsx` | Swatch-grid weg, native color picker + hex input |
