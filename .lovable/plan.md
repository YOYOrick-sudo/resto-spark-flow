
# Selector standaard gesloten bij openen widget

## Wat verandert

In `src/components/booking/SelectionStep.tsx` wordt de initial state van `selectorOpen` veranderd van `true` naar `false`.

De selector toont dan bij het openen de compacte samenvatting ("Vr 20 feb - 2 gasten - --:--") met een chevron om open te klappen. De gast klikt erop om datum, gasten en tijd te kiezen.

## Technisch

**Bestand:** `src/components/booking/SelectionStep.tsx`

**Regel 21:**
```typescript
// Was:
const [selectorOpen, setSelectorOpen] = useState(true);

// Wordt:
const [selectorOpen, setSelectorOpen] = useState(false);
```

Dat is alles -- 1 karakter wijziging.
