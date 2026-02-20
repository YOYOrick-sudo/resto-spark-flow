

# Fix: logo-flash in widget skeleton

## Probleem

Het skeleton in `widget.js` toont het logo linksboven (40x40, horizontaal naast restaurantnaam). De echte widget toont het logo gecentreerd bovenaan (80px hoog). Bij de overgang van skeleton naar content springt het logo van links naar midden -- dat is de flash.

## Oplossing

De skeleton-header in `widget.js` aanpassen zodat de layout 1:1 matcht met de echte widget:
- Logo gecentreerd, 80px hoog (ipv 40x40 linksboven)
- Restaurantnaam niet tonen in het skeleton (de echte widget toont die niet in de header)
- Achtergrondkleur van skeleton aanpassen naar #FAFAFA (matcht de echte widget)

## Technisch

**Bestand:** `public/widget.js` (regels 144-165, skeleton builder)

Wijzigingen in de `createSkeleton()` functie:

1. **Wrapper achtergrond**: van `#fff` naar `#FAFAFA`
2. **Header layout**: van horizontaal (`align-items:center;gap:12px`) naar gecentreerd verticaal (`flex-direction:column;align-items:center;padding-top:8px`)
3. **Logo stijl**: van `width:40px;height:40px;border-radius:10px;object-fit:cover` naar `height:80px;object-fit:contain` (matcht `h-20 object-contain` in de echte widget)
4. **Restaurantnaam**: verbergen (niet tonen in skeleton, want de echte widget toont dit niet in de header)

Dit zorgt ervoor dat het skeleton visueel identiek is aan de geladen widget, waardoor de overgang onzichtbaar wordt.
