
# Fix: Panel overlay wordt bedekt door grid elementen

## Probleem

Wanneer je in de **grid view** op "Reservering" of "Walk-in" klikt, opent het NestoPanel met een donkere achtergrond-overlay op `z-40`. Maar de grid view heeft elementen op `z-50` (de "NU" tijdslijn) die **boven** de overlay uitsteken. Hierdoor zijn reserveringsblokken en de tijdlijn zichtbaar door/over het panel heen — een rommelig visueel resultaat.

## Oorzaak

- NestoPanel backdrop overlay: `z-40`
- NestoPanel zelf: `z-40`
- Grid NowLine container: `z-50` (hoger, dus bovenop de overlay)

## Oplossing

Verhoog de z-index van het NestoPanel (zowel backdrop als panel) van `z-40` naar `z-50`. Dit zorgt ervoor dat het panel altijd boven alle grid-elementen verschijnt.

## Technisch

### `src/components/polar/NestoPanel.tsx`

1. **Backdrop overlay** (regel 111): Verander `z-40` naar `z-50`
2. **Panel container** (regel 115): Verander `z-40` naar `z-50`

Totaal: 1 bestand, 2 regels aangepast.
