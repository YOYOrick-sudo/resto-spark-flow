

# Fase 4.6 Correctieve Migratie — 5 Fixes + View Enhancement

## Wat wordt gefixt

| # | Issue | Ernst | Fix |
|---|-------|-------|-----|
| 1 | `pending` i.p.v. `draft` in enum + defaults + RPCs + TypeScript | BLOCKING | `ALTER TYPE RENAME VALUE`, update defaults, RPCs, types |
| 2 | Transitiematrix: seated->no_show, confirmed->option, terminal states niet terminal | BLOCKING | Herschrijf matrix in RPC + TypeScript |
| 3 | Risicoscore gewichten: kanaal/termijn omgewisseld, dag-van-de-week ontbreekt | MEDIUM | Herschrijf `calculate_no_show_risk` met correcte 40/20/20/10/10 verdeling |
| 4 | Walk-in kan geen `seated` initial status krijgen | BLOCKING | Walk-in uitzondering in `create_reservation` |
| 5 | BEFORE INSERT trigger kan score niet berekenen (rij bestaat nog niet) | MEDIUM | Drop BEFORE INSERT, maak AFTER INSERT trigger |
| + | View mist `suggested_overbook_covers` en shift name join | Enhancement | Herschrijf `shift_risk_summary` view |

## Implementatie

### Stap 1: SQL Migratie

Een enkele migratie met alle 5 fixes:

**Enum rename**
- `ALTER TYPE reservation_status RENAME VALUE 'pending' TO 'draft'`
- `ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'draft'`

**transition_reservation_status (FIX 2)**
Gecorrigeerde matrix:
```text
draft:            [confirmed, cancelled, pending_payment, option]
pending_payment:  [confirmed, cancelled]
option:           [confirmed, cancelled]
confirmed:        [seated, cancelled, no_show]
seated:           [completed]
completed:        []  (terminal)
no_show:          []  (terminal)
cancelled:        []  (terminal)
```
Plus: zet timestamps (seated_at, completed_at, cancelled_at, no_show_marked_at, cancelled_by, cancellation_reason) bij relevante transities.

**create_reservation (FIX 4)**
Walk-in uitzondering:
- Als `_channel = 'walk_in'`: vereist `_initial_status = 'seated'`, zet `seated_at = now()`
- Anders: valideer tegen `draft, confirmed, option, pending_payment`

**calculate_no_show_risk (FIX 3)**
Correcte gewichten volgens spec:
- Factor 1: Gasthistorie — 40 punten max (40%). Nieuwe gast = 6 punten (~15%)
- Factor 2: Groepsgrootte — 20 punten max (20%). 1-2p=2, 3-4p=6, 5-6p=12, 7+=20
- Factor 3: Boekingstermijn — 20 punten max (20%). 0-1d=1, 2-7d=4, 8-14d=10, 15-30d=15, 30+=20
- Factor 4: Kanaal — 10 punten max (10%). walk_in=0, phone=1, operator=2, whatsapp=3, widget=6, google=10
- Factor 5: Dag van de week — 10 punten max (10%). Ma-Do=2, Vr=5, Za=10, Zo=4

**Trigger fix (FIX 5)**
- DROP de BEFORE INSERT trigger `trg_calculate_no_show_risk_insert`
- Nieuwe functie `fn_calculate_no_show_risk_after_insert()` die UPDATE na insert doet
- Nieuwe AFTER INSERT trigger

**View enhancement**
Herschrijf `shift_risk_summary` met:
- JOIN naar shifts voor `shift_name`
- `ROUND(SUM(r.no_show_risk_score / 100.0 * r.party_size)) AS suggested_overbook_covers`
- Behoudt `security_invoker = true`

### Stap 2: TypeScript Updates

**`src/types/reservation.ts`**
- `ReservationStatus`: `'pending'` wordt `'draft'`
- `ALLOWED_TRANSITIONS`: gecorrigeerde matrix (draft als start, terminal states leeg)

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| Nieuwe SQL migratie | Enum rename, 3 functies herschreven, trigger fix, view herschreven |
| `src/types/reservation.ts` | `pending` -> `draft`, ALLOWED_TRANSITIONS gecorrigeerd |

Hooks hoeven niet te wijzigen — ze gebruiken types, geen hardcoded strings.

