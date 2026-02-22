

# Fix: NestoOutlineButtonGroup dubbele rand verwijderen

## Probleem
De `NestoOutlineButtonGroup` component (periode selector, template categorieën, etc.) gebruikt `border-[1.5px] border-primary` op de geselecteerde staat. Dit geeft een dikke, zichtbare dubbele rand die niet overeenkomt met de rest van de app.

## Hoe het nu is vs. hoe het moet

| Eigenschap | Nu (fout) | Straks (correct) |
|---|---|---|
| Selected border | `border-[1.5px] border-primary` | `border border-primary/20` |
| Selected achtergrond | `bg-primary/10` | `bg-primary/10` (ongewijzigd) |
| Selected tekst | `text-primary` | `text-primary` (ongewijzigd) |
| Schaduw | geen | `shadow-sm` |
| Unselected border | `border-[1.5px] border-transparent` | geen border |

Dit is exact het patroon dat al gebruikt wordt in `ViewToggle.tsx` en `DensityToggle.tsx` in de reserveringen module.

## Wijziging

Eén bestand: `src/components/polar/NestoOutlineButtonGroup.tsx`

Geselecteerde staat wordt:
```
bg-primary/10 text-primary border border-primary/20 shadow-sm
```

Niet-geselecteerde staat wordt:
```
bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground
```

De `border-[1.5px]` class op regel 44 wordt ook verwijderd als base class.

## Impact
Alle plekken waar `NestoOutlineButtonGroup` gebruikt wordt krijgen automatisch de fix:
- Analytics periode selector (7d/30d/90d)
- Campaign builder template categorieën
- Campaign builder verzendmoment selector
- Campaign builder desktop/mobile preview toggle
