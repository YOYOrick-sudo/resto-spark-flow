

# Preview link integreren per embed mode

## Wat verandert

De statische mockup (mock browser met placeholder blokjes) wordt vervangen door een compacte **"Test je integratie"** link-kaart die direct per embed mode verschijnt. Elke mode krijgt zijn eigen preview-link die de `/widget-preview` demo-pagina opent met de juiste parameters.

## Nieuwe structuur per mode

### Floating knop
```
Knopconfiguratie
  [Knoptekst]  [Positie]

Test je integratie
  Bekijk hoe de floating knop eruitziet op een voorbeeldwebsite.
  [Open testpagina ->]

Installatiecode
  [code block]
```

### Inline embed
```
Container
  Plaats een <div id="nesto-booking"> op je website...

Test je integratie
  Bekijk hoe de inline widget eruitziet op een voorbeeldwebsite.
  [Open testpagina ->]

Installatiecode
  [code block]
```

### Alleen link
```
Widget URL
  https://.../{slug}   [Open ->]

Test je integratie
  Open de hosted boekingspagina om te testen.
  [Open testpagina ->]
```

## Technische aanpak

### `WidgetLivePreview.tsx` -- Herschrijven

De mock browser + placeholder content wordt vervangen door een simpele kaart:

- `bg-secondary/50 rounded-card-sm p-4` container
- Korte beschrijving per mode (hoe het eruitziet op een echte website)
- Een prominente link/knop: "Open testpagina" met ExternalLink icoon
- De link opent `/widget-preview?slug=...&mode=...&label=...&position=...&color=...` in een nieuw tabblad
- Werkt nu ook voor **link** mode (was eerder `return null`)

### `SettingsReserveringenWidget.tsx` -- Kleine aanpassing

- De "Preview" subsectie-header hernoemen naar "Test je integratie"
- De `WidgetLivePreview` wordt nu ook getoond bij `link` mode (niet meer gefilterd met `embedMode !== 'link'`)

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/settings/widget/WidgetLivePreview.tsx` | Herschrijven: mock browser vervangen door compacte test-link kaart |
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Preview sectie tonen voor alle modes, header aanpassen |

