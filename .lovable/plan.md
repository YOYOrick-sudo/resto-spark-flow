

# BTW Percentage toevoegen aan Ingrediënten

## Overzicht

BTW-veld toevoegen aan de database en drie UI-locaties: aanmaak modal, algemeen tab, en kostprijs tab met prijsberekening.

## Wijzigingen

### 1. Database migratie
```sql
ALTER TABLE public.ingredienten ADD COLUMN IF NOT EXISTS btw_percentage DECIMAL(4,2) DEFAULT 9.00;
```

### 2. TypeScript type updaten
`src/hooks/useIngredienten.ts` — `IngredientRow` interface:
- Toevoegen: `btw_percentage: number;`

### 3. NieuwIngredientModal
`src/components/ingredienten/NieuwIngredientModal.tsx`:
- State `btwPercentage` met default `"9"` toevoegen
- Na het kostprijs veld: NestoSelect met opties `9%`, `21%`, `0%`
- Bij opslaan: `btw_percentage: Number(btwPercentage)` meesturen
- Reset functie updaten

### 4. CreateIngredientInput updaten
`src/hooks/useIngredientMutations.ts`:
- `btw_percentage?: number` aan interface toevoegen
- In insert: `btw_percentage: input.btw_percentage ?? 9` meesturen

### 5. AlgemeenTab — BTW dropdown
`src/components/ingredienten/tabs/AlgemeenTab.tsx`:
- State `btwPercentage` toevoegen, sync met ingredient
- NestoSelect na yield percentage met opties `9%`, `21%`, `0%`
- `hasChanges` check updaten
- `handleSave` updaten met `btw_percentage`

### 6. KostprijsTab — BTW berekening
`src/components/ingredienten/tabs/KostprijsTab.tsx`:
- Na de hoofdprijs sectie, nieuw info-block toevoegen:
  - Prijs excl. BTW: `€{kostprijs}`
  - BTW ({btw_percentage}%): `€{kostprijs * btw_percentage / 100}`
  - Prijs incl. BTW: `€{kostprijs * (1 + btw_percentage / 100)}`
- Alleen tonen als kostprijs niet null is

## Bestanden

| Bestand | Actie |
|---|---|
| Database migratie | Nieuw |
| `src/hooks/useIngredienten.ts` | Wijzigen — type |
| `src/hooks/useIngredientMutations.ts` | Wijzigen — interface + insert |
| `src/components/ingredienten/NieuwIngredientModal.tsx` | Wijzigen — BTW dropdown |
| `src/components/ingredienten/tabs/AlgemeenTab.tsx` | Wijzigen — BTW dropdown |
| `src/components/ingredienten/tabs/KostprijsTab.tsx` | Wijzigen — BTW berekening |

