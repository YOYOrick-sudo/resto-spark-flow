

## Sidebar header iconen aanpassen

De Zap en PanelLeft iconen in de sidebar header moeten donkerder, dikker en "gevulder" worden. Momenteel zijn ze te licht en te dun.

### Wijzigingen in `src/components/layout/NestoSidebar.tsx`

**Zap icoon (bliksem):**
- size: 16 -> 18
- strokeWidth: default (2) -> 2 (expliciet)
- Kleur: text-muted-foreground -> hardcoded color="#17171C"
- Toevoegen: `fill="currentColor"` zodat het icoon gevuld/solid is
- Padding: p-1.5 -> p-1
- Hover: hover:bg-muted/50 behouden
- Verwijder hover:text-foreground (kleur is nu vast)

**PanelLeft icoon (inklap):**
- size: 16 -> 18
- strokeWidth: default (2) -> 2 (expliciet)
- Kleur: text-muted-foreground -> hardcoded color="#17171C"
- Geen fill (blijft outlined, maar met dikkere lijn)
- Padding: p-1.5 -> p-1
- Hover: hover:bg-muted/50 behouden
- Verwijder hover:text-foreground (kleur is nu vast)

**Container styling (beide buttons):**
- Geen achtergrondkleur in default state
- Hover: bg-muted/50 rounded-md
- Geen border/box

### Samenvatting wijzigingen per knop

| Eigenschap | Huidig | Nieuw (Zap) | Nieuw (PanelLeft) |
|---|---|---|---|
| size | 16 | 18 | 18 |
| strokeWidth | default | 2 | 2 |
| color | via CSS class | #17171C | #17171C |
| fill | geen | currentColor | geen |
| padding | p-1.5 | p-1 | p-1 |
| default kleur class | text-muted-foreground | -- | -- |
| hover | hover:text-foreground hover:bg-muted/50 | hover:bg-muted/50 | hover:bg-muted/50 |

### Bestand

| Bestand | Actie |
|---|---|
| `src/components/layout/NestoSidebar.tsx` | Icon props en button styling aanpassen |

