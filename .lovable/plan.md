

# Fix: "Doorgaan" knop toevoegen aan CandidateActions

De sticky footer toont momenteel alleen "Afwijzen" en een tekstmelding bij voltooide taken. Er moet een echte "Doorgaan" knop komen.

---

## Wijzigingen

### 1. `CandidateActions.tsx` -- knop toevoegen + prop voor onAdvance

- Voeg `onAdvance` callback prop toe
- Vervang de tekstmelding (`allCurrentTasksDone && <p>...`) door een echte `NestoButton`
- Knop label: `isLastPhase ? 'Aannemen' : 'Doorgaan'`
- `disabled={!allCurrentTasksDone}`
- Houd de `ConfirmDialog` voor afwijzen intact

### 2. `CandidateDetailSheet.tsx` -- handleAdvance + isLastPhase logica

- Voeg `handleAdvance` functie toe die queries invalidateert + toast toont
- Bereken `isLastPhase` op basis van het laden van alle fasen (via `useOnboardingPhases`) en checken of de huidige fase de hoogste `sort_order` heeft
- Pas `onAdvance={handleAdvance}` door aan `CandidateActions`

---

## Technische details

### CandidateActions props (nieuw)

```text
interface CandidateActionsProps {
  status: string;
  candidateName: string;
  allCurrentTasksDone: boolean;
  isLastPhase: boolean;
  onReject: () => void;
  onAdvance: () => void;       // NIEUW
  isRejecting?: boolean;
}
```

### CandidateActions render (active status)

De active-status sectie wordt:
- Links: "Afwijzen" knop (outline, destructive styling)
- Rechts: "Doorgaan" of "Aannemen" knop (primary, disabled als taken niet klaar)
- ConfirmDialog blijft voor afwijzen

### handleAdvance in CandidateDetailSheet

```text
const handleAdvance = () => {
  queryClient.invalidateQueries({ queryKey: ['onboarding-candidates'] });
  queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
  queryClient.invalidateQueries({ queryKey: ['onboarding-events'] });
  toast.success('Doorgegaan naar volgende fase');
};
```

Hiervoor moet `useQueryClient` en `toast` geimporteerd worden in CandidateDetailSheet.

### isLastPhase berekening

Gebruik de bestaande `useOnboardingPhases` hook om alle fasen te laden. Vergelijk de `sort_order` van de huidige fase met de hoogste sort_order:

```text
const phases = useOnboardingPhases(locationId);
const isLastPhase = currentPhase?.sort_order === Math.max(...phases.map(p => p.sort_order));
```

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/onboarding/CandidateActions.tsx` | `onAdvance` prop + "Doorgaan"/"Aannemen" knop toevoegen |
| `src/components/onboarding/CandidateDetailSheet.tsx` | `handleAdvance`, `isLastPhase` logica, `useQueryClient` + `toast` imports |
