# NESTO PROJECT ROADMAP
Laatst bijgewerkt: 3 januari 2026 (avond)

## PROJECT OVERZICHT
Nesto is een SaaS platform voor horeca management met modules voor reserveringen, keuken, kaartbeheer, en meer. Multi-tenant architectuur waarbij elke organization meerdere locations kan hebben, met per-location billing en module entitlements.

---

## HUIDIGE STATUS

### AFGEROND
- ✅ Fase 1: Design System
- ✅ Fase 2: Navigatie & Layout  
- ✅ Fase 3: UI Patterns
- ✅ Fase 4.1: SaaS Foundation

### IN UITVOERING
- 🔄 Fase 4.2: Areas, Tables, TableGroups CRUD

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

### 4.2 Areas, Tables, TableGroups CRUD
Status: 🔄 In uitvoering

**Doel:** Volledige tafelbeheer UI bouwen die de mock data vervangt

**Database Schema:**
- [x] `areas` - Zones met sort order, fill_order, is_active
- [x] `tables` - Tafels met min/max capacity, online bookable, is_joinable, priorities
- [x] `table_groups` - Combinaties met auto-calculated capacities
- [x] `table_group_members` - Koppeling met sort_order

**Gedaan:**
- [x] Database schema volledig (4 tabellen + RLS + triggers)
- [x] `useAreasWithTables` hook geoptimaliseerd:
  - Set-based filtering voor groupCounts (geen `tables!inner` dependency)
  - O(n+m) mapping via tablesByArea Map i.p.v. O(n*m)
  - includeInactive parameter werkt correct door Set filtering
- [x] `useAreasForGrid` en `useAreasForSettings` convenience hooks
- [x] Grid View haalt tafels uit database

**Nog te doen:**
- [ ] Settings pagina "Tafels & Zitplaatsen" met:
  - [ ] Areas CRUD (toevoegen, bewerken, verwijderen, volgorde aanpassen)
  - [ ] Tables CRUD per area (nummer, min/max capaciteit, online bookable toggle)
  - [ ] TableGroups beheer (welke tafels mogen gecombineerd worden)
  - [ ] Multi-table reservations toggle per locatie
  - [ ] Fill order instelling per area
  - [ ] Auto-assign toggle

**Volgende stap:** Settings UI voor Areas CRUD bouwen

---

### 4.3 Shifts + Exceptions + Time Intervals
Status: Nog te starten

**Doel:** Configureerbare shifts en tijdintervallen

**Database Schema:**
- [ ] `shifts` - Shift definities met dagen en tijden
- [ ] `shift_exceptions` - Gesloten datums, speciale events
- [ ] `time_settings` - Interval configuratie (15/30/60 min)

**Acceptance Criteria:**
- [ ] Settings pagina "Shifts" met:
  - [ ] Shift CRUD (naam, dagen, start/eindtijd, kleur)
  - [ ] Arrival interval per shift (15/30/60 min) - configureerbaar!
  - [ ] Pacing per shift: max arrivals en max covers per interval
  - [ ] Exceptions: gesloten datums, gesloten shifts, speciale events
- [ ] Grid View respecteert gekozen interval (niet hardcoded 15 min)
- [ ] Pacing row past zich aan aan shift settings

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
  - [ ] SqueezePolicy: enabled, squeeze duration, max per shift

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

### 7.4 Assistent (AI)
- [ ] AI chat interface
- [ ] Recept suggesties
- [ ] Vraag & antwoord

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
