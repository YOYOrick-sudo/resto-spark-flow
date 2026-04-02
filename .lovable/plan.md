

# Email Template Styling Upgrade

## Probleem

De emailLayout.ts gebruikt nog steeds `Georgia, 'Times New Roman', Times, serif` als font-family op alle plekken (labels, waarden, heading, intro, CTA-knop, footer, notities). Dit was eerder al uit de frontend verwijderd maar nooit in de email layout aangepast.

De CTA-knop heeft `border-radius: 6px` wat te klein en hoekig aanvoelt vergeleken met de rest van het Nesto design (16px radii).

## Wijzigingen in `supabase/functions/_shared/emailLayout.ts`

1. **Font-family** wijzigen van `Georgia, serif` naar `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` — consistent met het Nesto design system. Inter wordt door de meeste emailclients als webfont niet geladen, maar de fallback-stack (`-apple-system`, `Segoe UI`) geeft een moderne sans-serif look op alle platforms.

2. **CTA-knop** radius van `6px` naar `12px` — ronder, moderner, consistent met Nesto buttons. Padding iets ruimer: `16px 36px`.

3. **Secondary link** iets groter: `14px` in plaats van `13px`.

Dit raakt alle emails (bevestiging, annulering, herinnering, wachtlijst, herbevestiging) omdat ze allemaal `buildEmailHtml` gebruiken.

Na de code-wijziging: redeploy van `send-reservation-email` edge function.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/_shared/emailLayout.ts` | Font-family → sans-serif, CTA radius → 12px |

