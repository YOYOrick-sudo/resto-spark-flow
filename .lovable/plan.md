

# Popup lijst direct bijwerken bij toevoegen/verwijderen

## Probleem

Bij het aanmaken of verwijderen van een popup duurt het even voordat de lijst bijwerkt. Dit komt doordat `invalidateQueries` een achtergrond-refetch start maar niet wacht tot die klaar is. De UI toont pas de nieuwe staat nadat de refetch compleet is.

## Oplossing

Twee kleine aanpassingen in `src/hooks/usePopupConfig.ts`:

### 1. `useCreatePopup` — await invalidation

In de `onSuccess` callback, vervang `queryClient.invalidateQueries(...)` door `await queryClient.invalidateQueries(...)` en maak de callback `async`. Hierdoor wacht de mutatie tot de verse data er is voordat de UI-callback (`onSuccess` in `handleCreate`) vuur.

### 2. `useDeletePopup` — await invalidation

Zelfde aanpassing: maak `onSuccess` async en await de invalidation. De popup verdwijnt dan direct uit de lijst voordat de toast verschijnt.

## Technisch detail

**Bestand:** `src/hooks/usePopupConfig.ts`

Twee wijzigingen:

```
// useCreatePopup — onSuccess
onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['popup-configs', locationId] });
},

// useDeletePopup — onSuccess
onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ['popup-configs', locationId] });
},
```

Door `await` toe te voegen wacht React Query tot de refetch compleet is voordat de mutatie als "geslaagd" wordt beschouwd. De UI krijgt de verse data voordat de success-handlers in `PopupPage.tsx` draaien.

## Resultaat

- Nieuwe popup verschijnt direct in de lijst na aanmaken
- Verwijderde popup verdwijnt direct uit de lijst
- Geen extra API calls, geen optimistic updates nodig — alleen wachten op de refetch die al plaatsvindt

