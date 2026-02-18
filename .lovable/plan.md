
# Meer ademruimte tussen kolommen in de Reserveringen lijst

## Probleem
De kolommen Pers, Tafel, Shift en Status staan te dicht op elkaar, waardoor de tabel visueel druk en moeilijk scanbaar overkomt.

## Oplossing
De grid-template aanpassen met bredere kolommen en extra `gap` tussen de cellen.

### Huidige grid-definitie
```
12px | 1fr | 48px | 56px | 120px | 110px | 80px | 32px
dot  | naam| pers | tafel| shift | status| acties| menu
```

### Nieuwe grid-definitie
```
12px | 1fr | 56px | 72px | 128px | 120px | 80px | 32px
dot  | naam| pers | tafel| shift | status| acties| menu
```

Wijzigingen per kolom:
- **Pers**: 48px naar 56px (+8px)
- **Tafel**: 56px naar 72px (+16px)
- **Shift**: 120px naar 128px (+8px)
- **Status**: 110px naar 120px (+10px)

Daarnaast wordt `gap-x-3` (12px) toegevoegd aan de grid om extra witruimte tussen alle kolommen te creeren.

### Technisch

**Bestand: `src/components/reserveringen/ReservationListView.tsx`**
- Regel 18: De `GRID_COLS` constante aanpassen met de nieuwe kolombreedtes en `gap-x-3` toevoegen
