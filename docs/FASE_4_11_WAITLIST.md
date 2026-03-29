# Fase 4.11 — Wachtlijst + Auto-Invites

> Doel: als alles vol zit, kan de gast zich op de wachtlijst zetten. Bij een annulering wordt automatisch de beste match uitgenodigd. Maximaal geautomatiseerd, minimaal gedoe voor operator.
> 
> **Context:** Onderdeel van Sprint A.1-A.2 (NESTO_2.0_IMPLEMENTATION.md). De 3 waitlist tabellen bestaan al in het schema (63 tabellen). Betalingen lopen via Mollie Connect (Sprint A.4). Emails via Resend (al werkend sinds Widget V2).

---

## HOE HET WERKT (3 zinnen)

1. Widget toont "Zet me op de wachtlijst" als er geen beschikbaarheid is
2. Bij elke annulering checkt een Edge Function welke wachtlijst-entries matchen en stuurt automatisch een invite-email
3. De gast klikt op de link, ziet de exacte tijd, en boekt atomisch (geen dubbelboeking mogelijk)

---

## RONDE 1: Database check + Edge Functions (Sprint A.1)

### Database — TABELLEN BESTAAN AL

De 3 tabellen (`waitlist_settings`, `waitlist_entries`, `waitlist_invites`) zijn al aangemaakt. **Controleer of alle kolommen aanwezig zijn:**

**Tabel: `waitlist_entries`** — vereiste kolommen:
```
id                  uuid PK
location_id         uuid FK → locations
customer_id         uuid FK → customers (nullable, wordt ingevuld bij match)
date                date NOT NULL
shift_id            uuid FK → shifts (nullable)
ticket_id           uuid FK → tickets (nullable)
party_size          int NOT NULL
preferred_time_from time (nullable — "vanaf 19:00")
preferred_time_to   time (nullable — "tot 21:00")
first_name          text NOT NULL
last_name           text NOT NULL
email               text NOT NULL
phone               text (nullable)
notes               text (nullable)
status              text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','invited','converted','expired','cancelled'))
priority_score      int DEFAULT 0
created_at          timestamptz
updated_at          timestamptz
```

**Tabel: `waitlist_invites`** — vereiste kolommen:
```
id                  uuid PK
waitlist_entry_id   uuid FK → waitlist_entries
location_id         uuid FK → locations
slot_date           date NOT NULL
slot_time           time NOT NULL
ticket_id           uuid FK → tickets
party_size          int NOT NULL
invite_token        text UNIQUE NOT NULL (nanoid)
status              text NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent','accepted','expired','declined'))
expires_at          timestamptz NOT NULL
accepted_at         timestamptz (nullable)
reservation_id      uuid FK → reservations (nullable, na conversie)
created_at          timestamptz
```

**Tabel: `waitlist_settings`** (per locatie) — vereiste kolommen:
```
location_id                uuid PK FK → locations
waitlist_enabled           boolean DEFAULT false
auto_invite_enabled        boolean DEFAULT true
auto_invite_delay_minutes  int DEFAULT 5 (wacht X min na annulering → geeft operator handmatige window)
invite_window_minutes      int DEFAULT 30 (hoelang invite geldig is)
max_parallel_invites       int DEFAULT 1 (hoeveel gasten tegelijk uitnodigen)
priority_mode              text DEFAULT 'auto'
                           CHECK (priority_mode IN ('auto','manual'))
                           — auto: systeem bepaalt volgorde
                           — manual: operator bepaalt (drag-and-drop)
```

**Actie:** Vergelijk bovenstaande met het werkelijke schema. Voeg ontbrekende kolommen toe via `ALTER TABLE ADD COLUMN IF NOT EXISTS`. RLS: zelfde location-based pattern als overige tabellen.

### DB Trigger: `trg_waitlist_on_cancel`

Bij elke reservering-annulering (operator of gast) wordt de waitlist-invite-engine aangeroepen. Zelfde pattern als `notify_onboarding_agent` trigger (al in gebruik).

```sql
CREATE OR REPLACE FUNCTION fn_trigger_waitlist_on_cancel()
  RETURNS trigger AS $$
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/waitlist-invite-engine',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
      ),
      body := jsonb_build_object(
        'location_id', NEW.location_id,
        'date', NEW.reservation_date,
        'start_time', NEW.start_time,
        'party_size', NEW.party_size,
        'shift_id', NEW.shift_id,
        'ticket_id', NEW.ticket_id
      )
    );
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_waitlist_on_cancel
  AFTER UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION fn_trigger_waitlist_on_cancel();
```

Dit dekt alle cancel-paden: operator RPC (`transition_reservation_status`), gast cancel via `/manage`, en toekomstige flows.

### Edge Function: `waitlist-invite-engine`

**Trigger:** DB trigger bij annulering (zie boven), of handmatig door operator.

**Logica:**
1. Check `waitlist_settings.waitlist_enabled` en `auto_invite_enabled`
2. Check `auto_invite_delay_minutes` — als > 0: wacht (setTimeout in Edge Function, of pg_cron schedule)
3. Run availability check op het vrijgekomen slot (datum + tijd + party size range)
4. Zoek matching `waitlist_entries` met status = 'pending':
   - `date` matcht
   - `party_size` past bij beschikbare tafel(s)
   - `preferred_time_from/to` overlapt met vrijgekomen slot (of NULL = flexibel)
   - `ticket_id` matcht of NULL (flexibel)
5. Sorteer op `priority_score` DESC, dan `created_at` ASC (FIFO bij gelijke score)
6. Neem top `max_parallel_invites` entries
7. Per match:
   - Maak `waitlist_invite` aan met nanoid token + `expires_at` (now + invite_window_minutes)
   - Update entry status → 'invited'
   - Stuur invite email via Resend (hergebruik booking email pattern)
8. Log alles in `audit_log`

**Priority score berekening (auto mode):**
```
base_score = 0
+ 10 als returning_guest (customer_id heeft eerdere reserveringen via customers.total_visits > 0)
+ 5  als exact time match (preferred_time omvat het vrijgekomen slot)
+ 3  als exact party_size match (niet groter/kleiner)
+ 2  als ticket_id specifiek matcht
+ 5  als VIP (customers.vip = true)
```

### Edge Function: `waitlist-accept`

**Route:** POST `/waitlist/accept/:token`

**Logica:**
1. Zoek `waitlist_invite` op token
2. Check: status = 'sent' EN `expires_at` > now()
3. Als verlopen: return error + toon "Deze uitnodiging is verlopen"
4. Check availability opnieuw (iemand kan handmatig geboekt hebben)
5. Als nog beschikbaar:
   - Maak reservering aan (atomisch, met `SELECT ... FOR UPDATE` lock op tafel-availability)
   - Gebruik `assign_best_table` (bestaande functie uit availability engine)
   - Update invite: status → 'accepted', reservation_id, accepted_at
   - Update entry: status → 'converted'
   - Stuur booking confirmation email (zelfde template als widget booking)
6. Als niet meer beschikbaar:
   - Update invite: status → 'expired'
   - Update entry: status → 'pending' (terug in de pool!)
   - Return: "Helaas, deze plek is net vergeven. Je staat weer op de wachtlijst."

### Invite email

Zelfde template-stijl als booking confirmation (via Resend, restaurant branding uit `communication_settings`), maar met:
- "Er is een plek vrijgekomen!"
- Datum, tijd, gasten, ticket
- Grote CTA knop: "Reserveer deze plek"
- Onder de knop: "Geldig tot [tijd]" (berekend uit expires_at)
- Returning guest? "Leuk dat je weer bij ons wilt komen, {voornaam}!"

---

## RONDE 2: Widget + Operator UI (Sprint A.2)

### Widget: Wachtlijst CTA

**Wanneer:** Widget toont geen beschikbare tijdslots voor de gekozen datum.

**UX flow:**
1. In plaats van alleen "Geen tijden beschikbaar" → toon:
   ```
   Helaas, deze dag is volgeboekt.
   [Zet me op de wachtlijst →]
   ```
2. Klik → inline formulier (in dezelfde stap, geen nieuwe pagina):
   - Party size (al ingevuld vanuit eerdere selectie)
   - Datum (al ingevuld)
   - Tijdvoorkeur: "Maakt niet uit" / "Liefst tussen [van] en [tot]"
   - Naam, email, telefoon (pre-filled als returning guest via guest-lookup)
   - Opmerkingen (optioneel)
   - [Plaats me op de wachtlijst] knop
3. Bevestiging: "Je staat op de wachtlijst! We mailen je zodra er plek is."

**Technisch:**
- Nieuw endpoint in `public-booking-api`: POST `/waitlist`
  - Maakt `waitlist_entry` aan
  - Zoekt/maakt customer (zelfde `findOrCreateCustomer` als booking)
  - Berekent `priority_score` (returning guest check, VIP check)
  - Stuurt bevestigingsmail "Je staat op de wachtlijst"
- Guest-lookup werkt ook hier (email → pre-fill naam+telefoon)

### Widget: Accept pagina

**Route:** `/waitlist/accept/:token`

**UX:**
1. Laad invite data (datum, tijd, gasten, ticket, restaurant info)
2. Toon duidelijk:
   ```
   Er is een plek voor je!
   
   [Restaurant naam]
   Vrijdag 28 februari · 19:30 · 2 gasten
   Ticket: Diner
   
   [Reserveer nu →]
   
   ⏰ Deze uitnodiging verloopt om 20:05
   ```
3. Klik → atomische boeking (zelfde flow als widget booking, maar skip datum/tijd/gasten selectie)
4. Bevestiging: zelfde als normale booking (checkmark, beheerlink, QR code via qrcode.react)
5. Bij verlopen: "Deze uitnodiging is verlopen. Je staat weer op de wachtlijst."

### Operator UI: Wachtlijst panel

**Locatie:** Nieuw tabblad "Wachtlijst" naast Grid/List view in reserveringen

**Inhoud:**
- Lijst van alle `waitlist_entries` voor geselecteerde datum (of alle toekomstige)
- Per entry: naam, party size, tijdvoorkeur, status badge, aangemaakt op
- Status badges: 🟡 Wachtend · 🔵 Uitgenodigd (+ countdown) · 🟢 Geboekt · ⚪ Verlopen
- Filter: datum, status
- Acties per entry:
  - **Handmatig uitnodigen** → kies slot uit beschikbare tijden → stuur invite
  - **Annuleren** → verwijder van wachtlijst
  - **Drag-and-drop** volgorde aanpassen (als priority_mode = 'manual')

**Bij annulering van een reservering:**
- Als auto_invite aan staat: toast "Wachtlijst wordt automatisch gecheckt"
- Als auto_invite uit staat: toast "Er zijn X gasten op de wachtlijst — wil je iemand uitnodigen?" met link naar wachtlijst tab

### Settings UI

**Locatie:** Instellingen > Reserveringen > Wachtlijst

- Wachtlijst inschakelen (toggle)
- Automatisch uitnodigen (toggle)
- Vertraging na annulering: [5] minuten (geeft je tijd om zelf iemand te kiezen)
- Geldigheid uitnodiging: [30] minuten
- Gelijktijdige uitnodigingen: [1] (1 = sequentieel, 2+ = parallel/race)
- Prioriteit: Automatisch / Handmatig (drag-and-drop)

Gebruik bestaande NestoTable, NestoModal, NestoTabs componenten.

---

## RONDE 3: Assistent-integratie + Polish

### Nesto Assistent signalen

**WaitlistSignalProvider** (voeg toe aan bestaande signals architectuur — `signals` tabel bestaat al):

| Type | Signaal | Wanneer |
|------|---------|---------|
| Signal | "X gasten op de wachtlijst voor vandaag" | count > 0 |
| Signal | "Uitnodiging verlopen — nog X wachtend" | invite expired + pending > 0 |
| Signal | "Wachtlijst-conversie: [naam] heeft geboekt!" | entry converted |
| Insight | "Wachtlijst groeit — overweeg extra shift of squeeze" | 5+ entries voor zelfde dag |
| Insight | "Hoge no-show kans bij [reservering] — wachtlijst heeft match" | no_show_risk_score > 0.6 EN waitlist_match exists |

### Auto-expire job

**pg_cron job** (elke 5 minuten):
```sql
SELECT cron.schedule('waitlist-expire-invites', '*/5 * * * *', $$
  UPDATE waitlist_invites SET status = 'expired'
  WHERE status = 'sent' AND expires_at < NOW();
  
  UPDATE waitlist_entries SET status = 'pending'
  WHERE status = 'invited'
    AND id NOT IN (SELECT waitlist_entry_id FROM waitlist_invites WHERE status = 'sent');
  
  UPDATE waitlist_entries SET status = 'expired'
  WHERE status = 'pending' AND date < CURRENT_DATE;
$$);
```

Na expire: trigger invite engine opnieuw (volgende in de rij). Stuur "Helaas geen plek vrijgekomen" email bij datum-expiry.

### Audit trail

Alle waitlist acties loggen in bestaande `audit_log`:
- `waitlist_entry_created` (channel: widget/operator)
- `waitlist_invite_sent` (auto/manual)
- `waitlist_invite_accepted`
- `waitlist_invite_expired`
- `waitlist_entry_converted`
- `waitlist_entry_cancelled`

---

## SAMENVATTING PER RONDE

| Ronde | Sprint | Wat |
|-------|--------|-----|
| **1** | A.1 | DB kolommen check, DB trigger, invite engine Edge Function, accept Edge Function, invite email |
| **2** | A.2 | Widget wachtlijst CTA + accept pagina, operator wachtlijst tab, settings UI, POST /waitlist endpoint |
| **3** | A.2+ | Assistent signalen, auto-expire pg_cron, audit logging, "geen plek" email |

---

## WAT EXPLICIET NIET IN SCOPE ZIT

- Walk-in wachtlijst (real-time, "ik sta nu bij de deur") → apart feature, later
- WhatsApp als invite kanaal → Sprint E.1-E.3 (WhatsApp Agent), phone veld is al voorbereid
- AI priority scoring (ML-based) → pas bij voldoende data, nu deterministisch + VIP flag
- SMS notificaties → na WhatsApp integratie
- Waitlist analytics dashboard → apart (Insights)
- Betaling bij accept → Sprint A.4 Mollie Connect (invite accept flow is voorbereid met `payment_status` kolom)
