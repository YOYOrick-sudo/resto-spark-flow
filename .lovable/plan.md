
# Fix: Wit blokje — NowLine doet mee met panel z-index

## Probleem

De "NU" tijdslijn in de grid view heeft `z-50`, dezelfde z-index als het NestoPanel. Hierdoor kan de rode "NU"-lijn (en het bijbehorende rood/transparante achtergrondvlak) door de overlay van het panel heen zichtbaar zijn als een klein blokje.

## Oorzaak

- NowLine container: `z-50` (in `ReservationGridView.tsx` regel 233)
- NestoPanel overlay + panel: `z-50` (in `NestoPanel.tsx`)
- Omdat de NowLine een `absolute` element is binnen een parent die een stacking context creëert (via `overflow-hidden`), en het NestoPanel `fixed` is, kan het gedrag per browser/viewport verschillen.

## Oplossing

Verlaag de z-index van de NowLine van `z-50` naar `z-30`. De NowLine hoeft alleen boven reserveringsblokken (die geen specifieke z-index hebben) en gridlijnen te staan, niet boven modals/panels. `z-30` is voldoende.

## Technisch

### `src/components/reserveringen/ReservationGridView.tsx`

1. **NowLine container** (regel 233): Verander `z-50` naar `z-30`

Totaal: 1 bestand, 1 regel aangepast.
