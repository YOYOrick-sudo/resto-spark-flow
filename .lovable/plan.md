

# Fix: "Niet toegewezen" sectie sticky maken (zoals Pacing)

## Het echte probleem
De "Niet toegewezen" sectie is NIET sticky, terwijl TimelineHeader en SeatedCountRow dat wel zijn. Sticky positionering creëert automatisch een correcte stacking context. Zonder sticky werkt de z-index niet betrouwbaar tegen de NowIndicator.

## Wat wordt gewijzigd

### 1. SeatedCountRow: vaste hoogte toevoegen
De pacing-rij heeft nu geen expliciete hoogte. We voegen `h-8` (32px) toe zodat we een betrouwbare top-offset kunnen berekenen voor de "Niet toegewezen" rij.

### 2. UnassignedGridRow: sticky maken
De buitenste wrapper-div (regel 304) krijgt sticky positionering:

- **Was:** `className="relative z-40 border-b border-warning/30 bg-warning/5"`
- **Wordt:** `className="sticky top-[72px] z-40 border-b border-warning/30 bg-warning/5"`

De offset `72px` = TimelineHeader (40px) + SeatedCountRow (32px).

## Stacking overzicht na fix

```text
top-0      : TimelineHeader    (sticky, z-40)
top-[40px] : SeatedCountRow    (sticky, z-40, h-8 = 32px)
top-[72px] : UnassignedGridRow (sticky, z-40) ← NIEUW
             ZoneHeaders + TableRows (scrollbaar)
```

Alle drie de sticky secties hebben z-40 en hun eigen stacking context, waardoor de NowIndicator (z-20) er nooit meer doorheen kan.
