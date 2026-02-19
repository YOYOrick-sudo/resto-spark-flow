

# Fix: Rode "NU"-lijn loopt door "Niet toegewezen" sectie

## Wat is het probleem?
De rode tijdslijn loopt nog steeds zichtbaar door de linkerkolom van de "Niet toegewezen" sectie. De oorzaak is identiek aan het eerdere probleem bij de header en pacing-rij: de buitenste container mist een z-index, waardoor de browser de hele sectie als "lager" beschouwt dan de rode lijn.

## Wat wordt gewijzigd?
Eén regel in één bestand.

### `src/components/reserveringen/ReservationGridView.tsx`

**Regel 304** -- wrapper-div van de "Niet toegewezen" sectie:

- **Was:** `className="border-b border-warning/30 bg-warning/5"`
- **Wordt:** `className="relative z-40 border-b border-warning/30 bg-warning/5"`

## Waarom is dit definitief?
Alle drie de horizontale secties die een sticky linkerkolom hebben, hebben nu dezelfde fix:

| Sectie | Status |
|---|---|
| TimelineHeader (uurlabels) | Al gefixt (z-40) |
| SeatedCountRow (pacing) | Al gefixt (z-40) |
| UnassignedBadgeList (niet toegewezen) | **Deze fix** (z-40) |

Er zijn geen andere secties met een sticky linkerkolom in de grid. Na deze wijziging loopt de rode lijn nergens meer door de sticky kolommen.

