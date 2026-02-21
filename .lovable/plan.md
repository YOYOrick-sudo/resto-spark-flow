

# Widget Smart Ticket Selection

## Drie wijzigingen

### 1. Tijdslots tonen zonder ticket-filter

**Probleem**: `flatSlots` filtert op `data.selectedTicket`, waardoor als er geen ticket is geselecteerd, er mogelijk geen slots getoond worden (of juist alle slots -- afhankelijk van de logica). De edge function stuurt slots per ticket terug. Als geen ticket geselecteerd is, moeten alle slots zichtbaar zijn (gededupliceerd op tijd).

**Oplossing**: De huidige filter logica in `flatSlots` werkt al correct -- als geen ticket is geselecteerd worden alle slots getoond. Het probleem zit waarschijnlijker in dat de availability API geen slots teruggeeft. We moeten:
- Console-loggen of de API daadwerkelijk slots teruggeeft
- Controleren dat `loadAvailability` correct wordt aangeroepen bij mount

**Bestand**: `src/components/booking/SelectionStep.tsx`

### 2. Tickets sorteren op beschikbaarheid

**Probleem**: Tickets worden in vaste volgorde getoond, ongeacht beschikbaarheid.

**Oplossing**: Sorteer de tickets-array zodat beschikbare tickets eerst komen, onbeschikbare onderaan. Gebruik de bestaande `isTicketAvailable()` functie.

```tsx
// Sorteer tickets: beschikbaar eerst, onbeschikbaar onderaan
const sortedTickets = useMemo(() => {
  return [...tickets].sort((a, b) => {
    const aAvail = isTicketAvailable(a) ? 0 : 1;
    const bAvail = isTicketAvailable(b) ? 0 : 1;
    return aAvail - bAvail;
  });
}, [tickets, isTicketAvailable]);
```

**Bestand**: `src/components/booking/SelectionStep.tsx`

### 3. Auto-selectie bij ticket klik

**Probleem**: Als je op een ticket klikt zonder datum/tijd, gebeurt er niks behalve dat het ticket wordt geselecteerd.

**Oplossing**: Wijzig `handleTicketSelect` zodat:
1. Het ticket wordt geselecteerd
2. Als er al availability geladen is, automatisch de eerste beschikbare slot voor dat ticket wordt geselecteerd
3. Als er nog geen availability is, wacht op de availability response en selecteer dan de eerste slot
4. De selector opent kort om de selectie te tonen

```tsx
const handleTicketSelect = (ticket: TicketInfo) => {
  setSelectedTicket(ticket);
  
  // Auto-select eerste beschikbare slot voor dit ticket
  for (const shift of availableShifts) {
    for (const slot of shift.slots) {
      if (slot.ticket_id === ticket.id && slot.available) {
        setSelectedSlot(slot, shift);
        return; // Eerste match gevonden, klaar
      }
    }
  }
  
  // Geen slot gevonden: open selector zodat gast datum/gasten kan aanpassen
  setSelectorOpen(true);
};
```

**Bestand**: `src/components/booking/SelectionStep.tsx`

## Samenvatting wijzigingen

| # | Wat | Bestand |
|---|-----|---------|
| 1 | Debug: log availability response, fix filter als nodig | `SelectionStep.tsx` |
| 2 | Sorteer tickets: beschikbaar eerst | `SelectionStep.tsx` |
| 3 | Auto-selecteer eerste slot bij ticket klik | `SelectionStep.tsx` |

Alle wijzigingen zitten in een enkel bestand. Geen database of edge function wijzigingen nodig.

