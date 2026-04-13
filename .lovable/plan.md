

# Nieuw Ingrediënt: Modal → Slide-in Panel met Secties

## Overzicht

Vervang de `NieuwIngredientModal` door een `NestoPanel` (460px slide-in van rechts), met visueel gegroepeerde secties gescheiden door dividers. Zelfde velden, betere leesbaarheid.

## Design

```text
┌─────────────────────────────────┐
│  Ingrediënt · Nieuw         [X] │  ← sticky header
├─────────────────────────────────┤
│  Nieuw ingrediënt               │  ← h2 titel (scrollt mee)
│                                 │
│  Naam *            [          ] │
│  Categorie *       [▾         ] │
│  Eenheid *         [▾         ] │
│                                 │
│  ─── Prijs & BTW ───────────── │  ← sectie divider
│  Kostprijs per eenheid  [€    ] │
│  BTW percentage         [▾ 9%] │
│                                 │
│  ─── Verwerking & Opslag ───── │  ← sectie divider
│  Yield percentage       [100%] │
│  Opslag type            [▾   ] │
│  Opslag locatie         [    ] │
│                                 │
│  [Annuleren]        [Aanmaken] │  ← footer buttons
└─────────────────────────────────┘
```

## Wijzigingen

### 1. NieuwIngredientModal → NieuwIngredientPanel
`src/components/ingredienten/NieuwIngredientModal.tsx` herschrijven:
- `NestoModal` → `NestoPanel` (dezelfde API als IngredientDetailPanel)
- Panel title: "Ingrediënt · Nieuw"
- Content in 3 secties met dividers (`border-t border-border/50 pt-4 mt-4`):
  - **Basis**: naam, categorie, eenheid
  - **Prijs & BTW**: kostprijs, btw percentage (met sectie label)
  - **Verwerking & Opslag**: yield, opslag type, opslag locatie (met sectie label)
- Footer met Annuleren + Aanmaken buttons (rechts uitgelijnd)
- Alle logica (state, reset, handleSave) blijft identiek

### 2. Ingredienten pagina
`src/pages/Ingredienten.tsx`:
- Import aanpassen naar `NieuwIngredientPanel`
- Props blijven gelijk (`open`, `onOpenChange`, `onCreated`)

## Bestanden

| Bestand | Actie |
|---|---|
| `src/components/ingredienten/NieuwIngredientModal.tsx` | Herschrijven → Panel met secties |
| `src/pages/Ingredienten.tsx` | Wijzigen — import update |

