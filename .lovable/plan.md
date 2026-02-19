

# Fix: Rode "NU"-lijn definitief achter alle sticky kolommen

## Wat was het echte probleem?

De NowIndicator wrapper-div heeft **geen z-index**, waardoor de kinderen (de rode lijn met z-30) niet in een eigen stacking context zitten. Ze "lekken" naar de bovenliggende context en concurreren direct met de sticky secties. Ondanks dat die secties z-40 hebben, kan de browser de lijn er toch doorheen tonen afhankelijk van DOM-volgorde en rendering.

## De definitieve fix

Geef de NowIndicator wrapper een eigen `z-20`. Dit creëert een stacking context waarin alle kinderen (z-10 glow, z-30 lijn) worden ingekapseld. Vanuit het bovenliggende niveau is de hele indicator nu z-20 -- altijd lager dan de z-40 sticky secties.

## Technische wijziging

### `src/components/reserveringen/ReservationGridView.tsx`

**Regel 226** -- NowIndicator wrapper:

- **Was:** `className="absolute top-0 bottom-0 right-0 overflow-hidden pointer-events-none"`
- **Wordt:** `className="absolute top-0 bottom-0 right-0 z-20 overflow-hidden pointer-events-none"`

## Waarom is dit definitief?

| Element | Z-index | Stacking context |
|---|---|---|
| NowIndicator wrapper | **z-20** (nieuw) | Eigen context, kapselt z-30 lijn in |
| TimelineHeader | z-40 | Boven indicator |
| SeatedCountRow | z-40 | Boven indicator |
| UnassignedBadgeList | z-40 | Boven indicator |
| TableRow sticky cellen | z-40 | Boven indicator |

De rode lijn kan nooit meer door sticky kolommen lopen omdat de hele indicator in een lagere stacking context zit.

