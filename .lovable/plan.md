

# Fix: Duplicate customer constraint violation

## Probleem

De `handleBook` functie zoekt bestaande customers op **email**, maar de unique constraint `idx_customers_location_phone` is op `(location_id, phone_number)`. Als dezelfde gast met hetzelfde telefoonnummer maar ander emailadres boekt, wordt de lookup gemist → insert faalt op de unique constraint.

Zelfde race condition risico in `whatsapp-webhook` en de `waitlist` handler.

## Oplossing

Alle drie de plekken omzetten naar een **upsert** pattern met `ON CONFLICT`.

### 1. `public-booking-api/index.ts` — handleBook (regel ~334-386)

Vervang de select-then-insert door een upsert. Zoek eerst op phone_number (primary match) OF email (fallback). Gebruik upsert:

```sql
INSERT INTO customers (location_id, first_name, last_name, email, phone_number, language, tags, dietary_preferences)
VALUES (...)
ON CONFLICT (location_id, phone_number) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  updated_at = NOW()
RETURNING id, tags, dietary_preferences
```

In Supabase JS: `.upsert({...}, { onConflict: 'location_id,phone_number' })`. Na de upsert alsnog tags en dietary_preferences mergen (niet overschrijven).

### 2. `public-booking-api/index.ts` — waitlist handler (regel ~1060-1086)

Zelfde upsert pattern. Momenteel zoekt ook op email, moet op phone_number + location_id.

### 3. `whatsapp-webhook/index.ts` — findOrCreateCustomer (regel ~278-305)

Heeft al een select-then-insert op phone_number, maar is vatbaar voor race conditions. Omzetten naar `.upsert()` met `onConflict: 'location_id,phone_number'`.

### 4. `webchat-message/index.ts`

Maakt geen customers aan (gebruikt `reservation.customer_id`). Geen wijziging nodig.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/public-booking-api/index.ts` | handleBook: upsert op phone_number + merge tags/dietary. Waitlist: zelfde upsert pattern |
| `supabase/functions/whatsapp-webhook/index.ts` | findOrCreateCustomer: vervang select+insert door `.upsert()` |

