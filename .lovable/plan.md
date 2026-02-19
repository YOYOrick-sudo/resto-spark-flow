

# Color-Tinted Shadow op Floating Button

## Wat verandert

De zwarte drop-shadow wordt vervangen door een **kleur-getinte shadow** die de button-kleur overneemt. Dit is het effect dat Intercom, Stripe en Linear gebruiken: de button lijkt te "gloeien" op de pagina.

## Visueel resultaat

```text
  Nu:     Zwarte schaduw → button "zweeft" maar voelt generiek
  Straks: Teal-getinte schaduw → button heeft een subtiele glow, voelt premium
```

## Technische wijziging

### `public/widget.js`

De twee shadow-variabelen worden aangepast om de `hexToRgba(color, ...)` helper te gebruiken in plaats van `rgba(0,0,0,...)`:

**`shadowRest`** (ruststand):
- Laag 1: `0 2px 8px {color @ 15% opacity}` -- subtiele kleur-tint dichtbij
- Laag 2: `0 8px 24px {color @ 12% opacity}` -- zachte glow verder weg

**`shadowHover`** (hover):
- Laag 1: `0 4px 12px {color @ 20% opacity}` -- sterkere kleur-tint
- Laag 2: `0 12px 36px {color @ 15% opacity}` -- grotere glow

De `hexToRgba` helper die al in het bestand staat wordt hergebruikt. Geen nieuwe code nodig, alleen de shadow-waarden veranderen.

De hover lift (`translateY(-2px)`) en achtergrond-lighten (`hoverColor`) blijven intact -- de color-tinted shadow versterkt dat effect.

