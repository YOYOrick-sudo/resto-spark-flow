

# Fix: "Pas toe" sortering werkt niet

## Probleem

De `sortedDayTasks` vanuit `MepTaken.tsx` worden correct gesorteerd op planvolgorde, maar `MepPriorityView` sorteert ze intern opnieuw op `calculatePriorityScore` (regel 46-48). Dat overschrijft de planvolgorde volledig.

## Oplossing

Wanneer er een `planOrder` actief is, moet `MepPriorityView` de aangeleverde volgorde respecteren in plaats van te her-sorteren.

## Wijzigingen

### `src/components/mep/MepPriorityView.tsx`
- Voeg een `hasPlanOrder?: boolean` prop toe
- Wanneer `hasPlanOrder` is `true`: sla de `calculatePriorityScore` sorting over en gebruik de volgorde zoals aangeleverd via `dayTasks`
- Overige logica (overtijd/voltooid splits) blijft ongewijzigd

### `src/pages/MepTaken.tsx`
- Geef `hasPlanOrder={!!planOrder}` door aan `MepPriorityView`

Twee kleine wijzigingen, geen nieuwe bestanden.

