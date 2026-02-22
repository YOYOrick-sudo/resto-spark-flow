

# Sticky bar redesign: enterprise-kwaliteit layout

## Probleem

De sticky bar heeft nu een simpele flex-layout waarbij de headline tekst met `flex:1` alle ruimte inneemt en naar links wordt geduwd, terwijl de knop en het kruisje helemaal rechts staan. Dit geeft een "lege" indruk met te veel witruimte ertussen.

## Nieuw ontwerp

De bar krijgt een gecentreerde layout met de content netjes gegroepeerd in het midden, en alleen de sluitknop rechts:

```text
+------------------------------------------------------------------+
|     Headline tekst   ·   [ Meer info ]                      [x]  |
+------------------------------------------------------------------+
```

Voor newsletter-variant:

```text
+------------------------------------------------------------------+
|   Headline tekst  ·  [je@email.nl]  [ Aanmelden ]           [x]  |
+------------------------------------------------------------------+
```

Kenmerken:
- Content (tekst + actie) gecentreerd via `justify-content: center`
- Tekst heeft GEEN `flex:1` meer, neemt alleen de ruimte in die nodig is
- Sluitknop absoluut gepositioneerd rechts, zodat de content echt gecentreerd blijft
- Iets meer padding (14px 24px) voor een ruimer gevoel
- Subtiele separator dot tussen tekst en actie
- Knop krijgt een lichte witte achtergrond (`rgba(255,255,255,0.15)`) in plaats van volledig transparant, voor betere zichtbaarheid

## Wijzigingen

### 1. `supabase/functions/marketing-popup-widget/index.ts`

CSS aanpassingen in de gegenereerde styles:
- `.nesto-bar`: `justify-content:center; padding:14px 48px 14px 24px;` (extra rechts voor de close-knop)
- `.nesto-bar-text`: verwijder `flex:1`, voeg `flex:none` toe
- `.nesto-bar-close`: `position:absolute; right:16px; top:50%; transform:translateY(-50%);`
- `.nesto-bar .nesto-btn`: lichte achtergrond `background:rgba(255,255,255,0.15)` standaard
- Mobiel (`@media max-width:600px`): `flex-direction:column; text-align:center; padding:14px 24px;`

HTML aanpassing in de bar-opbouw:
- `.nesto-bar` krijgt `position:relative` erbij (voor absolute close-knop)

### 2. `src/pages/PopupPreviewDemo.tsx`

Dezelfde CSS-aanpassingen in de `buildStyles` functie (regels 54-63) zodat de preview consistent is met de productie-widget.

### 3. Deployment

De `marketing-popup-widget` edge function wordt opnieuw gedeployed na de wijzigingen.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/marketing-popup-widget/index.ts` | Sticky bar CSS + HTML layout |
| `src/pages/PopupPreviewDemo.tsx` | Zelfde CSS-aanpassingen voor preview |

