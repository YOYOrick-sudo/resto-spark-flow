

# Popup Preview — Italiaans Restaurant Demo Website

## Wat verandert

De popup preview gebruikt nu een kale grijze pagina met placeholder blokken. Die wordt vervangen door dezelfde "Ristorante Bella Vista" website die de widget preview ook gebruikt — zodat de operator ziet hoe de popup eruitziet op een echte website.

## Aanpak

### 1. Nieuwe pagina: `/popup-preview`

Een nieuwe React pagina `src/pages/PopupPreviewDemo.tsx` die:

- Dezelfde "Ristorante Bella Vista" layout hergebruikt als `WidgetPreviewDemo.tsx` (nav, hero, menu cards, contact, footer)
- In plaats van het reserveringswidget-script, het **popup widget-script** injecteert via de `marketing-popup-widget` edge function URL
- Query parameters accepteert: `slug`, `popup_id`
- Het script laadt met `?preview=true` zodat de popup altijd toont, ongeacht of die actief is

### 2. Route toevoegen in `App.tsx`

```text
/popup-preview → PopupPreviewDemo
```

### 3. PopupPage.tsx — preview URL aanpassen

De huidige `previewUrl` wijst naar de edge function `marketing-popup-preview`. Dit wordt gewijzigd naar de nieuwe in-app route `/popup-preview?slug=xxx&popup_id=xxx`.

Dit lost meteen ook het iframe-probleem op: de preview draait nu in dezelfde origin als de app, dus geen CORS/X-Frame-Options problemen meer.

### 4. Edge function `marketing-popup-preview` — blijft bestaan

De edge function blijft beschikbaar als standalone preview (voor de "Openen in nieuw tabblad" knop en externe deellinks). Maar het live iframe in de popup pagina gebruikt nu de in-app route.

### 5. "Openen in nieuw tabblad" knop

Twee opties:
- De knop opent de in-app `/popup-preview?slug=xxx&popup_id=xxx` route in een nieuw tabblad
- Dit is betrouwbaarder dan de edge function URL en toont exact dezelfde ervaring

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/pages/PopupPreviewDemo.tsx` | Nieuw — Bella Vista layout + popup widget script |
| `src/App.tsx` | Route `/popup-preview` toevoegen |
| `src/pages/marketing/PopupPage.tsx` | `previewUrl` wijzigen naar in-app route |

## Resultaat

- Live preview iframe toont de Bella Vista demowebsite met de popup eroverheen
- "Openen in nieuw tabblad" opent dezelfde ervaring
- Geen CORS-problemen meer (zelfde origin)
- Consistent met de widget preview ervaring
