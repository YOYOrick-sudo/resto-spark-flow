

# Persoonlijke begroeting in bevestigingsmail voor terugkerende gasten

## Wat verandert

In de booking confirmation email wordt de begroeting aangepast op basis van of de klant al bekend is:

- **Bestaande klant**: "Leuk dat je weer bij ons reserveert, {voornaam}!"
- **Nieuwe klant**: "Hallo {voornaam}, we kijken ernaar uit je te verwelkomen."

## Technische aanpak

### Bestand: `supabase/functions/public-booking-api/index.ts`

**1. `BookingEmailParams` interface uitbreiden (regel ~447)**
- Nieuw veld: `is_returning_guest: boolean`

**2. `handleBook` — flag meegeven (regel ~417)**
- De variabele `existingCustomer` (regel 338) is al beschikbaar. Bij de aanroep van `sendBookingConfirmationEmail` wordt `is_returning_guest: !!existingCustomer` meegegeven.

**3. `sendBookingConfirmationEmail` — begroeting aanpassen (regel ~524)**
- De huidige vaste tekst `Hallo ${params.first_name}, we kijken ernaar uit je te verwelkomen.` wordt conditioneel:

```
const greeting = params.is_returning_guest
  ? `Leuk dat je weer bij ons reserveert, ${params.first_name}!`
  : `Hallo ${params.first_name}, we kijken ernaar uit je te verwelkomen.`;
```

Geen database queries nodig — de info is al beschikbaar in de bestaande flow.

