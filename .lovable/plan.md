

# Fix: Voorkom dubbele MEP taken op dezelfde dag

## Probleem

Quick Add maakt altijd een nieuwe taak aan, ook als er al een openstaande taak bestaat voor hetzelfde halffabricaat op dezelfde dag.

## Oplossing

`MepQuickAdd` krijgt de bestaande dagtaken als prop en checkt bij toevoegen of er al een match is.

## Wijzigingen

### `src/pages/MepTaken.tsx`
Pass `dayTasks` als prop aan `MepQuickAdd`:
```tsx
<MepQuickAdd taskDate={selectedDate} dayTasks={dayTasks} />
```

### `src/components/mep/MepQuickAdd.tsx`
1. Voeg `dayTasks: MepTask[]` toe aan props
2. Importeer `useUpdateMepTask` naast `useCreateMepTask`
3. In `handleAddFromRecept`, vóór create:
   - Bereken `smartDate` (bestaande logica)
   - Zoek `existing = dayTasks.find(t => t.recept_id === item.id && t.task_date === smartDate && t.status !== 'completed' && t.status !== 'cancelled')`
   - Als existing: `updateTask.mutate({ id: existing.id, units: (existing.units ?? 1) + 1 })` + toast "verhoogd naar X×"
   - Anders: bestaande create logica
4. Disable button ook als `updateTask.isPending`

Twee bestanden, geen database wijzigingen.

