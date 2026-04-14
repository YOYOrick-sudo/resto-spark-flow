

# Fix: Categorie headers — design system kleuren

## Probleem

`MepCategoryGroup.tsx` regel 52 gebruikt `bg-rose-50` voor openstaande categorieën. Dit lijkt op een error/alert en is visueel te agressief voor een normale toestand.

## Oplossing

Gebruik design system tokens in plaats van hardcoded Tailwind kleuren:

- **Openstaand** (niet alles klaar): `bg-muted/50` — dezelfde subtiele achtergrond die elders wordt gebruikt voor neutrale states. Rustig, geen alarm.
- **Alles klaar**: `bg-primary/[0.06]` — heel licht teal, consistent met hoe de primary kleur elders als achtergrond wordt gebruikt (bijv. selected states, confirmed badges).
- **Counter badge**: `pending` variant bij openstaand (oranje), `success` bij klaar (groen) — blijft zoals het is.

## Wijziging

**`src/components/mep/MepCategoryGroup.tsx`** — regel 52:

```typescript
// Was:
allDone ? "bg-green-50 dark:bg-green-950/30" : "bg-rose-50 dark:bg-rose-950/30"

// Wordt:
allDone ? "bg-primary/[0.06]" : "bg-muted/50"
```

Eén regel, één bestand. Dark mode werkt automatisch mee omdat `bg-muted` en `bg-primary` semantic tokens zijn.

