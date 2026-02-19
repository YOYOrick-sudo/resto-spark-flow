

# Widget Branding Upgrade

## Wat verandert

De Branding-sectie in de widget settings krijgt drie verbeteringen:

### 1. Kleurpicker: preset swatches + hex input

De buggy native `<input type="color">` wordt vervangen door een **swatch grid** van 16 curated restaurant-kleuren + een hex input veld.

```text
Widget kleur
  [swatch][swatch][swatch][swatch][swatch][swatch][swatch][swatch]
  [swatch][swatch][swatch][swatch][swatch][swatch][swatch][swatch]
  [#10B981_______]
  Kleur van knoppen en accenten in de widget.
```

- Swatches: `h-6 w-6 rounded-full`, actieve swatch krijgt een `ring-2 ring-primary ring-offset-2` + Check icoon
- Preset kleuren: 16 restaurant-geschikte tinten (greens, blues, warm tones, neutrals)
- Het hex input veld blijft voor custom waarden

### 2. Widget logo: upload in plaats van URL

Het huidige tekstveld "Widget logo URL" wordt vervangen door een **echte upload component**, vergelijkbaar met de bestaande `LogoUploadField` in communicatie-instellingen.

Er wordt een nieuw `WidgetLogoUploadField` component gemaakt dat:
- Dezelfde drop-zone UI gebruikt (drag-and-drop of klik)
- Uploadt naar de bestaande `communication-assets` bucket onder `{locationId}/widget-logo.{ext}`
- De publieke URL opslaat in `widget_logo_url` via `updateWidgetSettings`
- Preview, vervangen en verwijderen ondersteunt
- PNG, JPG, SVG accepteert (max 2 MB)

### 3. Nieuwe branding optie: knoopstijl (afgerond vs. rechthoekig)

Een nieuw visueel keuzeveld "Knoopstijl" waarmee de gebruiker kan kiezen tussen afgeronde en rechthoekige knoppen in de widget. Dit wordt opgeslagen als `widget_button_style` in de `widget_settings` tabel.

```text
Knoopstijl
  [ Afgerond (pill) ]  [ Rechthoekig ]
```

- Twee visuele knoppen met een mini-preview van de stijl
- Waarden: `rounded` (default) of `square`
- Wordt meegestuurd naar de widget voor styling

## Technische details

### Database migratie

Nieuw veld toevoegen aan `widget_settings`:

```sql
ALTER TABLE public.widget_settings
  ADD COLUMN widget_button_style text NOT NULL DEFAULT 'rounded';
```

### Nieuwe bestanden

| Bestand | Doel |
|---------|------|
| `src/components/settings/widget/WidgetLogoUpload.tsx` | Upload component voor widget logo, hergebruikt storage logica |
| `src/hooks/useWidgetLogoUpload.ts` | Hook voor upload/delete naar `communication-assets/{locationId}/widget-logo.*` |

### Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Branding sectie: swatches + upload + knoopstijl selector; verwijder `colorInputRef` en native picker |
| `src/hooks/useWidgetSettings.ts` | `widget_button_style` toevoegen aan `WidgetSettings` interface en `LocalSettings` |

### Swatch kleuren

```typescript
const PRESET_COLORS = [
  '#10B981', '#059669', '#0EA5E9', '#6366F1',
  '#8B5CF6', '#EC4899', '#F43F5E', '#EF4444',
  '#F97316', '#F59E0B', '#84CC16', '#14B8A6',
  '#06B6D4', '#3B82F6', '#A855F7', '#1F2937',
];
```

### Widget logo upload hook

Zelfde patroon als `useLogoUpload` maar:
- Pad: `{locationId}/widget-logo.{ext}`
- Slaat URL op via `useUpdateWidgetSettings` in `widget_logo_url`
- Verwijder-actie zet `widget_logo_url` naar `null`

