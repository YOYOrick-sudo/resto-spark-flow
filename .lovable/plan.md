

## Plan — Twee UX-verbeteringen Taken Logboek

### Verbetering 1 — Completion-% in Maand & Week views

**Helper extractie** — Identieke berekening hergebruiken via een kleine inline-helper per dag:
```ts
function getDayCompletion(bucket: DayBucket | undefined): number | null {
  if (!bucket || bucket.isClosed || bucket.runs.length === 0) return null;
  const done = bucket.runs.filter(r => !!r.afgerond_op).length;
  return Math.round((done / bucket.runs.length) * 100);
}
```
(Per-dag = afgeronde runs / totale runs op die dag — consistent met YearGrid's "completedDays/openDays" filosofie maar op dag-niveau toegepast.)

**Kleur-codering badge** (zelfde als YearGrid):
- `>= 80%` → `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`
- `40–79%` → `bg-amber-500/10 text-amber-700 dark:text-amber-400`
- `< 40%` → `bg-muted text-muted-foreground`
- Format: `text-[10px] font-medium px-1.5 py-0.5 rounded`, label "`{pct}%`"

**`LogboekMonthGrid.tsx`** — In dag-cel, na de "N runs"-regel (rond regel 105–110):
- Voeg badge toe alleen als `completion !== null`
- Niet tonen op gesloten/toekomst/lege dagen

**`LogboekWeekStrip.tsx`** — Idem, na de "N runs"-regel (rond regel 56–60):
- Zelfde badge eronder

### Verbetering 2 — Dag-view full-width

**`TakenLogboek.tsx`** — Conditional layout:

```tsx
{viewMode === "dag" ? (
  <div className="space-y-4">
    {/* Tabs + nav-knoppen (vorige/vandaag/volgende) bovenaan, full-width */}
    <div className="max-w-4xl">
      <LogboekDagDetail date={anchorDate} bucket={effectiveBucket} />
    </div>
  </div>
) : (
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
    {/* huidige split-view */}
  </div>
)}
```

- Tabs + period-switcher blijven identiek bovenaan in beide modes
- Bij `viewMode === "dag"`: geen kalender-grid, geen rechter-sticky, alleen `LogboekDagDetail` in `max-w-4xl` container
- Placeholder "Detail wordt rechts getoond" verdwijnt volledig
- `effectiveDate` blijft `anchorDate` in dag-mode (al correct)

### Bestanden
| Bestand | Wijziging |
|---|---|
| `src/components/taken/LogboekMonthGrid.tsx` | Completion-badge per dag-cel |
| `src/components/taken/LogboekWeekStrip.tsx` | Completion-badge per dag-cel |
| `src/pages/TakenLogboek.tsx` | Conditional layout: dag-view = full-width, rest = split |

### Niet in scope
- `LogboekDagDetail.tsx` ongewijzigd
- `LogboekYearGrid.tsx` ongewijzigd (al klaar)
- Hook ongewijzigd (data per dag al beschikbaar)

