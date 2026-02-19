

# Fix: Rode NU-lijn mag NIET door de linkerkolom lopen

## Wat ik begrijp

De rode lijn loopt nu correct ononderbroken door het tijdlijn-gedeelte (rechts) -- dat is goed. Maar de lijn loopt nu OOK door de linkerkolom (140px breed, met tafelnamen, "Pacing", "Niet toegew.", area-headers). Dat mag niet. De linkerkolom moet de lijn volledig blokkeren.

## Oorzaak

De NowIndicator is verhoogd naar `z-50`. Alle sticky linkerkolommen staan op `z-40`. Omdat `z-50 > z-40` schildert de rode lijn BOVEN de sticky linkerkolom wanneer deze overlapt (bij horizontaal scrollen schuift de NowIndicator onder de sticky kolom, maar de hogere z-index laat hem er bovenop verschijnen).

## Oplossing

Verhoog de z-index van alle sticky linkerkolommen van `z-40` naar `z-[60]`. Dan is de volgorde:

| Element | z-index | Resultaat |
|---------|---------|-----------|
| Sticky linkerkolommen | z-[60] | Blokkeert de rode lijn |
| NowIndicator | z-50 | Boven tijdlijn-content, onder linkerkolom |
| Overige rij-achtergronden | z-10/z-20 | Onder alles |

## Technische wijzigingen

### `src/components/reserveringen/ReservationGridView.tsx`

Alle `z-40` op sticky left-kolommen en sticky top-rijen worden `z-[60]`:

1. **TimelineHeader** (regel 91-92): twee `z-40` naar `z-[60]`
2. **SeatedCountRow** (regel 161-162): twee `z-40` naar `z-[60]`
3. **ZoneHeader** (regel 195): `z-40` naar `z-[60]`
4. **UnassignedGridRow wrapper** (regel 304): `z-40` naar `z-[60]`
5. **UnassignedGridRow sticky left** (regel 309): `z-40` naar `z-[60]`

### `src/components/reserveringen/TableRow.tsx`

6. **TableRow sticky left** (regel 93): `z-40` naar `z-[60]`

Totaal: 7 keer `z-40` vervangen door `z-[60]` in 2 bestanden.
