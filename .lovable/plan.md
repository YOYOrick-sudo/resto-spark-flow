
# Ticket Cards meer diepte geven in Mockup A

## Inspiratie van Guestplan

Guestplan gebruikt een subtiele maar effectieve techniek: een lichte schaduw rondom de kaart gecombineerd met een warme, dunne border die de kaart visueel "optilt" van de achtergrond. Geen zware drop-shadows, maar een zachte, gelaagde lift.

## Aanpak

De huidige default shadow (`0 1px 4px rgba(0,0,0,0.06)`) is te vlak. De kaarten krijgen een gelaagde shadow die meer diepte geeft zonder zwaar te worden:

- **Default staat**: `0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)` -- een subtiele ring (1px) als "border" plus een zachtere schaduw voor lift
- **Hover staat**: toevoegen via CSS class `hover:shadow-lg` effect, of inline een iets sterkere shadow
- **Geselecteerde staat**: de bestaande `0 0 0 2px` ring + een sterkere shadow `0 8px 20px rgba(0,0,0,0.1)`

De 1px ring-shadow (in plaats van een echte border) geeft net dat beetje definitie dat Guestplan ook gebruikt, zonder de afgeronde hoeken te verpesten.

## Technisch

Alleen `src/components/widget-mockups/MockWidgetA.tsx` regel 77-81: de `boxShadow` waarden aanpassen voor zowel default als selected state.
