

# Fix: Rode NU-lijn mag niet door de linkerkolom lopen

## Probleem

De rode NU-lijn is een enkel element (`z-50`) dat over de volledige hoogte van de grid loopt. Bij horizontaal scrollen schuift de lijn mee met de content, waardoor deze visueel in het gebied van de sticky linkerkolom terecht kan komen. De z-index hiërarchie werkt niet betrouwbaar vanwege "stacking context" conflicten: sommige rij-wrappers creëren hun eigen laag, waardoor de z-index van hun kinderen (de sticky kolommen) niet meer vergelijkbaar is met die van de NowIndicator.

## Oplossing

In plaats van te vertrouwen op z-index (wat al meerdere keren niet betrouwbaar bleek), passen we een **scroll-gebaseerde clip** toe. De NowIndicator krijgt toegang tot de scroll-container en past dynamisch `clipPath` toe zodat de lijn fysiek NOOIT kan verschijnen in de eerste 140px van het zichtbare scherm.

Daarnaast zetten we alle rij-wrappers terug naar een consistente z-index structuur.

## Hoe het werkt

1. De scroll-container ref wordt als prop doorgegeven aan de NowIndicator
2. De NowIndicator luistert naar horizontale scroll-events
3. Bij elke scroll wordt `clipPath: inset(0 0 0 Xpx)` berekend, zodat het gedeelte dat achter de sticky kolom zit wordt weggeknipt
4. De rode lijn kan nu fysiek onmogelijk in de linkerkolom verschijnen, ongeacht z-index of stacking contexts

## Technische wijzigingen

### `src/components/reserveringen/ReservationGridView.tsx`

1. **NowIndicator component**: Voeg `scrollContainerRef` prop toe. Voeg een scroll-event-listener toe die `clipPath: inset(0 0 0 ${scrollLeft}px)` dynamisch toepast op de buitenste container. Dit knipt de linker-rand weg precies tot waar de sticky kolom eindigt.

2. **NowIndicator aanroep** (regel 558): Geef `scrollContainerRef={containerRef}` mee als prop.

3. **Rij-wrapper z-index opruimen**: Zet alle sticky rij-wrappers (TimelineHeader, SeatedCountRow, UnassignedGridRow) terug naar een consistente opzet:
   - Outer wrappers: geen z-index of een lage waarde voor sticky scroll-gedrag
   - Sticky left-kolommen: `z-[60]` behouden (werkt correct binnen eigen rij voor andere overlaps)

Dit lost het probleem definitief op zonder afhankelijk te zijn van z-index lagen tussen parent en child componenten.

