
# Rollback + correcte fix: NU-lijn en NestoPanel overlay

## Wat ging er mis

De NU-lijn container ging van `z-50` naar `z-20`, maar de sticky headers in de Grid View (TimelineHeader, Pacing, AreaHeaders) gebruiken `z-[45]`. Door `z-20` zit de NU-lijn nu **onder** die sticky headers en wordt afgedekt. Daarom loopt de rode lijn niet meer door.

De overlay fix in NestoPanel is correct doorgevoerd (`bg-black/40 backdrop-blur-[2px]`), maar het overlay zit op `z-40` terwijl de NU-lijn op `z-50` zat — dat was het oorspronkelijke probleem. De oplossing is niet de NU-lijn verlagen, maar het **NestoPanel verhogen**.

## Correcte aanpak

### Wijziging 1: NU-lijn terug naar z-50

**Bestand:** `src/components/reserveringen/ReservationGridView.tsx` (regel 233)

| Nu (kapot) | Wordt (hersteld) |
|------------|-----------------|
| `z-20` | `z-50` |

De NU-lijn moet boven de sticky headers (`z-[45]`) blijven, dus `z-50` is correct.

### Wijziging 2: NestoPanel overlay en panel naar z-[60]

**Bestand:** `src/components/polar/NestoPanel.tsx` (regel 111 en 114-119)

| Element | Nu | Wordt |
|---------|-----|-------|
| Overlay (backdrop) | `z-40` | `z-[60]` |
| Panel (content) | `z-40` | `z-[60]` |

Door de NestoPanel naar `z-[60]` te tillen komt alles boven de NU-lijn (`z-50`) en de sticky headers (`z-[45]`). Het panel bedekt dan alles correct.

## Scope

- 2 bestanden, exact dezelfde als vorige keer
- NU-lijn: 1 regel rollback (`z-20` terug naar `z-50`)
- NestoPanel: 2x `z-40` wordt `z-[60]` (overlay + panel container)
- Overlay styling (`bg-black/40 backdrop-blur-[2px]`) blijft behouden
- Geen andere bestanden worden aangeraakt
