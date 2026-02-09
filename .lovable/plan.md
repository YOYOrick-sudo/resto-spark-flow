

# Textarea styling conform Nesto Polar

## Wijzigingen

### 1. `src/components/ui/textarea.tsx`
De base className aanpassen van ShadCN default naar Nesto Polar:

| Eigenschap | Was | Wordt |
|------------|-----|-------|
| Border | `border border-input` | `border-[1.5px] border-border` |
| Achtergrond | `bg-background` | `bg-card` |
| Radius | `rounded-md` | `rounded-button` |
| Focus | `ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` | `focus:!border-primary focus:outline-none focus:ring-0` |

### 2. `src/components/onboarding/EvaluationForm.tsx`
Raw `<textarea>` element vervangen door de `Textarea` component, zodat het automatisch de Nesto styling erft.

Resultaat: alle textareas in het project zien er hetzelfde uit als NestoInput — 1.5px border, witte achtergrond, teal focus border, geen ring.

