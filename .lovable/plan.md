

## Situatie
Je hebt een Supabase Personal Access Token (PAT) aangemaakt en gedeeld in chat. Hiermee kan ik via de officiële Supabase Management API de Custom Access Token Hook activeren — zonder dat je het dashboard nodig hebt.

## ⚠️ Belangrijk: token is nu compromised
Je hebt de PAT in plain text in de chat geplakt. Chat-berichten kunnen gelogd worden. **Eerste actie na activatie: deze token revoken** op https://supabase.com/dashboard/account/tokens en eventueel een nieuwe maken als je hem nog ergens anders nodig hebt.

## Plan

### Stap 1 — Token veilig opslaan
Token toevoegen als runtime secret `SUPABASE_MANAGEMENT_PAT` (via add_secret tool). Niet hardcoden in code, niet committen.

### Stap 2 — Eenmalige activatie-edge-function
Tijdelijke edge function `activate-jwt-hook` die één API call doet:

```
PATCH https://api.supabase.com/v1/projects/igqcfxizgtdkwnajvers/config/auth
Authorization: Bearer ${SUPABASE_MANAGEMENT_PAT}
Content-Type: application/json

{
  "hook_custom_access_token_enabled": true,
  "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"
}
```

Function returnt de response van Supabase zodat we kunnen verifiëren dat het gelukt is (HTTP 200 + bevestiging in payload).

### Stap 3 — Functie triggeren + resultaat checken
Eenmalige invocation. Verwachte uitkomst: `hook_custom_access_token_enabled: true` in response.

Mogelijke fouten en hoe we ze afhandelen:
- **403 Forbidden** → jouw account heeft geen toegang tot het project. Dan val ik terug op de account-koppeling route.
- **401 Unauthorized** → token ongeldig of revoked.
- **200 OK** → klaar, door naar stap 4.

### Stap 4 — End-to-end verificatie
Test via een echte login op `/auth`:
1. Login met je test-account
2. In browser console: `(await supabase.auth.getSession()).data.session.access_token` → kopieer JWT
3. Decode op jwt.io of via een kleine helper
4. Check claims: `actor_type`, `org_id`, `location_id`, `device_id`, `device_role`, `roles`, `platform_role`

### Stap 5 — Opruimen (security)
- Edge function `activate-jwt-hook` verwijderen (niet meer nodig)
- Secret `SUPABASE_MANAGEMENT_PAT` verwijderen
- Jij revoked de PAT op supabase.com/dashboard/account/tokens

## Bestanden

| Actie | Bestand | Doel |
|-------|---------|------|
| CREATE | `supabase/functions/activate-jwt-hook/index.ts` | Eenmalige Management API call |
| (geen migratie nodig) | — | Grants staan al in `20260416144509_*.sql` |

## Wat ik NIET doe
- Geen SQL hack op `auth` schema
- Geen permanente edge function (alleen eenmalig, daarna weg)
- Token niet loggen, niet in code, niet in commits

## Risico-inschatting
- **Officieel API endpoint** → geen toekomstig risico op breken
- **PAT exposure window**: ~5 minuten tussen storage en cleanup, daarna revoked
- **Worst case**: API geeft 403 → we leren dat account-koppeling het echte probleem is, geen schade aangericht

## Klaar als
- API response 200 met `hook_custom_access_token_enabled: true`
- Echte login produceert JWT met alle device/user claims
- Cleanup voltooid (function weg, secret weg, PAT revoked)

