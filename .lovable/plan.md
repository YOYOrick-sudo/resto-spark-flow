

# Selector standaard gesloten bij openen widget

## Probleem

De "Je selectie" selector (datum, gasten, tijd) opent standaard in uitgeklapte staat, waardoor de ticket-kaarten niet direct zichtbaar zijn. De gast moet eerst scrollen om de tickets te zien.

## Oplossing

In `src/components/booking/SelectionStep.tsx` de initialisatie van `selectorOpen` wijzigen van `true` naar `false`. De selector klapt automatisch open zodra de gast erop klikt, en klapt weer dicht zodra een volledige selectie is gemaakt (dat gedrag blijft behouden).

## Technisch

**Bestand:** `src/components/booking/SelectionStep.tsx`

**Wijziging:** Regel waar `useState(true)` staat voor `selectorOpen` wijzigen naar `useState(false)`.

```tsx
// Was:
const [selectorOpen, setSelectorOpen] = useState(true);

// Wordt:
const [selectorOpen, setSelectorOpen] = useState(false);
```

Geen andere bestanden, geen database, geen dependencies.

