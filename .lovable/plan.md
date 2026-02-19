

# Fix: Rode "NU"-lijn loopt door sticky kolom (definitief)

## Oorzaak

Het probleem zit in **stacking contexts**. De `TimelineHeader` en `SeatedCountRow` (pacing-rij) hebben `sticky top-0 z-20` op hun buitenste div. Dit creëert een stacking context: de binnenste sticky corner-cellen met `z-40` werken alleen *binnen* die z-20 context. Vanuit het bovenliggende niveau ziet de browser die cellen als z-20 — lager dan de NowIndicator lijn op z-30.

Daarnaast mist de NowIndicator-wrapper een expliciete breedte en `overflow: hidden`, waardoor het element zich niet laat clippen aan de linkerrand.

## Oplossing (twee stappen)

### Stap 1: NowIndicator fysiek clippen
De NowIndicator-wrapper krijgt `overflow: hidden` en een expliciete breedte (via `right: 0`), zodat de rode lijn fysiek niet buiten de timeline-area kan renderen — ongeacht z-index.

### Stap 2: Z-index hierarchie corrigeren
De buitenste sticky containers van `TimelineHeader` en `SeatedCountRow` worden verhoogd van `z-20` naar `z-40`, zodat hun stacking context boven de NowIndicator (z-30) zit.

## Technische wijzigingen

### `src/components/reserveringen/ReservationGridView.tsx`

1. **NowIndicator wrapper** (regel 226): Voeg `overflow-hidden` en `right-0` toe aan de wrapper-div, zodat het element wordt geclipt aan zijn grenzen:
   - Van: `className="absolute top-0 bottom-0 pointer-events-none"`
   - Naar: `className="absolute top-0 bottom-0 right-0 overflow-hidden pointer-events-none"`

2. **TimelineHeader** (regel 91): Verhoog z-index van z-20 naar z-40:
   - Van: `className="sticky top-0 z-20 flex ..."`
   - Naar: `className="sticky top-0 z-40 flex ..."`

3. **SeatedCountRow** (regel 161): Verhoog z-index van z-20 naar z-40:
   - Van: `className="... sticky top-[40px] z-20"`
   - Naar: `className="... sticky top-[40px] z-40"`

Geen andere bestanden worden aangepast. De rode lijn wordt nu fysiek geclipt en de sticky headers hebben een hogere stacking context dan de lijn.
