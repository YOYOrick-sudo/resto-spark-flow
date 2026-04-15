

# Fix: Snelle Prep titel bevat methode type

## Probleem

In `useSnellePrep.ts` regel 26 wordt de titel samengesteld als `"Slagroom aanvullen"`. Exact hetzelfde probleem als eerder gefixt in `MepQuickAdd.tsx` — de methode wordt in de titel gezet waardoor `MepTaskRow` het niet visueel kan scheiden.

## Fix

| Bestand | Regel | Oud | Nieuw |
|---------|-------|-----|-------|
| `src/hooks/useSnellePrep.ts` | 26 | `const titel = \`${input.ingredientNaam} ${input.handeling.toLowerCase()}\`` | `const titel = input.ingredientNaam` |

De `handeling` wordt al apart opgeslagen via `methode_id` op de MEP taak, en `MepTaskRow` toont het methode-type visueel als een aparte uppercase label.

Geen andere wijzigingen nodig.

