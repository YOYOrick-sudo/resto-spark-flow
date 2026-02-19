
# Widget Duo-Kleuren + AI Suggesties

## Overzicht

De branding-sectie van de widget settings wordt uitgebreid met een tweede kleur (accent) en een AI-knop die harmonieuze kleurcombinaties voorstelt. Daarnaast komen er 5 voorgedefinieerde paletten voor snelle selectie.

## Wat verandert voor de gebruiker

### Kleurenpalet chips
Een rij van 5 curated duo-combinaties + "Custom" optie:
- Emerald & Teal (#10B981 + #14B8A6)
- Ocean Blue (#0EA5E9 + #6366F1)
- Purple Night (#8B5CF6 + #1F2937)
- Warm Sunset (#F97316 + #F59E0B)
- Rose & Berry (#EC4899 + #F43F5E)

Klik op een palet en beide kleuren worden direct ingesteld.

### Twee kleur-swatches naast elkaar
- **Hoofdkleur** (links): voor knoppen en CTA's -- 16 swatch opties + hex input
- **Accentkleur** (rechts): voor badges en highlights -- 16 swatch opties + hex input

### AI suggestie-knop
Een "Stel betere kleuren voor" knop die:
- De huidige kleuren meestuurt naar een backend functie
- AI (gemini-3-flash-preview) vraagt om 3 harmonieuze alternatieven
- Resultaten toont in een inline kaart met naam, uitleg en "Toepassen" knop per suggestie

## Technische details

### 1. Database migratie
Nieuw veld op `widget_settings`:
```sql
ALTER TABLE public.widget_settings
  ADD COLUMN widget_accent_color text NOT NULL DEFAULT '#14B8A6';
```

### 2. Backend functie: `suggest-widget-colors`
- Ontvangt `{ primary, accent }` van de frontend
- Roept Lovable AI Gateway aan met tool calling (`suggest_color_palettes`)
- Retourneert 3 suggesties met: primary, accent, name (NL), reasoning (NL)
- Handelt 429/402 errors netjes af
- `verify_jwt = false` in config.toml

### 3. Nieuw component: `ColorPaletteSelector`
Pad: `src/components/settings/widget/ColorPaletteSelector.tsx`

Bevat:
- Curated palette chips (horizontale rij)
- Twee swatch grids naast elkaar (grid-cols-2)
- AI suggestie knop + loading state + inline resultaatkaart

### 4. Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/hooks/useWidgetSettings.ts` | `widget_accent_color` toevoegen aan `WidgetSettings` interface |
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Huidige color swatches vervangen door `ColorPaletteSelector`, `widget_accent_color` in LocalSettings |
| `supabase/config.toml` | Entry voor `suggest-widget-colors` met `verify_jwt = false` |

### 5. Wat blijft hetzelfde
- Logo upload, knoopstijl selector, en alle andere branding opties
- De widget zelf hoeft nog niet aangepast -- kleuren worden alvast opgeslagen
