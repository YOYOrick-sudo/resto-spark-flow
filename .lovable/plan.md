

# Sessie D2 — ConfigStep + CapacityStep + Submit Sync

## Samenvatting

De drie resterende wizard-stappen worden live gemaakt: AreasStep wordt vervangen door ConfigStep (per-ticket override panels), CapacityStep toont effectieve capaciteit, en handleSubmit schrijft shift_tickets naar de database. Een `useSyncShiftTickets` mutation in useShiftTickets.ts handelt de diff-logica af.

---

## Bestanden

### Nieuw

| Bestand | Beschrijving |
|---|---|
| `src/components/settings/shifts/ShiftWizard/steps/ConfigStep.tsx` | Per-ticket collapsible panels met alle override-velden |

### Verwijderen

| Bestand | Reden |
|---|---|
| `src/components/settings/shifts/ShiftWizard/steps/AreasStep.tsx` | Vervangen door ConfigStep.tsx |

### Wijzigen

| Bestand | Wijziging |
|---|---|
| `src/components/settings/shifts/ShiftWizard/ShiftWizard.tsx` | Import AreasStep vervangen door ConfigStep, handleSubmit uitbreiden met syncShiftTickets, ConfirmDialog voor unlink |
| `src/components/settings/shifts/ShiftWizard/steps/CapacityStep.tsx` | Volledig herschreven: live preview per ticket met effectieve waarden |
| `src/components/settings/shifts/ShiftWizard/steps/ReviewStep.tsx` | Overrides samenvatting per ticket toevoegen |
| `src/hooks/useShiftTickets.ts` | `useSyncShiftTickets` mutation toevoegen |

---

## Technische details

### 1. useSyncShiftTickets mutation

Toevoegen aan `src/hooks/useShiftTickets.ts`:

```typescript
interface SyncShiftTicketsInput {
  shiftId: string;
  locationId: string;
  selectedTickets: string[];
  ticketOverrides: Record<string, ShiftTicketOverrides>;
}

export function useSyncShiftTickets() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shiftId, locationId, selectedTickets, ticketOverrides }: SyncShiftTicketsInput) => {
      // 1. Fetch current shift_tickets
      const { data: existing } = await supabase
        .from('shift_tickets')
        .select('id, ticket_id')
        .eq('shift_id', shiftId)
        .eq('is_active', true);

      const existingIds = (existing ?? []).map(st => st.ticket_id);
      const toRemove = existingIds.filter(id => !selectedTickets.includes(id));

      // 2. Delete removed
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('shift_tickets')
          .delete()
          .eq('shift_id', shiftId)
          .in('ticket_id', toRemove);
        if (error) throw error;
      }

      // 3. Upsert selected (add + update)
      if (selectedTickets.length > 0) {
        const payload = selectedTickets.map(ticketId => {
          const o = ticketOverrides[ticketId];
          return {
            shift_id: shiftId,
            ticket_id: ticketId,
            location_id: locationId,
            override_duration_minutes: o?.overrideDuration ?? null,
            override_buffer_minutes: o?.overrideBuffer ?? null,
            override_min_party: o?.overrideMinParty ?? null,
            override_max_party: o?.overrideMaxParty ?? null,
            pacing_limit: o?.pacingLimit ?? null,
            seating_limit_guests: o?.seatingLimitGuests ?? null,
            seating_limit_reservations: o?.seatingLimitReservations ?? null,
            ignore_pacing: o?.ignorePacing ?? false,
            areas: o?.areas ?? null,
            show_area_name: o?.showAreaName ?? false,
            squeeze_enabled: o?.squeezeEnabled ?? false,
            squeeze_duration_minutes: o?.squeezeDuration ?? null,
            squeeze_gap_minutes: o?.squeezeGap ?? null,
            squeeze_to_fixed_end_time: o?.squeezeFixedEndTime ?? null,
            squeeze_limit_per_shift: o?.squeezeLimit ?? null,
            show_end_time: o?.showEndTime ?? false,
            waitlist_enabled: o?.waitlistEnabled ?? false,
            is_active: true,
          };
        });

        const { error } = await supabase
          .from('shift_tickets')
          .upsert(payload, { onConflict: 'shift_id,ticket_id' });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftTickets(vars.shiftId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets(vars.locationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(vars.locationId) });
    },
  });
}
```

Importeer `ShiftTicketOverrides` vanuit `ShiftWizardContext`, of definieer een compatible input type om circulaire imports te vermijden. Gebruik een aparte `SyncOverrides` interface die dezelfde velden heeft — of importeer vanuit het context bestand (is acceptabel aangezien hooks en context in dezelfde codebasis leven).

### 2. ConfigStep (nieuw bestand, vervangt AreasStep)

**Expliciet:** Verwijder `AreasStep.tsx`. Maak `ConfigStep.tsx`. Update import in `ShiftWizard.tsx` van `AreasStep` naar `ConfigStep`.

Per geselecteerd ticket een `Collapsible` panel (van `@radix-ui/react-collapsible`):

```text
v Reguliere tafel                  2 overrides
+------------------------------------------------------+
|  Tafeltijd & buffer                                  |
|  [    ] min  (placeholder: 90)   [    ] min (15)     |
|                                                       |
|  Groepsgrootte                                       |
|  Min [    ] (1)    Max [    ] (20)                    |
|                                                       |
|  Pacing                                              |
|  Max gasten/slot [    ]   [switch] Negeer pacing     |
|                                                       |
|  Seating limieten                                    |
|  Max gasten [    ]    Max reserveringen [    ]        |
|                                                       |
|  Gebieden                                            |
|  (o) Alle gebieden (3)                               |
|  ( ) Specifieke gebieden                             |
|    [x] Terras  (4t, 24s)                             |
|    [ ] Salon   (6t, 36s)                             |
|  [switch] Toon area naam in widget                   |
|                                                       |
|  Squeeze                                             |
|  [switch] Squeeze inschakelen                        |
|  (als aan: duur, gap, vaste eindtijd, limiet)        |
|                                                       |
|  Weergave                                            |
|  [switch] Toon eindtijd   [switch] Wachtlijst       |
+------------------------------------------------------+
```

Data en gedrag:
- Haalt geselecteerde tickets op via `useTickets(locationId)` — lookup ticket-defaults voor placeholders
- Haalt areas op via `useAreasWithTables(locationId)` — voor gebieden-selectie
- Alle NestoInput velden zijn optioneel. Placeholder toont ticket-default (bijv. `placeholder="90"`)
- Override waarden lezen/schrijven via `setTicketOverride(ticketId, field, value)` uit context
- Switch-velden (ignorePacing, showAreaName, squeezeEnabled, showEndTime, waitlistEnabled) zijn booleans, default false
- Gebieden: radio "Alle gebieden" / "Specifieke gebieden". Bij specifiek: checkbox-lijst van areas met tafel- en stoelcounts
- Squeeze sub-velden alleen zichtbaar als `squeezeEnabled === true`
- Eerste ticket default open, rest dicht
- Collapsible header toont ticketnaam + override-count badge

Geen tickets geselecteerd: toon een muted tekst "Selecteer eerst tickets in de vorige stap."

### 3. CapacityStep (herschreven)

Per geselecteerd ticket een compacte NestoCard:

```text
Reguliere tafel
+--------------------------------------------------+
|  12 tafels · 1-20 gasten · 90 min                |
|                                                   |
|  Gebieden     Alle (3)                           |
|  Pacing       Geen limiet                        |
|  Seating      Geen limiet                        |
|  Squeeze      Uit                                |
+--------------------------------------------------+
```

Data:
- Combineert ticket-defaults met overrides via `getEffectiveValue` uit context
- Tafelcount: berekend uit geselecteerde areas (of alle areas als `areas === null`) via `useAreasWithTables`
- Gasten range: effectieve min/max party
- Duration: effectieve duration

Waarschuwingen (InfoAlert):
- `squeezeEnabled && !squeezeLimit`: "Squeeze is ingeschakeld maar er is geen limiet ingesteld"

Geen tickets geselecteerd: "Selecteer eerst tickets in stap 2."

### 4. ShiftWizard.tsx — handleSubmit uitbreiding

De huidige `handleSubmit` doet alleen shift create/update. Wordt uitgebreid:

```typescript
const { mutateAsync: syncTickets } = useSyncShiftTickets();
const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
const [pendingSubmitData, setPendingSubmitData] = useState<{ shiftId: string } | null>(null);
```

Flow:
1. Valideer shift data (bestaand)
2. Check of tickets worden ontkoppeld (edit mode):
   - Vergelijk `initialShiftTickets` (via context prop) met `selectedTickets`
   - Als er tickets verdwijnen: toon ConfirmDialog, sla submit data op in state
   - Als geen tickets verdwijnen: ga direct door
3. Na bevestiging (of als geen unlink): save shift (create/update)
4. Op onSuccess van shift save: `await syncTickets({ shiftId, locationId, selectedTickets, ticketOverrides })`
5. Sluit wizard

De ConfirmDialog zit in de ShiftWizardContent JSX:
```text
<ConfirmDialog
  open={showUnlinkConfirm}
  onOpenChange={setShowUnlinkConfirm}
  title="Tickets ontkoppelen?"
  description="{n} ticket(s) worden ontkoppeld van deze shift. Ingestelde overrides gaan verloren."
  confirmLabel="Ontkoppelen"
  variant="destructive"
  onConfirm={executeSave}
/>
```

De `initialShiftTickets` moeten beschikbaar zijn in de ShiftWizardContent. Deze worden doorgegeven via de context — voeg `initialShiftTickets` toe aan de ShiftWizardState (read-only, voor diff-berekening).

**Context wijziging:** Voeg `initialShiftTickets: ShiftTicketRow[]` toe aan `ShiftWizardState` zodat de submit handler de diff kan berekenen. Dit is een read-only waarde die bij initialisatie wordt gezet.

### 5. ReviewStep — overrides samenvatting

Onder de bestaande "Tickets" sectie en "Configuratie" sectie worden nu per ticket de effectieve overrides getoond:

- Tickets sectie: ongewijzigd (komma-gescheiden namen)
- Configuratie sectie: per ticket met overrides een kort overzicht
  - "Reguliere tafel: standaard"
  - "Kerstdiner: 120 min, max 12 gasten, squeeze aan"
- Capaciteit sectie: korte samenvatting per ticket ("12 tafels, alle gebieden")

De overrides worden opgebouwd door te itereren over `selectedTickets`, voor elk de `ticketOverrides` te bekijken, en ticket-defaults op te halen via `useTickets`.

---

## Volgorde van implementatie

1. `useShiftTickets.ts` — `useSyncShiftTickets` mutation toevoegen
2. `ShiftWizardContext.tsx` — `initialShiftTickets` toevoegen aan state (read-only)
3. `ConfigStep.tsx` — nieuw bestand aanmaken
4. `AreasStep.tsx` — verwijderen
5. `ShiftWizard.tsx` — import ConfigStep, handleSubmit uitbreiden met sync + ConfirmDialog
6. `CapacityStep.tsx` — herschrijven met live data
7. `ReviewStep.tsx` — overrides samenvatting

---

## Validatie-checklist

- [ ] `AreasStep.tsx` verwijderd, `ConfigStep.tsx` bestaat
- [ ] Import in `ShiftWizard.tsx` gebruikt `ConfigStep` (geen AreasStep referenties)
- [ ] Per ticket een collapsible panel met alle override-velden
- [ ] Override placeholders tonen ticket-defaults (duration, buffer, min/max party)
- [ ] Lege overrides vallen terug op ticket-defaults in capaciteitspreview
- [ ] Area selectie werkt per ticket (alle/specifiek) via `useAreasWithTables`
- [ ] Squeeze sub-velden tonen alleen als toggle aan
- [ ] Capaciteitspreview toont effectieve waarden per ticket
- [ ] Opslaan schrijft naar `shift_tickets` koppeltabel (upsert + delete)
- [ ] Bewerken van bestaande shift: ontkoppelen van tickets toont ConfirmDialog
- [ ] Nieuwe shift: geen ConfirmDialog (er zijn geen bestaande koppelingen)
- [ ] Review stap toont overrides samenvatting per ticket
- [ ] Geen `AreasStep` referenties meer in codebase
- [ ] Wizard sluit correct na succesvolle submit met ticket sync

