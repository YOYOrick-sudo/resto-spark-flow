

# Oranje achtergrond voor niet-toegewezen rijen in lijstweergave

## Wat verandert
Reserveringen zonder tafel krijgen dezelfde subtiele oranje achtergrondkleur (`bg-warning/5`) als in de timeline view. Eén regel code toevoegen, maximale visuele consistentie tussen beide views.

## Visueel resultaat
- Rijen met tafel: normale achtergrond (wit/transparant)
- Rijen zonder tafel: licht oranje tint (`bg-warning/5`), identiek aan de timeline
- Hover: `hover:bg-accent/40` overschrijft de oranje tint (normaal gedrag)

## Technische wijziging

### `src/components/reserveringen/ReservationListView.tsx`
In de `ReservationRow` component (regel 162-163), een extra conditie toevoegen aan het `cn()` blok:

```
!reservation.table_id && "bg-warning/5"
```

Dit komt na de bestaande condities voor `cancelled` en `no_show`. Geen andere bestanden nodig.

