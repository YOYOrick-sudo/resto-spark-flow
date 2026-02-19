

# Live Preview toevoegen aan Widget Settings

## Probleem

De settings pagina toont alleen de embed code en configuratie-opties, maar er is geen visuele preview van hoe de floating knop, inline embed, of het widget-scherm eruitziet. De operator moet nu blind vertrouwen dat het werkt, of het script op een externe website plakken om het resultaat te zien.

## Oplossing

Een **live preview panel** toevoegen aan de Integratie-sectie, direct boven de embed code. Dit panel simuleert een "website" met de widget erin, zodat de operator real-time ziet wat hun gasten zullen zien.

## Wat de operator gaat zien

### Bij "Floating knop" mode
Een klein mock-browservenster (met grijze achtergrond als "website") met rechtsonder (of linksonder) de floating knop in de geconfigureerde kleur en tekst. Bij klik op de knop opent de overlay met daarin een iframe van de echte widget (`/book/{slug}?embed=true`).

### Bij "Inline embed" mode
Hetzelfde mock-browservenster, maar dan met de widget direct zichtbaar als embedded iframe in het midden van de "website".

### Bij "Alleen link" mode
Een eenvoudige link-preview card met de URL en een "Open" knop -- geen mock browser nodig.

## Technische aanpak

### Nieuw component: `WidgetLivePreview.tsx`

Locatie: `src/components/settings/widget/WidgetLivePreview.tsx`

Dit component rendert:
- Een container met `bg-white rounded-card border` die een website-venster simuleert
- Een nep-browserbalk bovenaan (grijs balkje met drie dots en een URL-balk) voor context
- Afhankelijk van de mode:
  - **Button**: een nep-paginainhoud (placeholder tekst/blokken) met een absolute-positioned knop rechtsonder in de preview. Bij klik op de knop opent een mini-overlay binnen de preview met een geschaalde iframe.
  - **Inline**: dezelfde nep-pagina maar met de iframe direct inline zichtbaar
  - **Link**: een compacte card met de URL

De iframe laadt `/book/{slug}?embed=true` en wordt geschaald met `transform: scale(0.65)` + `transform-origin: top center` zodat het past binnen het preview panel.

### Wijziging: `SettingsReserveringenWidget.tsx`

De `WidgetLivePreview` wordt geplaatst binnen de Integratie-sectie, tussen de `EmbedModeSelector` en de button-configuratie/embed code. Props zijn: `mode`, `slug`, `color`, `buttonLabel`, `buttonPosition`, `baseUrl`.

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/settings/widget/WidgetLivePreview.tsx` | Nieuw -- live preview component |
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Wijzigen -- preview component toevoegen aan Integratie-sectie |

## Volgorde

1. `WidgetLivePreview` component bouwen
2. Integreren in de Widget Settings pagina

