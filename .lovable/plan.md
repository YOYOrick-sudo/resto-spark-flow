
# Fix: Widget "Volgende" knop niet klikbaar

## Oorzaak

De booking widget gebruikt een "Smart Landing Page" waarbij de selector-dropdown (datum, gasten, tijd) **standaard gesloten** is (`selectorOpen = false`). Dit zorgt voor twee problemen:

1. De gasten +/- knoppen zitten verstopt in de gesloten selector — de gebruiker kan ze niet bedienen
2. De tijdsloten zijn ook onzichtbaar totdat de selector open is
3. `canGoNext` op stap 1 vereist alle drie: `selectedTicket + date + selectedSlot` — maar de gebruiker kan nooit bij datum/tijd komen zonder de selector te openen

De "Volgende" knop blijft daardoor altijd disabled.

## Oplossing

Twee kleine fixes:

### 1. Selector standaard open zetten bij eerste bezoek

In `SelectionStep.tsx`, de `useState` aanpassen:

```tsx
// Huidig
const [selectorOpen, setSelectorOpen] = useState(false);

// Nieuw
const [selectorOpen, setSelectorOpen] = useState(true);
```

De selector start nu open zodat de gebruiker meteen datum, gasten en tijd kan zien en selecteren. De bestaande logica sluit hem automatisch zodra een volledige selectie gemaakt is (`hasFullSelection` effect).

### 2. "Volgende" knop tonen als ticket-loos scenario ook werkt

De widget-config heeft één ticket ("Reservering"). Als er maar één ticket is, kan dit automatisch geselecteerd worden zodat de gebruiker niet expliciet een ticket hoeft te kiezen. Dit is een UX-verbetering: één ticket = auto-select.

In `SelectionStep.tsx`, een useEffect toevoegen die het enige ticket automatisch selecteert als er maar één is:

```tsx
// Auto-selecteer ticket als er maar één beschikbaar is
useEffect(() => {
  if (tickets.length === 1 && !data.selectedTicket) {
    setSelectedTicket(tickets[0]);
  }
}, [tickets, data.selectedTicket, setSelectedTicket]);
```

Dit lost het "Volgende" knop probleem op: zodra de gebruiker een datum en tijdslot selecteert, en er is maar één ticket, is `canGoNext` automatisch `true`.

---

## Bestanden

- **`src/components/booking/SelectionStep.tsx`**:
  - `useState(false)` → `useState(true)` voor `selectorOpen`
  - Auto-select useEffect voor het enige ticket

Geen database, geen edge functions, alleen twee kleine UI-fixes.
