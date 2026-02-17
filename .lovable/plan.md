

# Fix: Reservering verschijnt niet direct in de lijst

## Probleem
Dezelfde query key mismatch als eerder bij de status transitions. Na het aanmaken van een reservering wordt `invalidateQueries` aangeroepen met key `['reservations', locationId, undefined]`, maar de cache bevat `['reservations', locationId, '2026-02-17']`. TanStack Query ziet `undefined !== '2026-02-17'` en slaat de invalidatie over.

De reservering verschijnt pas na de realtime Postgres change subscription (vertraagd), in plaats van direct.

## Oplossing
Gebruik een prefix-key zonder date parameter, zodat alle date-varianten geinvalideerd worden.

## Wijziging

### `src/hooks/useCreateReservation.ts`

In de `onSuccess` callback (regel 49-52), verander:

```typescript
// Was:
queryKey: queryKeys.reservations(params.location_id),

// Wordt:
queryKey: ['reservations', params.location_id],
```

Dit zorgt ervoor dat TanStack Query via prefix-matching alle reserveringen-queries voor die locatie refetcht, ongeacht de datumparameter.

Geen andere bestanden hoeven te wijzigen.

