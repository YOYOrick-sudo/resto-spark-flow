

# MEP Taken: Twee Views + Assistent Prioritering

## Database migratie

Voeg `'Laag'` toe aan de prioriteit constraint:

```sql
ALTER TABLE mep_tasks DROP CONSTRAINT IF EXISTS mep_tasks_prioriteit_check;
ALTER TABLE mep_tasks ADD CONSTRAINT mep_tasks_prioriteit_check 
  CHECK (prioriteit IN ('Hoog', 'Normaal', 'Laag'));
```

## Nieuwe bestanden

### `src/utils/mepPriority.ts`
Twee pure functies:

- **`calculatePriorityScore(task, ingredientStock)`** — retourneert numerieke score. Overtijd +10000, Hoog +5000, Laag -5000, lage voorraad +2000, bereidingstijd >60m +1000 / >30m +500, deadline nabijheid +max(0, 1000 - minutesUntil).
- **`getAssistantHint(task, ingredientStock)`** — retourneert `string | null`. Bereidingstijd hint als >30 min en deadline nadert. Voorraad hint als ingrediënt onder min_voorraad. Geen hint = null.

### `src/hooks/useMepIngredientStock.ts`
Nieuwe hook. Alleen enabled als `enabled` param true is (prioriteit-view).
- Haalt recept_ids op uit taken, query `recept_ingredienten` joined met `ingredienten(id, naam, eenheid, voorraad, min_voorraad)`.
- Retourneert `Map<recept_id, { naam, voorraad, min_voorraad, eenheid }[]>`.

### `src/components/mep/MepPriorityView.tsx`
View 1 component. Ontvangt `dayTasks`, `ingredientStock`, `onComplete`, `onCancel`, `onPriorityChange`.
- Partitioneert in overtijd / openstaand / voltooid
- Sorteert openstaand op `calculatePriorityScore`
- Rendert: `MepOvertijdGroup` → platte "Openstaand" lijst met `MepTaskRow` (met hints) → `MepCompletedGroup`

### `src/components/mep/MepCategoryView.tsx`
View 2 component. Refactor van huidige dag-view logica uit `MepTaken.tsx`.
- Gebruikt bestaande `MepCategoryGroup`, `MepOvertijdGroup`, `MepCompletedGroup`
- Geen ingredientStock nodig

### `src/components/mep/MepAssistantHint.tsx`
Klein component: `ℹ️ {hint}` in `text-xs text-muted-foreground`. Rendert niets als hint null.

## Gewijzigde bestanden

### `src/hooks/useMepTasks.ts`
- Extend recept join: `recept:recepten(id, naam, porties, actieve_bereidingstijd, passieve_bereidingstijd)`
- Update `MepTask` interface: recept krijgt `actieve_bereidingstijd?: number | null` en `passieve_bereidingstijd?: number | null`

### `src/pages/MepTaken.tsx`
- View state wordt `"prioriteit" | "categorie" | "week"`, init uit `localStorage.getItem("mep-view-preference")` met fallback `"prioriteit"`
- Bij wissel: `localStorage.setItem(...)`
- Header toggle: 3 iconen — `List` (prioriteit), `LayoutGrid` (categorie), `CalendarDays` (week)
- Conditionally call `useMepIngredientStock` met `enabled: view === "prioriteit"`
- Groepering-logica verhuist naar view-componenten
- Rendert `MepPriorityView` of `MepCategoryView` of `MepWeekView`

### `src/components/mep/MepTaskRow.tsx`
- Nieuwe props: `hint?: string | null`, `onPriorityChange?: (taskId: string, prioriteit: string) => void`
- **Status badges**: alleen `in_progress` ("Bezig" primary) en `cancelled` ("Geannuleerd" default). Geen badge bij `pending` — dit is al geimplementeerd, blijft zo.
- **Prioriteit badge**: klikbaar → Popover met 3 opties (Hoog/Normaal/Laag). Hoog = error badge, Normaal = niet tonen, Laag = default (grijs) badge.
- **Linkerborder**: rood bij Hoog of overtijd, grijs bij Laag, geen bij Normaal
- **Hint**: rendert `MepAssistantHint` onder de units/deadline regel als hint niet null is

## Opmerkingen gebruiker verwerkt

1. **ingredientStock hook alleen bij prioriteit-view** — `useMepIngredientStock` krijgt `enabled` param, alleen true als `view === "prioriteit"`
2. **Normaal badge niet tonen** — alleen Hoog (rood) en Laag (grijs) badges zichtbaar
3. **Open badge niet tonen** — geen badge bij `status === 'pending'`, alleen "Bezig" bij `in_progress` (al geimplementeerd, wordt behouden)

