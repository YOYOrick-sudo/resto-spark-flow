

# Pipeline board: fase-nummers + responsive grid

Twee aanpassingen aan het pipeline board zodat alle fasen in een oogopslag zichtbaar zijn.

---

## 1. Fase-nummers in kolom-headers

Omdat `phases` al gesorteerd op `sort_order` binnenkomen, geeft `PipelineBoard` de index door als `phaseNumber` prop aan `PhaseColumn`.

De header wordt dan: **"1. Aanmelding ontvangen"**, **"2. Screening"**, etc.

---

## 2. Horizontaal scroll → responsive grid

Vervang de `flex overflow-x-auto` container door een CSS grid:

```text
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4
```

- **Mobiel**: 1 kolom
- **Tablet (sm)**: 2 kolommen
- **Desktop (lg)**: 3 kolommen
- **Breed (xl)**: 4 kolommen

De `PhaseColumn` verliest z'n vaste breedte (`min-w-[220px] w-[280px] flex-shrink-0`) en wordt `w-full` zodat hij de grid-cel vult.

---

## Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/onboarding/PipelineBoard.tsx` | `flex overflow-x-auto` → responsive grid, `phaseNumber` prop doorgeven (index + 1) |
| `src/components/onboarding/PhaseColumn.tsx` | Vaste breedte weg, `phaseNumber` prop toevoegen, header toont `{phaseNumber}. {phase.name}` |

---

## Technische details

### PipelineBoard.tsx

- Container class wordt: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
- `phases.map((phase, index)` → geeft `phaseNumber={index + 1}` door

### PhaseColumn.tsx

- Interface krijgt `phaseNumber: number`
- Class `min-w-[220px] w-[280px] flex-shrink-0` wordt verwijderd (column vult grid-cel automatisch)
- Header text: `{phaseNumber}. {phase.name}` (genummerd)

Geen nieuwe bestanden nodig. Twee kleine wijzigingen.
