

# Floating Button: Enterprise Upgrade + Preload Optimalisatie

## Overzicht

De floating "Reserveer" knop op de website van de klant wordt volledig opgewaardeerd naar enterprise-niveau. Twee pijlers: (1) visueel redesign met Nesto-karakter, en (2) preload-strategie die de widget perceptief instant maakt.

---

## 1. Visueel Redesign (widget.js)

### Vorm en afmetingen
- Border-radius: `16px` (Nesto primary radius, weg van generieke pill/50px)
- Padding: `14px 24px`
- Hoogte: circa 48px

### Icoon
- Inline SVG kalender-icoon links van de tekst, 18x18px, wit, `stroke-width: 2`
- Geeft direct context: "dit is voor reserveren"

### Typografie
- Font: Plus Jakarta Sans via Google Fonts `<link>` inject (alleen weight 600)
- Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Font-size: `14px`, font-weight: `600`, letter-spacing: `0.02em`
- Font wordt alleen geladen als het nog niet beschikbaar is (check via `document.fonts`)

### Schaduw en diepte
- Rust: `0 2px 8px rgba(0,0,0,0.08), 0 4px 20px {color}40`
- Hover: `0 4px 12px rgba(0,0,0,0.10), 0 6px 28px {color}50`
- Glassmorphism-touch: `backdrop-filter: blur(8px)`, achtergrond `{color}F0` (94% opaque)

### Hover en animatie
- `translateY(-2px)` + schaduw verdieping (behouden)
- `filter: brightness(1.08)` voor lichter hover-effect (geen hardcoded hex)

### Entrance animatie
- Knop start met `opacity: 0; transform: translateY(12px)`
- Na 400ms page-load delay: fade-in + slide-up, 300ms ease-out
- Nieuwe keyframe: `nestoButtonEntrance`

### Pulse dot (optioneel)
- 8px groene dot rechtsboven op de knop
- Subtiele pulse animatie (scale 1 -> 1.4, opacity 1 -> 0)
- Aan/uit via `data-pulse="true"` attribuut (default: uit)

### Mobiele aanpassingen
- Compacter: padding `12px 20px`, font-size `13px`, icoon 16x16px
- Positie: gecentreerd onderaan (`left: 50%; transform: translateX(-50%)`)
- Bottom offset: `16px`

---

## 2. Preload Optimalisatie (widget.js)

Dit is de kern van de performance-upgrade. Het iframe wordt niet meer pas bij klik aangemaakt, maar progressief voorgeladen.

### Stap 1: Preconnect bij page load
Direct bij widget-initialisatie: injecteer een `<link rel="preconnect">` naar de widget host URL. Dit zorgt dat DNS lookup, TCP handshake en TLS negotiatie al klaar zijn voordat het iframe geladen wordt.

### Stap 2: Hover-preload
Bij `mouseenter` op de floating button:
- Maak het iframe aan in een verborgen container: `position: fixed; opacity: 0; pointer-events: none; width: 420px; height: 100vh`
- Het iframe begint te laden (React app + /config API call)
- Boolean `preloaded` flag om dubbele creatie te voorkomen
- Container wordt buiten viewport geplaatst maar niet `display: none` (anders laden browsers niet)

### Stap 3: Klik = verplaats, niet herladen
Bij klik op de knop:
- Als hover-preload gelukt is (`preloaded === true`): verplaats het bestaande iframe uit de hidden container naar het panel. Geen tweede load.
- `iframe.style.opacity = '1'` + `pointer-events: auto`
- Het iframe is al interactief

### Stap 4: Fallback skeleton (mobiel / snel klikken)
Als het iframe nog niet geladen is bij klik (geen hover, of mobiel):
- Toon een skeleton loading state in het panel
- Skeleton bevat:
  - Restaurant logo bovenaan (uit nieuw `data-logo` attribuut) + naam (uit `data-name` attribuut)
  - Daaronder: pulserende blokjes die het booking formulier simuleren (kalender-achtige grid, buttons)
  - Pure CSS animatie, geen dependencies
- Luister naar iframe `load` event: zodra geladen, fade skeleton uit en toon iframe
- Fallback timeout: na 8 seconden, toon toch het iframe (zelfs als load event niet gevuurd)

### Nieuwe data-attributen
- `data-logo`: URL naar restaurant logo (optioneel, voor skeleton)
- `data-name`: Restaurant naam (optioneel, voor skeleton)

---

## 3. Settings UI Uitbreiding

In `SettingsReserveringenWidget.tsx`, de "Knopconfiguratie" sectie (regel 342-359) uitbreiden:

- **Pulse indicator**: Toggle aan/uit
- De embed code preview (`EmbedCodePreview`) krijgt de nieuwe `data-logo` en `data-name` attributen mee in de gegenereerde code

---

## Technische details

### iframe lifecycle in widget.js

```text
Page Load
  |
  +--> Inject <link rel="preconnect">
  +--> Inject Google Fonts <link>
  +--> Inject keyframes CSS
  +--> Render floating button (met entrance animatie)
  |
Button Hover (desktop)
  |
  +--> Maak hidden iframe container aan
  +--> iframe.src = iframeSrc (begint laden)
  +--> preloaded = true
  |
Button Click
  |
  +--> Is preloaded?
  |     |
  |     YES --> Verplaats iframe naar panel, toon direct
  |     NO  --> Maak iframe + skeleton in panel
  |             |
  |             +--> iframe.onload --> fade skeleton uit
  |
Panel Close
  |
  +--> Verwijder overlay + panel
  +--> iframe NIET verwijderen, terug naar hidden container
  +--> Volgende klik = weer instant (iframe is nog geladen)
```

### Skeleton HTML structuur (pure DOM, geen React)

```text
+-------------------------------+
|  [logo]  Restaurant Naam      |  <- data-logo + data-name
+-------------------------------+
|  ████████████████████████████  |  <- header bar
|                                |
|  ██  ██  ██  ██  ██  ██  ██   |  <- kalender grid
|  ██  ██  ██  ██  ██  ██  ██   |
|  ██  ██  ██  ██  ██  ██  ██   |
|  ██  ██  ██  ██  ██  ██  ██   |
|                                |
|  ████████████████████████████  |  <- CTA knop
+-------------------------------+
```

Alle blokjes: `background: #f3f4f6`, `border-radius: 8px`, CSS `@keyframes nesto-pulse` animatie.

---

## Bestanden overzicht

| Bestand | Actie | Samenvatting |
|---------|-------|--------------|
| `public/widget.js` | Herschrijven | Enterprise knop design, preconnect, hover-preload, skeleton fallback, iframe hergebruik |
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Wijzigen | Pulse toggle, data-logo/data-name in embed code |
| `src/components/settings/widget/EmbedCodePreview.tsx` | Wijzigen | Nieuwe attributen in gegenereerde script tag |

### Geen database wijzigingen nodig

