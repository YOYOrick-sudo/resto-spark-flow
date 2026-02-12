
# Toast V8 als Systeem-Standaard

## Wat er moet gebeuren

De `nestoToast()` functie staat nu alleen in `TestToasts.tsx`. Dit plan maakt het de enige toast-methode in het hele platform.

## Stappen

### 1. Nieuwe utility: `src/lib/nestoToast.tsx`

Extract de `nestoToast` functie en `variantStyles` uit `TestToasts.tsx` naar een eigen bestand. Exporteer convenience-methodes:

```text
nestoToast.success(title, desc?)
nestoToast.error(title, desc?)
nestoToast.warning(title, desc?)
nestoToast.info(title, desc?)
```

Dit maakt migratie eenvoudig: `toast.success("X")` wordt `nestoToast.success("X")`.

### 2. Migratie — Sonner-aanroepen (20+ bestanden)

Alle bestanden die `import { toast } from "sonner"` gebruiken worden gemigreerd naar `import { nestoToast } from "@/lib/nestoToast"`.

Betreft o.a.:
- `useCreateCandidate.ts`, `useAdvancePhase.ts`, `useRejectCandidate.ts`
- `useTicketMutations.ts`, `useTableMutations.ts`, `useTableGroups.ts`
- `useDeletePhase.ts`, `useCreatePhase.ts`, `useResetOnboardingPhases.ts`
- `useReservationSettings.ts`, `usePolicySets.ts`, `useUpdatePhaseOwner.ts`
- `useToggleTask.ts`, `useSaveEvaluation.ts`
- `Reserveringen.tsx`, `SettingsReserveringenPacing.tsx`
- `TableGroupModal.tsx`
- `TestToasts.tsx` (import vanuit lib, functie verwijderen)

### 3. Migratie — Radix/useToast-aanroepen (4 bestanden)

Bestanden die het oude Radix toast-systeem (`useToast` / `@/hooks/use-toast`) gebruiken:
- `useShifts.ts` (5 mutaties)
- `useShiftExceptions.ts` (4 mutaties)
- `useSendMessage.ts`
- `ReservationGridView.tsx`

Deze worden ook gemigreerd naar `nestoToast`.

### 4. Opruimen — Oude toast-infrastructuur verwijderen

Na migratie zijn deze bestanden overbodig:
- `src/components/ui/toaster.tsx` — Radix Toaster component
- `src/components/ui/toast.tsx` — Radix Toast primitives
- `src/components/ui/use-toast.ts` — Re-export wrapper
- `src/hooks/use-toast.ts` — Radix toast hook + state machine

En in `App.tsx`:
- `<Toaster />` (Radix) verwijderen — alleen `<Sonner />` behouden (die rendert de custom toasts)

### 5. Documentatie updaten

`docs/design/TOAST_NOTIFICATIONS.md` bijwerken met het V8 patroon en de nieuwe import-conventie.

---

## Technische details

| Onderdeel | Actie |
|-----------|-------|
| `src/lib/nestoToast.tsx` | Nieuw bestand met V8 toast utility |
| 20+ hooks/components | `toast.success()` wordt `nestoToast.success()` |
| 4 bestanden met `useToast` | Migreren van Radix naar `nestoToast` |
| 4 oude toast-bestanden | Verwijderen |
| `App.tsx` | `<Toaster />` import en element verwijderen |
| `docs/design/TOAST_NOTIFICATIONS.md` | Updaten naar V8 standaard |

## Resultaat

- Een toast-systeem in plaats van twee
- Consistent V8 design overal
- Simpelere API: `nestoToast.success("Opgeslagen")`
