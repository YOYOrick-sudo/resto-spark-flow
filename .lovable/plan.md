

## Density Toggle + Compact Modus voor Reserveringenpagina

### Overzicht

Een density toggle (compact/comfortable) toevoegen naast de view toggles. Compact wordt de default en wordt opgeslagen in localStorage. Dit geldt voor zowel de lijstweergave als de gridweergave. De sticky headers voor tijdslots worden verbeterd.

---

### Nieuwe bestanden

#### `src/components/reserveringen/DensityToggle.tsx`

Een nieuwe component naast de ViewToggle met twee knoppen:
- **Compact** (Rows4 icoon) -- default, actief
- **Comfortable** (Rows3 icoon) -- huidige spacing

Styling identiek aan ViewToggle: `bg-secondary rounded-lg p-1`, actief = `bg-primary/10 text-primary border border-primary/20 shadow-sm`.

State wordt opgeslagen in `localStorage` key `nesto-density` met waarden `"compact"` | `"comfortable"`.

Export: `type DensityType = "compact" | "comfortable"` en de component.

---

### Wijzigingen per bestand

#### `src/pages/Reserveringen.tsx`

- Importeer `DensityToggle` en `DensityType`
- Voeg `density` state toe, initialiseer vanuit localStorage (default: `"compact"`)
- Render `DensityToggle` naast `ViewToggle` in de toolbar
- Geef `density` door als prop aan `ReservationListView` en `ReservationGridView`

#### `src/components/reserveringen/ReservationListView.tsx`

Accepteer `density` prop. Pas conditionele classes toe:

| Element | Compact | Comfortable (huidig) |
|---|---|---|
| Rij padding | `py-1.5 px-4 gap-3` | `py-3 px-4 gap-4` |
| Tijdslot header padding | `py-1 px-4` | `py-2 px-4` |
| Tijdslot header tekst | `text-xs` | `text-sm` |
| Naam tekst | `text-sm` (blijft) | `text-sm` |
| Gasten/tafel tekst | `text-xs` | `text-sm` |
| Status badge | `text-[11px] px-1.5 py-0 min-w-[80px]` | `text-xs px-2.5 py-1 min-w-[90px]` |
| Status dot in badge | `w-1.5 h-1.5` | `w-2 h-2` |
| VIP ster | `h-3 w-3` | `h-3.5 w-3.5` |
| Telefoon icoon | `h-2.5 w-2.5` | `h-3 w-3` |
| Menu icoon | `h-3.5 w-3.5` | `h-4 w-4` |
| Notities kolom | `w-[100px]` | `w-[120px]` |
| Divider tussen rijen | `divide-border/30` | `divide-border` |

De sticky headers voor tijdslots zijn al `sticky top-0 z-10`. Shadow toevoegen: `shadow-[0_1px_3px_rgba(0,0,0,0.05)]`.

#### `src/components/reserveringen/ReservationGridView.tsx`

Accepteer `density` prop. Wijzigingen:

- **TABLE_ROW_HEIGHT**: compact = 36px, comfortable = 56px (huidige waarde)
- **SEATED_ROW_HEIGHT**: compact = 36px, comfortable = 44px
- **ZONE_HEADER_HEIGHT**: compact = 28px, comfortable = 32px
- Geef `density` door aan `TableRow`
- `SeatedCountRow`: compact = `py-1` in cellen, comfortable = `py-2`
- `ZoneHeader`: compact = `h-7`, comfortable = `h-8`
- `TimelineHeader`: al sticky top-0 z-20 -- geen wijziging nodig
- `SeatedCountRow`: sticky gedrag toevoegen: `sticky top-[40px] z-20` (onder TimelineHeader)
- `tablePositions` berekening: gebruik de density-afhankelijke hoogte constanten

#### `src/components/reserveringen/TableRow.tsx`

Accepteer `density` prop:

- Rij hoogte: compact = `h-9` (36px), comfortable = `h-12` (48px)
- ReservationBlock `top`/`bottom` insets: compact = `top-0.5 bottom-0.5`, comfortable = `top-1.5 bottom-1.5` (huidig)

#### `src/components/reserveringen/ReservationBlock.tsx`

Accepteer `density` prop:

- Blok insets: compact = `top-0.5 bottom-0.5`, comfortable = `top-1.5 bottom-1.5`
- Guest count tekst: compact = `text-xs`, comfortable = `text-sm`
- Naam tekst: compact = `text-[11px]`, comfortable = `text-xs`
- Content padding: compact = `px-1.5 gap-1`, comfortable = `px-2.5 gap-1.5`

---

### Sticky gedrag samenvatting

**Lijstweergave:**
- Tijdslot headers: al `sticky top-0 z-10` -- shadow toevoegen
- Toolbar bovenaan: zit buiten de scroll container, dus blijft automatisch staan

**Gridweergave:**
- TimelineHeader: al `sticky top-0 z-20` -- geen wijziging
- SeatedCountRow: `sticky top-[40px] z-19` toevoegen (40px = hoogte TimelineHeader)
- Tafel kolom links: al `sticky left-0 z-30` -- geen wijziging

---

### Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/components/reserveringen/DensityToggle.tsx` | Nieuw -- density toggle component |
| `src/pages/Reserveringen.tsx` | density state + toggle in toolbar + prop doorgeven |
| `src/components/reserveringen/ReservationListView.tsx` | density prop, conditionele sizing, sticky shadow |
| `src/components/reserveringen/ReservationGridView.tsx` | density prop, row heights, seated sticky, doorgeven |
| `src/components/reserveringen/TableRow.tsx` | density prop, row height |
| `src/components/reserveringen/ReservationBlock.tsx` | density prop, compactere insets en tekst |

