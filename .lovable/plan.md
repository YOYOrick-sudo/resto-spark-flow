
# Fix: NU-lijn z-index + NestoPanel overlay dekking

Twee chirurgische fixes, elk 1 regel in 1 bestand.

## Wijziging 1: NU-lijn z-index verlagen

**Bestand:** `src/components/reserveringen/ReservationGridView.tsx` (regel 233)

| Was | Wordt |
|-----|-------|
| `z-50` | `z-20` |

De NU-lijn container gaat van z-50 naar z-20 zodat panels (z-40) er overheen komen. Reserveringsblokken zitten op z-10, dus z-20 blijft erboven. Na implementatie even visueel checken — mocht de lijn toch onder blokken verdwijnen, dan wordt het z-25.

## Wijziging 2: NestoPanel overlay dekkender maken

**Bestand:** `src/components/polar/NestoPanel.tsx` (regel 111)

| Was | Wordt |
|-----|-------|
| `bg-black/20` | `bg-black/40 backdrop-blur-[2px]` |

Verhoogt dekking van 20% naar 40% en voegt subtiele blur toe. Timeline schemert niet meer door.

## Scope

- 2 bestanden, elk exact 1 regel
- Geen Grid View layout wijzigingen
- Geen Sheet/SheetContent wijzigingen
- Alle panels profiteren automatisch (CreateReservationSheet, WalkInSheet, ReservationDetailPanel)
