

# Booking & Message Emails Laten Werken via Resend Sandbox

## Probleem

Onboarding emails kwamen wel aan omdat `_shared/email.ts` terugvalt op `onboarding@resend.dev` (Resend sandbox domein). Maar twee andere functies gebruiken altijd `noreply@nesto.app` — een domein dat niet geverifieerd is in Resend — waardoor emails stilletjes falen.

| Functie | Huidige from | Werkt? |
|---------|-------------|--------|
| `_shared/email.ts` (onboarding-agent) | `onboarding@resend.dev` (fallback) | Ja |
| `public-booking-api` (booking confirmations) | `noreply@nesto.app` (hardcoded) | Nee |
| `send-onboarding-message` (handmatige berichten) | `noreply@nesto.app` (hardcoded) | Nee |

## Oplossing

Dezelfde fallback-logica toepassen in de twee kapotte functies: gebruik `RESEND_FROM_EMAIL` env var als die gezet is, anders `onboarding@resend.dev`.

**Beperking**: Sandbox-domein stuurt alleen naar het emailadres waarmee het Resend account is aangemaakt. Later kun je `nesto.app` verifiëren in Resend en de `RESEND_FROM_EMAIL` secret instellen op `noreply@nesto.app`.

## Wijzigingen

### 1. `supabase/functions/public-booking-api/index.ts`

Lijn 550 verandert van:
```
from: `${senderName} <noreply@nesto.app>`
```
naar:
```
const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
// ...
from: `${senderName} <${verifiedFrom}>`
```

### 2. `supabase/functions/send-onboarding-message/index.ts`

Lijn 86-88 verandert van:
```
const fromEmail = commSettings?.sender_name
  ? `${commSettings.sender_name} <noreply@nesto.app>`
  : `${senderName} <noreply@nesto.app>`;
```
naar:
```
const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
const fromEmail = `${senderName} <${verifiedFrom}>`;
```

### 3. `supabase/functions/_shared/email.ts`

Lijn 64-65: dezelfde fix voor het geval er wel een `sender_name` in de communicatie-instellingen staat (nu valt die tak ook terug op `noreply@nesto.app`).

```
const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
const fromEmail = `${emailConfig.sender_name || 'Nesto'} <${verifiedFrom}>`;
```

## Samenvatting

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/public-booking-api/index.ts` | Sandbox fallback voor from-adres |
| `supabase/functions/send-onboarding-message/index.ts` | Sandbox fallback voor from-adres |
| `supabase/functions/_shared/email.ts` | Consistente fallback als sender_name wel gezet is |

Geen nieuwe secrets nodig. Geen database wijzigingen. Na deployment kun je testen door een boeking te maken — de bevestigingsmail komt dan aan op het emailadres van je Resend account.
