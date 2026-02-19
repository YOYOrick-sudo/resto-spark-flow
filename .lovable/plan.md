
# Button Logo in de Floating Widget Knop

## Concept

Restaurants kunnen een speciaal logo uploaden voor de floating button. Dit logo wordt in de knop getoond als een klein icoon links van de tekst (ter vervanging van de accent dot). Het logo krijgt automatisch een donkere kleurbehandeling via CSS `filter: brightness(0) saturate(0)` + lichte opacity, waardoor elk logo er als een strak donkerblauw/zwart silhouet uitziet -- ongeacht de originele kleuren.

```text
Huidige knop                     Nieuwe knop (met button logo)
┌──────────────────────┐         ┌────────────────────────────┐
│  ●  Reserveer        │         │  [logo]  Reserveer         │
│  accent dot          │         │  20px, dark silhouet       │
└──────────────────────┘         └────────────────────────────┘
```

Wanneer geen button logo is geupload, blijft de accent dot zichtbaar (huidige gedrag).

## Kleurbehandeling

Het logo wordt automatisch donker gemaakt via CSS filters:
- `filter: brightness(0) saturate(100%)` maakt het logo volledig zwart
- `opacity: 0.85` geeft het een subtiele zachtheid
- Werkt met elk logo-formaat (kleur, wit, zwart) -- het resultaat is altijd een donker silhouet op de gekleurde knop

Dit vereist **geen server-side beeldbewerking** -- puur CSS.

## Wat verandert

### 1. Database: nieuw veld `widget_button_logo_url`
Toevoegen aan de `widget_settings` tabel. Gescheiden van `widget_logo_url` (dat is het logo bovenaan de widget zelf).

### 2. Upload component: `WidgetButtonLogoUpload`
Nieuw component in `src/components/settings/widget/`, vergelijkbaar met `WidgetLogoUpload` maar voor het button-logo. Upload gaat naar `communication-assets/{location_id}/button-logo.{ext}`.

### 3. Upload hook: `useWidgetButtonLogoUpload`
Nieuw hook, gebaseerd op het bestaande `useWidgetLogoUpload` patroon. Slaat de URL op in `widget_button_logo_url`.

### 4. Widget Settings pagina
Toevoegen van het `WidgetButtonLogoUpload` component in de **Knopconfiguratie** sectie (onder "Integratie" > "Knopconfiguratie"), alleen zichtbaar wanneer `embedMode === 'button'`.

### 5. Embed code + Live Preview
Het `data-button-logo` attribuut toevoegen aan de script tag zodat het logo wordt doorgegeven aan `widget.js`.

### 6. `public/widget.js`
- Nieuw `data-button-logo` attribuut uitlezen
- Als button logo aanwezig: toon een `<img>` element (20x20px, `border-radius: 4px`, `object-fit: contain`) met CSS filter voor donkere kleurbehandeling, in plaats van de accent dot
- Als geen button logo: toon de bestaande accent dot (fallback)

## Technische details

### Database migratie
```sql
ALTER TABLE widget_settings 
ADD COLUMN widget_button_logo_url text DEFAULT NULL;
```

### CSS filter in widget.js
```javascript
// Als button logo beschikbaar
var logoImg = document.createElement('img');
logoImg.src = buttonLogoUrl;
logoImg.style.cssText = 'width:20px;height:20px;border-radius:4px;object-fit:contain;margin-right:10px;flex-shrink:0;filter:brightness(0) saturate(100%);opacity:0.85';
btn.appendChild(logoImg);
```

### Bestanden die wijzigen
- `supabase/migrations/` -- nieuw migratiebestand voor kolom
- `src/hooks/useWidgetButtonLogoUpload.ts` -- nieuw
- `src/components/settings/widget/WidgetButtonLogoUpload.tsx` -- nieuw
- `src/hooks/useWidgetSettings.ts` -- type uitbreiden met `widget_button_logo_url`
- `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` -- component + state toevoegen
- `src/components/settings/widget/EmbedCodePreview.tsx` -- `data-button-logo` attribuut
- `src/components/settings/widget/WidgetLivePreview.tsx` -- prop doorvoeren
- `public/widget.js` -- logo renderen in de knop
