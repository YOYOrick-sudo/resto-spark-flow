

# Oranje achtergrond iets sterker voor niet-toegewezen rijen

## Wat verandert
De oranje tint voor rijen zonder tafel gaat van `bg-warning/8` naar `bg-warning/12` in beide views. Zelfde transparante oranje, maar net een tikje meer zichtbaar.

## Bestanden

### 1. `src/components/reserveringen/ReservationListView.tsx`
- Regel 164: `bg-warning/8` wordt `bg-warning/12`

### 2. `src/components/reserveringen/ReservationGridView.tsx`
- Regel 305: `bg-warning/8` wordt `bg-warning/12` (rij-achtergrond)
- Regel 310: `bg-warning/8` wordt `bg-warning/12` (sticky linkerkolom)

Drie regels, twee bestanden. Zelfde stijl, iets meer kleur.

