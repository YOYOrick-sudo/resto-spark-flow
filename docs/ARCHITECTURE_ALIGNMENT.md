# NESTO ARCHITECTURE ALIGNMENT
> Versie 1.0 — 11 februari 2026
> Doel: Eén samenhangende referentie voor de reserveringskern (4.4–4.10) zodat Lovable exact weet wat te bouwen.

---

## 1. Het Totaalplaatje: Hoe Alles Samenwerkt

De reserveringsmodule draait om vijf concepten die samen de volledige boekingservaring bepalen:

```
SHIFTS (wanneer is het restaurant open?)
    ↓ gekoppeld via
SHIFT_TICKETS (welke producten bied je aan per shift?)
    ↓ verwijst naar
TICKETS (wat boekt de gast? — het "product")
    ↓ heeft een
POLICY_SET (welke regels gelden? — betaling, annulering, no-show, reconfirmatie)
    ↓ en de beschikbaarheid wordt berekend door
AVAILABILITY ENGINE (deterministische functie die alles combineert)
```

### De Operator Denkt Zo:
> "Tijdens mijn **diner shift** bied ik twee **tickets** aan: Regular Dinner (2u, €0 deposit) en Chef's Table (3u, €25 deposit p.p.). Regular kan in het **restaurant en terras**, Chef's Table alleen in de **privézaal**. Per 15 minuten mogen er max **12 gasten aankomen** en max **72 gasten totaal zitten**."

Dat vertaalt naar:
- 1 shift (Diner, 18:00–23:00)
- 2 tickets (Regular, Chef's Table) elk met eigen policy_set
- 2 shift_tickets (koppeling shift→ticket met area-toewijzing en pacing)
- Availability engine leest dit allemaal en berekent beschikbare slots

---

## 2. Database Schema — Alle Tabellen

### 2.1 `shifts` ✅ GEBOUWD (Fase 4.3.A — GELOCKED)

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid PK | |
| location_id | uuid FK → locations | |
| name | text | "Lunch", "Diner", "Brunch" |
| short_name | text | "L", "D", "B" (voor compacte UI) |
| start_time | TIME | 18:00 |
| end_time | TIME | 23:00 |
| days_of_week | int[] | ISO: [1,2,3,4,5] = ma-vr |
| arrival_interval_minutes | int | 15, 30, of 60 |
| color | text | HEX kleurcode |
| sort_order | int | Volgorde in UI |
| is_active | boolean | Soft delete |
| created_at / updated_at | timestamptz | |

### 2.2 `shift_exceptions` ✅ GEBOUWD (Fase 4.3.A — GELOCKED)

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid PK | |
| location_id | uuid FK → locations | |
| shift_id | uuid FK → shifts, NULLABLE | NULL = location-wide (hele dag dicht) |
| exception_date | date | De datum |
| exception_type | text | 'closed', 'modified', 'special' |
| override_start_time | TIME, nullable | Alleen bij 'modified' |
| override_end_time | TIME, nullable | Alleen bij 'modified' |
| label | text, nullable | "Kerstavond", "Privé-event" |
| notes | text, nullable | Interne notities |
| created_at / updated_at | timestamptz | |

**Effectief schema:** RPC `get_effective_shift_schedule(location_id, date)` combineert shifts + exceptions tot het werkelijke schema voor een specifieke dag.

### 2.3 `tickets` 🆕 TE BOUWEN (Fase 4.4)

Het ticket is het **product** dat de gast boekt. Niet te verwarren met een event-ticket — het is het type reservering.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid PK | |
| location_id | uuid FK → locations | |
| name | text | "Regular Dinner", "Tasting Menu", "Brunch" |
| short_name | text | "REG", "TASTING", "BRUNCH" |
| description | text, nullable | Zichtbaar voor gast in widget |
| duration_minutes | int | Standaard verblijfsduur (bijv. 120) |
| buffer_minutes | int, default 0 | Opruimtijd na vertrek |
| min_party_size | int, default 1 | |
| max_party_size | int, default 20 | |
| policy_set_id | uuid FK → policy_sets | Welke regels gelden |
| **Booking Window** | | |
| booking_min_advance_minutes | int, default 60 | Min. X min van tevoren boeken |
| booking_max_advance_days | int, default 90 | Max. X dagen vooruit boeken |
| booking_min_advance_large_party_minutes | int, nullable | Override voor grote groepen |
| large_party_threshold | int, default 6 | Vanaf welke groepsgrootte |
| **Squeeze** | | |
| squeeze_enabled | boolean, default false | Mag dit ticket gesqueezed worden? |
| squeeze_duration_minutes | int, nullable | Verkorte duur bij squeeze |
| squeeze_gap_minutes | int, default 0 | Buffer na squeeze |
| squeeze_to_fixed_end_time | TIME, nullable | Squeeze naar vaste eindtijd (bijv. shift-einde) |
| squeeze_limit_per_shift | int, nullable | Max squeeze boekingen per shift |
| **Overig** | | |
| color | text, nullable | Kleur in UI (fallback naar shift-kleur) |
| sort_order | int | Volgorde in widget |
| is_active | boolean | Soft delete |
| is_default | boolean, default false | Standaard ticket (pre-selectie in widget) |
| created_at / updated_at | timestamptz | |

**Unique constraint:** (location_id, LOWER(name)) — geen dubbele namen.

### 2.4 `policy_sets` 🆕 TE BOUWEN (Fase 4.4)

Een herbruikbare set regels. Eén policy_set kan aan meerdere tickets gekoppeld zijn.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid PK | |
| location_id | uuid FK → locations | |
| name | text | "Standaard", "Fine Dining", "Brunch Casual" |
| **Payment Policy** | | |
| payment_type | text | 'none', 'deposit_pp', 'full_prepay_pp' |
| payment_amount | numeric, nullable | Bedrag per persoon (bij deposit/prepay) |
| **Cancellation Policy** | | |
| cancel_free_hours | int, default 24 | Gratis annuleren tot X uur voor reservering |
| cancel_refund_pct | int, default 100 | Terugbetaling % bij annulering na deadline |
| **No-Show Policy** | | |
| noshow_mark_after_minutes | int, default 15 | Markeer als no-show na X min |
| noshow_keep_deposit | boolean, default true | Deposit behouden bij no-show |
| **Reconfirm Policy** | | |
| reconfirm_enabled | boolean, default false | Reconfirmatie vereisen? |
| reconfirm_hours_before | int, default 24 | Hoe lang voor reservering |
| reconfirm_required | boolean, default false | true = auto-cancel bij geen reconfirmatie |
| **Overig** | | |
| is_active | boolean | |
| created_at / updated_at | timestamptz | |

**Unique constraint:** (location_id, LOWER(name))

**Waarom apart van tickets?** Omdat dezelfde regels op meerdere tickets kunnen gelden. "Fine Dining regels" (€25 deposit, 48u annulering) gelden misschien voor zowel het Tasting Menu als het Chef's Table ticket.

### 2.5 `shift_tickets` 🆕 TE BOUWEN (Fase 4.4)

**Dit is de cruciale koppeltabel.** Het bepaalt welk ticket beschikbaar is in welke shift, in welke gebieden, en met welke pacing.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid PK | |
| location_id | uuid FK → locations | Denormalisatie voor RLS |
| shift_id | uuid FK → shifts | |
| ticket_id | uuid FK → tickets | |
| **Area Toewijzing** | | |
| area_ids | uuid[], default '{}' | Welke areas beschikbaar voor dit ticket. Leeg = alle areas. |
| **Pacing (per interval)** | | |
| pacing_covers_limit | int, nullable | Max covers per arrival_interval. NULL = geen limiet. |
| pacing_arrivals_limit | int, nullable | Max aankomsten per interval. NULL = geen limiet. |
| **Capaciteit** | | |
| max_covers_total | int, nullable | Totaal max covers voor dit ticket in deze shift. NULL = geen limiet. |
| **Overig** | | |
| is_active | boolean | |
| sort_order | int | Volgorde in shift-wizard |
| created_at / updated_at | timestamptz | |

**Unique constraint:** (shift_id, ticket_id) — elk ticket max 1x per shift.

**Voorbeeld data:**

| Shift | Ticket | Areas | Pacing | Max Covers |
|-------|--------|-------|--------|------------|
| Diner | Regular | Restaurant, Terras | 12 covers/15min | NULL (onbeperkt) |
| Diner | Chef's Table | Privézaal | 4 covers/15min | 12 per shift |
| Lunch | Brunch | Restaurant, Terras | 8 covers/15min | 40 per shift |

### 2.6 `policy_sets` → Relatie met Tickets

```
policy_sets (1) ←── (N) tickets
```

Eén policy_set kan door meerdere tickets gebruikt worden. Wijzig je de policy_set, dan veranderen de regels voor alle gekoppelde tickets. Dit is bewust — het voorkomt dat operators dezelfde regels op 5 plekken moeten aanpassen.

---

## 3. De Volledige Keten: Van Gast tot Reservering

### 3.1 Guest Widget Flow (wat de gast ziet)

```
Stap 1: Gast selecteert datum + party_size
         ↓
Stap 2: Systeem bepaalt welke TICKETS beschikbaar zijn
         → Filter: tickets waar party_size binnen min/max valt
         → Filter: tickets die gekoppeld zijn aan actieve shifts op deze dag
         → Filter: booking window check (niet te ver vooruit, niet te laat)
         ↓
Stap 3: Per ticket, per shift → AVAILABILITY ENGINE berekent tijdslots
         → Input: shift_tickets (areas, pacing), tafels, bestaande reserveringen
         → Output: beschikbare tijden met type (normal / squeeze)
         ↓
Stap 4: Gast kiest tijd + ticket
         ↓
Stap 5: Systeem toont POLICIES uit policy_set
         → "Annuleren gratis tot 24u van tevoren"
         → "€25 p.p. aanbetaling vereist"
         ↓
Stap 6: Gast vult gegevens in + betaalt (indien vereist)
         ↓
Stap 7: Reservering aangemaakt met status Draft → Confirmed (of → PendingPayment)
```

### 3.2 Operator Flow (wat de operator ziet)

```
Settings Setup (eenmalig):
  1. Areas + Tafels aanmaken (✅ gebouwd)
  2. Shifts aanmaken met tijden en dagen (✅ gebouwd)
  3. Policy Sets aanmaken (nieuw)
  4. Tickets aanmaken met duration, party size, squeeze settings, policy_set (nieuw)
  5. Shift-Ticket koppeling: welke tickets per shift, welke areas, pacing (nieuw)

Dagelijks Beheer:
  - Grid/List/Timeline view toont reserveringen
  - Per reservering: ticket-type, status, policy-badges
  - Shift-overzicht: totale covers, pacing, squeeze count
  - Exceptions: feestdagen, gesloten dagen, aangepaste tijden
```

---

## 4. Availability Engine — Input/Output Mapping

De engine is een **deterministische functie**: zelfde input = zelfde output. Altijd.

### 4.1 Inputs en Waar Ze Vandaan Komen

| Engine Input | Brontabel | Specifieke kolom(men) |
|---|---|---|
| Datum | Request parameter | — |
| Party size | Request parameter | — |
| Ticket type | Request parameter (of default ticket) | — |
| Shift tijden | `shifts` + `shift_exceptions` via `get_effective_shift_schedule()` | start_time, end_time, arrival_interval_minutes |
| Shift-ticket config | `shift_tickets` | area_ids, pacing_covers_limit, pacing_arrivals_limit, max_covers_total |
| Ticket duration | `tickets` | duration_minutes, buffer_minutes |
| Booking window | `tickets` | booking_min_advance_minutes, booking_max_advance_days, large_party overrides |
| Squeeze settings | `tickets` | squeeze_enabled, squeeze_duration_minutes, squeeze_gap_minutes, squeeze_to_fixed_end_time, squeeze_limit_per_shift |
| Beschikbare tafels | `tables` + `areas` | capacity (min/max), is_active, online_bookable, area toewijzing |
| Tafelgroepen | `table_groups` + `table_group_members` | Gecombineerde capaciteit |
| Tafel availability rules | `table_availability_rules` (4.2.C, optioneel) | Block/allow windows per tafel |
| Bestaande reserveringen | `reservations` | Datum, tijd, party_size, ticket_id, table_id, status |
| Overbooking tolerance | `reservation_settings` of `tickets` | Default 0, instelbaar |

### 4.2 Output per Tijdslot

```typescript
interface SlotResult {
  time: string;              // "18:00", "18:15", "18:30", ...
  available: boolean;
  slot_type: 'normal' | 'squeeze';
  reason_code: string | null;
  // Mogelijke reason_codes:
  //   'available'           — slot is vrij
  //   'tables_full'         — geen passende tafel vrij
  //   'pacing_covers_full'  — covers limiet bereikt in dit interval
  //   'pacing_arrivals_full'— aankomsten limiet bereikt
  //   'max_covers_reached'  — totaal covers voor ticket/shift bereikt
  //   'channel_blocked'     — kanaal niet toegestaan (future)
  //   'cut_off'             — booking window verstreken
  //   'closed'              — shift niet actief op deze dag/tijd
  //   'squeeze_limit'       — squeeze cap bereikt
  //   'overbooking_limit'   — overbooking tolerance overschreden
}
```

### 4.3 Engine Logica (Pseudo-code)

```
FUNCTION check_availability(date, party_size, ticket_id, channel):

  1. RESOLVE effectieve shifts voor deze datum
     → shifts + shift_exceptions → effective_schedule
     → Filter: alleen shifts die dit ticket aanbieden (via shift_tickets)

  2. PER SHIFT, PER TIJDSLOT (elke arrival_interval):

     a. CHECK booking window
        → Te laat? → reason: 'cut_off'
        → Te ver vooruit? → reason: 'cut_off'

     b. CHECK pacing (uit shift_tickets)
        → Tel bestaande reserveringen in dit interval
        → covers >= pacing_covers_limit? → reason: 'pacing_covers_full'
        → arrivals >= pacing_arrivals_limit? → reason: 'pacing_arrivals_full'

     c. CHECK max covers totaal (uit shift_tickets)
        → Tel alle covers voor dit ticket in deze shift
        → >= max_covers_total? → reason: 'max_covers_reached'

     d. CHECK tafelbeschikbaarheid
        → Filter tafels op: area_ids (uit shift_tickets), capacity >= party_size,
          online_bookable, is_active, table_availability_rules
        → Zoek vrije tafel(s) voor [start_time → start_time + duration + buffer]
        → Geen vrije tafel? → reason: 'tables_full'

     e. ALS ALLES VOL → CHECK SQUEEZE (second pass)
        → ticket.squeeze_enabled = true?
        → squeeze_count < squeeze_limit_per_shift?
        → Bereken squeeze_duration (korter) of squeeze_to_fixed_end_time
        → Zoek opnieuw tafels met kortere duration
        → Gevonden? → slot_type: 'squeeze', available: true
        → Niet gevonden? → reason: originele reden uit stap b/c/d

  3. RETURN array van SlotResults, gesorteerd op tijd
     → Normale slots eerst
     → Squeeze slots alleen als er geen normale slots zijn in dat tijdvenster
```

### 4.4 Squeeze als Integraal Onderdeel (NIET als Aparte Fase)

**Beslissing:** Fase 4.12 (Squeeze Logic) wordt **opgeheven** en geïntegreerd:

| Originele 4.12 item | Nieuw thuis | Waarom |
|---|---|---|
| Squeeze velden op ticket | **4.4** (Tickets) | Squeeze is een eigenschap van het ticket |
| Engine markeert squeeze slots | **4.5** (Availability Engine) | Squeeze is de second-pass van dezelfde engine |
| Squeeze badge op reserveringen | **4.7** (Detail Panel) | Badge-systeem zit al in 4.7 |
| Max squeeze per shift | **4.5** (Engine) | Wordt daar gecheckt |
| Guest widget toont squeeze | **4.10** (Guest Widget) | Widget rendering |

**Voordeel:** Geen aparte "squeeze fase" die later moet integreren. Squeeze is gewoon een eigenschap van de availability engine die je aan/uit zet per ticket.

---

## 5. Reservering Status Machine

### 5.1 Statussen en Transities

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
  ┌───────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐ │
  │ Draft │───▶│PendingPayment│───▶│ Confirmed │───▶│  Seated  │─┘
  └───┬───┘    └──────────────┘    └─────┬─────┘    └────┬─────┘
      │                                  │               │
      │         ┌──────────┐             │               ▼
      └────────▶│  Option  │─────────────┤          ┌──────────┐
                └────┬─────┘             │          │Completed │
                     │                   │          └──────────┘
                     ▼                   ▼
               ┌──────────┐        ┌──────────┐
               │Cancelled │        │  NoShow  │
               └──────────┘        └──────────┘
```

### 5.2 Transities met Triggers

| Van | Naar | Trigger | Conditie |
|-----|------|---------|----------|
| Draft | PendingPayment | Auto | payment_type ≠ 'none' |
| Draft | Option | Operator | options_enabled = true |
| Draft | Confirmed | Auto/Operator | payment_type = 'none' OF betaling compleet |
| PendingPayment | Confirmed | Webhook | Stripe payment_intent.succeeded |
| PendingPayment | Cancelled | Auto | Payment timeout (configurable) |
| Option | Confirmed | Gast/Operator | Bevestiging ontvangen |
| Option | Cancelled | Auto | option_expires_at bereikt zonder bevestiging |
| Confirmed | Seated | Operator | Check-in actie |
| Confirmed | NoShow | Auto/Operator | noshow_mark_after_minutes verstreken |
| Confirmed | Cancelled | Gast/Operator | Annulering (policies worden toegepast) |
| Seated | Completed | Operator/Auto | Tafel vrijgegeven / POS rekening betaald |

**Elke transitie:**
1. Valideert of de overgang toegestaan is
2. Schrijft een `audit_log` entry (wie, wat, wanneer)
3. Triggert eventuele messaging (bevestiging, annulering, etc.)
4. Werkt customer stats bij (Feature 1: total_visits, no_show_count)

---

## 6. Reservering Model — Velden

### 6.1 `reservations` 🆕 TE BOUWEN (Fase 4.6)

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid PK | |
| location_id | uuid FK | |
| **Kern** | | |
| customer_id | uuid FK → customers | |
| ticket_id | uuid FK → tickets | Welk product |
| shift_id | uuid FK → shifts | Welke shift (op die dag) |
| **Timing** | | |
| reservation_date | date | |
| start_time | TIME | Aankomsttijd |
| end_time | TIME | Berekend: start_time + duration (of squeeze_duration) |
| **Groep** | | |
| party_size | int | |
| **Tafel** | | |
| table_id | uuid FK → tables, nullable | Kan null zijn tot auto-assign |
| table_group_id | uuid FK → table_groups, nullable | Bij gecombineerde tafels |
| **Status** | | |
| status | text | 'draft', 'pending_payment', 'option', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled' |
| **Boeking** | | |
| channel | text | 'widget', 'phone', 'walk_in', 'google', 'third_party' |
| is_squeeze | boolean, default false | Of dit een squeeze-reservering is |
| **Options** | | |
| option_expires_at | timestamptz, nullable | Wanneer verloopt de optie |
| **Betaling** | | |
| payment_status | text, nullable | 'none', 'pending', 'paid', 'refunded', 'partial_refund' |
| payment_intent_id | text, nullable | Stripe reference |
| payment_amount | numeric, nullable | Betaald bedrag |
| **Reconfirmatie** | | |
| reconfirm_sent_at | timestamptz, nullable | Wanneer reconfirmatie verstuurd |
| reconfirmed_at | timestamptz, nullable | Wanneer gast bevestigde |
| **AI (Feature 1)** | | |
| no_show_risk_score | float, nullable | 0.0–1.0 |
| risk_factors | jsonb, nullable | Breakdown per factor |
| **Overig** | | |
| guest_notes | text, nullable | Notities van gast |
| internal_notes | text, nullable | Notities van operator |
| badges | jsonb, default '[]' | ['vip', 'allergy_nuts', 'wheelchair', etc.] |
| cancelled_at | timestamptz, nullable | |
| cancelled_by | text, nullable | 'guest', 'operator', 'system' |
| cancellation_reason | text, nullable | |
| seated_at | timestamptz, nullable | |
| completed_at | timestamptz, nullable | |
| created_at / updated_at | timestamptz | |

### 6.2 `customers` 🆕 TE BOUWEN (Fase 4.6)

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid PK | |
| location_id | uuid FK | Per locatie (GDPR) |
| **Contact** | | |
| first_name | text | |
| last_name | text | |
| email | text | |
| phone_number | text, nullable | E.164 format |
| **AI-Ready Stats (Feature 1)** | | |
| total_visits | int, default 0 | Auto-updated bij completed |
| no_show_count | int, default 0 | Auto-updated bij no_show |
| cancel_count | int, default 0 | Auto-updated bij cancelled |
| avg_spend_per_visit | numeric, nullable | Bij POS/finance integratie |
| first_visit_at | timestamptz, nullable | |
| last_visit_at | timestamptz, nullable | |
| **WhatsApp-Ready (Feature 6)** | | |
| whatsapp_opt_in | boolean, default false | |
| **Overig** | | |
| tags | jsonb, default '[]' | Auto-berekend: 'vip', 'frequent_canceller', 'new_guest' |
| preferences | jsonb, default '{}' | Allergieën, voorkeuren, etc. |
| notes | text, nullable | Operator notities over gast |
| created_at / updated_at | timestamptz | |

**Unique constraint:** (location_id, LOWER(email))

### 6.3 `audit_log` 🆕 TE BOUWEN (Fase 4.6)

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid PK | |
| location_id | uuid FK | |
| entity_type | text | 'reservation', 'customer', etc. |
| entity_id | uuid | |
| action | text | 'status_change', 'table_change', 'party_size_change', etc. |
| old_value | jsonb, nullable | |
| new_value | jsonb | |
| performed_by | uuid, nullable | user_id (NULL = systeem) |
| performed_by_type | text | 'operator', 'guest', 'system', 'assistant' |
| created_at | timestamptz | |

**Let op `performed_by_type: 'assistant'`** — wanneer Nesto Assistant taken/acties uitvoert, moet dit expliciet zichtbaar zijn in de audit trail met een herkenbaar label/avatar.

---

## 7. Views en Functies

### 7.1 `shift_risk_summary` VIEW (Feature 1 — AI Ready)

```sql
-- Per shift per datum: risico-overzicht
CREATE VIEW shift_risk_summary AS
SELECT
  r.location_id,
  r.shift_id,
  r.reservation_date,
  s.name AS shift_name,
  COUNT(*) AS reservation_count,
  SUM(r.party_size) AS total_covers,
  AVG(r.no_show_risk_score) AS avg_risk_score,
  COUNT(*) FILTER (WHERE r.no_show_risk_score > 0.6) AS high_risk_count,
  -- Suggestie: som van (risicoscore × party_size), afgerond
  ROUND(SUM(r.no_show_risk_score * r.party_size)) AS suggested_overbook_covers
FROM reservations r
JOIN shifts s ON s.id = r.shift_id
WHERE r.status IN ('confirmed', 'option')
GROUP BY r.location_id, r.shift_id, r.reservation_date, s.name;
```

### 7.2 Cruciale RPCs

| Functie | Input | Output | Doel |
|---------|-------|--------|------|
| `get_effective_shift_schedule` | location_id, date | Shifts met eventuele overrides | ✅ Gebouwd |
| `check_availability` | date, party_size, ticket_id, channel | SlotResult[] | 🆕 Engine (4.5) |
| `create_reservation` | Alle velden | reservation_id | 🆕 Atomisch aanmaken (4.6) |
| `transition_reservation_status` | reservation_id, new_status, reason | success/error | 🆕 Status machine (4.6) |
| `calculate_no_show_risk` | reservation_id | void (schrijft naar reservering) | 🆕 AI Feature 1 |
| `auto_assign_table` | reservation_id | table_id | 🆕 Optioneel (4.5/4.6) |

---

## 8. Implementatievolgorde

### Fase 4.3.C — Shift Exceptions UI ⏳ (1-2 dagen)

De UI voor het beheren van exceptions is al gespecificeerd en het datamodel is gebouwd. Dit is een snelle afronder:
- Exception overzicht (lijst of kalender)
- Exception modal (datum, type, shift selectie, label)
- Quick close actie voor feestdagen
- **Scope beperken:** Geen bulk-close voor vakantieperiodes in eerste versie. Dat kan later.

### Fase 4.4 — Tickets + PolicySets + ShiftTickets 🎯 (1 week)

**Dit is de architectureel belangrijkste stap.** Hier komt de hele keten samen.

**Bouwvolgorde binnen 4.4:**

1. **Database eerst:**
   - `policy_sets` tabel + RLS
   - `tickets` tabel (inclusief squeeze velden en booking window) + RLS
   - `shift_tickets` koppeltabel + RLS
   - Seed data: 1 default policy_set "Standaard" + 1 default ticket "Regular" per locatie

2. **Hooks:**
   - `usePolicySets()` / `useCreatePolicySet()` / `useUpdatePolicySet()`
   - `useTickets()` / `useCreateTicket()` / `useUpdateTicket()`
   - `useShiftTickets()` / `useCreateShiftTicket()` / `useUpdateShiftTicket()`

3. **Settings UI:**
   - Settings > Reserveringen > Tickets pagina
     - Ticket lijst met naam, duration, party size range, gekoppelde policy
     - Ticket detail/edit modal
   - Settings > Reserveringen > Beleid (Policies) pagina
     - Policy set lijst
     - Policy set detail/edit modal
   - **ShiftWizard bijwerken:** Step 2 en 3 verbinden met echte data i.p.v. mocks

4. **Validatie:**
   - Ticket moet gekoppeld zijn aan minstens 1 shift (warning, niet blocking)
   - Policy set moet bestaan voordat ticket kan worden aangemaakt
   - Shift-ticket combinatie moet uniek zijn

### Fase 4.5 — Availability Engine (2 weken)

Edge Function `check-availability`:
- Implementeer de logica uit sectie 4.3 hierboven
- Squeeze als second-pass (niet als aparte stap)
- Alle reason_codes
- Deterministisch: unit tests met vaste input → verwachte output

### Fase 4.6 — Reservation Model + Status Machine (2 weken)

- `reservations` tabel met alle velden (inclusief AI-ready kolommen)
- `customers` tabel (inclusief stats kolommen voor Feature 1)
- `audit_log` tabel
- Status machine met strikte transities
- Triggers voor customer stats updates
- `calculate_no_show_risk()` functie (Feature 1 — meebouwen!)

### Fase 4.7–4.10 — UI + Guest Widget (3-4 weken)

- 4.7: Reservation Detail Panel met acties, badges, audit log
- 4.8: Check-in/Seat flow met regels
- 4.9: Options (optioneel, kan na launch)
- 4.10: Guest Widget (publieke booking flow)

---

## 9. Wat Er Verandert ten Opzichte van de Originele Roadmap

| Origineel | Nieuw | Reden |
|-----------|-------|-------|
| Fase 4.12 Squeeze Logic (apart) | **Geïntegreerd in 4.4 + 4.5** | Squeeze is een eigenschap van de engine, geen aparte module |
| ShiftWizard Step 2-3 (mock data) | **Verbinden met echte tickets/areas** | Mocks vervangen bij bouw 4.4 |
| `shift_tickets` tabel niet gedocumenteerd | **Expliciet schema in dit document** | Was impliciet maar nergens gelocked |
| DATABASE.md mist gebouwde tabellen | **Bijwerken na elke fase** | shifts, areas, tables ontbreken |
| AI Feature 1 als losse actie bij 4.6 | **Customer stats kolommen meteen meebouwen** | Data verzamelen vanaf dag één |
| WhatsApp changes niet doorgevoerd in docs | **Na 4.10, bij start 4.14** | Focus nu op reserveringskern |

---

## 10. Samenvattende Architectuurdiagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOCATIONS                                │
│  (multi-tenant: alles is per location)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────┐           │
│  │  SHIFTS   │───▶│ SHIFT_TICKETS │◀───│   TICKETS   │           │
│  │ wanneer?  │    │  koppeling   │    │  wat? (product)│         │
│  │ tijden    │    │  areas       │    │  duration     │         │
│  │ dagen     │    │  pacing      │    │  party size   │         │
│  │ interval  │    │  max covers  │    │  squeeze      │         │
│  └─────┬─────┘    └──────────────┘    │  booking window│        │
│        │                              └───────┬───────┘         │
│        │                                      │                 │
│  ┌─────┴──────────┐                   ┌───────┴───────┐         │
│  │SHIFT_EXCEPTIONS │                   │  POLICY_SETS  │         │
│  │ feestdagen      │                   │  betaling     │         │
│  │ gesloten        │                   │  annulering   │         │
│  │ aangepaste tijden│                  │  no-show      │         │
│  └────────────────┘                   │  reconfirmatie│         │
│                                        └───────────────┘         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐              │
│  │  AREAS   │───▶│  TABLES  │───▶│ TABLE_GROUPS  │              │
│  │ zones    │    │ capaciteit│    │ combinaties   │              │
│  └──────────┘    └──────────┘    └──────────────┘              │
│                                                                 │
│         ╔═══════════════════════════════════════╗               │
│         ║     AVAILABILITY ENGINE (4.5)         ║               │
│         ║  check_availability(date, size, ticket)║              │
│         ║  → leest ALLE bovenstaande tabellen   ║               │
│         ║  → output: beschikbare tijdslots      ║               │
│         ║  → squeeze als second-pass            ║               │
│         ╚═══════════════════════════════════════╝               │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────┐  ┌──────────┐  ┌───────────┐                │
│  │ RESERVATIONS │──│CUSTOMERS │  │ AUDIT_LOG │                │
│  │ de boeking   │  │ gastdata │  │ wie/wat/  │                │
│  │ status machine│  │ AI stats │  │ wanneer   │                │
│  └──────────────┘  └──────────┘  └───────────┘                │
│                                                                 │
│         ╔═══════════════════════════════════════╗               │
│         ║     NESTO ASSISTANT (Signals)         ║               │
│         ║  Leest alles, signaleert afwijkingen  ║               │
│         ╚═══════════════════════════════════════╝               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Checklist voor Lovable Sessies

Bij elke Lovable sessie, check:

- [ ] Werk je aan de juiste fase? (Volgorde: 4.3.C → 4.4 → 4.5 → 4.6 → 4.7 → 4.8 → 4.10)
- [ ] Is het database schema EXACT zoals in dit document?
- [ ] Zijn RLS policies aangemaakt voor nieuwe tabellen?
- [ ] Zijn hooks geschreven met optimistic updates?
- [ ] Is de UI consistent met bestaande Nesto Polar design patterns?
- [ ] Bij fase 4.6: zijn customer stats kolommen meegebouwd? (AI Feature 1)
- [ ] Bij fase 4.6: is `performed_by_type: 'assistant'` meegenomen in audit_log?
- [ ] Werkt de nieuwe code met bestaande get_user_context() en permission checks?
