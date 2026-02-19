

# Widget: Logo groter + Warmere achtergrond

## Wat verandert

1. **Logo groter**: Van `h-14` (56px) naar `h-20` (80px) in embed, en van `h-16` (64px) naar `h-20` in standalone.
2. **Achtergrondkleur**: Van puur wit (`bg-white`) naar een warm gebroken wit (`bg-[#FAFAF8]`) -- een heel subtiele cremetint die zachter en premium aanvoelt.

## Technische wijzigingen in `src/pages/BookingWidget.tsx`

### Achtergrond (regel 115)
- `bg-white` wordt `bg-[#FAFAF8]`

### Embed logo (regel 131)
- `h-14` wordt `h-20`

### Standalone logo (regel 143)
- `h-16` wordt `h-20`

Dat is alles -- drie kleine class-wijzigingen.

