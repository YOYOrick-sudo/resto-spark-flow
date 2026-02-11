

# Onboarding: Taken uitvinkbaar + Handmatige fase-overgang

## Probleem 1: Taken kunnen niet uitgevinkt worden

De checkbox is `disabled` zodra een taak 'completed' is. Er bestaat geen functie om een taak terug te zetten naar 'pending'.

### Oplossing
- **`useCompleteTask.ts`** uitbreiden tot **`useToggleTask.ts`**: als status 'completed' is, zet terug naar 'pending' (wis `completed_at` en `completed_by`). Als status 'pending' is, zet naar 'completed'.
- **`TaskItem.tsx`**: Verwijder `disabled={isDone}` en laat de checkbox togglen. Voeg een subtiele undo-animatie toe (geen line-through totdat hover weg is).
- **`OnboardingDetail.tsx`**: Vervang `useCompleteTask` door `useToggleTask`.

## Probleem 2: Automatische fase-overgang zonder bevestiging

Een database trigger (`check_onboarding_phase_completion`) detecteert wanneer alle taken in een fase 'completed'/'skipped' zijn en verplaatst de kandidaat automatisch naar de volgende fase. Dit geeft de gebruiker geen kans om te controleren of reviewen.

### Oplossing

De trigger verwijderen en fase-overgang volledig handmatig maken via de bestaande "Doorgaan" knop.

1. **Database migratie**: `DROP TRIGGER trg_check_onboarding_phase_completion` en `DROP FUNCTION check_onboarding_phase_completion`. De logica (volgende fase bepalen, taken genereren, events loggen) verhuist naar een nieuwe database functie `advance_onboarding_phase(candidate_id, user_id)` die alleen via expliciete aanroep draait.
2. **`useAdvancePhase.ts`** (nieuw): Hook die de RPC `advance_onboarding_phase` aanroept.
3. **`CandidateActions.tsx`**: De "Doorgaan" knop opent een **ConfirmDialog** met samenvatting:
   - "Alle taken in [fase naam] zijn afgerond. Wil je doorgaan naar [volgende fase naam]?"
   - Bij "Aannemen" (laatste fase): "Alle taken zijn afgerond. Wil je [naam] aannemen?"
   - Pas na bevestiging wordt de RPC aangeroepen.
4. **`OnboardingDetail.tsx`**: `handleAdvance` roept `useAdvancePhase` aan in plaats van alleen queries te invalideren.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/hooks/useCompleteTask.ts` | Hernoem naar `useToggleTask`, toggle logica |
| `src/components/onboarding/TaskItem.tsx` | Checkbox uitvinkbaar maken |
| `src/pages/OnboardingDetail.tsx` | `useToggleTask` + `useAdvancePhase` integreren |
| `src/hooks/useAdvancePhase.ts` | Nieuw: RPC aanroep voor fase-overgang |
| `src/components/onboarding/CandidateActions.tsx` | ConfirmDialog voor "Doorgaan"/"Aannemen" |
| Database migratie | Drop trigger, nieuwe RPC `advance_onboarding_phase` |

## Enterprise flow na implementatie

```text
Taak afvinken          -->  Checkbox togglet vrij (undo mogelijk)
Alle taken afgerond    -->  "Doorgaan" knop wordt enabled
Klik "Doorgaan"        -->  ConfirmDialog: "Doorgaan naar [fase]?"
Bevestig               -->  RPC draait, nieuwe taken verschijnen
Laatste fase bevestigd -->  ConfirmDialog: "[Naam] aannemen?"
Bevestig               -->  Status wordt 'hired'
```

