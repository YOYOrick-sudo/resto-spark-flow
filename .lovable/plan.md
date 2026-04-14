

# Fix: Kostprijs null-safety in ReceptenDetail

## Probleem
`.toFixed(2)` crasht wanneer kostprijs-velden `null` zijn. En `€0.00` tonen bij ontbrekende data is misleidend.

## Wijzigingen — `src/pages/ReceptenDetail.tsx`

### 1. Berekening (regel 64-66)

**Was:**
```ts
const kostprijsPerPortie = recept && recept.porties > 0
  ? recept.totale_kostprijs / recept.porties
  : 0;
```

**Wordt:**
```ts
const kostprijsPerPortie = recept && recept.porties > 0 && recept.totale_kostprijs != null
  ? recept.totale_kostprijs / recept.porties
  : null;
```

### 2. Kostprijs card (regels 214-223)

**Was:**
```tsx
<div className="grid grid-cols-2 gap-y-1.5 text-sm">
  <span className="text-muted-foreground">Ingrediënten</span>
  <span className="text-right">€{recept.totale_ingredientkostprijs.toFixed(2)}</span>
  <span className="text-muted-foreground">Arbeid</span>
  <span className="text-right">€{recept.arbeidskostprijs.toFixed(2)}</span>
  <span className="font-semibold pt-1 border-t border-border/50">Totaal</span>
  <span className="font-semibold text-right pt-1 border-t border-border/50">€{recept.totale_kostprijs.toFixed(2)}</span>
  <span className="text-muted-foreground">Per portie</span>
  <span className="text-right font-medium text-primary">€{kostprijsPerPortie.toFixed(2)}</span>
</div>
```

**Wordt:**
```tsx
<div className="grid grid-cols-2 gap-y-1.5 text-sm">
  <span className="text-muted-foreground">Ingrediënten</span>
  <span className="text-right">
    {recept.totale_ingredientkostprijs != null
      ? `€${recept.totale_ingredientkostprijs.toFixed(2)}`
      : "—"}
  </span>
  <span className="text-muted-foreground">Arbeid</span>
  <span className="text-right">
    {recept.arbeidskostprijs != null
      ? `€${recept.arbeidskostprijs.toFixed(2)}`
      : "—"}
  </span>
  <span className="font-semibold pt-1 border-t border-border/50">Totaal</span>
  <span className="font-semibold text-right pt-1 border-t border-border/50">
    {recept.totale_kostprijs != null
      ? `€${recept.totale_kostprijs.toFixed(2)}`
      : "—"}
  </span>
  <span className="text-muted-foreground">Per portie</span>
  <span className="text-right font-medium text-primary">
    {kostprijsPerPortie != null
      ? `€${kostprijsPerPortie.toFixed(2)}`
      : "Nog niet berekend"}
  </span>
</div>
```

**Totaal: 1 bestand, 0 migraties.**

