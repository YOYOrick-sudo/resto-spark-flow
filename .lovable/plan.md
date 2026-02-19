

# Outline Ring Inset Maken

## Wat verandert

De huidige `border: 1.5px solid` wordt vervangen door een **inset box-shadow**. Hierdoor zit de ring net aan de binnenkant van de pill, wat er subtieler en premium uitziet. De button-afmetingen veranderen niet.

### Visueel verschil

```text
  Nu (border):       De ring zit BUITEN de pill, maakt hem groter
  Straks (inset):    De ring zit BINNEN de pill, net zichtbaar langs de rand
```

## Technische wijziging

### `public/widget.js`

1. **Verwijder** `'border:1.5px solid ' + accentColor` uit de `btnBase` array (regel 247)
2. **Pas de glassInset variabelen aan** zodat ze de `accentColor` gebruiken in plaats van `rgba(255,255,255,0.15)`:
   - `glassInset` wordt: `inset 0 0 0 1.5px {accentColor met 30% opacity}`
   - `glassInsetHover` wordt: `inset 0 0 0 1.5px {accentColor met 45% opacity}`
3. Dit integreert naadloos met de bestaande `shadowRest` en `shadowHover` box-shadows die al glassmorphism inset shadows bevatten
4. De `hexToRgba` helper die al in het bestand staat wordt hergebruikt om de accentColor om te zetten naar rgba

Concreet:
- `glassInset` = `inset 0 0 0 1.5px` + `hexToRgba(accentColor, 0.3)`
- `glassInsetHover` = `inset 0 0 0 1.5px` + `hexToRgba(accentColor, 0.45)`
- `border:none` blijft staan (geen echte border meer)

Dit zorgt ervoor dat de ring subtiel zichtbaar is in rust, en iets sterker oplicht bij hover.

