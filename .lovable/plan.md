

# Widget Floating Button: 4 Visuele Verbeteringen

## Overzicht

Vier aanpassingen aan de floating reserveringsknop om deze professioneler en meer on-brand te maken.

## Wijzigingen

### 1. Accentkleur als tekstkleur, hoofdkleur als achtergrond

De knoptekst is nu altijd wit. Logischer: de **hoofdkleur** (primary) als achtergrond en de **accentkleur** als tekst- en icoonkleur. Dit maakt het duo-color systeem zichtbaar in de knop.

**Bestanden:**
- `public/widget.js` -- nieuw `data-accent` attribuut uitlezen, `color` instellen op accentkleur i.p.v. `#fff`, accent dot kleur aanpassen
- `src/components/settings/widget/EmbedCodePreview.tsx` -- `accentColor` prop toevoegen, `data-accent` in de gegenereerde code
- `src/components/settings/widget/WidgetLivePreview.tsx` -- `accentColor` prop doorvoeren naar preview URL
- `src/pages/WidgetPreviewDemo.tsx` -- `accent` param uitlezen en als `data-accent` op het script zetten
- `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` -- `accentColor` meegeven aan `EmbedCodePreview` en `WidgetLivePreview`

### 2. Button logo groter

Het logo is 20x20px -- te klein voor herkenning. Wordt **24x24px** met `border-radius: 5px`.

**Bestand:** `public/widget.js` -- afmetingen aanpassen

### 3. Knoptekst in hoofdletters

De tekst ("Reserveer") in uppercase met lichte letter-spacing voor premium uitstraling.

**Bestand:** `public/widget.js` -- `text-transform:uppercase` en `letter-spacing:0.05em` toevoegen

### 4. Pill knop iets smaller

Padding wordt iets verkleind zodat de knop slanker oogt:
- Desktop: `14px 28px` wordt `12px 24px`
- Mobile: `12px 22px` wordt `10px 20px`

**Bestand:** `public/widget.js` -- padding waarden aanpassen

## Samenvatting bestanden

| Bestand | Wat wijzigt |
|---|---|
| `public/widget.js` | Accent als tekstkleur, logo 24px, uppercase, kleinere padding |
| `src/components/settings/widget/EmbedCodePreview.tsx` | Nieuwe `accentColor` prop, `data-accent` attribuut in code output |
| `src/components/settings/widget/WidgetLivePreview.tsx` | Nieuwe `accentColor` prop, doorvoeren naar preview URL |
| `src/pages/WidgetPreviewDemo.tsx` | `accent` param uitlezen en als attribuut zetten |
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | `accentColor` prop meegeven aan preview en embed componenten |

