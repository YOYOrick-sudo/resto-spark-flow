
# Media Upload voor Social Posts

## Wat verandert

De "Media upload beschikbaar in Sprint 3" placeholder wordt vervangen door een werkende afbeelding-upload in twee bestanden.

---

## Aanpak

### Nieuw: `src/hooks/useSocialMediaUpload.ts`
Een herbruikbare hook die:
- Afbeeldingen upload naar de `communication-assets` bucket onder `{locationId}/social/{timestamp}-{filename}`
- Ondersteunt PNG, JPG, WebP (max 5 MB)
- Meerdere bestanden tegelijk (max 4 afbeeldingen per post, standaard voor Instagram)
- Returns: `uploadFiles(files: File[]) => Promise<string[]>` (array van publieke URLs)

### Edit: `src/components/marketing/calendar/QuickCreatePost.tsx`
- Verwijder de dashed placeholder (regels 200-203)
- Voeg een compacte upload zone toe: klik of drag-and-drop
- Toon thumbnails van geüploade bestanden met verwijder-knop
- Stuur `media_urls` mee bij `createPost.mutateAsync()`

### Edit: `src/pages/marketing/SocialPostCreatorPage.tsx`
- Verwijder de dashed placeholder (regels 458-460)
- Voeg dezelfde upload zone toe (iets groter formaat)
- Stuur `media_urls` mee bij `createPost.mutateAsync()`
- Toon thumbnails in preview panel

### Edit: `src/hooks/useAllSocialPosts.ts`
- Voeg `media_urls` toe aan de `input` type en de `row` object in `useCreateFullSocialPost`

### Edit: `src/hooks/useMarketingSocialPosts.ts`
- Voeg `media_urls` toe aan de `input` type in `useCreateSocialPost`

---

## Technische details

| Bestand | Actie |
|---------|-------|
| `src/hooks/useSocialMediaUpload.ts` | Nieuw: upload hook |
| `src/components/marketing/calendar/QuickCreatePost.tsx` | Edit: placeholder vervangen door upload UI + media_urls meesturen |
| `src/pages/marketing/SocialPostCreatorPage.tsx` | Edit: placeholder vervangen door upload UI + media_urls meesturen |
| `src/hooks/useAllSocialPosts.ts` | Edit: media_urls toevoegen aan insert |
| `src/hooks/useMarketingSocialPosts.ts` | Edit: media_urls toevoegen aan insert |

### Upload specificaties
- Bucket: `communication-assets` (bestaat al)
- Pad: `{locationId}/social/{timestamp}-{filename}`
- Types: image/png, image/jpeg, image/webp
- Max grootte: 5 MB per bestand
- Max aantal: 4 afbeeldingen per post

### UI componenten
- Upload zone met `ImagePlus` icoon en "Voeg foto's toe" tekst
- Drag-and-drop support via native HTML5 drag events
- Thumbnail grid (2x2) met hover overlay en verwijder-knop (`X`)
- Loading spinner tijdens upload

Geen database schema wijzigingen nodig — `media_urls` kolom bestaat al.
