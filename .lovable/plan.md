

# Iets donkerder oranje achtergrond voor niet-toegewezen rijen

## Wat verandert
De subtiele oranje achtergrond voor niet-toegewezen reserveringen wordt een tikkeltje donkerder: van `bg-warning/5` naar `bg-warning/8` in zowel de **lijst-** als de **timeline-weergave**. Dit geeft net iets meer zichtbaarheid zonder te schreeuwen.

## Bestanden

### 1. `src/components/reserveringen/ReservationListView.tsx`
- Regel 164: `bg-warning/5` wordt `bg-warning/8`

### 2. `src/components/reserveringen/ReservationGridView.tsx`
- Regel 305: `bg-warning/5` wordt `bg-warning/8` (rij-achtergrond)
- Regel 310: `bg-warning/5` wordt `bg-warning/8` (sticky linkerkolom)

Drie regels, twee bestanden. Beide views krijgen exact dezelfde tint.
