

# Fix: Consistente styling — design system alignment

## Gevonden afwijkingen

| Afwijking | Waar | Systeem-standaard |
|---|---|---|
| `Input` (ShadCN) met `h-12` override | GerechtStapBasis, GerechtStapPrijs, GerechtStapRecepten | `NestoInput` (h-10) |
| Raw `<input>` met `h-12` | ReceptStapIngredienten (zoekbalk) | `NestoInput` (h-10) |
| StepWizard footer buttons `size="lg"` (h-12) | StepWizard.tsx | `NestoButton` default (h-10) |
| Label styling inconsistent (`text-sm font-medium` vs `text-label text-muted-foreground`) | GerechtStapBasis, GerechtStapPrijs, ReceptStapBasis | `text-label text-muted-foreground` |
| `space-y-6` in wizard stappen | GerechtStapBasis, GerechtStapPrijs, GerechtStapRecepten | `space-y-4` (zoals IngredientStapBasis) |

## Wijzigingen

### 1. `src/components/polar/StepWizard.tsx`
- Footer buttons: verwijder `size="lg"`, gebruik default size (h-10)
- 3 regels: regels 233, 244, 250

### 2. `src/components/kaartbeheer/wizard/GerechtStapBasis.tsx`
- Vervang `Input` import door `NestoInput`, verwijder `className="h-12"`
- Vervang `Textarea` import door standaard — geen NestoTextarea, dus `Textarea` is ok
- Labels: `text-sm font-medium` → `text-label text-muted-foreground`
- `space-y-6` → `space-y-4`

### 3. `src/components/kaartbeheer/wizard/GerechtStapPrijs.tsx`
- Vervang `Input` met `h-12` door `NestoInput`
- Labels: `text-sm font-medium` → `text-label text-muted-foreground`
- `space-y-6` → `space-y-4` (top-level)

### 4. `src/components/kaartbeheer/wizard/GerechtStapRecepten.tsx`
- Vervang `Input` met `h-12` door `NestoInput` (2 plekken: zoekbalk + hoeveelheid)
- Verwijder `min-h-[44px]` van de twee NestoButton's (regels 156, 159) — NestoButton heeft al h-10 standaard
- `space-y-6` → `space-y-4`

### 5. `src/components/recepten/wizard/ReceptStapIngredienten.tsx`
- Vervang raw `<input className="...h-12...">` zoekbalk door `NestoInput` met `leftIcon={<Search />}`
- `space-y-5` → `space-y-4` (indien afwijkend)

### 6. `src/components/recepten/wizard/ReceptStapBasis.tsx`
- Labels: `text-sm font-medium text-foreground` → `text-label text-muted-foreground` (4 plekken)

**Totaal: 6 bestanden, 0 nieuw, 0 verwijderd, 0 migraties.**

