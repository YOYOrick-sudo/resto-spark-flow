# NESTO PROJECT ROADMAP
Laatst bijgewerkt: 11 januari 2026

## PROJECT OVERZICHT
Nesto is een SaaS platform voor horeca management met modules voor reserveringen, keuken, kaartbeheer, en meer. Multi-tenant architectuur waarbij elke organization meerdere locations kan hebben, met per-location billing en module entitlements.

---

## HUIDIGE STATUS

### AFGEROND
- ✅ Fase 1: Design System
- ✅ Fase 2: Navigatie & Layout  
- ✅ Fase 3: UI Patterns
- ✅ Fase 4.1: SaaS Foundation
- ✅ Fase 4.2: Areas, Tables, TableGroups
- ✅ Fase 4.3.A: Shifts CRUD
- ✅ Fase 4.3.B: Shifts Live Preview Panel
- ✅ Fase 7.4.1: Nesto Assistant - Signals UI

### IN UITVOERING
- 🔄 Fase 4.3: Shifts + Exceptions
  - ✅ 4.3.A Shifts CRUD - COMPLEET (11 januari 2026)
  - ✅ 4.3.B Live Preview Panel - COMPLEET (11 januari 2026)
  - ⏳ 4.3.C Shift Exceptions UI - VOLGENDE

---

## FASE 1: DESIGN SYSTEM ✅ AFGEROND

### Wat is gedaan:
- [x] CSS tokens gedefinieerd (kleuren, spacing, typography, radii)
- [x] Tailwind config met custom design tokens
- [x] Dark mode ondersteuning via ThemeProvider
- [x] ShadCN UI componenten geïntegreerd
- [x] 9 Nesto Polar UI componenten gebouwd:
  - NestoBadge
  - NestoButton
  - NestoCard
  - NestoInput
  - NestoModal
  - NestoSelect
  - NestoTable
  - NestoTabs
  - CategorySidebar

---

## FASE 2: NAVIGATIE & LAYOUT ✅ AFGEROND

### Wat is gedaan:
- [x] AppShell component (responsive layout wrapper)
- [x] AppLayout met desktop/mobile ondersteuning
- [x] NestoSidebar met:
  - Collapsible menu groepen
  - Active state indicators
  - Dark/light mode toggle
  - Responsive mobile menu
- [x] React Router configuratie
- [x] 19 placeholder pagina's aangemaakt:
  - Dashboard, Reserveringen, Recepten, Halffabricaten
  - Ingredienten, Kostprijzen, MepTaken, Kaartbeheer
  - Inkoop, Taken, Settings (4 subpagina's), etc.

---

## FASE 3: UI PATTERNS ✅ AFGEROND

### Wat is gedaan:
- [x] PageHeader (sticky met acties)
- [x] DetailPageLayout (met NestoTabs)
- [x] StatCard (metrics met trends)
- [x] DataTable (extended met sorting/pagination/selection)
- [x] SearchBar (debounced)
- [x] EmptyState
- [x] InfoAlert (variants: info, warning, success, error)
- [x] FormSection/MethodCard voor complexe flows
- [x] ConfirmDialog
- [x] Toast configuratie (Nesto Polar theme via Sonner)

---

## FASE 4: MODULE - RESERVERINGEN

### 4.1 SaaS Foundation ✅ AFGEROND
Status: Compleet (3 januari 2026)

**Wat is gedaan:**
- [x] Lovable Cloud geactiveerd
- [x] 16 database tabellen aangemaakt
- [x] 4 custom enums (platform_role, location_role, module_key, employee_status)
- [x] Security definer functions (is_platform_admin, get_user_context, etc.)
- [x] Complete RLS policies voor alle tabellen
- [x] Seed data (45+ permissions, 6 permission sets, 5 role mappings)
- [x] AuthContext met login/signup
- [x] UserContext met centrale get_user_context()
- [x] Permission en Entitlement hooks
- [x] Navigation builder gebaseerd op context
- [x] Protected routes met ProtectedRoute component
- [x] Auth pagina (/auth) met login en registratie

**Architectuur Beslissingen:**
- Platform roles zijn globaal in profiles tabel (niet per org)
- get_user_context() is de centrale bron voor role, permissions, entitlements
- 1 permission_set per location_role (UNIQUE constraint)
- Employee portal staat los van operationele rollen
- Platform admin is primair read-only

---

### 4.2 Areas, Tables, TableGroups
Status: Deels compleet

---

#### 4.2.A CRUD UI ✅ COMPLEET
Status: Afgerond (4 januari 2026)

**Database Schema (GELOCKED):**
- [x] `areas` - Zones met sort order, fill_order, is_active
- [x] `tables` - Tafels met min/max capacity, online bookable, is_joinable
- [x] `table_groups` - Combinaties met auto-calculated capacities
- [x] `table_group_members` - Koppeling met sort_order
- [x] Constraints: table_number uniek per location, display_label case-insensitive uniek
- [x] Triggers: prevent_table_group_overlap, check_group_activation_overlap

**Hooks:**
- [x] `useAreasWithTables` (Set-based, O(n+m))
- [x] `useAreasForGrid` en `useAreasForSettings`
- [x] `useTableGroups` (met members optie)
- [x] `useTableMutations` (create, update, archive, restore, swap, bulk)
- [x] `useReservationSettings` met autosave

**Settings UI Components:**
- [x] `LocationSettingsCard` - autosave voor toggles en numerieke settings
- [x] `AreasSection` - overzicht + add area + archived collapsible
- [x] `AreaCard` - collapsible met tafels, fill order, up/down reorder, archive
- [x] `AreaModal` - create/edit area met fill order
- [x] `TableRow` - display, up/down reorder, edit, archive
- [x] `TableModal` - create/edit (label, capacity, online bookable, joinable)
- [x] `BulkTableModal` - meerdere tafels tegelijk toevoegen
- [x] `RestoreTableModal` - restore met label conflict handling
- [x] `TableGroupsSection` - overzicht + add group + archived collapsible
- [x] `TableGroupCard` - display met members, edit, archive
- [x] `TableGroupModal` - create/edit met multi-select members

**Design System Fixes:**
- [x] Toast notificaties: Nesto Polar styling (3px left-border, bottom-right)
- [x] Modal close button: hideCloseButton prop
- [x] Toast feedback strategie: inline voor autosave, toast voor expliciete acties
- [x] Documentatie: `docs/design/TOAST_NOTIFICATIONS.md`

---

#### 4.2.B Reorder UI
Status: Deels compleet

---

##### 4.2.B1 Areas Reorder ✅ COMPLEET
Status: Afgerond (7 januari 2026) - Klaar voor test/polish

**Wat is gedaan:**
- [x] Drag handle op AreaCard header (GripVertical icon)
- [x] RPC: `reorder_areas(_location_id uuid, _area_ids uuid[])`
  - Guards: auth check, concurrency lock, no duplicate IDs
  - Guards: all active IDs present, idempotency check
  - Atomic update via UNNEST WITH ORDINALITY
- [x] Hook: `useReorderAreas` mutation
  - ID-based optimistic updates across all query variants
  - Rollback on error
  - Toast feedback on failure
- [x] Centralized query keys (`src/lib/queryKeys.ts`)
- [x] DndContext + SortableContext met @dnd-kit
- [x] SortableAreaCard component met inline drag
- [x] Sensors: PointerSensor, TouchSensor, KeyboardSensor
- [x] Modifiers: restrictToVerticalAxis, restrictToParentElement
- [x] Expanded/collapsed state behouden tijdens drag
- [x] Up/down knoppen blijven als fallback
- [x] UX Polish: inline drag (geen overlay popup)

**Nog te testen:**
- [ ] Reorder is stabiel na refresh
- [ ] Unauthorized role kan niet reordenen  
- [ ] Geen dubbele sort_order ontstaat
- [ ] Touch input werkt soepel op mobile

**Technische keuzes:**
- Library: @dnd-kit/core + @dnd-kit/sortable
- Inline drag (item beweegt zelf, geen DragOverlay)
- Handle-only dragging (GripVertical icon)
- Keyboard support via KeyboardSensor

---

##### 4.2.B2 Tables Reorder binnen Area ✅ COMPLEET
Status: Afgerond (9 januari 2026)

**Wat is gedaan:**
- [x] SortableTableRow component (analog aan SortableAreaCard)
- [x] Drag handle op TableRow (GripVertical icon)
- [x] RPC: `reorder_tables(_area_id uuid, _table_ids uuid[])` (pre-existing)
  - Guards: auth, concurrency lock, duplicate check
  - Guards: all active IDs present, tables within area
  - Atomic update via UNNEST WITH ORDINALITY
- [x] Hook: `useReorderTables` mutation met optimistic updates
- [x] DndContext per expanded area (nested in AreaCard)
- [x] Sortable column headers (Prio, Naam, Min, Max, Online)
- [x] DnD alleen actief bij "Prio asc" sortering
- [x] Tooltip op disabled drag handle: "Sleepvolgorde bewerken kan alleen in Prioriteit sortering"
- [x] Groepen kolom toegevoegd (badge met aantal gekoppelde tafelgroepen)

**Kolomvolgorde (definitief):**
| Kolom | Breedte | Inhoud |
|-------|---------|--------|
| Drag | 32px | ≡ handle |
| Prio | 40px | 1, 2, 3... (read-only) |
| Naam | 1fr | Tafelnaam |
| Min | 80px | Min capaciteit |
| Max | 80px | Max capaciteit |
| Online | 40px | Toggle switch |
| Groepen | 48px | Badge met aantal of — |
| Actions | 32px | ⋮ menu |

**Design beslissingen:**
- Geen up/down fallback knoppen (alleen DnD)
- DnD expliciet uitgeschakeld bij andere sorteringen om verwarring te voorkomen
- `assign_priority` veld niet in UI (sort_order bepaalt visuele volgorde)
- Sortable headers voor flexibele weergave

**Wat expliciet NIET in B2 scope:**
- Tafels slepen tussen areas (cross-area drag)
- Reorder van tafelgroepen of group members

---

**Wat expliciet NIET in Scope B zit:**
- Tafels slepen tussen areas
- Reorder van tafelgroepen of group members
- Automatische "insert between" zonder RPC hernummering

---

#### 4.2.C Availability Rules per Tafel ⏳ NOG TE STARTEN
Status: Nog te starten (pas starten als nodig voor online booking/auto-assign)

**Doel:** Per tafel bepalen wanneer die beschikbaar is, bovenop openingstijden en shift rules

**Scope C1: Datamodel**
- [ ] `table_availability_rules` tabel:
  - id, location_id, table_id
  - rule_type: allow | block
  - days_of_week int[]
  - start_time, end_time
  - start_date, end_date (nullable voor recurring)
  - is_active
  - created_at, updated_at

**Scope C2: Engine gedrag**
- [ ] Input: datum, tijdslot, tafel
- [ ] Output: beschikbaar ja/nee
- [ ] Regels:
  1. Als actieve block rule matcht -> niet beschikbaar
  2. Als allow rules bestaan -> alleen beschikbaar binnen allow windows
  3. Als geen rules -> beschikbaar binnen openingstijden

**Scope C3: UI in TableModal**
- [ ] Toggle: "Gebruik specifieke beschikbaarheid voor deze tafel"
- [ ] Rule list met add knop
- [ ] Per rule: type (allow/block), dagen, tijd, optioneel datum range
- [ ] Live preview is nice-to-have

**Scope C4: Integratiepunten**
- [ ] Online booking flow
- [ ] Auto assign algoritme
- [ ] Capacity search

**Acceptatiecriteria:**
- [ ] Rules CRUD werkt volledig
- [ ] Engine respecteert rules in beschikbaarheid check
- [ ] Default gedrag zonder rules blijft exact zoals nu
- [ ] RLS: alleen users met location access kunnen rules beheren

**Wat expliciet NIET in Scope C zit:**
- Seasonality templates
- Complexe priority stacks tussen meerdere allow rules
- UI voor bulk apply rules over meerdere tafels
- Availability rules per area (alleen per tafel)

---

### 4.3 Shifts + Exceptions
Status: Deels compleet

---

#### 4.3.A Shifts CRUD ✅ COMPLEET
Status: Afgerond (11 januari 2026)

**Database Schema (GELOCKED):**
- [x] `shifts` tabel met alle velden:
  - id, location_id, name, short_name
  - start_time, end_time (TIME format)
  - days_of_week (ISO: 1=Ma, 7=Zo)
  - arrival_interval_minutes (15/30/60)
  - color (HEX)
  - sort_order, is_active
- [x] `shift_exceptions` tabel:
  - exception_date, exception_type (closed/modified/special)
  - override tijden, label, notes
  - shift_id nullable (null = location-wide)
- [x] RPC: `get_effective_shift_schedule(_location_id, _date)`
- [x] RPC: `reorder_shifts(_location_id, _shift_ids[])`
- [x] RLS: owner/manager voor mutations

**Hooks:**
- [x] `useShifts` - Active shifts
- [x] `useAllShifts` - Inclusief archived
- [x] `useShift` - Single shift by ID
- [x] `useEffectiveShiftSchedule` - RPC wrapper
- [x] `useCreateShift`, `useUpdateShift`
- [x] `useArchiveShift`, `useRestoreShift`
- [x] `useReorderShifts`
- [x] `useShiftExceptions` - Exception queries
- [x] Exception mutations (create/update/delete)

**UI Components:**
- [x] `ShiftsTable` - Overzicht met drag-and-drop reorder
- [x] `SortableShiftRow` - Sorteerbare rij
- [x] `ShiftWizard` - 5-stappen wizard
  - Step 1 (Tijden): Naam, tijden, dagen, interval, kleur
  - Step 2 (Tickets): Mock ticket selectie
  - Step 3 (Gebieden): Area toewijzing per ticket
  - Step 4 (Capaciteit): Preview (placeholder)
  - Step 5 (Overzicht): Review + save
- [x] Overlap validatie in UI (ShiftWizard)
- [x] Polar-muted kleuren palette (8 kleuren)

**Documentatie:**
- [x] `docs/design/SHIFTS_ARCHITECTURE.md`

---

#### 4.3.B Live Preview Panel ✅ COMPLEET
Status: Afgerond (11 januari 2026)

**Wat is gedaan:**
- [x] `ShiftsLivePreviewPanel` component
- [x] Visuele preview van shift tijdslots
- [x] Capaciteit indicator (gasten + tafels)
- [x] Shift kleuren weergave
- [x] Integratie met `useAreasWithTables`

---

#### 4.3.C Shift Exceptions UI ⏳ NOG TE STARTEN
Status: Volgende stap

**Doel:** UI voor het beheren van shift exceptions (gesloten dagen, aangepaste tijden, speciale events)

**Scope:**
- [ ] Exceptions overzicht in settings (calendar of lijst view)
- [ ] Exception modal (create/edit)
  - Datum selectie (single of range)
  - Type: Gesloten / Aangepaste tijden / Speciaal
  - Shift selectie (of location-wide)
  - Label en notities
- [ ] Quick actions op kalender:
  - "Sluiten" knop voor snelle dag afsluiting
  - Copy exception to other dates
- [ ] Bulk close voor vakantieperiodes
- [ ] Integratie met Grid View (exception indicator op datum)

**UI Locatie:**
- Settings > Reserveringen > Shifts > Uitzonderingen tab (of aparte pagina)

---

### 4.4 Tickets + PolicySet Foundation
Status: Nog te starten

**Doel:** Ticket types met bijbehorende policies

**Database Schema:**
- [ ] `tickets` - Ticket types (Regular, Tasting Menu, Brunch, etc.)
- [ ] `policy_sets` - Herbruikbare policy configuraties
- [ ] `ticket_policies` - Koppeling ticket aan policies

**Acceptance Criteria:**
- [ ] Settings pagina "Tickets" met per ticket:
  - [ ] Naam, beschrijving
  - [ ] Duration + buffer tijd
  - [ ] Min/max party size
  - [ ] Gekoppelde shifts (welke tickets bij welke shift)
- [ ] PolicySet per ticket:
  - [ ] PaymentPolicy: none / deposit p.p. / full prepay p.p.
  - [ ] CancelPolicy: free until X uur, refund window
  - [ ] NoShowPolicy: mark after X min, keep deposit
  - [ ] ReconfirmPolicy: off / ask at T-X / required

**Nieuw: Booking Window (per Ticket)**

Zie: [`docs/design/BOOKING_WINDOW.md`](./design/BOOKING_WINDOW.md)

- [ ] `booking_min_advance_minutes` - Minimaal X min van tevoren
- [ ] `booking_max_advance_days` - Maximaal X dagen vooruit
- [ ] `booking_min_advance_large_party_minutes` - Override voor grote groepen
- [ ] `large_party_threshold` - Drempel voor "grote groep"

**Nieuw: Squeeze Policy (per Ticket)**

Zie: [`docs/design/SQUEEZE_LOGIC.md`](./design/SQUEEZE_LOGIC.md)

- [ ] `squeeze_enabled` - Squeeze activeren
- [ ] `squeeze_duration_minutes` - Minimale duur bij squeeze
- [ ] `squeeze_gap_minutes` - Buffer na squeeze
- [ ] `squeeze_to_fixed_end_time` - Squeeze naar vaste eindtijd
- [ ] `squeeze_limit_per_shift` - Max squeeze per shift

---

### 4.5 Availability Engine (Hart van het Systeem)
Status: Nog te starten

**Doel:** Deterministische availability berekening

**Edge Function:** `check-availability`

**Inputs:**
- Date, party size, ticket type
- Shifts voor dit ticket
- Table availability + combine rules
- Ticket duration + buffer
- Pacing limits (covers + arrivals)
- Channel rules
- Squeeze rules
- Cut-off rules
- Overbooking tolerance (default 0)

**Outputs per tijdslot:**
- Available: yes/no
- Slot type: normal / squeeze
- Reason code: tables_full, pacing_full, channel_blocked, cut_off, closed, overbooking_limit

**Acceptance Criteria:**
- [ ] Engine is 100% deterministisch (zelfde input = zelfde output)
- [ ] Alle reason codes zijn geimplementeerd
- [ ] Squeeze slots worden alleen getoond als normale slots vol zijn
- [ ] Reason codes zijn zichtbaar voor operators in UI
- [ ] Unit tests voor edge cases (overbooking, conflicts, etc.)

---

### 4.6 Reservation Model + Status Machine
Status: Nog te starten

**Doel:** Volledige reservation entiteit met strikte status transities

**Database Schema:**
- [ ] `reservations` - Uitgebreid model (vervangt mock)
- [ ] `customers` - Klantgegevens met historie
- [ ] `audit_log` - Alle mutaties worden gelogd

**Reservation velden:**
Alle huidige velden PLUS:
- customer_id (relatie)
- ticket_id
- channel
- squeeze (boolean)
- option_expires_at
- payment_status
- payment_intent_id
- reconfirmed_at
- badges (allergies, vip, etc.)

**Status Machine (strikte transities):**
```
Draft → PendingPayment (als payment required)
Draft → Option (als option enabled)
Draft → Confirmed (direct confirm)
PendingPayment → Confirmed (na betaling)
Option → Confirmed (na accept)
Option → Cancelled (na expiry)
Confirmed → Seated
Seated → Completed
Confirmed → NoShow (na timeout)
Confirmed → Cancelled (door gast/operator)
```

**Acceptance Criteria:**
- [ ] Geen vrije status overgangen meer
- [ ] Elke status change triggert audit log entry
- [ ] Customer model met volledige historie per gast
- [ ] Badges ondersteuning (VIP, allergies, prepaid, deposit, option expiring, reconfirmed, squeeze, waitlist filled)

---

### 4.7 Reservation Detail Panel + Acties
Status: Nog te starten

**Doel:** Volledig detail paneel voor operators

**UI Component:** `ReservationDetailSheet`

**Secties:**
- Samenvatting - Tijd, gasten, tafel, status, badges
- Customer Card - Naam, contact, bezoekhistorie, notities
- Acties - Contextafhankelijk op basis van status
- Audit Log - Alle wijzigingen zichtbaar

**Acties per status:**
- Draft: confirm, convert to option, request payment, cancel
- PendingPayment: resend payment link, cancel
- Option: confirm, extend, cancel
- Confirmed: seat, mark no show, cancel, request payment
- Seated: complete, move table
- Completed: (geen acties)
- Cancelled/NoShow: refund, waive

**Acceptance Criteria:**
- [ ] Detail panel opent bij klik op reservering (Grid en List view)
- [ ] Alle acties zijn beschikbaar en werkend
- [ ] Customer historie toont vorige bezoeken
- [ ] Audit log toont wie/wat/wanneer voor alle changes
- [ ] Operator override mogelijk maar gelogd

---

### 4.8 Check-in/Seat Flow met Regels
Status: Nog te starten

**Doel:** Configureerbare check-in en seating regels

**Settings:**
- Check-in window: hoe vroeg mag je inchecken? (bijv. 15 min voor)
- Auto no-show: na X minuten automatisch markeren
- Move to now: verplaats starttijd naar nu bij check-in (ja/nee)
- Late arrival tolerance

**Acceptance Criteria:**
- [ ] Double-click/long-press check-in respecteert check-in window
- [ ] Auto no-show job markeert reserveringen na X minuten
- [ ] "Move to now" instelling werkt correct
- [ ] Toast feedback voor te vroeg inchecken
- [ ] Settings UI voor check-in regels

---

### 4.9 Options (Optie Reserveringen)
Status: Nog te starten

**Doel:** Reserveringen die nog bevestigd moeten worden

**Database Schema:**
- Option settings per locatie
- option_expires_at veld op reservations

**Settings:**
- Options enabled (ja/nee)
- Default expiry (bijv. 24 uur)
- Payment required for option (ja/nee)
- Auto release na expiry
- Notifications before expiry

**Acceptance Criteria:**
- [ ] Operator kan reservering aanmaken als "Option"
- [ ] Option badge zichtbaar op Grid/List
- [ ] "Option expiring" badge toont countdown
- [ ] Auto-release job na expiry
- [ ] Notification triggers (T-2h, T-30min)
- [ ] Convert option to confirmed actie

---

### 4.10 Guest Widget + Beheerlink
Status: Nog te starten

**Doel:** Publieke widget voor gasten om te boeken

**Routes:**
- `/book/:locationSlug` - Widget pagina
- `/manage/:reservationToken` - Beheerlink

**Guest Flow (max 60 sec):**
1. Datum + party size selecteren
2. Ticket kiezen (of default)
3. Tijden zien:
   - Normale tijden eerst
   - Squeeze tijden alleen als normaal vol
   - Wachtlijst CTA als niets beschikbaar
4. Gegevens invoeren
5. Payment indien policy vereist
6. Bevestiging + beheerlink ontvangen

**Beheerlink functionaliteit:**
- Tijd wijzigen (binnen policies)
- Annuleren (binnen policies)
- Party size aanpassen
- Notities toevoegen

**UX Regels:**
- Annuleer- en betaalvoorwaarden VOOR bevestigen tonen
- Eindtijd tonen indien actief
- Squeeze expliciet labelen
- Max 6 tijdopties tegelijk tonen

**Acceptance Criteria:**
- [ ] Widget is responsive en snel (max 60 sec tot bevestiging)
- [ ] Availability engine bepaalt beschikbare tijden
- [ ] Squeeze tijden alleen zichtbaar als normaal vol
- [ ] Wachtlijst CTA als alles vol
- [ ] Beheerlink werkt volledig
- [ ] Policies worden gerespecteerd

---

### 4.11 Waitlist + Auto-invites
Status: Nog te starten

**Doel:** Wachtlijst met automatische uitnodigingen

**Database Schema:**
- [ ] `waitlist_entries` - Wachtlijst entries
- [ ] `waitlist_invites` - Verstuurde uitnodigingen

**Settings per shift:**
- Enable waitlist (ja/nee)
- Auto invite (ja/nee)
- Invite priority: time match / party fit / entry order
- Invite window (hoelang geldig)
- Max parallel invites
- Auto fallback (naar volgende als geen response)

**Guest Accept Flow:**
1. Ontvang invite link
2. Zie exacte tijd
3. Betaling indien vereist
4. Creeer reservering atomisch (geen dubbelboeking!)

**Operator UI:**
- Waitlist panel in sidebar
- Zie pending invites + countdown
- Cancel of force next

**Acceptance Criteria:**
- [ ] Waitlist entries worden opgeslagen
- [ ] Auto-invite job verstuurt uitnodigingen bij cancellation
- [ ] Invite priority werkt correct
- [ ] Geen dubbelboeking mogelijk (atomisch)
- [ ] Operator kan handmatig inviten/cancellen

---

### 4.12 Squeeze Logic
Status: Nog te starten

**Doel:** Squeeze reserveringen met caps en regels

**Squeeze Regels:**
- Alleen zichtbaar als normaal vol
- Kortere duration OF vaste eindtijd
- Caps per shift
- Visueel gelabeld in guest en operator UI

**Acceptance Criteria:**
- [ ] Availability engine markeert squeeze slots correct
- [ ] Squeeze badge zichtbaar op reserveringen
- [ ] Max squeeze per shift wordt gerespecteerd
- [ ] Squeeze duration/eindtijd uit ticket policy
- [ ] Guest widget toont squeeze expliciet

---

### 4.13 Payments (Stripe Integratie)
Status: Nog te starten

**Doel:** Deposits en prepay via Stripe

**Stripe Setup:**
- Enable Stripe connector
- Configure webhook voor payment events

**Payment Flows:**
- Deposit per persoon
- Full prepay per persoon
- Payment link request (door operator)
- Refund (volledig of deels)

**Acceptance Criteria:**
- [ ] Stripe checkout voor deposits en prepay
- [ ] PendingPayment status tot betaling compleet
- [ ] Webhook verwerkt payment success/failure
- [ ] Prepaid/deposit badges op reserveringen
- [ ] Refund actie werkt
- [ ] Geen silent failures (altijd error handling)

---

### 4.14 Messaging (Templates + Schedules)
Status: Nog te starten

**Doel:** Geautomatiseerde communicatie

**Templates:**
- Confirmation
- Reminder
- Reconfirm request
- Option confirm
- Waitlist invite
- Payment request

**Schedules:**
- T-24h reminder
- T-3h reminder
- T-X reconfirm request

**Acceptance Criteria:**
- [ ] Email templates configureerbaar
- [ ] Scheduled jobs voor reminders
- [ ] Reconfirm email met confirm link
- [ ] Waitlist invite met accept link
- [ ] Payment request met Stripe link

---

### 4.15 Insights + Audit Log UI
Status: Nog te starten

**Doel:** Rapportage en volledige audit trail

**Insights Dashboard (apart menu):**
Per dag en week:
- Reservations count
- Total covers
- Cancellations (count + %)
- No shows (count + %)
- Waitlist entries
- Invites sent
- Invite conversion rate
- Squeeze usage
- Bezettingsgraad per uur (heatmap)

**Audit Log UI:**
- Alle mutaties zichtbaar
- Filterable op datum, type, user
- Export mogelijkheid

**Acceptance Criteria:**
- [ ] Insights pagina met alle metrics
- [ ] Grafieken voor trends
- [ ] Audit log doorzoekbaar
- [ ] Export naar CSV

---

## FASE 5: KEUKEN MODULE
Status: Nog te starten

### 5.1 MEP Taken
- [ ] MEP tasks tabel
- [ ] Templates per dag/shift
- [ ] Check-off functionaliteit
- [ ] Dagelijkse takenlijst

### 5.2 Halffabricaten
- [ ] Overzicht alle halffabricaten
- [ ] Detail pagina met ingrediënten
- [ ] Bereidingswijze
- [ ] Kostprijs berekening

### 5.3 Recepten
- [ ] Recepten bibliotheek
- [ ] Recept detail (ingrediënten, stappen)
- [ ] Schalen naar porties
- [ ] Kostprijs per portie

### 5.4 Ingrediënten
- [ ] Ingrediënten database
- [ ] Leverancier koppeling
- [ ] Prijzen bijhouden
- [ ] Allergenen

### 5.5 Kostprijzen
- [ ] Overzicht kostprijzen
- [ ] Food cost percentage
- [ ] Marges

### 5.6 Relaties
- [ ] Recepten ↔ Halffabricaten
- [ ] Halffabricaten ↔ Ingrediënten
- [ ] Ingrediënten ↔ Leveranciers

---

## FASE 6: KAARTBEHEER MODULE
Status: Nog te starten

### 6.1 Gerechten
- [ ] Gerechten overzicht
- [ ] Gerecht detail (recept link, prijs, allergenen)
- [ ] Categorieën beheer

### 6.2 Menu's
- [ ] Menu samenstellen
- [ ] Seizoensmenu's
- [ ] Lunch/diner varianten

### 6.3 Menu Engineering
- [ ] Populariteit analyse
- [ ] Winstgevendheid matrix
- [ ] Aanbevelingen

---

## FASE 7: OVERIGE MODULES
Status: Nog te starten

### 7.1 Service Module
- [ ] Tafelbeheer
- [ ] Bestellingen
- [ ] Afrekenen

### 7.2 Inkoop Module
- [ ] Leveranciers beheer
- [ ] Bestellijsten
- [ ] Voorraad

### 7.3 Settings
- [ ] Restaurant profiel
- [ ] Team/gebruikers
- [ ] Integraties
- [ ] Voorkeuren

### 7.4 Nesto Assistant (Signaal-gedreven Beslissingsondersteuner)
Status: Fase 1 Compleet

> Zie `docs/ASSISTANT_VISION.md` voor complete productvisie.

**Kernprincipe:** De Assistant is een signaal-gedreven beslissingsondersteuner, 
geen chatbot. Spreekt alleen bij impact + handelingsruimte + juiste timing.

---

#### Architectuur Lagen

| Laag | Type | Bron | Logica |
|------|------|------|--------|
| 1 | Signals | Live data | Rule-based, deterministisch |
| 2 | Insights | Gecombineerde signals | Weighted rules + thresholds |
| 3 | Guidance | Insights + patronen | LLM met strikte constraints |

---

#### Assistant Modules

| Module | Voorbeeld Signals | Voorbeeld Insights |
|--------|-------------------|-------------------|
| Reserveringen | Annuleringen, no-shows, wachtlijst | Overboeking risico, lege shift |
| Keuken | MEP-taken open, voorraad laag | Keuken niet ready voor piek |
| Revenue | Omzet vandaag, gemiddelde besteding | Revenue under target |
| Configuratie | Tafels niet in area, lege tafelgroepen | Incomplete setup |

---

#### 7.4.1 Fase 1: Signals Only ✅ COMPLEET
Status: Afgerond (10-11 januari 2026)

**Wat is gedaan:**

**Types & Model (`src/types/assistant.ts`):**
- [x] `AssistantItem` interface met unified model:
  - `id: string` - Unieke identifier
  - `kind: 'signal' | 'insight'` - Type item
  - `module: 'reserveringen' | 'keuken' | 'revenue' | 'configuratie'`
  - `severity: 'error' | 'warning' | 'info' | 'ok'`
  - `title: string` - Korte beschrijving
  - `message?: string` - Optionele details
  - `created_at: string` - ISO timestamp
  - `action_path?: string` - Navigatie bij actie
  - `source_ids?: string[]` - Voor insights: onderliggende signals
  - `actionable?: boolean` - Expliciete actie-markering
  - `priority?: number` - Sorteer prioriteit (laagste eerst)

**Datetime Helper (`src/lib/datetime.ts`):**
- [x] `formatDateTimeCompact(iso: string): string`
  - Vandaag: "14:30"
  - Gisteren: "Gisteren 14:30"
  - Ouder: "8 jan 14:30"

**Mock Data (`src/data/assistantMockData.ts`):**
- [x] 10 voorbeelditems met variatie in:
  - Severity (error, warning, info, ok)
  - Module (alle 4)
  - Kind (signal, insight)
  - Actionable (true/false voor filter testing)
  - Timestamps (variërend van 30 min tot 2 dagen geleden)

**UI Components (`src/components/assistant/`):**
- [x] `AssistantItemCard.tsx`:
  - Severity iconen: AlertCircle (error), AlertTriangle (warning), Info (info), CheckCircle (ok)
  - Icon achtergrond cirkels: `bg-destructive/10`, `bg-warning/10`, etc.
  - Module badges met kleur per module:
    - Reserveringen: `primary` (teal)
    - Keuken: `warning` (oranje)
    - Revenue: `success` (groen)
    - Configuratie: `default` (grijs)
  - Insight badge met Lightbulb icoon
  - Clickable bij aanwezigheid `action_path`
  - Timestamp via `formatDateTimeCompact()`
- [x] `AssistantFilters.tsx`:
  - Module filter pills (outline style, `bg-primary/10` active)
  - "Alleen actie" toggle (filtert op `actionable === true`)
  - Result counter: "X van Y signalen"
  - Container met `bg-secondary/50`
- [x] `index.ts`: Barrel exports

**Assistent Pagina (`src/pages/Assistent.tsx`):**
- [x] State management: `activeModule`, `onlyActionable`
- [x] Sorting logica (in `useMemo`):
  1. `priority` (laagste eerst, undefined naar einde)
  2. `severity` (error=0, warning=1, info=2, ok=3)
  3. `created_at` (newest first, DESC)
- [x] Sectie headers:
  - "Aandacht vereist" (actionable items)
  - "Ter info" (informatieve items)
- [x] EmptyState: "Alles onder controle"

**Navigatie:**
- [x] Route `/assistent` in `App.tsx`
- [x] Menu enabled in `src/lib/navigation.ts`

**Design Patterns:**
- Enterprise calm density (p-4 padding)
- Bestaande color tokens (geen custom border kleuren)
- Consistent met rest van Nesto design system

---

#### 7.4.2 Fase 2: Live Signals ⏳ NOG TE STARTEN
Status: Wacht op module data

**Doel:** Rule-based signals genereren uit live data

**Database (optioneel):**
- [ ] `assistant_signals` tabel voor persistentie
- [ ] Of: realtime berekening via hooks (geen persistentie)

**Hooks per module:**
- [ ] `useReservationSignals()`:
  - Annuleringen vandaag (count > 2)
  - No-show ratio deze week (> 10%)
  - Wachtlijst entries (count > 0)
  - Pacing vs capaciteit check
- [ ] `useKitchenSignals()`:
  - Open MEP-taken (count > 0 AND shift < 2h)
  - Voorraad onder minimum
  - Verlopen halffabricaten
- [ ] `useConfigSignals()`:
  - Tafels niet in area (unassigned > 0)
  - Lege tafelgroepen (members = 0)
  - Shift zonder pacing-limiet
- [ ] `useRevenueSignals()`:
  - Omzet vandaag
  - Gemiddelde besteding
  - Tafeltijd afwijking (> 15%)

**Signal Rules Engine:**
- [ ] Thresholds configureerbaar per locatie
- [ ] Cooldown van 4 uur per signal type
- [ ] Prioriteit berekening op basis van impact

**Acceptance Criteria:**
- [ ] Signals worden realtime berekend uit live data
- [ ] Geen "noise" - alleen significante signalen
- [ ] Cooldown voorkomt herhaalde dezelfde signals
- [ ] Mock data vervangen door live hooks

---

#### 7.4.3 Fase 3: Insights ⏳ NOG TE STARTEN
Status: Wacht op Fase 2

**Doel:** Betekenis en impact door signals te combineren

**Insight Derivation Logic:**
```
Signal: pacing > capacity
Signal: shift = "diner"
Signal: time_until_shift < 2h
→ Insight: "Overboeking risico voor diner" (severity: error)
```

**Insight Types:**
- [ ] Overboeking risico (pacing + capaciteit + tijd)
- [ ] Keuken niet ready voor piek (MEP-taken + shift timing)
- [ ] Lege shift warning (bookings < 30% capacity)
- [ ] High no-show impact (no-shows × gemiddelde besteding)
- [ ] Incomplete setup (blocking configuration issues)

**UI Updates:**
- [ ] Insights prominenter dan signals (visuele hiërarchie)
- [ ] `source_ids` clickable (toon onderliggende signals)
- [ ] Urgentie-classificatie met iconen en kleuren
- [ ] Insight count in page header

**Deduplicatie:**
- [ ] Geen dubbele insights voor zelfde combinatie
- [ ] Insight vervangt onderliggende signals in "Aandacht vereist"

**Acceptance Criteria:**
- [ ] Insights worden correct afgeleid uit signal combinaties
- [ ] Weighted rules voor prioritering
- [ ] Insights tonen gerelateerde signals
- [ ] Aparte insight-only view optie

---

#### 7.4.4 Fase 4: Guidance (AI) ⏳ TOEKOMSTIG
Status: Wacht op Fase 3 + voldoende data

**Doel:** Optionele AI-suggesties bij high-impact insights

**Strikte Regels:**
- Alleen bij herhaalde patronen (3+ dagen)
- Max 1 suggestie per insight
- Nooit imperatief ("Doe X"), altijd optioneel ("Overweeg X")
- Operator kan guidance permanent uitschakelen

**Techniek:**
- [ ] LLM integratie via Lovable AI (geen API key nodig)
- [ ] Strikte prompt constraints
- [ ] Context: insight + historische patronen
- [ ] Max 1 zin output

**Guidance per Module:**

| Module | Guidance Toegestaan | Reden |
|--------|---------------------|-------|
| Reserveringen | Ja, bij herhaalde patronen (3+ dagen) | Operationeel advies mogelijk |
| Keuken | Nee | Te context-specifiek, keuken kent eigen proces |
| Revenue | Ja, bij 7+ dagen patroon | Financiële trends |
| Configuratie | Nee | Setup is bewuste keuze van operator |

**UI:**
- [ ] Guidance als subtiele suggestie onder insight
- [ ] "Negeer" en "Toegepast" feedback knoppen
- [ ] Settings toggle: "Toon AI suggesties"

**Acceptance Criteria:**
- [ ] Guidance alleen bij gevalideerde insights
- [ ] Opt-out per gebruiker in settings
- [ ] Nooit automatische acties
- [ ] Feedback loop (dismissed/acted) voor learning

---

#### 7.4.5 Fase 5: Learning & Personalisatie ⏳ TOEKOMSTIG
Status: Wacht op 3+ maanden data

**Doel:** Historische patronen en personalisatie

**Voorwaarden:**
- Minimaal 3 maanden operationele data
- Gevalideerde baseline modellen
- Opt-in voor peer comparison

**Features:**
- [ ] Historische trend analyse per locatie
- [ ] Locatie-specifieke thresholds (leren van operator gedrag)
- [ ] Dismissed signals tracking (niet meer tonen)
- [ ] Acted-upon signals tracking (prioriteit verhogen)
- [ ] Seizoenspatronen herkenning
- [ ] Dag-van-de-week patronen

**Peer Comparison (opt-in):**
- [ ] Geanonimiseerde vergelijking met vergelijkbare locaties
- [ ] "Boven/onder gemiddelde" indicators
- [ ] Nooit specifieke concurrentie data

**Acceptance Criteria:**
- [ ] Learning alleen na opt-in
- [ ] Duidelijke privacy disclosure
- [ ] Operator kan learned thresholds resetten
- [ ] Historische data exporteerbaar

---

#### UI & Presentatie

**Waar de Assistant zichtbaar is:**

| Locatie | Type | Inhoud |
|---------|------|--------|
| `/assistent` | Volledig overzicht | Alle signals en insights met filters |
| Dashboard widget | Compact | Top 3 meest urgente items |
| Module header | Inline signal | Badge met count (bijv. "3" in Reserveringen) |
| Settings aside | Config signals | "2 tafels niet toegewezen" |

**Visuele Hiërarchie:**

| Severity | Kleur Token | Icoon | Betekenis |
|----------|-------------|-------|-----------|
| error | `text-destructive` / `bg-destructive/10` | AlertCircle | Actie vereist |
| warning | `text-warning` / `bg-warning/10` | AlertTriangle | Let op |
| info | `text-muted-foreground` | Info | Informatief |
| ok | `text-success` / `bg-success/10` | CheckCircle | Alles goed |

**Wanneer de Assistant STIL blijft:**
- Alles op orde (geen nieuws is goed nieuws)
- Buiten openingsuren
- Geen handelingsruimte (te laat om iets te doen)
- Recent getoond (4 uur cooldown per insight-type)
- Operator heeft guidance uitgeschakeld

---

#### Wat de Assistant NIET doet

**Expliciet buiten scope:**

| Niet | Waarom |
|------|--------|
| Chatinterface | Horeca heeft geen tijd voor conversatie |
| Proactieve tips | "Wist je dat..." is noise |
| Uitleg hoe horeca werkt | Operator weet dit beter |
| Automatische acties | Operator blijft in control |
| Vergelijking met concurrentie | Geen externe data |
| Voorspellingen zonder basis | Geen "AI denkt dat..." |

**Bewust niet geautomatiseerd:**

| Functie | Reden |
|---------|-------|
| Reserveringen afwijzen | Gastenrelatie is menselijk |
| Personeel inroosteren | Te veel onzichtbare factoren |
| Menu aanpassen | Creatieve keuze van kok |
| Prijzen wijzigen | Strategische beslissing |

---

#### Gerelateerde Documentatie

| Document | Inhoud |
|----------|--------|
| `docs/ASSISTANT_VISION.md` | Complete productvisie met voorbeelden |
| `src/types/assistant.ts` | TypeScript interfaces |
| `src/data/assistantMockData.ts` | Mock data voor development |

### 7.5 Takeaway
- [ ] Online bestellen
- [ ] Order management

### 7.6 Finance
- [ ] Omzet overzichten
- [ ] Rapporten

---

## FASE 8: ADMIN PANEL (PLATFORM)
Status: Nog te starten

### 8.1 Admin Layout
- [ ] Aparte admin routing (/admin/...)
- [ ] Admin sidebar
- [ ] Admin-only authenticatie

### 8.2 Tenant Management
- [ ] Alle restaurants overzicht
- [ ] Restaurant detail/bewerken
- [ ] Nieuwe tenant aanmaken
- [ ] Tenant deactiveren

### 8.3 User Management
- [ ] Alle gebruikers overzicht
- [ ] User detail
- [ ] Wachtwoord reset (admin)
- [ ] Account status

### 8.4 Analytics
- [ ] Platform statistieken
- [ ] Gebruikers groei
- [ ] Activiteit metrics
- [ ] Revenue dashboard

### 8.5 Feature Flags
- [ ] Features aan/uit per tenant
- [ ] Beta features
- [ ] A/B testing

### 8.6 Support
- [ ] Support tickets overzicht
- [ ] Ticket behandeling
- [ ] Communicatie met tenants

---

## FASE 9: BILLING & SUBSCRIPTIONS
Status: Nog te starten

### 9.1 Stripe Integratie
- [ ] Stripe account setup
- [ ] API keys configuratie

### 9.2 Pricing Plans
- [ ] Plan definities
- [ ] Feature tiers
- [ ] Pricing pagina

### 9.3 Checkout
- [ ] Plan selectie
- [ ] Checkout flow
- [ ] Betaling verwerking

### 9.4 Billing Portal
- [ ] Subscription beheer
- [ ] Plan wijzigen
- [ ] Annuleren

### 9.5 Trial & Limits
- [ ] Trial periode
- [ ] Usage tracking
- [ ] Limiet waarschuwingen

### 9.6 Administratie
- [ ] Facturen
- [ ] Betaalgeschiedenis
- [ ] Invoice download

---

## FASE 10: MARKETING & PUBLIC PAGES
Status: Nog te starten

### 10.1 Landing Page
- [ ] Hero sectie
- [ ] Features overzicht
- [ ] Social proof/testimonials
- [ ] CTA's

### 10.2 Informatieve Pagina's
- [ ] Features detail pagina's
- [ ] Pricing pagina
- [ ] Over ons
- [ ] Contact

### 10.3 Content
- [ ] Blog/nieuws
- [ ] Case studies
- [ ] FAQ

### 10.4 SEO & Analytics
- [ ] Meta tags
- [ ] Open Graph
- [ ] Google Analytics
- [ ] Sitemap

---

## FASE 11: SUPPORT & HELPDESK
Status: Nog te starten

### 11.1 Help Center
- [ ] Kennisbank/documentatie
- [ ] Categorieën
- [ ] Zoekfunctie
- [ ] Artikelen

### 11.2 In-app Help
- [ ] Tooltips
- [ ] Onboarding tour
- [ ] Contextual help

### 11.3 Contact & Tickets
- [ ] Support formulier
- [ ] Ticket systeem
- [ ] Status tracking

### 11.4 Live Support
- [ ] Chat widget
- [ ] Beschikbaarheid

### 11.5 Updates
- [ ] Changelog pagina
- [ ] Release notes
- [ ] In-app notificaties

---

## FASE 12: POLISH & LAUNCH
Status: Nog te starten

### 12.1 Performance
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Image optimalisatie
- [ ] Bundle size

### 12.2 Error Handling
- [ ] Error boundaries
- [ ] User-friendly error pages
- [ ] Error logging

### 12.3 Accessibility
- [ ] ARIA labels
- [ ] Keyboard navigatie
- [ ] Screen reader support
- [ ] Kleurcontrast check

### 12.4 Testing
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] User testing

### 12.5 Security
- [ ] Security audit
- [ ] Penetration testing
- [ ] GDPR compliance

### 12.6 Launch
- [ ] Custom domain
- [ ] SSL certificaat
- [ ] Monitoring setup
- [ ] Backup strategie
- [ ] Soft launch
- [ ] Public launch

---

## TECHNISCHE ONTWERPREGELS (doorlopend)

Deze regels gelden voor ALLE fasen:

1. **Availability moet deterministisch zijn** - Zelfde input = zelfde output, altijd
2. **Geen silent failures bij payment** - Altijd error handling en feedback
3. **Waitlist + squeeze mogen nooit dubbelboeken** - Atomische transacties
4. **Operator override = toegestaan maar gelogd** - Altijd in audit log
5. **Elke tijd die wordt getoond moet uitlegbaar zijn** - Reason codes beschikbaar
6. **15-minuten slots intern** - UI kan anders presenteren, engine werkt met 15 min

---

## TECHNISCHE NOTITIES

### Database Structuur
Zie `docs/DATABASE.md` voor complete schema documentatie.

### Authenticatie Flow
1. User registreert via /auth
2. Profile wordt automatisch aangemaakt via trigger
3. Org membership + location role moet handmatig worden toegevoegd
4. Bij login wordt get_user_context() aangeroepen voor permissions

### Navigation Gating
Menu items worden gefilterd op:
1. Module entitlement (location_entitlements.enabled)
2. Root view permission (bijv. kitchen.view)

### Device Modes (Toekomstig)
- manager_desktop: volledige UI
- service_tablet: reserveringen focus
- kitchen_tablet: keuken focus
- employee_portal: HR documenten

---

## SESSIE LOG

### 10-11 januari 2026
- **Fase 7.4.1 Nesto Assistant - Signals UI COMPLEET**
- Productvisie document aangemaakt: `docs/ASSISTANT_VISION.md`
- Types:
  - `AssistantItem` interface met kind, severity, module, actionable, priority
  - `AssistantSeverity`, `AssistantModule`, `AssistantKind` types
- Datetime helper: `formatDateTimeCompact()` in `src/lib/datetime.ts`
- Mock data: 10 items met variatie in severity, module, actionable
- UI Components:
  - `AssistantItemCard` met severity iconen, module badges, insight indicator
  - `AssistantFilters` met module pills, "Alleen actie" toggle, result counter
- Assistent pagina (`/assistent`):
  - Sorting: priority → severity → newest
  - Sectie headers: "Aandacht vereist" / "Ter info"
  - EmptyState: "Alles onder controle"
- Enterprise styling upgrade:
  - Calm density (p-4 padding)
  - Icon achtergrond cirkels (bg-{severity}/10)
  - Module-specifieke badge kleuren
  - Filter container met bg-secondary/50
- Navigatie enabled in sidebar
- Volgende: Dashboard insights widget of Fase 4.2.C Availability Rules

### 9 januari 2026
- **B2 Tables Reorder COMPLEET**
- SortableTableRow component met inline drag (hide-original pattern)
- Sortable column headers: Prio, Naam, Min, Max, Online
- DnD alleen actief bij "Prio asc" sortering (voorkomt verwarring)
- Tooltip op disabled handle: expliciete feedback waarom drag niet werkt
- Kolom herschikking:
  - Online toggle verplaatst naar rechts (minder prominent)
  - Groepen kolom hersteld (badge met aantal gekoppelde tafelgroepen)
- Grid template: `[32px_40px_1fr_80px_80px_40px_48px_32px]`
- Design beslissing: geen up/down fallback knoppen voor tables
- Volgende: 4.2.C Availability Rules per Tafel

### 7 januari 2026
- **B1 Areas Reorder COMPLEET** - klaar voor test/polish
- Database RPC `reorder_areas` met volledige guards:
  - Auth check, concurrency lock, no duplicate IDs
  - All active IDs present check, idempotency check
  - Atomic update via UNNEST WITH ORDINALITY
- `useReorderAreas` hook met ID-based optimistic updates + rollback
- Centralized query keys (`src/lib/queryKeys.ts`)
- SortableAreaCard component met inline drag (geen DragOverlay)
- DnD sensoren geconfigureerd (Pointer, Touch, Keyboard)
- Modifiers: restrictToVerticalAxis, restrictToParentElement
- UX polish: inline drag beweging, subtiele shadow tijdens drag
- Volgende: B2 Tables Reorder binnen areas

### 4 januari 2026
- Fase 4.2.A COMPLEET: CRUD UI voor Areas, Tables, TableGroups
- Settings UI componenten gebouwd:
  - LocationSettingsCard met autosave (multi-table, auto-assign, duration, cutoff, buffer)
  - AreasSection + AreaCard + AreaModal (met fill order, up/down reordering)
  - TableRow + TableModal + BulkTableModal + RestoreTableModal
  - TableGroupsSection + TableGroupCard + TableGroupModal
- Design System fixes:
  - Toast notificaties: Nesto Polar styling hersteld (3px left-border, bottom-right, unstyled: true)
  - Modal close button: hideCloseButton prop toegevoegd aan DialogContent
  - Toast feedback strategie: inline indicator voor autosave, toast voor expliciete acties
  - Documentatie: docs/design/TOAST_NOTIFICATIONS.md aangemaakt
- Volgende sessie: Fase 4.2.B - Reorder UI met drag-and-drop
  - B1: Areas drag-and-drop + reorder_areas RPC
  - B2: Tables drag-and-drop + reorder_tables RPC

### 3 januari 2026 (avond)
- Fase 4.2 gestart: Areas, Tables, TableGroups
- `useAreasWithTables` hook geoptimaliseerd:
  - Fix: Set-based filtering voor groupCounts (verwijdert `tables!inner` dependency)
  - Fix: O(n+m) mapping via tablesByArea Map
  - includeInactive werkt nu correct automatisch
- Volgende sessie: Settings UI voor Areas CRUD

### 3 januari 2026 (ochtend)
- Fase 4.1 SaaS Foundation geïmplementeerd
- 16 database tabellen aangemaakt
- Complete RLS policies
- Auth context en user context
- Navigation builder
- Documentatie aangemaakt
- Roadmap volledig herschreven met complete 15-fase Reserveringen specificatie
