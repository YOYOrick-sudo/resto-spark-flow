

# Verbeterde MepWeekView met inline taken

## Wat wijzigt

### MepWeekView.tsx — volledig herschreven

De dag-blokken worden groter en tonen een compacte takenlijst per dag:

- **Header**: dagnaam + dagnummer + count badge
- **Takenlijst**: max 3-4 taken zichtbaar per dag
  - Titel (truncated met `truncate` class), units badge rechts
  - Completed taken: groene tekst + doorgestreept (`line-through`)
  - Pending taken: standaard kleuren
  - Klik op een taak → opent completion modal (als pending)
- **Overflow**: "+N meer" badge als er meer taken zijn dan passen
- **Lege ruimte klik** → `onSelectDate` + switch naar dag view

### MepTaken.tsx — kleine aanpassing

- `onSelectDate` in week view moet optioneel dag view openen
- Nieuwe prop `onTaskComplete` doorgeven aan MepWeekView
- State voor completion modal toevoegen (hergebruik MepCompletionModal)

### Interface wijzigingen

MepWeekView krijgt een extra prop:
```typescript
interface MepWeekViewProps {
  tasks: MepTask[];
  currentDate: string;
  onSelectDate: (date: string) => void;
  onTaskClick: (task: MepTask) => void; // nieuw
  isLoading: boolean;
}
```

### Layout

Grid blijft `grid-cols-7` maar met `min-h-[200px]` per dag-blok. Taken worden als compacte rijen getoond met `py-1.5 px-2` padding conform compact density pattern.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/components/mep/MepWeekView.tsx` | Herschrijven met inline takenlijst |
| `src/pages/MepTaken.tsx` | Completion modal state + onTaskClick handler |

