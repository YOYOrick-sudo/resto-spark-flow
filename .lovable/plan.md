

# Fase 4.7b — Reservation Detail Panel + Create Flow + Acties

## Overzicht

Dit is een grote fase die voortbouwt op 4.7a. Het omvat: database migraties (customer_id nullable, BEFORE INSERT trigger, override op transition RPC), 7 nieuwe UI-componenten, realtime subscription, en een create/walk-in flow. De 4 toevoegingen uit de review zijn geintegreerd.

**Score-schaal waarschuwing:** Integer 0-100 is canoniek. De AI_FEATURE_1_RISK_SCORE.md documentatie beschrijft de score als float 0.0-1.0 -- dat is een initieel ontwerp, NIET de implementatie. De 4.6 database gebruikt integer 0-100. Alle UI-code in deze fase MOET de 0-100 schaal gebruiken. Geen conversies, geen floats.

---

## Deel 1: Database Migratie (1 migratiebestand)

Alle database-wijzigingen in een enkele migratie:

### 1A. customer_id nullable + FK ON DELETE SET NULL

```text
-- Drop bestaande FK (ON DELETE RESTRICT)
ALTER TABLE public.reservations DROP CONSTRAINT reservations_customer_id_fkey;

-- Maak nullable
ALTER TABLE public.reservations ALTER COLUMN customer_id DROP NOT NULL;

-- Hermaak FK met ON DELETE SET NULL
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
```

### 1B. actor_type op audit_log

```text
ALTER TABLE public.audit_log ADD COLUMN actor_type TEXT NOT NULL DEFAULT 'user';
```

Mogelijke waarden: user, system, webhook, ai_agent. Default 'user' voor alle bestaande en nieuwe entries.

### 1C. BEFORE INSERT trigger voor risk score

De functie `fn_calculate_no_show_risk()` bestaat al en is correct qua logica, MAAR crashed bij customer_id = NULL (NOT FOUND branch zet score op 0 en returnt zonder risk_factors te vullen).

Aanpak:
- DROP en hercreeer de functie met walk-in veilige logica: bij NOT FOUND, gebruik default scores (guest_history score = 6, detail = "Onbekende gast / walk-in") EN vul risk_factors jsonb
- Maak de ontbrekende BEFORE INSERT trigger:

```text
CREATE TRIGGER trg_calculate_risk_on_insert
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_no_show_risk();
```

### 1D. create_reservation RPC -- customer_id optioneel

```text
-- Hercreeer met _customer_id uuid DEFAULT NULL
-- Bij NULL customer_id: sla customer-gerelateerde checks over
```

### 1E. transition_reservation_status -- override + beveiliging

Hercreeer de RPC met extra parameter `_is_override BOOLEAN DEFAULT false`:

- Bij `_is_override = true`:
  - Permission check via `user_has_role_in_location(COALESCE(_actor_id, auth.uid()), _r.location_id, ARRAY['owner','manager'])`
  - Terminal states (completed, no_show, cancelled) als BRON geblokkeerd, ook bij override
  - `_reason` verplicht (RAISE als null)
  - Sla transitiematrix over voor non-terminal bronstatussen
- Actor: `COALESCE(_actor_id, auth.uid())` in audit_log
- Metadata: `is_override: true` in audit_log entry

---

## Deel 2: LEFT JOIN fix (KRITIEK)

Na customer_id nullable worden, moeten alle Supabase joins met customers een LEFT JOIN gebruiken. Supabase default is INNER JOIN. Syntax: `customers!left:customer_id(...)`.

Betrokken hooks:
- `useReservations` -- `customers:customer_id (...)` wordt `customers!left:customer_id (...)`
- `useReservation` -- idem
- Geen andere hooks joinen customers op reservations

Zonder deze fix verdwijnen walk-in reserveringen (customer_id = NULL) uit alle lijsten.

---

## Deel 3: TypeScript Type Updates

### Reservation interface -- nullable velden

```typescript
customer_id: string | null;              // was: string
no_show_risk_score: number | null;       // was: number
risk_factors?: Record<string, unknown> | null;
payment_status?: string | null;          // toekomstig (Stripe 4.13)
option_expires_at?: string | null;       // toekomstig (options 4.9)
reconfirmed_at?: string | null;          // toekomstig (messaging 4.14)
badges?: Record<string, unknown> | null; // toekomstig (badge data)
```

### CHANNEL_ICONS -- emoji's vervangen door Lucide icon namen

```typescript
export const CHANNEL_ICONS: Record<ReservationChannel, string> = {
  widget: 'Globe',
  operator: 'User',
  phone: 'Phone',
  google: 'Search',
  whatsapp: 'MessageCircle',
  walk_in: 'Footprints',
};
```

### useCreateReservation -- customer_id nullable

```typescript
customer_id: string | null;  // was: string
```

### useTransitionStatus -- is_override param

```typescript
interface TransitionParams {
  // ...bestaand...
  is_override?: boolean;
}
```

---

## Deel 4: Realtime Subscription

Update `useReservations` met Supabase realtime, gefilterd op location_id:

```typescript
useEffect(() => {
  if (!locationId) return;
  const channel = supabase
    .channel(`reservations-${locationId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'reservations',
      filter: `location_id=eq.${locationId}`,
    }, () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservations(locationId),
        exact: false,
      });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [locationId, queryClient]);
```

---

## Deel 5: Nieuwe UI Componenten (7 stuks)

### 5.1 ReservationBadges.tsx

Alle 11 badge-types met null-safe condities. Lucide iconen, geen emoji's.

| Badge | Conditie | Rendert nu? |
|-------|----------|-------------|
| Squeeze | `is_squeeze === true` | Ja |
| Hoog risico | `no_show_risk_score !== null && >= 50` | Ja |
| Verhoogd risico | `no_show_risk_score !== null && >= 30 && < 50` | Ja |
| VIP | `Array.isArray(customer?.tags) && customer.tags.includes('vip')` | Ja |
| Allergieeen | `reservation.badges?.allergies` | Nee |
| Prepaid | `payment_status === 'paid'` | Nee |
| Deposit | `payment_status === 'deposit_paid'` | Nee |
| Optie verloopt | `status === 'option' && option_expires_at` | Nee |
| Herbevestigd | `reconfirmed_at !== null` | Nee |
| Wachtlijst | `badges?.waitlist_filled` | Nee |
| Kanaal | altijd, tenzij walk_in of operator | Ja |

### 5.2 CustomerCard.tsx

- Contactgegevens + bezoekstats
- Bezoekhistorie via `useReservationsByCustomer`, max 5
- "Toon alle bezoeken" link bij > 5
- Klant notities
- Als customer_id null: lege state "Geen klantgegevens gekoppeld" + **"Klant koppelen" knop** -- werkend: opent een zoek-/selectie-dialoog die `useCustomers` en `useUpdateReservation` (of een directe `.update()` call) gebruikt om een bestaande klant te koppelen aan de reservering. De hooks bestaan al; dit is geen placeholder.

### 5.3 RiskScoreSection.tsx

- Score weergave (0-100, integer schaal) met visuele indicator
- Drempels: 0-29 = laag, 30-49 = verhoogd, 50-100 = hoog
- Per-factor breakdown uit risk_factors jsonb
- "Bevestiging sturen" placeholder bij score >= 50 AND confirmed
- Null state: "Risicoscore wordt berekend..."
- **Shift context**: onder de breakdown een regel "Shift gemiddeld: X%" via query op shift_risk_summary view

### 5.4 AuditLogTimeline.tsx

- Via `useAuditLog('reservation', reservationId)`
- Per entry: actie, actor naam (of "Systeem"), timestamp via `formatDateTimeCompact()`
- Override entries visueel onderscheidbaar (waarschuwingsbadge)

### 5.5 ReservationActions.tsx

Actieknoppen per status:

| Status | Werkend | Placeholder (disabled) |
|--------|---------|----------------------|
| draft | Bevestigen, Optie, Annuleren | Betaling aanvragen |
| pending_payment | Annuleren | Betaallink opnieuw |
| option | Bevestigen, Annuleren | Optie verlengen |
| confirmed | Inchecken, No-show, Annuleren | Betaling aanvragen |
| confirmed + risk>=50 | (bovenstaande) | Bevestiging sturen |
| seated | Afronden | Tafel wijzigen |
| completed | -- | -- |
| no_show | -- | Terugbetalen, Kwijtschelden |
| cancelled | -- | Terugbetalen, Kwijtschelden |

8 placeholder knoppen totaal.

**Operator Override**: "Andere actie uitvoeren..." link, alleen voor manager/owner. Opent dialoog met alle statussen behalve huidige en terminal-als-bron. Verplicht reden, waarschuwingstekst, `is_override: true`.

### 5.6 ReservationDetailPanel.tsx

Wraps bestaand `DetailPanel` component. 4 secties:
1. Header + samenvatting + ReservationBadges + ReservationActions
2. CustomerCard (incl. "Klant koppelen" bij null customer)
3. RiskScoreSection (incl. shift gemiddelde)
4. AuditLogTimeline

Data via `useReservation(reservationId)`.

### 5.7 CreateReservationSheet.tsx

Sheet (side="right") met 3-staps flow:

**Stap 1: Klant**
- Zoekbalk met `useCustomers(searchTerm)`
- "Nieuwe klant" inline formulier
- "Walk-in (zonder klant)" -- customer_id = null

**Stap 2: Details**
- Datum, shift, ticket, party size, tijdslot, tafel (optioneel), kanaal, notities, squeeze
- Overlap waarschuwing (client-side, niet-blokkerend)

**Stap 3: Bevestig**
- Samenvatting + status keuze (confirmed/draft/option)
- Submit via `useCreateReservation()`

**Walk-in shortcut**: aparte knop, vereenvoudigd formulier. Expliciete defaults:
- `reservation_date` = vandaag (YYYY-MM-DD)
- `start_time` = huidige tijd (afgerond op 15 min)
- `channel` = `walk_in`
- `status` = `seated` (direct ingecheckt)
- `customer_id` = null
- Alleen party size en tafel (optioneel) als input

---

## Deel 6: ConfirmDialog uitbreiding

Voeg optionele `showReasonField?: boolean` prop toe aan bestaand `ConfirmDialog`:
- Toont een tekstveld voor reden
- `onConfirmWithReason?: (reason: string) => void`
- Backward compatible

---

## Deel 7: View Updates

### Reserveringen.tsx pagina

- Layout wordt flex row: main content + DetailPanel
- `selectedReservationId` state
- Click handlers openen ReservationDetailPanel
- "Reservering" knop opent CreateReservationSheet
- Nieuwe "Walk-in" knop

### ReservationBlock (Grid View)

- Risico-indicator: subtiele border/dot bij score >= 50 (rood) en 30-49 (oranje). Null-safe.
- Squeeze indicator bij `is_squeeze === true`

### ReservationListView

- Extra kolom: risicoscore (percentage + kleur). Null-safe.
- Extra kolom: kanaal (Lucide icoon)

---

## Deel 8: Opruiming

- Verwijder `src/data/reservations.ts`
- Grep check: geen resterende imports
- Behoud: `pacingMockData.ts`, `assistantMockData.ts`

---

## Implementatievolgorde

1. Database migratie: customer_id nullable + FK ON DELETE SET NULL + actor_type op audit_log + BEFORE INSERT trigger + fn fix voor NULL customer + create_reservation customer_id optional + transition override param
2. LEFT JOIN fix: useReservations + useReservation `!left` syntax
3. Types: Reservation interface nullable velden + CHANNEL_ICONS Lucide + hook params
4. Realtime: Gefilterde subscription op useReservations
5. ConfirmDialog: Reden-tekstveld prop
6. ReservationBadges: 11 types, null-safe
7. CustomerCard: Contact + bezoekhistorie + null state + "Klant koppelen" werkend
8. RiskScoreSection: Score meter + breakdown + shift gemiddelde
9. AuditLogTimeline: Entries + override styling
10. ReservationActions: Werkend + placeholders + override
11. ReservationDetailPanel: Wrapper met 4 secties
12. CreateReservationSheet: 3-staps + walk-in shortcut
13. Reserveringen pagina: Panel integratie + create + walk-in knop
14. Grid/List View: Risico + squeeze indicators + kanaal kolom
15. Opruiming: Mock data verwijderen

---

## Bestanden overzicht

| Bestand | Actie |
|---------|-------|
| SQL migratie | Nieuw |
| `src/hooks/useReservations.ts` | Update -- LEFT JOIN + realtime |
| `src/hooks/useReservation.ts` | Update -- LEFT JOIN |
| `src/hooks/useCreateReservation.ts` | Update -- customer_id nullable |
| `src/hooks/useTransitionStatus.ts` | Update -- is_override param |
| `src/types/reservation.ts` | Update -- nullable velden + Lucide icons |
| `src/components/polar/ConfirmDialog.tsx` | Update -- reden-veld |
| `src/components/reservations/ReservationBadges.tsx` | Nieuw |
| `src/components/reservations/CustomerCard.tsx` | Nieuw |
| `src/components/reservations/RiskScoreSection.tsx` | Nieuw |
| `src/components/reservations/AuditLogTimeline.tsx` | Nieuw |
| `src/components/reservations/ReservationActions.tsx` | Nieuw |
| `src/components/reservations/ReservationDetailPanel.tsx` | Nieuw |
| `src/components/reservations/CreateReservationSheet.tsx` | Nieuw |
| `src/pages/Reserveringen.tsx` | Update -- panel + create |
| `src/components/reserveringen/ReservationBlock.tsx` | Update -- risico indicator |
| `src/components/reserveringen/ReservationListView.tsx` | Update -- extra kolommen |
| `src/data/reservations.ts` | Verwijderen |

---

## Wat NIET in scope zit

| Feature | Fase | Placeholder knop? |
|---------|------|-------------------|
| Availability check in create flow | 4.10 | Nee (handmatige time picker) |
| Check-in window regels | 4.8 | Nee |
| Auto no-show marking | 4.8 | Nee |
| Option auto-expiry | 4.9 | Nee |
| Tafel wijzigen (move table) | 4.8 | Ja (disabled) |
| Betaling aanvragen/verwerken | 4.13 | Ja (disabled) |
| Betaallink opnieuw sturen | 4.13 | Ja (disabled) |
| Terugbetalen / Kwijtschelden | 4.13 | Ja (disabled) |
| Optie verlengen | 4.9 | Ja (disabled) |
| Bevestiging/reminder sturen | 4.14 | Ja (disabled) |
| DnD mutaties | Later | Nee |

---

## Acceptance Criteria

- [ ] customer_id is nullable, walk-in zonder klant mogelijk
- [ ] FK is ON DELETE SET NULL (GDPR-ready)
- [ ] actor_type kolom bestaat op audit_log
- [ ] LEFT JOIN in useReservations + useReservation (walk-ins verschijnen in lijsten)
- [ ] BEFORE INSERT trigger vuurt: no_show_risk_score en risk_factors gevuld
- [ ] Risk functie werkt met customer_id = NULL
- [ ] Detail panel opent bij klik, gebruikt bestaand DetailPanel component
- [ ] Alle 4 secties tonen correcte data, null-safe
- [ ] RiskScoreSection toont shift gemiddelde
- [ ] 8 placeholder knoppen aanwezig
- [ ] Override: alleen manager/owner, terminal states geblokkeerd, verplicht reden
- [ ] ConfirmDialog heeft reden-tekstveld
- [ ] Walk-in registratie werkt (customer_id = null, direct seated)
- [ ] Walk-in defaults: datum=vandaag, tijd=nu, channel=walk_in, status=seated
- [ ] Create flow met overlap waarschuwing
- [ ] Realtime gefilterd op location_id
- [ ] Alle 11 badge-types conditioneel, null-safe, Lucide iconen
- [ ] CustomerCard toont "Klant koppelen" knop bij null customer (werkend, niet placeholder)
- [ ] Score-schaal consistent 0-100 integer (NIET 0.0-1.0 float)
- [ ] src/data/reservations.ts verwijderd
- [ ] Geen build errors

---

## Checkpoint Vragen

Na implementatie beantwoord deze 10 vragen:

1. **Trigger**: Maak een reservering aan (met EN zonder customer). Zijn `no_show_risk_score` en `risk_factors` gevuld? Crashed de functie bij `customer_id = NULL`?

2. **Walk-in**: Kun je een walk-in registreren zonder klant? Wordt `customer_id` als null opgeslagen? Status direct `seated`? Zijn datum=vandaag, tijd=nu, channel=`walk_in` correct als defaults ingevuld?

3. **DetailPanel**: Gebruik je het bestaande `DetailPanel` component of een nieuwe Sheet? Indien nieuw: waarom?

4. **Null-safety**: Is `no_show_risk_score` overal als `number | null` behandeld? Geen runtime crashes bij null scores?

5. **Override beveiliging**: Kan een gewone operator (niet-manager) de override gebruiken? Worden terminal states (completed, no_show, cancelled) geblokkeerd als bron-status bij override?

6. **Realtime**: Is de subscription gefilterd op `location_id`? Worden alleen relevante queries geinvalideerd?

7. **Bevestigingsdialoog**: Heeft de dialoog een reden-tekstveld? Hoe is dit opgelost -- bestaand component uitgebreid of nieuw?

8. **Placeholder knoppen**: Tel ze: betaling aanvragen (draft + confirmed), betaallink opnieuw sturen (pending_payment), optie verlengen (option), tafel wijzigen (seated), bevestiging sturen (confirmed + risico >= 50), terugbetalen + kwijtschelden (no_show + cancelled). Alle 8 aanwezig?

9. **Klant koppelen**: Werkt de "Klant koppelen" knop in de CustomerCard bij een reservering zonder customer? Kan je een bestaande klant zoeken en koppelen?

10. **Badges en score-schaal**: Zijn alle 11 badge condities geimplementeerd? Welke renderen nu al? Is de score-schaal overal 0-100 integer (niet 0.0-1.0)?

