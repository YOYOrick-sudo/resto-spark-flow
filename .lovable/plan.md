

# Sessie D1 — ShiftWizard Context Refactor + Live Tickets

## Samenvatting

De ShiftWizard wordt omgebouwd van mock-data naar live database-tickets. AreasStep blijft als placeholder bestaan (wordt pas in D2 vervangen door ConfigStep). Alle `MOCK_TICKETS` referenties verdwijnen.

---

## Bestanden

### Nieuw

| Bestand | Beschrijving |
|---|---|
| `src/hooks/useShiftTickets.ts` | Query hook: shift_tickets voor een shift laden met ticket metadata |

### Wijzigen

| Bestand | Wijziging |
|---|---|
| `src/lib/queryKeys.ts` | `shiftTickets` key toevoegen |
| `src/components/settings/shifts/ShiftWizard/ShiftWizardContext.tsx` | MOCK_TICKETS verwijderen, `ShiftTicketOverrides` + `ticketOverrides` state, `areasByTicket` verwijderen, `initialShiftTickets` prop op provider |
| `src/components/settings/shifts/ShiftWizard/ShiftWizard.tsx` | `useShiftTickets` query, loading guard, `initialShiftTickets` prop doorsturen |
| `src/components/settings/shifts/ShiftWizard/steps/TicketsStep.tsx` | Volledig herschreven: live tickets via `useTickets`, quick-create via `TicketModal`, inline duration/pricing |
| `src/components/settings/shifts/ShiftWizard/steps/AreasStep.tsx` | Placeholder: rendert tekst "Configuratie per ticket wordt ingesteld in de volgende update." Geen context-methods meer aanroepen. |
| `src/components/settings/shifts/ShiftWizard/steps/ReviewStep.tsx` | MOCK_TICKETS verwijderen, ticketnamen uit `useTickets` data |
| `src/components/settings/shifts/ShiftWizard/ShiftWizardSidebar.tsx` | Stap 3 label "Gebieden" wordt "Configuratie", icon wordt Settings2 |
| `src/components/settings/shifts/ShiftWizard/index.ts` | `MOCK_TICKETS` en `MockTicket` exports verwijderen |

---

## Technische details

### 1. queryKeys.ts

Toevoegen na de bestaande `shiftTicketConfig` key:

```typescript
shiftTickets: (shiftId: string) => ['shift-tickets', shiftId] as const,
```

### 2. useShiftTickets hook

```typescript
useShiftTickets(shiftId: string | undefined)
  enabled: !!shiftId
  queryKey: queryKeys.shiftTickets(shiftId!)
  select: '*, tickets(name, display_title, duration_minutes, buffer_minutes, 
           min_party_size, max_party_size, color, is_default, short_description,
           policy_set_id, status)'
  filter: .eq('shift_id', shiftId).eq('is_active', true)
  returns: ShiftTicket[] met geneste ticket metadata
```

### 3. ShiftWizardContext refactor

**Verwijderen:**
- `MockTicket` interface en `MOCK_TICKETS` array
- `TicketAreasConfig` interface
- `areasByTicket` state
- `setAreasForTicket`, `toggleAreaForTicket`, `setAllAreasForTicket` methods
- `createDefaultAreasConfig` helper

**Toevoegen:**

```typescript
interface ShiftTicketOverrides {
  ticketId: string;
  overrideDuration: number | null;
  overrideBuffer: number | null;
  overrideMinParty: number | null;
  overrideMaxParty: number | null;
  pacingLimit: number | null;
  seatingLimitGuests: number | null;
  seatingLimitReservations: number | null;
  ignorePacing: boolean;
  areas: string[] | null;
  showAreaName: boolean;
  squeezeEnabled: boolean;
  squeezeDuration: number | null;
  squeezeGap: number | null;
  squeezeFixedEndTime: string | null;
  squeezeLimit: number | null;
  showEndTime: boolean;
  waitlistEnabled: boolean;
}
```

Nieuwe state: `ticketOverrides: Record<string, ShiftTicketOverrides>`

Nieuwe methods:
- `setTicketOverride(ticketId, field, value)`: update enkel override veld
- `resetTicketOverride(ticketId, field)`: zet veld naar null
- `getEffectiveValue(ticketId, field, ticketDefault)`: override waarde of fallback

Nieuwe provider prop: `initialShiftTickets?: ShiftTicket[]`

Bij initialisatie met `initialShiftTickets`: populate `selectedTickets` (ticket IDs) en `ticketOverrides` (map override velden van elk ShiftTicket naar de interface).

`canProceed` voor stap 1 (Tickets): `selectedTickets.length > 0`

`stepSummaries`:
- Stap 1: `"{n} tickets"` (getal)
- Stap 2: `"{n} aangepast"` of `"Standaard"` (telt ticketOverrides met niet-null velden)
- Stap 3: `"Standaard"` (D2 vult dit aan)

`TOTAL_STEPS` blijft 5.

### 4. ShiftWizard.tsx — loading guard

```typescript
function ShiftWizard({ open, onOpenChange, locationId, editingShift }) {
  const { data: existingShiftTickets, isLoading: isLoadingTickets } = 
    useShiftTickets(editingShift?.id);
  
  const isReady = !editingShift || !isLoadingTickets;

  return (
    <Dialog ...>
      <DialogContent ...>
        {isReady ? (
          <ShiftWizardProvider 
            locationId={locationId} 
            editingShift={editingShift}
            initialShiftTickets={existingShiftTickets ?? []}
          >
            <ShiftWizardContent onClose={handleClose} />
          </ShiftWizardProvider>
        ) : (
          // Compact loading skeleton (sidebar + content area)
          <div className="flex flex-col">
            <div className="px-6 py-4 border-b"><Skeleton className="h-6 w-40" /></div>
            <div className="flex flex-1 p-5">
              <Skeleton className="w-48 h-64" />
              <div className="flex-1 p-5 space-y-4">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Dit voorkomt de race condition: de context initialiseert pas als de data er is.

### 5. TicketsStep — live data

Data: `useTickets(locationId)` — toont alleen tickets met `status === 'active'` uit `visibleTickets`.

Layout per ticket:

```text
+------------------------------------------+
|  [x] Reguliere tafel            90 min   |
|      Standaard reservering      Gratis   |
+------------------------------------------+
|  [ ] Kerstdiner                120 min   |
|      5-gangen menu         EUR 85 p.p.   |
+------------------------------------------+
|  + Nieuw ticket aanmaken                 |
+------------------------------------------+
|  (!) Shift is niet boekbaar zonder ...   |
+------------------------------------------+
```

Per ticket-card:
- Checkbox links (toggle via `toggleTicket`)
- Ticketnaam + `is_default` badge (NestoBadge variant="outline")
- `duration_minutes` rechts ("90 min")
- `short_description` ondertitel (line-clamp-1)
- Pricing badge rechts-onder (afgeleid van policyInfo, zelfde logica als TicketCard)
- Kleur-dot (4px rond met `ticket.color`)

Quick-create: "Nieuw ticket aanmaken" knop opent bestaande `TicketModal` als geneste dialog. Na opslaan wordt `useTickets` geinvalideerd en het nieuwe ticket automatisch geselecteerd via `onSuccess` callback die `toggleTicket` aanroept met het nieuwe ticket ID.

Warning: als `selectedTickets.length === 0`: oranje `InfoAlert` "Shift is niet boekbaar zonder tickets".

### 6. AreasStep — placeholder

Het bestand blijft bestaan maar wordt vervangen door een simpele placeholder:

```typescript
export function AreasStep() {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Configuratie per ticket</h3>
      <p className="text-sm text-muted-foreground">
        Hier stel je per ticket de tafeltijd, groepsgrootte, pacing, gebieden 
        en squeeze-regels in. Deze stap wordt in de volgende update beschikbaar.
      </p>
    </div>
  );
}
```

Geen context-methods aanroepen. Geen imports van verwijderde state.

### 7. ReviewStep — echte data

- Verwijder `MOCK_TICKETS` import
- Verwijder `areasByTicket` uit context destructuring
- Haal ticketnamen op via `useTickets(locationId)`: lookup `selectedTickets` IDs in `visibleTickets` data
- Tickets sectie: geselecteerde ticketnamen als komma-gescheiden lijst
- Gebieden sectie: "Standaard" (placeholder tot D2)
- Capaciteit sectie: "Standaard" (ongewijzigd)

De `locationId` wordt uit de wizard context gehaald (is al beschikbaar als `useShiftWizard().locationId`).

### 8. ShiftWizardSidebar — labels

Stap 2 wijzigt:
- Label: "Gebieden" wordt "Configuratie"
- Icon: `MapPin` wordt `Settings2` (van lucide-react)

Import `Settings2` toevoegen, `MapPin` import verwijderen.

### 9. index.ts — exports opschonen

Verwijderen:
- `MOCK_TICKETS`
- `MockTicket`
- `type MockTicket`

Behouden:
- `ShiftWizard`
- `ShiftWizardProvider`
- `useShiftWizard`

---

## Volgorde van implementatie

1. `queryKeys.ts` — shiftTickets key
2. `useShiftTickets.ts` — nieuwe hook
3. `ShiftWizardContext.tsx` — volledige refactor
4. `ShiftWizard.tsx` — loading guard + initialShiftTickets
5. `TicketsStep.tsx` — live tickets + quick-create
6. `AreasStep.tsx` — placeholder content
7. `ReviewStep.tsx` — echte ticketnamen
8. `ShiftWizardSidebar.tsx` — labels + icons
9. `index.ts` — exports opschonen

---

## Validatie-checklist

- [ ] Stap 2 toont echte tickets uit database (geen mocks)
- [ ] Alleen tickets met `status === 'active'` getoond
- [ ] Quick-create opent TicketModal, na opslaan is ticket zichtbaar en geselecteerd
- [ ] Warning bij 0 geselecteerde tickets
- [ ] Bewerken van bestaande shift laadt huidige ticket-koppelingen
- [ ] Wizard toont loading skeleton tot shift_tickets geladen zijn (edit mode)
- [ ] Nieuwe shift: wizard opent direct zonder loading
- [ ] AreasStep rendert placeholder tekst zonder errors
- [ ] Review stap toont echte ticketnamen
- [ ] Sidebar label "Configuratie" i.p.v. "Gebieden", icon Settings2
- [ ] Geen `MOCK_TICKETS` referenties meer in codebase
- [ ] `index.ts` exporteert geen `MOCK_TICKETS` of `MockTicket` meer
