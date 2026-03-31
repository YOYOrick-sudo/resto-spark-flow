

# Sprint E.1c — Gastportaal + Webchat

## Huidige Staat

- **ManageReservation.tsx** bestaat: toont reservering, wijzigen, annuleren. Gebruikt `public-booking-api/manage` endpoint.
- **manage API** retourneert: `location_id`, `restaurant_name`, `logo_url` (uit communication_settings), reserveringsdata, `customer` (first_name, last_name, email, phone_number). Retourneert NIET: `customer_id`, `brand_color_primary`, `hero_image_url`.
- **conversations** tabel heeft `reservation_id`, `channel`, `channel_contact_id` — webchat past hier direct in.
- **messages** tabel heeft `reservation_id`, `channel`, `direction`, `is_ai_generated` — allemaal bruikbaar.
- **customers.dietary_preferences** is `text[]` (string array), NIET JSONB. Sprint spec wil een object opslaan — dat past niet. Oplossing: migratie naar JSONB, of simpeler: bewaar als flat string array + aparte kolom voor vrij tekstveld.
- **brandingHelper.ts** bestaat al als shared helper in Edge Functions.
- **messaging_config** heeft `webchat_enabled` kolom.
- **send-message** Edge Function bestaat al met `webchat_new_reply` template.
- **isAiChannel()** helper bestaat al.

## Wat gebouwd wordt

### 1. Manage API uitbreiden (public-booking-api)

De `handleManageGet` functie wordt uitgebreid om extra data terug te geven:
- `customer_id` (nodig voor allergieën opslaan + conversation lookup)
- `brand_color` (uit locations.brand_color_primary met fallback)
- `hero_image_url` (uit locations)
- `manage_token` (de token zelf, voor webchat calls)

Locations query uitbreiden: `name, logo_url, brand_color_primary, hero_image_url`.

### 2. Edge Function: `webchat-message/index.ts` (Nieuw)

Publiek endpoint (verify_jwt = false). Input: `{ manage_token, content }`.
- Valideert manage_token → haalt reservering op
- Zoekt of maakt conversation (channel: 'webchat', channel_contact_id: manage_token)
- Insert bericht in messages (direction: 'inbound', channel: 'webchat')
- Update conversation.last_message_at + unread_count
- Returns { success, message_id, conversation_id }

### 3. Edge Function: `webchat-messages/index.ts` (Nieuw)

Publiek GET endpoint. Input: `?token=manage_token`.
- Valideert token → haalt conversation op
- Returns berichten (id, direction, content, message_type, created_at)
- Filtert `is_ai_generated` eruit — gast mag dat niet zien

### 4. Allergieën: kolom migratie + Edge Function

**Problem**: `dietary_preferences` is `text[]` maar we willen structured data (allergenen + vegetarisch/vegan + vrij tekstveld).

**Oplossing**: Migratie van `text[]` naar `jsonb`. Bestaande data converteren: `ARRAY['gluten'] → {"allergies": ["gluten"]}`.

Nieuw publiek Edge Function: `webchat-preferences/index.ts`:
- GET: haal dietary_preferences op via manage_token
- POST: update dietary_preferences via manage_token
- Geen auth nodig, validatie via manage_token

### 5. ManageReservation.tsx → Gastportaal

Volledige redesign van de pagina:

**Branding**: Hero image banner (als beschikbaar), brand_color als accent voor knoppen en links, restaurant naam prominent.

**Nieuwe secties**:
1. Reserveringskaart (bestaand, met brand_color accent)
2. **Allergieën & voorkeuren**: 14 EU-allergenen checkboxen + vegetarisch/vegan + vrij tekstveld. Opslaan via `webchat-preferences` endpoint.
3. **Webchat**: Chat venster met berichten, input veld, verstuur knop. Berichten laden via `webchat-messages`, versturen via `webchat-message`. Realtime updates via Supabase channel subscription op messages tabel.

**Design**:
- Brand color als CSS custom property (`--portal-primary`)
- Knoppen en accenten in brand_color
- Gast-berichten links (lichtgrijs), restaurant rechts (brand_color tint)
- Geen ✦ sparkle of AI-indicator
- Mobile-first
- "Powered by Nesto" footer blijft

### 6. Email notificatie bij webchat antwoord

Dit hoort bij Sprint E.2/E.3 (wanneer de AI of operator daadwerkelijk antwoordt). Maar we bereiden de template voor:
- `webchat_new_reply` template bestaat al in send-message
- Throttling logica (max 1 email/10 min per conversation) toevoegen als `last_notification_at` kolom op conversations

---

## Aanpassingen t.o.v. sprint spec

| Spec | Werkelijkheid | Aanpassing |
|---|---|---|
| `dietary_preferences` als JSONB | Is `text[]` | Migratie naar JSONB |
| Direct Supabase queries vanuit frontend | Pagina is publiek, geen auth | Edge Functions voor alle data-access |
| Publieke view voor branding | Manage API bestaat al | Uitbreiden manage API response |
| `send-webchat-notification` Edge Function | `send-message` met `webchat_new_reply` template bestaat al | Hergebruik bestaande functie, throttling toevoegen |

## Database migratie

- ALTER `customers.dietary_preferences` van `text[]` naar `jsonb` met data conversie
- ADD `conversations.last_notification_at` (timestamptz, nullable) voor email throttling
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages` (als nog niet actief)

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/functions/webchat-message/index.ts` | **Nieuw** |
| `supabase/functions/webchat-messages/index.ts` | **Nieuw** |
| `supabase/functions/webchat-preferences/index.ts` | **Nieuw** |
| `supabase/functions/public-booking-api/index.ts` | Uitbreiden manage response |
| `supabase/config.toml` | 3 nieuwe functies registreren |
| `src/pages/ManageReservation.tsx` | Volledige redesign → gastportaal |
| `src/components/guest/GuestChat.tsx` | **Nieuw** — webchat component |
| `src/components/guest/GuestPreferences.tsx` | **Nieuw** — allergieën formulier |
| Database migratie | dietary_preferences type change + last_notification_at |

## Volgorde

1. Database migratie (dietary_preferences + last_notification_at + realtime)
2. Edge Functions (webchat-message, webchat-messages, webchat-preferences)
3. Config.toml + manage API uitbreiden
4. GuestPreferences component
5. GuestChat component
6. ManageReservation.tsx redesign met branding + nieuwe secties

