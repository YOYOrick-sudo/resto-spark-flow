

# Fix marketing-reply-review: Google Business location ID

## Probleem

Regel 76 gebruikt `review.location_id` (Nesto UUID) in de Google Business API URL. Google verwacht hun eigen location identifier.

## Oplossing

Twee kleine wijzigingen in `supabase/functions/marketing-reply-review/index.ts`:

1. **Select query uitbreiden** (regel 64): voeg `page_id` toe aan de select
   - Was: `select('id, access_token, account_id')`
   - Wordt: `select('id, access_token, account_id, page_id')`

2. **Guard condition aanpassen** (regel 72): check ook op `page_id`
   - Was: `if (googleAccount?.access_token && googleAccount?.account_id)`
   - Wordt: `if (googleAccount?.access_token && googleAccount?.account_id && googleAccount?.page_id)`

3. **API URL fixen** (regel 76): gebruik `page_id` als Google Location ID
   - Was: `accounts/${googleAccount.account_id}/locations/${review.location_id}/reviews/...`
   - Wordt: `accounts/${googleAccount.account_id}/locations/${googleAccount.page_id}/reviews/...`

## Mapping

| Kolom | Bevat | Gebruik |
|---|---|---|
| `account_id` | Google Account ID | `/accounts/{account_id}/...` |
| `page_id` | Google Business Location ID | `/locations/{page_id}/...` |

## Geen migratie nodig

`page_id` bestaat al op `marketing_social_accounts`. Wordt gevuld bij de toekomstige Google Business OAuth koppeling.

