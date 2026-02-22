
# Popup Uitbreidingen — Planning, Centrering, Live Preview & Ervaring

## Overzicht

Vier verbeteringen aan de website popup in een enkele build:

1. **Planbare periode** -- optioneel start- en einddatum instellen, popup gaat automatisch aan/uit
2. **Gecentreerde content** -- alle tekst en elementen gecentreerd in popup en widget
3. **Live preview iframe** -- echte preview naast de mockup, zodat je ziet hoe gasten het ervaren
4. **"Reservering" wordt "Ervaring"** -- UI label hernoemd (database waarde `reservation` blijft)

---

## Stap 1: Database migratie

Twee nieuwe kolommen op `marketing_popup_config`:

| Kolom | Type | Default |
|-------|------|---------|
| `schedule_start_at` | TIMESTAMPTZ | NULL |
| `schedule_end_at` | TIMESTAMPTZ | NULL |

Validatie trigger: als beide gezet zijn, moet `schedule_end_at > schedule_start_at`.

---

## Stap 2: Hook update (`src/hooks/usePopupConfig.ts`)

- Twee nieuwe velden in `PopupConfig` interface: `schedule_start_at: string | null`, `schedule_end_at: string | null`
- Automatisch beschikbaar in `PopupConfigUpdates`

---

## Stap 3: Edge function — `marketing-popup-config`

Server-side schedule check toevoegen:

- Na het ophalen van de config, controleer of scheduling actief is (beide velden niet-null)
- Als `now()` buiten het venster valt, return `is_active: false`
- Stuur `schedule_start_at` en `schedule_end_at` mee in de response (voor UI context)

Dit betekent dat het widget niets hoeft te weten van scheduling -- het checkt alleen `is_active`.

---

## Stap 4: Edge function — `marketing-popup-preview`

Iframe-compatibiliteit:

- Verwijder eventuele `X-Frame-Options` header (niet expliciet setten)
- Zorg dat CORS headers correct zijn voor iframe embedding vanuit het Lovable preview domein
- Geen `X-Frame-Options` of `Content-Security-Policy: frame-ancestors` setten -- de response serveert al zonder deze headers, dus dit is al correct

---

## Stap 5: Edge function — `marketing-popup-widget`

CSS centrering toevoegen aan het widget:

- `.nesto-popup`: `text-align:center`
- `.nesto-logo`: `margin-left:auto;margin-right:auto;display:block`
- `.nesto-headline`: `text-align:center`
- `.nesto-desc`: `text-align:center`
- `.nesto-form`: `justify-content:center`
- `.nesto-featured`: `margin-left:auto;margin-right:auto;max-width:fit-content`
- `.nesto-btn-full`: al `width:100%` en `text-align:center`, geen wijziging nodig

---

## Stap 6: PopupPage UI updates

### 6a: Type label hernoemen

```text
Oud:  { value: 'reservation', label: 'Reservering' }
Nieuw: { value: 'reservation', label: 'Ervaring' }
```

Alleen het UI label in `TYPE_OPTIONS`. Database waarde `reservation` blijft ongewijzigd.

### 6b: Planning sectie

Nieuw blok in de "Weergave" card (onder sticky bar):

- Toggle: "Planning" met uitleg "Stel een periode in wanneer de popup actief is"
- Bij actief: twee datepickers naast elkaar met labels "Van" en "Tot"
- Datepicker implementatie: Popover + Calendar component (bestaand ShadCN patroon)
- Edge case UI: Als `is_active` aan staat maar `schedule_end_at` in het verleden ligt, toon een oranje "Verlopen" badge naast de master toggle. Dit maakt direct duidelijk waarom de popup niet meer draait.

### 6c: Preview layout uitbreiden

De preview switcher krijgt een derde optie:

```text
Oud:  Popup | Sticky bar
Nieuw: Popup | Sticky bar | Live
```

Bij "Live":
- Toon een iframe die de `marketing-popup-preview` URL laadt
- Iframe met `min-height: 500px`, border, en rounded corners
- Refresh-knop (herlaad iframe via key-change)
- "Openen in nieuw tabblad" link (bestaande knop blijft ook)

### 6d: Mockup preview centreren

De bestaande mockup preview (Popup en Sticky bar views) centreert alle content:
- `text-center` op de popup card
- Logo met `mx-auto`
- Headline en description met `text-center`

---

## Stap 7: SuggestionCard label

In `PopupSuggestionCard.tsx`: `TYPE_LABELS` map wijzigen:

```text
reservation: 'Reservering' → 'Ervaring'
```

---

## Bestanden overzicht

| Bestand | Actie |
|---------|-------|
| Database migratie | 2 kolommen + validatie trigger |
| `src/hooks/usePopupConfig.ts` | 2 nieuwe velden in interface |
| `supabase/functions/marketing-popup-config/index.ts` | Schedule check + velden meesturen |
| `supabase/functions/marketing-popup-preview/index.ts` | Bevestig geen X-Frame-Options (al correct) |
| `supabase/functions/marketing-popup-widget/index.ts` | CSS centrering |
| `src/pages/marketing/PopupPage.tsx` | Planning UI, iframe preview, centrering, "Ervaring" label, verlopen badge |
| `src/components/marketing/popup/PopupSuggestionCard.tsx` | "Ervaring" label |

## Volgorde

1. Database migratie
2. Hook update
3. Edge functions (config schedule check + widget centrering)
4. PopupPage UI (label, planning, iframe, centrering, verlopen badge)
5. SuggestionCard label
6. Deploy edge functions
