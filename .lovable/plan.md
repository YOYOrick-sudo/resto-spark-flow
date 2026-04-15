

# SPRINT MEP-A — Definitief implementatieplan

## 5 bestanden, 4 wijzigingen + 1 verwijdering

### 1. `src/components/mep/MepTaskList.tsx`

**Fix 1** — Regel 101: header kleuren
```tsx
// Was:
hasOverdue ? "bg-error-light" : "bg-muted/30",
// Wordt:
hasOverdue ? "bg-destructive/[0.06]" : "bg-muted/50",
```

**Fix 8** — Regel 20: cancelled badge muted
```tsx
// Was:
cancelled: { variant: "error", label: "Geannuleerd" },
// Wordt:
cancelled: { variant: "default", label: "Geannuleerd" },
```

**Fix 7** — Regels 179-182: geen badge voor pending
```tsx
// Was:
<NestoBadge variant={status.variant} size="sm">
  {status.label}
</NestoBadge>
// Wordt:
{task.status !== "pending" && (
  <NestoBadge variant={status.variant} size="sm">
    {status.label}
  </NestoBadge>
)}
```

**Fix 9** — Na regel 146, methode type tonen:
```tsx
{task.title}
</span>
{(() => {
  const mt = task.methode?.type?.toLowerCase();
  const show = mt && !task.title.toLowerCase().includes(mt);
  return show ? (
    <span className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wider shrink-0">
      {mt}
    </span>
  ) : null;
})()}
{task.prioriteit === "Hoog" && (
```

### 2. `src/components/mep/MepTaskRow.tsx`

**Fix 6** — Hint cleanup:
- Verwijder import `MepAssistantHint` (regel 6)
- Verwijder `hint?: string | null` uit interface (regel 18)
- Verwijder `hint` uit destructuring (regel 30)
- Verwijder `{hint && <MepAssistantHint hint={hint} />}` (regel 87)

### 3. `src/components/mep/MepPriorityView.tsx`

**Fix 6** — Verwijder `getAssistantHint` uit import (regel 9) en `hint={getAssistantHint(task)}` prop (regel 103).

### 4. `src/utils/mepPriority.ts`

**Fix 6** — Verwijder `getAssistantHint` functie (regels 64-66).

### 5. `src/components/mep/MepAssistantHint.tsx`

**Verwijderen** — enige import was in `MepTaskRow.tsx`, die wordt opgeruimd. Geen barrel exports, geen andere referenties.

## Consistentie-check

| View | Pending badge | Cancelled badge | Methode type |
|------|--------------|-----------------|--------------|
| MepTaskList (categorie) | ❌ geen (na fix) | `default` grijs | ✅ IIFE |
| MepTaskRow (prioriteit) | ❌ geen (al correct) | `default` (al correct) | ✅ variabelen |

`NestoBadge variant="default"` = `bg-accent text-accent-foreground` — duidelijke grijze pill, goed onderscheidbaar van "geen badge".

