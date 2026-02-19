

# "Niet toegewezen" als echte grid-rij

## Probleem
De huidige "Niet toegewezen" sectie is een horizontale kaartjeslijst die los boven de grid staat. Dit breekt de visuele consistentie: het lijnt niet uit met de timeline en voelt als een ander component.

## Oplossing
Vervang de kaartjeslijst door een rij die exact dezelfde structuur heeft als een gewone tafelrij:
- 140px sticky linkerkolom met label "Niet toegew." en count
- ReservationBlock componenten gepositioneerd op de juiste tijdstippen in de timeline
- Subtiele warning-achtergrond zodat het opvalt als "actie nodig"

```text
Huidige situatie:
+-----------------------------------------------+
| v Niet toegewezen (1)                         |
| [19:00 | 2p | Hansje Peter | Wijs toe]        |
+-----------------------------------------------+
| RESTAURANT                                    |
| Tafel 1  2-4  *  |----[blok]------|           |

Nieuwe situatie:
+------------------+----[19:00 Hansje 2p]-------+
| Niet toegew. (1) |                            |
+------------------+----------------------------+
| RESTAURANT       |                            |
| Tafel 1  2-4  *  |----[blok]------|           |
```

De blokken krijgen een oranje border-accent (`border-warning/60`) zodat ze visueel opvallen. "Wijs toe" knop verschijnt bij hover op het blok. Collapsible blijft behouden.

## Technische wijzigingen

### 1. `src/components/reserveringen/ReservationGridView.tsx`

**UnassignedBadgeList herschrijven** (regels 263-338):
- Sticky linkerkolom (140px) met "Niet toegew." label, count badge, en collapse toggle
- Timeline-area met dezelfde breedte als de grid (`gridWidth`)
- Per reservering een `ReservationBlock` renderen met dezelfde positioneringslogica (via `calculateBlockPosition`)
- "Wijs toe" knop als overlay bij hover op een blok (kleine Wand2 icon)
- Achtergrond: `bg-warning/5` voor de hele rij
- Quarter-slot gridlijnen toevoegen (zelfde als in `TableRow`) voor visuele uitlijning

### 2. `src/components/reserveringen/ReservationBlock.tsx`

**Optionele `variant` prop toevoegen**:
- Nieuwe prop: `variant?: 'default' | 'unassigned'`
- Bij `variant="unassigned"`: override de statuskleur met `border-warning/60 bg-warning/5`
- Dit zorgt ervoor dat ongeacht de status, niet-toegewezen blokken altijd de oranje warning-stijl krijgen

### Geen database- of backend-wijzigingen nodig.
