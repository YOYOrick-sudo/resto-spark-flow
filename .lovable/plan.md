

# Fix: Rode NU-lijn doorlopend door ALLES (pacing + niet-toegewezen)

## Probleem

Twee outer wrappers blokkeren de rode lijn nog steeds:
1. **SeatedCountRow** (Pacing, regel 161): outer wrapper staat op `z-[60]` met opaque `bg-secondary` -- blokkeert de NowIndicator (`z-50`)
2. **UnassignedGridRow** (Niet toegew., regel 304): outer wrapper ook `z-[60]` -- zelfde probleem

De inner sticky left-kolommen staan al correct op `z-[60]` en blokkeren de lijn in de linkerkolom. Maar de outer wrappers dekken de lijn af in het HELE tijdlijn-gedeelte.

## Oplossing

Zelfde patroon als de TimelineHeader-fix: verlaag de outer wrapper z-index van `z-[60]` naar `z-[45]`. De inner sticky left-children blijven op `z-[60]`.

## Overzicht z-index lagen (na fix)

| Element | z-index | Effect |
|---------|---------|--------|
| Alle sticky linkerkolommen | z-[60] | Blokkeert rode lijn links |
| NowIndicator | z-50 | Rode lijn zichtbaar in tijdlijn |
| TimelineHeader wrapper | z-[45] | Lijn loopt erdoorheen |
| SeatedCountRow wrapper | z-[45] | Lijn loopt erdoorheen |
| UnassignedGridRow wrapper | z-[45] | Lijn loopt erdoorheen |

## Technische wijzigingen

### `src/components/reserveringen/ReservationGridView.tsx`

**Regel 161 -- SeatedCountRow outer div:**
- Was: `z-[60]`
- Wordt: `z-[45]`

**Regel 304 -- UnassignedGridRow outer div:**
- Was: `z-[60]`
- Wordt: `z-[45]`

Totaal: 2 regels aanpassen in 1 bestand.

