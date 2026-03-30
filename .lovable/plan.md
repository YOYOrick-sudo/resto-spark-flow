

# Email Template Redesign — Premium Restaurant Stijl

## Samenvatting

Alle email templates herontwerpen naar een clean, typografie-gebaseerd design zonder emoji's. Fine dining bevestigingsmails: rustig, zelfverzekerd, geen visuele ruis.

---

## Design Systeem (toegepast op alle emails)

```text
┌─────────────────────────────────────────┐  #f8f8f8
│                                         │
│   ┌─────────────────────────────┐       │
│   │  [LOGO max 72px, center]    │  wit  │
│   │          32px gap           │       │
│   │  Heading (20px, #222)       │       │
│   │  Intro (14px, #666)        │       │
│   │                             │       │
│   │  DATUM    vrijdag 28 mrt    │       │
│   │  ─────────────────────────  │  1px  │
│   │  TIJD     19:30             │  #eee │
│   │  ─────────────────────────  │       │
│   │  GASTEN   4 personen        │       │
│   │  ─────────────────────────  │       │
│   │  TICKET   Diner             │       │
│   │                             │       │
│   │    [ CTA Button ]           │       │
│   │                             │       │
│   │  ─── footer (#aaa, 12px) ──│       │
│   └─────────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

**Labels**: 13px, #888, uppercase, letter-spacing 0.5px, left-aligned
**Values**: 15px, #222, font-weight 600, right-aligned
**CTA**: brand_color bg, white text, border-radius 6px, padding 14px 32px, geen uppercase
**Font**: Georgia, serif fallback (restaurant feel)

---

## Shared HTML Builder — `_shared/emailLayout.ts` (nieuw)

Eén gedeelde functie die alle emails renderen. Voorkomt 5x dezelfde HTML duplicatie.

```typescript
interface EmailLayoutParams {
  logoUrl: string | null;
  restaurantName: string;
  brandColor: string;
  footerText: string;
  heading: string;
  intro: string;
  details: Array<{ label: string; value: string }>; // DATUM, TIJD, etc.
  ctaUrl?: string;
  ctaLabel?: string;
  secondaryLink?: { url: string; label: string };
  note?: string; // policy note, expiry, etc.
}
// Returns complete HTML string
```

- Outer table: `background:#f8f8f8`, padding 40px 16px
- Inner table: `max-width:520px`, `background:#fff`, border-radius 8px
- Logo: max-height 72px, padding-bottom 32px
- Details: table rows met label/value, 1px #eee border-bottom
- CTA: brand_color, border-radius 6px, padding 14px 32px
- Footer: 12px, #aaa, border-top 1px #eee
- Font-family: Georgia, 'Times New Roman', serif
- Geen emoji's, nergens

---

## Bestanden

### 1. `supabase/functions/_shared/emailLayout.ts` — **Nieuw**
Shared HTML builder functie. Alle email-verstuurders importeren dit.

### 2. `supabase/functions/_shared/bookingEmail.ts` — Refactor
- Verwijder inline HTML
- Import `buildEmailHtml` uit `emailLayout.ts`
- Details array: `[{ label: 'DATUM', value: formattedDate }, { label: 'TIJD', value: ... }, ...]`
- Guest notes als `note` parameter (geen emoji)
- Calendar link als `secondaryLink`

### 3. `supabase/functions/waitlist-invite-engine/index.ts` — `sendInviteEmail`
- Verwijder inline HTML (regels 298-322)
- Import `buildEmailHtml`
- Heading: "Er is een plek vrijgekomen"
- Note: "Geldig tot {time} uur" (geen ⏰)
- CTA: "Reserveer deze plek"

### 4. `supabase/functions/waitlist-accept/index.ts` — `sendConfirmationEmail`
- Verwijder inline HTML (regels 170-189)
- Import `buildEmailHtml`
- Heading: "Je reservering via de wachtlijst is bevestigd"

### 5. `supabase/functions/reservation-reminders/index.ts` — `sendEmail`
- Verwijder inline HTML (regels 99-109)
- Import `buildEmailHtml`
- Body tekst wordt parsed naar intro + details tabel (niet als losse `<p>` tags)

### 6. `src/hooks/useReservationEmailTemplates.ts` — `DEFAULT_TEMPLATES`
Verwijder alle emoji uit body teksten:

| Template | Oud | Nieuw |
|---|---|---|
| confirmation | `📅 {datum}\n🕐 {tijd}\n👥 {gasten}` | `Je reservering bij {restaurant} is bevestigd.\n\nDatum: {datum}\nTijd: {tijd}\nGasten: {gasten} personen` |
| waitlist_confirmation | Emoji-vrij (ok) | Kleine tone aanpassing |
| waitlist_invite | `📅 🕐 👥` | Emoji-vrij, strakke tekst |
| cancellation | Emoji-vrij (ok) | Ok |
| reminder_24h | `📅 🕐 👥` | Emoji-vrij |
| reminder_3h | `📅 🕐 👥` | Emoji-vrij |
| reconfirm | Emoji-vrij (ok) | Ok |

Ook de `DEFAULT_TEMPLATES` in `reservation-reminders/index.ts` (regels 20-33) updaten.

---

## Volgorde

1. `_shared/emailLayout.ts` — shared builder
2. `_shared/bookingEmail.ts` — refactor naar builder
3. `waitlist-invite-engine` — refactor sendInviteEmail
4. `waitlist-accept` — refactor sendConfirmationEmail
5. `reservation-reminders` — refactor sendEmail + DEFAULT_TEMPLATES
6. `useReservationEmailTemplates.ts` — emoji-vrije defaults
7. Deploy alle edge functions

