

# Sticky bar layout: symmetrisch space-between

## Probleem

De sticky bar is nu volledig gecentreerd (`justify-content: center`), waardoor tekst en knop op een kluitje in het midden zitten. De gebruiker wil een symmetrische layout: tekst links, actie rechts, maar beide met **gelijke afstand** tot de rand.

## Nieuw ontwerp

```text
+------------------------------------------------------------------+
|    Headline tekst              [ Reserveer nu ]             [x]   |
|    ^                                          ^              ^    |
|    48px padding                    48px padding         absoluut  |
+------------------------------------------------------------------+
```

Kenmerken:
- `justify-content: space-between` in plaats van `center`
- Gelijke padding links en rechts (48px), zodat het symmetrisch is
- Tekst links met `flex:1` zodat die de beschikbare ruimte inneemt
- Actie-elementen (knop/input) rechts gegroepeerd
- Sluitknop blijft absoluut gepositioneerd (buiten de flow), rechts 16px
- De rechter padding van 48px houdt ruimte vrij voor het kruisje

## Wijzigingen

### 1. `supabase/functions/marketing-popup-widget/index.ts` (regel 85-89)

CSS aanpassingen:
- `.nesto-bar`: `justify-content:space-between` + `padding:14px 48px` (symmetrisch)
- `.nesto-bar-text`: `flex:1` (neemt linkerkant in), verwijder `flex:none`

### 2. `src/pages/PopupPreviewDemo.tsx` (regel 54-58)

Identieke CSS aanpassingen in de `buildStyles` functie:
- `.nesto-bar`: `justify-content:space-between` + `padding:14px 48px`
- `.nesto-bar-text`: `flex:1`

### 3. Deployment

De `marketing-popup-widget` edge function wordt opnieuw gedeployed.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/marketing-popup-widget/index.ts` | Bar CSS: space-between + symmetrische padding |
| `src/pages/PopupPreviewDemo.tsx` | Zelfde CSS-aanpassingen voor preview |

