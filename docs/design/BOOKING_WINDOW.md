# Booking Window

## Overzicht

De Booking Window bepaalt het tijdsvenster waarbinnen gasten online kunnen reserveren.
Dit voorkomt zowel te last-minute boekingen als boekingen te ver in de toekomst.

Gebaseerd op: [Formitable Shifts Documentation](https://help.formitable.com/hc/en-us/articles/18305787074077-Create-shifts)

---

## Concept

### Minimum Advance Time

Voorkomt last-minute boekingen die operationeel problematisch zijn:

```
Restaurant heeft: booking_min_advance_minutes = 60

Nu: 18:00

Slot 18:30: ❌ Geblokkeerd (slechts 30 min vooruit)
Slot 19:00: ✅ Beschikbaar (precies 60 min vooruit)
Slot 19:30: ✅ Beschikbaar (90 min vooruit)
```

### Maximum Advance Time

Voorkomt boekingen te ver in de toekomst (planning onzekerheid):

```
Restaurant heeft: booking_max_advance_days = 90

Vandaag: 11 januari 2026

Datum 10 februari 2026: ✅ Beschikbaar (30 dagen vooruit)
Datum 10 maart 2026: ✅ Beschikbaar (58 dagen vooruit)
Datum 15 april 2026: ❌ Geblokkeerd (94 dagen vooruit)
```

### Grote Groepen Override

Grote groepen vereisen meer voorbereidingstijd:

```
Normal min advance: 60 minuten
Large party min advance: 240 minuten (4 uur)
Large party threshold: 6 personen

Nu: 14:00

Slot 18:00 voor 2 personen: ✅ (4 uur vooruit, > 60 min)
Slot 18:00 voor 8 personen: ✅ (4 uur vooruit, = 240 min)
Slot 17:00 voor 8 personen: ❌ (3 uur vooruit, < 240 min)
```

---

## Settings (per Ticket)

Booking Window wordt geconfigureerd op **Ticket-niveau**, niet op locatie-niveau.
Dit is omdat verschillende tickets verschillende regels kunnen hebben.

| Setting | Type | Beschrijving | Default | Voorbeeld |
|---------|------|--------------|---------|-----------|
| `booking_min_advance_minutes` | integer | Minimaal X minuten van tevoren | `60` | `120` |
| `booking_max_advance_days` | integer | Maximaal X dagen vooruit | `365` | `90` |
| `booking_min_advance_large_party_minutes` | integer | Override voor groepen >= threshold | `null` | `240` |
| `large_party_threshold` | integer | Groepsgrootte drempel | `6` | `8` |

### Voorbeelden per Ticket Type

| Ticket | Min Advance | Max Advance | Large Party Min | Threshold |
|--------|-------------|-------------|-----------------|-----------|
| Regular | 60 min | 90 dagen | 4 uur | 6 |
| Chef's Table | 1 week | 60 dagen | 2 weken | 4 |
| Brunch | 30 min | 30 dagen | 2 uur | 8 |
| Private Dining | 2 weken | 180 dagen | 1 maand | 10 |

---

## Availability Engine Integratie

Booking window check is een van de **eerste filters** in de Availability Engine:

```typescript
function checkBookingWindow(
  slotDateTime: Date,
  partySize: number,
  ticket: Ticket
): { available: boolean; reason?: BookingWindowReason } {
  const now = new Date();
  const advanceMinutes = differenceInMinutes(slotDateTime, now);
  const advanceDays = differenceInDays(slotDateTime, now);
  
  // 1. Check max advance first (hele dag blokkeren)
  if (advanceDays > ticket.booking_max_advance_days) {
    return { 
      available: false, 
      reason: 'too_far_ahead' 
    };
  }
  
  // 2. Determine min advance based on party size
  const isLargeParty = partySize >= ticket.large_party_threshold;
  const minAdvance = isLargeParty && ticket.booking_min_advance_large_party_minutes
    ? ticket.booking_min_advance_large_party_minutes
    : ticket.booking_min_advance_minutes;
    
  // 3. Check min advance
  if (advanceMinutes < minAdvance) {
    return { 
      available: false, 
      reason: isLargeParty ? 'large_party_too_soon' : 'too_last_minute' 
    };
  }
  
  return { available: true };
}
```

### Check Volgorde in Engine

```
1. ✅ Booking Window Check (dit document)
2. ✅ Shift Check (is er een shift op deze dag/tijd?)
3. ✅ Table Availability Check (zijn er tafels vrij?)
4. ✅ Pacing Check (is er capaciteit?)
5. ✅ Squeeze Check (alleen als normale niet past)
```

---

## Reason Codes

| Code | Beschrijving | Gast ziet | Operator ziet |
|------|--------------|-----------|---------------|
| `too_last_minute` | Te kort van tevoren | "Dit tijdstip is niet meer beschikbaar" | "< min advance (60 min)" |
| `too_far_ahead` | Te ver in de toekomst | "Reserveren kan tot 90 dagen vooruit" | "> max advance (90 dagen)" |
| `large_party_too_soon` | Grote groep te kort vooruit | "Voor groepen van 6+ personen kunt u tot 4 uur van tevoren reserveren" | "Large party < min advance" |

### Reason Code Prioriteit

Als meerdere reason codes van toepassing zijn, toon de meest specifieke:

1. `large_party_too_soon` (specifiek voor party size)
2. `too_last_minute` (specifiek voor tijdslot)
3. `too_far_ahead` (specifiek voor datum)

---

## UI Implementatie

### Widget (Gast Flow)

**Datumkiezer:**
- Toon alleen datums binnen max advance window
- Grijs datums buiten het window uit (niet klikbaar)
- Tooltip: "Reserveren kan tot [X] dagen vooruit"

**Tijdslots:**
- Verberg slots die te last-minute zijn (geen uitleg nodig)
- Als alle slots geblokkeerd zijn door min advance, toon melding:
  "Er zijn geen tijden meer beschikbaar voor vandaag. Probeer een andere datum."

**Grote Groepen:**
- Als party size >= threshold, pas de beschikbare tijden dynamisch aan
- Toon info-badge: "Voor groepen van 6+ is reserveren minimaal 4 uur van tevoren"

### Operator View (Backoffice)

Operators kunnen **ALTIJD** reserveringen plaatsen, ook buiten booking window:
- Geen restrictie in backoffice
- Wel visuele waarschuwing: "⚠️ Buiten normaal boekingsvenster"
- Audit log noteert: "manual_booking_outside_window"

```typescript
// Audit log entry
{
  action: 'reservation_created',
  actor: 'operator:uuid',
  flags: ['manual_booking_outside_window'],
  details: {
    min_advance_required: 60,
    actual_advance: 30,
    reason: 'Guest called directly'
  }
}
```

---

## Database Schema (Fase 4.4 - Tickets)

Booking window settings worden opgeslagen per ticket in de `tickets` tabel:

```sql
-- Booking window columns in tickets tabel
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  booking_min_advance_minutes INTEGER DEFAULT 60;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  booking_max_advance_days INTEGER DEFAULT 365;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  booking_min_advance_large_party_minutes INTEGER;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  large_party_threshold INTEGER DEFAULT 6;

-- Constraints
ALTER TABLE public.tickets ADD CONSTRAINT valid_booking_min_advance 
  CHECK (booking_min_advance_minutes >= 0);

ALTER TABLE public.tickets ADD CONSTRAINT valid_booking_max_advance 
  CHECK (booking_max_advance_days > 0);

ALTER TABLE public.tickets ADD CONSTRAINT valid_large_party_threshold 
  CHECK (large_party_threshold >= 2);

ALTER TABLE public.tickets ADD CONSTRAINT valid_large_party_advance 
  CHECK (
    booking_min_advance_large_party_minutes IS NULL 
    OR booking_min_advance_large_party_minutes >= booking_min_advance_minutes
  );
```

---

## Ticket Settings Form (UI)

Onder "Booking Rules" sectie in Ticket modal:

```
Boekingsvenster
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Minimaal van tevoren: [60] minuten
└─ ⓘ Gasten kunnen tot X minuten voor aanvang reserveren

Maximaal vooruit: [90] dagen
└─ ⓘ Gasten kunnen tot X dagen van tevoren reserveren

━━━ Grote groepen ━━━

Grote groep vanaf: [6] personen

Minimaal van tevoren voor grote groepen: [240] minuten
└─ ⓘ Optioneel. Laat leeg om standaard te gebruiken.
```

---

## Edge Cases

### Booking Window + Shifts

Als een shift niet actief is op een bepaalde dag, is booking window niet relevant:

```
Maandag: Lunch shift actief
Maandag: Diner shift NIET actief

Booking window check voor Maandag Diner:
→ Skip (shift niet actief, dus sowieso geen slots)
```

### Booking Window + Shift Exceptions

Bij shift exceptions (bijv. gesloten voor vakantie), booking window is niet relevant:

```
25 december: Location gesloten (shift exception: closed)

Booking window check voor 25 december:
→ Skip (dag is gesloten, dus sowieso geen slots)
```

### Booking Window + Squeeze

Squeeze slots respecteren dezelfde booking window als normale slots:

```
Min advance: 60 min
Nu: 18:00

Squeeze slot 18:30: ❌ Geblokkeerd (< 60 min)
Squeeze slot 19:00: ✅ Beschikbaar (= 60 min)
```

### Timezone Handling

Booking window berekeningen gebruiken de **locatie timezone**:

```typescript
// Correct
const locationNow = utcToZonedTime(new Date(), location.timezone);
const slotTime = parseInTimeZone(slot, location.timezone);
const advance = differenceInMinutes(slotTime, locationNow);

// FOUT - gebruik niet UTC
const advance = differenceInMinutes(slotTime, new Date()); // ❌
```

---

## Monitoring & Metrics (Fase 7.4 - Nesto Assistant)

Booking window gerelateerde signals:

| Signal | Threshold | Actie |
|--------|-----------|-------|
| `last_minute_attempt_rate` | > 20% | ⚠️ "Veel gasten proberen last-minute te boeken. Overweeg min advance te verlagen." |
| `far_ahead_block_rate` | > 10% | ⚠️ "Gasten willen verder vooruit boeken. Overweeg max advance te verhogen." |
| `large_party_too_soon_rate` | > 15% | ⚠️ "Grote groepen boeken te laat. Overweeg communicatie te verbeteren." |

---

## Gerelateerde Documentatie

- [Squeeze Logic](./SQUEEZE_LOGIC.md) - Verkorte reserveringen
- [Shifts Architecture](./SHIFTS_ARCHITECTURE.md) - Shift configuratie
- [Availability Engine](../ROADMAP.md#45-availability-engine) - Centrale beschikbaarheid
- [Tickets & Policies](../ROADMAP.md#44-tickets--policyset-foundation) - Ticket configuratie

---

## Referenties

- [Formitable: Create Shifts](https://help.formitable.com/hc/en-us/articles/18305787074077-Create-shifts) - Booking window inspiratie
