

# Design System Fixes Doorvoeren naar Reserveringen

De PanelDemo is nu conform het design system. Dezelfde patronen moeten nu worden toegepast op de productiecomponenten van reserveringen.

## Overzicht afwijkingen

### 1. ReservationDetailPanel -- Status badge (regels 44-57)
**Huidig:** Raw `<span>` met `rounded-full`
**Moet zijn:** `NestoBadge` component (gebruikt `rounded-control` / 6px)

De status badge wordt nu handmatig opgebouwd met STATUS_CONFIG kleuren. Dit kan een NestoBadge worden, maar de STATUS_CONFIG mapping moet behouden blijven voor de dynamische kleuren. Oplossing: de `rounded-full` vervangen door `rounded-control` en de rest behouden, aangezien NestoBadge's vaste variant-kleuren niet matchen met de dynamische STATUS_CONFIG kleuren.

### 2. ReservationBadges -- Alle 11 conditionele badges (regel 103)
**Huidig:** Raw `<span>` met `rounded-full`
**Moet zijn:** `rounded-control` (6px) conform NestoBadge standaard

Zelfde situatie: dynamische kleuren per badge type, dus NestoBadge component past niet direct. We corrigeren de border-radius van `rounded-full` naar `rounded-control`.

### 3. ReservationActions -- Alle actie-buttons (regels 165-196)
**Huidig:** Raw `<button>` elementen
**Moet zijn:** `NestoButton` component

Dit zorgt voor:
- Primary buttons krijgen `rounded-button-primary` (16px) i.p.v. `rounded-button` (8px)
- Consistente focus-visible, disabled, en hover states
- Loading state support via `isLoading` prop

### 4. CreateReservationSheet -- "Aanmaken & doorgaan" button (regel 286-292)
**Huidig:** Raw `<button>` met `rounded-button`
**Moet zijn:** `NestoButton variant="primary"` (krijgt `rounded-button-primary` / 16px)

---

## Wijzigingen per bestand

### Bestand 1: `src/components/reservations/ReservationDetailPanel.tsx`
- Import toevoegen: geen nieuwe imports nodig
- Regel 45: `rounded-full` wijzigen naar `rounded-control`

### Bestand 2: `src/components/reservations/ReservationBadges.tsx`
- Regel 103: `rounded-full` wijzigen naar `rounded-control`

### Bestand 3: `src/components/reservations/ReservationActions.tsx`
- Import toevoegen: `NestoButton` uit `@/components/polar/NestoButton`
- Disabled buttons (regels 165-175): vervangen door `NestoButton variant="outline" size="sm"` met `disabled` prop
- Primary action buttons (regels 180-196): vervangen door `NestoButton` met juiste variant:
  - `variant === 'primary'` wordt `NestoButton variant="primary" size="sm"`
  - `destructive` wordt `NestoButton variant="danger" size="sm"`
  - Default wordt `NestoButton variant="outline" size="sm"`
- Alle buttons krijgen `leftIcon={<Icon />}` i.p.v. inline icon

### Bestand 4: `src/components/reservations/CreateReservationSheet.tsx`
- Import toevoegen: `NestoButton` uit `@/components/polar/NestoButton`
- Regel 286-292: "Aanmaken & doorgaan" raw button vervangen door `NestoButton variant="primary"`
- Footer buttons (rond regel 430+): Navigatie-buttons ("Vorige", "Volgende", "Reservering aanmaken") vervangen door NestoButton met juiste varianten

---

## Wat niet wijzigt
- De structuur en logica van alle componenten blijft identiek
- STATUS_CONFIG mapping en dynamische kleuren blijven behouden
- Alleen styling-elementen worden gecorrigeerd naar design system standaarden

