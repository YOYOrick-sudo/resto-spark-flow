
# Walk-in & +Reservering Buttons naar NestoButton

## Probleem
De twee action buttons bovenaan de reserveringenpagina (`Reserveringen.tsx`, regels 107-121) zijn nog raw `<button>` elementen met handmatige styling. Ze moeten `NestoButton` worden.

## Wat er ook speelt
Er is een console warning: "Function components cannot be given refs" in `CreateReservationSheet`. Dit komt doordat een `ref` wordt doorgegeven aan een `Select` component. Dit moet ook opgelost worden.

## Wijzigingen

### Bestand: `src/pages/Reserveringen.tsx`

**1. Import NestoButton toevoegen (regel 1-gebied)**
Toevoegen: `import { NestoButton } from '@/components/polar/NestoButton'`

**2. Walk-in button (regels 107-114)**
Van:
```tsx
<button
  onClick={() => setWalkInSheetOpen(true)}
  className="inline-flex items-center gap-2 px-4 py-2 rounded-button border border-input bg-background text-sm font-medium hover:bg-secondary transition-colors"
>
  <Footprints className="h-4 w-4" />
  Walk-in
</button>
```
Naar:
```tsx
<NestoButton
  variant="outline"
  onClick={() => setWalkInSheetOpen(true)}
  leftIcon={<Footprints className="h-4 w-4" />}
>
  Walk-in
</NestoButton>
```

**3. +Reservering button (regels 116-123)**
Van:
```tsx
<button
  onClick={() => setCreateSheetOpen(true)}
  className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
>
  <Plus className="h-4 w-4" />
  Reservering
</button>
```
Naar:
```tsx
<NestoButton
  variant="primary"
  onClick={() => setCreateSheetOpen(true)}
  leftIcon={<Plus className="h-4 w-4" />}
>
  Reservering
</NestoButton>
```

Dit geeft de primary button automatisch `rounded-button-primary` (16px) en de outline button `rounded-button` (8px), conform het design system.

## Resultaat
- Walk-in button: outline variant met correcte 8px radius, focus-visible state, en disabled support
- +Reservering button: primary variant met correcte 16px radius
- Beide buttons krijgen automatisch de juiste hover, focus en transition states van NestoButton
