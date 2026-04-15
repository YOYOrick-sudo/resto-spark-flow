

# Fix: Eenheden en ingrediënt-breakdown in personeelsmaaltijd modal

## Wijzigingen

### 1. `src/hooks/useHalffabricaatSearch.ts`
Voeg `porties` toe aan `HalffabricaatSearchResult` interface (wordt al opgehaald in query maar mist in type).

### 2. `src/components/mep/PersoneelsmaaltijdModal.tsx`

**MealItem interface uitbreiden:**
```typescript
interface BreakdownIngredient {
  naam: string;
  eenheid: string;
  hoeveelheidPerPortie: number; // recept_ingredienten.hoeveelheid / recept.porties
}

// Toevoegen aan MealItem:
breakdown?: BreakdownIngredient[];
breakdownLoading?: boolean;
```

**`addHalffabricaat` wordt async:**
1. Voeg het item direct toe met `breakdownLoading: true`
2. Fetch `recept_ingredienten` met `ingredient:ingredienten(naam, eenheid)` voor het geselecteerde `recept_id`
3. Bereken `hoeveelheidPerPortie = ri.hoeveelheid / hf.porties`
4. Update het item met `breakdown: [...]` en `breakdownLoading: false`

Zo ziet de kok direct het item verschijnen en krijgt een subtiele skeleton-lijn te zien terwijl de ingrediënten laden.

**Breakdown render onder elk halffabricaat-item:**
```tsx
{item.type === "halffabricaat" && item.breakdownLoading && (
  <div className="pl-6 pb-1">
    <Skeleton className="h-3 w-48" />
  </div>
)}
{item.type === "halffabricaat" && item.breakdown && item.breakdown.length > 0 && (
  <div className="pl-6 pb-1 text-xs text-muted-foreground">
    ↳ {item.breakdown.slice(0, 3).map((b, i) => (
      <span key={i}>
        {i > 0 && " · "}
        {(b.hoeveelheidPerPortie * item.hoeveelheid).toFixed(2)} {b.eenheid} {b.naam}
      </span>
    ))}
    {item.breakdown.length > 3 && ` · +${item.breakdown.length - 3} meer`}
  </div>
)}
```

Breakdown herberekent visueel bij hoeveelheid-wijziging (render-math). Submit logica ongewijzigd.

## Samenvatting

| Bestand | Actie |
|---------|-------|
| `src/hooks/useHalffabricaatSearch.ts` | `porties: number` toevoegen aan interface |
| `src/components/mep/PersoneelsmaaltijdModal.tsx` | Breakdown fetch + loading skeleton + breakdown render |

Geen migraties. Geen nieuwe bestanden.

