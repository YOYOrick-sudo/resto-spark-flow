

## Fix: Dag-labels worden afgesneden aan linker- en rechterkant

### Probleem

In de screenshot is te zien dat de "M" (maandag) links helemaal niet zichtbaar is, en de laatste "Z" (zondag) rechts wordt afgeknipt. Dit komt door twee oorzaken:

1. De `AreaChart` heeft `margin left: 0` en `margin right: 0`, waardoor labels aan de randen buiten het zichtbare gebied vallen
2. De wrapper div heeft `marginRight: -5` wat de rechterkant extra afsnijdt

### Wijzigingen in `src/components/dashboard/ReservationsTile.tsx`

#### 1. Wrapper marginRight verwijderen (regel 51)

Van:
```tsx
<div className="mt-4" style={{ marginRight: -5 }}>
```
Naar:
```tsx
<div className="mt-4">
```

#### 2. AreaChart margin left en right toevoegen (regel 53)

Van:
```tsx
margin={{ top: 8, right: 0, bottom: 20, left: 0 }}
```
Naar:
```tsx
margin={{ top: 8, right: 16, bottom: 20, left: 16 }}
```

16px links en rechts geeft genoeg ruimte zodat de "M" en de laatste "Z" volledig zichtbaar zijn. De XAxis `padding` prop wordt niet gebruikt -- margin op de chart zelf is betrouwbaarder.

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | `marginRight: -5` verwijderen, chart margin left/right naar 16 |

### Resultaat

- Alle 7 labels volledig zichtbaar: M D W D V Z Z
- Lijn en gradient blijven edge-to-edge lopen (met 16px ademruimte)
- Hover dots blijven aligned met labels
