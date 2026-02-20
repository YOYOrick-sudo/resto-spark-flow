

# Fade Gradient Verplaatsen in Mockup A

## Probleem

De witte fade-gradient zit nu als `sticky bottom-0` element BINNEN de step 1 content div (regel 106). Hierdoor zweeft hij mee tijdens het scrollen en verschijnt op een onnatuurlijke positie -- halverwege de content in plaats van netjes tegen de onderkant van het scroll-gebied.

## Oplossing

De fade-gradient verplaatsen van binnen de scroll-container naar BUITEN de scroll-container, als een absoluut gepositioneerd element dat altijd net boven de CTA-knop zweeft. Dit zorgt ervoor dat de gradient altijd op dezelfde plek zit, ongeacht scrollpositie.

## Technisch

### Bestand: `src/components/widget-mockups/MockWidgetA.tsx`

1. **Verwijder** de sticky gradient div uit de step 1 content (regel 106)
2. **Voeg toe** een absoluut gepositioneerde gradient div direct na het sluiten van de scroll-container (`</div>` op regel 276), maar voor de CTA-sectie (regel 278). Deze wordt gepositioneerd met `pointer-events-none absolute bottom-0 left-0 right-0 h-12` zodat hij altijd aan de onderkant van de scrollbare content area zit
3. De outer container (regel 43) moet `relative` krijgen zodat de gradient correct gepositioneerd wordt -- maar aangezien de layout flex-col is, is het beter om de scroll-container zelf `relative` te maken en de gradient daar absoluut in te plaatsen
4. Toon de gradient alleen wanneer `step < 5` (niet op de bevestigingspagina)

### Concrete aanpak

- Wrap de scroll-container in een `relative` div
- Plaats de gradient als `absolute bottom-0` binnen die wrapper, buiten de overflow-y-auto div
- Hierdoor blijft de gradient altijd gefixeerd aan de onderkant van het scrollgebied, net boven de CTA

