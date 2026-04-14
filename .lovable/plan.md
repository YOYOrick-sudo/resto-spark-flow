

# SPRINT UX-1c: Ingrediënten Wizard — Definitief Plan

## Issues verwerkt

| Issue | Oplossing |
|---|---|
| 1 — Route conflict | Geen conflict: `/voorraad` is een exacte route (regel 155 App.tsx), geen `:id` catch-all. `/voorraad/nieuw` wordt ervoor geplaatst voor de zekerheid. |
| 2 — Na opslaan | Simpele redirect naar `/voorraad` + success toast. Geen auto-open detail panel. |
| 3 — Allergenen update | Gebruik `upsertAllergeenStatus` (die al bestaat en werkt). Een aparte `updateAllergeenStatus` maken is overbodig — upsert op bestaande records doet effectief een update. |
| 4 — Quick-create documentatie | Comment toevoegen bovenaan `NieuwIngredientModal.tsx`. |

## Nieuwe bestanden

| Bestand | Doel |
|---|---|
| `src/pages/IngredientenNieuw.tsx` | Wizard wrapper, 4 stappen, try/catch onComplete, redirect naar `/voorraad` |
| `src/components/ingredienten/wizard/IngredientStapBasis.tsx` | Naam, categorie, eenheid, opslag type |
| `src/components/ingredienten/wizard/IngredientStapVoorraadPrijs.tsx` | Kostprijs, min voorraad, yield %, leverancier — alle optioneel |
| `src/components/ingredienten/wizard/IngredientStapAllergenen.tsx` | 14 EU allergenen grid, dropdown per allergeen (bevat/kan_bevatten/geen/onbekend), default onbekend |
| `src/components/ingredienten/wizard/IngredientStapBevestigen.tsx` | Samenvatting + allergenen pills + oranje waarschuwing als alle "onbekend" |

## Gewijzigde bestanden

| Bestand | Wijziging |
|---|---|
| `src/App.tsx` | Route `/voorraad/nieuw` toevoegen vóór `/voorraad` |
| `src/pages/Ingredienten.tsx` | "+ Nieuw ingrediënt" → `navigate("/voorraad/nieuw")`, verwijder `NieuwIngredientModal` import/state. Allergenen kolom: oranje "Onbekend" pill als alle statuses onbekend, "—" als alle geen. |
| `src/components/ingredienten/NieuwIngredientModal.tsx` | Quick-create comment toevoegen bovenaan |

## Wizard onComplete

```tsx
async function onComplete(formData) {
  try {
    // createIngredient adds location_id + creates 14 allergen records (status "onbekend")
    const id = await createIngredient.mutateAsync({
      naam, categorie, eenheid, yield_percentage,
      opslag_type, kostprijs, btw_percentage,
    });

    // Update alleen allergenen die afwijken van "onbekend"
    const changed = (formData.allergenen?.items ?? []).filter(a => a.status !== "onbekend");
    if (changed.length > 0) {
      await Promise.all(changed.map(a =>
        upsertAllergeenStatus.mutateAsync({
          ingredientId: id, allergeenId: a.allergeenId, status: a.status,
        })
      ));
    }

    nestoToast.success(`Ingrediënt "${formData.basis.naam}" aangemaakt!`);
    navigate("/voorraad");
  } catch (error) {
    nestoToast.error("Er ging iets mis. Probeer het opnieuw.");
  }
}
```

## Geen migratie nodig

Alle velden en tabellen bestaan al.

**Totaal: 5 nieuwe bestanden, 3 gewijzigde bestanden, 0 verwijderd, 0 migraties.**

