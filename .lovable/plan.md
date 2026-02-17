

# Fix: Directe UI-update bij Check-in/Uitcheck

## Probleem
Na het klikken op check-in/uitcheck wacht de UI op een server-refetch voordat de status visueel verandert. Hierdoor blijven de oude knoppen zichtbaar en kan de gebruiker per ongeluk nogmaals klikken, wat "Invalid status transition" fouten veroorzaakt (bijv. confirmed -> confirmed).

## Oplossing: Optimistic Updates in useTransitionStatus

De `useTransitionStatus` hook krijgt een `onMutate` callback die de lokale query-cache **direct** bijwerkt voordat de server-response binnenkomt. Bij een fout wordt de cache automatisch teruggedraaid via `onError`.

---

## Technische Wijzigingen

### Bestand: `src/hooks/useTransitionStatus.ts`

Voeg optimistic update toe aan de mutation:

```text
onMutate -> snapshot huidige cache -> update status in cache -> return snapshot
onError  -> rollback naar snapshot
onSettled -> invalidate queries (vervangt huidige onSuccess)
```

Concrete logica in `onMutate`:
1. Cancel lopende refetches voor de reservations query
2. Snapshot de huidige cache-data
3. Update de reservering in de cache: zet `status` naar `new_status`, en als `new_status === 'seated'` ook `checked_in_at` op `new Date().toISOString()`
4. Return de snapshot voor rollback

Bij `onError`: herstel de cache naar de snapshot.
Bij `onSettled` (vervangt `onSuccess`): invalideer alle relevante queries zodat de echte server-data wordt opgehaald.

### Bestand: `src/pages/Reserveringen.tsx`

Geen wijzigingen nodig — de `handleStatusChange` callback blijft hetzelfde. De optimistic update zit volledig in de hook.

---

## Wat dit oplost
- Status-knoppen veranderen **onmiddellijk** na klikken (geen wachttijd)
- Gebruiker ziet direct de juiste knoppen (RotateCcw + LogOut na check-in)
- Dubbel-klikken op dezelfde knop wordt voorkomen doordat de status al gewijzigd is in de lokale cache
- Bij een server-fout wordt de oude status automatisch hersteld

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/hooks/useTransitionStatus.ts` | Optimistic update toevoegen (onMutate, onError, onSettled) |

