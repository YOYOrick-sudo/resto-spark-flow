
# Fase 4.5B — Test Resultaten & Fix Plan

## Test Resultaten

### Wat werkt correct
- Database: `table_group_id` kolom op `reservations` is aangemaakt
- Database: `assign_best_table` RPC bestaat met correcte signature en scoring logica
- Database: `move_reservation_table` RPC is uitgebreid met NULL-support en verbreede status check
- Hook: `useAssignTable` is correct geimplementeerd (preview/commit modes, cache invalidatie)
- Hook: `useMoveTable` ondersteunt NULL (unassign)
- Detail Panel: Toont "Geen tafel toegewezen" warning met "Automatisch toewijzen" en "Handmatig kiezen" knoppen
- Detail Panel: Toont "Wijzig tafel" en "Verwijder toewijzing" bij assigned reserveringen
- ReservationActions: "Tafel wijzigen" beschikbaar bij `draft`, `option`, `pending_payment`, `confirmed` (niet alleen `seated`)
- CreateReservationSheet: "Automatisch toewijzen" dropdown optie met Sparkles icoon, preview suggestie, submit flow
- WalkInSheet: Shift detectie gefixt (tijdgebaseerd + days_of_week), auto-assign na aanmaken
- Grid View: `UnassignedBadgeList` component is gebouwd met collapsible, kaartjes en "Wijs toe" knoppen
- List View: Oranje "Niet toegewezen" knop met tooltip

### Gevonden bugs (3 stuks)

**Bug 1: List View `onAssignTable` prop niet doorgegeven**
In `src/pages/Reserveringen.tsx` regel 164-169 wordt `ReservationListView` aangeroepen zonder `onAssignTable` prop. De component accepteert deze prop en het klikbare "Niet toegewezen" label roept `onAssignTable?.(reservation)` aan, maar zonder de prop doet de klik niets.

**Fix:** Voeg een `handleAssignTable` callback toe in `Reserveringen.tsx` die `useAssignTable` aanroept, en geef deze door als `onAssignTable` prop.

**Bug 2: Grid View `UnassignedBadgeList` niet zichtbaar**
De `UnassignedBadgeList` rendert boven de areas in de grid, maar is visueel niet zichtbaar ondanks dat er een unassigned reservering bestaat. De component zit achter de grid's `border border-border rounded-2xl overflow-hidden` wrapper. De badge-list rendert mogelijk correct maar valt buiten het zichtbare scrollgebied of wordt verborgen door de dubbele `overflow-hidden` wrapper (zowel op de parent als op de grid container).

**Fix:** Controleer de nesting van overflow containers en zorg dat de badge-list altijd zichtbaar is boven de timeline.

**Bug 3: `useAssignTable` hook wordt dubbel geinstantieerd in Grid View**
De `UnassignedBadgeList` component maakt een eigen `useAssignTable()` instantie aan (regel 275), terwijl de parent `ReservationGridView` dit niet doet. Dit is functioneel correct maar niet ideaal — de toast in `useAssignTable.onSuccess` toont bij elke toewijzing, ook vanuit de badge-list. Dit is eigenlijk gewenst gedrag.

---

## Stappen

### Stap 1: Fix `onAssignTable` in Reserveringen.tsx
- Importeer `useAssignTable` in `Reserveringen.tsx`
- Maak een `handleAssignTable` callback die de assign RPC aanroept met commit mode
- Geef `onAssignTable={handleAssignTable}` door aan `ReservationListView`

### Stap 2: Fix UnassignedBadgeList zichtbaarheid
- Debug de overflow/z-index nesting in ReservationGridView
- De `UnassignedBadgeList` zit binnen `div.min-w-max.relative` (regel 540) wat correct is
- Controleer of de `border border-border rounded-2xl overflow-hidden` wrapper in Reserveringen.tsx (regel 162) het probleem veroorzaakt
- Mogelijk moet de badge-list buiten de scrollable grid geplaatst worden, of moet de `overflow-hidden` wrapper aangepast worden

### Stap 3: Verify fix werkt
- Test "Niet toegewezen" klik in List View
- Test "Wijs toe" klik in Grid View badge-list
- Verify toast feedback

---

## Technische details

### Bestanden die gewijzigd worden:
- `src/pages/Reserveringen.tsx` — onAssignTable prop toevoegen + useAssignTable import
- `src/components/reserveringen/ReservationGridView.tsx` — mogelijk badge-list positionering aanpassen
