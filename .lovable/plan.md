

# Embeddable Widget Script + Drie Integratiemodes

## Overzicht

Een extern JavaScript bestand (`widget.js`) dat restaurants op hun eigen website kunnen plaatsen, met drie configureerbare integratiemodes:

1. **Floating button** (default) -- "Reserveer" knop rechtsonder, opent overlay
2. **Inline embed** -- Widget direct zichtbaar in een container op de pagina
3. **Alleen link** -- Geen script, restaurant linkt naar de hosted URL

De Widget Settings UI wordt uitgebreid met een mode-keuze en dynamische embed code preview.

---

## 1. Embed mode op de BookingWidget pagina

### `?embed=true` query parameter

De bestaande `BookingWidget.tsx` pagina krijgt embed-awareness:
- Als `?embed=true` aanwezig is: verberg header (logo + naam) en "Powered by" footer
- Alleen de stappen-flow card blijft over, met transparante achtergrond (`bg-transparent` i.p.v. `bg-gray-50`)
- Dit maakt de widget geschikt voor zowel iframe als overlay gebruik

**Bestand:** `src/pages/BookingWidget.tsx`

---

## 2. Widget Script (`public/widget.js`)

Een standalone vanilla JS bestand (geen React, geen bundler nodig) dat restaurants op hun site plaatsen. Volledig zelfstandig, geen dependencies.

### Script interface

```html
<!-- Mode 1: Floating button -->
<script
  src="https://resto-spark-flow.lovable.app/widget.js"
  data-slug="restaurant-de-kok"
  data-mode="button"
  data-label="Reserveer"
  data-position="bottom-right"
  data-color="#1d979e"
></script>

<!-- Mode 2: Inline -->
<script
  src="https://resto-spark-flow.lovable.app/widget.js"
  data-slug="restaurant-de-kok"
  data-mode="inline"
  data-container="nesto-booking"
></script>
```

### Data-attributen

| Attribuut | Default | Beschrijving |
|-----------|---------|--------------|
| `data-slug` | (verplicht) | Locatie slug |
| `data-mode` | `button` | `button` of `inline` |
| `data-label` | `Reserveer` | Knoptekst (alleen button mode) |
| `data-position` | `bottom-right` | `bottom-right` of `bottom-left` |
| `data-color` | uit widget_settings | Achtergrondkleur van knop en overlay header |

### Mode 1: Floating Button

- Injecteert een `<button>` met fixed positioning (rechtsonder of linksonder)
- Styling: pill-shape, primary color achtergrond, witte tekst, subtle shadow, hover lift
- Bij klik: opent een fullscreen overlay (`position: fixed; inset: 0; z-index: 99999`)
- Overlay: donkere backdrop (`rgba(0,0,0,0.4)`) + centered iframe
- Iframe laadt `/book/{slug}?embed=true`
- Sluitknop (X) rechtsboven in de overlay
- ESC toets sluit ook
- `postMessage` listener voor `nesto:close` event (zodat de widget zichzelf kan sluiten na boeking)
- Body scroll lock tijdens overlay open

### Mode 2: Inline Embed

- Zoekt het DOM element met het opgegeven `data-container` id
- Injecteert een iframe met `width: 100%; border: none;`
- Iframe laadt `/book/{slug}?embed=true`
- Automatische hoogte-aanpassing via `postMessage` (`nesto:resize` event)
- Fallback: vaste hoogte van 700px als resize niet werkt

### postMessage API (widget naar parent)

| Event | Payload | Doel |
|-------|---------|------|
| `nesto:resize` | `{ height: number }` | Inline iframe hoogte aanpassen |
| `nesto:close` | `{}` | Overlay sluiten na boeking |
| `nesto:booked` | `{ reservation_id }` | Analytics event voor restaurant |

De BookingWidget pagina stuurt deze events via `window.parent.postMessage()` wanneer `?embed=true` actief is.

---

## 3. Widget Settings UI uitbreiding

### Wijzigingen aan `SettingsReserveringenWidget.tsx`

De bestaande "Widget link" sectie (sectie 4) wordt vervangen door een volledige **Integratie** sectie:

#### Embed Mode Selector

Drie visuele kaartjes (radio-style) naast elkaar:

```text
+------------------+  +------------------+  +------------------+
|  [icon]          |  |  [icon]          |  |  [icon]          |
|  Floating knop   |  |  Inline embed    |  |  Alleen link     |
|  Overlay popup   |  |  Direct op pagina|  |  Zelf linken     |
|  o (selected)    |  |  o               |  |  o               |
+------------------+  +------------------+  +------------------+
```

Styling conform enterprise design: `NestoCard`-achtige borders, selected state met `border-primary bg-primary/5`.

#### Dynamische Embed Code Preview

Onder de mode selector: een read-only code block dat zich aanpast aan de gekozen mode.

**Button mode:**
```html
<script src="https://.../widget.js" data-slug="restaurant-de-kok" data-mode="button" data-label="Reserveer" data-position="bottom-right" data-color="#1d979e"></script>
```

**Inline mode:**
```html
<div id="nesto-booking"></div>
<script src="https://.../widget.js" data-slug="restaurant-de-kok" data-mode="inline" data-container="nesto-booking" data-color="#1d979e"></script>
```

**Link mode:**
```text
https://resto-spark-flow.lovable.app/book/restaurant-de-kok
```

- Monospace font in een `bg-secondary/50 rounded-card` container
- Kopieerknop met "Gekopieerd" feedback
- Open in nieuw tabblad knop

#### Button Mode configuratie (alleen zichtbaar als mode = button)

- **Knoptekst** (Input) -- default "Reserveer"
- **Positie** (NestoSelect) -- bottom-right / bottom-left

#### Nieuw veld in widget_settings

`embed_mode` kolom is niet nodig in de database -- de embed mode is een UI-only keuze die de gegenereerde snippet bepaalt. Het wordt lokaal opgeslagen in de component state. De snippet bevat alle configuratie als data-attributen.

---

## 4. postMessage in BookingWidget

**Bestand:** `src/pages/BookingWidget.tsx`

Wanneer `?embed=true`:
- Bij mount: stuur `nesto:resize` met de container hoogte
- Bij stap-wisseling: stuur `nesto:resize` opnieuw
- Bij succesvolle boeking (stap 4): stuur `nesto:booked`
- Bij "Terug naar website" klik of redirect: stuur `nesto:close`
- Gebruik `ResizeObserver` op de main container voor continue hoogte-tracking

---

## Technische samenvatting

### Nieuwe bestanden

| Bestand | Doel |
|---------|------|
| `public/widget.js` | Standalone embed script (vanilla JS, geen dependencies) |

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/BookingWidget.tsx` | `?embed=true` support: verberg header/footer, transparante achtergrond, postMessage events |
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Embed mode selector, dynamische code preview, button configuratie |

### Geen database wijzigingen nodig

Embed mode en button configuratie worden niet opgeslagen -- ze worden direct vertaald naar het script snippet dat de operator kopieert. Dit houdt het simpel en flexibel (meerdere snippets met verschillende configuraties op verschillende pagina's).

### Volgorde van implementatie

1. BookingWidget: embed=true awareness + postMessage
2. public/widget.js: floating button + inline + overlay
3. Widget Settings UI: mode selector + dynamische embed code
