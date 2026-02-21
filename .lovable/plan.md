
# QR Code & Manage Link — Correcte URL generatie

## Probleem

De QR-code en "Reservering beheren" link gebruiken `window.location.origin` om de manage URL te bouwen. In de editor-preview is dat `https://xxx.lovableproject.com`, wat Lovable platform-authenticatie vereist. Daardoor ziet een gast die de QR scant een inlogpagina.

Op de gepubliceerde site (`resto-spark-flow.lovable.app`) werkt het correct.

## Oplossing

De manage URL server-side genereren in de `handleBook` response van de `public-booking-api`, gebaseerd op de `Origin` of `Referer` header van het request. Als fallback gebruiken we het `id-preview` domein (dat is publiek toegankelijk) in plaats van het `lovableproject.com` domein.

### Aanpak

**1. Backend: `public-booking-api/index.ts` — manage_url meegeven in booking response**

In `handleBook`, na het aanmaken van de reservering, de `manage_url` samenstellen:
- Gebruik de `Origin` header uit het request
- Als die `lovableproject.com` bevat, vervang door het publieke `id-preview--{id}.lovable.app` equivalent
- Geef `manage_url` terug in de response (naast `manage_token`)

**2. Frontend: `ConfirmationStep.tsx` — manage_url uit response gebruiken**

In plaats van:
```typescript
const manageUrl = bookingResult?.manage_token
  ? `${window.location.origin}/manage/${bookingResult.manage_token}`
  : null;
```

Gebruik:
```typescript
const manageUrl = bookingResult?.manage_url || (
  bookingResult?.manage_token
    ? `${window.location.origin}/manage/${bookingResult.manage_token}`
    : null
);
```

**3. Frontend: `ManageReservation.tsx` — zelfde fix voor de email link**

De bevestigingsmail gebruikt al de backend; daar is geen wijziging nodig.

### Technisch detail: Origin herschrijven

```typescript
function getPublicBaseUrl(req: Request): string {
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  // lovableproject.com requires platform auth — rewrite to public id-preview domain
  const match = origin.match(/https:\/\/([a-f0-9-]+)\.lovableproject\.com/);
  if (match) {
    return `https://id-preview--${match[1]}.lovable.app`;
  }
  return origin.replace(/\/$/, '');
}
```

## Samenvatting wijzigingen

| Bestand | Wat |
|---------|-----|
| `supabase/functions/public-booking-api/index.ts` | `manage_url` toevoegen aan handleBook response met origin-herschrijving |
| `src/components/booking/ConfirmationStep.tsx` | `manage_url` uit response prefereren boven client-side constructie |
| `src/contexts/BookingContext.tsx` | `manage_url` toevoegen aan BookingResult type (indien nodig) |
