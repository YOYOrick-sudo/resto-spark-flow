

# Fix 3 problemen + Walk-in E2E test

## Probleem 1: Backfill bestaande reserveringen

Er zijn 2 reserveringen met `risk_factors = NULL` en `no_show_risk_score = 0.00`. De BEFORE UPDATE trigger (`trg_calculate_no_show_risk_update`) herberekent bij elke update. We triggeren een no-op update om de risk data te vullen.

**Actie:** Voer een UPDATE uit via een SQL migratie (het data-update pad):
```sql
UPDATE reservations SET party_size = party_size WHERE risk_factors IS NULL;
```

Dit triggert `fn_calculate_no_show_risk()` via de BEFORE UPDATE trigger, waardoor `risk_factors` en `no_show_risk_score` correct worden gevuld.

## Probleem 2: handleStatusChange stub in Reserveringen.tsx

De `handleStatusChange` op regel 91-93 is een lege stub die alleen een toast toont. Dit wordt doorgegeven aan `ReservationListView` als `onStatusChange`, waar het in de dropdown menu items wordt aangeroepen (regel 235). Status transities vanuit de lijst werken daardoor niet.

**Twee opties:**
- **Optie A (aanbevolen):** Vervang de stub door een werkende `useTransitionStatus` call. Dit maakt inline status changes vanuit de list view werkend.
- **Optie B:** Verwijder de dropdown menu uit de list view en laat status changes alleen via het detail panel lopen.

**Optie A implementatie:**

In `src/pages/Reserveringen.tsx`:
- Importeer `useTransitionStatus`
- Vervang `handleStatusChange` door:
```typescript
const transition = useTransitionStatus();

const handleStatusChange = useCallback((reservation: Reservation, newStatus: Reservation["status"]) => {
  transition.mutate({
    reservation_id: reservation.id,
    new_status: newStatus,
    location_id: reservation.location_id,
    customer_id: reservation.customer_id,
  }, {
    onSuccess: () => {
      nestoToast.success(`Status gewijzigd naar: ${STATUS_LABELS[newStatus] || newStatus}`);
    },
    onError: (err) => {
      nestoToast.error(`Fout: ${err.message}`);
    },
  });
}, [transition]);
```

Importeer ook `STATUS_LABELS` uit `@/types/reservation`.

## Probleem 3: Emoji in ReservationActions override dialog

Regel 249 in `ReservationActions.tsx` bevat `⚠️` emoji. `AlertTriangle` is al geimporteerd in het bestand (vanuit het import block, regel 1-5 -- het moet nog worden toegevoegd aan de imports).

**Actie:** In `src/components/reservations/ReservationActions.tsx`:
- Voeg `AlertTriangle` toe aan de lucide-react import op regel 2-5
- Vervang regel 248-250:
```
<p className="text-sm text-muted-foreground mb-4">
  ⚠️ Dit wijkt af van de standaard workflow en wordt gelogd.
</p>
```
met:
```
<div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
  <p>Dit wijkt af van de standaard workflow en wordt gelogd.</p>
</div>
```

## Walk-in E2E test

Na de fixes: maak een walk-in aan via de Walk-in knop en verifieer:
1. Reservering verschijnt in de lijst (LEFT JOIN test)
2. Database check: `customer_id = NULL`, `risk_factors` gevuld, `channel = walk_in`, `status = seated`

---

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| SQL (data update) | Backfill risk_factors voor bestaande reserveringen |
| `src/pages/Reserveringen.tsx` | Vervang handleStatusChange stub door useTransitionStatus call |
| `src/components/reservations/ReservationActions.tsx` | Vervang emoji door AlertTriangle Lucide icon |

