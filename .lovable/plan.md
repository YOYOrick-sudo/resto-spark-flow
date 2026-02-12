

# Logo Upload en Brand Color Picker — Communicatie Settings

## Overzicht
Activeer de twee gedimde branding-velden op de bestaande Communicatie-pagina: een werkende logo-upload met preview/verwijder en een hex color picker met live preview.

## 1. Storage Bucket (database migratie)

Maak een private storage bucket `communication-assets` aan met RLS policies:

- **SELECT**: gebruiker heeft toegang tot de locatie (`user_has_location_access`)
- **INSERT**: owner/manager rol in de locatie
- **UPDATE**: owner/manager rol in de locatie
- **DELETE**: owner/manager rol in de locatie
- Padstructuur: `{location_id}/logo.{ext}`
- Bestandslimiet: 2 MB, alleen `image/png`, `image/jpeg`, `image/svg+xml`

## 2. Logo Upload Hook

Nieuw bestand: `src/hooks/useLogoUpload.ts`

| Functie | Wat het doet |
|---------|-------------|
| `uploadLogo(file)` | Valideert type + grootte, upload naar `communication-assets/{location_id}/logo.{ext}`, haalt public URL op, slaat `logo_url` op via `useUpdateCommunicationSettings` |
| `deleteLogo()` | Verwijdert bestand uit storage, zet `logo_url` op `null` |
| `isUploading` | Loading state |

Validatie in de hook:
- Max 2 MB
- Alleen PNG, JPG, SVG
- Toast bij fout (verkeerd type, te groot, upload mislukt)

## 3. Logo Upload Component

Nieuw bestand: `src/components/settings/communication/LogoUploadField.tsx`

Vervangt het gedimde placeholder-blok. Twee states:

**Geen logo:**
- Drop zone met gestippelde border (bestaande stijl)
- Drag-and-drop + klik om bestand te kiezen
- Tekst: "Sleep een logo hierheen of klik om te uploaden"
- Subtekst: "PNG, JPG of SVG. Max 2 MB."

**Logo aanwezig:**
- Preview afbeelding (max-h-16, object-contain)
- Verwijder-knop (Trash2 icon) met ConfirmDialog
- Opnieuw uploaden via klik op de preview

Loading state: skeleton/spinner tijdens upload.

## 4. Color Picker Activeren

In `SettingsCommunicatie.tsx` — verwijder `opacity-40` en `cursor-default` van het kleur-blok:

- Hex input wordt bewerkbaar
- Live kleurpreview vierkant (al aanwezig, reageert op `local.brand_color`)
- Validatie: regex `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/`
- Bij ongeldig: rode border, niet opslaan (zelfde patroon als reply-to validatie)
- Bij geldig: autosave via bestaande `debouncedSave`
- Kleur vierkant is ook klikbaar om native color picker te openen (`<input type="color">` hidden)

## 5. Wijzigingen per bestand

| Bestand | Actie |
|---------|-------|
| **SQL migratie** | Bucket `communication-assets` aanmaken + RLS policies |
| `src/hooks/useLogoUpload.ts` | **Nieuw** — upload, delete, validatie logica |
| `src/components/settings/communication/LogoUploadField.tsx` | **Nieuw** — drag-drop upload component met preview |
| `src/pages/settings/SettingsCommunicatie.tsx` | Logo placeholder vervangen door `LogoUploadField`, kleur-blok activeren met hex validatie + hidden color input |

## 6. Geen wijzigingen aan

- Geen nieuwe routes
- Geen nieuwe database tabellen (logo_url en brand_color bestaan al)
- `useCommunicationSettings` hook blijft ongewijzigd
- `useUpdateCommunicationSettings` hook blijft ongewijzigd (wordt hergebruikt)

