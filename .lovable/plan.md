

# Fix: Query Key Matching in Optimistic Updates

## Probleem
De optimistic update in `useTransitionStatus.ts` werkt niet omdat de query key niet matcht.

- Cached key: `['reservations', 'locationId', '2026-02-17']`
- Filter key: `['reservations', 'locationId', undefined]`

TanStack Query's `partialDeepEqual` ziet `undefined !== '2026-02-17'` en slaat de cache-update over. Resultaat: de UI wacht op de server-refetch voordat de status visueel verandert.

## Oplossing
Gebruik een **prefix-key zonder date** voor het matchen van queries in `onMutate` en `cancelQueries`:

```typescript
// Was (matcht NIET):
queryKeys.reservations(params.location_id)
// → ['reservations', 'abc', undefined]

// Wordt (matcht WEL via prefix):
['reservations', params.location_id]
// → ['reservations', 'abc']  — matcht alle date-varianten
```

## Wijzigingen

### Bestand: `src/hooks/useTransitionStatus.ts`

Twee plekken aanpassen:

**1. `cancelQueries` (regel 36-39):** Verander `queryKey` van `queryKeys.reservations(params.location_id)` naar `['reservations', params.location_id]`

**2. `getQueriesData` (regel 42-44):** Verander `queryKey` van `queryKeys.reservations(params.location_id)` naar `['reservations', params.location_id]`

Geen andere bestanden hoeven te wijzigen. De icons (RotateCcw, LogOut, UserCheck) staan al correct in de code — ze verschijnen zodra de optimistic update daadwerkelijk de cache bijwerkt.

