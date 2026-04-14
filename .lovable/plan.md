

# FIX: Recepten zijn ALTIJD halffabricaten

Simpele cleanup — verwijder het type-concept uit de recepten module op 4 plekken.

## Wijzigingen

### 1. `src/components/recepten/wizard/ReceptStapBasis.tsx`
- Verwijder de `onTypeChange` prop en interface
- Verwijder het type toggle UI blok (regels 55-73)
- Verwijder de `if (field === "type")` logica in `update()` (regels 34-40)
- Hardcode `type: "halffabricaat"` in de default data

### 2. `src/pages/ReceptenNieuw.tsx`
- Verwijder `useReceptTypeState` hook en `useState` import
- Verwijder `useReceptSteps` — vervang door een simpele `steps` constante (geen dynamische filtering meer)
- Methodes stap is ALTIJD in de array
- Verwijder `key={type}` van StepWizard
- Verwijder `onTypeChange={setType}` prop van ReceptStapBasis
- Hardcode `type: 'halffabricaat'` in handleComplete (regel 43)
- Verwijder `ReceptenNieuwInner` (dode code)

### 3. `src/pages/ReceptenDetail.tsx`
- Verwijder type badge uit basisinfo card (regels 155-157)
- Methodes tab ALTIJD in tabs array — verwijder de conditional spread (regel 60)
- Methodes tab content ALTIJD renderen — verwijder `recept.type === "halffabricaat"` check (regel 138)

### 4. `src/pages/Recepten.tsx`
- Geen type filter of type kolom aanwezig — geen wijziging nodig

**Totaal: 3 bestanden gewijzigd, 0 nieuw, 0 verwijderd, 0 migraties.**

