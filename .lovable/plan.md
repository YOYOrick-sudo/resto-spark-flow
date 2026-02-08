

## Sidebar header iconen aanpassen aan screenshot

De bliksem (Zap) en inklap-icoon (PanelLeft) staan al in de sidebar header. De styling moet aangepast worden zodat ze er exact uitzien als in je screenshot: iets groter, dikker, en prominenter.

### Wijzigingen

#### `src/components/layout/NestoSidebar.tsx`

Huidige styling van de icon-buttons:
- `size={16}`, `p-1.5`, `text-muted-foreground`

Nieuwe styling om het screenshot te matchen:
- Icon size verhogen naar `size={18}` voor meer zichtbaarheid
- `strokeWidth={2.5}` toevoegen voor dikkere lijnen (zoals in screenshot)
- Padding verhogen naar `p-2` voor meer ademruimte rond de iconen
- Kleur aanpassen naar `text-foreground` (donkerder, zoals in screenshot) in plaats van `text-muted-foreground`
- Hover state behouden: `hover:bg-muted/50`

| Eigenschap | Huidig | Nieuw |
|---|---|---|
| Icon size | 16 | 18 |
| Stroke width | 2 (default) | 2.5 |
| Padding | p-1.5 | p-2 |
| Kleur | text-muted-foreground | text-foreground |
| Hover | hover:text-foreground hover:bg-muted/50 | hover:bg-muted/50 |

### Bestand

| Bestand | Actie |
|---|---|
| `src/components/layout/NestoSidebar.tsx` | Icon styling aanpassen (size, strokeWidth, padding, kleur) |
