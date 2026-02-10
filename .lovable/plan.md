

# Fase 4.4B + 4.4C — Signalen & Tickets UI (finale versie)

Lees eerst `docs/FASE_4_4_TICKETS.md` voor het volledige concept.

---

## Stap 0 — Database migratie: `is_active` verwijderen van `tickets`

Sessie A is al geimplementeerd en bevat `is_active`. Deze migratie verwijdert de dubbele state.

### Wat verandert

1. **Drop kolom** `is_active` van `tickets`
2. **Update RPCs** die `is_active` filteren:
   - `get_bookable_tickets`: `AND t.is_active = true` wordt `AND t.status = 'active'`
   - `reorder_tickets`: `is_active = true` wordt `status = 'active'`
   - `get_ticket_with_policy`: verwijder `is_active` referenties
3. **Update partial unique index** `display_title` uniek WHERE `status = 'active'` (vervangt eventuele `is_active` filter)
4. **Update `trg_auto_create_default_ticket`**: verwijder `is_active` uit INSERT
5. **Update `trg_enforce_single_default_ticket`**: filter op `status = 'active'` i.p.v. `is_active`
6. **TypeScript**: verwijder `is_active` uit `Ticket` interface en alle input types in `src/types/tickets.ts`

### Status mapping

| Status | Betekenis | Boekbaar | Zichtbaar in overzicht |
|--------|-----------|----------|----------------------|
| `active` | Live product | Ja | Ja, hoofdgrid |
| `draft` | In voorbereiding | Nee | Ja, hoofdgrid (met draft badge) |
| `archived` | Verborgen | Nee | Nee, alleen in gearchiveerde sectie |

---

## Sessie B — Signalen (Config Provider uitbreiding)

### Wat wordt aangepast

**Bestand: `supabase/functions/evaluate-signals/index.ts`**

### Entitlement guard

Voordat de 5 nieuwe checks (en de 3 bestaande reservering-gerelateerde checks) draaien, wordt gecheckt:

```text
SELECT 1 FROM location_entitlements
WHERE location_id = _locationId
  AND module_key = 'reservations'
  AND enabled = true
```

Als niet gevonden: skip alle ticket/shift/tafel-gerelateerde signalen. Dit voorkomt dat locaties zonder reserveringsmodule configuratie-signalen krijgen.

De bestaande checks `unassigned_tables`, `empty_table_groups`, en `shifts_without_pacing` krijgen dezelfde guard — ze zijn ook reserveringen-specifiek.

### 5 nieuwe signalen

| Signal Type | Severity | Priority | Evaluate Query | action_path |
|---|---|---|---|---|
| `config_ticket_no_shift` | warning | 25 | Tickets met `status = 'active'` LEFT JOIN `shift_tickets` WHERE geen actieve match | `/instellingen/reserveringen/tickets` |
| `config_shift_no_tickets` | warning | 25 | Shifts met `is_active = true` LEFT JOIN `shift_tickets` WHERE geen actieve match | `/instellingen/reserveringen/shifts` |
| `config_ticket_no_policy` | info | 50 | Tickets met `status = 'active'` en `policy_set_id IS NULL` | `/instellingen/reserveringen/tickets` |
| `config_ticket_draft` | info | 70 | Tickets met `status = 'draft'` en `created_at < now() - 7 days` | `/instellingen/reserveringen/tickets` |
| `config_squeeze_no_limit` | info | 60 | `shift_tickets` met `squeeze_enabled = true` en `squeeze_limit_per_shift IS NULL` (join actieve shift) | `/instellingen/reserveringen/shifts` |

### Implementatiedetails

- `dedup_key`: `{signal_type}:{locationId}` (per locatie, niet per individueel ticket)
- Payload bevat `count` en `names[]` (ticket- of shiftnamen)
- `resolveStale()` krijgt inverse checks: als conditie niet meer geldt, wordt het signaaltype teruggegeven
- Module: `configuratie`

### Geen frontend wijzigingen

Signalen verschijnen automatisch op `/assistent` via bestaande `useSignals` hook en `AssistantItemCard`.

---

## Sessie C — Tickets UI

### Nieuwe bestanden

| Bestand | Beschrijving |
|---|---|
| `src/pages/settings/reserveringen/SettingsReserveringenTickets.tsx` | Pagina met SettingsDetailLayout, breadcrumbs, PageHeader, "Nieuw ticket" knop |
| `src/components/settings/tickets/TicketsSection.tsx` | Grid van TicketCards + gearchiveerde sectie (AreasSection patroon) |
| `src/components/settings/tickets/TicketCard.tsx` | Productkaart per ticket |
| `src/components/settings/tickets/TicketModal.tsx` | Create/edit modal voor tickets |
| `src/components/settings/tickets/PolicySetModal.tsx` | Create/edit modal voor beleid |
| `src/components/settings/tickets/index.ts` | Barrel export |
| `src/hooks/useTickets.ts` | Query hook: tickets met shift count + policy info |
| `src/hooks/useTicketMutations.ts` | Mutations: create, update, archive, restore, duplicate |
| `src/hooks/usePolicySets.ts` | Query + create mutation voor policy sets |

### Bestaande bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/App.tsx` | Route toevoegen: `/instellingen/reserveringen/tickets` |
| `src/lib/settingsRouteConfig.ts` | Sectie "Tickets" toevoegen na "shifts", voor "shift-tijden" |
| `src/pages/settings/reserveringen/index.ts` | Export toevoegen |
| `src/types/tickets.ts` | `is_active` verwijderen uit interfaces |

### TicketCard specificatie

```text
+----------------------------------+
|  [Hero image / kleur-gradient]   |  16:9 AspectRatio, rounded-t-card
|  (ster-icoon als highlighted)    |  linksboven, Star icon, text-warning fill
+----------------------------------+
|  Display Titel           (menu)  |  font-semibold text-lg + MoreVertical
|  Korte beschrijving...           |  text-muted-foreground, line-clamp-2
|                                  |
|  [Status] [Pricing]             |  NestoBadge
|  3 shifts                        |  of "Geen shifts" (text-warning)
+----------------------------------+
```

- Geen image: gradient van `ticket.color` (bijv. `linear-gradient(135deg, {color}, {color}88)`)
- Status badge: `active` = success variant, `draft` = default variant
- "Niet boekbaar" badge (warning variant): actief ticket met 0 shift_tickets
- Pricing badge: afgeleid van gekoppelde policy_set (zie tabel hieronder)
- Context menu (MoreVertical): Bewerken, Dupliceren, Deellink kopieren, Archiveren
- Default ticket (`is_default = true`): archiveren disabled in context menu met title tooltip "Default ticket kan niet gearchiveerd worden"

### Pricing badge logica

| payment_type | Badge tekst | NestoBadge variant |
|---|---|---|
| `none` of geen policy | "Geen betaling" | default |
| `deposit` | "EUR X p.p. deposit" | primary |
| `full_prepay` | "EUR X p.p. prepay" | primary |
| `no_show_guarantee` | "No-show fee EUR X" | warning |

Bedragen via `Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })`, cents gedeeld door 100.

### TicketsSection specificatie

- Grid: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Lege staat: `EmptyState` component met "Nog geen tickets" + CTA "Eerste ticket aanmaken" die TicketModal opent
- Gearchiveerde sectie: `Collapsible` met `bg-muted/30 rounded-lg p-4` (exact AreasSection patroon), toont gearchiveerde tickets met "Herstellen" knop
- Geen drag-and-drop voor MVP
- Actieve en draft tickets tonen samen in het hoofdgrid (variablenaam: `visibleTickets`)

### TicketModal specificatie

NestoModal size "lg". Volgt AreaModal patroon (Dialog + formulier, rechts-uitgelijnde knoppen, inline errors).

**Sectie 1 — Basis:**
- Type: radio group "Regulier" / "Event" (niet getoond bij bewerken van default ticket, want type is locked)
- Naam (verplicht, intern label)
- Display titel (verplicht, gastzichtbaar)
- Korte beschrijving (optioneel, max 120 chars, met character counter)
- Kleur (kleur-picker met preset palette, default `#0d9488`)

**Sectie 2 — Reservering** (gescheiden door `border-t border-border/50 pt-4 mt-4`):
- Tafeltijd (minuten, NestoInput type="number", default 90)
- Buffer (minuten, NestoInput type="number", default 15)
- Min gasten (NestoInput type="number", default 1)
- Max gasten (NestoInput type="number", default 20)

**Sectie 3 — Beleid** (gescheiden door `border-t border-border/50 pt-4 mt-4`):
- Beleid dropdown (NestoSelect): lijst van bestaande policy_sets + optie "Geen beleid"
- Naast de dropdown: "Nieuw beleid" knop (NestoButton variant="outline" size="sm") die PolicySetModal opent
- Na aanmaken van nieuw beleid: automatisch geselecteerd in dropdown, `usePolicySets` wordt geïnvalideerd

**Niet in de modal (bewust):** image upload, booking window, large party threshold, highlighted/highlight_order, tags, metadata, rich text description.

**Validatie:**
- Naam en display_title verplicht
- Min party <= max party
- Duration > 0
- Inline foutmeldingen via NestoInput `error` prop
- Toast alleen bij API success/error

**Footer:** rechts-uitgelijnd, gap-3: "Annuleren" (variant outline) + "Aanmaken"/"Opslaan" (variant primary)

### PolicySetModal specificatie

NestoModal size "md". Geopend vanuit TicketModal via "Nieuw beleid" knop. Na opslaan sluit PolicySetModal en keert gebruiker terug naar TicketModal met het nieuwe beleid automatisch geselecteerd.

**Sectie 1 — Basis:**
- Naam (verplicht, bijv. "Weekend", "Kerstdiner")

**Sectie 2 — Betaling** (border-t scheiding):
- Betaaltype: NestoSelect met opties "Geen betaling" / "Aanbetaling" / "Volledige prepay" / "No-show garantie"
- Bedrag per persoon (NestoInput type="number", in euros, opgeslagen als cents). Alleen zichtbaar als betaaltype niet "Geen betaling"

**Sectie 3 — Annulering** (border-t scheiding):
- Annuleringsbeleid: NestoSelect "Gratis annuleren" / "Annuleren tot X uur voor" / "Niet annuleerbaar"
- Uren voor aanvang (NestoInput type="number", alleen zichtbaar bij "Annuleren tot X uur voor")
- Restitutie: NestoSelect "Volledig" / "Gedeeltelijk" / "Geen" (alleen zichtbaar bij window of no_cancel met betaling)

**Sectie 4 — No-show** (border-t scheiding):
- No-show beleid: NestoSelect "Geen actie" / "Alleen markeren" / "Kosten in rekening brengen"
- Markeren na X minuten (NestoInput type="number", default 15, zichtbaar bij "Alleen markeren" of "Kosten in rekening brengen")

**Validatie:** spiegelt CHECK constraints uit database:
- Bedrag verplicht als betaaltype niet "none"
- Uren verplicht bij "window"

**Footer:** "Annuleren" + "Beleid opslaan"

### useTickets hook

```typescript
const { data } = useQuery({
  queryKey: queryKeys.tickets(locationId),
  queryFn: async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, policy_sets(payment_type, payment_amount_cents), shift_tickets(id)')
      .eq('location_id', locationId)
      .order('sort_order', { ascending: true });
    // ...
  }
});
```

Returns gesplitst in:
- `visibleTickets`: status `active` + `draft` (tonen in hoofdgrid)
- `archivedTickets`: status `archived` (tonen in collapsible)

Elk ticket bevat:
- `shiftCount`: `ticket.shift_tickets?.length ?? 0`
- `policyInfo`: `{ payment_type, payment_amount_cents }` of null

### useTicketMutations hook

- `useCreateTicket`: insert met `sort_order` via `get_next_ticket_sort_order` RPC
- `useUpdateTicket`: update
- `useArchiveTicket`: `update({ status: 'archived' })`
- `useRestoreTicket`: `update({ status: 'draft' })`
- `useDuplicateTicket`: lees origineel, insert kopie met `name + " (kopie)"`, `status: 'draft'`, `is_default: false`, `policy_set_id` meegekopieerd, nieuwe `sort_order`
- Alle mutations invalideren `queryKeys.tickets(locationId)`

### usePolicySets hook

```typescript
const { data } = useQuery({
  queryKey: queryKeys.policySets(locationId),
  queryFn: async () => {
    const { data, error } = await supabase
      .from('policy_sets')
      .select('id, name, payment_type, payment_amount_cents, cancel_policy_type, noshow_policy_type')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .order('name');
    // ...
  }
});
```

Plus `useCreatePolicySet` mutation die:
- Insert in `policy_sets`
- Invalidates `queryKeys.policySets(locationId)`
- Returns het nieuwe ID (voor auto-selectie in TicketModal)

### Routing en navigatie

Route: `/instellingen/reserveringen/tickets`

Toevoegen aan `settingsRouteConfig.ts` na "shifts", voor "shift-tijden":
```typescript
{
  id: "tickets",
  label: "Tickets",
  path: "/instellingen/reserveringen/tickets",
  description: "Reserveringsproducten beheren",
  icon: Ticket, // van lucide-react
}
```

---

## Volgorde van implementatie

1. Database migratie: drop `is_active` van tickets, update RPCs, triggers, indexes
2. TypeScript types aanpassen (`src/types/tickets.ts`)
3. Edge function `evaluate-signals` uitbreiden + deployen (Sessie B)
4. `usePolicySets.ts` hook
5. `useTickets.ts` + `useTicketMutations.ts` hooks
6. `PolicySetModal.tsx` component
7. `TicketCard.tsx` component
8. `TicketModal.tsx` component (met PolicySetModal integratie)
9. `TicketsSection.tsx` (combineert kaarten + modals + gearchiveerde sectie)
10. `SettingsReserveringenTickets.tsx` pagina
11. Routes in `App.tsx` + `settingsRouteConfig.ts` + barrel export in `index.ts`

---

## Validatie-checklist

### Stap 0 — Migratie
- [ ] `is_active` kolom verwijderd van tickets
- [ ] RPCs filteren op `status = 'active'`
- [ ] Triggers bijgewerkt (enforce_single_default, auto_create)
- [ ] Partial unique indexes bijgewerkt
- [ ] Seed data intact (default ticket status = 'active')

### Sessie B — Signalen
- [ ] 5 signalen verschijnen wanneer condities gelden
- [ ] Signalen alleen gegenereerd voor locaties met reservations entitlement
- [ ] Bestaande signalen (unassigned_tables, etc.) ook achter entitlement guard
- [ ] Elk signaal heeft werkende action_path
- [ ] Signalen auto-resolven wanneer conditie niet meer geldt
- [ ] Dedup werkt correct

### Sessie C — Tickets UI
- [ ] Pagina laadt op `/instellingen/reserveringen/tickets`
- [ ] Navigatiekaart "Tickets" zichtbaar op `/instellingen/reserveringen`
- [ ] Breadcrumbs: Settings > Reserveringen > Tickets
- [ ] Default ticket toont als productkaart met kleur-gradient
- [ ] TicketModal opent via "Nieuw ticket" knop en via EmptyState CTA
- [ ] Type selectie (regulier/event) werkt, niet zichtbaar bij default ticket
- [ ] PolicySetModal opent via "Nieuw beleid" knop in TicketModal
- [ ] Na aanmaken beleid: automatisch geselecteerd in dropdown
- [ ] Ticket aanmaken end-to-end: naam, titel, tafeltijd, groepsgrootte, beleid
- [ ] Ticket bewerken via context menu "Bewerken"
- [ ] Archiveren en herstellen werken (status wijzigt)
- [ ] Dupliceren maakt kopie met "(kopie)" suffix, status draft, policy_set_id meegekopieerd
- [ ] Default ticket: archiveren disabled in context menu
- [ ] Status badges tonen correct (active=groen, draft=grijs)
- [ ] Pricing badges tonen correct op basis van policy_set
- [ ] "Geen shifts" toont in text-warning voor tickets zonder shift_tickets
- [ ] Gearchiveerde sectie toont correct met herstelmogelijkheid
- [ ] `visibleTickets` bevat active + draft (niet `activeTickets`)

