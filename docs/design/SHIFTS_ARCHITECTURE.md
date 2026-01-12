# Shifts Architecture

## Overview

Het shifts-systeem definieert wanneer een locatie open is voor reserveringen. 
Dit document beschrijft de architectuur-beslissingen en invariants.

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `shifts` | Shift definities (naam, tijden, dagen) |
| `shift_exceptions` | Datum-specifieke overrides |

### Core RPC

`get_effective_shift_schedule(location_id, date)` retourneert de effectieve shifts voor een specifieke datum, inclusief exception handling.

---

## Security Model

### SECURITY DEFINER Functions

**KRITIEK:** Alle `SECURITY DEFINER` functies MOETEN een expliciete access check bevatten:

```sql
IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
  RAISE EXCEPTION 'Access denied to location %', _location_id;
END IF;
```

Dit is vereist omdat `SECURITY DEFINER` RLS bypassed.

### RLS Policies

| Action | Check |
|--------|-------|
| SELECT | `user_has_location_access(auth.uid(), location_id)` |
| INSERT/UPDATE/DELETE | `user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager'])` |

---

## Conflict Resolution

### Exception Prioriteit

**Regel: Location-wide closed wint ALTIJD.**

Prioriteit (hoog naar laag):
1. Location-wide `closed` (shift_id IS NULL) → hele dag dicht
2. Shift-specific `closed` → alleen die shift dicht
3. Shift-specific `modified` → override tijden
4. Shift-specific `special` → speciale markering, normale tijden
5. Geen exception → standaard shift config

### Implementatie

De RPC `get_effective_shift_schedule` checkt eerst op location-wide closed:

```sql
IF EXISTS (
  SELECT 1 FROM shift_exceptions
  WHERE location_id = _location_id
    AND shift_id IS NULL
    AND exception_date = _date
    AND exception_type = 'closed'
) THEN
  RETURN;  -- Empty set = closed
END IF;
```

---

## Invariants

### DB-Enforced (via constraints)

| Invariant | Enforcement |
|-----------|-------------|
| `start_time < end_time` | CHECK constraint op shifts |
| `short_name` max 4 chars | CHECK constraint |
| Unieke naam per actieve locatie | Partial unique index |
| Modified exception vereist tijden | CHECK constraint op shift_exceptions |
| `arrival_interval_minutes` ∈ {15,30,60} | CHECK constraint |

### NOT DB-Enforced (UI/Engine verantwoordelijk)

| Invariant | Waar afgedwongen |
|-----------|------------------|
| Shifts overlappen niet op zelfde dag | UI (ShiftModal), Engine (Fase 4.5) |
| Geen reserveringen buiten shift tijden | Availability Engine (Fase 4.5) |
| Pacing binnen shift capacity | Pacing Engine (Fase 4.6) |

---

## Architectuurkeuze (Definitief)

### Kernprincipes

| Concept | Definitie |
|---------|-----------|
| **Shifts** | Structureel tijdsraam (start/end time, interval). Geen kalenderlogica. |
| **Shift Exceptions** | ALLE datum-afwijkingen. Expliciet, auditbaar, AI-leesbaar. |
| **Herhaling** | Generator die exception records aanmaakt, geen rules storage. |

### Enterprise Regel: Data > Magie

"Elke maandag gesloten in 2026" = 52 expliciete shift_exception records

Dit betekent:
- Volledig transparant: elke uitzondering is zichtbaar in de database
- Makkelijk te bewerken: gebruikers kunnen individuele records aanpassen
- Auditbaar: volledige historie is beschikbaar
- AI-leesbaar: geen verborgen logica, alles is data
- Previewbaar: generatie toont precies wat er aangemaakt wordt

---

## Wat we bewust NIET bouwen

| Concept | Reden |
|---------|-------|
| `shift_rules` tabel | Introduceert verborgen logica en complexiteit |
| `closed_days` module | Redundant met shift_exceptions |
| Impliciete herhalingslogica | Onvoorspelbaar gedrag, moeilijk te debuggen |
| Server-side recurring engine | Magie achter de schermen, niet auditbaar |

**Filosofie:** Nesto optimaliseert voor transparantie, controle en schaalbaarheid.
Formitable optimaliseert voor eenvoud en verborgen defaults.

---

## Conflict Resolution (Invariant)

Deze regels gelden overal en worden consequent toegepast:

| Prioriteit | Regel |
|------------|-------|
| 1 (hoogst) | Location-wide `closed` exception wint ALTIJD |
| 2 | Shift-specific exception wint van shift template |
| 3 | Exceptions winnen altijd van structurele data |
| 4 | Geen exception → shift template geldt |
| 5 (laagst) | Geen shift op die dag → geen availability |

### Scope-specifieke Conflict Detectie

Database constraint: `UNIQUE (location_id, shift_id, exception_date)`

Dit betekent:
- Location-wide (`shift_id = NULL`) en shift-specific op dezelfde datum zijn **twee verschillende records**
- Exact conflict = zelfde `shift_id` (incl. NULL) + zelfde datum
- Functional warning = andere scope, bijv. location-wide closed terwijl shift-specific bestaat

---

## Gerelateerde Concepten

### Booking Window

De Booking Window bepaalt het tijdsvenster waarbinnen online reserveringen mogelijk zijn.
Dit is een **Ticket-level** setting, niet een Shift-level setting.

Zie: [`BOOKING_WINDOW.md`](./BOOKING_WINDOW.md)

### Squeeze

Squeeze vult gaten in het schema met verkorte reserveringen.
Dit is een **Ticket-level** setting, niet een Shift-level setting.

Zie: [`SQUEEZE_LOGIC.md`](./SQUEEZE_LOGIC.md)

### Waarom Ticket-level en niet Shift-level?

- **Booking Window**: Verschillende tickets kunnen verschillende advance-tijden hebben
  (bijv. Chef's Table vereist 1 week vooruit, Regular 1 uur)
- **Squeeze**: Sommige tickets zijn niet geschikt voor squeeze (bijv. Tasting Menu)
  terwijl Regular wel gesqueezed kan worden

---

## Implementatie Status

| Component | Status | Fase |
|-----------|--------|------|
| `shifts` tabel | ✅ COMPLEET | 4.3.A |
| `shift_exceptions` tabel | ✅ COMPLEET | 4.3.A |
| `get_effective_shift_schedule` RPC | ✅ COMPLEET | 4.3.A |
| `reorder_shifts` RPC | ✅ COMPLEET | 4.3.A |
| Shifts CRUD UI | ✅ COMPLEET | 4.3.A |
| ShiftWizard (5 stappen) | ✅ COMPLEET | 4.3.A |
| Live Preview Panel | ✅ COMPLEET | 4.3.B |
| Exceptions UI | ⏳ Gepland | 4.3.C |
| Booking Window | ⏳ Gepland | 4.4 |
| Squeeze | ⏳ Gepland | 4.4 |

---

## Related Documentation

- [Database Schema](../../docs/DATABASE.md)
- [Architecture Overview](../../docs/ARCHITECTURE.md)
- [Settings Patterns](./SETTINGS_PAGE_PATTERNS.md)
- [Booking Window](./BOOKING_WINDOW.md)
- [Squeeze Logic](./SQUEEZE_LOGIC.md)
