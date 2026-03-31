

# Webchat niet zichtbaar op gastportaal — Diagnose & Fix

## Analyse

De code in `ManageReservation.tsx` (regels 442-457) rendert de GuestPreferences en GuestChat **alleen** wanneer:
```
data.manage_token && isActive
```

Waar `isActive = res.status === 'confirmed' || res.status === 'option'`.

De API (regel 631) retourneert `manage_token: token` correct. De status in je screenshot is "Bevestigd" (= confirmed), dus beide condities zouden `true` moeten zijn.

## Mogelijke oorzaak

De meest waarschijnlijke reden: de **Edge Function `public-booking-api` is nog niet opnieuw gedeployed** na de wijzigingen van Sprint E.1c. De oude versie retourneert mogelijk geen `manage_token` in de response, waardoor de conditie faalt.

Daarnaast: de Edge Functions `webchat-message`, `webchat-messages`, en `webchat-preferences` moeten ook gedeployed zijn.

## Plan

1. **Edge Functions deployen** — Forceer redeployment van `public-booking-api`, `webchat-message`, `webchat-messages`, en `webchat-preferences`
2. **Fallback toevoegen** — Als `manage_token` ontbreekt in de API response, gebruik de `token` uit de URL params als fallback:
   ```typescript
   const manageToken = data.manage_token || token;
   ```
3. **Test** — Open een manage-link en verifieer dat de GuestPreferences en GuestChat secties zichtbaar zijn onder de reserveringskaart

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/ManageReservation.tsx` | Fallback: gebruik URL token als manage_token ontbreekt |

