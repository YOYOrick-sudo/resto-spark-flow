

# Mollie Connect UI Afronding — Sprint A.4

## 1. ConfirmationStep: Payment polling

**Bestand:** `src/components/booking/ConfirmationStep.tsx`

- Lees `bookingResult.requires_payment` en `bookingResult.payment_status` uit BookingContext
- Als `requires_payment === true`: start polling loop (`setInterval` elke 3s, max 20 iteraties = 60s)
- Poll: `GET /functions/v1/public-booking-api/manage?token={manage_token}` → lees `payment_status`
- **pending**: spinner + "Betaling wordt verwerkt..."
- **paid**: stop polling, toon bestaande checkmark flow
- **expired/failed/canceled**: stop polling, toon foutmelding + "Opnieuw betalen" knop (POST `mollie-create-payment` → redirect)
- Cleanup interval in `useEffect` return
- Fallback na 60s timeout: toon "Controleer je email" bericht

## 2. Payment badges

**Bestand:** `src/components/reservations/ReservationBadges.tsx`

Vervang huidige hardcoded `paid`/`deposit_paid` checks (regels 57-65) met volledige payment_status mapping:

| payment_status | Badge | Kleur |
|---|---|---|
| `paid` | "Betaald" | groen (bestaand) |
| `deposit_paid` | "Deposit" | blauw (bestaand) |
| `pending` | "Wacht op betaling" | oranje |
| `expired`/`failed`/`canceled` | "Betaling mislukt" | rood |
| `refunded` | "Terugbetaald" | grijs |
| `partially_refunded` | "Deels terugbetaald" | grijs |
| `none` | geen badge | — |

Icoon: `CreditCard` (al geïmporteerd) voor alle payment badges.

## 3. Refund knop in detail panel

**Bestand:** `src/components/reservations/ReservationDetailPanel.tsx`

Nieuwe sectie tussen "Tafel" en "Customer Card" (na regel 238):

- Alleen tonen als `reservation.payment_status === 'paid'`
- Toon: betaald bedrag (`€{reservation.payment_amount}`)
- "Terugbetalen" knop → `ConfirmDialog` met optional bedrag input
- POST naar `mollie-create-refund` met `reservation_id` + optioneel `amount`
- Na succes: `nestoToast.success("Terugbetaling aangemaakt")` + invalidate query

Nieuw hook: `useMollieRefund.ts` — mutation wrapper voor `mollie-create-refund`.

## 4. Mollie signals

**Bestand:** `supabase/functions/evaluate-signals/index.ts`

Nieuw `mollieProvider` in providers array:
- Check `mollie_connections` voor locatie
- Check `policy_sets` met `payment_type !== 'none'`
- Als payment vereist maar geen Mollie connectie: warning "Mollie niet verbonden — deposits niet mogelijk"
- Check recente reserveringen met `payment_status = 'expired'`: info "Betaling verlopen voor [naam]"

## Bestanden

| Bestand | Actie |
|---|---|
| `src/components/booking/ConfirmationStep.tsx` | Payment polling + states |
| `src/components/reservations/ReservationBadges.tsx` | 6 payment badges |
| `src/components/reservations/ReservationDetailPanel.tsx` | Refund sectie |
| `src/hooks/useMollieRefund.ts` | **Nieuw** — refund mutation |
| `supabase/functions/evaluate-signals/index.ts` | mollieProvider |

## Volgorde

1. ReservationBadges (simpelst, geen dependencies)
2. useMollieRefund + ReservationDetailPanel refund sectie
3. ConfirmationStep payment polling
4. evaluate-signals mollieProvider

