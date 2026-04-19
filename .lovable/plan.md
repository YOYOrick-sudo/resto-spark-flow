
De gebruiker vraagt een grote feature: multi-leverancier support voor ingrediënten met duplicate-naam detectie en keuze-dialog. Ik moet eerst goed onderzoeken wat er bestaat voordat ik plan.

Laat me onderzoeken:
1. Huidige `ingredienten` schema + `leveranciers_artikelen` schema + constraints
2. Bestaande factuur-flow (`useFactuurMutations`)
3. Bestaande forms (`NieuwIngredientInlineForm`, `BulkCreateIngredientsDialog`)
4. Bestaande IngredientDetail pagina (let op: pad in opdracht is `/src/pages/IngredientDetail.tsx` maar in zichtbare files is het `IngredientenDetail.tsx`)
5. `LeveranciersTab` is al multi-leverancier-aware (zag het al in context met "Goedkoopste" badge!)

Ik ga eerst exploreren, daarna plan presenteren.
