# Squeeze Logic

## Overzicht

Squeeze is een mechanisme om gaten in het reserveringsschema automatisch te vullen 
met verkorte reserveringen. Gasten krijgen een kortere tafel-tijd dan normaal, 
maar weten dit vooraf.

Gebaseerd op: [Formitable Shifts Documentation](https://help.formitable.com/hc/en-us/articles/18305787074077-Create-shifts)

---

## Concept

### Probleem

Een restaurant heeft standaard reserveringen van 120 minuten, maar door 
annuleringen of onregelmatige boekingen ontstaan gaten van bijvoorbeeld 
90 minuten. Deze gaten zijn te kort voor een normale reservering maar te 
lang om leeg te laten.

### Oplossing

Squeeze biedt automatisch verkorte reserveringen aan (bijv. 90 min i.p.v. 120 min) 
wanneer normale tijdslots niet beschikbaar zijn. De eindtijd wordt duidelijk 
gecommuniceerd naar de gast.

### Visueel Voorbeeld

```
Normale situatie (120 min slots):
18:00 ████████████████████ 20:00 (Bestaande reservering)
                              20:00 ████████████████████ 22:00 (Bestaande reservering)

Gat van 90 minuten:
18:00 ████████████████████ 20:00 (Bestaande reservering)
                    19:30 ─── GAT ─── 21:00
                                          21:00 ████████████████████ 23:00 (Bestaande reservering)

Met Squeeze:
18:00 ████████████████████ 20:00 (Bestaande reservering)
                    19:30 ████████████ 21:00 (Squeeze: 90 min)
                                          21:00 ████████████████████ 23:00 (Bestaande reservering)
```

---

## Squeeze Settings (per Ticket)

Squeeze wordt geconfigureerd op **Ticket-niveau**, niet op Shift-niveau. 
Dit is omdat verschillende ticket types verschillende squeeze regels kunnen hebben.

| Setting | Type | Beschrijving | Default | Voorbeeld |
|---------|------|--------------|---------|-----------|
| `squeeze_enabled` | boolean | Squeeze activeren voor dit ticket | `false` | `true` |
| `squeeze_duration_minutes` | integer | Minimale reserveringsduur bij squeeze | `null` | `90` |
| `squeeze_gap_minutes` | integer | Buffer tijd na squeeze reservering | `15` | `15` |
| `squeeze_to_fixed_end_time` | time | Squeeze naar vast eindtijdstip (optioneel) | `null` | `20:00` |
| `squeeze_limit_per_shift` | integer | Max aantal squeeze reserveringen per shift | `null` | `5` |

### Squeeze Duration

De squeeze duration moet **ALTIJD** kleiner zijn dan de normale ticket duration:

```
ticket.duration_minutes = 120
ticket.squeeze_duration_minutes = 90

Verschil: 30 minuten (dit is de "squeeze")
```

Dit betekent dat gasten minimaal 90 minuten aan tafel zitten i.p.v. de normale 120.

### Squeeze to Fixed End Time

Speciaal voor early/late shift scenario's waar je wilt dat gasten vertrekken 
voordat de volgende shift begint:

```
Early Shift: 18:00 - 20:00
Late Shift: 20:00 - 23:00

Reservering om 19:00 in early shift:
- Normaal: 19:00 - 21:00 (120 min) ❌ Conflict met late shift
- Squeeze: 19:00 - 20:00 (60 min) ✅ Past precies

squeeze_to_fixed_end_time = "20:00"
```

**Belangrijk:** Squeeze to fixed end time is alleen zinvol als de berekende 
squeeze duur nog steeds >= `squeeze_duration_minutes` is.

### Squeeze Limit per Shift

Voorkomt dat er te veel squeeze reserveringen zijn in één shift:

```
squeeze_limit_per_shift = 5

Shift 1 (Lunch): 3 squeeze reserveringen ✅ Onder limiet
Shift 2 (Diner): 5 squeeze reserveringen ✅ Op limiet
Shift 2 (Diner): 6e squeeze ❌ Limiet bereikt, geen squeeze aangeboden
```

---

## Availability Engine Integratie

### Prioriteit

De Availability Engine checkt slots in deze volgorde:

1. **Normale beschikbaarheid** - Volledige duration past → aanbieden
2. **Squeeze beschikbaarheid** - Squeeze duration past, normaal niet → squeeze aanbieden
3. **Niet beschikbaar** - Ook squeeze past niet → niet aanbieden

**KRITIEK:** Squeeze slots worden ALLEEN aangeboden wanneer:
1. Normale slots niet beschikbaar zijn (tables_full of pacing_full)
2. Een squeeze zou passen (genoeg tijd tot volgende bezetting)
3. Squeeze limits niet bereikt zijn (per shift)

Squeeze mag **NOOIT** aangeboden worden als normale reservering mogelijk is!

### Slot Types

```typescript
type SlotAvailability = {
  available: boolean;
  slot_type: 'normal' | 'squeeze' | 'unavailable';
  duration_minutes: number;        // Actuele duur (normaal of squeeze)
  end_time: string;                // Berekende eindtijd
  reason_code?: string;            // Bij unavailable
};
```

### Reason Codes (Squeeze-gerelateerd)

| Code | Beschrijving | Gast ziet |
|------|--------------|-----------|
| `squeeze_limit_reached` | Max squeeze per shift bereikt | "Dit tijdstip is niet beschikbaar" |
| `squeeze_too_short` | Zelfs squeeze past niet | "Dit tijdstip is niet beschikbaar" |

### Pseudo-code

```typescript
function checkSlotAvailability(
  slot: TimeSlot,
  ticket: Ticket,
  tables: Table[],
  existingReservations: Reservation[]
): SlotAvailability {
  // 1. Check normale beschikbaarheid
  const normalFits = canFitReservation(
    slot,
    ticket.duration_minutes,
    ticket.buffer_minutes,
    tables,
    existingReservations
  );
  
  if (normalFits) {
    return {
      available: true,
      slot_type: 'normal',
      duration_minutes: ticket.duration_minutes,
      end_time: addMinutes(slot.start, ticket.duration_minutes),
    };
  }
  
  // 2. Check squeeze beschikbaarheid (alleen als enabled)
  if (!ticket.squeeze_enabled) {
    return { available: false, reason_code: 'tables_full' };
  }
  
  // Check squeeze limit
  const squeezeCount = countSqueezeInShift(slot, existingReservations);
  if (ticket.squeeze_limit_per_shift && squeezeCount >= ticket.squeeze_limit_per_shift) {
    return { available: false, reason_code: 'squeeze_limit_reached' };
  }
  
  // Calculate squeeze duration
  let squeezeDuration = ticket.squeeze_duration_minutes;
  
  // Override met fixed end time indien geconfigureerd
  if (ticket.squeeze_to_fixed_end_time) {
    const toFixedEnd = diffInMinutes(ticket.squeeze_to_fixed_end_time, slot.start);
    if (toFixedEnd < ticket.squeeze_duration_minutes) {
      return { available: false, reason_code: 'squeeze_too_short' };
    }
    squeezeDuration = toFixedEnd;
  }
  
  const squeezeFits = canFitReservation(
    slot,
    squeezeDuration,
    ticket.squeeze_gap_minutes,
    tables,
    existingReservations
  );
  
  if (squeezeFits) {
    return {
      available: true,
      slot_type: 'squeeze',
      duration_minutes: squeezeDuration,
      end_time: addMinutes(slot.start, squeezeDuration),
    };
  }
  
  return { available: false, reason_code: 'squeeze_too_short' };
}
```

---

## Visuele Indicatie

### Widget (Gast ziet)

Squeeze slots tonen **ALTIJD** de eindtijd expliciet om de gast te informeren:

```
Beschikbare tijden voor 4 personen:

18:00                  ← Normale slot (120 min)
18:30                  ← Normale slot (120 min)
19:00 - 20:30 (90 min) ← Squeeze slot (eindtijd zichtbaar)
19:30 - 21:00 (90 min) ← Squeeze slot (eindtijd zichtbaar)
```

### Bevestigingspagina

Bij squeeze reservering extra waarschuwing:

```
⚠️ Let op: Dit is een verkorte reservering.
Je tafel is gereserveerd tot 20:30.
```

### Operator View (Grid/List)

Squeeze reserveringen in Grid/List view:
- **Badge:** `◀️` icon (squeeze indicator)
- **Tooltip:** "Verkorte reservering (90 min)"
- **Kleur:** Normale reserveringskleur, geen speciale highlight
- **Blok breedte:** Correspondeert met werkelijke (squeeze) duur

---

## Database Schema (Fase 4.4 - Tickets)

Squeeze settings worden opgeslagen per ticket in de `tickets` tabel:

```sql
-- Squeeze columns in tickets tabel
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  squeeze_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  squeeze_duration_minutes INTEGER;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  squeeze_gap_minutes INTEGER DEFAULT 15;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  squeeze_to_fixed_end_time TIME;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS
  squeeze_limit_per_shift INTEGER;

-- Constraints
ALTER TABLE public.tickets ADD CONSTRAINT valid_squeeze_duration 
  CHECK (
    squeeze_duration_minutes IS NULL 
    OR squeeze_duration_minutes < duration_minutes
  );

ALTER TABLE public.tickets ADD CONSTRAINT valid_squeeze_gap 
  CHECK (
    squeeze_gap_minutes >= 0 AND squeeze_gap_minutes <= 60
  );

ALTER TABLE public.tickets ADD CONSTRAINT valid_squeeze_limit 
  CHECK (
    squeeze_limit_per_shift IS NULL OR squeeze_limit_per_shift > 0
  );
```

### Reservation veld

```sql
-- Op reservations tabel om te markeren dat het een squeeze is
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS
  is_squeeze BOOLEAN DEFAULT false;
```

---

## UI Implementatie (Fase 4.4)

### Ticket Settings Form

Onder "Seating" sectie in Ticket modal:

```
Squeeze Settings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☐ Squeeze inschakelen
  │
  ├─ Minimale duur: [90] minuten
  │   └─ ⓘ Gast heeft minimaal deze tijd aan tafel
  │
  ├─ Buffer tijd: [15] minuten
  │   └─ ⓘ Tijd tussen squeeze reservering en volgende bezetting
  │
  ├─ Squeeze naar vaste eindtijd: [--:--] (optioneel)
  │   └─ ⓘ Bijv. 20:00 voor early shift
  │
  └─ Max per shift: [5] (optioneel)
      └─ ⓘ Limiteert aantal squeeze reserveringen per shift
```

### Live Preview (Widget Preview)

Wanneer squeeze enabled in Ticket settings, toon in de preview:
- Squeeze slots in iets andere styling (bijv. dashed border)
- Tooltip: "Dit wordt een squeeze slot"

---

## Edge Cases

### Squeeze + Tafelgroepen (TableGroups)

Bij gecombineerde tafels (TableGroups):
- Squeeze duur geldt voor de reservering, niet per tafel
- Als groep wordt gesqueezed, alle tafels in de groep worden vrijgegeven op eindtijd
- Extra seats van tablegroup worden niet gewijzigd door squeeze

### Squeeze + Pacing

Squeeze reserveringen tellen volledig mee voor pacing:
- ✅ Arrivals per interval
- ✅ Covers per interval
- ✅ Seated covers

Dit voorkomt overboekingen ondanks kortere tafel-tijd.

### Squeeze + No-Show

Bij no-show van squeeze reservering:
- Normale no-show regels gelden
- Geen speciale behandeling
- Deposit/payment policy is identiek aan normale reservering

### Squeeze + Waitlist

Als squeeze slot vrijkomt door annulering:
- Waitlist invite kan een squeeze slot zijn
- Gast wordt geïnformeerd dat het een verkorte reservering is

### Squeeze + Option

Option reserveringen kunnen ook squeeze zijn:
- Bij acceptatie wordt squeeze status behouden
- Eindtijd blijft zoals oorspronkelijk geboekt

---

## Monitoring & Metrics (Fase 7.4 - Nesto Assistant)

Squeeze gerelateerde signals voor Nesto Assistant:

| Signal | Threshold | Actie |
|--------|-----------|-------|
| `squeeze_fill_rate` | > 80% | ✅ "Squeeze vult effectief gaten" |
| `squeeze_fill_rate` | < 20% | ⚠️ "Overweeg squeeze settings aan te passen" |
| `squeeze_complaints` | > 5% | 🔴 "Gasten klagen over korte tafel-tijd" |
| `squeeze_conversion_rate` | < 50% | ⚠️ "Gasten boeken squeeze slots niet" |

### Metrics Definities

```typescript
// Squeeze fill rate: hoeveel squeeze slots worden geboekt
squeeze_fill_rate = squeeze_bookings / squeeze_slots_offered * 100

// Squeeze complaints: hoeveel klachten zijn gerelateerd aan squeeze
squeeze_complaints = squeeze_complaints / total_squeeze_reservations * 100

// Squeeze conversion: hoeveel gasten die squeeze zien, boeken ook
squeeze_conversion_rate = squeeze_bookings / squeeze_slot_views * 100
```

---

## Gerelateerde Documentatie

- [Shifts Architecture](./SHIFTS_ARCHITECTURE.md) - Shift configuratie
- [Booking Window](./BOOKING_WINDOW.md) - Minimum/maximum vooruit boeken
- [Availability Engine](../ROADMAP.md#45-availability-engine) - Centrale beschikbaarheid
- [Tickets & Policies](../ROADMAP.md#44-tickets--policyset-foundation) - Ticket configuratie

---

## Referenties

- [Formitable: Create Shifts](https://help.formitable.com/hc/en-us/articles/18305787074077-Create-shifts) - Originele inspiratie voor squeeze functionaliteit
