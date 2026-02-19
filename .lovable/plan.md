

# Fix: Rode NU-lijn ononderbroken door het hele tijdlijn-gedeelte

## Wat ik begrijp

De rode NU-lijn moet van boven tot onder ONONDERBROKEN doorlopen in het rechter tijdlijn-gedeelte -- door alles heen: pacing, "Niet toegewezen", area-headers, tafelrijen. Nergens gaten. De lijn mag alleen niet in de linkerkolom (140px) verschijnen. Dat laatste klopt al: de NowIndicator begint op `left: 140px`.

## Oorzaak

De NowIndicator staat op `z-20`. Maar:
- SeatedCountRow (Pacing): `z-40` + `bg-secondary` -- blokkeert de lijn
- UnassignedGridRow: `z-40` op de wrapper -- blokkeert de lijn
- ZoneHeader: `bg-secondary` (opaque) -- schildert over de lijn

Al deze elementen liggen boven de lijn in de z-volgorde.

## Oplossing

Eenregelige fix: verhoog de z-index van de NowIndicator van `z-20` naar `z-50`.

De NowIndicator begint al op `left: 140px`, dus hij overlapt nooit met de sticky linkerkolommen. Door de z-index te verhogen wordt de lijn boven alle timeline-elementen getekend, terwijl de linkerkolom er niet door geraakt wordt.

## Technische wijziging

### `src/components/reserveringen/ReservationGridView.tsx` -- NowIndicator (regel 226)

Wijzig de container z-index:
- Was: `z-20`
- Wordt: `z-50`

Dat is alles. De rode lijn loopt dan ononderbroken door pacing, "Niet toegewezen", area-headers en tafelrijen in het tijdlijn-gedeelte.

