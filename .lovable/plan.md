

## Visuele verbeteringen Areas pagina

### 1. NestoCard shadow verhogen (globaal)

**Bestand: `src/components/polar/NestoCard.tsx`**

Base shadow verhogen van `0.06/0.04` naar `0.08/0.06`:
- Regel 36: `"0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)"`
- Regel 44 (onMouseLeave): zelfde waarde
- Nested cards: shadow blijft `"none"` maar krijgen een subtiele `border border-border/40` als fallback

### 2. Outer NestoCard wrapper verwijderen uit AreasSection

**Bestand: `src/components/settings/tables/AreasSection.tsx`**

- Regel 220: `<NestoCard className="p-6">` wordt `<div className="space-y-3">`
- Regel 390: `</NestoCard>` wordt `</div>`
- De `<div className="space-y-3">` op regel 235 wordt overbodig (merge met parent)
- Elke `SortableAreaCard` / `AreaCard` is al een eigen `NestoCard` -- die worden nu de top-level cards met de verhoogde shadow
- De lege state (regel 253) en gearchiveerd sectie (regel 291) staan direct in de parent div
- Gearchiveerd collapsible (regel 291): `className="mt-4"` wordt `"mt-6"` voor meer ademruimte

### 3. SettingsInsightPanel dividers versterken

**Bestand: `src/components/settings/context/SettingsInsightPanel.tsx`**

De bestaande dividers (regels 50-52 en 88-90) gebruiken `border-border/60`. Verander naar `border-border` met expliciete spacing:
- `<div className="border-t border-border/60 my-3" />` wordt `<div className="border-t border-border pt-4 mt-4" />`
- Beide dividers (regel 51 en 89) krijgen dezelfde aanpassing

### 4. Gearchiveerd sectie styling

De collapsible in `AreasSection.tsx` (regel 291-355) staat nu los buiten de outer card (na stap 2). Styling aanpassen:
- Wrapper krijgt een subtiele achtergrond: `bg-muted/30 rounded-lg p-4`
- De trigger-tekst styling blijft hetzelfde (al consistent)
- Dit maakt het visueel een eigen blok zonder een volledige card te zijn

### Technisch overzicht van wijzigingen per bestand

| Bestand | Wijziging |
|---|---|
| `NestoCard.tsx` | Shadow `0.06/0.04` naar `0.08/0.06`, nested krijgt `border border-border/40` |
| `AreasSection.tsx` | Outer `NestoCard` wrapper verwijderd, gearchiveerd sectie krijgt `bg-muted/30 rounded-lg p-4` |
| `SettingsInsightPanel.tsx` | Dividers van `border-border/60 my-3` naar `border-border pt-4 mt-4` |

