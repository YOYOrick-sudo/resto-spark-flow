

# Fase 4.9.5b — Check-in/Uitcheck Flow

## Overzicht
Drie wijzigingen: database transitie seated->confirmed met move-to-now undo, client-side transitiematrix, en twee icoon-knoppen naast elkaar bij ingecheckte reserveringen.

---

## Stap 1: Database Migratie

Nieuwe migratie die `transition_reservation_status` uitbreidt.

### 1A. Transitiematrix uitbreiden
In de CASE-expressie, wijzig:
```sql
WHEN 'seated' THEN _new_status IN ('completed')
```
naar:
```sql
WHEN 'seated' THEN _new_status IN ('completed', 'confirmed')
```

### 1B. Undo check-in logica (inclusief move-to-now herstel)
Nieuwe ELSIF branch voor seated -> confirmed:

```sql
ELSIF _new_status = 'confirmed' AND _r.status = 'seated' THEN
  SELECT (metadata->>'original_start_time')::TIME INTO _original_start
  FROM public.audit_log
  WHERE entity_id = _reservation_id
    AND action = 'status_change'
    AND changes->>'new_status' = 'seated'
  ORDER BY created_at DESC LIMIT 1;

  UPDATE public.reservations SET
    status = 'confirmed',
    checked_in_at = NULL,
    start_time = COALESCE(_original_start, start_time),
    updated_at = NOW()
  WHERE id = _reservation_id;
```

Belangrijk: `entity_id` is UUID type (geverifieerd tegen schema), dus **geen** `::text` cast nodig op `_reservation_id`.

De `_original_start` variabele bestaat al in de functie (gedeclareerd voor move-to-now logica). Als er geen move-to-now was toegepast staat `original_start_time` niet in metadata, dus `_original_start` wordt NULL en `COALESCE` houdt de huidige `start_time`.

---

## Stap 2: Client-side Transitiematrix

**Bestand:** `src/types/reservation.ts` regel 100

Wijzig:
```typescript
seated: ['completed'],
```
naar:
```typescript
seated: ['completed', 'confirmed'],
```

Dit propageert automatisch naar Grid View dropdown en Detail Panel acties.

---

## Stap 3: List View — RotateCcw + LogOut naast elkaar

**Bestand:** `src/components/reserveringen/ReservationListView.tsx`

### 3A. Import
Voeg `RotateCcw` toe aan lucide-react import (regel 2).

### 3B. Seated knoppen
Vervang de enkele LogOut-knop bij seated (regels 236-244) door twee knoppen in een flex container:

```tsx
{reservation.status === 'seated' && onStatusChange && (
  <div className="flex items-center gap-1 flex-shrink-0">
    <button
      onClick={(e) => { e.stopPropagation(); onStatusChange(reservation, 'confirmed'); }}
      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground/60 transition-colors"
      title="Check-in ongedaan maken"
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </button>
    <button
      onClick={(e) => { e.stopPropagation(); onStatusChange(reservation, 'completed'); }}
      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
      title="Uitchecken"
    >
      <LogOut className="h-4 w-4" />
    </button>
  </div>
)}
```

RotateCcw is visueel subtieler (kleiner icoon, lagere opacity) zodat uitchecken de primaire actie blijft.

---

## Bestanden

| Bestand | Actie |
|---------|-------|
| SQL migratie (nieuw) | seated->confirmed in matrix + move-to-now undo via audit_log lookup (entity_id = UUID, geen cast) |
| `src/types/reservation.ts` | ALLOWED_TRANSITIONS seated array uitbreiden |
| `src/components/reserveringen/ReservationListView.tsx` | RotateCcw import + twee knoppen bij seated |

## Implementatievolgorde
1. Database migratie
2. Types update
3. List View UI
