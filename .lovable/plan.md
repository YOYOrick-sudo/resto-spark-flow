

# SPRINT MEP-F Fix 2 — MepWeekView inline taken verbeteren

## Scope

1 bestand wijzigen: `src/components/mep/MepWeekView.tsx`. Drie kleine gaps dichten.

## Overdue logica

MepTaskList gebruikt `task.deadline` (tijdstip, intra-dag). De week view is cross-dag, dus overdue check gaat op `task.task_date`:

```typescript
const todayStr = format(new Date(), "yyyy-MM-dd");
// Inside the task map:
const isOverdue = task.task_date < todayStr
  && task.status !== "completed" && task.status !== "cancelled";
```

Dit is consistent: MepTaskList = intra-dag deadline, MepWeekView = cross-dag taakdatum.

## Wijzigingen

### 1. Regel 8: MAX_VISIBLE_TASKS
```
3 → 5
```

### 2. Regels 96-126: Task render loop

Bereken `todayStr` eenmalig boven de `days.map()`. Per taak:

```tsx
const isDone = task.status === "completed";
const isCancelled = task.status === "cancelled";
const isOverdue = task.task_date < todayStr && !isDone && !isCancelled;

<button
  key={task.id}
  onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
  className={cn(
    "w-full flex items-center gap-1.5 py-1.5 px-2 rounded text-left transition-colors text-xs",
    isDone ? "text-success/70 hover:bg-success/5"
      : isOverdue ? "text-destructive font-medium hover:bg-destructive/5"
      : "text-foreground hover:bg-accent",
  )}
>
  <span className={cn("flex-1 truncate", isDone && "line-through")}>
    {task.title}
  </span>
  {task.units != null && task.units > 0 && (
    <span className="shrink-0 text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded tabular-nums">
      {task.units}×
    </span>
  )}
  {task.methode?.type && (
    <span className="shrink-0 text-[10px] text-muted-foreground">
      {task.methode.type.toLowerCase()}
    </span>
  )}
</button>
```

## Samenvatting

| Wijziging | Wat |
|-----------|-----|
| MAX_VISIBLE_TASKS | 3 → 5 |
| Overdue styling | `task.task_date < todayStr` → `text-destructive font-medium` |
| Methode type | Na units badge, `text-[10px] text-muted-foreground` |

Geen nieuwe bestanden. Geen migraties. Fix 1 (besteladvies buffer) is al compleet.

