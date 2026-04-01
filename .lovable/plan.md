
# Diagnose: waarom jij geen webchat ziet

## Begrip van het concept
Ja, het concept is helder:
- `/manage/:token` moet het publieke gastportaal zijn
- voor actieve reserveringen moet daar onder de reserveringskaart extra content zichtbaar zijn:
  - Allergieën & voorkeuren
  - Webchat
- volledig in restaurant-branding
- zonder login, via de `manage_token`

## Wat ik in de code zie
De webchat is al ingebouwd in `ManageReservation.tsx`.
De extra blokken renderen al zodra:
- er een `manageToken` is
- de reservering `confirmed` of `option` is

Dat betekent: het concept is goed begrepen, maar de gebruiker komt waarschijnlijk niet op de juiste versie van de beheerpagina terecht.

## Waarschijnlijke hoofdoorzaak
De beheer-link uit de boekingsflow gebruikt nu eerst de backend `manage_url`.

Die `manage_url` wordt in `public-booking-api` opgebouwd met `PUBLIC_SITE_URL` en valt standaard terug op de gepubliceerde URL:
`https://resto-spark-flow.lovable.app`

Daardoor gebeurt waarschijnlijk dit:
1. jij test in de preview
2. je klikt op “Reservering beheren”
3. je gaat ongemerkt naar de gepubliceerde app
4. daar staat niet de nieuwste guest-portal versie
5. dus zie je geen webchat / voorkeurensectie

## Tweede bug die ik ook zie
In `public-booking-api` gebruikt `handleManageGet()` later `data.location_id`, maar die kolom wordt in de reservation query niet geselecteerd.

Dat kan verklaren waarom branding deels leeg is of inconsistent werkt op de beheerpagina.

## Plan
1. Frontend beheer-link preview-safe maken
   - In `ConfirmationStep.tsx` de beheer-link opbouwen met `window.location.origin + /manage/:token`
   - Dus niet primair vertrouwen op backend `manage_url` voor navigatie vanuit de app zelf

2. Zelfde fix toepassen in de wachtlijstflow
   - `WaitlistAccept.tsx` ook laten linken naar de huidige origin
   - Zo blijft testen in preview altijd binnen preview

3. `public-booking-api` repareren
   - `location_id` toevoegen aan de `handleManageGet()` reservation select
   - Hierdoor werken branding en locatiecontext correct

4. Gastportaal end-to-end verifiëren
   - Nieuwe reservering maken in preview
   - “Reservering beheren” klikken
   - Controleren dat de URL preview blijft
   - Controleren dat onder de hoofdkaart nu zichtbaar zijn:
     - `GuestPreferences`
     - `GuestChat` / knop “Stel een vraag”

## Technische details
**Bestanden**
- `src/components/booking/ConfirmationStep.tsx`
- `src/pages/WaitlistAccept.tsx`
- `supabase/functions/public-booking-api/index.ts`

**Concreet**
- frontend CTA’s: lokale URL gebruiken
- backend `manage_url`: laten bestaan voor emails/externe links
- query fix:
```ts
.select(`
  id,
  location_id,
  reservation_date,
  start_time,
  end_time,
  ...
`)
```

## Verwachte uitkomst
- Preview-tests openen de juiste beheerpagina
- Webchat wordt zichtbaar in de preview-flow
- Branding op het gastportaal wordt completer/correcter geladen
- Gepubliceerde links voor echte gasten blijven bruikbaar
