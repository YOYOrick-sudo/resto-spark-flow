

# Textarea consistentie: laatste fixes

## Overzicht

De base `Textarea` component is al gefixt. Er zijn nog 2 plekken die opgeruimd moeten worden:

## Wijzigingen

### 1. `src/components/onboarding/AddCandidateModal.tsx`
**Probleem**: Gebruikt een raw `<textarea>` element met handmatig gekopieerde styling in plaats van de `Textarea` component.

**Fix**:
- Import `Textarea` uit `@/components/ui/textarea`
- Vervang de raw `<textarea>` door `<Textarea>` met alleen `className="resize-none"` (de rest erft van de base component)

### 2. `src/components/reserveringen/QuickReservationPanel.tsx`
**Probleem**: Heeft `className="resize-none border-[1.5px]"` — de `border-[1.5px]` is overbodig omdat dit al in de base Textarea zit.

**Fix**: Verander naar `className="resize-none"` (alleen de override die nodig is)

## Resultaat
Na deze 2 kleine fixes zijn alle textareas in het hele project consistent via de base component, zonder overrides of raw elementen.
