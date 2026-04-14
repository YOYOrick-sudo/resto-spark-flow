

# Fixes op Interne Bestellingen Plan

Twee aanpassingen op het goedgekeurde plan voordat we implementeren:

## Fix 1: Broadcast i.p.v. postgres_changes

**`src/hooks/useInterneBestellingen.ts`** — realtime sectie wordt:
```typescript
const channel = supabase
  .channel(`transfers:${orgId}`)
  .on('broadcast', { event: 'transfer_updated' }, () => {
    queryClient.invalidateQueries({ queryKey: ['interne-bestellingen', orgId] });
  })
  .subscribe();
```

**`src/hooks/useInterneBestellingMutations.ts`** — na elke succesvolle mutatie broadcast toevoegen:
```typescript
await supabase.channel(`transfers:${orgId}`).send({
  type: 'broadcast',
  event: 'transfer_updated',
  payload: {},
});
```
Dit geldt voor `createBestelling`, `updateStatus`, en `updateRegelHoeveelheden` onSuccess handlers.

**Database migratie** — verwijder:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.interne_bestellingen;
```

## Fix 2: van/naar logica omdraaien

**`src/hooks/useInterneBestellingMutations.ts`** — in `createBestelling.mutationFn`:
```typescript
// Was: van_location_id = mijn locatie, naar = gekozen
// Wordt: van = gekozen (leverende vestiging), naar = mijn locatie (ontvanger)
van_location_id: input.naar_location_id,
naar_location_id: currentLocation!.id,
```

**`src/components/interne-bestellingen/NieuweAanvraagPanel.tsx`** — label aanpassen:
- "Aanvragen bij vestiging" blijft correct (dat is de leverende vestiging)
- Het veld `naarLocationId` wordt doorgegeven als `naar_location_id` in de input, maar de mutation mapt dit nu correct

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/hooks/useInterneBestellingen.ts` | Broadcast i.p.v. postgres_changes |
| `src/hooks/useInterneBestellingMutations.ts` | Broadcast na mutaties + van/naar fix |
| Database migratie SQL | Verwijder realtime publication regel |

Alle drie wijzigingen worden meegenomen in de implementatie van het volledige Interne Bestellingen plan.

