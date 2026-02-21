

# QR code vervangen door link + manage URL fix

## Wat verandert

### 1. QR code verwijderen, link behouden
De QR-code sectie in het bevestigingsscherm wordt verwijderd. De bestaande "Reservering beheren" link-knop blijft staan — die is al aanwezig en werkt beter op mobiel.

**Bestand:** `src/components/booking/ConfirmationStep.tsx`
- QR-code sectie (regels 77-82) verwijderen: de `<QRCodeSVG>` met "Scan om te beheren"
- `qrcode.react` import verwijderen
- De bestaande "Reservering beheren" knop (regels 99-107) blijft ongewijzigd

### 2. Manage URL betrouwbaar maken (backend fix)
Het probleem is dat `getPublicBaseUrl(req)` de `Origin` header van het request gebruikt. Als de widget embedded is op een externe site, is die origin het domein van die site — niet van jouw app. De manage link wijst dan naar een verkeerde URL.

**Oplossing:** dezelfde aanpak als de bevestigingsmail: gebruik de `PUBLIC_SITE_URL` env var (met fallback naar `resto-spark-flow.lovable.app`).

**Bestand:** `supabase/functions/public-booking-api/index.ts`
- `getPublicBaseUrl(req)` vervangen door: `Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app'`
- Dit is dezelfde bron die de bevestigingsmail al gebruikt (regel 528), dus de links zijn altijd consistent

### 3. Bevestigingsmail
De email bevat al een "Beheer je reservering" knop (regel 552) die correct werkt via `PUBLIC_SITE_URL`. Hier hoeft niets te veranderen.

## Samenvatting

| Bestand | Wijziging |
|---------|-----------|
| `src/components/booking/ConfirmationStep.tsx` | QR-code sectie + import verwijderen |
| `supabase/functions/public-booking-api/index.ts` | `manage_url` genereren via `PUBLIC_SITE_URL` in plaats van request origin |

## Resultaat
- Widget bevestigingsscherm: schone kaart met "Reservering beheren" link-knop
- Manage URL altijd correct, ongeacht waar de widget embedded is
- Bevestigingsmail: ongewijzigd, werkt al correct
