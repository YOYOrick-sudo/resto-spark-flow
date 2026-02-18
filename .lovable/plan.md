
# "Afronden" hernoemen naar "Uitchecken" in ReservationActions

## Probleem
In het detailpanel staat de actieknop voor het afronden van een ingecheckte reservering als "Afronden" met een vinkje-icoon. In de lijstweergave staat dezelfde actie al als "Uitchecken" met een LogOut-icoon. Dit is inconsistent.

## Wijziging

### Bestand: `src/components/reservations/ReservationActions.tsx`
- Regel 76: label `'Afronden'` wordt `'Uitchecken'`
- Regel 76: icoon `Check` wordt `LogOut` (al geimporteerd in het bestand)

Eén regel wijzigt:
```
// Was:
{ key: 'complete', label: 'Afronden', icon: Check, targetStatus: 'completed', variant: 'primary' },

// Wordt:
{ key: 'complete', label: 'Uitchecken', icon: LogOut, targetStatus: 'completed', variant: 'primary' },
```

## Resultaat
Detailpanel en lijstweergave gebruiken nu beide "Uitchecken" met het LogOut-icoon voor het afronden van ingecheckte reserveringen.
