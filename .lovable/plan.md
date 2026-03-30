

# Send Reservation Email — Operator Bevestiging + Annulering

## Samenvatting

Nieuwe generieke Edge Function `send-reservation-email` die voor elk template type (confirmation, cancellation, etc.) de juiste email verstuurt. Operator UI roept deze aan na het aanmaken of annuleren van een reservering.

---

## 1. Edge Function: `send-reservation-email/index.ts`

**Input:** `{ reservation_id, template_key }`

Logica:
1. Laad reservering + customer (email, naam) + ticket + location uit database
2. Als geen customer email → return early (geen email mogelijk)
3. Laad template uit `reservation_email_templates` voor location + template_key, fallback naar DEFAULT_TEMPLATES
4. Vervang placeholders ({restaurant}, {datum}, {tijd}, {gasten}, {voornaam}, {beheerlink})
5. Laad branding uit `communication_settings` (logo, brand_color, footer_text, sender_name, reply_to)
6. Bouw email via `buildEmailHtml` uit `_shared/emailLayout.ts` met details tabel
7. Verstuur via Resend (zelfde pattern als `bookingEmail.ts`)
8. Log resultaat

Registreer in `config.toml` met `verify_jwt = false`.

## 2. Operator UI — CreateReservationSheet

**Bestand:** `src/components/reservations/CreateReservationSheet.tsx`

In `handleSubmit` (regel 260-311), na succesvolle reservering:
- Check: heeft selectedCustomer een email?
- Zo ja: fire-and-forget `supabase.functions.invoke('send-reservation-email', { body: { reservation_id, template_key: 'confirmation' } })`
- Pas toast aan: "Reservering aangemaakt · Bevestiging verstuurd" (als email gestuurd) vs bestaande toast (als geen email)

**Confirm stap (regel 345-365):** Voeg een toggle toe "Bevestigingsmail sturen" (default: aan, alleen zichtbaar als customer email heeft). Sla state op in `sendConfirmation` boolean.

## 3. Operator UI — Annulering

**Bestand:** `src/pages/Reserveringen.tsx`

In `handleStatusChange` (regel 99-112): als `newStatus === 'cancelled'`, na succesvolle transitie:
- Check: heeft reservation een customer_id + email?
- Zo ja: fire-and-forget `supabase.functions.invoke('send-reservation-email', { body: { reservation_id: reservation.id, template_key: 'cancellation' } })`
- Pas toast aan: "Geannuleerd · Annuleringsmail verstuurd"

## 4. useCreateReservation hook

Geen wijzigingen nodig — de email wordt vanuit de UI component aangestuurd, niet vanuit de hook.

---

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/functions/send-reservation-email/index.ts` | **Nieuw** — generieke email sender |
| `supabase/config.toml` | Registratie |
| `src/components/reservations/CreateReservationSheet.tsx` | Email na aanmaken + toggle |
| `src/pages/Reserveringen.tsx` | Email na annulering |

## Volgorde

1. Edge Function + config.toml
2. CreateReservationSheet (email + toggle)
3. Reserveringen.tsx (annulering email)

