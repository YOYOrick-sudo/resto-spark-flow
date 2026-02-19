

# Oranje achtergrond voor niet-toegewezen rijen in lijstweergave

## Wat verandert
Reserveringen zonder tafel krijgen dezelfde subtiele oranje achtergrondkleur (`bg-warning/5`) als in de timeline view. Zo is het visueel consistent tussen beide views.

## Visueel resultaat
- Rijen met tafel: normale achtergrond
- Rijen zonder tafel: licht oranje tint (`bg-warning/5`), zelfde als in timeline
- Hover: `hover:bg-accent/40` overschrijft de oranje tint (normaal gedrag)

## Technische wijziging

### `src/components/reserveringen/ReservationListView.tsx`
In de `ReservationRow` component (regel 158-164), een extra conditie toevoegen aan de `cn()` className:

```
!reservation.table_id && "bg-warning/5"
```

Dit wordt toegevoegd na de bestaande condities voor `cancelled` en `no_show`. Eén regel, geen andere bestanden nodig.

